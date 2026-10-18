// Offline: the client's own behaviour, with no network.
//
// The paper count is the part that had a real defect, and the URL
// construction is the part that decides whether a call reaches the
// right endpoint.  Neither needs the service to be up.

const assert = require('assert');
const { claim, drill, stateHash, paperCount, CanonEndpointMissingError } = require('../index.js');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  ok   ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + ': ' + e.message); }
}

function stubFetch(payload, status = 200) {
  const original = global.fetch;
  const seen = [];
  global.fetch = async (url) => {
    seen.push(url);
    return { ok: status >= 200 && status < 300, status, statusText: 'X',
             json: async () => payload };
  };
  return { seen, restore: () => { global.fetch = original; } };
}

(async () => {
  console.log('canon-claim offline tests');

  // The count must count PAPERS, whatever shape the service returns.
  for (const [label, payload] of [
    ['list', { papers: [{ id: 'a', number: 1 }, { id: 'b', number: 2 }], count: 2 }],
    ['map', { 'a': { id: 'a', number: 1 }, 'b': { id: 'b', number: 2 } }],
  ]) {
    const s = stubFetch(payload);
    let n;
    try { n = await paperCount(); } finally { s.restore(); }
    check(`the ${label} shape counts 2 papers, not 2 keys`, () => {
      assert.strictEqual(n, 2);
    });
  }

  // The endpoint a call targets is the endpoint it must reach.
  const cases = [
    [() => claim('trust ladder'), '/api/canon/claim', 'topic=trust+ladder'],
    [() => drill('mudra'), '/api/canon/drill', 'topic=mudra'],
  ];
  for (const [fn, path, param] of cases) {
    const s = stubFetch({});
    try { await fn(); } catch (e) { /* the stub 404s nothing; we only want the URL */ }
    finally { s.restore(); }
    check(`${path} is requested with ${param}`, () => {
      assert.ok(s.seen[0].includes(path), `went to ${s.seen[0]}`);
      assert.ok(s.seen[0].includes(param), `missing ${param} in ${s.seen[0]}`);
    });
  }

  // A 404 on an undeployed endpoint must say so, not "HTTP 404".
  const s = stubFetch({ error: 'not found' }, 404);
  let err = null;
  try { await claim('trust ladder'); } catch (e) { err = e; }
  finally { s.restore(); }
  check('a 404 on /api/canon/claim raises CanonEndpointMissingError', () => {
    assert.ok(err, 'no error was raised');
    assert.strictEqual(err.name, 'CanonEndpointMissingError');
    assert.ok(err.message.includes('/api/canon/claim'));
    assert.ok(err.message.includes('has never existed'),
      'the message does not say the endpoint was never deployed');
  });

  // A 404 on a DEPLOYED endpoint is a different thing and must stay a
  // plain HTTP error -- do not swallow it into the missing-endpoint
  // message.
  const s2 = stubFetch({ error: 'not found' }, 404);
  let err2 = null;
  try { await stateHash(); } catch (e) { err2 = e; }
  finally { s2.restore(); }
  check('a 404 on a deployed endpoint is still a plain HTTP error', () => {
    assert.ok(err2, 'no error was raised');
    assert.ok(!(err2 instanceof CanonEndpointMissingError),
      'a deployed endpoint was misreported as missing');
  });

  console.log(failures ? `  ${failures} checks FAILED` : '  all checks passed');
  process.exit(failures ? 1 : 0);
})();
