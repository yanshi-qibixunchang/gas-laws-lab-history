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
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

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

EXPORTER_VERSION = "0.1.0"
ENERGY_LOG_THEORY_FLOOR = 1e-12
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
        apply_professional_rc_params(plt)
        plt.rcParams["axes.unicode_minus"] = False
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


def export_json_payload(payload: dict[str, Any], out_dir: Path, formats: set[str]) -> list[Path]:
    deps = _import_dependencies()
    include_report = "report" in formats
    include_csv = "csv" in formats
    include_public_figures = "figures" in formats
    include_figures = include_public_figures or include_report
    paths = ensure_dirs(out_dir, include_figures=include_figures and (include_report or include_csv), include_data=include_csv)
    figure_root = paths["figures"] if include_report or include_csv else paths["root"]
    data = payload.get("data")
    if not isinstance(data, dict):
        raise ValueError("JSON payload is missing object data.")

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
    parser = argparse.ArgumentParser(description="Hard Sphere Lab local exporter")
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
