export const ALL_LIGHTS = 0xffff;
export const LIGHT_MASKS = Array.from({length: 16}, (_, i) => {
  const row = Math.floor(i / 4), col = i % 4;
  return [[row,col],[row-1,col],[row+1,col],[row,col-1],[row,col+1]]
    .filter(([r,c]) => r >= 0 && r < 4 && c >= 0 && c < 4)
    .reduce((mask,[r,c]) => mask | (1 << (r * 4 + c)), 0);
});
export const INITIAL_LIGHTS = [0,2,3,4,5,7,8].reduce((board,i) => board ^ LIGHT_MASKS[i], ALL_LIGHTS);
export const NODES = [[25,80],[75,80],[25,36],[75,36],[50,12],[8,57],[92,57]];
export const EDGES = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3],[2,4],[3,4],[2,5],[5,0],[3,6],[6,1]];
export const SIGNAL_LENGTHS = [3,4,5,6];
export const KEYS = [{symbol:'✦',name:'النجمة',value:4},{symbol:'☾',name:'القمر',value:7},{symbol:'☀',name:'الشمس',value:2}];

const bits = n => { let count = 0; for (; n; n &= n - 1) count++; return count; };
export function solveLights(board) {
  // Solve the toggle system over GF(2), then choose the shortest free-variable solution.
  const target = board ^ ALL_LIGHTS;
  const rows = Array.from({length:16}, (_,r) => LIGHT_MASKS.reduce((a,m,c) => a | (((m >> r) & 1) << c), ((target >> r) & 1) << 16));
  const pivots = [];
  let rank = 0;
  for (let col = 0; col < 16; col++) {
    const pivot = rows.findIndex((r,i) => i >= rank && (r & (1 << col)));
    if (pivot < 0) continue;
    [rows[pivot],rows[rank]] = [rows[rank],rows[pivot]];
    for (let r = 0; r < 16; r++) if (r !== rank && (rows[r] & (1 << col))) rows[r] ^= rows[rank];
    pivots.push(col); rank++;
  }
  if (rows.some(r => !(r & ALL_LIGHTS) && (r & (1 << 16)))) return null;
  const free = Array.from({length:16},(_,i) => i).filter(i => !pivots.includes(i));
  let best = null;
  for (let v = 0; v < (1 << free.length); v++) {
    let mask = free.reduce((m,col,i) => m | (((v >> i) & 1) << col),0);
    for (let r = 0; r < rank; r++) {
      const on = ((rows[r] >> 16) & 1) ^ (bits(rows[r] & mask & ALL_LIGHTS) % 2);
      if (on) mask |= 1 << pivots[r];
    }
    if (best === null || bits(mask) < bits(best)) best = mask;
  }
  return Array.from({length:16},(_,i) => i).filter(i => best & (1 << i));
}

export function edgeIndex(a,b) { return EDGES.findIndex(([x,y]) => (x === a && y === b) || (x === b && y === a)); }
export function traceEdges(path) {
  const used = [];
  if (!Array.isArray(path) || path.some(n => !Number.isInteger(n) || n < 0 || n >= NODES.length)) return null;
  for (let i = 1; i < path.length; i++) {
    const edge = edgeIndex(path[i-1],path[i]);
    if (edge < 0 || used.includes(edge)) return null;
    used.push(edge);
  }
  return used;
}
export function extendTrace(path,node) {
  const next = [...path,node];
  return traceEdges(next) === null ? null : next;
}
export function finishTrace(path = []) {
  const used = traceEdges(path);
  if (used === null) return null;
  if (!path.length) {
    for (const start of [2,3,0,1,4,5,6]) { const found = finishTrace([start]); if (found) return found; }
    return null;
  }
  const search = (route,mask) => {
    if (bits(mask) === EDGES.length) return route;
    const last = route.at(-1);
    for (let e = 0; e < EDGES.length; e++) {
      if (mask & (1 << e)) continue;
      const [a,b] = EDGES[e];
      if (a !== last && b !== last) continue;
      const found = search([...route,a === last ? b : a],mask | (1 << e));
      if (found) return found;
    }
    return null;
  };
  return search(path,used.reduce((mask,e) => mask | (1 << e),0));
}
export function normalizePin(value) {
  return String(value).trim().replace(/[٠-٩]/g,c => String(c.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,c => String(c.charCodeAt(0)-0x6f0));
}
export function checkPin(value) { return normalizePin(value) === '3672'; }

export function freshJourney(random = Math.random) {
  const sequence = [];
  for (let i = 0; i < 6; i++) {
    const choices = [0,1,2,3].filter(n => n !== sequence.at(-1));
    sequence.push(choices[Math.min(choices.length-1,Math.floor(random()*choices.length))]);
  }
  return {version:1,started:false,stage:0,solved:[false,false,false],complete:false,lights:INITIAL_LIGHTS,moves:0,signalRound:0,sequence,trace:[],hints:[0,0,0,0]};
}
export function restoreJourney(raw) {
  try {
    const s = JSON.parse(raw);
    if (s?.version !== 1 || typeof s.started !== 'boolean' || typeof s.complete !== 'boolean' ||
        !Number.isInteger(s.stage) || s.stage < 0 || s.stage > 3 ||
        !Array.isArray(s.solved) || s.solved.length !== 3 || s.solved.some(x => typeof x !== 'boolean') ||
        !Number.isInteger(s.lights) || s.lights < 0 || s.lights > ALL_LIGHTS || solveLights(s.lights) === null ||
        !Number.isInteger(s.moves) || s.moves < 0 ||
        !Number.isInteger(s.signalRound) || s.signalRound < 0 || s.signalRound > 4 ||
        !Array.isArray(s.sequence) || s.sequence.length !== 6 || s.sequence.some(n => !Number.isInteger(n) || n < 0 || n > 3) ||
        !Array.isArray(s.hints) || s.hints.length !== 4 || s.hints.some(n => !Number.isInteger(n) || n < 0 || n > 3) ||
        traceEdges(s.trace) === null) return freshJourney();
    const first = s.solved.indexOf(false);
    if (first !== -1 && (s.solved.slice(first).some(Boolean) || s.stage > first || s.complete)) return freshJourney();
    if ((s.solved[0] && s.lights !== ALL_LIGHTS) || (s.solved[1] && s.signalRound !== 4) || (s.solved[2] && s.trace.length !== EDGES.length+1)) return freshJourney();
    return {version:1,started:s.started,stage:s.stage,solved:s.solved,complete:s.complete,lights:s.lights,moves:s.moves,signalRound:s.signalRound,sequence:s.sequence,trace:s.trace,hints:s.hints};
  } catch { return freshJourney(); }
}
