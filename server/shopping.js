import {randomUUID} from 'node:crypto';
import {ingredientNames, shoppingList} from '../src/ingredients.js';
import {validDate} from './domain.js';

const fail = message => {throw Object.assign(new Error(message), {status:400});};
const key = name => name.toLocaleLowerCase('nl');
function nameOf(value) {
  if(typeof value!=='string'||value.length>250||/[\r\n]/.test(value))fail('Geef een naam van maximaal 250 tekens.');
  const name=ingredientNames(value)[0];
  if(!name)fail('Geef een naam.');
  return name;
}
export function updateShopping(state, action, plan={}) {
  const next=structuredClone(state);
  const shop=next.shops.find(s=>s.id===action.shopId);
  if(action.type==='createShop') {
    const name=nameOf(action.name);
    if(next.shops.some(s=>key(s.name)===key(name)))fail('Deze winkel bestaat al.');
    const created={id:randomUUID(),name};
    next.shops.push(created);
    if(!next.defaultShopId)next.defaultShopId=created.id;
  } else if(action.type==='defaultShop') {
    if(!shop)fail('Kies een bestaande winkel.');
    next.defaultShopId=shop.id;
  } else if(action.type==='addProduct') {
    if(!shop)fail('Kies een bestaande winkel.');
    const name=nameOf(action.name);
    const existing=next.products.find(p=>key(p.name)===key(name));
    if(existing){existing.inCart=false;existing.shopId=shop.id;}
    else next.products.push({id:randomUUID(),name,shopId:shop.id,inCart:false});
  } else if(action.type==='moveProduct'||action.type==='checkProduct') {
    const product=next.products.find(p=>p.id===action.productId);
    if(!product)fail('Dit product bestaat niet meer.');
    if(action.type==='moveProduct') {
      if(!shop)fail('Kies een bestaande winkel.');
      product.shopId=shop.id;
    } else {
      if(typeof action.inCart!=='boolean')fail('Ongeldige winkelkarstatus.');
      product.inCart=action.inCart;
    }
  } else if(action.type==='importPlan') {
    if(!validDate(action.start))fail('Ongeldige startdatum.');
    if(!next.shops.some(s=>s.id===next.defaultShopId))fail('Maak eerst een winkel aan. Deze wordt je standaardwinkel.');
    const names=ingredientNames(Object.values(shoppingList(plan,action.start)).flat().map(p=>p.name).join('\n'));
    for(const name of names) {
      const existing=next.products.find(p=>key(p.name)===key(name));
      if(existing)existing.inCart=false;
      else next.products.push({id:randomUUID(),name,shopId:next.defaultShopId,inCart:false});
    }
  } else fail('Onbekende boodschappenwijziging.');
  return next;
}
