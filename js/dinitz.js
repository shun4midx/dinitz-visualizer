/********************************************
 * Copyright (c) 2025 Shun/翔海 (@shun4midx) *
 * Project: Dinitz-Visualizer               *
 * File Type: JS file                       *
 * File: dinitz.js                          *
 ****************************************** */

export const StepType = Object.freeze({
  PHASE: "phase",
  LEVELS: "levels",
  H_EDGE: "highlightEdge",
  H_NODE: "highlightNode",
  FLOW: "flowUpdate",
  TEXT: "text",
  CLEAR: "clearHighlights",
});

/**
 * Internal residual edge
 * to: node index
 * rev: index of reverse edge inside adj[to]
 * cap: residual capacity (>= 0)
 * uiEdge: reference to the UI edge object (so simulator/render can update label)
 * dir: +1 if this residual edge corresponds to UI edge forward, -1 for reverse
 */
function addResidualEdge(adj, u, v, e) {
  const fwdCap = e.cap - e.flow;
  const revCap = e.flow;

  const fwd = { to: v, rev: null, cap: fwdCap, uiEdge: e, dir: +1 };
  const rev = { to: u, rev: null, cap: revCap, uiEdge: e, dir: -1 };

  fwd.rev = adj[v].length;
  rev.rev = adj[u].length;

  adj[u].push(fwd);
  adj[v].push(rev);
}

/**
 * Build residual graph from your current UI graph.
 * Node indexing: uses nodes array index (matches labels after syncAfterMutation()).
 */
export function buildResidual(userGraph) {
  const { nodes, edges } = userGraph;
  const n = nodes.length;
  const adj = Array.from({ length: n }, () => []);

  const idxOf = new Map();
  nodes.forEach((node, i) => idxOf.set(node, i));

  for (const e of edges) {
    const u = idxOf.get(e.from);
    const v = idxOf.get(e.to);
    if (u == null || v == null) continue;

    addResidualEdge(adj, u, v, e);
  }

  return adj;
}

function bfsLevels(adj, s, t, emit) {
  const n = adj.length;
  const level = new Array(n).fill(-1);
  const q = [];

  level[s] = 0;
  q.push(s);

  if (emit) emit({ type: StepType.H_NODE, id: s, kind: "start" });

  while (q.length) {
    const u = q.shift();
    if (emit) emit({ type: StepType.H_NODE, id: u, kind: "pop" });

    for (const e of adj[u]) {
      if (e.cap <= 0) continue;
      const v = e.to;

      if (emit && e.uiEdge) {
        // only highlight real UI edges (skip invisible reverse edges)
        const kind = e.dir > 0 ? "bfs" : "bfs-rev";
        emit({ type: StepType.H_EDGE, edge: e.uiEdge, kind });
      }

      if (level[v] === -1) {
        level[v] = level[u] + 1;
        q.push(v);
        if (emit) emit({ type: StepType.H_NODE, id: v, kind: "discover" });
      }
    }
  }

  return level;
}

function dfsPush(adj, level, it, u, t, f, emit) {
  if (u === t) return f;

  for (; it[u] < adj[u].length; it[u]++) {
    const e = adj[u][it[u]];
    if (e.cap <= 0) continue;

    const v = e.to;
    if (level[v] !== level[u] + 1) continue;

    if (emit && e.uiEdge) {
      emit({ type: StepType.H_EDGE, edge: e.uiEdge, kind: "dfs" });
    }

    const pushed = dfsPush(adj, level, it, v, t, Math.min(f, e.cap), emit);
    if (pushed <= 0) continue;

    // Update residual
    e.cap -= pushed;
    const rev = adj[v][e.rev];
    rev.cap += pushed;

    // Update UI edge flow (dir tells whether we add or subtract)
    if (e.uiEdge) {
      e.uiEdge.flow += pushed * e.dir;

      if (emit) {
        emit({
          type: StepType.FLOW,
          edge: e.uiEdge,
          df: pushed,
          // Provide what render probably wants:
          flow: e.uiEdge.flow,
          cap: e.uiEdge.cap,
        });
      }
    }

    return pushed;
  }

  return 0;
}

/**
 * Generator that yields steps.
 * userGraph = { nodes, edges } (state arrays)
 * s, t are node indices (match labels / nodes array index)
 */
export function* dinitzSteps(userGraph, s, t) {
  let flow = 0;
  let iter = 0;

  while (true) {
    const adj = buildResidual(userGraph);

    iter++;
    yield { type: StepType.PHASE, name: "BFS", iter };

    const bfsSteps = [];
    const emitBfs = (st) => bfsSteps.push(st);

    const level = bfsLevels(adj, s, t, emitBfs);

    // play BFS micro-steps
    yield* bfsSteps;
    yield { type: StepType.LEVELS, level };

    if (level[t] < 0) {
      yield { type: StepType.TEXT, msg: `Done. maxflow = ${flow}` };
      return { maxflow: flow };
    }

    yield { type: StepType.PHASE, name: "DFS blocking flow", iter };

    const it = new Array(adj.length).fill(0);

    while (true) {
      const dfsSteps = [];
      const emitDfs = (st) => dfsSteps.push(st);

      const pushed = dfsPush(adj, level, it, s, t, Number.POSITIVE_INFINITY, emitDfs);

      // play DFS micro-steps (even if pushed=0, you may want the highlights; feel free to skip)
      yield* dfsSteps;

      if (pushed === 0) break;

      flow += pushed;
      yield { type: StepType.TEXT, msg: `Augment +${pushed}, total=${flow}` };
    }

    yield { type: StepType.CLEAR };
  }
}