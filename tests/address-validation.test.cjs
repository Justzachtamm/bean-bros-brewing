const {test}=require('node:test');const assert=require('node:assert/strict');
const {addressValidationResult}=require('../netlify/functions/lib/ups');
const destination={name:'Buyer',address:'350 Fifth Avenue',city:'New York',state:'NY',zip:'10118'};
const success={Response:{ResponseStatus:{Code:'1'}}};
test('UPS empty valid indicator counts as a verified address',()=>{assert.equal(addressValidationResult({XAVResponse:{...success,ValidAddressIndicator:''}},destination).verified,true)});
test('UPS ambiguous addresses require correction and return fillable suggestions',()=>{assert.throws(()=>addressValidationResult({XAVResponse:{...success,AmbiguousAddressIndicator:'',Candidate:[{AddressKeyFormat:{AddressLine:['350 5TH AVE','STE 10'],PoliticalDivision2:'NEW YORK',PoliticalDivision1:'NY',PostcodePrimaryLow:'10118',PostcodeExtendedLow:'0100'}}]}},destination),e=>e.status===422&&e.candidates[0].address2==='STE 10'&&e.candidates[0].zip==='10118-0100')});
test('missing match and service failure never count as verification',()=>{assert.throws(()=>addressValidationResult({XAVResponse:{...success,NoCandidatesIndicator:''}},destination),e=>e.status===422);assert.throws(()=>addressValidationResult({},destination),e=>e.status===503)});
