#!/usr/bin/env python
"""Hard Sphere Lab local export prototype.

This first-batch exporter reads workbench export payload JSON and writes
local report, figure, CSV, and metadata files for quality review.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import platform
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

EXPORTER_VERSION = "0.1.0"
FONT_DIR = Path("C:/Windows/Fonts")
FONT_NAMES = {
    "serif": "TimesNewRomanHSL",
    "serif_bold": "TimesNewRomanHSL-Bold",
    "cjk": "SimSunHSL",
}


def _import_dependencies():
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        plt.rcParams.update({
            "font.family": "serif",
            "font.serif": ["Times New Roman", "Times", "DejaVu Serif"],
            "axes.unicode_minus": False,
        })
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        from reportlab.platypus import (
            Image,
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
        "plt": plt,
        "colors": colors,
        "TA_CENTER": TA_CENTER,
        "A4": A4,
        "ParagraphStyle": ParagraphStyle,
        "getSampleStyleSheet": getSampleStyleSheet,
        "mm": mm,
        "Image": Image,
        "Paragraph": Paragraph,
        "SimpleDocTemplate": SimpleDocTemplate,
        "Spacer": Spacer,
        "Table": Table,
        "TableStyle": TableStyle,
        "pdfmetrics": pdfmetrics,
        "TTFont": TTFont,
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
    }

    registered: dict[str, str] = {}
    for name, path in candidates.items():
        if path.exists() and name not in pdfmetrics.getRegisteredFontNames():
            try:
                pdfmetrics.registerFont(TTFont(name, str(path)))
            except Exception:
                continue
        registered[name] = name if name in pdfmetrics.getRegisteredFontNames() else "Times-Roman"

    return {
        "serif": FONT_NAMES["serif"] if FONT_NAMES["serif"] in pdfmetrics.getRegisteredFontNames() else "Times-Roman",
        "serif_bold": FONT_NAMES["serif_bold"] if FONT_NAMES["serif_bold"] in pdfmetrics.getRegisteredFontNames() else "Times-Bold",
        "cjk": registered.get(FONT_NAMES["cjk"], "STSong-Light"),
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


def ensure_dirs(out_dir: Path) -> dict[str, Path]:
    paths = {
        "root": out_dir,
        "figures": out_dir / "figures",
        "data": out_dir / "data",
    }
    for path in paths.values():
        path.mkdir(parents=True, exist_ok=True)
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


def save_figure(fig: Any, figures_dir: Path, stem: str, caption: str) -> dict[str, Path]:
    figure_dir = figures_dir / stem
    figure_dir.mkdir(parents=True, exist_ok=True)
    outputs = {
        "pdf": figure_dir / f"{stem}.pdf",
        "png": figure_dir / f"{stem}.png",
    }
    fig.text(0.5, 0.015, caption, ha="center", va="bottom", fontsize=10, fontweight="bold")
    fig.tight_layout(rect=[0, 0.07, 1, 1])
    fig.savefig(outputs["pdf"], bbox_inches="tight")
    fig.savefig(outputs["png"], dpi=300, bbox_inches="tight")
    return outputs


def plot_ideal_verification(data: dict[str, Any], figures_dir: Path, deps: dict[str, Any]) -> dict[str, Path]:
    plt = deps["plt"]
    relation = data.get("relation", "pv")
    points = data.get("points", [])
    x_values = [safe_float(get_ideal_relation_x_value(str(relation), point)) for point in points]
    y_values = [safe_float(point.get("meanPressure")) for point in points]
    ideal_values = [safe_float(point.get("idealPressure")) for point in points]

    fig, ax = plt.subplots(figsize=(6.4, 4.1))
    ax.scatter(x_values, y_values, s=42, color="#2563eb", label="Measured pressure", zorder=3)
    ax.plot(x_values, ideal_values, color="#dc2626", linewidth=1.8, label="Ideal reference")
    if len(x_values) >= 2:
        slope = safe_float(data.get("verification", {}).get("slope"))
        intercept = safe_float(data.get("verification", {}).get("intercept"))
        fit_values = [slope * x + intercept for x in x_values]
        ax.plot(x_values, fit_values, color="#111827", linewidth=1.3, linestyle="--", label="Linear fit")
    x_label = (
        "Inverse volume 1/V"
        if relation == "pv"
        else "Particle count N"
        if relation == "pn"
        else "Equilibrium temperature T"
    )
    configure_axis(ax, f"{relation.upper()} Verification", x_label, "Pressure P")
    ax.legend(frameon=False)
    return save_figure(fig, figures_dir, f"{relation}-verification", f"Figure 1. {relation.upper()} Verification with Ideal Reference and Linear Fit")


def plot_ideal_raw_pv(data: dict[str, Any], figures_dir: Path, deps: dict[str, Any]) -> dict[str, Path] | None:
    if data.get("relation") != "pv":
        return None
    plt = deps["plt"]
    points = data.get("points", [])
    volumes = [safe_float(point.get("volume")) for point in points]
    measured = [safe_float(point.get("meanPressure")) for point in points]
    ideal = [safe_float(point.get("idealPressure")) for point in points]

    fig, ax = plt.subplots(figsize=(6.4, 4.1))
    ax.plot(volumes, measured, marker="o", color="#2563eb", label="Measured pressure")
    ax.plot(volumes, ideal, marker="s", color="#dc2626", label="Ideal reference")
    configure_axis(ax, "Raw P-V Relationship", "Volume V", "Pressure P")
    ax.legend(frameon=False)
    return save_figure(fig, figures_dir, "pv-raw-relationship", "Figure 2. Raw P-V Relationship between Volume and Pressure")


def plot_distribution(data: dict[str, Any], figures_dir: Path, deps: dict[str, Any], key: str, stem: str, title: str, caption: str) -> dict[str, Path] | None:
    final = data.get("finalChartData") or {}
    bins = final.get(key) or []
    if not bins:
        return None
    plt = deps["plt"]
    centers = [(safe_float(item.get("binStart")) + safe_float(item.get("binEnd"))) / 2 for item in bins]
    widths = [safe_float(item.get("binEnd")) - safe_float(item.get("binStart")) for item in bins]
    values = [safe_float(item.get("probability")) for item in bins]
    theory = [safe_float(item.get("theoretical")) for item in bins]

    fig, ax = plt.subplots(figsize=(6.4, 4.1))
    ax.bar(centers, values, width=[w * 0.86 for w in widths], color="#93c5fd", edgecolor="#1d4ed8", linewidth=0.45, label="Simulation")
    ax.plot(centers, theory, color="#dc2626", linewidth=1.8, label="Theory")
    configure_axis(ax, title, "Value", "Density")
    ax.legend(frameon=False)
    return save_figure(fig, figures_dir, stem, caption)


def plot_history(data: dict[str, Any], figures_dir: Path, deps: dict[str, Any], field: str, stem: str, title: str, ylabel: str, caption: str) -> dict[str, Path] | None:
    final = data.get("finalChartData") or {}
    rows = final.get("tempHistory") or []
    if not rows:
        return None
    plt = deps["plt"]
    times = [safe_float(item.get("time")) for item in rows]
    values = [safe_float(item.get(field)) for item in rows]

    fig, ax = plt.subplots(figsize=(6.4, 4.1))
    ax.plot(times, values, color="#2563eb", linewidth=1.8)
    configure_axis(ax, title, "Time t", ylabel)
    return save_figure(fig, figures_dir, stem, caption)


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
        title="Hard Sphere Lab Export Report",
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
        image = Image(str(image_path), width=width, height=54 * mm, kind="proportional")
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
        Paragraph("Hard Sphere Lab Export Report", title_style),
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
    figure_images = []
    for output in figure_outputs:
        png_path = output.get("png")
        if png_path and png_path.exists():
            figure_images.append(make_figure_block(png_path, table_width))
    story.extend(pair_flowables(figure_images, table_width, gap_width))

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


def export_json_payload(payload: dict[str, Any], out_dir: Path) -> list[Path]:
    deps = _import_dependencies()
    paths = ensure_dirs(out_dir)
    data = payload.get("data")
    if not isinstance(data, dict):
        raise ValueError("JSON payload is missing object data.")

    figure_outputs: list[dict[str, Path]] = []
    csv_outputs: list[Path] = []

    if data.get("relation"):
        points = data.get("points") or []
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
        figure_outputs.append(plot_ideal_verification(data, paths["figures"], deps))
        raw_pv = plot_ideal_raw_pv(data, paths["figures"], deps)
        if raw_pv:
            figure_outputs.append(raw_pv)
    else:
        final = data.get("finalChartData") or {}
        history = final.get("tempHistory") or []
        if history:
            csv_outputs.append(write_rows_csv(
                "standard-history.csv",
                ["time", "temperature", "targetTemperature", "error", "totalEnergy"],
                [[row.get("time"), row.get("temperature"), row.get("targetTemperature"), row.get("error"), row.get("totalEnergy")] for row in history],
                paths["data"],
            ))
        for output in [
            plot_distribution(data, paths["figures"], deps, "speed", "speed-distribution", "Speed Distribution", "Figure 1. Speed Distribution Compared with Theoretical Prediction"),
            plot_distribution(data, paths["figures"], deps, "energy", "energy-distribution", "Energy Distribution", "Figure 2. Energy Distribution Compared with Theoretical Prediction"),
            plot_distribution(data, paths["figures"], deps, "energyLog", "semilog-energy", "Semi-log Energy Distribution", "Figure 3. Semi-log Energy Distribution"),
            plot_history(data, paths["figures"], deps, "error", "temperature-error", "Temperature Error History", "Error (%)", "Figure 4. Temperature Error History"),
            plot_history(data, paths["figures"], deps, "totalEnergy", "total-energy", "Total Energy History", "Total energy", "Figure 5. Total Energy History"),
        ]:
            if output:
                figure_outputs.append(output)

    report = build_story(data, figure_outputs, csv_outputs, paths["root"], deps)
    outputs = [report, *csv_outputs]
    for output in figure_outputs:
        outputs.extend(output.values())
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


def export_payload(input_path: Path, out_dir: Path) -> int:
    try:
        payload = load_payload(input_path)
        if payload["kind"] == "csv":
            outputs = write_csv_payload(payload, out_dir)
        elif payload["kind"] == "json":
            outputs = export_json_payload(payload, out_dir)
        else:
            raise ValueError(f"Unsupported payload kind: {payload['kind']}")
        metadata = write_metadata(out_dir, input_path, outputs)
        print(json.dumps({
            "status": "ok",
            "out": str(out_dir),
            "metadata": str(metadata),
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
    parser = argparse.ArgumentParser(description="Hard Sphere Lab local exporter")
    parser.add_argument("--self-check", action="store_true", help="Check Python export dependencies")
    parser.add_argument("--input", type=Path, help="Workbench export payload JSON")
    parser.add_argument("--out", type=Path, default=Path("output/export-demo"), help="Output directory")
    parser.add_argument("--formats", default="report,figures,csv", help="Reserved for future format filtering")
    parser.add_argument("--lang", default="en-GB", choices=["zh-CN", "en-GB"], help="Reserved report language selector")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    if args.self_check:
        return self_check()
    if not args.input:
        print("--input is required unless --self-check is used", file=sys.stderr)
        return 1
    return export_payload(args.input, args.out)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
