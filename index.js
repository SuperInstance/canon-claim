// index.js — canon-claim: a thin client for the Live Canon CLAIM + DRILL endpoints
//
// Usage:
//   const { claim, drill } = require('@superinstance/canon-claim');
//   const r = await claim('trust ladder');
//   console.log(r.winner.f_number, r.winner.title);

const DEFAULT_BASE = 'https://live-canon.superinstance.dev';

async function canonFetch(base, path, params) {
  const url = new URL(path, base || DEFAULT_BASE);
  for (const [k, v] of Object.entries(params || {})) {
    if (v != null) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`canon HTTP ${res.status}: ${res.statusText} (${url.toString()})`);
  }
  return res.json();
}

async function claim(query, options = {}) {
  if (!query || typeof query !== 'string') {
    throw new TypeError('claim(query) requires a non-empty string');
  }
  return canonFetch(options.base, '/api/canon/claim', { topic: query });
}

async function drill(query, options = {}) {
  if (!query || typeof query !== 'string') {
    throw new TypeError('drill(query) requires a non-empty string');
  }
  return canonFetch(options.base, '/api/canon/drill', { topic: query });
}

async function stateHash(options = {}) {
  return canonFetch(options.base, '/api/canon/hash', {});
}

async function paperCount(options = {}) {
  const data = await canonFetch(options.base, '/api/canon', {});
  // The live service changed the SHAPE of /api/canon: it used to return a
  // MAP of papers keyed by id, and it now returns a LIST under a
  // `papers` key. `Object.keys(data).length` on the new shape counts
  // the TOP-LEVEL keys -- 2 -- and not the papers, so this function
  // reported 2 while 71 papers were sitting there in `data.papers`.
  //
  // Counting the papers is the whole point of the function, so it has
  // to count PAPERS.
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data && data.papers)) return data.papers.length;
  return Object.keys(data || {}).length;
}

module.exports = { claim, drill, stateHash, paperCount, DEFAULT_BASE };
