import React,{useEffect,useState,useRef} from 'react';

export default function Shopping({api,importStart,onImported}) {
  const [data,setData]=useState(null),[selected,setSelected]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const lock=useRef(false);
  useEffect(()=>{let active=true;api('/shopping').then(value=>{if(active){setData(value);setSelected(value.defaultShopId||'');}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
  async function change(action) {
    if(lock.current)return;
    lock.current=true;setBusy(true);setError('');
    try {const result=await api('/shopping','POST',action);setData(result);return result;}
    catch(e){setError(e.message);}
    finally{lock.current=false;setBusy(false);}
  }
  async function importPlan(){
    const result=await change({type:'importPlan',start:importStart});
    if(result){setNotice('De ingrediënten zijn gekopieerd. Bestaande producten staan opnieuw op niet in winkelkar.');onImported();}
  }
  if(!data)return <section>{error?<p className="error" role="alert">{error}</p>:<p>Boodschappen laden…</p>}</section>;
  const current=data.shops.find(s=>s.id===selected)||data.shops[0];
  const products=data.products.filter(p=>p.shopId===current?.id);
  const remaining=products.filter(p=>!p.inCart);
  const inCart=products.filter(p=>p.inCart);
  function productRow(product){return <li key={product.id} className="product-row"><label><input type="checkbox" checked={product.inCart} disabled={busy} onChange={e=>change({type:'checkProduct',productId:product.id,inCart:e.target.checked})}/><span>{product.name}</span></label><select aria-label={`Verplaats ${product.name} naar winkel`} value={product.shopId} disabled={busy} onChange={e=>change({type:'moveProduct',productId:product.id,shopId:e.target.value})}>{data.shops.map(shop=><option key={shop.id} value={shop.id}>{shop.name}</option>)}</select></li>;}
  return <section className="store-module" aria-label="Boodschappenlijsten">
    {error&&<p className="error" role="alert">{error}</p>}
    {notice&&<p role="status" className="shopping-note">{notice}</p>}
    {importStart&&<div className="shopping-note"><p>Kopieer de ingrediënten uit de tweeweeksplanner vanaf {importStart}. Nieuwe producten gaan naar je standaardwinkel. Bestaande producten blijven bij hun winkel.</p>{data.shops.length>0?<button className="primary" disabled={busy} onClick={importPlan}>Kopiëren naar winkellijsten</button>:<p>Maak eerst je eerste winkel aan. Deze wordt automatisch je standaardwinkel. Daarna kun je de ingrediënten kopiëren.</p>}</div>}
    <div className="store-settings"><form onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;const name=new FormData(form).get('name');const result=await change({type:'createShop',name});if(result){setSelected(result.shops.at(-1).id);form.reset();}}}><label>{data.shops.length?'Nieuwe winkel':'Maak je eerste winkel'}<input name="name" required maxLength={250} placeholder="Bijvoorbeeld: Colruyt"/></label><button disabled={busy}>Winkel aanmaken</button></form>
    {data.shops.length>0&&<label>Standaardwinkel<select value={data.defaultShopId} disabled={busy} onChange={e=>change({type:'defaultShop',shopId:e.target.value})}>{data.shops.map(shop=><option key={shop.id} value={shop.id}>{shop.name}</option>)}</select><small>Nieuwe ingrediënten uit de planner komen hier terecht.</small></label>}</div>
    {current&&<><div className="store-tabs" role="group" aria-label="Kies een winkel">{data.shops.map(shop=><button key={shop.id} aria-pressed={current.id===shop.id} className={current.id===shop.id?'primary':''} onClick={()=>setSelected(shop.id)}>{shop.name} · {data.products.filter(p=>p.shopId===shop.id&&!p.inCart).length}</button>)}</div>
    <article className="store-list"><h2>{current.name}</h2><p className="muted">{remaining.length} te kopen · {inCart.length} in winkelkar</p>
    <form className="product-add" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;const result=await change({type:'addProduct',shopId:current.id,name:new FormData(form).get('name')});if(result)form.reset();}}><label>Product toevoegen<input name="name" required maxLength={250} placeholder="Bijvoorbeeld: melk"/></label><button className="primary" disabled={busy}>Toevoegen</button></form>
    <h3>Te kopen</h3>{remaining.length?<ul className="shopping-list">{remaining.map(productRow)}</ul>:<p className="muted">{products.length?'Alles zit in je winkelkar.':'Voeg een product toe of kopieer ingrediënten vanuit de planner.'}</p>}
    {inCart.length>0&&<><h3>In winkelkar</h3><ul className="shopping-list">{inCart.map(productRow)}</ul></>}
    </article></>}
  </section>;
}
