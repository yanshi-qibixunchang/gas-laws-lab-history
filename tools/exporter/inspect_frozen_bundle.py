#!/usr/bin/env python
"""Create a deterministic legal inventory from a frozen PyInstaller exporter."""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata as metadata
import json
import platform
import re
import sys
from collections import defaultdict
from pathlib import Path, PurePosixPath
from typing import Any

from PyInstaller.archive.readers import CArchiveReader


INVENTORY_SCHEMA_VERSION = 2
INTERNAL_MODULES = {
    "hsl_exporter",
    "hsl_exporter_build_info",
    "professional_graph_style",
}
BUILD_DISTRIBUTIONS = ("pyinstaller", "pyinstaller-hooks-contrib")
LICENSE_FILE_PATTERN = re.compile(r"^(license|licence|copying|notice)(\..*)?$", re.IGNORECASE)
CANONICAL_NAME_PATTERN = re.compile(r"[-_.]+")
RUNTIME_LIBRARY_RULES = (
    (re.compile(r"^(python\d*|python3)\.dll$", re.IGNORECASE), "python-runtime"),
    (re.compile(r"^vcruntime\d*(?:_\d+)?\.dll$", re.IGNORECASE), "microsoft-runtime"),
    (re.compile(r"^lib(?:crypto|ssl)-.*\.dll$", re.IGNORECASE), "openssl"),
    (re.compile(r"^libffi-.*\.dll$", re.IGNORECASE), "libffi"),
)


def canonical_name(value: str) -> str:
    return CANONICAL_NAME_PATTERN.sub("-", value).lower()


def casefold_sort_key(value: str) -> tuple[str, str]:
    return value.casefold(), value


def normalize_archive_name(value: str) -> str:
    return value.replace("\\", "/")


def module_name_from_distribution_file(value: str) -> str | None:
    path = PurePosixPath(value.replace("\\", "/"))
    suffixes = path.suffixes
    if not suffixes:
        return None
    suffix = "".join(suffixes).lower()
    if not (
        suffix.endswith(".py")
        or ".pyd" in suffix
        or suffix.endswith(".so")
        or ".so." in suffix
    ):
        return None
    parts = list(path.parts)
    if not parts or parts[0].endswith((".dist-info", ".egg-info")):
        return None
    filename = parts[-1]
    module_leaf = filename.split(".", 1)[0]
    if module_leaf == "__init__":
        parts = parts[:-1]
    else:
        parts[-1] = module_leaf
    return ".".join(part for part in parts if part)


def get_source_url(distribution: metadata.Distribution) -> str:
    project_urls = distribution.metadata.get_all("Project-URL") or []
    for entry in project_urls:
        _, separator, url = entry.partition(",")
        if separator and url.strip():
            return url.strip()
    return (distribution.metadata.get("Home-page") or "").strip()


def get_license_label(distribution: metadata.Distribution) -> str:
    expression = (distribution.metadata.get("License-Expression") or "").strip()
    if expression:
        return expression
    license_value = (distribution.metadata.get("License") or "").strip()
    if license_value and "\n" not in license_value and len(license_value) <= 200:
        return license_value
    classifiers = [
        value.removeprefix("License :: ")
        for value in distribution.metadata.get_all("Classifier") or []
        if value.startswith("License :: ")
    ]
    if classifiers:
        return "; ".join(classifiers)
    if license_value:
        return "See bundled license text"
    return ""


def read_text_file(file_path: Path) -> str:
    data = file_path.read_bytes()
    if len(data) > 4 * 1024 * 1024:
        raise RuntimeError(f"License file is unreasonably large: {file_path.name}")
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("latin-1")


