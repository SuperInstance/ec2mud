"""
Knowledge Graph Visualizer

Provides visualization capabilities for the knowledge graph including:
- Graphviz DOT export
- Interactive D3.js force-directed graphs
- Player discovery maps
- Path highlighting
"""

import json
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass
from datetime import datetime
import asyncio

from .entity_schema import Entity, EntityType, LINK_TYPES
from .graph_queries import KnowledgeGraphQueries, PathResult


@dataclass
class GraphNode:
    """A node in the visualization graph"""
    id: str
    label: str
    type: str
    color: str
    size: float
    properties: Dict
    discovered: bool = True

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "label": self.label,
            "type": self.type,
            "color": self.color,
            "size": self.size,
            "properties": self.properties,
            "discovered": self.discovered
        }


@dataclass
class GraphEdge:
    """An edge in the visualization graph"""
    source: str
    target: str
    label: str
    type: str
    strength: float
    color: str = "#999999"
    width: float = 1.0

    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            "source": self.source,
            "target": self.target,
            "label": self.label,
            "type": self.type,
            "strength": self.strength,
            "color": self.color,
            "width": self.width
        }


@dataclass
class GraphData:
    """Complete graph data for visualization"""
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    metadata: Dict

    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            "nodes": [n.to_dict() for n in self.nodes],
            "edges": [e.to_dict() for e in self.edges],
            "metadata": self.metadata
        }

    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps(self.to_dict(), indent=2)


