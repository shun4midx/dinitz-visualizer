/********************************************
 * Copyright (c) 2025 Shun/翔海 (@shun4midx) *
 * Project: Dinitz-Visualizer               *
 * File Type: JS file                       *
 * File: render.js                          *
 ****************************************** */

// ======== Graph Drawing Stuff ======== //
// Import
import {
  nodes,
  edges,
  selectedNode,
  showNodeIds,
  sourceNode,
  sinkNode,
  addEdge
} from "./state.js";

import {
  StepType
} from "./dinitz.js";

export const svg = document.getElementById("canvas");

// Arrowhead definition (for directed edges)
export const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

export const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
marker.setAttribute("id", "arrow");
marker.setAttribute("markerWidth", "12");
marker.setAttribute("markerHeight", "12");
marker.setAttribute("viewBox", "0 0 12 12");
marker.setAttribute("refX", "8");
marker.setAttribute("refY", "6");
marker.setAttribute("orient", "auto");

export const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
path.setAttribute("d", "M0,2 L0,10 L10,6 z");
path.setAttribute("fill", "context-stroke");
path.setAttribute("stroke", "context-stroke");
path.setAttribute("stroke-width", "0");

marker.appendChild(path);
defs.appendChild(marker);
svg.appendChild(defs);

// Create separate groups for edges and nodes
export const edgeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
export const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
edgeGroup.setAttribute("id", "edges");
nodeGroup.setAttribute("id", "nodes");
svg.appendChild(edgeGroup); // edges first (bottom layer)
svg.appendChild(nodeGroup); // nodes second (top layer)

// Styling and visuals
export function styleNodeRole(node) {
  // base (unselected) style
  node.circleEl.setAttribute("stroke", "#00B0FF");
  node.circleEl.setAttribute("stroke-width", "2.5");
  node.labelEl.setAttribute("fill", "#66BFFF");

  // role overlays (source/sink)
  if (node === sourceNode) {
    node.circleEl.setAttribute("stroke", "#00FF88");     // green
    node.circleEl.setAttribute("stroke-width", "4.5");
    node.labelEl.setAttribute("fill", "#00FF88");
  }
  if (node === sinkNode) {
    node.circleEl.setAttribute("stroke", "#FF4444");     // red
    node.circleEl.setAttribute("stroke-width", "4.5");
    node.labelEl.setAttribute("fill", "#FF4444");
  }
}

export function restyleAllNodes() {
  for (const n of nodes) styleNodeRole(n);
  if (selectedNode) selectNode(selectedNode); // selection wins visually
}

export function selectNode(node) {
  node.circleEl.setAttribute("stroke", "#FF00CC");
  node.circleEl.setAttribute("stroke-width", "4");
  node.labelEl.setAttribute("fill", "#FF66CC"); // pink label
}

export function deselectNode(node) {
  styleNodeRole(node);
}

export function applyNodeIdVisibility() {
  for (const n of nodes) {
    n.labelEl.style.display = showNodeIds ? "block" : "none";
  }
}

let nodeIdCounter = 0;

export function drawNode(x, y) {
  const id = nodeIdCounter++;

  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

  const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  c.setAttribute("cx", x);
  c.setAttribute("cy", y);
  c.setAttribute("r", Math.max(20, window.innerHeight * 0.015));
  c.setAttribute("fill", "#1C117C");
  c.setAttribute("stroke", "#00B0FF");
  c.setAttribute("stroke-width", "2.5");

  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("x", x);
  label.setAttribute("y", y + 1);
  label.setAttribute("fill", "#66BFFF");   // soft blue
  label.setAttribute("font-size", "calc(80% + 0.8vh)");
  label.setAttribute("font-weight", "400"); // normal weight
  label.setAttribute("font-family", "system-ui, sans-serif");
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("dominant-baseline", "middle");
  label.style.display = showNodeIds ? "block" : "none";
  label.textContent = "";

  g.appendChild(c);
  g.appendChild(label);
  nodeGroup.appendChild(g);

  const node = {
    id,
    x,
    y,
    el: g,
    circleEl: c,
    labelEl: label
  };

  g.__node = node;
  c.__node = node;
  label.__node = node;

  return node;
}

