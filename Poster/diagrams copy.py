"""
Poster-friendly vertical zig-zag pipeline diagram for NutriLabelAI.

This module generates an aesthetically pleasing vertical pipeline diagram
with zig-zag flow, suitable for presentations and posters.

Outputs:
  pipeline_vertical_zigzag.svg
  pipeline_vertical_zigzag.png

Install:
  pip install matplotlib
"""

from pathlib import Path
from typing import Optional, Literal
import sys

try:
    import matplotlib.pyplot as plt
    from matplotlib.patches import FancyBboxPatch
    import matplotlib.patheffects as pe
except ImportError:
    print("Error: matplotlib module not found. Install with: pip install matplotlib")
    sys.exit(1)


# ========== CONFIGURATION ==========

# Color scheme
COLORS = {
    "text": "#111827",
    "box_fill": "white",
    "box_edge": "#111827",
    "arrow": "#111827",
}

# Box styling
BOX_STYLE = {
    "boxstyle": "round,pad=0.02,rounding_size=0.04",
    "linewidth": 1.8,
    "shadow_offset": (3, -3),
    "shadow_alpha": 0.18,
}

# Text styling
TEXT_STYLE = {
    "title_fontsize": 16,
    "body_fontsize": 12,
    "header_fontsize": 24,
    "line_spacing": 1.35,
}

# Layout configuration
LAYOUT = {
    "left_x": 0.08,
    "right_x": 0.52,
    "box_width": 0.36,
    "box_height": 0.10,
    "figure_width": 7,
    "figure_height": 14,
    "arrow_width": 2.0,
    "arrow_shrink": 8,
}


def add_box(
    ax: plt.Axes,
    x: float,
    y: float,
    w: float,
    h: float,
    title: str,
    lines: list[str]
) -> FancyBboxPatch:
    """Add a styled box with title and bullet points to the diagram.
    
    Args:
        ax: Matplotlib axes object
        x: X position of bottom-left corner
        y: Y position of bottom-left corner
        w: Width of the box
        h: Height of the box
        title: Box title text
        lines: List of bullet point text items
        
    Returns:
        The created FancyBboxPatch object
    """
    box = FancyBboxPatch(
        (x, y), w, h,
        boxstyle=BOX_STYLE["boxstyle"],
        linewidth=BOX_STYLE["linewidth"],
        facecolor=COLORS["box_fill"],
        edgecolor=COLORS["box_edge"]
    )
    box.set_path_effects([
        pe.SimplePatchShadow(
            offset=BOX_STYLE["shadow_offset"],
            alpha=BOX_STYLE["shadow_alpha"]
        ),
        pe.Normal()
    ])
    ax.add_patch(box)

    # Title
    ax.text(
        x + w/2, y + h - 0.18*h, title,
        ha="center", va="top",
        fontsize=TEXT_STYLE["title_fontsize"],
        fontweight="bold",
        color=COLORS["text"]
    )

    # Bullet points
    body = "\n".join(f"• {line}" for line in lines)
    ax.text(
        x + 0.06*w, y + h - 0.40*h, body,
        ha="left", va="top",
        fontsize=TEXT_STYLE["body_fontsize"],
        color=COLORS["text"],
        linespacing=TEXT_STYLE["line_spacing"]
    )
    
    return box


def draw_arrow(
    ax: plt.Axes,
    x1: float,
    y1: float,
    x2: float,
    y2: float
) -> None:
    """Draw an arrow between two points.
    
    Args:
        ax: Matplotlib axes object
        x1: Starting X coordinate
        y1: Starting Y coordinate
        x2: Ending X coordinate
        y2: Ending Y coordinate
    """
    ax.annotate(
        "", xy=(x2, y2), xytext=(x1, y1),
        arrowprops=dict(
            arrowstyle="-|>",
            lw=LAYOUT["arrow_width"],
            color=COLORS["arrow"],
            shrinkA=LAYOUT["arrow_shrink"],
            shrinkB=LAYOUT["arrow_shrink"]
        )
    )