class GraphVisualizer:
    """
    Creates visualizations of the knowledge graph.

    Features:
    - Graphviz DOT export
    - D3.js force-directed graph generation
    - Player discovery maps
    - Path visualization
    - Interactive graph data export
    """

    def __init__(
        self,
        entity_store: "EntityStore",
        graph_queries: KnowledgeGraphQueries
    ):
        self.entity_store = entity_store
        self.graph_queries = graph_queries

    async def export_graphviz(
        self,
        player_id: Optional[str] = None,
        focus_id: Optional[str] = None,
        radius: int = 2,
        min_strength: float = 0.3,
        max_nodes: int = 100
    ) -> str:
        """
        Export graph as Graphviz DOT format.

        Args:
            player_id: Filter to player's discovered entities (optional)
            focus_id: Center entity (if provided, show neighborhood)
            radius: If focus_id provided, show N hops
            min_strength: Minimum link strength
            max_nodes: Maximum nodes to export

        Returns:
            Graphviz DOT format string
        """
        # Get entities to visualize
        if focus_id:
            neighborhood = await self.graph_queries.get_neighbors(
                focus_id,
                radius=radius,
                player_id=player_id,
                min_strength=min_strength
            )
            entities = set()
            for distance, entity_list in neighborhood.entities.items():
                for entity in entity_list:
                    entities.add(entity)
            # Add focus entity
            focus_entity = await self.entity_store.get_entity(focus_id)
            if focus_entity:
                entities.add(focus_entity)
        else:
            # Get all entities
            all_entities = await self.entity_store.get_all_entities()
            if player_id:
                entities = {e for e in all_entities if e.is_discovered_by(player_id)}
            else:
                entities = set(all_entities[:max_nodes])

        # Limit nodes
        entities = list(entities)[:max_nodes]
        entity_ids = {e.id for e in entities}

        # Generate DOT format
        dot_lines = ["digraph KnowledgeGraph {"]
        dot_lines.append("  rankdir=LR;")
        dot_lines.append("  node [shape=box, style=rounded];")
        dot_lines.append("")

        # Add nodes
        for entity in entities:
            label = entity.name.replace('"', '\\"')
            node_type = entity.type.value
            color = entity.color or "#999999"

            # Highlight focus
            if entity.id == focus_id:
                dot_lines.append(
                    f'  "{entity.id}" [label="{label}", '
                    f'fillcolor="{color}", style="filled,rounded", '
                    f'penwidth=2.0];'
                )
            else:
                dot_lines.append(
                    f'  "{entity.id}" [label="{label}", '
                    f'fillcolor="{color}", style="filled,rounded"];'
                )

        dot_lines.append("")

        # Add edges
        for entity in entities:
            for link in entity.links:
                if link.target_id in entity_ids and link.strength >= min_strength:
                    link_color = self._get_edge_color(link.link_type)
                    width = max(1.0, link.strength * 3.0)
                    dot_lines.append(
                        f'  "{link.source_id}" -> "{link.target_id}" '
                        f'[label="{link.link_type}", '
                        f'color="{link_color}", '
                        f'penwidth="{width}", '
                        f'fontsize=8];'
                    )

        dot_lines.append("}")

        return "\n".join(dot_lines)

    def _get_edge_color(self, link_type: str) -> str:
        """Get color for edge type"""
        colors = {
            "ROOM_EXIT": "#4A90E2",
            "SECRET_PASSAGE": "#9B59B6",
            "TELEPORTER": "#E74C3C",
            "NPC_OWNER": "#F39C12",
            "NPC_RESIDENT": "#50C878",
            "ITEM_SOLD_HERE": "#F5A623",
            "QUEST_STARTER": "#9B59B6",
            "MENTIONS": "#95A5A6",
        }
        return colors.get(link_type, "#999999")

    async def generate_interactive_graph(
        self,
        player_id: Optional[str] = None,
        center_id: Optional[str] = None,
        depth: int = 2,
        min_strength: float = 0.3,
        max_nodes: int = 50
    ) -> GraphData:
        """
        Generate graph data for D3.js force-directed visualization.

        Args:
            player_id: Filter to player's discovered entities
            center_id: Center entity ID (optional)
            depth: Hops from center to include
            min_strength: Minimum link strength
            max_nodes: Maximum nodes to include

        Returns:
            GraphData object ready for visualization
        """
        # Get entities
        if center_id:
            neighborhood = await self.graph_queries.get_neighbors(
                center_id,
                radius=depth,
                player_id=player_id,
                min_strength=min_strength
            )

            entities = set()
            for distance, entity_list in neighborhood.entities.items():
                for entity in entity_list:
                    entities.add(entity)

            # Add center
            center_entity = await self.entity_store.get_entity(center_id)
            if center_entity:
                entities.add(center_entity)
        else:
            all_entities = await self.entity_store.get_all_entities()
            if player_id:
                entities = {e for e in all_entities if e.is_discovered_by(player_id)}
            else:
                entities = set(all_entities[:max_nodes])

        # Limit nodes
        entity_list = list(entities)[:max_nodes]
        entity_ids = {e.id for e in entity_list}

        # Create nodes
        nodes = []
        for entity in entity_list:
            node = GraphNode(
                id=entity.id,
                label=entity.name,
                type=entity.type.value,
                color=entity.color or "#999999",
                size=entity.size or 15.0,
                properties={
                    "description": entity.description[:200],
                    "discovery_count": entity.discovery_count,
                }
            )

            # Check if discovered by player
            if player_id:
                node.discovered = entity.is_discovered_by(player_id)

            # Highlight center
            if entity.id == center_id:
                node.size *= 1.5

            nodes.append(node)

        # Create edges
        edges = []
        for entity in entity_list:
            for link in entity.links:
                if link.target_id in entity_ids and link.strength >= min_strength:
                    edge = GraphEdge(
                        source=link.source_id,
                        target=link.target_id,
                        label=link.link_type,
                        type=link.link_type,
                        strength=link.strength,
                        color=self._get_edge_color(link.link_type),
                        width=max(1.0, link.strength * 2.0)
                    )
                    edges.append(edge)

        # Metadata
        metadata = {
            "player_id": player_id,
            "center_id": center_id,
            "depth": depth,
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "generated_at": datetime.utcnow().isoformat()
        }

        return GraphData(nodes=nodes, edges=edges, metadata=metadata)

    async def visualize_path(
        self,
        path_result: PathResult,
        player_id: Optional[str] = None
    ) -> GraphData:
        """
        Create visualization for a path result.

        Args:
            path_result: Path result from graph queries
            player_id: Player ID (optional)

        Returns:
            GraphData for path visualization
        """
        if not path_result:
            return GraphData(nodes=[], edges={}, metadata={})

        # Create nodes for path
        nodes = []
        for i, entity in enumerate(path_result.entities):
            # Highlight start and end
            size = entity.size or 15.0
            if i == 0 or i == len(path_result.entities) - 1:
                size *= 1.5

            node = GraphNode(
                id=entity.id,
                label=f"{i}. {entity.name}",
                type=entity.type.value,
                color=entity.color or "#999999",
                size=size,
                properties={
                    "description": entity.description[:200],
                    "step": i
                }
            )

            if player_id:
                node.discovered = entity.is_discovered_by(player_id)

            nodes.append(node)

        # Create edges for path
        edges = []
        for i in range(len(path_result.entities) - 1):
            source = path_result.entities[i]
            target = path_result.entities[i + 1]

            # Find link between them
            link = None
            for l in source.links:
                if l.target_id == target.id:
                    link = l
                    break

            edge = GraphEdge(
                source=source.id,
                target=target.id,
                label=f"Step {i+1}",
                type=link.link_type if link else "PATH",
                strength=link.strength if link else 1.0,
                color="#E74C3C",  # Red for path
                width=2.0
            )
            edges.append(edge)

        metadata = {
            "player_id": player_id,
            "path_length": path_result.length,
            "path_strength": path_result.total_strength,
            "generated_at": datetime.utcnow().isoformat()
        }

        return GraphData(nodes=nodes, edges=edges, metadata=metadata)

    async def generate_discovery_map(
        self,
        player_id: str
    ) -> GraphData:
        """
        Generate player's discovery map (fog of war style).

        Args:
            player_id: Player to generate map for

        Returns:
            GraphData with discovered/undiscovered entities
        """
        all_entities = await self.entity_store.get_all_entities()

        nodes = []
        discovered_count = 0
        undiscovered_count = 0

        for entity in all_entities:
            is_discovered = entity.is_discovered_by(player_id)

            if is_discovered:
                discovered_count += 1
                color = entity.color or "#999999"
                opacity = 1.0
            else:
                undiscovered_count += 1
                color = "#CCCCCC"  # Gray for undiscovered
                opacity = 0.3

            node = GraphNode(
                id=entity.id,
                label=entity.name if is_discovered else "???",
                type=entity.type.value,
                color=color,
                size=entity.size or 15.0,
                properties={
                    "discovered": is_discovered,
                    "opacity": opacity
                }
            )

            nodes.append(node)

        # Only show edges between discovered entities
        edges = []
        discovered_ids = {
            e.id for e in all_entities
            if e.is_discovered_by(player_id)
        }

        for entity in all_entities:
            if entity.is_discovered_by(player_id):
                for link in entity.links:
                    if link.target_id in discovered_ids:
                        edge = GraphEdge(
                            source=link.source_id,
                            target=link.target_id,
                            label=link.link_type,
                            type=link.link_type,
                            strength=link.strength,
                            color=self._get_edge_color(link.link_type),
                            width=link.strength * 2.0
                        )
                        edges.append(edge)

        metadata = {
            "player_id": player_id,
            "discovered_count": discovered_count,
            "undiscovered_count": undiscovered_count,
            "discovery_percentage": round(
                discovered_count / len(all_entities) * 100, 2
            ) if all_entities else 0,
            "generated_at": datetime.utcnow().isoformat()
        }

        return GraphData(nodes=nodes, edges=edges, metadata=metadata)

    async def export_d3_json(
        self,
        player_id: Optional[str] = None,
        center_id: Optional[str] = None,
        depth: int = 2,
        min_strength: float = 0.3
    ) -> str:
        """
        Export graph as D3.js-compatible JSON.

        Args:
            player_id: Optional player filter
            center_id: Optional center entity
            depth: Hops from center
            min_strength: Minimum link strength

        Returns:
            JSON string suitable for D3.js loading
        """
        graph_data = await self.generate_interactive_graph(
            player_id=player_id,
            center_id=center_id,
            depth=depth,
            min_strength=min_strength
        )

        return graph_data.to_json()

    async def generate_cluster_diagram(
        self,
        cluster_id: str,
        entities: List[Entity]
    ) -> GraphData:
        """
        Generate visualization for a cluster of related entities.

        Args:
            cluster_id: Cluster identifier
            entities: List of entities in cluster

        Returns:
            GraphData for cluster visualization
        """
        nodes = []
        for entity in entities:
            node = GraphNode(
                id=entity.id,
                label=entity.name,
                type=entity.type.value,
                color=entity.color or "#999999",
                size=entity.size or 15.0,
                properties={
                    "description": entity.description[:200],
                    "cluster": cluster_id
                }
            )
            nodes.append(node)

        # Create edges within cluster
        edges = []
        entity_ids = {e.id for e in entities}

        for entity in entities:
            for link in entity.links:
                if link.target_id in entity_ids:
                    edge = GraphEdge(
                        source=link.source_id,
                        target=link.target_id,
                        label=link.link_type,
                        type=link.link_type,
                        strength=link.strength,
                        color=self._get_edge_color(link.link_type),
                        width=link.strength * 2.0
                    )
                    edges.append(edge)

        metadata = {
            "cluster_id": cluster_id,
            "cluster_size": len(entities),
            "generated_at": datetime.utcnow().isoformat()
        }

        return GraphData(nodes=nodes, edges=edges, metadata=metadata)


