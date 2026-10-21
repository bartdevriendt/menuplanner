import express from 'express';
import session from 'express-session';
import { rateLimit } from 'express-rate-limit';
import mysql from 'mysql2/promise';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { menu, validDate } from './domain.js';
import {updateShopping} from './shopping.js';
const scrypt = promisify(scryptCallback);
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET moet minimaal 32 tekens bevatten.');
const pool = mysql.createPool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT || 3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,connectionLimit:10,charset:'utf8mb4'});
for (const sql of [
  'CREATE TABLE IF NOT EXISTS mp_shopping (id TINYINT PRIMARY KEY, data JSON NOT NULL)',
  `INSERT IGNORE INTO mp_shopping (id,data) VALUES (1,'{"shops":[],"products":[],"defaultShopId":null}')`,
  'CREATE TABLE IF NOT EXISTS mp_account (id TINYINT PRIMARY KEY, username VARCHAR(100) NOT NULL, hash VARCHAR(256) NOT NULL, salt VARCHAR(64) NOT NULL)',
  'CREATE TABLE IF NOT EXISTS mp_settings (id TINYINT PRIMARY KEY, start_day TINYINT NOT NULL DEFAULT 5)',
  'CREATE TABLE IF NOT EXISTS mp_menus (id INT PRIMARY KEY AUTO_INCREMENT, data JSON NOT NULL)',
  'CREATE TABLE IF NOT EXISTS mp_plan (day DATE PRIMARY KEY, data JSON NOT NULL)',
  'CREATE TABLE IF NOT EXISTS mp_sessions (sid VARCHAR(128) PRIMARY KEY, data JSON NOT NULL, expires BIGINT NOT NULL)',
  'INSERT IGNORE INTO mp_settings (id,start_day) VALUES (1,5)'
]) await pool.query(sql);
const decode = value => typeof value === 'string' ? JSON.parse(value) : value;
class MysqlSessions extends session.Store {
  get(sid, cb) { pool.execute('SELECT data FROM mp_sessions WHERE sid=? AND expires>?',[sid,Date.now()]).then(([r])=>cb(null,r[0] ? decode(r[0].data) : null)).catch(cb); }
  set(sid, data, cb) { pool.execute('REPLACE INTO mp_sessions (sid,data,expires) VALUES (?,?,?)',[sid,JSON.stringify(data),new Date(data.cookie.expires).getTime()]).then(()=>cb?.()).catch(e=>cb?.(e)); }
  destroy(sid,cb) {pool.execute('DELETE FROM mp_sessions WHERE sid=?',[sid]).then(()=>cb?.()).catch(e=>cb?.(e));}
}
const cleanup = setInterval(()=>pool.execute('DELETE FROM mp_sessions WHERE expires<?',[Date.now()]).catch(console.error),3600000); cleanup.unref();
const app = express();
app.disable('x-powered-by');
app.set('trust proxy',Number(process.env.TRUST_PROXY || 0));
app.use(express.json({limit:'100kb'}));
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');if(req.path.startsWith('/api'))res.setHeader('Cache-Control','no-store');if (!['GET','HEAD','OPTIONS'].includes(req.method) && req.headers.origin && req.headers.origin !== `${req.protocol}://${req.get('host')}`) return res.status(403).json({error:'Ongeldige herkomst.'});next();});
app.get('/api/health',async(req,res)=>{try{await pool.query('SELECT 1');res.json({ok:true});}catch{res.status(503).json({ok:false});}});
app.use(session({store:new MysqlSessions(),secret:process.env.SESSION_SECRET,resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'strict',secure:process.env.COOKIE_SECURE === 'true',maxAge:30*86400000}}));
app.get('/api/auth',async(req,res)=>{const [rows]=await pool.query('SELECT id FROM mp_account');res.json({setup:!rows.length,authenticated:!!req.session.user});});
const authLimit = rateLimit({windowMs:15*60000,limit:30,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Te veel pogingen. Probeer later opnieuw.'}});
app.post('/api/setup',authLimit,async(req,res)=>{
  const {username,password}=req.body;
  if(typeof username!=='string'|| !username.trim()||username.length>100||typeof password!=='string'||password.length<12||password.length>200) return res.status(400).json({error:'Gebruik een gebruikersnaam en een wachtwoord van 12 tot 200 tekens.'});
  const salt=randomBytes(32).toString('hex'); const hash=(await scrypt(password,salt,64)).toString('hex');
  try{await pool.execute('INSERT INTO mp_account (id,username,hash,salt) VALUES (1,?,?,?)',[username.trim(),hash,salt]);}catch(e){if(e.code==='ER_DUP_ENTRY') return res.status(409).json({error:'Het account bestaat al.'});throw e;}
  req.session.regenerate(e=>{if(e)return res.status(500).json({error:'Aanmelden mislukt.'});req.session.user=1;res.json({ok:true});});
});
app.post('/api/login',authLimit,async(req,res)=>{
  if(typeof req.body.username!=='string'||typeof req.body.password!=='string'||req.body.password.length>200)return res.status(400).json({error:'Ongeldige aanmeldgegevens.'});
  const [rows]=await pool.query('SELECT * FROM mp_account WHERE id=1');const account=rows[0];
  const hash=await scrypt(req.body.password,account?.salt || 'dummy',64);
  if(!account||req.body.username!==account.username||!timingSafeEqual(hash,Buffer.from(account.hash,'hex')))return res.status(401).json({error:'Gebruikersnaam of wachtwoord klopt niet.'});
  req.session.regenerate(e=>{if(e)return res.status(500).json({error:'Aanmelden mislukt.'});req.session.user=1;res.json({ok:true});});
});
app.post('/api/logout',(req,res)=>req.session.destroy(()=>{res.clearCookie('connect.sid');res.json({ok:true});}));
app.use('/api',(req,res,next)=>req.session.user?next():res.status(401).json({error:'Meld je aan om verder te gaan.'}));
app.get('/api/data',async(req,res)=>{const [menus]=await pool.query('SELECT * FROM mp_menus ORDER BY id DESC');const [plan]=await pool.query("SELECT DATE_FORMAT(day,'%Y-%m-%d') AS day,data FROM mp_plan");const [[settings]]=await pool.query('SELECT start_day FROM mp_settings WHERE id=1');res.json({menus:menus.map(r=>({id:r.id,...decode(r.data)})),plan:Object.fromEntries(plan.map(r=>[r.day,decode(r.data)])),startDay:settings.start_day});});
app.get('/api/shopping',async(req,res)=>{const [[row]]=await pool.query('SELECT data FROM mp_shopping WHERE id=1');res.json(decode(row.data));});
app.post('/api/shopping',async(req,res)=>{
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[row]]=await conn.query('SELECT data FROM mp_shopping WHERE id=1 FOR UPDATE');
    let plan={};
    if(req.body.type==='importPlan') {
      const [rows]=await conn.query("SELECT DATE_FORMAT(day,'%Y-%m-%d') AS day,data FROM mp_plan");
      plan=Object.fromEntries(rows.map(r=>[r.day,decode(r.data)]));
    }
    const result=updateShopping(decode(row.data),req.body,plan);
    await conn.execute('UPDATE mp_shopping SET data=? WHERE id=1',[JSON.stringify(result)]);
    await conn.commit();res.json(result);
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
});
app.put('/api/settings',async(req,res)=>{if(!Number.isInteger(req.body.startDay)||req.body.startDay<0||req.body.startDay>6)return res.status(400).json({error:'Ongeldige startdag.'});await pool.execute('UPDATE mp_settings SET start_day=? WHERE id=1',[req.body.startDay]);res.json({ok:true});});
app.post('/api/menus',async(req,res)=>{const data=menu(req.body);const [result]=await pool.execute('INSERT INTO mp_menus (data) VALUES (?)',[JSON.stringify(data)]);res.json({id:result.insertId,...data});});
app.put('/api/menus/:id',async(req,res)=>{const data=menu(req.body);await pool.execute('UPDATE mp_menus SET data=? WHERE id=?',[JSON.stringify(data),req.params.id]);res.json({ok:true});});
app.delete('/api/menus/:id',async(req,res)=>{await pool.execute('DELETE FROM mp_menus WHERE id=?',[req.params.id]);res.json({ok:true});});
// All affected dates are committed together, including swaps and undo.
app.post('/api/plan',async(req,res)=>{
  const changes=req.body.changes;
  if(!Array.isArray(changes)||!changes.length||changes.length>2||changes.some(c=>!validDate(c.day)))return res.status(400).json({error:'Ongeldige planningswijziging.'});
  const values=changes.map(c=>({day:c.day,data:c.data===null?null:menu(c.data)}));
  const conn=await pool.getConnection();
  try{await conn.beginTransaction();for(const c of values){if(c.data===null)await conn.execute('DELETE FROM mp_plan WHERE day=?',[c.day]);else await conn.execute('REPLACE INTO mp_plan (day,data) VALUES (?,?)',[c.day,JSON.stringify(c.data)]);}await conn.commit();res.json({ok:true});}catch(e){await conn.rollback();throw e;}finally{conn.release();}
});
app.use('/api',(req,res)=>res.status(404).json({error:'Onbekende API-route.'}));
app.use(express.static('dist'));
app.get('/{*path}',(req,res)=>res.sendFile('index.html',{root:'dist'}));
app.use((error,req,res,next)=>{console.error(error);res.status(error.status || (error.message?.startsWith('Geef')||error.message?.startsWith('Ongeldige menu')||error.message?.startsWith('De ingevoerde')?400:500)).json({error:error.status===400?error.message:error.message?.startsWith('Geef')||error.message?.startsWith('Ongeldige menu')||error.message?.startsWith('De ingevoerde')?error.message:'Opslaan of laden mislukt. Probeer opnieuw.'});});
app.listen(Number(process.env.PORT || 3000),'0.0.0.0',()=>console.log('Menuplanning gestart.'));
