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

import {
  dinitzSteps
} from "./dinitz.js";

// Dinitz sim
import {
  renderStep,
  clearHighlights,
  restoreEditView
} from "./render.js";

let simToken = 0;

function resetSimulationState() {
  clearHighlights();

  for (const e of edges) {
    e.flow = 0;
    e.labelEl.textContent = `${e.flow} / ${e.cap}`;
  }

  // clear mf result
  const mfEl = document.getElementById("maxflowDisplay");
  if (mfEl) mfEl.textContent = ""; 
}

function computeMaxflowFromSource() {
  let total = 0;
  for (const e of edges) {
    if (e.from === sourceNode) total += e.flow;
  }
  return total;
}

function endSimulation() {
  setIsSimulating(false);
  setSimulationUI(false);

  const maxflow = computeMaxflowFromSource();

  const mfEl = document.getElementById("maxflowDisplay");
  if (mfEl) mfEl.textContent = `(Here, max flow = ${maxflow})`;

  document.getElementById("exitSimBtn").disabled = false;
}

export function exitSimulation() {
  stopSimulation();
  setIsSimulating(false);
  setSimulationUI(false);

  restoreEditView();

  const mfEl = document.getElementById("maxflowDisplay");
  if (mfEl) mfEl.textContent = ""; // clear result

  document.getElementById("exitSimBtn").disabled = true;
}

let running = false;

export async function runDinitz(gen, delay = 400) {
  running = true;

  for (const step of gen) {
    if (!running) break;

    renderStep(step);
    await sleep(delay);
  }

  running = false;
}

export function stopSimulation() {
  running = false;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

  resetSimulationState();

  setIsSimulating(true);
  setSimulationUI(true);

  const s = nodes.indexOf(sourceNode);
  const t = nodes.indexOf(sinkNode);

  if (s < 0 || t < 0) {
    alert("Internal error: source/sink index not found.");
    endSimulation();
    return;
  }

  const gen = dinitzSteps({ nodes, edges }, s, t);

  runDinitz(gen, 300).then(endSimulation);
}

function setSimulationUI(running) {
  document.querySelectorAll(".toolbar button").forEach(btn => {
    btn.disabled = running;
  });
}