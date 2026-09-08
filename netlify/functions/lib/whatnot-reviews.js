'use strict';
// Selected excerpts checked on the public, owner-confirmed @beanbros profile.
// Source ratings describe the Whatnot purchase experience, not a website order.
// Do not turn these into verified website purchases or aggregate-rating markup.
const sourceUrl = 'https://www.whatnot.com/user/beanbros/reviews';
const reviews = [
  {id:'whatnot-dolo40115-20260818', productIds:[6,8], display_name:'dolo40115', date:'2026-08-18', body:'Tried the Brazil and the Mexican Chiapas so far and loved it.', context:'About Brazil coffee and Mexican Chiapas.'},
  {id:'whatnot-retrogirl-20260904', productIds:[900016], display_name:'_retrogirl_', date:'2026-09-04', body:'awesome chamomile!!', context:'About chamomile, sold here as Pharaoh’s Rest.'},
  {id:'whatnot-elnortenosnacks-20260904', productIds:[900029], display_name:'elnortenosnacks', date:'2026-09-04', body:'Our drinks came out perfect.', context:'The reviewer used butterfly pea flower, sold here as Blue Magic, in Thai Anchan Limeade.'}
];
const forProduct = id => reviews.filter(r=>r.productIds.includes(id)).map(({productIds,...r})=>({...r,source:'Whatnot',sourceUrl}));
const esc = v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(id) {
  const selected=forProduct(id);
  if(!selected.length)return '';
  return '<section class="whatnot-reviews" aria-label="Whatnot review excerpts"><h2>From our Whatnot customers</h2><p>Selected excerpts from reviews on our Whatnot shop.</p>'+selected.map(r=>`<article><p>${esc(r.context)}</p><blockquote>“${esc(r.body)}”</blockquote><p><strong>${esc(r.display_name)}</strong> · <time datetime="${r.date}">${r.date}</time></p><a href="${sourceUrl}" target="_blank" rel="noopener noreferrer">Read reviews on Whatnot ↗</a></article>`).join('')+'</section>';
}
module.exports={forProduct,render};
