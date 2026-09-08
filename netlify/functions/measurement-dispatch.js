const conversions=require('./lib/conversions');
exports.handler=async()=>{try{return {statusCode:200,body:JSON.stringify(await conversions.flush())}}catch{console.error('Measurement dispatch requires attention');return {statusCode:500,body:'Measurement dispatch requires attention'}}};
