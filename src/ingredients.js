import {addDays} from './calendar.js';

export const shops={butcher:'Slager',supermarket:'Supermarkt'};

export function ingredientNames(value) {
  const names=new Map();
  for(const line of value.split('\n')) {
    const name=line.trim().replace(/\s+/g,' ');
    if(name&&!names.has(name.toLocaleLowerCase('nl')))names.set(name.toLocaleLowerCase('nl'),name);
  }
  return [...names.values()];
}

export function shoppingList(plan,start) {
  const result={butcher:[],supermarket:[]};
  if(!start)return result;
  for(const shop of Object.keys(shops)) {
    const counts=new Map();
    for(let i=0;i<14;i++) {
      const meal=plan[addDays(start,i)];
      const names=ingredientNames((meal?.ingredients?.[shop] || []).join('\n'));
      for(const name of names) {
        const key=name.toLocaleLowerCase('nl');
        const entry=counts.get(key) || {name,count:0};
        entry.count++;
        counts.set(key,entry);
      }
    }
    result[shop]=[...counts.values()].sort((a,b)=>a.name.localeCompare(b.name,'nl'));
  }
  return result;
}
