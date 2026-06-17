"""Generate temporary professional graph preview exports.

The generated images are review artifacts. The formal desktop exporter reuses
professional_graph_style.py directly.
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

from professional_graph_style import (  # noqa: E402
    ENGINEERING_EXPORT_STYLE,
    PROFESSIONAL_COLORS,
    add_legend,
    add_readout_panel,
    apply_professional_rc_params,
    create_professional_figure,
    save_professional_figure,
    style_axes,
)


def build_ideal_pt_points() -> list[dict[str, float]]:
    particle_count = 128
    box_length = 12
    k_value = 1.0
    temperatures = [0.65, 0.80, 0.95, 1.10, 1.25, 1.40]
    gaps = [-0.014, 0.009, -0.006, 0.011, -0.008, 0.006]
    points = []
    for index, temperature in enumerate(temperatures):
        measured_temperature = temperature + 0.004 * math.sin(index * 1.35)
        ideal_pressure = particle_count * k_value * measured_temperature / box_length**3
        points.append({
            "temperature": measured_temperature,
            "measured_pressure": ideal_pressure * (1 + gaps[index]),
            "ideal_pressure": ideal_pressure,
        })
    return points


def linear_regression(points: list[dict[str, float]]) -> tuple[float, float, float]:
    xs = [point["temperature"] for point in points]
    ys = [point["measured_pressure"] for point in points]
    mean_x = sum(xs) / len(xs)
    mean_y = sum(ys) / len(ys)
    denominator = sum((x_value - mean_x) ** 2 for x_value in xs)
    slope = sum((x_value - mean_x) * (y_value - mean_y) for x_value, y_value in zip(xs, ys)) / denominator
    intercept = mean_y - slope * mean_x
    total = sum((y_value - mean_y) ** 2 for y_value in ys)
    residual = sum((y_value - (slope * x_value + intercept)) ** 2 for x_value, y_value in zip(xs, ys))
    r_squared = 1 - residual / total
    return slope, intercept, r_squared


def plot_ideal_pt_verification(out_dir: Path) -> Path:
    points = build_ideal_pt_points()
    slope, intercept, r_squared = linear_regression(points)
    theoretical_slope = 128 / 12**3
    slope_error = abs((slope - theoretical_slope) / theoretical_slope) * 100
    x_values = [point["temperature"] for point in points]
    measured = [point["measured_pressure"] for point in points]
    ideal = [point["ideal_pressure"] for point in points]
    fit = [slope * x_value + intercept for x_value in x_values]

    fig, ax = create_professional_figure(
        plt,
        "P-T Verification",
        "Measured pressure compared with ideal reference and linear fit",
        "PT / 6 samples / stable",
    )
    ax.scatter(
        x_values,
        measured,
        s=ENGINEERING_EXPORT_STYLE["marker_size"],
        color=PROFESSIONAL_COLORS["primary"],
        edgecolor="white",
        linewidth=0.5,
        label="Measured",
        zorder=4,
    )
    ax.plot(x_values, ideal, color=PROFESSIONAL_COLORS["theory"], linewidth=ENGINEERING_EXPORT_STYLE["data_line_width"], label="Ideal reference")
    ax.plot(x_values, fit, color=PROFESSIONAL_COLORS["fit"], linewidth=ENGINEERING_EXPORT_STYLE["fit_line_width"], linestyle="--", label="Linear fit")
    style_axes(ax, "Equilibrium temperature T", "Pressure P")
    add_readout_panel(
        ax,
        [
            ("Samples", str(len(points))),
            ("R2", f"{r_squared:.4f}"),
            ("Slope error", f"{slope_error:.2f}%"),
        ],
        loc="upper left",
    )
    add_legend(ax, loc="lower right")
    return save_professional_figure(fig, out_dir / "ideal-pt-verification-preview.png")


def build_distribution_bins() -> list[dict[str, float]]:
    bins = []
    for index in range(24):
        start = index * 0.16
        end = start + 0.16
        center = (start + end) / 2
        theoretical = 1.55 * center**2 * math.exp(-0.95 * center**2)
        measured = theoretical * (1 + 0.055 * math.sin(index * 0.9))
        bins.append({"start": start, "end": end, "center": center, "theory": theoretical, "measured": measured})
    return bins


def plot_standard_speed_distribution(out_dir: Path) -> Path:
    bins = build_distribution_bins()
    fig, ax = create_professional_figure(
        plt,
        "Speed Distribution",
        "Final speed histogram against Maxwell-Boltzmann reference",
        "STD / final window / distribution",
    )
    widths = [item["end"] - item["start"] for item in bins]
    centers = [item["center"] for item in bins]
    measured = [item["measured"] for item in bins]
    theory = [item["theory"] for item in bins]
    ax.bar(
        centers,
        measured,
        width=[width * 0.84 for width in widths],
        color="#d7e7f2",
        edgecolor=PROFESSIONAL_COLORS["primary_dark"],
        linewidth=0.45,
        label="Simulation bins",
        zorder=3,
    )
    ax.plot(centers, theory, color=PROFESSIONAL_COLORS["theory"], linewidth=ENGINEERING_EXPORT_STYLE["data_line_width"], label="Theory")
    style_axes(ax, "Speed v", "Probability density")
    add_readout_panel(
        ax,
        [
            ("Bins", str(len(bins))),
            ("Samples", "final collection"),
            ("Target T", "1.00"),
        ],
        loc="upper right",
    )
    add_legend(ax, loc="upper left")
    return save_professional_figure(fig, out_dir / "standard-speed-distribution-preview.png")


def build_temperature_error_history() -> list[dict[str, float]]:
    rows = []
    for index in range(80):
        time = index * 0.75
        temperature = 1 + 0.06 * math.exp(-index / 26) * math.cos(index / 4)
        rows.append({
            "time": time,
            "error": (temperature - 1) * 100,
        })
    return rows


def plot_standard_temperature_error(out_dir: Path) -> Path:
    rows = build_temperature_error_history()
    times = [row["time"] for row in rows]
    errors = [row["error"] for row in rows]
    mean_abs_error = sum(abs(value) for value in errors) / len(errors)

    fig, ax = create_professional_figure(
        plt,
        "Temperature Error History",
        "Thermostat convergence around the target temperature reference",
        "STD / 80 windows / thermal trace",
    )
    ax.axhline(0, color=PROFESSIONAL_COLORS["reference"], linewidth=0.85, linestyle=":", label="Target reference")
    ax.plot(times, errors, color=PROFESSIONAL_COLORS["primary"], linewidth=ENGINEERING_EXPORT_STYLE["data_line_width"], label="Temperature error")
    ax.fill_between(times, errors, 0, color=PROFESSIONAL_COLORS["accent"], alpha=0.12, linewidth=0)
    style_axes(ax, "Time t", "Temperature error (%)")
    add_readout_panel(
        ax,
        [
            ("Mean abs error", f"{mean_abs_error:.2f}%"),
            ("Final error", f"{errors[-1]:.2f}%"),
            ("Target T", "1.00"),
        ],
        loc="upper right",
    )
    add_legend(ax, loc="lower right")
    return save_professional_figure(fig, out_dir / "standard-temperature-error-preview.png")


def generate_previews(out_dir: Path) -> list[Path]:
    apply_professional_rc_params(plt)
    out_dir.mkdir(parents=True, exist_ok=True)
    return [
        plot_ideal_pt_verification(out_dir),
        plot_standard_speed_distribution(out_dir),
        plot_standard_temperature_error(out_dir),
    ]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate preview-only professional export graphs.")
    parser.add_argument("--out", type=Path, default=Path("output/graph-style-preview"), help="Preview output folder.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    outputs = generate_previews(args.out)
    print("Professional graph previews written:")
    for output in outputs:
        print(output.resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
