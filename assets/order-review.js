(async()=>{
const params=new URLSearchParams(location.hash.slice(1));
const token=params.get('token');
// Keep the token in memory only, with no analytics or third-party scripts here.
history.replaceState(null,'',location.pathname);
const status=document.getElementById('status'),container=document.getElementById('products');
async function call(action,body={}){const r=await fetch('/.netlify/functions/shopify-order-reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,token,...body}),cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error||'Please try again later.');return data;}
if(!token){status.textContent='Open the private review link in your Bean Bros email to review your order.';return;}
try{const order=await call('view');status.textContent='Your order '+order.orderName;
for(const item of order.items){const card=document.createElement('section');card.className='card';if(item.image){const image=document.createElement('img');image.src=item.image;image.alt=item.name;card.append(image);}const title=document.createElement('h2');title.textContent=item.name;card.append(title);container.append(card);
if(item.reviewed){const p=document.createElement('p');p.textContent='Thanks—you have already reviewed this product.';card.append(p);continue;}
const form=document.createElement('form'),fieldset=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent='Your rating';fieldset.append(legend);const stars=document.createElement('div');stars.className='stars';
for(let r=1;r<=5;r++){const label=document.createElement('label'),radio=document.createElement('input');radio.type='radio';radio.name='rating';radio.value=String(r);radio.required=true;radio.checked=params.get('product')===item.productId&&params.get('rating')===String(r);label.append(radio,document.createTextNode(r+' ★'));stars.append(label);}fieldset.append(stars);
const label=document.createElement('label'),textarea=document.createElement('textarea');textarea.name='body';textarea.required=true;textarea.maxLength=3000;label.append(document.createTextNode('Tell us what you thought'),textarea);
const button=document.createElement('button');button.type='submit';button.textContent='Submit your review';const feedback=document.createElement('p');feedback.setAttribute('role','status');form.append(fieldset,label,button,feedback);card.append(form);
form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;feedback.textContent='Submitting…';try{const data=await call('submit',{productId:item.productId,rating:Number(new FormData(form).get('rating')),body:textarea.value});feedback.textContent=data.message;for(const control of form.elements)control.disabled=true;}catch(e){feedback.textContent=e.message;button.disabled=false;}});
if(params.get('product')===item.productId)card.scrollIntoView({block:'start'});
}
}catch(e){status.textContent=e.message;}
})();