def create_distribution_record(
    distribution: metadata.Distribution,
    evidence: set[str],
) -> dict[str, Any]:
    license_files = []
    seen_license_paths: set[str] = set()
    for entry in distribution.files or []:
        entry_path = PurePosixPath(str(entry).replace("\\", "/"))
        if not LICENSE_FILE_PATTERN.match(entry_path.name):
            continue
        absolute_path = Path(distribution.locate_file(entry)).resolve()
        key = str(absolute_path).casefold() if sys.platform == "win32" else str(absolute_path)
        if key in seen_license_paths or not absolute_path.is_file():
            continue
        seen_license_paths.add(key)
        text = read_text_file(absolute_path)
        license_files.append({
            "name": entry_path.name,
            "sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
            "text": text,
        })
    license_files.sort(key=lambda item: (
        item["name"].casefold(),
        item["name"],
        item["sha256"],
    ))
    if not license_files:
        metadata_license = (distribution.metadata.get("License") or "").strip()
        if metadata_license:
            license_files.append({
                "name": "METADATA License",
                "sha256": hashlib.sha256(metadata_license.encode("utf-8")).hexdigest(),
                "text": metadata_license,
            })
    license_label = get_license_label(distribution)
    if not license_label or not license_files:
        raise RuntimeError(
            f"Frozen distribution has unknown or missing license evidence: "
            f"{distribution.metadata.get('Name') or distribution.name} {distribution.version}"
        )
    sorted_evidence = sorted(evidence, key=casefold_sort_key)
    return {
        "name": distribution.metadata.get("Name") or distribution.name,
        "version": distribution.version,
        "license": license_label,
        "source": get_source_url(distribution),
        "frozenEntryCount": len(sorted_evidence),
        "sampleEntries": sorted_evidence[:20],
        "licenseFiles": license_files,
    }


def load_distribution_indexes() -> tuple[
    dict[str, metadata.Distribution],
    dict[str, set[str]],
    dict[str, set[str]],
]:
    distributions: dict[str, metadata.Distribution] = {}
    file_index: dict[str, set[str]] = defaultdict(set)
    module_index: dict[str, set[str]] = defaultdict(set)
    for distribution in metadata.distributions():
        name = distribution.metadata.get("Name") or distribution.name
        key = canonical_name(name)
        distributions[key] = distribution
        for entry in distribution.files or []:
            normalized_file = str(entry).replace("\\", "/")
            file_index[normalized_file.casefold()].add(key)
            module_name = module_name_from_distribution_file(normalized_file)
            if module_name:
                module_index[module_name.casefold()].add(key)
    for package, names in metadata.packages_distributions().items():
        for name in names:
            key = canonical_name(name)
            if key in distributions:
                module_index[package.casefold()].add(key)
    return distributions, file_index, module_index


def classify_runtime_library(name: str) -> str | None:
    basename = PurePosixPath(name).name
    for pattern, component in RUNTIME_LIBRARY_RULES:
        if pattern.match(basename):
            return component
    if "/" not in name and basename.lower().endswith(".pyd"):
        return "python-runtime"
    if basename == "base_library.zip":
        return "python-runtime"
    return None


