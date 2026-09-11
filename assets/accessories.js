'use strict';
(async()=>{try{
 const response=await fetch('/.netlify/functions/accessories');if(!response.ok)return;
 const {items}=await response.json();if(!Array.isArray(items))return;
 const visible=items.filter(p=>p.active),escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const grid=document.querySelector('.mug-launch-grid');
 if(grid){const featured=visible.filter(p=>['travel-mug','speckled-mug'].includes(p.id));grid.closest('section').hidden=!featured.length;grid.innerHTML=featured.map(p=>`<figure><img src="${escape(p.images[0])}" alt="${escape(p.name)}" loading="lazy" width="1254" height="1254"><figcaption><strong>${escape(p.name)}</strong><span>${escape(p.subtitle)}</span><span>Coming soon${p.price==null?'':' · '+new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(p.price)}</span></figcaption></figure>`).join('')}
 if(window.BEAN_PRODUCTS){const list=window.BEAN_PRODUCTS;for(let n=list.length-1;n>=0;n--)if(list[n].category==='accessories')list.splice(n,1);list.unshift(...visible);render()}
}catch{}})();
