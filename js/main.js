/********************************************
 * Copyright (c) 2025 Shun/翔海 (@shun4midx) *
 * Project: Dinitz-Visualizer               *
 * File Type: JS file                       *
 * File: main.js                            *
 ****************************************** */

const svg = document.getElementById("canvas");

// Arrowhead definition (for directed edges)
const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
marker.setAttribute("id", "arrow");
marker.setAttribute("markerWidth", "10");
marker.setAttribute("markerHeight", "10");
marker.setAttribute("refX", "8");
marker.setAttribute("refY", "3");
marker.setAttribute("orient", "auto");
marker.setAttribute("markerUnits", "strokeWidth");

const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
path.setAttribute("d", "M0,0 L0,6 L9,3 z");
path.setAttribute("fill", "#FF00FF"); // same as edge color

marker.appendChild(path);
defs.appendChild(marker);
svg.appendChild(defs);

// Create separate groups for edges and nodes
const edgeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
edgeGroup.setAttribute("id", "edges");
nodeGroup.setAttribute("id", "nodes");
svg.appendChild(edgeGroup); // edges first (bottom layer)
svg.appendChild(nodeGroup); // nodes second (top layer)

const nodes = [];
const edges = [];
const history = [];
const redoStack = [];
let selectedNode = null;

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

let ignoreCanvasClickUntil = 0;

function blockCanvasClicks(ms = 120) {
  ignoreCanvasClickUntil = Date.now() + ms;
}

// Functions
let showNodeIds = true;

let sourceNode = null;
let sinkNode = null;

let isSimulating = false;

function styleNodeRole(node) {
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

function restyleAllNodes() {
  for (const n of nodes) styleNodeRole(n);
  if (selectedNode) selectNode(selectedNode); // selection wins visually
}

function applyNodeIdVisibility() {
  for (const n of nodes) {
    n.labelEl.style.display = showNodeIds ? "block" : "none";
  }
}

function updateToggleIdsButton() {
  const btn = document.getElementById("toggleIdsBtn");
  if (!btn) return;
  btn.textContent = showNodeIds ? "Hide Node IDs" : "Show Node IDs";
}

function toggleNodeIds() {
  showNodeIds = !showNodeIds;
  for (const n of nodes) {
    n.labelEl.style.display = showNodeIds ? "block" : "none";
  }

  applyNodeIdVisibility();
  updateToggleIdsButton();
}

function selectNode(node) {
  node.circleEl.setAttribute("stroke", "#FF00CC");
  node.circleEl.setAttribute("stroke-width", "4");
  node.labelEl.setAttribute("fill", "#FF66CC"); // pink label
}

function deselectNode(node) {
  styleNodeRole(node);
}

function syncAfterMutation() {
  // reset visual selection safely
  if (selectedNode && !nodes.includes(selectedNode)) {
    selectedNode = null;
  }

  // relabel visible nodes
  nodes.forEach((node, i) => {
    node.labelEl.textContent = i;
  });

  if (sourceNode && !nodes.includes(sourceNode)) sourceNode = null;
  if (sinkNode && !nodes.includes(sinkNode)) sinkNode = null;
  applyNodeIdVisibility();
  restyleAllNodes();
}

function setGraphUnweighted() {
  if (edges.length === 0) return;

  // Check if anything would actually change
  const alreadyUnweighted = edges.every(e => e.cap === 1);
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

function getSVGPoint(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
  return {
    x: svgP.x,
    y: svgP.y
  };
}

let nodeIdCounter = 0;

function drawNode(x, y) {
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

function drawEdge(u, v) {
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
    el: line,
    labelEl: label
  };

  edge.labelEl.textContent = edge.cap;
  line.__edge = edge;
  label.__edge = edge;

  edges.push(edge);
  
  return edge;
}

function editEdgeCapacity(edge) {
  const input = prompt(
    "Set edge capacity:",
    edge.cap
  );

  if (input === null) return; // user canceled

  const value = Number(input);

  if (!Number.isFinite(value) || value < 0) {
    alert("Capacity must be a non-negative number.");
    return;
  }

  edge.cap = value;

  // Display nicely: integers as ints, decimals as-is
  edge.labelEl.textContent =
    Number.isInteger(value) ? value : value.toString();
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

  sourceNode = next.source;
  sinkNode = next.sink;
  restyleAllNodes();
}

svg.addEventListener("click", (e) => {
  if (!nodeMenu.classList.contains("hidden")) {
    hideNodeMenu();
    return;
  }

  if (nodeMenu.contains(e.target)) {
    return;
  }
  
  if (Date.now() < ignoreCanvasClickUntil && !e.target.__node && !e.target.__edge) {
    return;
  }

  const p = getSVGPoint(e);

  // Edge click
  if (e.target.__edge) {
    e.stopPropagation();
    editEdgeCapacity(e.target.__edge);
    return;
  }

  let clickedNode = null;

  // Check if the target has a __node property
  if (e.target.__node) {
    clickedNode = e.target.__node;
  } else {
    // Also check if we clicked inside a circle by checking all nodes
    for (let node of nodes) {
      const dx = p.x - node.x;
      const dy = p.y - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= 20) { // radius of circle
        clickedNode = node;
        break;
      }
    }
  }

  if (clickedNode) {
    e.stopPropagation();

    // Source
    if (e.shiftKey) {
      const prev = sourceNode;
      if (prev !== clickedNode) {
        history.push({
          type: "setRoles",
          from: {
            source: sourceNode,
            sink: sinkNode
          },
          to: {
            source: clickedNode,
            sink: sinkNode === clickedNode ? null : sinkNode
          }
        });
        
        redoStack.length = 0;
    
        sourceNode = clickedNode;
        if (sinkNode === sourceNode) sinkNode = null;
        restyleAllNodes();
      }
      return;
    }    

    // Sink
    if (e.altKey || e.metaKey) {
      const prev = sinkNode;
      if (prev !== clickedNode) {
        history.push({
          type: "setRoles",
          from: {
            source: sourceNode,
            sink: sinkNode
          },
          to: {
            source: sourceNode === clickedNode ? null : sourceNode,
            sink: clickedNode
          }
        });
        
        redoStack.length = 0;
    
        sinkNode = clickedNode;
        if (sourceNode === sinkNode) sourceNode = null;
        restyleAllNodes();
      }
      return;
    }    

    if (!selectedNode) {
      // nothing selected -> select this node
      selectedNode = clickedNode;
      selectNode(clickedNode);
    
    } else if (clickedNode === selectedNode) {
      // clicking the same node -> deselect
      deselectNode(selectedNode);
      selectedNode = null;
    
    } else {
      // different node -> draw edge
      const edge = drawEdge(selectedNode, clickedNode);

      history.push({ type: "addEdge", edge });
      redoStack.length = 0;
    
      deselectNode(selectedNode);
      selectedNode = null;
    } 
  } else {
    // clicked empty canvas
    const n = drawNode(p.x, p.y);
    nodes.push(n);
    syncAfterMutation();

    if (selectedNode) {
      // create edge from selected → new node
      const edge = drawEdge(selectedNode, n);
      history.push({
        type: "addNodeWithEdge",
        node: n,
        edge: edge
      });
      redoStack.length = 0;

      deselectNode(selectedNode);
      selectedNode = null;
    } else {
      history.push({
        type: "addNode",
        node: n
      });
      redoStack.length = 0;
    }
  }
});

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
  sourceNode = null;
  sinkNode = null;
  selectedNode = null;
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
  
    sourceNode = action.snapshot.source;
    sinkNode = action.snapshot.sink;
  
    syncAfterMutation();
    return;
  }  

  // Always clear selection cleanly
  if (selectedNode) {
    deselectNode(selectedNode);
    selectedNode = null;
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
    sourceNode = action.from.source;
    sinkNode = action.from.sink;
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
    sourceNode = null;
    sinkNode = null;
  
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
    sourceNode = action.to.source;
    sinkNode = action.to.sink;
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
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!nodeMenu.classList.contains("hidden")) {
      e.preventDefault();
      hideNodeMenu();
    }
  }

  // Control/command stuff
  const isMac = navigator.platform.toUpperCase().includes("MAC");
  const mod = isMac ? e.metaKey : e.ctrlKey;

  if (!mod) return;

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
});

