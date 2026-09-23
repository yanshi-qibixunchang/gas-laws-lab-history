"""Professional graph styling helpers for Gas Laws Lab exports."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Iterable


PROFESSIONAL_FONT_FAMILY = ["Times New Roman", "SimSun"]

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
        "font.size": 9,
        "legend.frameon": True,
        "legend.fontsize": 9,
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
    # Titles and metadata belong to the report text, not inside the plot.
    fig, ax = plt.subplots(figsize=(6.3, 3.65))
    fig.subplots_adjust(top=0.82, bottom=0.17, left=0.13, right=0.97)
    return fig, ax



def style_axes(ax: Any, xlabel: str, ylabel: str) -> None:
    ax.set_facecolor(ENGINEERING_EXPORT_STYLE["plot_face"])
    ax.set_axisbelow(True)
    ax.set_xlabel(xlabel, labelpad=6, fontsize=10, fontweight="normal")
    ax.set_ylabel(ylabel, labelpad=6, fontsize=10, fontweight="normal")
    ax.grid(True, which="major", color=PROFESSIONAL_COLORS["grid_major"], linewidth=ENGINEERING_EXPORT_STYLE["grid_major_width"])
    ax.grid(False, which="minor")
    ax.tick_params(axis="both", which="major", direction="in", length=3.2, width=0.6, top=True, right=True, labelsize=9, colors=PROFESSIONAL_COLORS["ink"])
    ax.tick_params(axis="both", which="minor", direction="in", length=1.8, width=0.4, top=True, right=True)
    for spine in ax.spines.values():
        spine.set_visible(True)
        spine.set_linewidth(ENGINEERING_EXPORT_STYLE["axis_width"])
        spine.set_color(PROFESSIONAL_COLORS["axis"])



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


def add_legend(ax: Any, *, loc: str = "best") -> None:
    # The dedicated space above the axes guarantees no data are obscured.
    handles, labels = ax.get_legend_handles_labels()
    if not handles:
        return
    legend = ax.legend(handles, labels, loc="lower center", bbox_to_anchor=(0.5, 1.02),
                       ncol=min(3, len(handles)), borderpad=0.35, columnspacing=1.0,
                       handletextpad=0.5, handlelength=2.0, fancybox=False, framealpha=1, fontsize=9)
    legend.get_frame().set_facecolor(PROFESSIONAL_COLORS["surface"])
    legend.get_frame().set_edgecolor(PROFESSIONAL_COLORS["axis"])
    legend.get_frame().set_linewidth(0.55)


def prepare_report_figure(fig: Any) -> None:
    """Apply the same final axes, typography and legend rules to every exporter."""
    from matplotlib.text import Text
    active_axes = [ax for ax in fig.axes if ax.axison]
    for ax in active_axes:
        style_axes(ax, ax.get_xlabel(), ax.get_ylabel())
        if len(active_axes) == 1:
            ax.set_title("")
        else:
            ax.title.set_fontsize(10)
        if ax.get_legend() is not None:
            ax.get_legend().remove()
        add_legend(ax)
    for text in fig.findobj(Text):
        text.set_fontfamily(PROFESSIONAL_FONT_FAMILY)
        text.set_fontweight("normal")
        text.set_color(PROFESSIONAL_COLORS["ink"])
    if len(active_axes) == 1:
        fig.tight_layout(pad=1.0, rect=(0, 0, 1, 0.98))
    else:
        fig.tight_layout(pad=1.0, h_pad=2.2, w_pad=2.0)


def save_professional_figure(fig: Any, path: Path) -> Path:
    prepare_report_figure(fig)
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=300, facecolor=PROFESSIONAL_COLORS["surface"])
    return path
