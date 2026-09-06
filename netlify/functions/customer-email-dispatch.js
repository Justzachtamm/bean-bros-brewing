const care=require('./lib/customer-care');
exports.handler=async()=>{try{return {statusCode:200,body:JSON.stringify(await care.flush(3))}}catch(e){console.error('Email dispatch',e.name);return {statusCode:500,body:JSON.stringify({error:'Email dispatch needs attention'})}}};
