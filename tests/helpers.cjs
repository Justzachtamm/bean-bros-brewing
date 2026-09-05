const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function loader(overrides={}, env={}) {
  const cache=new Map();
  const environment={ACCOUNT_TOKEN_SECRET:'test-account-secret-only',STRIPE_SECRET_KEY:'test-stripe-only',STRIPE_WEBHOOK_SECRET:'test-webhook-only',ADMIN_TOKEN_SECRET:'test-admin-only',ADMIN_PASSWORD:'test-password-only',...env};
  function load(file) {
    const absolute=path.resolve(root,file);
    if(cache.has(absolute))return cache.get(absolute).exports;
    const module={exports:{}};cache.set(absolute,module);
    const req=name=>{
      if(Object.hasOwn(overrides,name))return overrides[name];
      if(name.startsWith('.')) {
        const target=path.resolve(path.dirname(absolute),name)+'.js';
        const relative=path.relative(root,target);
        if(Object.hasOwn(overrides,relative))return overrides[relative];
        if(relative==='netlify/functions/lib/db.js')return {one(){throw Error('Unexpected database call')},query(){throw Error('Unexpected database call')},connection(){throw Error('Unexpected database call')}};
        return load(relative);
      }
      if(name==='@netlify/blobs')return {connectLambda(){},getStore(){throw Error('Unexpected blob access')}};
      if(['crypto','https'].includes(name))return require(name);
      throw Error('Unexpected external dependency: '+name);
    };
    vm.runInNewContext('(function(require,module,exports){'+fs.readFileSync(absolute,'utf8')+'\n})',
      {Buffer,URL,console:{log(){},warn(){},error(){}},process:{env:environment},setTimeout,clearTimeout},{filename:absolute})(req,module,module.exports);
    return module.exports;
  }
  return load;
}
const event=(body={},extra={})=>({httpMethod:'POST',headers:{},body:JSON.stringify(body),...extra});
module.exports={loader,event,root};
