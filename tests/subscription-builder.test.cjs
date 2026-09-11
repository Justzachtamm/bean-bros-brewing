const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('assets/storefront.js','utf8');
test('subscription chooser excludes unavailable coffee and keeps mushrooms out of recurring selection',()=>{
 const context={};vm.createContext(context);
 vm.runInContext(source.slice(source.indexOf('function subscriptionChoices('),source.indexOf('function showSubscriptionBuilder(')),context);
 const products=[{id:1,name:'House',active:true,stock:5},{id:2,name:'Dark',category:'coffee',active:true,stock:2},{id:3,name:'Sold out',category:'coffee',active:true,stock:0},{id:4,name:'Hidden',category:'coffee',active:false,stock:5},{id:5,name:'Reishi',category:'herbs',active:true,stock:2},{id:6,name:'Lion’s Mane',category:'herbs',active:true,stock:2},{id:7,name:'Chamomile',category:'tea',active:true,stock:3}];
 const result=context.subscriptionChoices(products);
 assert.deepEqual(Array.from(result.coffees,p=>p.id),[1,2]);assert.deepEqual(Array.from(result.mushrooms,p=>p.id),[5,6]);
});
