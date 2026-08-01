from __future__ import annotations

import copy
import hashlib
import json
import struct
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "public" / "models" / "heat-capacity" / "fd-ncd-c-ultra.glb"
OUTPUT_PATH = ROOT / "public" / "models" / "shared" / "unified-light-lab-bench.glb"
EXPECTED_SOURCE_SHA256 = "D594BC0E57798AD305BAC5B282A4EA88F0B2763E427EFA0F170B95964E78D664"

GLB_MAGIC = b"glTF"
GLB_VERSION = 2
JSON_CHUNK_TYPE = 0x4E4F534A
BIN_CHUNK_TYPE = 0x004E4942


def read_glb(path: Path) -> tuple[dict[str, Any], bytes]:
    payload = path.read_bytes()
    magic, version, declared_length = struct.unpack_from("<4sII", payload, 0)
    if magic != GLB_MAGIC or version != GLB_VERSION or declared_length != len(payload):
        raise ValueError(f"{path} is not a valid self-contained glTF 2.0 binary.")

    document: dict[str, Any] | None = None
    binary_chunk: bytes | None = None
    offset = 12
    while offset < len(payload):
        chunk_length, chunk_type = struct.unpack_from("<II", payload, offset)
        offset += 8
        chunk = payload[offset : offset + chunk_length]
        offset += chunk_length
        if chunk_type == JSON_CHUNK_TYPE:
            document = json.loads(chunk.decode("utf-8").rstrip("\x00 \t\r\n"))
        elif chunk_type == BIN_CHUNK_TYPE:
            binary_chunk = chunk

    if document is None or binary_chunk is None:
        raise ValueError(f"{path} must contain one JSON chunk and one binary chunk.")
    return document, binary_chunk


def pad4(payload: bytes, fill: bytes) -> bytes:
    remainder = len(payload) % 4
    return payload if remainder == 0 else payload + fill * (4 - remainder)


def write_glb(path: Path, document: dict[str, Any], binary_chunk: bytes) -> None:
    binary_chunk = pad4(binary_chunk, b"\x00")
    document["buffers"] = [{"byteLength": len(binary_chunk)}]
    json_chunk = pad4(
        json.dumps(document, ensure_ascii=False, separators=(",", ":")).encode("utf-8"),
        b" ",
    )
    total_length = 12 + 8 + len(json_chunk) + 8 + len(binary_chunk)
    output = bytearray(struct.pack("<4sII", GLB_MAGIC, GLB_VERSION, total_length))
    output.extend(struct.pack("<II", len(json_chunk), JSON_CHUNK_TYPE))
    output.extend(json_chunk)
    output.extend(struct.pack("<II", len(binary_chunk), BIN_CHUNK_TYPE))
    output.extend(binary_chunk)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(output)