def create_inventory(executable_path: Path, source_fingerprint: str) -> dict[str, Any]:
    distributions, file_index, module_index = load_distribution_indexes()
    archive = CArchiveReader(str(executable_path))
    archive_entries = [
        {
            "name": normalize_archive_name(name),
            "type": details[-1],
        }
        for name, details in archive.toc.items()
    ]
    archive_entries.sort(key=lambda entry: (
        entry["name"].casefold(),
        entry["name"],
        entry["type"],
    ))
    pyz_name = next((entry["name"] for entry in archive_entries if entry["type"] == "z"), None)
    if not pyz_name:
        raise RuntimeError("Frozen exporter has no embedded PYZ archive.")
    pyz = archive.open_embedded_archive(pyz_name.replace("/", "\\") if sys.platform == "win32" else pyz_name)
    pyz_modules = sorted((str(name) for name in pyz.toc), key=casefold_sort_key)

    evidence_by_distribution: dict[str, set[str]] = defaultdict(set)
    runtime_libraries = []
    unknown_entries = []

    for module_name in pyz_modules:
        root = module_name.split(".", 1)[0]
        if root in INTERNAL_MODULES or root in sys.stdlib_module_names:
            continue
        if root.startswith(("pyi_", "_pyi_", "pyimod")):
            evidence_by_distribution["pyinstaller"].add(f"module:{module_name}")
            continue
        candidates = module_index.get(module_name.casefold()) or module_index.get(root.casefold()) or set()
        if len(candidates) == 1:
            key = next(iter(candidates))
            evidence_by_distribution[key].add(f"module:{module_name}")
        elif len(candidates) > 1:
            unknown_entries.append(f"ambiguous module:{module_name} -> {sorted(candidates)}")
        else:
            unknown_entries.append(f"module:{module_name}")

    for entry in archive_entries:
        name = entry["name"]
        if name in INTERNAL_MODULES or name.startswith("hsl_exporter"):
            continue
        if name.startswith(("pyi_", "pyiboot", "pyimod")) or name == "struct":
            evidence_by_distribution["pyinstaller"].add(f"archive:{name}")
            continue
        exact_candidates = file_index.get(name.casefold(), set())
        if len(exact_candidates) == 1:
            key = next(iter(exact_candidates))
            evidence_by_distribution[key].add(f"archive:{name}")
            continue
        root = name.split("/", 1)[0]
        module_candidates = module_index.get(root.casefold(), set())
        if len(module_candidates) == 1:
            key = next(iter(module_candidates))
            evidence_by_distribution[key].add(f"archive:{name}")
            continue
        runtime_component = classify_runtime_library(name)
        if runtime_component:
            runtime_libraries.append({"name": name, "component": runtime_component})
            continue
        if entry["type"] in {"s", "m"} and root in sys.stdlib_module_names:
            continue
        if name == pyz_name:
            continue
        if len(exact_candidates) > 1 or len(module_candidates) > 1:
            candidates = sorted(exact_candidates or module_candidates)
            unknown_entries.append(f"ambiguous archive:{name} -> {candidates}")
        else:
            unknown_entries.append(f"archive:{name}")

    for build_distribution in BUILD_DISTRIBUTIONS:
        if build_distribution not in distributions:
            raise RuntimeError(f"Required exporter build distribution is missing: {build_distribution}")

    if unknown_entries:
        preview = "\n".join(f"- {entry}" for entry in unknown_entries[:50])
        raise RuntimeError(f"Frozen exporter contains entries with unknown license ownership:\n{preview}")

    frozen_records = []
    build_records = []
    for key, evidence in sorted(evidence_by_distribution.items()):
        distribution = distributions.get(key)
        if not distribution:
            raise RuntimeError(f"Frozen exporter references an unavailable distribution: {key}")
        record = create_distribution_record(distribution, evidence)
        if key == "pyinstaller":
            build_records.append(record)
        else:
            frozen_records.append(record)
    for key in BUILD_DISTRIBUTIONS:
        if key == "pyinstaller":
            continue
        build_records.append(create_distribution_record(distributions[key], {"build:hooks"}))
    frozen_records.sort(key=lambda item: (
        item["name"].casefold(),
        item["name"],
        item["version"],
    ))
    build_records.sort(key=lambda item: (
        item["name"].casefold(),
        item["name"],
        item["version"],
    ))
    runtime_libraries.sort(key=lambda item: (
        item["name"].casefold(),
        item["name"],
        item["component"],
    ))

    python_license_path = Path(sys.base_prefix, "LICENSE.txt")
    if not python_license_path.is_file():
        raise RuntimeError(f"Python runtime license is missing: {python_license_path}")
    python_license_text = read_text_file(python_license_path)
    python_license_file = {
        "name": "Python LICENSE.txt",
        "sha256": hashlib.sha256(python_license_text.encode("utf-8")).hexdigest(),
        "text": python_license_text,
    }
    python_runtime = {
        "name": "CPython",
        "version": platform.python_version(),
        "license": "Python Software Foundation License and bundled Windows runtime notices",
        "source": "https://www.python.org/",
        "licenseFile": python_license_file,
    }
    for runtime_library in runtime_libraries:
        runtime_library["licenseEvidence"] = {
            "owner": python_runtime["name"],
            "licenseFileName": python_license_file["name"],
            "sha256": python_license_file["sha256"],
        }
    archive_fingerprint_payload = {
        "archiveEntries": archive_entries,
        "pyzModules": pyz_modules,
    }
    archive_fingerprint = hashlib.sha256(json.dumps(
        archive_fingerprint_payload,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")).hexdigest()

    return {
        "schemaVersion": INVENTORY_SCHEMA_VERSION,
        "exporterSourceFingerprint": source_fingerprint,
        "archiveFingerprint": archive_fingerprint,
        "archiveEntryCount": len(archive_entries),
        "pyzModuleCount": len(pyz_modules),
        "pythonRuntime": python_runtime,
        "runtimeLibraries": runtime_libraries,
        "frozenDistributions": frozen_records,
        "buildComponents": build_records,
    }


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Inspect a frozen exporter for legal inventory")
    parser.add_argument("--executable", type=Path, required=True)
    parser.add_argument("--source-fingerprint", required=True)
    parser.add_argument("--output", type=Path)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    inventory = create_inventory(args.executable.resolve(), args.source_fingerprint)
    payload = f"{json.dumps(inventory, ensure_ascii=False, indent=2)}\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload, encoding="utf-8")
    else:
        sys.stdout.buffer.write(payload.encode("utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