export function drawEdge(u, v) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  const r = 20; // node radius
  const x1 = u.x, y1 = u.y;
  const x2 = v.x, y2 = v.y;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);

  const ux = dx / len;
  const uy = dy / len;

  const px = -uy;
  const py = ux;

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const offset = 16;
  const lx = mx - px * offset;
  const ly = my - py * offset;

  line.setAttribute("x1", x1 + ux * r);
  line.setAttribute("y1", y1 + uy * r);
  line.setAttribute("x2", x2 - ux * r);
  line.setAttribute("y2", y2 - uy * r);

  line.setAttribute("stroke", "#FF00FF");
  line.setAttribute("stroke-width", "3.5");
  line.setAttribute("opacity", "1");
  line.setAttribute("marker-end", "url(#arrow)");

  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("x", lx);
  label.setAttribute("y", ly);
  label.setAttribute("fill", "#FFFFFF");
  label.setAttribute("font-size", Math.max(20, window.innerHeight * 0.015));
  label.setAttribute("font-weight", "500"); // bold weight
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("dominant-baseline", "middle");
  label.textContent = "1";
  
  edgeGroup.appendChild(line);
  edgeGroup.appendChild(label);

  const edge = {
    from: u,   // node object
    to: v,     // node object
    cap: 1,
    flow: 0,
    isUserEdge: true,
    isSimEdge: false,
    el: line,
    labelEl: label
  };

  edge.labelEl.textContent = edge.cap;
  line.__edge = edge;
  label.__edge = edge;

  addEdge(edge);
  
  return edge;
}

// ======== Dinitz Stuff ======== //
export function renderStep(step) {
  switch (step.type) {
    case StepType.H_EDGE:
      highlightEdge(step.edge, step.kind);
      break;

    case StepType.H_NODE:
      highlightNode(step.id, step.kind);
      break;

    case StepType.FLOW:
      updateEdgeFlow(step.edge, step.flow);
      break;

    case StepType.CLEAR:
      clearHighlights();
      break;

    case StepType.TEXT:
      logText(step.msg);
      break;
  }
}

function highlightEdge(edge, kind) {
  if (!edge?.el) return;

  let color = "#00FFFF"; // cyan default
  if (kind === "dfs") color = "#9C6BFF"; // purple
  if (kind === "bfs-rev") color = "#FFFFFF";

  edge.el.setAttribute("stroke", color);
  edge.labelEl.setAttribute("fill", color); // label
}

function highlightNode(id, kind) {
  const node = nodes[id];
  if (!node) return;

  const color = "#9C6BFF"; // active

  node.circleEl.setAttribute("stroke", color);
  node.circleEl.setAttribute("stroke-width", "4");
  node.labelEl.setAttribute("fill", color);
}

function updateEdgeFlow(edge, flow) {
  if (!edge) return;

  edge.flow = flow;
  edge.isSimEdge = true;
  edge.labelEl.textContent = `${edge.flow} / ${edge.cap}`;
}

export function clearHighlights() {
  for (const e of edges) {
    e.el.setAttribute("stroke", "#FF00FF");
    e.labelEl.setAttribute("fill", "#FFFFFF");
  }
  restyleAllNodes();
}

export function restoreEditView() {
  for (const e of edges) {
    // reset colors
    e.el.setAttribute("stroke", "#FF00FF");
    e.labelEl.setAttribute("fill", "#FFFFFF");

    // reset label semantics
    e.isSimEdge = false;
    e.flow = 0;
    e.labelEl.textContent = e.cap.toString();
  }

  restyleAllNodes();
}

function logText(msg) {
  console.log(msg);
}