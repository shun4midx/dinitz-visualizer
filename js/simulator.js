/********************************************
 * Copyright (c) 2025 Shun/翔海 (@shun4midx) *
 * Project: Dinitz-Visualizer               *
 * File Type: JS file                       *
 * File: simulator.js                       *
 ****************************************** */

// Import
import {
  nodes,
  edges,
  sourceNode,
  sinkNode,
  isSimulating,
  setIsSimulating
} from "./state.js";

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

export function simulate() {
  if (isSimulating) return;
  if (!canSimulate()) return;

  setIsSimulating(true);
  setSimulationUI(true);

  console.log("Simulation starts here");

  // TEMP: fake end
  setTimeout(endSimulation, 500);
}

function endSimulation() {
  setIsSimulating(false);
  setSimulationUI(false);
}

function setSimulationUI(running) {
  document.querySelectorAll(".toolbar button").forEach(btn => {
    btn.disabled = running;
  });
}