updateToggleIdsButton();

// Better source/sink setters

const nodeMenu = document.getElementById("nodeMenu");
let menuNode = null;

function showNodeMenu(node, x, y) {
  menuNode = node;
  nodeMenu.style.left = `${x}px`;
  nodeMenu.style.top = `${y}px`;
  nodeMenu.classList.remove("hidden");

  ignoreCanvasClickUntil = Date.now() + 300;
}

function hideNodeMenu() {
  nodeMenu.classList.add("hidden");
  menuNode = null;
}

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
  
  sourceNode = menuNode;

  if (sinkNode === sourceNode) sinkNode = null;
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

  sinkNode = menuNode;
  
  if (sourceNode === sinkNode) sourceNode = null;
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
  
  if (sourceNode === menuNode) sourceNode = null;
  if (sinkNode === menuNode) sinkNode = null;
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

svg.addEventListener("contextmenu", e => {
  if (e.target.__node) {
    e.preventDefault();
    showNodeMenu(e.target.__node, e.clientX, e.clientY);
  }
});

let pressTimer = null;

svg.addEventListener("touchstart", e => {
  const target = e.target;
  if (!target.__node) return;

  pressTimer = setTimeout(() => {
    const touch = e.touches[0];
    showNodeMenu(target.__node, touch.clientX, touch.clientY);
  }, 500);
});

svg.addEventListener("touchend", () => {
  clearTimeout(pressTimer);
});

// Actual simulator
function canReachSink() {
  if (!sourceNode || !sinkNode) return false;

  const visited = new Set();
  const q = [sourceNode];
  visited.add(sourceNode);

  while (q.length) {
    const u = q.shift();
    if (u === sinkNode) return true;

    for (const e of edges) {
      if (e.from === u && !visited.has(e.to)) {
        visited.add(e.to);
        q.push(e.to);
      }
    }
  }
  return false;
}

function canSimulate() {
  if (!sourceNode || !sinkNode) {
    alert("Please set both a source and a sink.");
    return false;
  }
  if (sourceNode === sinkNode) {
    alert("Source and sink must be different.");
    return false;
  }
  if (!canReachSink()) {
    alert("No path exists from source to sink.");
    return false;
  }
  return true;
}

function simulate() {
  if (isSimulating) return;
  if (!canSimulate()) return;

  isSimulating = true;
  setSimulationUI(true);

  console.log("Simulation starts here");

  // TEMP: fake end
  setTimeout(endSimulation, 500);
}

function endSimulation() {
  isSimulating = false;
  setSimulationUI(false);
}

function setSimulationUI(running) {
  document.querySelectorAll(".toolbar button").forEach(btn => {
    btn.disabled = running;
  });
}