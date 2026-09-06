const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
// Explicit publish allowlist: backend code, credentials and reports never enter dist.
const staticFiles = ['accessibility.html','privacy.html','shipping-returns.html','terms.html',
  'robots.txt','sitemap.xml','site.webmanifest','_redirects','assets/legal/legal.css',
  'logo-512.png','logo-mark.svg','logo-white.png','icons.svg','og-image.png','apple-touch-icon.png',
  'favicon.ico','favicon.svg','favicon-48x48.png','favicon-96x96.png','favicon-144x144.png','favicon-192x192.png','favicon-512x512.png'];
fs.rmSync(out, {recursive:true,force:true});
fs.mkdirSync(out, {recursive:true});
function copy(source, target=source) {
  const dest = path.join(out, target);
  fs.mkdirSync(path.dirname(dest), {recursive:true});
  fs.copyFileSync(path.join(root, source),dest);
}
const pages = ['index.html','admin.html','account.html','operations.html'];
for(const page of pages) {
 let html = fs.readFileSync(path.join(root,page),'utf8');
 const assets = [...html.matchAll(/(?:src|href)="\/(assets\/[A-Za-z0-9_.-]+\.(?:js|css))"/g)].map(match=>match[1]);
 if(!assets.some(file=>file.endsWith('.js')))throw Error('No application bundle found: '+page);
 for(const asset of new Set(assets)) {
  const bytes = fs.readFileSync(path.join(root,asset));
  const digest = crypto.createHash('sha256').update(bytes).digest('hex').slice(0,16);
  const target = `assets/app-${digest}${path.extname(asset)}`;
  copy(asset,target);html=html.replaceAll('/'+asset,'/'+target);
 }
 fs.writeFileSync(path.join(out,page),html);
}
for(const dir of ['assets/brand','assets/products']) {
 for(const file of fs.readdirSync(path.join(root,dir))) {
  if(/^[A-Za-z0-9_.-]+\.(?:jpg|png|webp|svg)$/.test(file))copy(dir+'/'+file);
 }
}
for(const file of staticFiles)copy(file);
// Publish only the reviewed collection page and its required public images.
for(const file of ['index.html','style.css','app.js','catalog.js'])copy('collections/'+file);
for(const dir of ['assets','source/images'])fs.cpSync(path.join(root,'collections',dir),path.join(out,'collections',dir),{recursive:true});
console.log('Built customer and admin pages into dist; server files excluded.');
