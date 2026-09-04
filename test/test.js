const { claim, drill, stateHash, paperCount, DEFAULT_BASE } = require('../index.js');

async function run() {
  console.log('canon-claim self-test');
  console.log('  base:', DEFAULT_BASE);

  // Live API hit: trust ladder -> F168
  const r1 = await claim('trust ladder');
  console.log('  claim("trust ladder") ->', r1.winner ? `F${r1.winner.f_number} (${r1.winner.title.slice(0,40)}...)` : 'none');
  if (!r1.winner || r1.winner.f_number !== 168) throw new Error('expected F168 winner');

  const r2 = await drill('Mudra vessel bridge');
  console.log('  drill("Mudra vessel bridge") ->');
  for (const k of ['doctrine', 'implementation', 'verification']) {
    const c = r2.curriculum[k];
    if (c) console.log(`    ${k}: F${c.f_number} ${c.title.slice(0,40)}...`);
  }

  const h = await stateHash();
  console.log('  state hash:', h.hash || JSON.stringify(h).slice(0,30));

  console.log('  ✓ all checks passed');
}

run().catch(err => {
  console.error('  ✗ test failed:', err.message);
  process.exit(1);
});
