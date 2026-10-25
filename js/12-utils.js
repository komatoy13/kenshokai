/* ===== ユーティリティ ===== */
function flash(id,text){const el=document.getElementById(id);if(el){el.textContent=text;setTimeout(()=>el.textContent='',2500);}}
function showMsg(id,text,type){const el=document.getElementById(id);if(el){el.className=type==='ok'?'ok':'err';el.textContent=text;setTimeout(()=>el.textContent='',3000);}}
// '2026-10-18' → '2026年10月18日(日)'（曜日つき。日付の入れ間違いに気づきやすくする）
function ymdJa(s){
  const m=String(s||'').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(!m) return String(s||'');
  const wd=['日','月','火','水','木','金','土'][new Date(+m[1],+m[2]-1,+m[3]).getDay()];
  return m[1]+'年'+(+m[2])+'月'+(+m[3])+'日('+wd+')';
}
// 履歴1件の項目を短く表示（上書き確認用）
function fmtSummaryBrief(s){
  if(!s) return '';
  if(s.type==='kuyou') return s.count+'人 / '+s.amt+'万円';
  if(s.type==='kikanshi') return s.units+'部';
  return s.count+'人';
}
function saveItems(){try{localStorage.setItem('custom_items',JSON.stringify(items.filter(x=>x.id.startsWith('custom_'))));}catch(e){}}