def create_pipeline_diagram(
    title: str = "Nutrition Label Generation Pipeline"
) -> tuple[plt.Figure, plt.Axes]:
    """Create the vertical zig-zag pipeline diagram.
    
    Args:
        title: Main title for the diagram
        
    Returns:
        Tuple of (figure, axes) objects
    """
    fig = plt.figure(figsize=(LAYOUT["figure_width"], LAYOUT["figure_height"]))
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 1)
    ax.set_ylim(-0.14, 1)  # Extended below 0 to accommodate the output box
    ax.axis("off")

    # Title
    ax.text(
        0.5, 0.96, title,
        ha="center", va="center",
        fontsize=TEXT_STYLE["header_fontsize"],
        fontweight="bold",
        color=COLORS["text"]
    )

    # Layout positions
    left_x = LAYOUT["left_x"]
    right_x = LAYOUT["right_x"]
    box_w = LAYOUT["box_width"]
    box_h = LAYOUT["box_height"]
    
    # Y positions for each step (from top to bottom)
    y_positions = [
        0.82,  # Input
        0.68,  # Embedding
        0.54,  # Retrieval
        0.40,  # Mixture
        0.26,  # Scaling
        0.12,  # Confidence
    ]

    # Boxes
    add_box(ax, left_x, y_positions[0], box_w, box_h,
            "Input",
            ["Dish name", "Optional target calories"])

    add_box(ax, right_x, y_positions[1], box_w, box_h,
            "Embedding",
            ["Sentence-transformers", "384-dim vector"])

    add_box(ax, left_x, y_positions[2], box_w, box_h,
            "Retrieval",
            ["pgvector cosine similarity", "Top-K dish variants"])

    add_box(ax, right_x, y_positions[3], box_w, box_h,
            "Mixture",
            ["Weighted aggregation", "Limits dominance"])

    add_box(ax, left_x, y_positions[4], box_w, box_h,
            "Scaling",
            ["Portion adjustment", "Matches target calories"])

    add_box(ax, right_x, y_positions[5], box_w, box_h,
            "Confidence",
            ["Similarity-based score", "Consistency penalty/bonus"])

    # Output box (centered)
    add_box(ax, 0.30, -0.02, 0.40, 0.10,
            "Output",
            ["Nutrition label", "Confidence score"])

    # Arrows (zig-zag pattern)
    draw_arrow(ax, left_x + box_w/2, y_positions[0],
               right_x + box_w/2, y_positions[1] + box_h)

    draw_arrow(ax, right_x + box_w/2, y_positions[1],
               left_x + box_w/2, y_positions[2] + box_h)

    draw_arrow(ax, left_x + box_w/2, y_positions[2],
               right_x + box_w/2, y_positions[3] + box_h)

    draw_arrow(ax, right_x + box_w/2, y_positions[3],
               left_x + box_w/2, y_positions[4] + box_h)

    draw_arrow(ax, left_x + box_w/2, y_positions[4],
               right_x + box_w/2, y_positions[5] + box_h)

    draw_arrow(ax, 0.70, y_positions[5], 0.50, 0.08)
    
    return fig, ax


def save_diagram(
    fig: plt.Figure,
    filename: str = "pipeline_vertical_zigzag",
    output_dir: Optional[Path] = None,
    formats: list[Literal["svg", "png"]] = ["svg", "png"],
    dpi: int = 300
) -> list[Path]:
    """Save the diagram to file(s).
    
    Args:
        fig: Matplotlib figure to save
        filename: Base filename (without extension)
        output_dir: Output directory (defaults to current directory)
        formats: List of output formats to save
        dpi: DPI resolution for raster formats (PNG)
        
    Returns:
        List of output file paths
    """
    output_paths = []
    
    if output_dir:
        output_dir.mkdir(parents=True, exist_ok=True)
        filepath = output_dir / filename
    else:
        filepath = Path(filename)
    
    for fmt in formats:
        output_path = filepath.with_suffix(f".{fmt}")
        if fmt == "png":
            fig.savefig(output_path, bbox_inches="tight", dpi=dpi)
        else:
            fig.savefig(output_path, bbox_inches="tight")
        output_paths.append(output_path)
    
    plt.close(fig)
    return output_paths


def main() -> None:
    """Main entry point for diagram generation."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Generate vertical zig-zag pipeline diagram for NutriLabelAI"
    )
    parser.add_argument(
        "--title",
        default="Nutrition Label Generation Pipeline",
        help="Main title for the diagram"
    )
    parser.add_argument(
        "--format",
        nargs="+",
        choices=["svg", "png"],
        default=["svg", "png"],
        help="Output format(s) (default: svg png)"
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        help="Output directory (default: current directory)"
    )
    parser.add_argument(
        "--dpi",
        type=int,
        default=300,
        help="DPI for PNG output (default: 300)"
    )
    parser.add_argument(
        "--filename",
        default="pipeline_vertical_zigzag",
        help="Base filename (default: pipeline_vertical_zigzag)"
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress output messages"
    )
    
    args = parser.parse_args()
    
    try:
        # Create diagram
        fig, ax = create_pipeline_diagram(title=args.title)
        
        # Save diagram
        output_paths = save_diagram(
            fig,
            filename=args.filename,
            output_dir=args.output_dir,
            formats=args.format,
            dpi=args.dpi
        )
        
        # Print results
        if not args.quiet:
            print("✓ Successfully generated diagram:")
            for path in output_paths:
                print(f"  • {path}")
                
    except Exception as e:
        print(f"✗ Error generating diagram: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()