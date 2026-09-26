/* ===== ユーティリティ ===== */
function flash(id,text){const el=document.getElementById(id);if(el){el.textContent=text;setTimeout(()=>el.textContent='',2500);}}
function showMsg(id,text,type){const el=document.getElementById(id);if(el){el.className=type==='ok'?'ok':'err';el.textContent=text;setTimeout(()=>el.textContent='',3000);}}
function saveItems(){try{localStorage.setItem('custom_items',JSON.stringify(items.filter(x=>x.id.startsWith('custom_'))));}catch(e){}}
