export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Brussels',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function addDays(day,n){const d=new Date(`${day}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function nextStart(day,weekday){return addDays(day,(weekday-new Date(`${day}T12:00:00Z`).getUTCDay()+7)%7);}
export function label(day,options={weekday:'long',day:'numeric',month:'long'}){return new Intl.DateTimeFormat('nl-BE',{...options,timeZone:'UTC'}).format(new Date(`${day}T12:00:00Z`));}
