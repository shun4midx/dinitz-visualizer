/********************************************
 * Copyright (c) 2025 Shun/翔海 (@shun4midx) *
 * Project: Dinitz-Visualizer               *
 * File Type: JS file                       *
 * File: ui.js                              *
 ****************************************** */

// Import
import {
  nodes,
  edges,
  history,
  redoStack,
  sourceNode,
  sinkNode,
  showNodeIds,
  setSourceNode,
  setSinkNode,
  setSelectedNode,
  setIgnoreCanvasClickUntil,
  selectedNode,
  setShowNodeIds
} from "./state.js";

import {
  restyleAllNodes,
  applyNodeIdVisibility,
  edgeGroup, 
  nodeGroup,
  deselectNode
} from "./render.js";

import { 
  simulate 
} from "./simulator.js";

import {
  blockCanvasClicks
} from "./interaction.js";

// Button stuff
document.querySelectorAll("button").forEach(btn => {
  btn.addEventListener("mousedown", () => {
    btn.classList.add("is-pressed");
  });

  btn.addEventListener("mouseup", () => {
    btn.classList.remove("is-pressed");
  });

  btn.addEventListener("mouseleave", () => {
    btn.classList.remove("is-pressed");
  });
});  

// Source/sink setters
export const nodeMenu = document.getElementById("nodeMenu");
let menuNode = null;

export function showNodeMenu(node, x, y) {
  menuNode = node;
  nodeMenu.style.left = `${x}px`;
  nodeMenu.style.top = `${y}px`;
  nodeMenu.classList.remove("hidden");

  setIgnoreCanvasClickUntil(Date.now() + 300);
}

export function hideNodeMenu() {
  nodeMenu.classList.add("hidden");
  menuNode = null;
}

// Button handlers
document.getElementById("clearBtn").addEventListener("click", () => {
  if (nodes.length === 0 && edges.length === 0) return;

  history.push({
    type: "clear",
    snapshot: {
      nodes: [...nodes],
      edges: [...edges],
      source: sourceNode,
      sink: sinkNode
    }
  });
  redoStack.length = 0;

  // Clear SVG
  edgeGroup.innerHTML = "";
  nodeGroup.innerHTML = "";

  // Clear data
  nodes.length = 0;
  edges.length = 0;
  setSourceNode(null);
  setSinkNode(null);
  setSelectedNode(null);
});

document.getElementById("undoBtn").addEventListener("click", () => {
  const action = history.pop();
  if (!action) return;

  redoStack.push(action);

  if (action.type === "clear") {
    // Restore nodes
    for (const n of action.snapshot.nodes) {
      nodeGroup.appendChild(n.el);
      nodes.push(n);
    }
  
    // Restore edges
    for (const e of action.snapshot.edges) {
      edgeGroup.appendChild(e.el);
      edgeGroup.appendChild(e.labelEl);
      edges.push(e);
    }
  
    setSourceNode(action.snapshot.source);
    setSinkNode(action.snapshot.sink);
  
    syncAfterMutation();
    return;
  }  

  // Always clear selection cleanly
  if (selectedNode) {
    deselectNode(selectedNode);
    setSelectedNode(null);
  }

  if (action.type === "addEdge") {
    edgeGroup.removeChild(action.edge.el);
    edgeGroup.removeChild(action.edge.labelEl);
    edges.splice(edges.indexOf(action.edge), 1);
  }

  if (action.type === "addNode") {
    nodeGroup.removeChild(action.node.el);
    nodes.splice(nodes.indexOf(action.node), 1);
  }

  if (action.type === "addNodeWithEdge") {
    // edge
    edgeGroup.removeChild(action.edge.el);
    edgeGroup.removeChild(action.edge.labelEl);
    edges.splice(edges.indexOf(action.edge), 1);

    // node
    nodeGroup.removeChild(action.node.el);
    nodes.splice(nodes.indexOf(action.node), 1);
  }

  if (action.type === "setRoles") {
    setSourceNode(action.from.source);
    setSinkNode(action.from.sink);
    restyleAllNodes();
    return;
  }  

  if (action.type === "setUnweighted") {
    edges.forEach((e, i) => {
      e.cap = action.prevCaps[i];
      e.labelEl.textContent =
        Number.isInteger(e.cap) ? e.cap : e.cap.toString();
    });
    return;
  }

  if (action.type === "editCap") {
    action.edge.cap = action.prevCap;
    action.edge.labelEl.textContent = action.prevCap.toString();
    return;
  }  

  syncAfterMutation();
});

