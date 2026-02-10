"""
Poster-quality diagrams using Graphviz for NutriLabelAI system visualization.

This module generates architecture and pipeline flow diagrams in multiple formats.

Install:
  pip install graphviz
  And install Graphviz system package so the 'dot' binary exists.

Run:
  python diagrams.py

Outputs:
  architecture_diagram.svg / .png
  pipeline_flow_diagram.svg / .png
"""

from pathlib import Path
from typing import Literal, Optional
import sys

try:
    from graphviz import Digraph
except ImportError:
    print("Error: graphviz module not found. Install with: pip install graphviz")
    sys.exit(1)


# ========== CONFIGURATION ==========

# Color scheme
COLORS = {
    "bg": "white",
    "border": "#111827",
    "fill": "#F9FAFB",
    "cluster_border": "#D1D5DB",
    "text": "#111827",
}

# Node styling
NODE_STYLE = {
    "shape": "box",
    "style": "rounded,filled",
    "fontname": "Inter",
    "fontsize": "12",
    "penwidth": "1.5",
}

# Edge styling
EDGE_STYLE = {
    "penwidth": "1.5",
    "arrowsize": "0.8",
    "fontname": "Inter",
    "fontsize": "11",
}

# Graph attributes
GRAPH_ATTRS = {
    "bgcolor": COLORS["bg"],
    "nodesep": "0.35",
    "ranksep": "0.35",
}


def _apply_styling(g: Digraph) -> None:
    """Apply consistent styling to a Graphviz diagram."""
    g.attr(**GRAPH_ATTRS)
    g.attr("node", **NODE_STYLE, color=COLORS["border"], fillcolor=COLORS["fill"])
    g.attr("edge", **EDGE_STYLE, color=COLORS["border"])


def architecture_diagram(output_format: Literal["svg", "png"] = "svg") -> Digraph:
    """Generate the NutriLabelAI system architecture diagram.
    
    Args:
        output_format: Output format (svg or png)
        
    Returns:
        Digraph object ready to render
    """
    g = Digraph("NutriLabelAI_Architecture", format=output_format)
    g.attr(rankdir="LR")
    _apply_styling(g)

    # Clusters for visual structure
    with g.subgraph(name="cluster_mobile") as c:
        c.attr(label="Mobile App", labelloc="t", fontsize="14", 
               fontname="Inter", color=COLORS["cluster_border"])
        c.node("mobile", """React Native + Expo
TypeScript UI

• Dish name input
• Optional target calories
• Label + confidence display
• History saving""")

    with g.subgraph(name="cluster_backend") as c:
        c.attr(label="Backend API", labelloc="t", fontsize="14", 
               fontname="Inter", color=COLORS["cluster_border"])
        c.node("api", """FastAPI (Python)

POST /label
GET /dishes
GET /health

Services:
• retrieval
• mixture
• scaling
• confidence""")

    with g.subgraph(name="cluster_db") as c:
        c.attr(label="Data Layer", labelloc="t", fontsize="14", 
               fontname="Inter", color=COLORS["cluster_border"])
        c.node("db", """PostgreSQL + pgvector

• dishes (516 rows)
• dish_variants (778 rows)
• VECTOR(384) embeddings
• HNSW index (cosine)""")

    # Edges
    g.edge("mobile", "api", label="HTTP / JSON")
    g.edge("api", "db", label="SQL + vector similarity")
    g.edge("db", "api", label="Top-K matches")
    g.edge("api", "mobile", label="Label + confidence")

    g.attr(label="NutriLabelAI System Architecture", fontsize="18", fontname="Inter", labelloc="t")
    return g


def pipeline_diagram(output_format: Literal["svg", "png"] = "svg") -> Digraph:
    """Generate the nutrition label generation pipeline diagram.
    
    Args:
        output_format: Output format (svg or png)
        
    Returns:
        Digraph object ready to render
    """
    g = Digraph("NutriLabelAI_Pipeline", format=output_format)
    g.attr(rankdir="LR")
    _apply_styling(g)

    steps = [
        ("s1", "Input\nDish name + optional target calories"),
        ("s2", "Embedding\n384-dim vector (sentence-transformers)"),
        ("s3", "Retrieval\npgvector cosine search (Top-K)"),
        ("s4", "Mixture\nWeighted aggregation (limits dominance)"),
        ("s5", "Scaling\nPortion adjustment via target calories"),
        ("s6", "Confidence\nSimilarity + scaling penalty + consistency"),
        ("s7", "Output\nNutrition label + confidence score"),
    ]

    for k, label in steps:
        g.node(k, label)

    for i in range(len(steps) - 1):
        g.edge(steps[i][0], steps[i + 1][0])

    g.attr(label="Nutrition Label Generation Pipeline", fontsize="18", fontname="Inter", labelloc="t")
    return g


def render_diagram(
    diagram: Digraph,
    filename: str,
    output_dir: Optional[Path] = None,
    cleanup: bool = True
) -> Path:
    """Render a diagram to file.
    
    Args:
        diagram: The Graphviz diagram to render
        filename: Base filename (without extension)
        output_dir: Output directory (defaults to current directory)
        cleanup: Whether to remove the intermediate .dot file
        
    Returns:
        Path to the generated file
    """
    if output_dir:
        output_dir.mkdir(parents=True, exist_ok=True)
        filepath = str(output_dir / filename)
    else:
        filepath = filename
        
    diagram.render(filepath, cleanup=cleanup)
    output_path = Path(f"{filepath}.{diagram.format}")
    return output_path


def render_both(
    output_formats: list[Literal["svg", "png"]] = ["svg", "png"],
    output_dir: Optional[Path] = None,
    verbose: bool = True
) -> dict[str, list[Path]]:
    """Render both architecture and pipeline diagrams in specified formats.
    
    Args:
        output_formats: List of output formats (svg, png)
        output_dir: Output directory (defaults to current directory)
        verbose: Whether to print generated file names
        
    Returns:
        Dictionary mapping diagram names to list of output file paths
    """
    generated_files = {"architecture": [], "pipeline": []}
    
    try:
        for fmt in output_formats:
            # Architecture diagram
            arch = architecture_diagram(output_format=fmt)
            arch_path = render_diagram(arch, "architecture_diagram", output_dir)
            generated_files["architecture"].append(arch_path)
            
            # Pipeline diagram
            pipe = pipeline_diagram(output_format=fmt)
            pipe_path = render_diagram(pipe, "pipeline_flow_diagram", output_dir)
            generated_files["pipeline"].append(pipe_path)
        
        if verbose:
            print("✓ Successfully generated diagrams:")
            for diagram_type, paths in generated_files.items():
                for path in paths:
                    print(f"  • {path}")
                    
    except Exception as e:
        print(f"✗ Error generating diagrams: {e}", file=sys.stderr)
        raise
        
    return generated_files


def main() -> None:
    """Main entry point for diagram generation."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Generate NutriLabelAI system diagrams"
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
        "--quiet",
        action="store_true",
        help="Suppress output messages"
    )
    
    args = parser.parse_args()
    
    render_both(
        output_formats=args.format,
        output_dir=args.output_dir,
        verbose=not args.quiet
    )


if __name__ == "__main__":
    main()