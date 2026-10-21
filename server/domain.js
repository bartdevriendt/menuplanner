import {ingredientNames,shops} from '../src/ingredients.js';
export const fields = ['protein','carbs','vegetables','sauce','other'];
export function menu(input) {
  if (!input || typeof input.name !== 'string' || !input.name.trim()) throw new Error('Geef het menu een naam.');
  const result = {};
  for (const key of ['name', ...fields, 'instructions']) {
    if (input[key] != null && typeof input[key] !== 'string') throw new Error('Ongeldige menutekst.');
    result[key] = (input[key] || '').trim();
    if (result[key].length > (key === 'instructions' ? 20000 : 250)) throw new Error('De ingevoerde tekst is te lang.');
  }
  if(input.ingredients!=null&&(typeof input.ingredients!=='object'||Array.isArray(input.ingredients)))throw new Error('Ongeldige menutekst voor ingrediënten.');
  result.ingredients={};
  for(const shop of Object.keys(shops)) {
    const values=input.ingredients?.[shop] ?? [];
    if(!Array.isArray(values)||values.length>200||values.some(v=>typeof v!=='string'||v.length>250||/[\r\n]/.test(v)))throw new Error('Ongeldige menutekst voor ingrediënten: gebruik maximaal 200 ingrediënten van 250 tekens per winkel.');
    result.ingredients[shop]=ingredientNames(values.join('\n'));
  }
  return result;
}
export function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
}