document.getElementById("redoBtn").addEventListener("click", () => {
  const action = redoStack.pop();
  if (!action) return;

  history.push(action);

  if (action.type === "clear") {
    edgeGroup.innerHTML = "";
    nodeGroup.innerHTML = "";
  
    nodes.length = 0;
    edges.length = 0;
    setSourceNode(null);
    setSinkNode(null);
  
    return;
  }  

  if (action.type === "addEdge") {
    edgeGroup.appendChild(action.edge.el);
    edgeGroup.appendChild(action.edge.labelEl);
    edges.push(action.edge);
    syncAfterMutation();
    return;
  }

  if (action.type === "addNode") {
    nodeGroup.appendChild(action.node.el);
    nodes.push(action.node);
    syncAfterMutation();
    return;
  }

  if (action.type === "addNodeWithEdge") {
    nodeGroup.appendChild(action.node.el);
    nodes.push(action.node);

    edgeGroup.appendChild(action.edge.el);
    edgeGroup.appendChild(action.edge.labelEl);
    edges.push(action.edge);

    syncAfterMutation();
    return;
  }

  if (action.type === "setRoles") {
    setSourceNode(action.to.source);
    setSinkNode(action.to.sink);
    restyleAllNodes();
    return;
  }

  if (action.type === "setUnweighted") {
    edges.forEach(e => {
      e.cap = 1;
      e.labelEl.textContent = "1";
    });
    return;
  }

  if (action.type === "editCap") {
    action.edge.cap = action.nextCap;
    action.edge.labelEl.textContent = action.nextCap.toString();
    return;
  }  
});

document.getElementById("setSourceBtn").onclick = () => {
  if (!menuNode) return;

  // Check no change
  if (menuNode === sourceNode) {
    hideNodeMenu();
    return;
  }

  history.push({
    type: "setRoles",
    from: { source: sourceNode, sink: sinkNode },
    to: { source: menuNode, sink: sinkNode === menuNode ? null : sinkNode }
  });
  redoStack.length = 0;
  
  setSourceNode(menuNode);

  if (sinkNode === sourceNode) setSinkNode(null);
  restyleAllNodes();
  hideNodeMenu();
};

document.getElementById("setSinkBtn").onclick = () => {
  if (!menuNode) return;

  // Check no change
  if (menuNode === sinkNode) {
    hideNodeMenu();
    return;
  }

  history.push({
    type: "setRoles",
    from: { source: sourceNode, sink: sinkNode },
    to: { source: sourceNode === menuNode ? null : sourceNode, sink: menuNode }
  });
  redoStack.length = 0;

  setSinkNode(menuNode);
  
  if (sourceNode === sinkNode) setSourceNode(null);
  restyleAllNodes();
  hideNodeMenu();
};

document.getElementById("clearRoleBtn").onclick = () => {
  if (!menuNode) return;

  // Check no change
  if (menuNode !== sourceNode && menuNode !== sinkNode) {
    hideNodeMenu();
    return;
  }

  history.push({
    type: "setRoles",
    from: { source: sourceNode, sink: sinkNode },
    to: {
      source: sourceNode === menuNode ? null : sourceNode,
      sink: sinkNode === menuNode ? null : sinkNode
    }
  });
  redoStack.length = 0;
  
  if (sourceNode === menuNode) setSourceNode(null);
  if (sinkNode === menuNode) setSinkNode(null);
  restyleAllNodes();
  hideNodeMenu();
};

document.getElementById("simulateBtn").addEventListener("click", () => {
  blockCanvasClicks();
  simulate();
});

document.getElementById("toggleIdsBtn").addEventListener("click", () => {
  blockCanvasClicks();
  toggleNodeIds();
});

document.getElementById("unweightedBtn").addEventListener("click", () => {
  blockCanvasClicks();
  setGraphUnweighted();
});

