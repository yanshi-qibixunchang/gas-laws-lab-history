"""Professional graph styling helpers for Hard Sphere Lab exports."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Iterable


PROFESSIONAL_FONT_FAMILY = ["Times New Roman", "Times", "DejaVu Serif", "serif"]

ENGINEERING_EXPORT_STYLE = {
    "plot_face": "#ffffff",
    "data_line_width": 1.35,
    "fit_line_width": 1.05,
    "grid_major_width": 0.55,
    "grid_minor_width": 0.35,
    "axis_width": 0.8,
    "marker_size": 34,
}

PROFESSIONAL_COLORS = {
    "ink": "#111111",
    "muted": "#555f66",
    "axis": "#363f45",
    "grid_major": "#d7d7d7",
    "grid_minor": "#eeeeee",
    "surface": "#ffffff",
    "panel": "#ffffff",
    "primary": "#1f5d99",
    "primary_dark": "#16466f",
    "theory": "#a84e2a",
    "fit": "#222222",
    "reference": "#767676",
    "accent": "#6f9fc3",
}


def apply_professional_rc_params(plt: Any) -> None:
    plt.rcParams.update({
        "figure.facecolor": PROFESSIONAL_COLORS["surface"],
        "axes.facecolor": ENGINEERING_EXPORT_STYLE["plot_face"],
        "axes.edgecolor": PROFESSIONAL_COLORS["axis"],
        "axes.labelcolor": PROFESSIONAL_COLORS["ink"],
        "axes.titlesize": 12,
        "axes.titleweight": "bold",
        "axes.labelsize": 10,
        "font.family": "serif",
        "font.serif": PROFESSIONAL_FONT_FAMILY,
        "font.size": 9.5,
        "legend.frameon": True,
        "legend.fontsize": 8.8,
        "xtick.color": PROFESSIONAL_COLORS["muted"],
        "ytick.color": PROFESSIONAL_COLORS["muted"],
        "savefig.dpi": 300,
    })


def create_professional_figure(
    plt: Any,
    title: str,
    subtitle: str,
    status: str,
    *,
    figsize: tuple[float, float] = (7.0, 4.5),
    subplot_top: float = 0.745,
    subplot_bottom: float = 0.16,
    subplot_left: float = 0.12,
    subplot_right: float = 0.96,
) -> tuple[Any, Any]:
    fig, ax = plt.subplots(figsize=figsize)
    fig.subplots_adjust(top=subplot_top, bottom=subplot_bottom, left=subplot_left, right=subplot_right)
    fig.text(
        0.12,
        0.940,
        title,
        color=PROFESSIONAL_COLORS["ink"],
        fontsize=15,
        fontweight="bold",
        ha="left",
        va="center",
    )
    fig.text(
        0.12,
        0.902,
        subtitle,
        color=PROFESSIONAL_COLORS["muted"],
        fontsize=9.4,
        ha="left",
        va="center",
    )
    fig.text(
        0.96,
        0.940,
        status,
        color=PROFESSIONAL_COLORS["muted"],
        fontsize=8.8,
        ha="right",
        va="center",
    )
    fig.lines.append(plt.Line2D(
        [0.12, 0.96],
        [0.855, 0.855],
        transform=fig.transFigure,
        color=PROFESSIONAL_COLORS["grid_major"],
        linewidth=0.75,
    ))
    return fig, ax


def style_axes(ax: Any, xlabel: str, ylabel: str) -> None:
    ax.set_facecolor(ENGINEERING_EXPORT_STYLE["plot_face"])
    ax.set_axisbelow(True)
    ax.set_xlabel(xlabel, labelpad=8, fontweight="bold")
    ax.set_ylabel(ylabel, labelpad=8, fontweight="bold")
    ax.grid(True, which="major", color=PROFESSIONAL_COLORS["grid_major"], linewidth=ENGINEERING_EXPORT_STYLE["grid_major_width"])
    ax.grid(True, which="minor", color=PROFESSIONAL_COLORS["grid_minor"], linewidth=ENGINEERING_EXPORT_STYLE["grid_minor_width"])
    ax.minorticks_on()
    ax.tick_params(axis="both", which="major", direction="in", length=3.2, width=0.6)
    ax.tick_params(axis="both", which="minor", direction="in", length=1.8, width=0.4)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_linewidth(ENGINEERING_EXPORT_STYLE["axis_width"])
    ax.spines["bottom"].set_linewidth(ENGINEERING_EXPORT_STYLE["axis_width"])
    ax.spines["left"].set_color(PROFESSIONAL_COLORS["axis"])
    ax.spines["bottom"].set_color(PROFESSIONAL_COLORS["axis"])


def add_readout_panel(ax: Any, rows: Iterable[tuple[str, str]], *, loc: str = "upper left") -> None:
    text = "\n".join(f"{label}: {value}" for label, value in rows)
    anchor = {
        "upper left": (0.025, 0.965, "left", "top"),
        "upper right": (0.975, 0.965, "right", "top"),
        "lower left": (0.025, 0.035, "left", "bottom"),
        "lower right": (0.975, 0.035, "right", "bottom"),
    }.get(loc, (0.025, 0.965, "left", "top"))
    x, y, ha, va = anchor
    ax.text(
        x,
        y,
        text,
        transform=ax.transAxes,
        ha=ha,
        va=va,
        fontsize=8.5,
        color=PROFESSIONAL_COLORS["ink"],
        linespacing=1.35,
        bbox={
            "boxstyle": "square,pad=0.35",
            "facecolor": PROFESSIONAL_COLORS["panel"],
            "edgecolor": "#bcbcbc",
            "linewidth": 0.55,
            "alpha": 0.90,
        },
    )


def add_metadata_band(
    fig: Any,
    rows: Iterable[tuple[str, str]],
    *,
    left: float = 0.12,
    right: float = 0.96,
    label_y: float = 0.824,
    value_y: float = 0.797,
) -> None:
    items = list(rows)
    if not items:
        return
    slots = max(len(items), 1)
    span = right - left
    for index, (label, value) in enumerate(items):
        column_x = left + (span * index / slots)
        fig.text(
            column_x,
            label_y,
            label,
            ha="left",
            va="center",
            fontsize=7.6,
            color=PROFESSIONAL_COLORS["muted"],
        )
        fig.text(
            column_x,
            value_y,
            value,
            ha="left",
            va="center",
            fontsize=8.8,
            color=PROFESSIONAL_COLORS["ink"],
        )


def add_legend(ax: Any, *, loc: str = "upper right") -> None:
    legend = ax.legend(loc=loc, borderpad=0.55, handlelength=2.0, fancybox=False)
    legend.get_frame().set_facecolor(PROFESSIONAL_COLORS["surface"])
    legend.get_frame().set_edgecolor("#c2c2c2")
    legend.get_frame().set_linewidth(0.55)


def save_professional_figure(fig: Any, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=300, bbox_inches="tight", facecolor=PROFESSIONAL_COLORS["surface"])
    return path
