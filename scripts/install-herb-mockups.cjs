const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Installs only the 33 existing herb front images. No catalog, stock, or back-label changes.
// Default is validation only. Pass --install once the complete batch is approved.
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'output/mockups/approved');
const destination = path.join(root, 'collections/assets/herbs');
const signature = Buffer.from([137,80,78,71,13,10,26,10]);
const files = Array.from({length:33}, (_, i) => `herb-${String(i).padStart(2,'0')}-front.png`);
const prepared = files.map(file => {
  const bytes = fs.readFileSync(path.join(source,file));
  if(bytes.length < 24 || !bytes.subarray(0,8).equals(signature))throw Error(`Invalid PNG: ${file}`);
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if(width < 300 || height < 300)throw Error(`Image too small: ${file} (${width} × ${height})`);
  return {file,bytes,width,height,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
});
// Validate the entire set before replacing any website image.
const size = `${prepared[0].width}x${prepared[0].height}`;
if(prepared.some(p => `${p.width}x${p.height}` !== size))throw Error('Approved mockups do not all have the same dimensions.');
if(process.argv.includes('--install')) {
  fs.mkdirSync(destination,{recursive:true});
  for(const {file,bytes} of prepared)fs.writeFileSync(path.join(destination,file),bytes);
  for(const {file,sha256} of prepared)if(crypto.createHash('sha256').update(fs.readFileSync(path.join(destination,file))).digest('hex')!==sha256)throw Error(`Copy verification failed: ${file}`);
  fs.writeFileSync(path.join(source,'website-install-manifest.json'),JSON.stringify(prepared.map(({bytes,...entry})=>entry),null,2)+'\n');
  console.log(`Installed and verified ${prepared.length} herb fronts (${size}); back labels and originals preserved.`);
} else console.log(`Validated ${prepared.length} herb fronts (${size}). Run with --install to copy them into the website.`);