def main() -> None:
    source_bytes = SOURCE_PATH.read_bytes()
    source_sha256 = hashlib.sha256(source_bytes).hexdigest().upper()
    if source_sha256 != EXPECTED_SOURCE_SHA256:
        raise ValueError(
            "The heat-capacity GLB changed; review the light bench source before rebuilding. "
            f"Expected {EXPECTED_SOURCE_SHA256}, received {source_sha256}."
        )

    source, source_binary = read_glb(SOURCE_PATH)
    output: dict[str, Any] = {
        "asset": {
            "version": "2.0",
            "generator": "Gas Laws Lab unified light lab bench extractor v1",
            "extras": {
                "sourceAsset": "models/heat-capacity/fd-ncd-c-ultra.glb",
                "sourceSha256": source_sha256,
                "visualProfile": "light",
            },
        },
        "scene": 0,
        "scenes": [{"name": "Unified Light Lab Bench", "nodes": [2]}],
        "nodes": [],
        "meshes": [],
        "materials": [],
        "textures": [],
        "images": [],
        "samplers": [],
        "accessors": [],
        "bufferViews": [],
    }
    output_binary = bytearray()
    buffer_view_map: dict[int, int] = {}
    accessor_map: dict[int, int] = {}
    material_map: dict[int, int] = {}
    texture_map: dict[int, int] = {}
    image_map: dict[int, int] = {}
    sampler_map: dict[int, int] = {}
    mesh_map: dict[int, int] = {}

    def copy_buffer_view(index: int) -> int:
        if index in buffer_view_map:
            return buffer_view_map[index]
        source_view = copy.deepcopy(source["bufferViews"][index])
        if source_view.get("buffer", 0) != 0:
            raise ValueError("The source bench must use the GLB binary buffer.")
        source_offset = source_view.get("byteOffset", 0)
        source_length = source_view["byteLength"]
        while len(output_binary) % 4:
            output_binary.append(0)
        output_offset = len(output_binary)
        output_binary.extend(source_binary[source_offset : source_offset + source_length])
        source_view["buffer"] = 0
        source_view["byteOffset"] = output_offset
        output_index = len(output["bufferViews"])
        output["bufferViews"].append(source_view)
        buffer_view_map[index] = output_index
        return output_index

    def copy_accessor(index: int) -> int:
        if index in accessor_map:
            return accessor_map[index]
        accessor = copy.deepcopy(source["accessors"][index])
        if "sparse" in accessor:
            raise ValueError("Sparse accessors are not supported by the bench extractor.")
        accessor["bufferView"] = copy_buffer_view(accessor["bufferView"])
        output_index = len(output["accessors"])
        output["accessors"].append(accessor)
        accessor_map[index] = output_index
        return output_index

    def copy_sampler(index: int) -> int:
        if index in sampler_map:
            return sampler_map[index]
        output_index = len(output["samplers"])
        output["samplers"].append(copy.deepcopy(source["samplers"][index]))
        sampler_map[index] = output_index
        return output_index

    def copy_image(index: int) -> int:
        if index in image_map:
            return image_map[index]
        image = copy.deepcopy(source["images"][index])
        if "uri" in image:
            raise ValueError("The source bench image must be embedded in the GLB.")
        image["bufferView"] = copy_buffer_view(image["bufferView"])
        output_index = len(output["images"])
        output["images"].append(image)
        image_map[index] = output_index
        return output_index

    def copy_texture(index: int) -> int:
        if index in texture_map:
            return texture_map[index]
        texture = copy.deepcopy(source["textures"][index])
        if "sampler" in texture:
            texture["sampler"] = copy_sampler(texture["sampler"])
        texture["source"] = copy_image(texture["source"])
        output_index = len(output["textures"])
        output["textures"].append(texture)
        texture_map[index] = output_index
        return output_index

    def copy_material(index: int) -> int:
        if index in material_map:
            return material_map[index]
        material = copy.deepcopy(source["materials"][index])
        pbr = material.get("pbrMetallicRoughness", {})
        supported_texture_slots = [
            pbr.get("baseColorTexture"),
            pbr.get("metallicRoughnessTexture"),
            material.get("normalTexture"),
            material.get("occlusionTexture"),
            material.get("emissiveTexture"),
        ]
        for texture_info in supported_texture_slots:
            if texture_info and "index" in texture_info:
                texture_info["index"] = copy_texture(texture_info["index"])
        if material.get("extensions"):
            raise ValueError("The selected light bench material unexpectedly uses extensions.")
        output_index = len(output["materials"])
        output["materials"].append(material)
        material_map[index] = output_index
        return output_index

    def copy_mesh(index: int) -> int:
        if index in mesh_map:
            return mesh_map[index]
        mesh = copy.deepcopy(source["meshes"][index])
        for primitive in mesh["primitives"]:
            primitive["attributes"] = {
                semantic: copy_accessor(accessor_index)
                for semantic, accessor_index in primitive["attributes"].items()
            }
            if "indices" in primitive:
                primitive["indices"] = copy_accessor(primitive["indices"])
            if "material" in primitive:
                primitive["material"] = copy_material(primitive["material"])
            if primitive.get("targets"):
                raise ValueError("The selected light bench must not use morph targets.")
        output_index = len(output["meshes"])
        output["meshes"].append(mesh)
        mesh_map[index] = output_index
        return output_index

    def source_node(name: str) -> dict[str, Any]:
        matches = [node for node in source["nodes"] if node.get("name") == name]
        if len(matches) != 1:
            raise ValueError(f"Expected one source node named {name}, received {len(matches)}.")
        return matches[0]

    surface_source = source_node("clean_lab_bench")
    backstop_source = source_node("HSL_LabBench_Backstop_LowLip")
    surface_node = {
        "name": "Unified_Light_LabBench_Surface",
        "mesh": copy_mesh(surface_source["mesh"]),
        "translation": copy.deepcopy(surface_source.get("translation", [0, 0, 0])),
        "extras": {
            **copy.deepcopy(surface_source.get("extras", {})),
            "sourceNode": "clean_lab_bench",
        },
    }
    backstop_node = {
        "name": "Unified_Light_LabBench_Backstop",
        "mesh": copy_mesh(backstop_source["mesh"]),
        "extras": {
            **copy.deepcopy(backstop_source.get("extras", {})),
            "sourceNode": "HSL_LabBench_Backstop_LowLip",
        },
    }
    root_node = {
        "name": "Unified_Light_LabBench",
        "children": [0, 1],
        "extras": {
            "visualProfile": "light",
            "sourceAsset": "fd-ncd-c-ultra.glb",
            "sourceNodes": [
                "clean_lab_bench",
                "HSL_LabBench_Backstop_LowLip",
            ],
        },
    }
    output["nodes"] = [surface_node, backstop_node, root_node]

    write_glb(OUTPUT_PATH, output, bytes(output_binary))
    output_bytes = OUTPUT_PATH.read_bytes()
    print(f"Wrote {OUTPUT_PATH}")
    print(f"bytes={len(output_bytes)}")
    print(f"sha256={hashlib.sha256(output_bytes).hexdigest().upper()}")


if __name__ == "__main__":
    main()
