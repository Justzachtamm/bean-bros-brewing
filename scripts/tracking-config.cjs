'use strict';
exports.fromEnv = env => {
 const fields = {google:['GOOGLE_ANALYTICS_ID',/^G-[A-Z0-9]+$/],meta:['META_PIXEL_ID',/^\d{5,30}$/],tiktok:['TIKTOK_PIXEL_ID',/^[A-Z0-9]{10,40}$/]};
 return Object.fromEntries(Object.entries(fields).map(([key,[name,pattern]])=>{
  const value=(env[name]||'').trim();
  if(value&&!pattern.test(value))throw Error('Invalid public tracking identifier: '+name);
  return [key,value];
 }));
};