class InteractiveGraph:
    """
    Wrapper for generating interactive graph visualizations.

    This class provides methods to generate HTML/JavaScript for
    interactive D3.js visualizations.
    """

    def __init__(self, graph_data: GraphData):
        self.graph_data = graph_data

    def generate_html(self, width: int = 1200, height: int = 800) -> str:
        """
        Generate complete HTML file with D3.js visualization.

        Args:
            width: Canvas width
            height: Canvas height

        Returns:
            Complete HTML string
        """
        graph_json = json.dumps(self.graph_data.to_dict())

        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Knowledge Graph Visualization</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body {{
            margin: 0;
            font-family: Arial, sans-serif;
            background: #1a1a1a;
            color: #fff;
        }}
        #graph {{
            width: {width}px;
            height: {height}px;
            background: #2a2a2a;
            border: 1px solid #444;
        }}
        .node {{
            cursor: pointer;
        }}
        .node text {{
            font-size: 12px;
            fill: #fff;
            pointer-events: none;
            text-anchor: middle;
        }}
        .link {{
            stroke-opacity: 0.6;
        }}
        #tooltip {{
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            border: 1px solid #555;
            padding: 10px;
            border-radius: 5px;
            pointer-events: none;
            display: none;
            max-width: 300px;
        }}
        #info {{
            padding: 10px;
            background: #333;
            border: 1px solid #444;
            margin: 10px;
            border-radius: 5px;
        }}
    </style>
