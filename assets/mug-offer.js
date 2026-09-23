'use strict';
(function(root){
 const productId=910002;
 function eligible(item){return Number(item.productId)===productId&&!item.isSubscription&&item.price>=5;}
 function apply(items){
  let discounted=2*Math.floor(items.filter(eligible).reduce((n,i)=>n+i.quantity,0)/2);
  return items.flatMap(item=>{
   if(!eligible(item)||!discounted)return [{...item}];
   const quantity=Math.min(item.quantity,discounted);discounted-=quantity;
   const lines=[{...item,quantity,price:(Math.round(item.price*100)-500)/100,mugOffer:true}];
   if(quantity<item.quantity)lines.push({...item,quantity:item.quantity-quantity});
   return lines;
  });
 }
 const offer={productId,apply};
 if(typeof module==='object'&&module.exports)module.exports=offer;
 else root.BeanBrosMugOffer=offer;
})(typeof window==='undefined'?globalThis:window);
