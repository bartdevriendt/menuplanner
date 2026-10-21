import test from 'node:test';
import assert from 'node:assert/strict';
import {updateShopping} from '../server/shopping.js';
const empty=()=>({shops:[],products:[],defaultShopId:null});
const plan={'2026-10-21':{ingredients:{butcher:['Kip','Rijst'],supermarket:[' rijst ','Melk']}},'2026-11-04':{ingredients:{supermarket:['Buiten periode']}}};
test('first shop becomes default; user can choose another default',()=>{
  let state=updateShopping(empty(),{type:'createShop',name:' Colruyt '});
  assert.equal(state.defaultShopId,state.shops[0].id);
  state=updateShopping(state,{type:'createShop',name:'Slager'});
  assert.equal(state.defaultShopId,state.shops[0].id);
  state=updateShopping(state,{type:'defaultShop',shopId:state.shops[1].id});
  assert.equal(state.defaultShopId,state.shops[1].id);
  assert.throws(()=>updateShopping(state,{type:'createShop',name:' colruyt '}));
});
test('import requires a store and merges ingredients across categories within fourteen days',()=>{
  assert.throws(()=>updateShopping(empty(),{type:'importPlan',start:'2026-10-21'},plan),/Maak eerst een winkel/);
  let state=updateShopping(empty(),{type:'createShop',name:'Markt'});
  state=updateShopping(state,{type:'importPlan',start:'2026-10-21'},plan);
  assert.deepEqual(state.products.map(p=>p.name),['Kip','Rijst','Melk']);
  assert.ok(state.products.every(p=>p.shopId===state.defaultShopId&&!p.inCart));
});
test('moving and checking survive import; import resets matching products only',()=>{
  let state=updateShopping(empty(),{type:'createShop',name:'Markt'});
  state=updateShopping(state,{type:'createShop',name:'Slager'});
  state=updateShopping(state,{type:'importPlan',start:'2026-10-21'},plan);
  const kip=state.products.find(p=>p.name==='Kip');
  state=updateShopping(state,{type:'moveProduct',productId:kip.id,shopId:state.shops[1].id});
  state=updateShopping(state,{type:'checkProduct',productId:kip.id,inCart:true});
  state=updateShopping(state,{type:'addProduct',shopId:state.defaultShopId,name:'Zeep'});
  const soap=state.products.at(-1);
  state=updateShopping(state,{type:'checkProduct',productId:soap.id,inCart:true});
  const before=structuredClone(state);
  state=updateShopping(state,{type:'importPlan',start:'2026-10-21'},plan);
  assert.equal(state.products.length,4);
  assert.equal(state.products.find(p=>p.id===kip.id).shopId,state.shops[1].id);
  assert.equal(state.products.find(p=>p.id===kip.id).inCart,false);
  assert.equal(state.products.find(p=>p.id===soap.id).inCart,true);
  assert.equal(before.products.find(p=>p.id===kip.id).inCart,true);
});
test('manual duplicate product moves and resets it; invalid updates are rejected',()=>{
  let state=updateShopping(empty(),{type:'createShop',name:'Markt'});
  state=updateShopping(state,{type:'addProduct',shopId:state.defaultShopId,name:' Melk '});
  state=updateShopping(state,{type:'checkProduct',productId:state.products[0].id,inCart:true});
  state=updateShopping(state,{type:'addProduct',shopId:state.defaultShopId,name:'melk'});
  assert.equal(state.products.length,1);assert.equal(state.products[0].inCart,false);
  for(const action of [{type:'defaultShop',shopId:'missing'},{type:'moveProduct',productId:state.products[0].id,shopId:'missing'},{type:'checkProduct',productId:state.products[0].id,inCart:'true'},{type:'importPlan',start:'2026-02-30'},{type:'addProduct',shopId:state.defaultShopId,name:''}])assert.throws(()=>updateShopping(state,action));
});
