/********************************************
 * Copyright (c) 2025 Shun/翔海 (@shun4midx) *
 * Project: Dinitz-Visualizer               *
 * File Type: JS file                       *
 * File: state.js                           *
 ****************************************** */

export const nodes = [];
export const edges = [];
export const history = [];
export const redoStack = [];

export let selectedNode = null;
export let showNodeIds = true;
export let sourceNode = null;
export let sinkNode = null;
export let isSimulating = false;

export let ignoreCanvasClickUntil = 0;

export function setSelectedNode(n) {
  selectedNode = n;
}

export function setSourceNode(n) {
  sourceNode = n;
}

export function setSinkNode(n) {
  sinkNode = n;
}

export function setShowNodeIds(v) {
  showNodeIds = v;
}

export function setIsSimulating(v) {
  isSimulating = v;
}

export function setIgnoreCanvasClickUntil(v) {
  ignoreCanvasClickUntil = v;
}

export function addNode(n) {
  nodes.push(n);
}

export function addEdge(e) {
  edges.push(e);
}

export function removeEdge(e) {
  edges.splice(edges.indexOf(e), 1);
}

export function removeNode(n) {
  nodes.splice(nodes.indexOf(n), 1);
}