</head>
<body>
    <div id="info">
        <h2>Knowledge Graph</h2>
        <p>Nodes: {len(self.graph_data.nodes)} | Edges: {len(self.graph_data.edges)}</p>
        <p>Drag nodes to rearrange. Scroll to zoom. Click node for details.</p>
    </div>
    <div id="graph"></div>
    <div id="tooltip"></div>

    <script>
        const graphData = {graph_json};

        const width = {width};
        const height = {height};

        // Create SVG
        const svg = d3.select("#graph")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .call(d3.zoom().on("zoom", (event) => {{
                g.attr("transform", event.transform);
            }}));

        const g = svg.append("g");

        // Create force simulation
        const simulation = d3.forceSimulation(graphData.nodes)
            .force("link", d3.forceLink(graphData.edges)
                .id(d => d.id)
                .distance(d => 100 / d.strength))
            .force("charge", d3.forceManyBody()
                .strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide()
                .radius(d => d.size + 5));

        // Create links
        const link = g.append("g")
            .selectAll("line")
            .data(graphData.edges)
            .join("line")
            .attr("class", "link")
            .attr("stroke", d => d.color)
            .attr("stroke-width", d => d.width);

        // Create nodes
        const node = g.append("g")
            .selectAll("g")
            .data(graphData.nodes)
            .join("g")
            .attr("class", "node")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        node.append("circle")
            .attr("r", d => d.size)
            .attr("fill", d => d.color)
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
            .on("mouseover", showTooltip)
            .on("mouseout", hideTooltip)
            .on("click", showDetails);

        node.append("text")
            .text(d => d.label)
            .attr("dy", 4)
            .attr("font-size", "10px");

        // Add title attribute
        node.append("title")
            .text(d => d.label);

        // Update positions
        simulation.on("tick", () => {{
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("transform", d => `translate(${{d.x}},${{d.y}})`);
        }});

        // Tooltip functions
        const tooltip = d3.select("#tooltip");

        function showTooltip(event, d) {{
            tooltip.style("display", "block")
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px")
                .html(`
                    <strong>${{d.label}}</strong><br/>
                    Type: ${{d.type}}<br/>
                    ${{d.properties.description || 'No description'}}
                `);
        }}

        function hideTooltip() {{
            tooltip.style("display", "none");
        }}

        function showDetails(event, d) {{
            alert(`Details for ${{d.label}}:\\n\\nType: ${{d.type}}\\n\\n${{d.properties.description || 'No description'}}`);
        }}

        // Drag functions
        function dragstarted(event, d) {{
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }}

        function dragged(event, d) {{
            d.fx = event.x;
            d.fy = event.y;
        }}

        function dragended(event, d) {{
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }}
    </script>
</body>
</html>
"""
        return html


# Convenience functions
async def export_graphviz(
    player_id: Optional[str] = None,
    focus_id: Optional[str] = None,
    radius: int = 2,
    entity_store: "EntityStore" = None,
    graph_queries: KnowledgeGraphQueries = None
) -> str:
    """Export graph as Graphviz DOT (convenience function)"""
    if not entity_store or not graph_queries:
        raise ValueError("entity_store and graph_queries are required")

    visualizer = GraphVisualizer(entity_store, graph_queries)
    return await visualizer.export_graphviz(player_id, focus_id, radius)


async def generate_interactive_graph(
    player_id: Optional[str] = None,
    center_id: Optional[str] = None,
    depth: int = 2,
    entity_store: "EntityStore" = None,
    graph_queries: KnowledgeGraphQueries = None
) -> GraphData:
    """Generate interactive graph data (convenience function)"""
    if not entity_store or not graph_queries:
        raise ValueError("entity_store and graph_queries are required")

    visualizer = GraphVisualizer(entity_store, graph_queries)
    return await visualizer.generate_interactive_graph(
        player_id, center_id, depth
    )
