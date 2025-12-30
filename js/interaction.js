/********************************************
 * Copyright (c) 2025 Shun/翔海 (@shun4midx) *
 * Project: Dinitz-Visualizer               *
 * File Type: JS file                       *
 * File: interaction.js                     *
 ****************************************** */

// Import
import {
  nodes,
  edges,
  addNode,
  history,
  redoStack,
  selectedNode,
  sourceNode,
  sinkNode,
  setSelectedNode,
  setSourceNode,
  setSinkNode,
  ignoreCanvasClickUntil,
  setIgnoreCanvasClickUntil,
  isSimulating
} from "./state.js";

import {
  svg,
  drawNode,
  drawEdge,
  selectNode,
  deselectNode,
  restyleAllNodes
} from "./render.js";

import {
  nodeMenu,
  showNodeMenu, 
  hideNodeMenu,
  isNodeMenuOpen,
  editEdgeCapacity, 
  syncAfterMutation 
} from "./ui.js";

export function blockCanvasClicks(ms = 120) {
  setIgnoreCanvasClickUntil(Date.now() + ms);
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

// SVG listeners
svg.addEventListener("click", (e) => {
  if (isSimulating) {
    return;
  }

  if (isNodeMenuOpen()) {
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
    
        setSourceNode(clickedNode);
        if (sinkNode === sourceNode) setSinkNode(null);
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
    
        setSinkNode(clickedNode);
        if (sourceNode === sinkNode) setSourceNode(null);
        restyleAllNodes();
      }
      return;
    }    

    if (!selectedNode) {
      // nothing selected -> select this node
      setSelectedNode(clickedNode);
      selectNode(clickedNode);
    
    } else if (clickedNode === selectedNode) {
      // clicking the same node -> deselect
      deselectNode(selectedNode);
      setSelectedNode(null);
    } else {
      // different node -> draw edge
      const edge = drawEdge(selectedNode, clickedNode);

      history.push({ type: "addEdge", edge });
      redoStack.length = 0;
    
      deselectNode(selectedNode);
      setSelectedNode(null);
    } 
  } else {
    // clicked empty canvas
    const n = drawNode(p.x, p.y);
    addNode(n);
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
      setSelectedNode(null);
    } else {
      history.push({
        type: "addNode",
        node: n
      });
      redoStack.length = 0;
    }
  }
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