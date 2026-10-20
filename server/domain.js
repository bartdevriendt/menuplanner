export const fields = ['protein','carbs','vegetables','sauce','other'];
export function menu(input) {
  if (!input || typeof input.name !== 'string' || !input.name.trim()) throw new Error('Geef het menu een naam.');
  const result = {};
  for (const key of ['name', ...fields, 'instructions']) {
    if (input[key] != null && typeof input[key] !== 'string') throw new Error('Ongeldige menutekst.');
    result[key] = (input[key] || '').trim();
    if (result[key].length > (key === 'instructions' ? 20000 : 250)) throw new Error('De ingevoerde tekst is te lang.');
  }
  return result;
}
export function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
}
