"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import noverlap from "graphology-layout-noverlap";
import { NodeData } from "@/lib/types";
import { getCategoryColor, computeNodeSize, FORCE_ATLAS_SETTINGS } from "@/lib/graphConfig";

type Props = {
  nodes: NodeData[];
  onNodeClick: (node: NodeData) => void;
  searchQuery: string;
  activeCategory: string;
};

export default function NetworkGraph({ nodes, onNodeClick, searchQuery, activeCategory }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const nodeDataMap = useRef<Map<string, NodeData>>(new Map());

  const buildGraph = useCallback(() => {
    const graph = new Graph();

    // Build a map for quick lookup
    const map = new Map<string, NodeData>();
    nodes.forEach((n) => map.set(n.id, n));
    nodeDataMap.current = map;

    // Add nodes with random initial positions
    nodes.forEach((node) => {
      graph.addNode(node.id, {
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: computeNodeSize(node.xFollowers, node.youtubeSubscribers),
        color: getCategoryColor(node.category),
        label: node.host,
        type: "circle",
      });
    });

    // Add edges: connect nodes within the same subcategory (strong) and same category (weak)
    const subcategoryGroups = new Map<string, string[]>();
    const categoryGroups = new Map<string, string[]>();

    nodes.forEach((node) => {
      const subKey = `${node.category}::${node.subcategory}`;
      if (!subcategoryGroups.has(subKey)) subcategoryGroups.set(subKey, []);
      subcategoryGroups.get(subKey)!.push(node.id);

      if (!categoryGroups.has(node.category)) categoryGroups.set(node.category, []);
      categoryGroups.get(node.category)!.push(node.id);
    });

    // Strong edges within subcategory
    subcategoryGroups.forEach((ids) => {
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const edgeKey = `${ids[i]}--${ids[j]}`;
          if (!graph.hasEdge(edgeKey)) {
            graph.addEdgeWithKey(edgeKey, ids[i], ids[j], {
              weight: 1.0,
              color: "#ffffff10",
              size: 0.5,
            });
          }
        }
      }
    });

    // Weak edges within same category but different subcategory
    categoryGroups.forEach((ids, cat) => {
      // Only connect a few cross-subcategory links to avoid clutter
      const subGroups = Array.from(subcategoryGroups.entries())
        .filter(([key]) => key.startsWith(cat + "::"))
        .map(([, nodeIds]) => nodeIds);

      for (let g1 = 0; g1 < subGroups.length; g1++) {
        for (let g2 = g1 + 1; g2 < subGroups.length; g2++) {
          // Connect first node of each subgroup
          const a = subGroups[g1][0];
          const b = subGroups[g2][0];
          const edgeKey = `${a}--${b}`;
          if (a && b && !graph.hasEdge(edgeKey)) {
            graph.addEdgeWithKey(edgeKey, a, b, {
              weight: 0.3,
              color: "#ffffff08",
              size: 0.3,
            });
          }
        }
      }
    });

    // Run ForceAtlas2 layout
    forceAtlas2.assign(graph, FORCE_ATLAS_SETTINGS);

    // Run noverlap to prevent overlap
    noverlap.assign(graph, 100);

    return graph;
  }, [nodes]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous instance
    if (sigmaRef.current) {
      sigmaRef.current.kill();
      sigmaRef.current = null;
    }

    const graph = buildGraph();
    graphRef.current = graph;

    const sigma = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      defaultEdgeType: "line",
      labelFont: "Inter, system-ui, sans-serif",
      labelSize: 12,
      labelWeight: "600",
      labelColor: { color: "#e5e5e5" },
      defaultNodeColor: "#888",
      defaultEdgeColor: "#ffffff10",
      minCameraRatio: 0.2,
      maxCameraRatio: 5,
      nodeReducer: (node, data) => {
        const res = { ...data };

        // Search highlighting
        if (searchQuery) {
          const nd = nodeDataMap.current.get(node);
          if (nd) {
            const q = searchQuery.toLowerCase();
            const match =
              nd.host.toLowerCase().includes(q) ||
              nd.channel.toLowerCase().includes(q);
            if (!match) {
              res.color = "#333333";
              res.label = "";
              res.size = Math.max(2, (data.size || 4) * 0.5);
            }
          }
        }

        // Category filter
        if (activeCategory) {
          const nd = nodeDataMap.current.get(node);
          if (nd && nd.category !== activeCategory) {
            res.color = "#222222";
            res.label = "";
            res.size = Math.max(1.5, (data.size || 4) * 0.3);
          }
        }

        // Hover highlighting
        if (hoveredNode) {
          if (node === hoveredNode) {
            res.highlighted = true;
            res.size = (data.size || 4) * 1.3;
          } else if (!graph.areNeighbors(node, hoveredNode)) {
            res.color = "#333333";
            res.label = "";
          }
        }

        return res;
      },
      edgeReducer: (edge, data) => {
        const res = { ...data };
        if (hoveredNode) {
          const source = graph.source(edge);
          const target = graph.target(edge);
          if (source !== hoveredNode && target !== hoveredNode) {
            res.hidden = true;
          } else {
            res.color = "#ffffff30";
            res.size = 1;
          }
        }
        return res;
      },
    });

    // Click handler
    sigma.on("clickNode", ({ node }) => {
      const nd = nodeDataMap.current.get(node);
      if (nd) onNodeClick(nd);
    });

    // Hover handlers
    sigma.on("enterNode", ({ node }) => {
      setHoveredNode(node);
      containerRef.current!.style.cursor = "pointer";
    });

    sigma.on("leaveNode", () => {
      setHoveredNode(null);
      containerRef.current!.style.cursor = "default";
    });

    sigmaRef.current = sigma;

    return () => {
      sigma.kill();
    };
  }, [buildGraph, searchQuery, activeCategory, onNodeClick, hoveredNode]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-panel/90 backdrop-blur-md border border-border rounded-lg p-3 text-xs space-y-1.5">
        {(["Oil & Gas", "Commodities", "LNG & Gas", "Renewables & Clean", "Macro & Policy"] as const).map((cat) => (
          <div key={cat} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getCategoryColor(cat) }}
            />
            <span className="text-muted">{cat}</span>
          </div>
        ))}
      </div>
      {/* Instructions */}
      <div className="absolute top-4 right-4 text-xs text-muted/60">
        Click node for details &middot; Scroll to zoom &middot; Drag to pan
      </div>
    </div>
  );
}
