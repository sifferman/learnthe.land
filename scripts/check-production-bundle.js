// Guards against shipping a production bundle that throws the moment it loads.
//
// Webpack compiling successfully says nothing about whether the bundle runs, so
// a misconfigured Babel environment once shipped a bundle that called `jsxDEV`
// — a helper React's production build deliberately does not export — leaving the
// deployed site blank with a green build.

const fs = require('fs');
const path = require('path');

const bundleDir = path.resolve(__dirname, '../dist/js');

// Markers that only ever appear when a development-only React runtime made it
// into a production build.
const forbidden = ['jsxDEV', 'jsx-dev-runtime'];

const bundles = fs.existsSync(bundleDir)
  ? fs.readdirSync(bundleDir).filter((name) => name.endsWith('.js'))
  : [];

if (bundles.length === 0) {
  console.error(`No bundle found in ${bundleDir}. Run the build first.`);
  process.exit(1);
}

const failures = [];
for (const name of bundles) {
  const contents = fs.readFileSync(path.join(bundleDir, name), 'utf8');
  for (const marker of forbidden) {
    if (contents.includes(marker)) {
      failures.push(`${name} references ${marker}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Production bundle contains development-only React runtime code:');
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  console.error(
    '\nThis bundle would throw on load and render a blank page. Check that ' +
      'BABEL_ENV/NODE_ENV is "production" for the build, so @babel/preset-react ' +
      'emits `jsx` rather than `jsxDEV`.',
  );
  process.exit(1);
}

console.log(`Checked ${bundles.length} bundle file(s): no development-only React runtime.`);
