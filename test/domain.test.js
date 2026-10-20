import test from 'node:test';
import assert from 'node:assert/strict';
import {menu,validDate} from '../server/domain.js';
import {addDays,nextStart} from '../src/calendar.js';
test('start day includes today and otherwise advances to next chosen weekday',()=>{assert.equal(nextStart('2026-10-23',5),'2026-10-23');assert.equal(nextStart('2026-10-24',5),'2026-10-30');assert.equal(nextStart('2026-10-20',5),'2026-10-23');});
test('calendar crosses year and leap day correctly',()=>{assert.equal(addDays('2026-12-28',7),'2027-01-04');assert.equal(addDays('2028-02-28',1),'2028-02-29');});
test('invalid dates cannot be stored',()=>{assert.equal(validDate('2026-02-30'),false);assert.equal(validDate('2026-10-23'),true);assert.equal(validDate('23-10-2026'),false);});
test('pizza needs no other components and copies contain only menu data',()=>{const original={name:' Pizza ',other:'Pizza',id:10};const copy=menu(original);assert.equal(copy.name,'Pizza');assert.equal(copy.protein,'');assert.equal(copy.id,undefined);copy.other='Calzone';assert.equal(original.other,'Pizza');});
test('menu names and field types are validated',()=>{assert.throws(()=>menu({name:''}));assert.throws(()=>menu({name:'Pizza',other:42}));});
