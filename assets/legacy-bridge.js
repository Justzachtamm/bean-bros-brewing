'use strict';
// Retain account and fulfillment components; shopping stays in the new storefront.
function bridge(){
 const route=location.hash.replace(/^#\/?/,'').split('?')[0];
 if(!route){location.hash=location.pathname.startsWith('/operations')?'#admin':'#account';return}
 if(['home','shop','coffee'].includes(route)||location.hash==='#/')location.replace('/#coffee');
 else if(['cart','checkout'].includes(route))location.replace('/#/cart');
 else if(['login','signup','subscriptions','orders'].includes(route))location.hash='#account';
}
window.addEventListener('hashchange',bridge);bridge();
