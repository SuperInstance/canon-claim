// index.js — canon-claim: a thin client for the Live Canon API
//
// Usage:
//   const { claim, drill, stateHash, paperCount } = require('@superinstance/canon-claim');
//   const r = await claim('trust ladder');
//   console.log(r.winner.f_number, r.winner.title);
//
// WHAT WORKS AGAINST THE DEPLOYED SERVICE
//   /api/canon        -> the paper catalogue        (paperCount)
//   /api/canon/hash   -> the state hash             (stateHash)
//
// WHAT IS NOT DEPLOYED
//   /api/canon/claim  -> claim()   404
//   /api/canon/drill  -> drill()   404
//
// The deployed service (SuperInstance/quilt-live-canon, worker.js) has
// NO claim and NO drill route -- `grep -cE "claim|drill" worker.js` is
// 0.  It never had one.  The claim/drill API was designed against a
// service that was not built, and this client was published against
// that design.
//
// So claim() and drill() raise CanonEndpointMissingError, which names
// the situation, instead of a bare "HTTP 404".  If the service ever
// grows the routes, test/live.test.js goes red and says so.

const DEFAULT_BASE = 'https://live-canon.superinstance.dev';

// The endpoints this client was designed around that the deployed
// service does not have.  Naming them lets the error say something
// useful instead of "HTTP 404".
const UNDEPLOYED = {
  '/api/canon/claim': 'claim()',
  '/api/canon/drill': 'drill()',
};

class CanonEndpointMissingError extends Error {
  constructor(path, url) {
    super(
      `the Live Canon service does not deploy ${path}. ` +
      `${UNDEPLOYED[path] || 'This call'} targets an endpoint that has ` +
      `never existed in quilt-live-canon's worker.js. ` +
      `The service deploys /api/canon, /api/canon/hash, /api/canon/navigate, ` +
      `/api/canon/confluence, /api/canon/lineage, /api/canon/ghost, ` +
      `/api/canon/similar, /api/canon/random and /api/canon/tick. ` +
      `Requested: ${url}`
    );
    this.name = 'CanonEndpointMissingError';
    this.path = path;
    this.url = url;
  }
}

async function canonFetch(base, path, params) {
  const url = new URL(path, base || DEFAULT_BASE);
  for (const [k, v] of Object.entries(params || {})) {
    if (v != null) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString());
  if (res.status === 404 && UNDEPLOYED[path]) {
    throw new CanonEndpointMissingError(path, url.toString());
  }
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

module.exports = {
  claim, drill, stateHash, paperCount, DEFAULT_BASE,
  CanonEndpointMissingError,
};