document.getElementById("autoSSBtn").addEventListener("click", () => {
  blockCanvasClicks();
  autoAssignSourceSink();
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  // Ignore if user is typing somewhere (future-proof)
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) {
    return;
  }

  if (e.key === "Escape") {
    if (!nodeMenu.classList.contains("hidden")) {
      e.preventDefault();
      hideNodeMenu();
    }
  }

  // ======== MODIFIER KEY SHORTCUTS ======== //
  const isMac = navigator.platform.toUpperCase().includes("MAC");
  const mod = isMac ? e.metaKey : e.ctrlKey;

  if (mod) {
    // Undo
    if (e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      document.getElementById("undoBtn").click();
    }

    // Redo
    if (
      (e.key === "z" && e.shiftKey) ||
      e.key === "y"
    ) {
      e.preventDefault();
      document.getElementById("redoBtn").click();
    }

    // Clear
    if (e.key === "Backspace") {
      e.preventDefault();
      document.getElementById("clearBtn").click();
    }
    
    return;
  }

  // ======== SINGLE KEY SHORTCUTS ======== //
  switch (e.key.toLowerCase()) {
    case "u": // Unweighted
      e.preventDefault();
      blockCanvasClicks();
      document.getElementById("unweightedBtn").click();
      break;

    case "a": // Auto source/sink
      e.preventDefault();
      blockCanvasClicks();
      document.getElementById("autoSSBtn").click();
      break;

    case "i": // Toggle node IDs
      e.preventDefault();
      blockCanvasClicks();
      document.getElementById("toggleIdsBtn").click();
      break;

    case " ": // Space = simulate
    case "enter":
      e.preventDefault();
      blockCanvasClicks();
      document.getElementById("simulateBtn").click();
      break;
  }
});

function updateToggleIdsButton() {
  const btn = document.getElementById("toggleIdsBtn");
  if (!btn) return;
  btn.textContent = showNodeIds ? "Hide Node IDs (I)" : "Show Node IDs (I)";
}

function toggleNodeIds() {
  setShowNodeIds(!showNodeIds);
  for (const n of nodes) {
    n.labelEl.style.display = showNodeIds ? "block" : "none";
  }

  applyNodeIdVisibility();
  updateToggleIdsButton();
}

export function syncAfterMutation() {
  // reset visual selection safely
  if (selectedNode && !nodes.includes(selectedNode)) {
    setSelectedNode(null);
  }

  // relabel visible nodes
  nodes.forEach((node, i) => {
    node.labelEl.textContent = i;
  });

  if (sourceNode && !nodes.includes(sourceNode)) setSourceNode(null);
  if (sinkNode && !nodes.includes(sinkNode)) setSinkNode(null);
  applyNodeIdVisibility();
  restyleAllNodes();
}

function setGraphUnweighted() {
  if (edges.length === 0) return;

  // Check if anything would actually change
  const userEdges = edges.filter(e => e.isUserEdge);
  if (userEdges.length === 0) return;

  const alreadyUnweighted = userEdges.every(e => e.cap === 1);
  if (alreadyUnweighted) return;

  history.push({
    type: "setUnweighted",
    prevCaps: edges.map(e => e.cap)
  });
  redoStack.length = 0;

  edges.forEach(e => {
    e.cap = 1;
    e.labelEl.textContent = "1";
  });
}

export function editEdgeCapacity(edge) {
  const input = prompt("Set edge capacity:", edge.cap);
  if (input === null) return;

  const value = Number(input);
  if (!Number.isFinite(value) || value < 0) {
    alert("Capacity must be a non-negative number.");
    return;
  }

  if (value === edge.cap) return; // No-op guard

  history.push({
    type: "editCap",
    edge,
    prevCap: edge.cap,
    nextCap: value
  });
  redoStack.length = 0;

  edge.cap = value;
  edge.labelEl.textContent = value.toString();
}

function autoAssignSourceSink() {
  if (nodes.length < 2) return;

  const prev = {
    source: sourceNode,
    sink: sinkNode
  };

  const sorted = [...nodes].sort((a, b) =>
    Number(a.labelEl.textContent) - Number(b.labelEl.textContent)
  );

  const next = {
    source: sorted[0],
    sink: sorted[sorted.length - 1]
  };

  const nextSource = sorted[0];
  const nextSink = sorted[sorted.length - 1];

  // No-op check
  if (sourceNode === nextSource && sinkNode === nextSink) {
    return;
  }

  history.push({
    type: "setRoles",
    from: prev,
    to: next
  });
  redoStack.length = 0;

  setSourceNode(next.source);
  setSinkNode(next.sink);
  restyleAllNodes();
}

export function isNodeMenuOpen() {
  return !nodeMenu.classList.contains("hidden");
}

// Call
updateToggleIdsButton();