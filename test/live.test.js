// Live: the client against the deployed Live Canon service.
//
// This is a MONITOR, not a test of the client's correctness.  It
// records what the service actually deploys, and it goes RED if that
// changes -- because if the service grows /api/canon/claim or
// /api/canon/drill, then claim() and drill() should be wired up for
// real and this file should be rewritten to use them.
//
// The previous version of this file expected claim('trust ladder') to
// return F168 and drill('Mudra vessel bridge') to return a curriculum.
// Both of those endpoints are 404.  The test had never passed, and
// nothing ran it: the repository had no CI at all.

const { claim, drill, stateHash, paperCount, CanonEndpointMissingError } = require('../index.js');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  ok   ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + ': ' + e.message); }
}

(async () => {
  console.log('canon-claim live test (monitor)');

  // These two ARE deployed.
  const n = await paperCount();
  console.log('  papers in the canon:', n);
  check('the deployed service serves the paper catalogue', () => {
    if (n < 70) throw new Error('expected at least 70 papers, got ' + n);
  });

  const h = await stateHash();
  check('the deployed service serves the state hash', () => {
    if (!h || (!h.hash && !h.state_hash)) {
      throw new Error('the state hash response carried no hash: ' + JSON.stringify(h).slice(0, 120));
    }
  });

  // These two are NOT.  If this check fails, the service changed and
  // claim()/drill() should be wired up properly.
  for (const [name, fn] of [['claim', () => claim('trust ladder')], ['drill', () => drill('Mudra vessel bridge')]]) {
    let err = null;
    try { await fn(); } catch (e) { err = e; }
    check(`${name}() reports the endpoint as not deployed`, () => {
      if (!err) {
        throw new Error(
          `${name}() SUCCEEDED. The service now deploys that endpoint -- ` +
          `wire it up and rewrite this monitor.`
        );
      }
      if (!(err instanceof CanonEndpointMissingError)) {
        throw new Error('wrong error type: ' + err.name + ': ' + err.message);
      }
    });
  }

  console.log(failures ? `  ${failures} checks FAILED` : '  all checks passed');
  process.exit(failures ? 1 : 0);
})();
