const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, 'test-playground');

if (fs.existsSync(root)) {
  fs.rmSync(root, { recursive: true, force: true });
}
fs.mkdirSync(root);

// Create some dummy projects
const projects = ['proj-a', 'proj-b', 'proj-c/nested'];

projects.forEach(p => {
  const dir = path.join(root, p);
  fs.mkdirSync(dir, { recursive: true });

  const nm = path.join(dir, 'node_modules');
  fs.mkdirSync(nm);

  // Add some dummy files to give it size
  fs.writeFileSync(path.join(nm, 'package.json'), '{}');
  fs.writeFileSync(path.join(nm, 'readme.md'), '# Dummy'.repeat(100));

  // Nested package
  const subPkg = path.join(nm, 'lodash');
  fs.mkdirSync(subPkg);
  fs.writeFileSync(path.join(subPkg, 'index.js'), 'module.exports = {};');
});

console.log(`Created test playground at ${root}`);
console.log('You can select this directory in the app to test scanning and deletion.');
