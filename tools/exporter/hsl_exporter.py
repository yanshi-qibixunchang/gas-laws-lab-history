#!/usr/bin/env python
"""Gas Laws Lab local exporter.

This first-batch exporter reads workbench export payload JSON and writes
local report, figure, CSV, and metadata files for quality review.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import os
import platform
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape

from professional_graph_style import (
    ENGINEERING_EXPORT_STYLE,
    PROFESSIONAL_COLORS,
    add_legend,
    add_metadata_band,
    apply_professional_rc_params,
    create_professional_figure,
    save_professional_figure,
    style_axes,
)

EXPORTER_VERSION = "0.2.0"
EXPORTER_SOURCE_FINGERPRINT = os.environ.get("HSL_EXPORTER_SOURCE_FINGERPRINT", "development")
ENERGY_LOG_THEORY_FLOOR = 1e-12
FONT_DIR = Path("C:/Windows/Fonts")
FONT_NAMES = {
    "serif": "TimesNewRomanHSL",
    "serif_bold": "TimesNewRomanHSL-Bold",
    "cjk": "SimSunHSL",
    "cjk_sans": "MicrosoftYaHeiHSL",
    "cjk_sans_bold": "MicrosoftYaHeiBoldHSL",
}


def first_existing_path(candidates: list[Path]) -> Path | None:
    return next((candidate for candidate in candidates if candidate.exists()), None)


def _import_dependencies():
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        from matplotlib import font_manager
        apply_professional_rc_params(plt)
        cjk_font_names: list[str] = []
        font_candidates = [
            FONT_DIR / "simsun.ttc",
            FONT_DIR / "msyh.ttc",
        ]
        for candidate in font_candidates:
            if not candidate.exists():
                continue
            try:
                font_manager.fontManager.addfont(str(candidate))
                cjk_font_names.append(font_manager.FontProperties(fname=str(candidate)).get_name())
            except Exception:
                continue
        if cjk_font_names:
            plt.rcParams["font.serif"] = [
                "Times New Roman",
                "Times",
                *cjk_font_names,
                "DejaVu Serif",
                "serif",
            ]
        plt.rcParams["axes.unicode_minus"] = False
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        from reportlab.pdfgen.canvas import Canvas
        from reportlab.platypus import (
            Flowable,
            Image,
            KeepTogether,
            PageBreak,
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
        )
    except ModuleNotFoundError as exc:
        raise RuntimeError(f"Missing dependency: {exc.name}") from exc

    return {
        "matplotlib": matplotlib,
        "matplotlib_cjk_font": cjk_font_names[0] if cjk_font_names else None,
        "plt": plt,
        "colors": colors,
        "TA_CENTER": TA_CENTER,
        "TA_LEFT": TA_LEFT,
        "TA_RIGHT": TA_RIGHT,
        "A4": A4,
        "ParagraphStyle": ParagraphStyle,
        "getSampleStyleSheet": getSampleStyleSheet,
        "mm": mm,
        "Flowable": Flowable,
        "Image": Image,
        "KeepTogether": KeepTogether,
        "PageBreak": PageBreak,
        "Paragraph": Paragraph,
        "SimpleDocTemplate": SimpleDocTemplate,
        "Spacer": Spacer,
        "Table": Table,
        "TableStyle": TableStyle,
        "pdfmetrics": pdfmetrics,
        "TTFont": TTFont,
        "Canvas": Canvas,
    }


def self_check() -> int:
    try:
        deps = _import_dependencies()
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    print(json.dumps(
        {
            "exporterVersion": EXPORTER_VERSION,
            "sourceFingerprint": EXPORTER_SOURCE_FINGERPRINT,
            "python": sys.version.split()[0],
            "platform": platform.platform(),
            "matplotlib": deps["matplotlib"].__version__,
            "reportlab": __import__("reportlab").Version,
            "status": "ok",
        },
        indent=2,
    ))
    return 0


def register_report_fonts(deps: dict[str, Any]) -> dict[str, str]:
    pdfmetrics = deps["pdfmetrics"]
    TTFont = deps["TTFont"]
    candidates = {
        FONT_NAMES["serif"]: FONT_DIR / "times.ttf",
        FONT_NAMES["serif_bold"]: FONT_DIR / "timesbd.ttf",
        FONT_NAMES["cjk"]: FONT_DIR / "simsun.ttc",
        FONT_NAMES["cjk_sans"]: FONT_DIR / "msyh.ttc",
        FONT_NAMES["cjk_sans_bold"]: first_existing_path([
            FONT_DIR / "msyhbd.ttc",
            FONT_DIR / "msyh.ttc",
        ]),
    }

    registered: dict[str, str] = {}
    for name, path in candidates.items():
        if path is not None and path.exists() and name not in pdfmetrics.getRegisteredFontNames():
            try:
                pdfmetrics.registerFont(TTFont(name, str(path)))
            except Exception:
                continue
        registered[name] = name if name in pdfmetrics.getRegisteredFontNames() else "Times-Roman"

    cjk_font = registered.get(FONT_NAMES["cjk"], "STSong-Light")
    cjk_sans_font = (
        FONT_NAMES["cjk_sans"]
        if FONT_NAMES["cjk_sans"] in pdfmetrics.getRegisteredFontNames()
        else cjk_font
    )
    return {
        "serif": FONT_NAMES["serif"] if FONT_NAMES["serif"] in pdfmetrics.getRegisteredFontNames() else "Times-Roman",
        "serif_bold": FONT_NAMES["serif_bold"] if FONT_NAMES["serif_bold"] in pdfmetrics.getRegisteredFontNames() else "Times-Bold",
        "cjk": cjk_font,
        "cjk_sans": cjk_sans_font,
        "cjk_sans_bold": (
            FONT_NAMES["cjk_sans_bold"]
            if FONT_NAMES["cjk_sans_bold"] in pdfmetrics.getRegisteredFontNames()
            else cjk_sans_font
        ),
    }


def load_payload(path: Path) -> dict[str, Any]:
    try:
        with path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Failed to read input JSON: {exc}") from exc

    if not isinstance(payload, dict) or "kind" not in payload:
        raise ValueError("Input must be a workbench export payload with a kind field.")
    return payload


def parse_export_formats(value: str | None) -> set[str]:
    allowed = {"report", "figures", "csv", "metadata"}
    if not value:
        return {"report", "figures", "csv", "metadata"}

    requested = {part.strip().lower() for part in value.split(",") if part.strip()}
    if "full" in requested:
        requested.remove("full")
        requested.update(allowed)
    if not requested:
        return {"report", "figures", "csv", "metadata"}

    unknown = requested - allowed
    if unknown:
        raise ValueError(f"Unsupported export format(s): {', '.join(sorted(unknown))}")
    return requested


def ensure_dirs(out_dir: Path, include_figures: bool = True, include_data: bool = True) -> dict[str, Path]:
    paths = {
        "root": out_dir,
        "figures": out_dir / "figures",
        "data": out_dir / "data",
    }
    paths["root"].mkdir(parents=True, exist_ok=True)
    if include_figures:
        paths["figures"].mkdir(parents=True, exist_ok=True)
    if include_data:
        paths["data"].mkdir(parents=True, exist_ok=True)
    return paths


def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        number = float(value)
        if math.isfinite(number):
            return number
    except (TypeError, ValueError):
        pass
    return default


def write_csv_payload(payload: dict[str, Any], out_dir: Path) -> list[Path]:
    paths = ensure_dirs(out_dir)
    filename = payload.get("filename") or "workbench-export.csv"
    target = paths["data"] / Path(filename).name
    content = payload.get("content")
    if not isinstance(content, str):
        raise ValueError("CSV payload is missing string content.")
    target.write_text(content, encoding="utf-8", newline="")
    return [target]


def write_rows_csv(name: str, headers: list[str], rows: list[list[Any]], data_dir: Path) -> Path:
    target = data_dir / name
    with target.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(headers)
        writer.writerows(rows)
    return target


def get_ideal_relation_x_value(relation: str, point: dict[str, Any]) -> Any:
    if relation == "pv":
        return point.get("inverseVolume")
    if relation == "pn":
        return point.get("particleCount")
    return point.get("meanTemperature")


def configure_axis(ax: Any, title: str, xlabel: str, ylabel: str) -> None:
    ax.set_title(title, fontsize=11, fontweight="bold", pad=10)
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.grid(True, color="#d7dee8", linewidth=0.8, alpha=0.75)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)


def format_graph_metric(value: Any, digits: int = 4, suffix: str = "") -> str:
    if value is None:
        return "--"
    try:
        number = float(value)
        if math.isfinite(number):
            return f"{number:.{digits}g}{suffix}"
    except (TypeError, ValueError):
        pass
    return str(value)


def sorted_xy(x_values: list[float], y_values: list[float]) -> tuple[list[float], list[float]]:
    pairs = sorted(zip(x_values, y_values), key=lambda item: item[0])
    if not pairs:
        return [], []
    sorted_x, sorted_y = zip(*pairs)
    return list(sorted_x), list(sorted_y)


def safe_log(value: Any, floor: float = ENERGY_LOG_THEORY_FLOOR) -> float:
    return math.log(max(safe_float(value), floor))


def estimate_distribution_widths(centers: list[float]) -> list[float]:
    sorted_centers = sorted(center for center in centers if math.isfinite(center))
    spacings = [
        right - left
        for left, right in zip(sorted_centers, sorted_centers[1:])
        if right > left
    ]
    if spacings:
        width = min(spacings)
    else:
        scale = max([abs(center) for center in sorted_centers] or [1.0])
        width = scale * 0.08 if scale > 0 else 1.0
    return [width for _ in centers]


def select_semilog_window(point_count: int) -> tuple[list[int], list[int]]:
    if point_count <= 0:
        return [], []
    if point_count <= 4:
        return list(range(point_count)), []

    start_index = max(1, math.floor(point_count * 0.18))
    end_index = min(point_count - 2, math.ceil(point_count * 0.82) - 1)
    if end_index < start_index:
        start_index = 0
        end_index = point_count - 1

    selected = list(range(start_index, end_index + 1))
    excluded = [index for index in range(point_count) if index < start_index or index > end_index]
    return selected, excluded


def build_distribution_series(bins: list[Any], key: str, reference_bins: list[Any] | None = None) -> dict[str, Any]:
    rows = [item if isinstance(item, dict) else {} for item in bins]
    reference_rows = [item if isinstance(item, dict) else {} for item in (reference_bins or [])]
    has_point_energy_log = key == "energyLog" and any(
        "energy" in item or "logProb" in item or "theoreticalLog" in item
        for item in rows
    )
    if has_point_energy_log:
        if reference_rows:
            log_rows = [
                item
                for item in reference_rows
                if safe_float(item.get("probability")) > 0
            ]
            centers = [(safe_float(item.get("binStart")) + safe_float(item.get("binEnd"))) / 2 for item in log_rows]
            values = [math.log(safe_float(item.get("probability"))) for item in log_rows]
            theory_centers = centers
            theory = [
                safe_log(item.get("theoretical"))
                for item in log_rows
                if safe_float(item.get("theoretical")) > 0
            ]
            if len(theory) != len(theory_centers):
                theory_pairs = [
                    (
                        (safe_float(item.get("binStart")) + safe_float(item.get("binEnd"))) / 2,
                        safe_log(item.get("theoretical")),
                    )
                    for item in log_rows
                    if safe_float(item.get("theoretical")) > 0
                ]
                theory_centers = [point[0] for point in theory_pairs]
                theory = [point[1] for point in theory_pairs]
        else:
            centers = [safe_float(item.get("energy")) for item in rows]
            values = [safe_float(item.get("logProb")) for item in rows]
            theory_centers = centers
            theory = [safe_float(item.get("theoreticalLog")) for item in rows]
        selected_indices, excluded_indices = select_semilog_window(len(centers))
        selection_start = centers[selected_indices[0]] if selected_indices else None
        selection_end = centers[selected_indices[-1]] if selected_indices else None
        return {
            "centers": centers,
            "widths": estimate_distribution_widths(centers),
            "values": values,
            "theoryCenters": theory_centers,
            "theory": theory,
            "totalBins": len(reference_rows) if reference_rows else len(rows),
            "omittedBins": max((len(reference_rows) if reference_rows else len(rows)) - len(centers), 0),
            "selectedIndices": selected_indices,
            "excludedIndices": excluded_indices,
            "selectionStart": selection_start,
            "selectionEnd": selection_end,
        }

    centers = [(safe_float(item.get("binStart")) + safe_float(item.get("binEnd"))) / 2 for item in rows]
    widths = [safe_float(item.get("binEnd")) - safe_float(item.get("binStart")) for item in rows]
    if any(width <= 0 for width in widths):
        fallback_widths = estimate_distribution_widths(centers)
        widths = [width if width > 0 else fallback_widths[index] for index, width in enumerate(widths)]
    return {
        "centers": centers,
        "widths": widths,
        "values": [safe_float(item.get("probability")) for item in rows],
        "theoryCenters": centers,
        "theory": [safe_float(item.get("theoretical")) for item in rows],
        "totalBins": len(rows),
        "omittedBins": 0,
    }


def build_distribution_readout(key: str, series: dict[str, Any], params: dict[str, Any]) -> list[tuple[str, str]]:
    if key == "energyLog":
        plotted_bins = len(series.get("centers") or [])
        total_bins = int(series.get("totalBins") or plotted_bins)
        omitted_bins = int(series.get("omittedBins") or 0)
        selected_count = len(series.get("selectedIndices") or [])
        excluded_count = len(series.get("excludedIndices") or [])
        selection_start = series.get("selectionStart")
        selection_end = series.get("selectionEnd")
        fit_window = (
            f"{format_graph_metric(selection_start, 4)}-{format_graph_metric(selection_end, 4)}"
            if selection_start is not None and selection_end is not None
            else "--"
        )
        readout = [
            ("Plotted bins", f"{plotted_bins}/{total_bins}" if total_bins else str(plotted_bins)),
            ("Selected bins", str(selected_count)),
            ("Excluded bins", str(excluded_count)),
            ("Zero bins", str(omitted_bins)),
            ("Fit window", fit_window),
            ("Samples", "final collection"),
        ]
    else:
        readout = [
            ("Bins", str(len(series.get("centers") or []))),
            ("Samples", "final collection"),
        ]
    if params.get("targetTemperature") is not None:
        readout.append(("Target T", format_graph_metric(params.get("targetTemperature"), 4)))
    return readout


def build_semilog_metadata(series: dict[str, Any], params: dict[str, Any]) -> list[tuple[str, str]]:
    rows = build_distribution_readout("energyLog", series, params)
    label_map = {
        "Plotted bins": "Plotted bins",
        "Selected bins": "Selected",
        "Excluded bins": "Excluded",
        "Zero bins": "Zero bins",
        "Fit window": "Fit window",
        "Target T": "Target T",
    }
    return [
        (label_map[label], value)
        for label, value in rows
        if label in label_map
    ]


def build_distribution_metadata(key: str, series: dict[str, Any], params: dict[str, Any]) -> list[tuple[str, str]]:
    return build_semilog_metadata(series, params) if key == "energyLog" else build_distribution_readout(key, series, params)


def build_history_metadata(field: str, rows: list[Any], values: list[float], params: dict[str, Any]) -> list[tuple[str, str]]:
    metadata = [
        ("Windows", str(len(rows))),
        ("Final", format_graph_metric(values[-1] if values else None, 4, "%" if field == "error" else "")),
    ]
    if field == "error":
        mean_abs_error = sum(abs(value) for value in values) / len(values) if values else None
        metadata.insert(1, ("Mean abs err.", format_graph_metric(mean_abs_error, 3, "%")))
        if params.get("targetTemperature") is not None:
            metadata.append(("Target T", format_graph_metric(params.get("targetTemperature"), 4)))
    return metadata


def save_figure(fig: Any, figures_dir: Path, stem: str, caption: str) -> dict[str, Path]:
    figure_dir = figures_dir / stem
    figure_dir.mkdir(parents=True, exist_ok=True)
    outputs = {
        "png": figure_dir / f"{stem}.png",
    }
    save_professional_figure(fig, outputs["png"])
    return outputs


def plot_ideal_verification(data: dict[str, Any], figures_dir: Path, deps: dict[str, Any]) -> dict[str, Path]:
    plt = deps["plt"]
    relation = str(data.get("relation", "pv"))
    points = data.get("points", [])
    x_values = [safe_float(get_ideal_relation_x_value(str(relation), point)) for point in points]
    y_values = [safe_float(point.get("meanPressure")) for point in points]
    ideal_values = [safe_float(point.get("idealPressure")) for point in points]
    verification = data.get("verification", {})
    verdict = verification.get("verdictState") or "not assessed"

    fig, ax = create_professional_figure(
        plt,
        f"{relation.upper()} Verification",
        "Measured pressure compared with ideal reference and linear fit",
        f"{relation.upper()} / {len(points)} samples / {verdict}",
    )
    ax.scatter(
        x_values,
        y_values,
        s=ENGINEERING_EXPORT_STYLE["marker_size"],
        color=PROFESSIONAL_COLORS["primary"],
        edgecolor="white",
        linewidth=0.5,
        label="Measured",
        zorder=4,
    )
    ideal_x, ideal_y = sorted_xy(x_values, ideal_values)
    ax.plot(
        ideal_x,
        ideal_y,
        color=PROFESSIONAL_COLORS["theory"],
        linewidth=ENGINEERING_EXPORT_STYLE["data_line_width"],
        label="Ideal reference",
    )
    if len(x_values) >= 2:
        slope = safe_float(verification.get("slope"))
        intercept = safe_float(verification.get("intercept"))
        fit_values = [slope * x + intercept for x in x_values]
        fit_x, fit_y = sorted_xy(x_values, fit_values)
        ax.plot(
            fit_x,
            fit_y,
            color=PROFESSIONAL_COLORS["fit"],
            linewidth=ENGINEERING_EXPORT_STYLE["fit_line_width"],
            linestyle="--",
            label="Linear fit",
        )
    x_label = (
        "Inverse volume 1/V"
        if relation == "pv"
        else "Particle count N"
        if relation == "pn"
        else "Equilibrium temperature T"
    )
    style_axes(ax, x_label, "Pressure P")
    add_metadata_band(
        fig,
        [
            ("Samples", str(len(points))),
            ("R2", format_graph_metric(verification.get("rSquared"), 5)),
            ("Slope error", format_graph_metric(verification.get("slopeError"), 3, "%")),
        ],
    )
    add_legend(ax, loc="best")
    return save_figure(fig, figures_dir, f"{relation}-verification", f"Figure 1. {relation.upper()} Verification with Ideal Reference and Linear Fit")


def plot_ideal_raw_pv(data: dict[str, Any], figures_dir: Path, deps: dict[str, Any]) -> dict[str, Path] | None:
    if data.get("relation") != "pv":
        return None
    plt = deps["plt"]
    points = data.get("points", [])
    volumes = [safe_float(point.get("volume")) for point in points]
    measured = [safe_float(point.get("meanPressure")) for point in points]
    ideal = [safe_float(point.get("idealPressure")) for point in points]

    fig, ax = create_professional_figure(
        plt,
        "Raw P-V Relationship",
        "Direct pressure response across the physical volume sweep",
        f"PV / {len(points)} samples / raw trace",
    )
    measured_x, measured_y = sorted_xy(volumes, measured)
    ideal_x, ideal_y = sorted_xy(volumes, ideal)
    ax.plot(
        measured_x,
        measured_y,
        marker="o",
        markersize=4.2,
        color=PROFESSIONAL_COLORS["primary"],
        linewidth=ENGINEERING_EXPORT_STYLE["data_line_width"],
        label="Measured",
    )
    ax.plot(
        ideal_x,
        ideal_y,
        marker="s",
        markersize=3.6,
        color=PROFESSIONAL_COLORS["theory"],
        linewidth=ENGINEERING_EXPORT_STYLE["fit_line_width"],
        label="Ideal reference",
    )
    style_axes(ax, "Volume V", "Pressure P")
    add_metadata_band(
        fig,
        [
            ("Samples", str(len(points))),
            ("Volume range", f"{format_graph_metric(min(volumes), 4)}-{format_graph_metric(max(volumes), 4)}" if volumes else "--"),
        ],
    )
    add_legend(ax, loc="best")
    return save_figure(fig, figures_dir, "pv-raw-relationship", "Figure 2. Raw P-V Relationship between Volume and Pressure")


def plot_distribution(data: dict[str, Any], figures_dir: Path, deps: dict[str, Any], key: str, stem: str, title: str, caption: str) -> dict[str, Path] | None:
    final = data.get("finalChartData") or {}
    bins = final.get(key) or []
    if not bins:
        return None
    plt = deps["plt"]
    reference_bins = final.get("energy") if key == "energyLog" else None
    series = build_distribution_series(bins, key, reference_bins)
    centers = series["centers"]
    widths = series["widths"]
    values = series["values"]
    theory_centers = series["theoryCenters"]
    theory = series["theory"]
    params = data.get("params", {})
    x_label = "Speed v" if key == "speed" else "Energy E"
    y_label = "Log density" if key == "energyLog" else "Probability density"
    subtitle = (
        "Final speed histogram against Maxwell-Boltzmann reference"
        if key == "speed"
        else "Final energy histogram against theoretical reference"
        if key == "energy"
        else "Semi-log energy trend against theoretical reference"
    )

    figure_options: dict[str, Any] = {}
    if key == "energyLog":
        figure_options = {
            "figsize": (7.0, 4.95),
            "subplot_top": 0.72,
            "subplot_bottom": 0.145,
        }

    fig, ax = create_professional_figure(
        plt,
        title,
        subtitle,
        "STD / final window / distribution",
        **figure_options,
    )
    if key == "energyLog":
        selected_indices = set(series.get("selectedIndices") or [])
        excluded_indices = set(series.get("excludedIndices") or [])
        selected_x = [centers[index] for index in selected_indices if index < len(centers)]
        selected_y = [values[index] for index in selected_indices if index < len(values)]
        excluded_x = [centers[index] for index in excluded_indices if index < len(centers)]
        excluded_y = [values[index] for index in excluded_indices if index < len(values)]
        ax.scatter(
            selected_x,
            selected_y,
            s=ENGINEERING_EXPORT_STYLE["marker_size"],
            color=PROFESSIONAL_COLORS["primary"],
            edgecolor="white",
            linewidth=0.55,
            label="Selected bins",
            zorder=4,
        )
        if excluded_x:
            ax.scatter(
                excluded_x,
                excluded_y,
                s=ENGINEERING_EXPORT_STYLE["marker_size"] * 0.72,
                facecolors="#d6e0e8",
                edgecolors="#6f8799",
                linewidth=0.5,
                alpha=0.72,
                label="Excluded bins",
                zorder=3,
            )
        selection_start = series.get("selectionStart")
        selection_end = series.get("selectionEnd")
        if selection_start is not None and selection_end is not None:
            ax.axvline(
                safe_float(selection_start),
                color=PROFESSIONAL_COLORS["reference"],
                linewidth=0.8,
                linestyle=(0, (3, 2)),
                label="Fit window",
                zorder=2,
            )
            ax.axvline(
                safe_float(selection_end),
                color=PROFESSIONAL_COLORS["reference"],
                linewidth=0.8,
                linestyle=(0, (3, 2)),
                label="_nolegend_",
                zorder=2,
            )
    else:
        ax.bar(
            centers,
            values,
            width=[w * 0.84 for w in widths],
            color="#d7e7f2",
            edgecolor=PROFESSIONAL_COLORS["primary_dark"],
            linewidth=0.45,
            label="Simulation bins",
            zorder=3,
        )
    theory_x, theory_y = sorted_xy(theory_centers, theory)
    ax.plot(
        theory_x,
        theory_y,
        color=PROFESSIONAL_COLORS["theory"],
        linewidth=ENGINEERING_EXPORT_STYLE["data_line_width"],
        label="Theory",
    )
    style_axes(ax, x_label, y_label)
    if key == "energyLog":
        y_values = [
            value
            for value in [*values, *theory]
            if math.isfinite(value)
        ]
        if y_values:
            min_y = min(y_values)
            max_y = max(y_values)
            span_y = max(max_y - min_y, 1e-6)
            ax.set_ylim(min_y - span_y * 0.08, max_y + span_y * 0.16)
    if key == "energyLog":
        add_metadata_band(fig, build_semilog_metadata(series, params))
        add_legend(ax, loc="upper right")
    else:
        add_metadata_band(fig, build_distribution_metadata(key, series, params))
        add_legend(ax, loc="upper right")
    return save_figure(fig, figures_dir, stem, caption)


def plot_history(data: dict[str, Any], figures_dir: Path, deps: dict[str, Any], field: str, stem: str, title: str, ylabel: str, caption: str) -> dict[str, Path] | None:
    final = data.get("finalChartData") or {}
    rows = final.get("tempHistory") or []
    if not rows:
        return None
    plt = deps["plt"]
    times = [safe_float(item.get("time")) for item in rows]
    values = [safe_float(item.get(field)) for item in rows]
    params = data.get("params", {})
    subtitle = (
        "Thermostat convergence around the target temperature reference"
        if field == "error"
        else "Energy conservation trace across the final sampling window"
    )

    fig, ax = create_professional_figure(
        plt,
        title,
        subtitle,
        f"STD / {len(rows)} windows / trace",
    )
    if field == "error":
        ax.axhline(0, color=PROFESSIONAL_COLORS["reference"], linewidth=0.85, linestyle=":", label="Target reference")
    ax.plot(
        times,
        values,
        color=PROFESSIONAL_COLORS["primary"],
        linewidth=ENGINEERING_EXPORT_STYLE["data_line_width"],
        label="Temperature error" if field == "error" else "Total energy",
    )
    if field == "error":
        ax.fill_between(times, values, 0, color=PROFESSIONAL_COLORS["accent"], alpha=0.12, linewidth=0)
    style_axes(ax, "Time t", ylabel)
    add_metadata_band(fig, build_history_metadata(field, rows, values, params))
    add_legend(ax, loc="best")
    return save_figure(fig, figures_dir, stem, caption)


HEAT_CAPACITY_COPY = {
    "zh-CN": {
        "title": "绝热膨胀法测空气比热容比实验报告",
        "overview": "实验组结果总览",
        "real": "真实",
        "ideal": "理想",
        "group": "第{number}组{scheme}实验",
        "draft_group": "未编号{scheme}实验组",
        "experiment": "第{number}次实验",
        "experiment_axis": "实验次序",
        "theory": "理论参考值",
        "mean": "本组平均值",
        "gamma": "比热容比 γ",
        "incomplete": "未完成数据",
        "completed": "已完成",
        "legacy": "旧版只读未完成数据",
        "parameters": "已知条件与参数快照",
        "records": "原始记录与计算结果",
        "results": "本组结果",
        "score": "本组评分",
        "calculation": "计算评分细则",
        "process_appendix": "实验过程图附录",
        "no_data": "暂无可用数据",
        "operation": "操作平均分",
        "calculation_score": "计算分",
        "total_score": "总分",
        "relative_error": "相对误差",
        "uncertainty": "A 类标准不确定度",
        "std_dev": "样本标准偏差",
        "generated": "导出时间",
        "source_file": "实验文件",
        "included_groups": "报告包含实验组",
        "status": "状态",
        "process": "实验过程",
        "group_axis": "实验组",
        "groups": "组",
        "parameter": "参数",
        "value": "内容",
        "metric": "统计量",
        "number": "次序",
        "item": "评分项",
        "score_short": "得分",
        "max": "满分",
        "evidence": "评分依据",
    },
    "zh-TW": {
        "title": "絕熱膨脹法測空氣比熱容比實驗報告",
        "overview": "實驗組結果總覽",
        "real": "真實",
        "ideal": "理想",
        "group": "第{number}組{scheme}實驗",
        "draft_group": "未編號{scheme}實驗組",
        "experiment": "第{number}次實驗",
        "experiment_axis": "實驗次序",
        "theory": "理論參考值",
        "mean": "本組平均值",
        "gamma": "比熱容比 γ",
        "incomplete": "未完成資料",
        "completed": "已完成",
        "legacy": "舊版唯讀未完成資料",
        "parameters": "已知條件與參數快照",
        "records": "原始記錄與計算結果",
        "results": "本組結果",
        "score": "本組評分",
        "calculation": "計算評分細則",
        "process_appendix": "實驗過程圖附錄",
        "no_data": "暫無可用資料",
        "operation": "操作平均分",
        "calculation_score": "計算分",
        "total_score": "總分",
        "relative_error": "相對誤差",
        "uncertainty": "A 類標準不確定度",
        "std_dev": "樣本標準偏差",
        "generated": "匯出時間",
        "source_file": "實驗檔案",
        "included_groups": "報告包含實驗組",
        "status": "狀態",
        "process": "實驗過程",
        "group_axis": "實驗組",
        "groups": "組",
        "parameter": "參數",
        "value": "內容",
        "metric": "統計量",
        "number": "次序",
        "item": "評分項",
        "score_short": "得分",
        "max": "滿分",
        "evidence": "評分依據",
    },
    "en": {
        "title": "Heat-capacity Ratio by Adiabatic Expansion",
        "overview": "Experiment-group overview",
        "real": "Real",
        "ideal": "Ideal",
        "group": "{scheme} experiment group {number}",
        "draft_group": "Unnumbered {scheme} experiment group",
        "experiment": "Experiment {number}",
        "experiment_axis": "Experiment",
        "theory": "Theoretical reference",
        "mean": "Group mean",
        "gamma": "Heat-capacity ratio γ",
        "incomplete": "INCOMPLETE DATA",
        "completed": "Completed",
        "legacy": "Legacy read-only incomplete data",
        "parameters": "Known conditions and parameter snapshot",
        "records": "Recorded values and calculated results",
        "results": "Group results",
        "score": "Group score",
        "calculation": "Calculation scoring details",
        "process_appendix": "Process-chart appendix",
        "no_data": "No data available",
        "operation": "Operation average",
        "calculation_score": "Calculation score",
        "total_score": "Total score",
        "relative_error": "Relative error",
        "uncertainty": "Type-A standard uncertainty",
        "std_dev": "Sample standard deviation",
        "generated": "Exported",
        "source_file": "Experiment file",
        "included_groups": "Included groups",
        "status": "Status",
        "process": "Experiment process",
        "group_axis": "Experiment group",
        "groups": "groups",
        "parameter": "Parameter",
        "value": "Content",
        "metric": "Metric",
        "number": "No.",
        "item": "Item",
        "score_short": "Score",
        "max": "Max",
        "evidence": "Evidence",
    },
}


HEAT_CAPACITY_REPORT_COPY = {
    "zh-CN": {
        "report_subtitle": "实验记录、计算过程、评分结果与理论比较",
        "real_groups": "真实实验组",
        "ideal_groups": "理想实验组",
        "completed_groups": "已完成组",
        "incomplete_groups": "未完成组",
        "method_and_formula": "计算方法与公式",
        "method_intro": "各次实验先修正零点，再由压强传感器灵敏度换算绝对压强，最后计算空气比热容比。",
        "environment_conditions": "环境与实验条件",
        "instrument_conditions": "仪器与理论参数",
        "raw_records": "原始电压记录",
        "derived_records": "修正量、绝对压强与比热容比",
        "group_progress": "完成进度",
        "comparison": "结果比较",
        "automatic_note": "理想实验组由系统自动完成计算，仅用于与理论参考值比较，不参与评分。",
        "measured_gamma": "各次实验测得值",
        "type_a_interval": "平均值 ± A 类标准不确定度",
        "uncertainty_error_bar": "A 类标准不确定度",
        "real_point": "真实实验组",
        "ideal_point": "理想实验组",
        "incomplete_point": "未完成实验组",
        "operation_scores": "各次实验操作评分",
        "calculation_audit": "计算作答记录",
        "final_answer": "最终答案",
        "reference_answer": "参考值",
        "result_feedback": "结果与反馈",
        "attempts": "尝试",
        "credit": "得分率",
        "first_correct": "首次正确",
        "corrected_correct": "修正后正确",
        "revealed": "查看参考值",
        "unresolved": "未完成",
        "automatic": "系统自动完成",
        "value_and_precision_correct": "数值与有效数字正确",
        "corrected_feedback": "已根据反馈修正",
        "revealed_feedback": "已显示参考值",
        "unresolved_feedback": "尚未形成有效答案",
        "continued": "{label}（续）",
        "figure_label": "图 {number}　{title}",
        "table_label": "表 {number}　{title}",
        "overview_caption": "全部实验组平均比热容比及 A 类标准不确定度",
        "group_chart_caption": "{label}各次实验比热容比与本组统计结果",
        "process_caption": "{label} · 第{number}次实验过程",
        "process_time": "时间 t (s)",
        "pressure_change": "压强变化 ΔP (kPa)",
        "temperature_change": "温度变化 ΔT (K)",
        "record_time": "记录时刻 (s)",
        "record_value": "仪器读数 (mV)",
        "record_item": "记录点",
        "operation_score": "操作分",
        "not_scored": "不评分",
        "gas_air": "空气",
        "page": "第 {number} 页",
        "scheme": "方案",
        "file_information": "实验文件信息",
        "basic_information": "基本信息",
        "group_overview": "实验组概览",
        "experiment_name": "实验名称",
        "file_created": "文件创建时间",
        "first_started": "首次实验开始时间",
        "last_completed": "最后实验完成时间",
        "total_duration": "实验总时长",
        "export_time": "导出时间",
        "group_count": "实验组数量",
        "group_type": "类型",
        "started": "开始时间",
        "completed_at": "完成时间",
        "experiment_count": "实验次数",
        "group_score": "评分",
        "real_results": "真实实验结果",
        "ideal_results": "理想实验结果",
        "actual_records": "实际记录数据",
        "calculation_results": "实验计算结果",
        "group_statistics": "本组统计结果",
        "calculation_evaluation": "计算结果评价",
        "result_figure": "结果图",
        "system_calculation_results": "系统计算结果",
        "theory_comparison": "理论结果比较",
        "score_summary": "评分结果",
        "user_result": "用户结果",
        "evaluation": "评价",
        "difference": "与理论值之差",
        "file_basic_caption": "实验文件基本信息",
        "information_item": "信息项",
        "group_overview_caption": "实验组结果概览",
        "duration_hours": "{hours} 小时 {minutes} 分钟",
        "duration_minutes": "{minutes} 分钟",
        "duration_seconds": "{seconds} 秒",
    },
    "zh-TW": {
        "report_subtitle": "實驗記錄、計算過程、評分結果與理論比較",
        "real_groups": "真實實驗組",
        "ideal_groups": "理想實驗組",
        "completed_groups": "已完成組",
        "incomplete_groups": "未完成組",
        "method_and_formula": "計算方法與公式",
        "method_intro": "各次實驗先修正零點，再由壓強感測器靈敏度換算絕對壓強，最後計算空氣比熱容比。",
        "environment_conditions": "環境與實驗條件",
        "instrument_conditions": "儀器與理論參數",
        "raw_records": "原始電壓記錄",
        "derived_records": "修正量、絕對壓強與比熱容比",
        "group_progress": "完成進度",
        "comparison": "結果比較",
        "automatic_note": "理想實驗組由系統自動完成計算，只用於與理論參考值比較，不參與評分。",
        "measured_gamma": "各次實驗測得值",
        "type_a_interval": "平均值 ± A 類標準不確定度",
        "uncertainty_error_bar": "A 類標準不確定度",
        "real_point": "真實實驗組",
        "ideal_point": "理想實驗組",
        "incomplete_point": "未完成實驗組",
        "operation_scores": "各次實驗操作評分",
        "calculation_audit": "計算作答記錄",
        "final_answer": "最終答案",
        "reference_answer": "參考值",
        "result_feedback": "結果與回饋",
        "attempts": "嘗試",
        "credit": "得分率",
        "first_correct": "首次正確",
        "corrected_correct": "修正後正確",
        "revealed": "查看參考值",
        "unresolved": "未完成",
        "automatic": "系統自動完成",
        "value_and_precision_correct": "數值與有效數字正確",
        "corrected_feedback": "已根據回饋修正",
        "revealed_feedback": "已顯示參考值",
        "unresolved_feedback": "尚未形成有效答案",
        "continued": "{label}（續）",
        "figure_label": "圖 {number}　{title}",
        "table_label": "表 {number}　{title}",
        "overview_caption": "全部實驗組平均比熱容比及 A 類標準不確定度",
        "group_chart_caption": "{label}各次實驗比熱容比與本組統計結果",
        "process_caption": "{label} · 第{number}次實驗過程",
        "process_time": "時間 t (s)",
        "pressure_change": "壓強變化 ΔP (kPa)",
        "temperature_change": "溫度變化 ΔT (K)",
        "record_time": "記錄時刻 (s)",
        "record_value": "儀器讀數 (mV)",
        "record_item": "記錄點",
        "operation_score": "操作分",
        "not_scored": "不評分",
        "gas_air": "空氣",
        "page": "第 {number} 頁",
        "scheme": "方案",
        "file_information": "實驗檔案資訊",
        "basic_information": "基本資訊",
        "group_overview": "實驗組概覽",
        "experiment_name": "實驗名稱",
        "file_created": "檔案建立時間",
        "first_started": "首次實驗開始時間",
        "last_completed": "最後實驗完成時間",
        "total_duration": "實驗總時長",
        "export_time": "匯出時間",
        "group_count": "實驗組數量",
        "group_type": "類型",
        "started": "開始時間",
        "completed_at": "完成時間",
        "experiment_count": "實驗次數",
        "group_score": "評分",
        "real_results": "真實實驗結果",
        "ideal_results": "理想實驗結果",
        "actual_records": "實際記錄資料",
        "calculation_results": "實驗計算結果",
        "group_statistics": "本組統計結果",
        "calculation_evaluation": "計算結果評價",
        "result_figure": "結果圖",
        "system_calculation_results": "系統計算結果",
        "theory_comparison": "理論結果比較",
        "score_summary": "評分結果",
        "user_result": "使用者結果",
        "evaluation": "評價",
        "difference": "與理論值之差",
        "file_basic_caption": "實驗檔案基本資訊",
        "information_item": "資訊項",
        "group_overview_caption": "實驗組結果概覽",
        "duration_hours": "{hours} 小時 {minutes} 分鐘",
        "duration_minutes": "{minutes} 分鐘",
        "duration_seconds": "{seconds} 秒",
    },
    "en": {
        "report_subtitle": "Experimental records, calculations, scoring, and theoretical comparison",
        "real_groups": "Real groups",
        "ideal_groups": "Ideal groups",
        "completed_groups": "Completed groups",
        "incomplete_groups": "Incomplete groups",
        "method_and_formula": "Method and equations",
        "method_intro": "Each experiment is zero-corrected, converted to absolute pressure using sensor sensitivity, and then used to calculate the heat-capacity ratio.",
        "environment_conditions": "Environment and experiment conditions",
        "instrument_conditions": "Instrument and theoretical parameters",
        "raw_records": "Raw voltage records",
        "derived_records": "Corrections, absolute pressures, and heat-capacity ratio",
        "group_progress": "Progress",
        "comparison": "Result comparison",
        "automatic_note": "Ideal groups are calculated automatically for comparison with theory and are not scored.",
        "measured_gamma": "Measured values",
        "type_a_interval": "Mean ± Type-A standard uncertainty",
        "uncertainty_error_bar": "Type-A standard uncertainty",
        "real_point": "Real group",
        "ideal_point": "Ideal group",
        "incomplete_point": "Incomplete group",
        "operation_scores": "Operation scores by experiment",
        "calculation_audit": "Calculation answer record",
        "final_answer": "Final answer",
        "reference_answer": "Reference",
        "result_feedback": "Result and feedback",
        "attempts": "Attempts",
        "credit": "Credit",
        "first_correct": "Correct first time",
        "corrected_correct": "Corrected",
        "revealed": "Reference revealed",
        "unresolved": "Incomplete",
        "automatic": "System calculated",
        "value_and_precision_correct": "Value and precision are correct",
        "corrected_feedback": "Corrected after feedback",
        "revealed_feedback": "Reference value was revealed",
        "unresolved_feedback": "No valid final answer",
        "continued": "{label} (continued)",
        "figure_label": "Figure {number}. {title}",
        "table_label": "Table {number}. {title}",
        "overview_caption": "Mean heat-capacity ratio and Type-A standard uncertainty for all groups",
        "group_chart_caption": "Per-experiment heat-capacity ratios and statistics for {label}",
        "process_caption": "{label}, experiment {number} process",
        "process_time": "Time t (s)",
        "pressure_change": "Pressure change ΔP (kPa)",
        "temperature_change": "Temperature change ΔT (K)",
        "record_time": "Recorded at (s)",
        "record_value": "Instrument reading (mV)",
        "record_item": "Record point",
        "operation_score": "Operation score",
        "not_scored": "Not scored",
        "gas_air": "Air",
        "page": "Page {number}",
        "scheme": "Scheme",
        "file_information": "Experiment file information",
        "basic_information": "Basic information",
        "group_overview": "Experiment-group overview",
        "experiment_name": "Experiment name",
        "file_created": "File created",
        "first_started": "First experiment started",
        "last_completed": "Last experiment completed",
        "total_duration": "Total experiment duration",
        "export_time": "Exported",
        "group_count": "Experiment groups",
        "group_type": "Type",
        "started": "Started",
        "completed_at": "Completed",
        "experiment_count": "Experiments",
        "group_score": "Score",
        "real_results": "Real experiment results",
        "ideal_results": "Ideal experiment results",
        "actual_records": "Recorded data",
        "calculation_results": "Calculated results",
        "group_statistics": "Group statistics",
        "calculation_evaluation": "Calculation evaluation",
        "result_figure": "Result figure",
        "system_calculation_results": "System-calculated results",
        "theory_comparison": "Comparison with theory",
        "score_summary": "Score summary",
        "user_result": "User result",
        "evaluation": "Evaluation",
        "difference": "Difference from theory",
        "file_basic_caption": "Experiment file information",
        "information_item": "Information item",
        "group_overview_caption": "Experiment-group result overview",
        "duration_hours": "{hours} h {minutes} min",
        "duration_minutes": "{minutes} min",
        "duration_seconds": "{seconds} s",
    },
}


def is_heat_capacity_export(data: dict[str, Any]) -> bool:
    return data.get("exportKind") == "heat-capacity-adiabatic-expansion"


def is_piston_oscillation_export(data: dict[str, Any]) -> bool:
    return data.get("exportKind") == "heat-capacity-piston-oscillation"


def get_heat_copy(data: dict[str, Any]) -> dict[str, str]:
    language = str(data.get("language") or "zh-CN")
    resolved_language = language if language in HEAT_CAPACITY_COPY else "zh-CN"
    return {
        **HEAT_CAPACITY_COPY[resolved_language],
        **HEAT_CAPACITY_REPORT_COPY[resolved_language],
    }


def heat_group_label(group: dict[str, Any], copy: dict[str, str]) -> str:
    scheme = copy["ideal"] if group.get("scheme") == "ideal" else copy["real"]
    number = group.get("schemeGroupNumber")
    template = copy["group"] if number is not None else copy["draft_group"]
    return template.format(number=number, scheme=scheme)


def heat_group_status(group: dict[str, Any], copy: dict[str, str]) -> str:
    if group.get("completed"):
        return copy["completed"]
    if group.get("legacyIncomplete"):
        return copy["legacy"]
    return copy["incomplete"]


def heat_group_report_label(group: dict[str, Any], copy: dict[str, str]) -> str:
    label = heat_group_label(group, copy)
    if group.get("completed"):
        return label
    return f"{label} · {heat_group_status(group, copy)}"


def is_heat_group_reportable(group: dict[str, Any]) -> bool:
    explicit = group.get("reportable")
    if isinstance(explicit, bool):
        return explicit
    if group.get("completed"):
        return True
    for experiment in group.get("experiments") or []:
        if not isinstance(experiment, dict):
            continue
        if experiment.get("completed"):
            return True
        records = experiment.get("records") or {}
        if any(records.get(record_id) for record_id in ("u0", "u1", "u2")):
            return True
        chart = ((experiment.get("process") or {}).get("chart") or {})
        if chart.get("actualTrace"):
            return True
    return False


def heat_group_stem(group: dict[str, Any]) -> str:
    scheme = "ideal" if group.get("scheme") == "ideal" else "real"
    number = group.get("schemeGroupNumber")
    if isinstance(number, int) and number > 0:
        return f"{scheme}-group-{number:02d}"
    safe_id = "".join(character if character.isalnum() else "-" for character in str(group.get("id") or "draft"))
    return f"{scheme}-group-draft-{safe_id[:24]}"


def save_heat_figure(fig: Any, target: Path, deps: dict[str, Any]) -> dict[str, Path]:
    target.parent.mkdir(parents=True, exist_ok=True)
    save_professional_figure(fig, target)
    deps["plt"].close(fig)
    return {"png": target}


def plot_heat_capacity_overview(data: dict[str, Any], figures_dir: Path, deps: dict[str, Any]) -> dict[str, Path] | None:
    model = data.get("allGroupsOverview") or {}
    points = [point for point in (model.get("points") or []) if point.get("meanGamma") is not None]
    if len(points) < 2:
        return None
    copy = get_heat_copy(data)
    plt = deps["plt"]
    fig, ax = plt.subplots(figsize=(6.3, 2.85))
    fig.subplots_adjust(left=0.12, right=0.98, bottom=0.21, top=0.73)
    fig.text(0.12, 0.94, copy["overview"], fontsize=15, fontweight="bold", ha="left")
    fig.lines.append(plt.Line2D(
        [0.12, 0.98],
        [0.875, 0.875],
        transform=fig.transFigure,
        color=PROFESSIONAL_COLORS["grid_major"],
        linewidth=0.75,
    ))
    x_values = list(range(1, len(points) + 1))
    y_values = [safe_float(point.get("meanGamma")) for point in points]
    errors = [max(safe_float(point.get("typeAStandardUncertainty")), 0) for point in points]
    colors_by_point = [
        PROFESSIONAL_COLORS["primary"] if point.get("scheme") == "real" else PROFESSIONAL_COLORS["theory"]
        for point in points
    ]
    ax.errorbar(
        x_values,
        y_values,
        yerr=errors,
        fmt="none",
        ecolor=PROFESSIONAL_COLORS["reference"],
        elinewidth=0.9,
        capsize=3,
        label=copy["uncertainty_error_bar"],
        zorder=2,
    )
    labeled_schemes: set[str] = set()
    for x_value, y_value, color, point in zip(x_values, y_values, colors_by_point, points):
        scheme = "ideal" if point.get("scheme") == "ideal" else "real"
        point_label = None
        if scheme not in labeled_schemes:
            point_label = copy["ideal_point"] if scheme == "ideal" else copy["real_point"]
            labeled_schemes.add(scheme)
        ax.scatter(
            [x_value], [y_value],
        s=46,
            color=color if point.get("completed") else "white",
            edgecolor=color,
            linewidth=1.2,
            label=point_label,
            zorder=4,
        )
    if any(not point.get("completed") for point in points):
        ax.scatter(
            [], [],
            s=46,
            color="white",
            edgecolor=PROFESSIONAL_COLORS["reference"],
            linewidth=1.2,
            label=copy["incomplete_point"],
        )
    theory = model.get("theoreticalGamma")
    if theory is not None:
        ax.axhline(safe_float(theory), color=PROFESSIONAL_COLORS["theory"], linewidth=1.1, linestyle="--", label=copy["theory"])
    labels = []
    for point in points:
        number = point.get("schemeGroupNumber")
        if data.get("language") == "en":
            labels.append(f"{'R' if point.get('scheme') == 'real' else 'I'}{number}")
        else:
            labels.append(f"{copy['real'] if point.get('scheme') == 'real' else copy['ideal']}{number}")
    ax.set_xticks(x_values, labels)
    if len(labels) > 6:
        ax.tick_params(axis="x", labelrotation=28)
    ax.set_xlabel(copy["group_axis"], fontsize=10)
    ax.set_ylabel(copy["gamma"], fontsize=10)
    ax.tick_params(axis="both", labelsize=9, colors="#334155")
    ax.grid(axis="y", color="#d7dee8", linewidth=0.55, alpha=0.75)
    ax.grid(axis="x", visible=False)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("#64748b")
    ax.spines["bottom"].set_color("#64748b")
    ax.legend(
        loc="lower center",
        bbox_to_anchor=(0.5, 1.02),
        ncol=min(4, len(ax.get_legend_handles_labels()[0])),
        frameon=False,
        fontsize=9,
    )
    return save_heat_figure(fig, figures_dir / "all-groups-overview.png", deps)


def plot_heat_capacity_lollipop(data: dict[str, Any], group: dict[str, Any], figures_dir: Path, deps: dict[str, Any]) -> dict[str, Path] | None:
    model = group.get("lollipopChart") or {}
    points = [point for point in (model.get("points") or []) if point.get("gamma") is not None]
    if model.get("status") == "hidden" or len(points) < 3:
        return None
    copy = get_heat_copy(data)
    plt = deps["plt"]
    fig, ax = plt.subplots(figsize=(6.3, 3.1))
    fig.subplots_adjust(left=0.12, right=0.98, bottom=0.19, top=0.76)
    group_label = heat_group_label(group, copy)
    group_status = heat_group_status(group, copy)
    fig.text(0.12, 0.94, group_label, fontsize=15, fontweight="bold", ha="left")
    fig.text(0.98, 0.94, group_status, fontsize=8.8, color=PROFESSIONAL_COLORS["muted"], ha="right")
    fig.lines.append(plt.Line2D(
        [0.12, 0.98],
        [0.875, 0.875],
        transform=fig.transFigure,
        color=PROFESSIONAL_COLORS["grid_major"],
        linewidth=0.75,
    ))
    x_values = [int(point.get("experimentNumber") or index + 1) for index, point in enumerate(points)]
    y_values = [safe_float(point.get("gamma")) for point in points]
    theory = safe_float(model.get("theoreticalGamma"), 1.4)
    mean = model.get("meanGamma")
    baseline = min([*y_values, theory, safe_float(mean, theory)])
    span = max([*y_values, theory, safe_float(mean, theory)]) - baseline
    stem_base = baseline - max(span * 0.18, 0.01)
    ax.vlines(x_values, stem_base, y_values, color=PROFESSIONAL_COLORS["accent"], linewidth=1.5, zorder=2)
    ax.scatter(x_values, y_values, s=52, color=PROFESSIONAL_COLORS["primary"], edgecolor="white", linewidth=0.6, label=copy["measured_gamma"], zorder=4)
    ax.axhline(theory, color=PROFESSIONAL_COLORS["theory"], linewidth=1.1, linestyle="--", label=copy["theory"])
    if mean is not None:
        uncertainty = max(safe_float(model.get("typeAStandardUncertainty")), 0)
        if uncertainty > 0:
            ax.axhspan(
                safe_float(mean) - uncertainty,
                safe_float(mean) + uncertainty,
                color=PROFESSIONAL_COLORS["accent"],
                alpha=0.16,
                label=copy["type_a_interval"],
                zorder=1,
            )
        ax.axhline(safe_float(mean), color=PROFESSIONAL_COLORS["fit"], linewidth=1.0, linestyle=":", label=copy["mean"])
    ax.set_xticks(x_values)
    ax.set_ylim(bottom=stem_base)
    ax.set_xlabel(copy["experiment_axis"], fontsize=10)
    ax.set_ylabel(copy["gamma"], fontsize=10)
    ax.tick_params(axis="both", labelsize=9, colors="#334155")
    ax.grid(axis="y", color="#d7dee8", linewidth=0.55, alpha=0.75)
    ax.grid(axis="x", visible=False)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("#64748b")
    ax.spines["bottom"].set_color("#64748b")
    ax.legend(
        loc="lower center",
        bbox_to_anchor=(0.5, 1.02),
        ncol=min(4, len(ax.get_legend_handles_labels()[0])),
        frameon=False,
        fontsize=9,
    )
    if not group.get("completed"):
        fig.text(0.5, 0.51, copy["incomplete"], ha="center", va="center", fontsize=25, color="#a84e2a", alpha=0.12, rotation=18)
    return save_heat_figure(fig, figures_dir / heat_group_stem(group) / "group-results.png", deps)


def plot_heat_capacity_process(data: dict[str, Any], group: dict[str, Any], experiment: dict[str, Any], figures_dir: Path, deps: dict[str, Any]) -> dict[str, Path] | None:
    chart = ((experiment.get("process") or {}).get("chart") or {})
    trace = chart.get("actualTrace") or []
    if not trace:
        return None
    copy = get_heat_copy(data)
    plt = deps["plt"]
    fig, axes = plt.subplots(2, 1, figsize=(7.0, 5.2), sharex=True)
    fig.subplots_adjust(top=0.76, bottom=0.12, left=0.12, right=0.96, hspace=0.16)
    group_label = heat_group_label(group, copy)
    experiment_number = int(experiment.get("experimentNumber") or 1)
    process_complete = bool(group.get("completed") and experiment.get("completed"))
    fig.text(0.12, 0.94, f"{group_label} · {copy['experiment'].format(number=experiment_number)}", fontsize=15, fontweight="bold", ha="left")
    fig.text(0.12, 0.895, copy["process"], fontsize=9.4, color=PROFESSIONAL_COLORS["muted"], ha="left")
    fig.text(0.96, 0.94, copy["completed"] if process_complete else copy["incomplete"], fontsize=8.8, color=PROFESSIONAL_COLORS["muted"], ha="right")
    fig.lines.append(plt.Line2D(
        [0.12, 0.96],
        [0.875, 0.875],
        transform=fig.transFigure,
        color=PROFESSIONAL_COLORS["grid_major"],
        linewidth=0.75,
    ))
    times = [safe_float(point.get("timeS")) for point in trace]
    pressure = [safe_float(point.get("pressureDeltaKPa")) for point in trace]
    temperature = [safe_float(point.get("temperatureDeltaK")) for point in trace]
    axes[0].plot(times, pressure, color=PROFESSIONAL_COLORS["primary"], linewidth=1.25, label="ΔP")
    axes[1].plot(times, temperature, color=PROFESSIONAL_COLORS["theory"], linewidth=1.25, label="ΔT")
    records = chart.get("records") or []
    record_times = {str(record.get("id") or "").lower(): safe_float(record.get("timeS")) for record in records}
    operation_score = (experiment.get("process") or {}).get("operationScore") or {}
    add_metadata_band(fig, [
        ("U0", format_graph_metric(record_times.get("u0"), 4, " s")),
        ("U1", format_graph_metric(record_times.get("u1"), 4, " s")),
        ("U2", format_graph_metric(record_times.get("u2"), 4, " s")),
        (copy["operation_score"], f"{format_graph_metric(operation_score.get('total'), 4)} / {format_graph_metric(operation_score.get('maxScore'), 4)}"),
    ], label_y=0.852, value_y=0.827)
    record_colors = {"u0": "#64748b", "u1": "#2563eb", "u2": "#d97706"}
    for record in records:
        at_s = safe_float(record.get("timeS"))
        record_id = str(record.get("id") or "")
        for axis in axes:
            axis.axvline(at_s, color=record_colors.get(record_id, PROFESSIONAL_COLORS["reference"]), linewidth=0.9, linestyle="--", alpha=0.85)
        axes[0].text(at_s, axes[0].get_ylim()[1], record_id.upper(), fontsize=7.5, ha="center", va="top", color=record_colors.get(record_id, PROFESSIONAL_COLORS["muted"]))
    style_axes(axes[0], "", copy["pressure_change"])
    style_axes(axes[1], copy["process_time"], copy["temperature_change"])
    for axis in axes:
        add_legend(axis, loc="best")
    if not process_complete:
        fig.text(0.5, 0.51, copy["incomplete"], ha="center", va="center", fontsize=25, color="#a84e2a", alpha=0.12, rotation=18)
    return save_heat_figure(
        fig,
        figures_dir / heat_group_stem(group) / f"experiment-{experiment_number:02d}-process.png",
        deps,
    )


def create_heat_capacity_figures(
    data: dict[str, Any],
    figures_dir: Path,
    deps: dict[str, Any],
    *,
    include_process: bool = False,
) -> list[dict[str, Path]]:
    outputs: list[dict[str, Path]] = []
    plt = deps["plt"]
    previous_rc = {
        key: plt.rcParams[key]
        for key in [
            "font.family",
            "font.size",
            "axes.labelsize",
            "xtick.labelsize",
            "ytick.labelsize",
            "legend.fontsize",
            "mathtext.fontset",
        ]
    }
    family = ["Times New Roman"]
    if data.get("language") != "en" and deps.get("matplotlib_cjk_font"):
        family.append(deps["matplotlib_cjk_font"])
    plt.rcParams.update({
        "font.family": family,
        "font.size": 9,
        "axes.labelsize": 10,
        "xtick.labelsize": 9,
        "ytick.labelsize": 9,
        "legend.fontsize": 9,
        "mathtext.fontset": "stix",
    })
    try:
        overview = plot_heat_capacity_overview(data, figures_dir, deps)
        if overview:
            outputs.append(overview)
        for group in data.get("groups") or []:
            lollipop = plot_heat_capacity_lollipop(data, group, figures_dir, deps)
            if lollipop:
                outputs.append(lollipop)
            if include_process:
                for experiment in group.get("experiments") or []:
                    process = plot_heat_capacity_process(data, group, experiment, figures_dir, deps)
                    if process:
                        outputs.append(process)
    finally:
        plt.rcParams.update(previous_rc)
    return outputs


def format_heat_value(value: Any, digits: int = 6, suffix: str = "") -> str:
    if value is None:
        return "-"
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, (int, float)):
        return f"{safe_float(value):.{digits}g}{suffix}"
    return str(value)


def format_heat_fixed(value: Any, decimals: int, suffix: str = "") -> str:
    if value is None or isinstance(value, bool):
        return "-"
    try:
        number = float(value)
    except (TypeError, ValueError):
        return str(value)
    if not math.isfinite(number):
        return "-"
    threshold = 0.5 * (10 ** -decimals)
    if abs(number) < threshold:
        number = 0.0
    return f"{number:.{decimals}f}{suffix}"


def finite_heat_number(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def get_heat_pressure_values(
    group: dict[str, Any],
    experiment: dict[str, Any],
) -> tuple[float | None, float | None, float | None]:
    derived = experiment.get("derivedResult") or {}
    snapshot = group.get("parameterSnapshot") or {}
    environment = snapshot.get("environment") or {}
    sensor = snapshot.get("sensor") or {}
    p0 = finite_heat_number(derived.get("p0KPa"))
    if p0 is None:
        p0 = finite_heat_number(derived.get("atmosphericPressureKPa"))
    if p0 is None:
        p0 = finite_heat_number(environment.get("ambientPressureKPa"))
    sensitivity = finite_heat_number(derived.get("pressureSensitivityMvPerKPa"))
    if sensitivity is None:
        sensitivity = finite_heat_number(sensor.get("pressureMvPerKPa"))
    p1 = finite_heat_number(derived.get("p1KPa"))
    p2 = finite_heat_number(derived.get("p2KPa"))
    u1_prime = finite_heat_number(derived.get("U1CorrectedMv"))
    u2_prime = finite_heat_number(derived.get("U2CorrectedMv"))
    if p0 is not None and sensitivity is not None and sensitivity > 0:
        if p1 is None and u1_prime is not None:
            p1 = p0 + u1_prime / sensitivity
        if p2 is None and u2_prime is not None:
            p2 = p0 + u2_prime / sensitivity
    return p0, p1, p2


def format_heat_calculation_reference(value: Any, answer_kind: str) -> str:
    if answer_kind in {"correctedVoltage"}:
        return format_heat_fixed(value, 2)
    if answer_kind in {"absolutePressure"}:
        return format_heat_fixed(value, 3)
    if answer_kind in {"relativeErrorPercent"}:
        return format_heat_fixed(value, 2, "%")
    return format_heat_fixed(value, 4)


def normalize_heat_symbol(value: Any) -> str:
    """Use PDF-safe scientific labels without Unicode subscript fallback glyphs."""
    return str(value or "").translate(str.maketrans({
        "₀": "0",
        "₁": "1",
        "₂": "2",
        "′": "'",
    }))


def build_heat_calculation_audit_rows(
    group: dict[str, Any],
    copy: dict[str, str],
) -> list[list[str]]:
    export_records = group.get("calculationAudit") or []
    if isinstance(export_records, list) and export_records:
        exported_rows: list[list[str]] = []
        for record in export_records:
            if not isinstance(record, dict):
                continue
            status = str(record.get("status") or "unresolved")
            has_incorrect_attempt = bool(record.get("hasIncorrectValidAttempt"))
            if status == "correct":
                result = copy["corrected_correct"] if has_incorrect_attempt else copy["first_correct"]
                feedback = copy["corrected_feedback"] if has_incorrect_attempt else copy["value_and_precision_correct"]
            elif status == "revealed":
                result = copy["revealed"]
                feedback = copy["revealed_feedback"]
            else:
                result = copy["unresolved"]
                feedback = copy["unresolved_feedback"]
            experiment_number = record.get("experimentNumber")
            prefix = copy["results"] if record.get("scope") == "aggregate" else copy["experiment"].format(number=experiment_number or "-")
            credit_ratio = finite_heat_number(record.get("awardedRatio"))
            symbol = normalize_heat_symbol(
                record.get("symbol") or record.get("answerKind") or copy["item"]
            )
            exported_rows.append([
                f"{prefix} / {symbol}",
                str(record.get("finalAnswer") or "").strip() or "-",
                format_heat_calculation_reference(record.get("expectedValue"), str(record.get("answerKind") or "")),
                f"{result}；{feedback}",
                str(int(record.get("attempts") or 0)),
                "-" if credit_ratio is None else format_heat_fixed(credit_ratio * 100, 0, "%"),
            ])
        if exported_rows:
            return exported_rows
    calculation = group.get("calculation") or {}
    session = calculation.get("session") or {}
    if not isinstance(session, dict):
        return []
    trial_numbers = {
        str(experiment.get("id")): int(experiment.get("experimentNumber") or index + 1)
        for index, experiment in enumerate(group.get("experiments") or [])
    }
    rows: list[list[str]] = []

    def append_field(prefix: str, field: dict[str, Any]) -> None:
        answer = field.get("answer") or {}
        attempts = answer.get("attempts") or []
        status = str(answer.get("status") or "unresolved")
        has_incorrect_attempt = any(
            str(attempt.get("outcome") or "") == "incorrect"
            for attempt in attempts
            if isinstance(attempt, dict)
        )
        if status == "correct":
            result = copy["corrected_correct"] if has_incorrect_attempt else copy["first_correct"]
            feedback = copy["corrected_feedback"] if has_incorrect_attempt else copy["value_and_precision_correct"]
        elif status == "revealed":
            result = copy["revealed"]
            feedback = copy["revealed_feedback"]
        else:
            result = copy["unresolved"]
            feedback = copy["unresolved_feedback"]
        final_answer = str(answer.get("lastSubmittedRaw") or "").strip() or "-"
        credit_ratio = finite_heat_number(answer.get("awardedRatio"))
        credit = "-" if credit_ratio is None else format_heat_fixed(credit_ratio * 100, 0, "%")
        symbol = normalize_heat_symbol(field.get("symbol") or field.get("answerKind") or copy["item"])
        rows.append([
            f"{prefix} / {symbol}",
            final_answer,
            format_heat_calculation_reference(field.get("expectedValue"), str(field.get("answerKind") or "")),
            f"{result}；{feedback}" if group.get("scheme") == "real" else copy["automatic"],
            str(len(attempts)),
            credit,
        ])

    for session_group in session.get("groups") or []:
        if not isinstance(session_group, dict):
            continue
        trial_number = trial_numbers.get(str(session_group.get("trialId")), len(rows) + 1)
        prefix = copy["experiment"].format(number=trial_number)
        for field in session_group.get("fields") or []:
            if isinstance(field, dict):
                append_field(prefix, field)
    aggregate = session.get("aggregate") or {}
    if isinstance(aggregate, dict):
        for field in aggregate.get("fields") or []:
            if isinstance(field, dict):
                append_field(copy["results"], field)
    return rows


def get_heat_record_signal(experiment: dict[str, Any], record_id: str) -> Any:
    record = ((experiment.get("records") or {}).get(record_id) or {})
    return record.get("displayPressureMv")


def write_heat_capacity_data_files(data: dict[str, Any], data_dir: Path, include_package: bool) -> list[Path]:
    outputs: list[Path] = []
    overview = data.get("allGroupsOverview") or {}
    overview_rows = overview.get("points") or []
    if overview_rows:
        outputs.append(write_rows_csv(
            "experiment-groups-overview.csv",
            ["scheme", "groupNumber", "globalOrder", "meanGamma", "typeAStandardUncertainty", "completedExperimentCount", "targetExperimentCount", "completed", "legacyIncomplete"],
            [[
                point.get("scheme"),
                point.get("schemeGroupNumber"),
                point.get("globalOrder"),
                point.get("meanGamma"),
                point.get("typeAStandardUncertainty"),
                point.get("completedExperimentCount"),
                point.get("targetExperimentCount"),
                point.get("completed"),
                point.get("legacyIncomplete"),
            ] for point in overview_rows],
            data_dir,
        ))
    for group in data.get("groups") or []:
        rows = []
        for experiment in group.get("experiments") or []:
            derived = experiment.get("derivedResult") or {}
            p0, p1, p2 = get_heat_pressure_values(group, experiment)
            rows.append([
                experiment.get("experimentNumber"),
                experiment.get("completed"),
                get_heat_record_signal(experiment, "u0"),
                get_heat_record_signal(experiment, "u1"),
                get_heat_record_signal(experiment, "u2"),
                derived.get("U1CorrectedMv"),
                derived.get("U2CorrectedMv"),
                derived.get("atmosphericPressureKPa"),
                derived.get("pressureSensitivityMvPerKPa"),
                p0,
                p1,
                p2,
                derived.get("gamma"),
                (experiment.get("process") or {}).get("status"),
                ((experiment.get("process") or {}).get("operationScore") or {}).get("total"),
            ])
        if rows:
            outputs.append(write_rows_csv(
                f"{heat_group_stem(group)}-experiments.csv",
                ["experimentNumber", "completed", "U0DisplayMv", "U1DisplayMv", "U2DisplayMv", "U1CorrectedMv", "U2CorrectedMv", "atmosphericPressureKPa", "pressureSensitivityMvPerKPa", "P0KPa", "P1KPa", "P2KPa", "gamma", "processStatus", "operationScore"],
                rows,
                data_dir,
            ))
    if include_package:
        target = data_dir / "experiment-package.json"
        target.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        outputs.append(target)
    return outputs


def get_heat_parameter_rows(data: dict[str, Any], group: dict[str, Any]) -> list[tuple[str, str]]:
    snapshot = group.get("parameterSnapshot") or {}
    environment = snapshot.get("environment") or {}
    physics = snapshot.get("physics") or {}
    sensor = snapshot.get("sensor") or {}
    parameter_label_sets = {
        "zh-CN": ["气体类型", "目标实验次数", "环境压强 (kPa)", "环境温度 (K)", "理论 γ", "容器体积 (L)", "压强灵敏度 (mV/kPa)", "温度灵敏度 (mV/K)"],
        "zh-TW": ["氣體類型", "目標實驗次數", "環境壓強 (kPa)", "環境溫度 (K)", "理論 γ", "容器體積 (L)", "壓強靈敏度 (mV/kPa)", "溫度靈敏度 (mV/K)"],
        "en": ["Gas type", "Target experiments", "Ambient pressure (kPa)", "Ambient temperature (K)", "Theoretical γ", "Vessel volume (L)", "Pressure sensitivity (mV/kPa)", "Temperature sensitivity (mV/K)"],
    }
    parameter_labels = parameter_label_sets.get(
        str(data.get("language") or "zh-CN"),
        parameter_label_sets["zh-CN"],
    )
    language = str(data.get("language") or "zh-CN")
    gas_type = group.get("gasType")
    gas_display = {
        "zh-CN": {"air": "空气"},
        "zh-TW": {"air": "空氣"},
        "en": {"air": "Air"},
    }.get(language, {"air": "空气"}).get(str(gas_type), str(gas_type))
    rows = [
        (parameter_labels[0], format_heat_value(gas_display)),
        (parameter_labels[1], format_heat_value(group.get("targetExperimentCount"))),
        (parameter_labels[2], format_heat_value(environment.get("ambientPressureKPa"))),
        (parameter_labels[3], format_heat_value(environment.get("ambientTemperatureK"))),
        (parameter_labels[4], format_heat_value(physics.get("gamma"))),
        (parameter_labels[5], format_heat_value(physics.get("vesselVolumeL"))),
        (parameter_labels[6], format_heat_value(sensor.get("pressureMvPerKPa"))),
        (parameter_labels[7], format_heat_value(sensor.get("temperatureMvPerK"))),
    ]
    return [(label, value) for label, value in rows if value != "-"]


def build_heat_capacity_report(data: dict[str, Any], figures_dir: Path, out_dir: Path, deps: dict[str, Any]) -> Path:
    colors = deps["colors"]
    A4 = deps["A4"]
    Flowable = deps["Flowable"]
    Paragraph = deps["Paragraph"]
    ParagraphStyle = deps["ParagraphStyle"]
    SimpleDocTemplate = deps["SimpleDocTemplate"]
    Canvas = deps["Canvas"]
    Spacer = deps["Spacer"]
    Table = deps["Table"]
    TableStyle = deps["TableStyle"]
    Image = deps["Image"]
    KeepTogether = deps["KeepTogether"]
    PageBreak = deps["PageBreak"]
    TA_CENTER = deps["TA_CENTER"]
    TA_LEFT = deps["TA_LEFT"]
    mm = deps["mm"]
    styles = deps["getSampleStyleSheet"]()
    fonts = register_report_fonts(deps)
    pdfmetrics = deps["pdfmetrics"]
    copy = get_heat_copy(data)

    title_style = ParagraphStyle(
        "HeatTitle",
        parent=styles["Title"],
        fontName=fonts["cjk"],
        bulletFontName=fonts["cjk"],
        fontSize=22,
        leading=30,
        alignment=TA_CENTER,
        textColor=colors.black,
        spaceAfter=10,
    )
    chapter_style = ParagraphStyle(
        "HeatChapter",
        parent=styles["Heading1"],
        fontName=fonts["cjk"],
        bulletFontName=fonts["cjk"],
        fontSize=18,
        leading=25,
        alignment=TA_LEFT,
        textColor=colors.black,
        spaceBefore=11,
        spaceAfter=7,
        keepWithNext=True,
    )
    group_style = ParagraphStyle(
        "HeatGroup",
        parent=styles["Heading2"],
        fontName=fonts["cjk"],
        bulletFontName=fonts["cjk"],
        fontSize=15,
        leading=21,
        alignment=TA_LEFT,
        textColor=colors.black,
        spaceBefore=9,
        spaceAfter=6,
        keepWithNext=True,
    )
    section_style = ParagraphStyle(
        "HeatSection",
        parent=styles["Heading3"],
        fontName=fonts["cjk"],
        bulletFontName=fonts["cjk"],
        fontSize=13,
        leading=18,
        alignment=TA_LEFT,
        textColor=colors.black,
        spaceBefore=7,
        spaceAfter=4,
        keepWithNext=True,
    )
    body_style = ParagraphStyle(
        "HeatBody",
        parent=styles["BodyText"],
        fontName=fonts["cjk"],
        bulletFontName=fonts["cjk"],
        fontSize=11,
        leading=17,
        alignment=TA_LEFT,
        textColor=colors.black,
    )
    table_body_style = ParagraphStyle(
        "HeatTableBody",
        parent=body_style,
        fontSize=9,
        leading=12,
        alignment=TA_LEFT,
        textColor=colors.black,
    )
    table_numeric_style = ParagraphStyle(
        "HeatTableNumeric",
        parent=table_body_style,
        alignment=TA_CENTER,
    )
    table_header_style = ParagraphStyle(
        "HeatTableHeader",
        parent=table_body_style,
        fontName=fonts["cjk"],
        fontSize=10,
        leading=13,
        textColor=colors.black,
        alignment=TA_CENTER,
    )
    table_caption_style = ParagraphStyle(
        "HeatTableCaption",
        parent=body_style,
        fontName=fonts["cjk"],
        fontSize=12,
        leading=16,
        alignment=TA_CENTER,
        textColor=colors.black,
        spaceBefore=2,
        spaceAfter=4,
        keepWithNext=True,
    )
    figure_caption_style = ParagraphStyle(
        "HeatFigureCaption",
        parent=body_style,
        fontName=fonts["cjk"],
        fontSize=12,
        leading=16,
        alignment=TA_CENTER,
        textColor=colors.black,
        spaceBefore=4,
    )

    target = out_dir / "report.pdf"
    doc = SimpleDocTemplate(
        str(target),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=19 * mm,
        bottomMargin=17 * mm,
        title=copy["title"],
        author="Gas Laws Lab",
    )
    doc.hsl_section_context = copy["overview"]

    class ReportSectionMarker(Flowable):
        def __init__(self, label: str):
            super().__init__()
            self.label = label
            self.width = 0
            self.height = 0

        def wrap(self, available_width: float, available_height: float) -> tuple[float, float]:
            return 0, 0

        def draw(self) -> None:
            template = getattr(self.canv, "_doctemplate", None)
            if template is not None:
                template.hsl_section_context = self.label

    table_number = 0
    figure_number = 0

    def uses_simsun(character: str) -> bool:
        codepoint = ord(character)
        return (
            0x2E80 <= codepoint <= 0x303F
            or 0x3400 <= codepoint <= 0x9FFF
            or 0xF900 <= codepoint <= 0xFAFF
            or 0xFF00 <= codepoint <= 0xFFEF
        )

    def split_font_runs(value: Any, *, bold: bool = False) -> list[tuple[str, str]]:
        text = format_heat_value(value)
        if not text:
            text = "-"
        runs: list[tuple[str, str]] = []
        current_font = ""
        current_text = ""
        for character in text:
            font_name = fonts["cjk"] if uses_simsun(character) else (fonts["serif_bold"] if bold else fonts["serif"])
            if current_text and font_name != current_font:
                runs.append((current_font, current_text))
                current_text = ""
            current_font = font_name
            current_text += character
        if current_text:
            runs.append((current_font, current_text))
        return runs

    def mixed_markup(value: Any, *, bold: bool = False) -> str:
        return "".join(
            f'<font name="{font_name}">{escape(text)}</font>'
            for font_name, text in split_font_runs(value, bold=bold)
        )

    def paragraph(value: Any, style: Any, *, bold: bool = False) -> Any:
        return Paragraph(mixed_markup(value, bold=bold), style)

    def is_numeric_table_value(value: Any) -> bool:
        text = format_heat_value(value).strip()
        if text == "-":
            return True
        return bool(re.fullmatch(r"[\d\s.,:eE+/%\-−±]+", text)) and any(
            character.isdigit()
            for character in text
        )

    always_centered_headers = {
        copy[key]
        for key in ("group_axis", "group_type", "number", "status", "value")
        if key in copy
    }

    def centered_text_column_indices(headers: list[str], rows: list[list[Any]]) -> set[int]:
        centered_columns = {
            column_index
            for column_index, header in enumerate(headers)
            if format_heat_value(header).strip() in always_centered_headers
        }
        column_count = max((len(row) for row in rows), default=0)
        for column_index in range(column_count):
            values = [
                format_heat_value(row[column_index]).strip()
                for row in rows
                if column_index < len(row)
            ]
            if len(values) < 2 or any(
                not value or is_numeric_table_value(value)
                for value in values
            ):
                continue
            display_lengths = {
                len(re.sub(r"\s+", "", value))
                for value in values
            }
            if len(display_lengths) == 1:
                centered_columns.add(column_index)
        return centered_columns

    def table_body_paragraph(value: Any, *, center_text: bool = False) -> Any:
        style = table_numeric_style if center_text or is_numeric_table_value(value) else table_body_style
        return paragraph(value, style)

    def make_three_line_table(
        headers: list[str],
        rows: list[list[Any]],
        widths: list[float] | None = None,
        *,
        compact: bool = False,
    ) -> Any:
        table_data = [[paragraph(value, table_header_style, bold=True) for value in headers]]
        centered_text_columns = centered_text_column_indices(headers, rows)
        for row in rows:
            table_data.append([
                table_body_paragraph(value, center_text=column_index in centered_text_columns)
                for column_index, value in enumerate(row)
            ])
        table = Table(table_data, colWidths=widths, repeatRows=1, hAlign="LEFT")
        padding = 2.6 if compact else 3.4
        table.setStyle(TableStyle([
            ("LINEABOVE", (0, 0), (-1, 0), 1.15, colors.black),
            ("LINEBELOW", (0, 0), (-1, 0), 0.55, colors.black),
            ("LINEBELOW", (0, -1), (-1, -1), 1.15, colors.black),
            ("FONTNAME", (0, 0), (-1, -1), fonts["cjk"]),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ALIGN", (0, 0), (-1, 0), "CENTER"),
            ("ALIGN", (0, 1), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 3),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3),
            ("TOPPADDING", (0, 0), (-1, -1), padding),
            ("BOTTOMPADDING", (0, 0), (-1, -1), padding),
        ]))
        return table

    def make_table_caption(number: int, title: str, *, continued: bool = False) -> Any:
        caption_title = copy["continued"].format(label=title) if continued else title
        return paragraph(
            copy["table_label"].format(number=number, title=caption_title),
            table_caption_style,
            bold=True,
        )

    class ContinuedCaptionTable(Table):
        def __init__(self, *args: Any, continued_caption: Any | None = None, **kwargs: Any):
            self.continued_caption = continued_caption
            super().__init__(*args, **kwargs)

        def split(self, available_width: float, available_height: float) -> list[Any]:
            parts = super().split(available_width, available_height)
            for index, part in enumerate(parts):
                if isinstance(part, ContinuedCaptionTable):
                    part.continued_caption = self.continued_caption
                    if index > 0 and self.continued_caption is not None:
                        part._cellvalues[0] = list(part._cellvalues[0])
                        part._cellvalues[0][0] = self.continued_caption
            return parts

    def make_continued_table(
        number: int,
        title: str,
        headers: list[str],
        rows: list[list[Any]],
        widths: list[float] | None,
        *,
        compact: bool,
    ) -> Any:
        column_count = len(headers)
        centered_text_columns = centered_text_column_indices(headers, rows)
        table_data = [
            [make_table_caption(number, title)] + [""] * (column_count - 1),
            [paragraph(value, table_header_style, bold=True) for value in headers],
        ]
        table_data.extend([
            [
                table_body_paragraph(value, center_text=column_index in centered_text_columns)
                for column_index, value in enumerate(row)
            ]
            for row in rows
        ])
        table = ContinuedCaptionTable(
            table_data,
            colWidths=widths,
            repeatRows=2,
            hAlign="LEFT",
            continued_caption=make_table_caption(number, title, continued=True),
        )
        padding = 2.6 if compact else 3.4
        table.setStyle(TableStyle([
            ("SPAN", (0, 0), (-1, 0)),
            ("LINEABOVE", (0, 1), (-1, 1), 1.15, colors.black),
            ("LINEBELOW", (0, 1), (-1, 1), 0.55, colors.black),
            ("LINEBELOW", (0, -1), (-1, -1), 1.15, colors.black),
            ("FONTNAME", (0, 0), (-1, -1), fonts["cjk"]),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ALIGN", (0, 0), (-1, 1), "CENTER"),
            ("ALIGN", (0, 2), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 3),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3),
            ("TOPPADDING", (0, 0), (-1, -1), padding),
            ("BOTTOMPADDING", (0, 0), (-1, -1), padding),
            ("TOPPADDING", (0, 0), (-1, 0), 0),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 4),
        ]))
        return table

    def append_numbered_table(
        story: list[Any],
        title: str,
        headers: list[str],
        rows: list[list[Any]],
        widths: list[float] | None = None,
        *,
        compact: bool = False,
        max_rows_per_table: int | None = None,
        space_after: float = 4 * mm,
    ) -> None:
        nonlocal table_number
        table_number += 1
        safe_rows = rows or [[copy["no_data"]] + ["-"] * max(0, len(headers) - 1)]
        if max_rows_per_table is not None and len(safe_rows) > max_rows_per_table:
            story.append(make_continued_table(
                table_number,
                title,
                headers,
                safe_rows,
                widths,
                compact=compact,
            ))
        else:
            items = [
                make_table_caption(table_number, title),
                make_three_line_table(headers, safe_rows, widths, compact=compact),
            ]
            story.append(KeepTogether(items))
        if space_after > 0:
            story.append(Spacer(1, space_after))

    def make_figure_parts(
        path: Path,
        title: str,
        width: float = 160 * mm,
        height: float = 78 * mm,
    ) -> list[Any]:
        nonlocal figure_number
        figure_number += 1
        image = Image(str(path), width=width, height=height, kind="proportional")
        caption = paragraph(
            copy["figure_label"].format(number=figure_number, title=title),
            figure_caption_style,
            bold=True,
        )
        return [image, caption]

    def make_figure(path: Path, title: str, width: float = 160 * mm, height: float = 78 * mm) -> Any:
        return KeepTogether(make_figure_parts(path, title, width, height))

    def append_result_summary(story: list[Any], result: dict[str, Any], title: str) -> None:
        append_numbered_table(
            story,
            title,
            [copy["mean"], copy["std_dev"], copy["uncertainty"], copy["theory"], copy["relative_error"]],
            [[
                format_heat_fixed(result.get("meanGamma"), 4),
                format_heat_fixed(result.get("sampleStandardDeviation"), 4),
                format_heat_fixed(result.get("typeAStandardUncertainty"), 4),
                format_heat_fixed(result.get("theoreticalGamma"), 4),
                format_heat_fixed(result.get("relativeErrorPercent"), 2, "%"),
            ]],
            [34 * mm] * 5,
            compact=True,
        )

    def format_timestamp(value: Any) -> str:
        timestamp_ms = finite_heat_number(value)
        if timestamp_ms is None or timestamp_ms <= 0:
            return "-"
        return datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M:%S")

    def format_duration(start_ms: Any, end_ms: Any) -> str:
        start = finite_heat_number(start_ms)
        end = finite_heat_number(end_ms)
        if start is None or end is None or end < start:
            return "-"
        total_seconds = max(0, int(round((end - start) / 1000)))
        hours, remainder = divmod(total_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        if hours:
            return copy["duration_hours"].format(hours=hours, minutes=minutes)
        if minutes:
            return copy["duration_minutes"].format(minutes=minutes)
        return copy["duration_seconds"].format(seconds=seconds)

    groups = sorted(
        [
            group
            for group in (data.get("groups") or [])
            if isinstance(group, dict) and is_heat_group_reportable(group)
        ],
        key=lambda group: (
            0 if group.get("scheme") == "real" else 1,
            int(group.get("schemeGroupNumber") or 999999),
            int(group.get("globalOrder") or 999999),
        ),
    )
    real_groups = [group for group in groups if group.get("scheme") == "real"]
    ideal_groups = [group for group in groups if group.get("scheme") == "ideal"]
    started_times = [
        value
        for value in (finite_heat_number(group.get("startedAtMs")) for group in groups)
        if value is not None and value > 0
    ]
    completed_times = [
        value
        for value in (finite_heat_number(group.get("completedAtMs")) for group in groups)
        if value is not None and value > 0
    ]
    first_started_at = min(started_times) if started_times else None
    last_completed_at = max(completed_times) if completed_times else None
    generated_at = format_timestamp(data.get("exportedAtMs"))

    story: list[Any] = [
        Spacer(1, 6 * mm),
        paragraph(copy["title"], title_style, bold=True),
        ReportSectionMarker(copy["file_information"]),
        paragraph(f"1 {copy['file_information']}", chapter_style, bold=True),
        paragraph(f"1.1 {copy['basic_information']}", group_style, bold=True),
    ]
    append_numbered_table(
        story,
        copy["file_basic_caption"],
        [copy["information_item"], copy["value"]],
        [
            [copy["source_file"], data.get("fileName") or "-"],
            [copy["experiment_name"], data.get("experimentName") or copy["title"]],
            [copy["file_created"], format_timestamp(data.get("sourceCreatedAtMs"))],
            [copy["first_started"], format_timestamp(first_started_at)],
            [copy["last_completed"], format_timestamp(last_completed_at)],
            [copy["total_duration"], format_duration(first_started_at, last_completed_at)],
            [copy["export_time"], generated_at],
            [copy["group_count"], len(groups)],
            [copy["real_groups"], len(real_groups)],
            [copy["ideal_groups"], len(ideal_groups)],
        ],
        [52 * mm, 118 * mm],
    )

    story.append(paragraph(f"1.2 {copy['group_overview']}", group_style, bold=True))
    overview_rows: list[list[Any]] = []
    for group in groups:
        result = group.get("result") or {}
        score = group.get("score") or {}
        scheme_label = copy["ideal"] if group.get("scheme") == "ideal" else copy["real"]
        completed_count = int(group.get("completedExperimentCount") or 0)
        target_count = int(group.get("targetExperimentCount") or 0)
        if group.get("scheme") == "ideal":
            score_text = copy["not_scored"]
        elif score:
            score_text = (
                f"{format_heat_fixed(score.get('total'), 1)} / "
                f"{format_heat_value(score.get('maxScore'))}"
            )
        else:
            score_text = "-"
        overview_rows.append([
            heat_group_label(group, copy),
            scheme_label,
            format_timestamp(group.get("startedAtMs")),
            format_timestamp(group.get("completedAtMs")),
            f"{completed_count} / {target_count}",
            heat_group_status(group, copy),
            format_heat_fixed(result.get("meanGamma"), 4),
            format_heat_fixed(result.get("relativeErrorPercent"), 2, "%"),
            score_text,
        ])
    append_numbered_table(
        story,
        copy["group_overview_caption"],
        [
            copy["group_axis"],
            copy["group_type"],
            copy["started"],
            copy["completed_at"],
            copy["experiment_count"],
            copy["status"],
            copy["mean"],
            copy["relative_error"],
            copy["group_score"],
        ],
        overview_rows,
        [25 * mm, 13 * mm, 21 * mm, 21 * mm, 17 * mm, 19 * mm, 20 * mm, 18 * mm, 16 * mm],
        compact=True,
        max_rows_per_table=10,
        space_after=0,
    )
    overview_path = figures_dir / "all-groups-overview.png"
    if overview_path.exists():
        story.append(make_figure(overview_path, copy["overview_caption"], 160 * mm, 72 * mm))
    if not groups:
        story.append(paragraph(copy["no_data"], body_style))

    chapter_number = 2
    for scheme, chapter_title, scheme_groups in [
        ("real", copy["real_results"], real_groups),
        ("ideal", copy["ideal_results"], ideal_groups),
    ]:
        if not scheme_groups:
            continue
        story.extend([
            ReportSectionMarker(chapter_title),
            PageBreak(),
            paragraph(f"{chapter_number} {chapter_title}", chapter_style, bold=True),
        ])
        for group_position, group in enumerate(scheme_groups, start=1):
            label = heat_group_label(group, copy)
            report_label = heat_group_report_label(group, copy)
            group_prefix = f"{chapter_number}.{group_position}"
            context_label = f"{group_prefix} {report_label}"
            if group_position > 1:
                story.extend([ReportSectionMarker(context_label), PageBreak()])
            else:
                story.append(ReportSectionMarker(context_label))
            story.extend([
                paragraph(context_label, group_style, bold=True),
            ])

            raw_rows: list[list[Any]] = []
            derived_rows: list[list[Any]] = []
            for experiment in group.get("experiments") or []:
                derived = experiment.get("derivedResult") or {}
                experiment_number = int(experiment.get("experimentNumber") or len(raw_rows) + 1)
                p0, p1, p2 = get_heat_pressure_values(group, experiment)
                raw_rows.append([
                    copy["experiment"].format(number=experiment_number),
                    format_heat_fixed(get_heat_record_signal(experiment, "u0"), 2),
                    format_heat_fixed(get_heat_record_signal(experiment, "u1"), 2),
                    format_heat_fixed(get_heat_record_signal(experiment, "u2"), 2),
                    copy["completed"] if experiment.get("completed") else copy["incomplete"],
                ])
                derived_rows.append([
                    copy["experiment"].format(number=experiment_number),
                    format_heat_fixed(derived.get("U1CorrectedMv"), 2),
                    format_heat_fixed(derived.get("U2CorrectedMv"), 2),
                    format_heat_fixed(p0, 3),
                    format_heat_fixed(p1, 3),
                    format_heat_fixed(p2, 3),
                    format_heat_fixed(derived.get("gamma"), 4),
                ])

            subsection_number = 1
            story.append(paragraph(
                f"{group_prefix}.{subsection_number} {copy['actual_records']}",
                section_style,
                bold=True,
            ))
            append_numbered_table(
                story,
                f"{report_label}{copy['actual_records']}",
                [copy["number"], "U0 (mV)", "U1 (mV)", "U2 (mV)", copy["status"]],
                raw_rows,
                [28 * mm, 36 * mm, 36 * mm, 36 * mm, 34 * mm],
                compact=True,
            )

            subsection_number += 1
            calculation_section_title = (
                copy["calculation_results"]
                if scheme == "real"
                else copy["system_calculation_results"]
            )
            story.append(paragraph(
                f"{group_prefix}.{subsection_number} {calculation_section_title}",
                section_style,
                bold=True,
            ))
            append_numbered_table(
                story,
                f"{report_label}{calculation_section_title}",
                [copy["number"], "U1' (mV)", "U2' (mV)", "P0 (kPa)", "P1 (kPa)", "P2 (kPa)", "γ"],
                derived_rows,
                [18 * mm, 22 * mm, 22 * mm, 27 * mm, 27 * mm, 27 * mm, 27 * mm],
                compact=True,
            )
            result = group.get("result") or {}
            append_result_summary(story, result, f"{report_label}{copy['group_statistics']}")

            group_figure = figures_dir / heat_group_stem(group) / "group-results.png"
            if scheme == "real":
                audit_rows = [
                    [row[0], row[1], row[2], row[3], row[5]]
                    for row in build_heat_calculation_audit_rows(group, copy)
                ]
                subsection_number += 1
                story.append(paragraph(
                    f"{group_prefix}.{subsection_number} {copy['calculation_evaluation']}",
                    section_style,
                    bold=True,
                ))
                score = group.get("score") or {}
                calculation_score = score.get("calculation") or {}
                if score:
                    append_numbered_table(
                        story,
                        f"{report_label}{copy['score_summary']}",
                        [copy["operation"], copy["calculation_score"], copy["total_score"]],
                        [[
                            f"{format_heat_fixed(score.get('operationAverage'), 1)} / {format_heat_value(score.get('operationMaxScore'))}",
                            f"{format_heat_fixed(calculation_score.get('total'), 1)} / {format_heat_value(calculation_score.get('maxScore'))}",
                            f"{format_heat_fixed(score.get('total'), 1)} / {format_heat_value(score.get('maxScore'))}",
                        ]],
                        [170 * mm / 3] * 3,
                        compact=True,
                    )
                if audit_rows:
                    append_numbered_table(
                        story,
                        f"{report_label}{copy['calculation_evaluation']}",
                        [
                            copy["item"],
                            copy["user_result"],
                            copy["reference_answer"],
                            copy["evaluation"],
                            copy["credit"],
                        ],
                        audit_rows,
                        [38 * mm, 29 * mm, 29 * mm, 51 * mm, 23 * mm],
                        compact=True,
                        max_rows_per_table=10,
                    )
                elif not score:
                    story.append(paragraph(copy["no_data"], body_style))

                subsection_number += 1
                result_figure_heading = paragraph(
                    f"{group_prefix}.{subsection_number} {copy['result_figure']}",
                    section_style,
                    bold=True,
                )
                if group_figure.exists():
                    story.append(KeepTogether([
                        result_figure_heading,
                        *make_figure_parts(
                            group_figure,
                            copy["group_chart_caption"].format(label=report_label),
                        ),
                    ]))
                else:
                    story.append(KeepTogether([
                        result_figure_heading,
                        paragraph(copy["no_data"], body_style),
                    ]))
            else:
                subsection_number += 1
                story.append(paragraph(
                    f"{group_prefix}.{subsection_number} {copy['theory_comparison']}",
                    section_style,
                    bold=True,
                ))
                story.append(paragraph(copy["automatic_note"], body_style))
                mean_gamma = finite_heat_number(result.get("meanGamma"))
                theory_gamma = finite_heat_number(result.get("theoreticalGamma"))
                difference = (
                    mean_gamma - theory_gamma
                    if mean_gamma is not None and theory_gamma is not None
                    else None
                )
                append_numbered_table(
                    story,
                    f"{report_label}{copy['theory_comparison']}",
                    [copy["mean"], copy["theory"], copy["difference"], copy["relative_error"]],
                    [[
                        format_heat_fixed(mean_gamma, 4),
                        format_heat_fixed(theory_gamma, 4),
                        format_heat_fixed(difference, 4),
                        format_heat_fixed(result.get("relativeErrorPercent"), 2, "%"),
                    ]],
                    [42.5 * mm] * 4,
                    compact=True,
                )
                subsection_number += 1
                result_figure_heading = paragraph(
                    f"{group_prefix}.{subsection_number} {copy['result_figure']}",
                    section_style,
                    bold=True,
                )
                if group_figure.exists():
                    story.append(KeepTogether([
                        result_figure_heading,
                        *make_figure_parts(
                            group_figure,
                            copy["group_chart_caption"].format(label=report_label),
                        ),
                    ]))
                else:
                    story.append(KeepTogether([
                        result_figure_heading,
                        paragraph(copy["no_data"], body_style),
                    ]))
        chapter_number += 1

    def ellipsize(value: Any, limit: int) -> str:
        text = str(value or "")
        return text if len(text) <= limit else f"{text[:limit - 3]}..."

    def draw_mixed_string(
        canvas: Any,
        x: float,
        y: float,
        value: Any,
        font_size: float,
        *,
        align: str = "left",
    ) -> None:
        runs = split_font_runs(value)
        total_width = sum(
            pdfmetrics.stringWidth(text, font_name, font_size)
            for font_name, text in runs
        )
        cursor = x - total_width if align == "right" else x
        for font_name, text in runs:
            canvas.setFont(font_name, font_size)
            canvas.drawString(cursor, y, text)
            cursor += pdfmetrics.stringWidth(text, font_name, font_size)

    def draw_footer(canvas: Any, document: Any) -> None:
        canvas.setFillColor(colors.HexColor("#64748b"))
        draw_mixed_string(canvas, 18 * mm, 9 * mm, "Gas Laws Lab", 8)
        draw_mixed_string(
            canvas,
            A4[0] - 18 * mm,
            9 * mm,
            copy["page"].format(number=document.page),
            8,
            align="right",
        )

    def draw_first_page(canvas: Any, document: Any) -> None:
        canvas.saveState()
        draw_footer(canvas, document)
        canvas.restoreState()

    def draw_later_page(canvas: Any, document: Any) -> None:
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#cbd5e1"))
        canvas.setLineWidth(0.4)
        canvas.line(18 * mm, A4[1] - 12 * mm, A4[0] - 18 * mm, A4[1] - 12 * mm)
        canvas.setFillColor(colors.HexColor("#64748b"))
        draw_mixed_string(canvas, 18 * mm, A4[1] - 9 * mm, ellipsize(data.get("fileName"), 24), 8)
        draw_mixed_string(
            canvas,
            A4[0] - 18 * mm,
            A4[1] - 9 * mm,
            ellipsize(getattr(document, "hsl_section_context", copy["title"]), 28),
            8,
            align="right",
        )
        draw_footer(canvas, document)
        canvas.restoreState()

    def make_report_canvas(*args: Any, **kwargs: Any) -> Any:
        kwargs["initialFontName"] = fonts["serif"]
        return Canvas(*args, **kwargs)

    doc.build(
        story,
        onFirstPage=draw_first_page,
        onLaterPages=draw_later_page,
        canvasmaker=make_report_canvas,
    )
    return target


PISTON_OSCILLATION_REPORT_COPY = {
    "zh-CN": {
        "title": "活塞振动法测空气比热容比实验报告",
        "mode": "自由模式",
        "file_information": "实验文件信息",
        "basic_information": "基本信息",
        "result_overview": "本轮结果概览",
        "actual_records": "实际记录数据",
        "measurement_records": "正式测量记录",
        "pressure_curves": "正式压力曲线",
        "calculation_results": "实验计算结果",
        "period_results": "周期处理结果",
        "fit_results": "线性拟合结果",
        "final_results": "最终计算结果",
        "process_score": "过程与评分摘要",
        "process_review": "过程回顾摘要",
        "process_evidence": "关键过程证据",
        "score_results": "评分结果",
        "evidence_diagnostics": "过程证据诊断",
        "operation_diagnostics": "各次实验过程诊断",
        "scoring_status": "评分状态",
        "file": "实验文件",
        "experiment": "实验名称",
        "experiment_mode": "实验模式",
        "experiment_scheme": "实验方案",
        "gas_type": "气体类型",
        "parameter_profile": "参数档案版本",
        "scoring_eligibility": "评分资格",
        "real": "真实实验条件",
        "ideal": "理想实验过程",
        "air": "空气",
        "helium": "氦气",
        "scored": "参与评分",
        "not_scored": "不参与评分",
        "file_created": "文件创建时间",
        "first_started": "首次实验开始时间",
        "last_completed": "最终计算完成时间",
        "duration": "实验总时长",
        "exported": "导出时间",
        "information_item": "信息项",
        "content": "内容",
        "measurement_count": "正式测量",
        "fit_points": "拟合点",
        "theory": "理论值",
        "relative_error": "相对误差",
        "operation_calculation": "操作+计算",
        "total_score": "总分",
        "number": "次序",
        "target_height": "目标/mm",
        "actual_height": "实际/mm",
        "height_source": "高度来源",
        "sample_rate": "采样/Hz",
        "trigger": "触发/kPa",
        "samples": "样本",
        "duration_s": "时长/s",
        "release_gap": "松手差/ms",
        "system": "系统",
        "custom": "自定义",
        "period_count": "周期数",
        "delta_time": "Δt/s",
        "period": "T/s",
        "period_squared": "T^2/s^2",
        "maximum_deviation": "最大偏离",
        "included": "拟合",
        "yes": "是",
        "no": "否",
        "slope": "斜率/(m·s^-2)",
        "intercept": "截距/m",
        "calculation_item": "计算项目",
        "user_result": "用户结果",
        "reference": "参考值",
        "evaluation": "评价",
        "credit": "得分率",
        "area": "气缸横截面积 A",
        "gamma": "气体比热容比 γ",
        "first_correct": "首次正确",
        "retry_correct": "修改后正确",
        "revealed": "查看答案后完成",
        "unresolved": "未完成",
        "height_deviation": "高度偏差",
        "touchdown": "触底",
        "press_count": "按压次数",
        "reset_count": "重置次数",
        "formal_result": "正式结果",
        "saved": "保存",
        "operation_score": "操作分",
        "status": "评价",
        "main_evidence": "主要依据",
        "operation_average": "操作平均分",
        "group_calculation": "整组计算分",
        "report_note": "报告只保留与结果和评分直接相关的过程证据；完整操作时间条仍可在软件的过程回顾页面中查看。",
        "unscored_report_note": "报告保留与结果相关的过程证据；理想实验条件不生成数值评分，完整操作时间条仍可在软件的过程回顾页面中查看。",
        "curve_note": "图中浅绿色区域为最终周期选区；橙色虚线为触发阈值。图形仅用于报告显示，保存的正式样本未被改写。",
        "fit_caption": "本轮 h-T^2 线性拟合与最终选点",
        "curve_caption": "各次正式压力曲线及最终周期选区",
        "page": "第 {number} 页",
    },
    "zh-TW": {
        "title": "活塞振動法測空氣比熱容比實驗報告",
        "mode": "自由模式",
        "file_information": "實驗檔案資訊",
        "basic_information": "基本資訊",
        "result_overview": "本輪結果概覽",
        "actual_records": "實際記錄資料",
        "measurement_records": "正式測量記錄",
        "pressure_curves": "正式壓力曲線",
        "calculation_results": "實驗計算結果",
        "period_results": "週期處理結果",
        "fit_results": "線性擬合結果",
        "final_results": "最終計算結果",
        "process_score": "過程與評分摘要",
        "process_review": "過程回顧摘要",
        "process_evidence": "關鍵過程證據",
        "score_results": "評分結果",
        "evidence_diagnostics": "過程證據診斷",
        "operation_diagnostics": "各次實驗過程診斷",
        "scoring_status": "評分狀態",
        "experiment_scheme": "實驗方案",
        "gas_type": "氣體類型",
        "parameter_profile": "參數檔案版本",
        "scoring_eligibility": "評分資格",
        "real": "真實實驗條件",
        "ideal": "理想實驗過程",
        "air": "空氣",
        "helium": "氦氣",
        "scored": "參與評分",
        "not_scored": "不參與評分",
    },
    "en": {
        "title": "Air Heat-Capacity Ratio by Piston Oscillation",
        "mode": "Free mode",
        "file_information": "Experiment file information",
        "basic_information": "Basic information",
        "result_overview": "Result overview",
        "actual_records": "Recorded data",
        "measurement_records": "Formal measurements",
        "pressure_curves": "Formal pressure curves",
        "calculation_results": "Calculation results",
        "period_results": "Period processing",
        "fit_results": "Linear fit",
        "final_results": "Final calculation",
        "process_score": "Process and score summary",
        "process_review": "Process review summary",
        "process_evidence": "Key process evidence",
        "score_results": "Scores",
        "evidence_diagnostics": "Process evidence",
        "operation_diagnostics": "Per-run process diagnostics",
        "scoring_status": "Scoring status",
        "experiment_scheme": "Experiment scheme",
        "gas_type": "Gas type",
        "parameter_profile": "Parameter profile version",
        "scoring_eligibility": "Scoring eligibility",
        "real": "Real experiment conditions",
        "ideal": "Ideal experiment process",
        "air": "Air",
        "helium": "Helium",
        "scored": "Scored",
        "not_scored": "Not scored",
    },
}


def get_piston_report_copy(data: dict[str, Any]) -> dict[str, str]:
    language = str(data.get("language") or "zh-CN")
    base = PISTON_OSCILLATION_REPORT_COPY["zh-CN"]
    translated = PISTON_OSCILLATION_REPORT_COPY.get(language, {})
    return {**base, **translated}


def piston_finite_number(value: Any) -> float | None:
    try:
        number = float(value)
        return number if math.isfinite(number) else None
    except (TypeError, ValueError):
        return None


def format_piston_number(value: Any, decimals: int, suffix: str = "") -> str:
    number = piston_finite_number(value)
    return "--" if number is None else f"{number:.{decimals}f}{suffix}"


def format_piston_datetime(value: Any) -> str:
    milliseconds = piston_finite_number(value)
    if milliseconds is None:
        return "--"
    return datetime.fromtimestamp(milliseconds / 1000).strftime("%Y-%m-%d %H:%M:%S")


def format_piston_duration(start_value: Any, end_value: Any, language: str) -> str:
    start = piston_finite_number(start_value)
    end = piston_finite_number(end_value)
    if start is None or end is None or end < start:
        return "--"
    total_seconds = int(round((end - start) / 1000))
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    if language == "en":
        return f"{hours} h {minutes} min" if hours else f"{minutes} min {seconds} s"
    return f"{hours} 小时 {minutes} 分钟" if hours else f"{minutes} 分钟 {seconds} 秒"


def save_piston_figure(fig: Any, target: Path, deps: dict[str, Any]) -> dict[str, Path]:
    target.parent.mkdir(parents=True, exist_ok=True)
    save_professional_figure(fig, target)
    deps["plt"].close(fig)
    return {"png": target}


def plot_piston_oscillation_fit(
    data: dict[str, Any],
    figures_dir: Path,
    deps: dict[str, Any],
) -> dict[str, Path] | None:
    fit = data.get("linearFitResult") or {}
    points = [point for point in (fit.get("points") or []) if isinstance(point, dict)]
    if len(points) < 2:
        return None
    copy = get_piston_report_copy(data)
    plt = deps["plt"]
    cjk_font = deps.get("matplotlib_cjk_font")
    fig, ax = plt.subplots(figsize=(6.5, 3.05))
    fig.subplots_adjust(left=0.13, right=0.97, bottom=0.2, top=0.88)
    x_values = [safe_float(point.get("periodSquaredS2")) for point in points]
    y_values = [safe_float(point.get("heightM")) for point in points]
    ax.scatter(
        x_values,
        y_values,
        s=42,
        color=PROFESSIONAL_COLORS["primary"],
        edgecolor="white",
        linewidth=0.7,
        label="参与拟合" if data.get("language") != "en" else "Included in fit",
        zorder=3,
    )
    slope = safe_float(fit.get("slopeMPerS2"))
    intercept = safe_float(fit.get("interceptM"))
    x_min, x_max = min(x_values), max(x_values)
    padding = max((x_max - x_min) * 0.08, 1e-6)
    line_x = [x_min - padding, x_max + padding]
    line_y = [slope * value + intercept for value in line_x]
    ax.plot(
        line_x,
        line_y,
        color=PROFESSIONAL_COLORS["fit"],
        linewidth=1.35,
        label="线性拟合" if data.get("language") != "en" else "Linear fit",
    )
    ax.text(
        0.03,
        0.95,
        f"h = {slope:.5f} T^2 {intercept:+.6f}\nR^2 = {safe_float(fit.get('rSquared')):.4f}",
        transform=ax.transAxes,
        ha="left",
        va="top",
        fontsize=8.5,
        bbox={"boxstyle": "round,pad=0.35", "facecolor": "white", "edgecolor": "#cbd5e1"},
    )
    ax.set_title(
        "h-T^2 线性拟合" if data.get("language") != "en" else "h-T^2 linear fit",
        fontsize=11,
        fontfamily=cjk_font if data.get("language") != "en" else None,
    )
    ax.set_xlabel("T^2 / s^2")
    ax.set_ylabel("h / m")
    ax.grid(True, color="#d7dee8", linewidth=0.65, alpha=0.78)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.legend(
        loc="lower right",
        frameon=False,
        fontsize=8.5,
        ncol=2,
        prop={"family": cjk_font, "size": 8.5} if data.get("language") != "en" and cjk_font else None,
    )
    return save_piston_figure(fig, figures_dir / "piston-h-t2-fit.png", deps)


def plot_piston_oscillation_pressure_overview(
    data: dict[str, Any],
    figures_dir: Path,
    deps: dict[str, Any],
) -> dict[str, Path] | None:
    measurements = [
        measurement
        for measurement in (data.get("measurements") or [])
        if isinstance(measurement, dict) and measurement.get("samples")
    ]
    if not measurements:
        return None
    language = str(data.get("language") or "zh-CN")
    plt = deps["plt"]
    cjk_font = deps.get("matplotlib_cjk_font")
    columns = 2
    rows = math.ceil(len(measurements) / columns)
    fig, axes = plt.subplots(rows, columns, figsize=(6.75, 1.72 * rows + 0.28), squeeze=False)
    fig.subplots_adjust(
        left=0.085,
        right=0.985,
        bottom=0.12 if rows <= 2 else 0.08,
        top=0.94,
        hspace=0.5,
        wspace=0.24,
    )
    for index, axis in enumerate(axes.flat):
        if index >= len(measurements):
            axis.axis("off")
            continue
        measurement = measurements[index]
        samples = measurement.get("samples") or []
        stride = max(1, math.ceil(len(samples) / 1200))
        rendered = samples[::stride]
        if rendered and rendered[-1] is not samples[-1]:
            rendered = [*rendered, samples[-1]]
        times = [safe_float(sample.get("timeS")) for sample in rendered]
        pressures = [safe_float(sample.get("absolutePressureKpa")) for sample in rendered]
        axis.plot(times, pressures, color=PROFESSIONAL_COLORS["primary"], linewidth=0.95)
        selection = measurement.get("selection") or {}
        range_start = piston_finite_number(selection.get("rangeStartTimeS"))
        range_end = piston_finite_number(selection.get("rangeEndTimeS"))
        if range_start is not None and range_end is not None and range_end > range_start:
            axis.axvspan(range_start, range_end, color="#8bbd9b", alpha=0.2, linewidth=0)
        trigger = piston_finite_number((measurement.get("acquisitionSettings") or {}).get("triggerThresholdKpa"))
        if trigger is not None:
            axis.axhline(trigger, color="#dc8b28", linewidth=0.8, linestyle="--")
        source = measurement.get("heightSource")
        source_label = (
            "custom" if language == "en" and source == "custom"
            else "system" if language == "en"
            else "自定义" if source == "custom"
            else "系统"
        )
        number = int(measurement.get("number") or index + 1)
        height = format_piston_number(measurement.get("targetHeightMm"), 0)
        title = (
            f"Run {number}   {height} mm ({source_label})"
            if language == "en"
            else f"第 {number} 次   {height} mm（{source_label}）"
        )
        axis.set_title(
            title,
            fontsize=8.5,
            pad=5,
            fontfamily=cjk_font if language != "en" else None,
        )
        axis.set_xlabel(
            "Time after trigger / s" if language == "en" else "触发后时间 / s",
            fontsize=7.2,
            fontfamily=cjk_font if language != "en" else None,
        )
        axis.set_ylabel(
            "Absolute pressure / kPa" if language == "en" else "绝对压强 / kPa",
            fontsize=7.2,
            fontfamily=cjk_font if language != "en" else None,
        )
        axis.tick_params(axis="both", labelsize=6.6, colors="#475569")
        axis.grid(True, color="#d7dee8", linewidth=0.48, alpha=0.72)
        axis.spines["top"].set_visible(False)
        axis.spines["right"].set_visible(False)
    return save_piston_figure(fig, figures_dir / "piston-pressure-overview.png", deps)


def create_piston_oscillation_figures(
    data: dict[str, Any],
    figures_dir: Path,
    deps: dict[str, Any],
) -> list[dict[str, Path]]:
    outputs = [
        plot_piston_oscillation_fit(data, figures_dir, deps),
        plot_piston_oscillation_pressure_overview(data, figures_dir, deps),
    ]
    return [output for output in outputs if output is not None]


def build_piston_oscillation_report(
    data: dict[str, Any],
    figures_dir: Path,
    out_dir: Path,
    deps: dict[str, Any],
) -> Path:
    colors = deps["colors"]
    A4 = deps["A4"]
    Image = deps["Image"]
    PageBreak = deps["PageBreak"]
    Paragraph = deps["Paragraph"]
    ParagraphStyle = deps["ParagraphStyle"]
    SimpleDocTemplate = deps["SimpleDocTemplate"]
    Spacer = deps["Spacer"]
    Table = deps["Table"]
    TableStyle = deps["TableStyle"]
    Canvas = deps["Canvas"]
    TA_CENTER = deps["TA_CENTER"]
    TA_LEFT = deps["TA_LEFT"]
    mm = deps["mm"]
    pdfmetrics = deps["pdfmetrics"]
    fonts = register_report_fonts(deps)
    copy = get_piston_report_copy(data)
    language = str(data.get("language") or "zh-CN")
    target = out_dir / "report.pdf"
    doc = SimpleDocTemplate(
        str(target),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=17 * mm,
        bottomMargin=17 * mm,
        title=copy["title"],
        author="Gas Laws Lab",
    )

    title_style = ParagraphStyle(
        "PistonTitle",
        fontName=fonts["cjk"],
        fontSize=20,
        leading=26,
        textColor=colors.HexColor("#111827"),
        alignment=TA_CENTER,
        spaceAfter=17 * mm,
    )
    chapter_style = ParagraphStyle(
        "PistonChapter",
        fontName=fonts["cjk"],
        fontSize=16.5,
        leading=21,
        textColor=colors.HexColor("#111827"),
        spaceAfter=7 * mm,
    )
    section_style = ParagraphStyle(
        "PistonSection",
        fontName=fonts["cjk"],
        fontSize=12.5,
        leading=16,
        textColor=colors.HexColor("#1f2937"),
        spaceBefore=2.2 * mm,
        spaceAfter=3.5 * mm,
    )
    body_style = ParagraphStyle(
        "PistonBody",
        fontName=fonts["cjk"],
        fontSize=8.4,
        leading=11.2,
        textColor=colors.HexColor("#334155"),
        alignment=TA_LEFT,
    )
    table_style = ParagraphStyle(
        "PistonTable",
        parent=body_style,
        fontSize=7.7,
        leading=9.5,
        alignment=TA_CENTER,
    )
    table_left_style = ParagraphStyle(
        "PistonTableLeft",
        parent=table_style,
        alignment=TA_LEFT,
    )
    caption_style = ParagraphStyle(
        "PistonCaption",
        parent=body_style,
        fontSize=8.4,
        leading=11,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#1f2937"),
        spaceBefore=2.2 * mm,
        spaceAfter=3 * mm,
    )
    note_style = ParagraphStyle(
        "PistonNote",
        parent=body_style,
        fontSize=7.7,
        leading=10.3,
        textColor=colors.HexColor("#64748b"),
    )

    def is_cjk(character: str) -> bool:
        codepoint = ord(character)
        return (
            0x2E80 <= codepoint <= 0x9FFF
            or 0xF900 <= codepoint <= 0xFAFF
            or 0xFF00 <= codepoint <= 0xFFEF
        )

    def mixed_markup(value: Any, *, bold: bool = False) -> str:
        text = str(value if value is not None else "--")
        if not text:
            text = "--"
        runs: list[tuple[str, str]] = []
        for character in text:
            font_name = (
                fonts["cjk"]
            ) if is_cjk(character) else (
                fonts["serif_bold"] if bold else fonts["serif"]
            )
            if runs and runs[-1][0] == font_name:
                runs[-1] = (font_name, runs[-1][1] + character)
            else:
                runs.append((font_name, character))
        return "".join(
            f'<font name="{font_name}">{escape(text_run).replace(" ", "&#160;")}</font>'
            for font_name, text_run in runs
        )

    def paragraph(value: Any, style: Any = body_style, *, bold: bool = False) -> Any:
        return Paragraph(mixed_markup(value, bold=bold), style)

    table_number = 0
    figure_number = 0

    def append_table(
        story: list[Any],
        caption: str,
        headers: list[Any],
        rows: list[list[Any]],
        widths: list[Any],
        *,
        left_columns: set[int] | None = None,
        compact: bool = False,
    ) -> None:
        nonlocal table_number
        table_number += 1
        story.append(paragraph(f"表 {table_number} {caption}", caption_style))
        left_columns = left_columns or set()
        cell_style = table_style if not compact else ParagraphStyle(
            f"PistonTableCompact{table_number}",
            parent=table_style,
            fontSize=7.0,
            leading=8.3,
        )
        left_style = table_left_style if not compact else ParagraphStyle(
            f"PistonTableCompactLeft{table_number}",
            parent=cell_style,
            alignment=TA_LEFT,
        )
        data_rows = [[paragraph(header, cell_style, bold=True) for header in headers]]
        for row in rows:
            data_rows.append([
                paragraph(value, left_style if column_index in left_columns else cell_style)
                for column_index, value in enumerate(row)
            ])
        table = Table(data_rows, colWidths=widths, repeatRows=1, hAlign="LEFT")
        table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (0, 0), (-1, 0), "CENTER"),
            ("LINEABOVE", (0, 0), (-1, 0), 0.8, colors.HexColor("#111827")),
            ("LINEBELOW", (0, 0), (-1, 0), 0.45, colors.HexColor("#111827")),
            ("LINEBELOW", (0, -1), (-1, -1), 0.8, colors.HexColor("#111827")),
            ("LEFTPADDING", (0, 0), (-1, -1), 2.2),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2.2),
            ("TOPPADDING", (0, 0), (-1, -1), 2.4 if compact else 3.1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.4 if compact else 3.1),
        ]))
        story.append(table)
        story.append(Spacer(1, 3.5 * mm))

    def append_figure(story: list[Any], path: Path, caption: str, max_height_mm: float) -> None:
        nonlocal figure_number
        if not path.exists():
            return
        figure_number += 1
        image = Image(str(path))
        maximum_width = 170 * mm
        maximum_height = max_height_mm * mm
        scale = min(maximum_width / image.imageWidth, maximum_height / image.imageHeight)
        image.drawWidth = image.imageWidth * scale
        image.drawHeight = image.imageHeight * scale
        image.hAlign = "CENTER"
        story.append(image)
        story.append(paragraph(f"图 {figure_number} {caption}", caption_style))

    summary = data.get("summary") or {}
    scoring_eligible = summary.get("scoringEligible") is True
    experiment_group = data.get("experimentGroup") or {}
    measurements = [item for item in (data.get("measurements") or []) if isinstance(item, dict)]
    fit = data.get("linearFitResult") or {}
    calculation = data.get("calculationSession") or {}
    answers = calculation.get("answers") or {}
    knowns = calculation.get("knowns") or {}
    story: list[Any] = []

    story.append(paragraph(data.get("experimentName") or copy["title"], title_style))
    story.append(paragraph(f"1 {copy['file_information']}", chapter_style))
    story.append(paragraph(f"1.1 {copy['basic_information']}", section_style))
    append_table(
        story,
        copy["file_information"],
        [copy["information_item"], copy["content"]],
        [
            [copy["file"], data.get("fileName")],
            [copy["experiment"], data.get("experimentName")],
            [copy["experiment_mode"], copy["mode"]],
            [
                copy["experiment_scheme"],
                copy["ideal"] if experiment_group.get("scheme") == "ideal" else copy["real"],
            ],
            [
                copy["gas_type"],
                copy["helium"] if summary.get("gasType") == "helium" else copy["air"],
            ],
            [copy["parameter_profile"], experiment_group.get("parameterProfileVersion")],
            [
                copy["scoring_eligibility"],
                copy["scored"] if summary.get("scoringEligible") is True else copy["not_scored"],
            ],
            [copy["file_created"], format_piston_datetime(data.get("fileCreatedAtMs"))],
            [copy["first_started"], format_piston_datetime(data.get("sessionStartedAtMs"))],
            [copy["last_completed"], format_piston_datetime(data.get("sessionCompletedAtMs"))],
            [copy["duration"], format_piston_duration(data.get("sessionStartedAtMs"), data.get("sessionCompletedAtMs"), language)],
            [copy["exported"], format_piston_datetime(data.get("exportedAtMs"))],
        ],
        [72 * mm, 98 * mm],
        left_columns={0},
        compact=True,
    )
    story.append(paragraph(f"1.2 {copy['result_overview']}", section_style))
    append_table(
        story,
        copy["result_overview"],
        [copy["measurement_count"], copy["fit_points"], "γ", copy["theory"], copy["relative_error"], "R^2", copy["operation_calculation"], copy["total_score"]],
        [[
            summary.get("measurementCount"),
            summary.get("fitPointCount"),
            format_piston_number(summary.get("gamma"), 4),
            format_piston_number(summary.get("referenceGamma"), 4),
            format_piston_number(summary.get("relativeErrorPercent"), 2, "%"),
            format_piston_number(summary.get("rSquared"), 4),
            f"{summary.get('operationAverageScore', '--')} + {summary.get('calculationScore', '--')}"
            if scoring_eligible else copy["not_scored"],
            f"{summary.get('totalScore', '--')} / {summary.get('totalMaximum', 100)}"
            if scoring_eligible else copy["not_scored"],
        ]],
        [20 * mm, 19 * mm, 18 * mm, 21 * mm, 23 * mm, 19 * mm, 27 * mm, 23 * mm],
        compact=True,
    )
    append_figure(story, figures_dir / "piston-h-t2-fit.png", copy["fit_caption"], 76)

    story.append(PageBreak())
    story.append(paragraph(f"2 {copy['actual_records']}", chapter_style))
    story.append(paragraph(f"2.1 {copy['measurement_records']}", section_style))
    measurement_rows = []
    for measurement in measurements:
        acquisition = measurement.get("acquisitionSettings") or {}
        measurement_rows.append([
            f"第 {measurement.get('number')} 次" if language != "en" else f"Run {measurement.get('number')}",
            format_piston_number(measurement.get("targetHeightMm"), 0),
            format_piston_number(measurement.get("confirmedHeightMm"), 1),
            copy["custom"] if measurement.get("heightSource") == "custom" else copy["system"],
            format_piston_number(acquisition.get("sampleRateHz"), 0),
            format_piston_number(acquisition.get("triggerThresholdKpa"), 0),
            measurement.get("sampleCount"),
            format_piston_number(acquisition.get("recordedDurationS"), 3),
            format_piston_number((measurement.get("keyEvidence") or {}).get("releaseGapMs"), 0),
        ])
    append_table(
        story,
        "各次正式测量条件与过程摘要" if language != "en" else "Formal measurement conditions",
        [copy["number"], copy["target_height"], copy["actual_height"], copy["height_source"], copy["sample_rate"], copy["trigger"], copy["samples"], copy["duration_s"], copy["release_gap"]],
        measurement_rows,
        [20 * mm, 17 * mm, 17 * mm, 20 * mm, 18 * mm, 18 * mm, 17 * mm, 20 * mm, 23 * mm],
        compact=len(measurement_rows) > 3,
    )
    story.append(paragraph(f"2.2 {copy['pressure_curves']}", section_style))
    append_figure(story, figures_dir / "piston-pressure-overview.png", copy["curve_caption"], 146 if len(measurements) > 3 else 126)
    story.append(paragraph(copy["curve_note"], note_style))

    story.append(PageBreak())
    story.append(paragraph(f"3 {copy['calculation_results']}", chapter_style))
    story.append(paragraph(f"3.1 {copy['period_results']}", section_style))
    period_rows = []
    for measurement in measurements:
        result = measurement.get("periodResult") or {}
        periods = ((measurement.get("processReview") or {}).get("scoreRows") or [])
        selection_row = next((row for row in periods if row.get("id") == "piston-selection-fit"), {})
        deviation_text = "--"
        evidence_text = str(selection_row.get("evidence") or "")
        match = re.search(r"(\d+(?:\.\d+)?)%", evidence_text)
        if match:
            deviation_text = f"{match.group(1)}%"
        period_rows.append([
            f"第 {measurement.get('number')} 次" if language != "en" else f"Run {measurement.get('number')}",
            format_piston_number(result.get("t1S"), 3),
            format_piston_number(result.get("t2S"), 3),
            format_piston_number(result.get("periodCount"), 1).rstrip("0").rstrip("."),
            format_piston_number(result.get("deltaTimeS"), 4),
            format_piston_number(result.get("periodS"), 5),
            format_piston_number(result.get("periodSquaredS2"), 7),
            deviation_text,
            copy["yes"] if measurement.get("includedInFit") else copy["no"],
        ])
    append_table(
        story,
        "各次周期处理结果" if language != "en" else "Period-processing results",
        [copy["number"], "t1/s", "t2/s", copy["period_count"], copy["delta_time"], copy["period"], copy["period_squared"], copy["maximum_deviation"], copy["included"]],
        period_rows,
        [21 * mm, 17 * mm, 17 * mm, 18 * mm, 21 * mm, 20 * mm, 25 * mm, 22 * mm, 16 * mm],
        compact=len(period_rows) > 3,
    )
    story.append(paragraph(f"3.2 {copy['fit_results']}", section_style))
    append_table(
        story,
        "h-T^2 线性拟合参数" if language != "en" else "h-T^2 linear-fit parameters",
        [copy["fit_points"], copy["slope"], copy["intercept"], "R^2"],
        [[
            len(fit.get("selectedRunIndices") or []),
            format_piston_number(fit.get("slopeMPerS2"), 5),
            format_piston_number(fit.get("interceptM"), 6),
            format_piston_number(fit.get("rSquared"), 6),
        ]],
        [42.5 * mm] * 4,
        compact=True,
    )
    story.append(paragraph(f"3.3 {copy['final_results']}", section_style))

    def answer_row(field: str, label: str, decimals: int, suffix: str = "") -> list[Any]:
        answer = answers.get(field) or {}
        expected = answer.get("expectedValue")
        raw = str(answer.get("draftRaw") or "").strip()
        user_value = raw if raw else format_piston_number(expected, decimals, suffix)
        resolution = answer.get("resolution")
        if resolution == "first-correct":
            evaluation, credit = copy["first_correct"], "100%"
        elif resolution == "retry-correct":
            evaluation, credit = copy["retry_correct"], "80%"
        elif resolution in ("revealed-after-attempt", "revealed-without-valid-attempt"):
            evaluation, credit = copy["revealed"], "0%"
        else:
            evaluation, credit = copy["unresolved"], "0%"
        if not scoring_eligible:
            credit = copy["not_scored"]
        return [
            label,
            f"{user_value}{suffix if raw and suffix else ''}",
            format_piston_number(expected, decimals, suffix),
            evaluation,
            credit,
        ]

    append_table(
        story,
        "最终计算与答案评价" if language != "en" else "Final calculation and answer evaluation",
        [copy["calculation_item"], copy["user_result"], copy["reference"], copy["evaluation"], copy["credit"]],
        [
            answer_row("area", copy["area"], 6, " m^2"),
            answer_row("gamma", copy["gamma"], 4),
            answer_row("relativeError", copy["relative_error"], 2, "%"),
        ],
        [45 * mm, 35 * mm, 35 * mm, 35 * mm, 20 * mm],
        compact=True,
    )

    story.append(PageBreak())
    process_section_title = copy["process_score"] if scoring_eligible else copy["process_review"]
    story.append(paragraph(f"4 {process_section_title}", chapter_style))
    story.append(paragraph(f"4.1 {copy['process_evidence']}", section_style))
    evidence_rows = []
    score_rows = []
    for measurement in measurements:
        key = measurement.get("keyEvidence") or {}
        score = measurement.get("score") or {}
        process = measurement.get("processReview") or {}
        touchdown = bool(key.get("touchdown"))
        release_gap = piston_finite_number(key.get("releaseGapMs"))
        selection_score = safe_float(score.get("selectionAndFit"), 0)
        evidence_rows.append([
            f"第 {measurement.get('number')} 次" if language != "en" else f"Run {measurement.get('number')}",
            format_piston_number(key.get("heightDeviationMm"), 1, " mm",),
            format_piston_number(release_gap, 0, " ms"),
            copy["yes"] if touchdown else copy["no"],
            key.get("pressCount", 0),
            key.get("resetCount", 0),
            copy["saved"] if key.get("result") == "saved" else "--",
        ])
        if touchdown:
            main_evidence = "记录到未支撑触底" if language != "en" else "Unsupported bottom impact recorded"
        elif (release_gap or 0) >= 60 or (
            scoring_eligible and selection_score < 27
        ) or process.get("statusLabel") in ("可改进", "可改進", "Improve", "需复核", "需複核", "Review"):
            main_evidence = "注意松手同步与周期选区" if language != "en" else "Review release timing and period selection"
        elif safe_float(score.get("evidence"), 0) < 5:
            main_evidence = "记录证据不完整" if language != "en" else "Incomplete evidence"
        else:
            main_evidence = "过程证据完整" if language != "en" else "Complete process evidence"
        score_rows.append([
            f"第 {measurement.get('number')} 次" if language != "en" else f"Run {measurement.get('number')}",
            f"{score.get('operation', '--')} / {score.get('operationMaximum', 75)}"
            if scoring_eligible else copy["not_scored"],
            process.get("statusLabel") or "--",
            main_evidence,
        ])
    append_table(
        story,
        "各次实验关键操作记录" if language != "en" else "Key operation records",
        [copy["number"], copy["height_deviation"], copy["release_gap"], copy["touchdown"], copy["press_count"], copy["reset_count"], copy["formal_result"]],
        evidence_rows,
        [23 * mm, 30 * mm, 30 * mm, 20 * mm, 24 * mm, 24 * mm, 19 * mm],
        compact=len(evidence_rows) > 3,
    )
    story.append(paragraph(
        copy["report_note"] if scoring_eligible else copy["unscored_report_note"],
        note_style,
    ))
    story.append(Spacer(1, 2 * mm))
    score_section_title = copy["score_results"] if scoring_eligible else copy["evidence_diagnostics"]
    story.append(paragraph(f"4.2 {score_section_title}", section_style))
    append_table(
        story,
        ("各次实验操作评分" if language != "en" else "Operation scores")
        if scoring_eligible else copy["operation_diagnostics"],
        [
            copy["number"],
            copy["operation_score"] if scoring_eligible else copy["scoring_status"],
            copy["status"],
            copy["main_evidence"],
        ],
        score_rows,
        [28 * mm, 38 * mm, 34 * mm, 70 * mm],
        left_columns={3},
        compact=len(score_rows) > 3,
    )
    if scoring_eligible:
        append_table(
            story,
            "本轮最终评分" if language != "en" else "Final score",
            [copy["operation_average"], copy["group_calculation"], copy["total_score"]],
            [[
                f"{summary.get('operationAverageScore', '--')} / {summary.get('operationMaximum', 75)}",
                f"{summary.get('calculationScore', '--')} / {summary.get('calculationMaximum', 25)}",
                f"{summary.get('totalScore', '--')} / {summary.get('totalMaximum', 100)}",
            ]],
            [170 * mm / 3] * 3,
            compact=True,
        )

    def split_font_runs(value: Any) -> list[tuple[str, str]]:
        text = str(value or "")
        runs: list[tuple[str, str]] = []
        for character in text:
            font_name = fonts["cjk"] if is_cjk(character) else fonts["serif"]
            if runs and runs[-1][0] == font_name:
                runs[-1] = (font_name, runs[-1][1] + character)
            else:
                runs.append((font_name, character))
        return runs

    def draw_mixed_string(canvas: Any, x: float, y: float, value: Any, font_size: float, *, align: str = "left") -> None:
        runs = split_font_runs(value)
        total_width = sum(pdfmetrics.stringWidth(text, font_name, font_size) for font_name, text in runs)
        cursor = x - total_width if align == "right" else x
        for font_name, text in runs:
            canvas.setFont(font_name, font_size)
            canvas.drawString(cursor, y, text)
            cursor += pdfmetrics.stringWidth(text, font_name, font_size)

    page_contexts = [
        copy["file_information"],
        copy["actual_records"],
        copy["calculation_results"],
        process_section_title,
    ]

    def draw_page(canvas: Any, document: Any) -> None:
        canvas.saveState()
        page_number = max(1, int(document.page))
        canvas.setFillColor(colors.HexColor("#64748b"))
        if page_number > 1:
            canvas.setStrokeColor(colors.HexColor("#cbd5e1"))
            canvas.setLineWidth(0.4)
            canvas.line(18 * mm, A4[1] - 12 * mm, A4[0] - 18 * mm, A4[1] - 12 * mm)
            draw_mixed_string(canvas, 18 * mm, A4[1] - 9 * mm, data.get("fileName") or "", 7.6)
            draw_mixed_string(
                canvas,
                A4[0] - 18 * mm,
                A4[1] - 9 * mm,
                page_contexts[min(page_number - 1, len(page_contexts) - 1)],
                7.6,
                align="right",
            )
        draw_mixed_string(canvas, 18 * mm, 9 * mm, "Gas Laws Lab", 7.6)
        draw_mixed_string(
            canvas,
            A4[0] - 18 * mm,
            9 * mm,
            copy["page"].format(number=page_number),
            7.6,
            align="right",
        )
        canvas.restoreState()

    def make_report_canvas(*args: Any, **kwargs: Any) -> Any:
        kwargs["initialFontName"] = fonts["serif"]
        return Canvas(*args, **kwargs)

    doc.build(
        story,
        onFirstPage=draw_page,
        onLaterPages=draw_page,
        canvasmaker=make_report_canvas,
    )
    return target


def export_piston_oscillation_payload(
    data: dict[str, Any],
    out_dir: Path,
    formats: set[str],
    deps: dict[str, Any],
) -> list[Path]:
    if "report" not in formats:
        raise ValueError("Piston-oscillation export currently supports report output only.")
    paths = ensure_dirs(out_dir, include_figures=True, include_data=False)
    create_piston_oscillation_figures(data, paths["figures"], deps)
    report = build_piston_oscillation_report(data, paths["figures"], paths["root"], deps)
    shutil.rmtree(paths["figures"], ignore_errors=True)
    return [report]


def build_story(data: dict[str, Any], figure_outputs: list[dict[str, Path]], csv_outputs: list[Path], out_dir: Path, deps: dict[str, Any]) -> Path:
    colors = deps["colors"]
    A4 = deps["A4"]
    Paragraph = deps["Paragraph"]
    ParagraphStyle = deps["ParagraphStyle"]
    SimpleDocTemplate = deps["SimpleDocTemplate"]
    Spacer = deps["Spacer"]
    Table = deps["Table"]
    TableStyle = deps["TableStyle"]
    Image = deps["Image"]
    TA_CENTER = deps["TA_CENTER"]
    mm = deps["mm"]
    styles = deps["getSampleStyleSheet"]()
    fonts = register_report_fonts(deps)

    title_style = ParagraphStyle(
        "HSLTitle",
        parent=styles["Title"],
        fontName=fonts["serif_bold"],
        fontSize=24,
        leading=30,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=16,
    )
    section_style = ParagraphStyle(
        "HSLSection",
        parent=styles["Heading2"],
        fontName=fonts["serif_bold"],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#111827"),
        spaceBefore=10,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "HSLBody",
        parent=styles["BodyText"],
        fontName=fonts["serif"],
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#334155"),
    )
    table_header_style = ParagraphStyle(
        "HSLTableHeader",
        parent=body_style,
        fontName=fonts["serif_bold"],
        fontSize=8.6,
        leading=10.5,
        textColor=colors.HexColor("#111827"),
    )
    table_cell_style = ParagraphStyle(
        "HSLTableCell",
        parent=body_style,
        fontName=fonts["serif"],
        fontSize=8.2,
        leading=10,
        textColor=colors.HexColor("#111827"),
    )
    table_caption_style = ParagraphStyle(
        "HSLTableCaption",
        parent=body_style,
        fontName=fonts["serif_bold"],
        fontSize=8.6,
        leading=10.5,
        textColor=colors.HexColor("#111827"),
        spaceAfter=2,
    )

    target = out_dir / "report.pdf"
    doc = SimpleDocTemplate(
        str(target),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="Gas Laws Lab Export Report",
    )

    relation = data.get("relation")
    summary = data.get("summary", {})
    verification = data.get("verification", {})
    params = data.get("params", {})
    relation_label = str(relation).upper() if relation else "simulation"

    def make_three_line_table(caption: str, headers: tuple[str, str], rows: list[list[str]], width: float) -> Any:
        table_data = [[Paragraph(headers[0], table_header_style), Paragraph(headers[1], table_header_style)]]
        table_data.extend([
            [Paragraph(str(label), table_cell_style), Paragraph(str(value), table_cell_style)]
            for label, value in rows
        ])
        table = Table(table_data, colWidths=[width * 0.58, width * 0.42], hAlign="LEFT")
        table.setStyle(TableStyle([
            ("LINEABOVE", (0, 0), (-1, 0), 1.5, colors.black),
            ("LINEBELOW", (0, 0), (-1, 0), 0.75, colors.black),
            ("LINEBELOW", (0, -1), (-1, -1), 1.5, colors.black),
            ("FONTNAME", (0, 0), (-1, -1), fonts["serif"]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 2),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        block = Table(
            [[Paragraph(caption, table_caption_style)], [table]],
            colWidths=[width],
            hAlign="LEFT",
        )
        block.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))
        return block

    def pair_flowables(items: list[Any], col_width: float, gap_width: float) -> list[Any]:
        paired: list[Any] = []
        for index in range(0, len(items), 2):
            left = items[index]
            if index + 1 < len(items):
                row = [left, "", items[index + 1]]
                widths = [col_width, gap_width, col_width]
            else:
                row = ["", left, ""]
                widths = [col_width / 2, col_width, col_width / 2]
            pair = Table([row], colWidths=widths)
            pair.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]))
            paired.extend([pair, Spacer(1, 5 * mm)])
        return paired

    def make_figure_block(image_path: Path, width: float) -> Any:
        image = Image(str(image_path), width=width, height=105 * mm, kind="proportional")
        block = Table(
            [[image]],
            colWidths=[width],
            hAlign="CENTER",
        )
        block.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))
        return block

    story = [
        Paragraph("Gas Laws Lab Export Report", title_style),
        Paragraph(f"Dataset: {data.get('fileName', 'Workbench Export')}", body_style),
        Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}", body_style),
        Spacer(1, 7 * mm),
        Paragraph("Tables", section_style),
    ]

    if relation:
        story.append(Paragraph(
            f"This report summarizes an ideal-gas {relation_label} verification study. "
            "Measured pressure data are compared with the ideal reference and a linear fit.",
            body_style,
        ))
    else:
        story.append(Paragraph(
            "This report summarizes final hard-sphere simulation diagnostics, including distribution and time-history figures.",
            body_style,
        ))

    metric_rows: list[list[str]] = []
    for label, value in [
        ("Run state", summary.get("runState")),
        ("Final time", summary.get("finalTime")),
        ("Temperature", summary.get("temperature")),
        ("Pressure", summary.get("pressure")),
        ("Mean speed", summary.get("meanSpeed")),
        ("RMS speed", summary.get("rmsSpeed")),
        ("R squared", verification.get("rSquared")),
        ("Slope error", verification.get("slopeError")),
    ]:
        if value is not None:
            metric_rows.append([label, f"{safe_float(value):.6g}" if isinstance(value, (int, float)) else str(value)])

    param_rows: list[list[str]] = []
    for key in ["N", "L", "r", "m", "k", "dt", "nu", "targetTemperature", "equilibriumTime", "statsDuration"]:
        if key in params:
            param_rows.append([key, f"{safe_float(params.get(key)):.6g}"])

    table_width = 80 * mm
    gap_width = 8 * mm
    figure_width = 160 * mm
    summary_table = make_three_line_table(
        "Table 1. Simulation Summary and Verification Metrics",
        ("Metric", "Value"),
        metric_rows,
        table_width,
    )
    param_table = make_three_line_table(
        f"Table 2. Model Parameters Used for the {relation_label} Study",
        ("Parameter", "Value"),
        param_rows,
        table_width,
    )
    story.extend([Spacer(1, 4 * mm), *pair_flowables([summary_table, param_table], table_width, gap_width)])

    story.append(Paragraph("Figures", section_style))
    for output in figure_outputs:
        png_path = output.get("png")
        if png_path and png_path.exists():
            story.extend([make_figure_block(png_path, figure_width), Spacer(1, 6 * mm)])

    story.append(Paragraph("Conclusion", section_style))
    if relation:
        verdict = verification.get("verdictState", "not assessed")
        story.append(Paragraph(
            f"The exported data support a {relation_label} verification workflow. "
            f"The current automated verdict is {verdict}.",
            body_style,
        ))
    else:
        story.append(Paragraph(
            "The exported diagnostics provide a reproducible view of the final simulation state and figure-ready data.",
            body_style,
        ))

    doc.build(story)
    return target


def export_heat_capacity_payload(payload: dict[str, Any], data: dict[str, Any], out_dir: Path, formats: set[str], deps: dict[str, Any]) -> list[Path]:
    include_report = "report" in formats
    include_csv = "csv" in formats
    include_public_figures = "figures" in formats
    include_figures = include_report or include_public_figures
    paths = ensure_dirs(out_dir, include_figures=include_figures, include_data=include_csv)
    figure_root = paths["figures"] if include_report or include_csv else paths["root"]
    figure_outputs = create_heat_capacity_figures(
        data,
        figure_root,
        deps,
        include_process=include_public_figures,
    ) if include_figures else []
    csv_outputs = write_heat_capacity_data_files(
        data,
        paths["data"],
        include_package=payload.get("mode") == "completeBundle",
    ) if include_csv else []

    outputs: list[Path] = []
    if include_report:
        outputs.append(build_heat_capacity_report(data, figure_root, paths["root"], deps))
    if include_csv:
        outputs.extend(csv_outputs)
    if include_public_figures:
        for output in figure_outputs:
            outputs.extend(output.values())
    if include_report and not include_public_figures and not include_csv:
        shutil.rmtree(paths["figures"], ignore_errors=True)
    return outputs


def export_json_payload(payload: dict[str, Any], out_dir: Path, formats: set[str]) -> list[Path]:
    deps = _import_dependencies()
    data = payload.get("data")
    if not isinstance(data, dict):
        raise ValueError("JSON payload is missing object data.")
    if is_piston_oscillation_export(data):
        return export_piston_oscillation_payload(data, out_dir, formats, deps)
    if is_heat_capacity_export(data):
        return export_heat_capacity_payload(payload, data, out_dir, formats, deps)

    include_report = "report" in formats
    include_csv = "csv" in formats
    include_public_figures = "figures" in formats
    include_figures = include_public_figures or include_report
    paths = ensure_dirs(out_dir, include_figures=include_figures and (include_report or include_csv), include_data=include_csv)
    figure_root = paths["figures"] if include_report or include_csv else paths["root"]
    figure_outputs: list[dict[str, Path]] = []
    csv_outputs: list[Path] = []

    if data.get("relation"):
        points = data.get("points") or []
        if include_csv:
            csv_outputs.append(write_rows_csv(
                "ideal-points.csv",
                ["relation", "scanValue", "meanTemperature", "measuredPressure", "idealPressure", "relativeGap", "boxLength", "volume", "inverseVolume", "particleCount"],
                [[
                    point.get("relation"),
                    get_ideal_relation_x_value(str(data.get("relation")), point),
                    point.get("meanTemperature"),
                    point.get("meanPressure"),
                    point.get("idealPressure"),
                    point.get("relativeGap"),
                    point.get("boxLength"),
                    point.get("volume"),
                    point.get("inverseVolume"),
                    point.get("particleCount"),
                ] for point in points],
                paths["data"],
            ))
        if include_figures:
            figure_outputs.append(plot_ideal_verification(data, figure_root, deps))
            if payload.get("mode") != "verificationFigure":
                raw_pv = plot_ideal_raw_pv(data, figure_root, deps)
                if raw_pv:
                    figure_outputs.append(raw_pv)
    else:
        final = data.get("finalChartData") or {}
        history = final.get("tempHistory") or []
        if include_csv and history:
            csv_outputs.append(write_rows_csv(
                "standard-history.csv",
                ["time", "temperature", "targetTemperature", "error", "totalEnergy"],
                [[row.get("time"), row.get("temperature"), row.get("targetTemperature"), row.get("error"), row.get("totalEnergy")] for row in history],
                paths["data"],
            ))
        if include_figures:
            for output in [
                plot_distribution(data, figure_root, deps, "speed", "speed-distribution", "Speed Distribution", "Figure 1. Speed Distribution Compared with Theoretical Prediction"),
                plot_distribution(data, figure_root, deps, "energy", "energy-distribution", "Energy Distribution", "Figure 2. Energy Distribution Compared with Theoretical Prediction"),
                plot_distribution(data, figure_root, deps, "energyLog", "semilog-energy", "Semi-log Energy Distribution", "Figure 3. Semi-log Energy Distribution"),
                plot_history(data, figure_root, deps, "error", "temperature-error", "Temperature Error History", "Error (%)", "Figure 4. Temperature Error History"),
                plot_history(data, figure_root, deps, "totalEnergy", "total-energy", "Total Energy History", "Total energy", "Figure 5. Total Energy History"),
            ]:
                if output:
                    figure_outputs.append(output)

    outputs: list[Path] = []
    if include_report:
        outputs.append(build_story(data, figure_outputs, csv_outputs, paths["root"], deps))
    if include_csv:
        outputs.extend(csv_outputs)
    if include_public_figures:
        for output in figure_outputs:
            outputs.extend(output.values())

    if include_report and not include_public_figures and not include_csv:
        shutil.rmtree(paths["figures"], ignore_errors=True)
    return outputs


def write_metadata(out_dir: Path, input_path: Path, outputs: list[Path]) -> Path:
    metadata = {
        "exporterVersion": EXPORTER_VERSION,
        "input": str(input_path),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "python": sys.version.split()[0],
        "platform": platform.platform(),
        "files": [str(path.relative_to(out_dir)) for path in outputs if path.exists()],
    }
    target = out_dir / "metadata.json"
    target.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return target


def export_payload(input_path: Path, out_dir: Path, formats: set[str]) -> int:
    try:
        payload = load_payload(input_path)
        if payload["kind"] == "csv":
            outputs = write_csv_payload(payload, out_dir)
        elif payload["kind"] == "json":
            outputs = export_json_payload(payload, out_dir, formats)
        else:
            raise ValueError(f"Unsupported payload kind: {payload['kind']}")
        metadata = write_metadata(out_dir, input_path, outputs) if "metadata" in formats else None
        print(json.dumps({
            "status": "ok",
            "out": str(out_dir),
            "metadata": str(metadata) if metadata else None,
            "files": [str(path) for path in outputs],
        }, indent=2))
        return 0
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    except Exception as exc:
        print(f"Export failed: {exc}", file=sys.stderr)
        return 3


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Gas Laws Lab local exporter")
    parser.add_argument("--self-check", action="store_true", help="Check Python export dependencies")
    parser.add_argument("--input", type=Path, help="Workbench export payload JSON")
    parser.add_argument("--out", type=Path, default=Path("output/export-demo"), help="Output directory")
    parser.add_argument("--formats", default="report,figures,csv,metadata", help="Comma-separated outputs: report, figures, csv, metadata")
    parser.add_argument("--lang", default="en-GB", choices=["zh-CN", "en-GB"], help="Reserved report language selector")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    if args.self_check:
        return self_check()
    if not args.input:
        print("--input is required unless --self-check is used", file=sys.stderr)
        return 1
    try:
        formats = parse_export_formats(args.formats)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return export_payload(args.input, args.out, formats)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
