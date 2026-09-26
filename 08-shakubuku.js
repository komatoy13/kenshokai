/* ===== 折伏成果 ===== */
// 入信日の表記を正規化（スラッシュ→ハイフン）
function normalizeDate(s){
  if(!s) return '';
  return String(s).replace(/\//g, '-').trim();
}
function getHTotal(){
  if(!hPeriod.start) return 0;
  return roster.filter(function(m){
    const nd = normalizeDate(m.nyushin);
    return !m.minyushin && nd && nd >= hPeriod.start && nd <= hPeriod.end;
  }).length;
}
function getHByHan(){
  const aggHan = getAggHan();
  const mp = {};
  aggHan.forEach(function(h){ mp[h.name] = 0; });
  if(!hPeriod.start) return mp;
  roster.filter(function(m){
    const nd = normalizeDate(m.nyushin);
    return !m.minyushin && nd && nd >= hPeriod.start && nd <= hPeriod.end;
  }).forEach(function(m){ if(mp[m.han] != null) mp[m.han]++; });
  return mp;
}
function renderHCards(){
  const total=getHTotal(),byHan=getHByHan();
  const top=Object.entries(byHan).sort((a,b)=>b[1]-a[1])[0];
  const period=hPeriod.start?`${hPeriod.start}〜${hPeriod.end}`:'未設定';
  const el=document.getElementById('h-cards');
  if(el) el.innerHTML=`<div class="sc"><div class="sc-l">期間合計</div><div class="sc-v">${total}</div><div class="sc-s">${period}</div></div><div class="sc"><div class="sc-l">最多班</div><div class="sc-v">${top&&top[1]>0?top[1]:'―'}</div><div class="sc-s">${top&&top[1]>0?top[0]+'班':''}</div></div>`;
}
function renderHList(){
  const members=roster.filter(function(m){
    const nd = normalizeDate(m.nyushin);
    return !m.minyushin && nd && hPeriod.start && nd >= hPeriod.start && nd <= hPeriod.end;
  });
  const el=document.getElementById('h-list');if(!el)return;
  if(!members.length){el.innerHTML='<div style="font-size:13px;color:#888;padding:10px 14px">期間内の入信者はいません</div>';return;}
  let html='';
  const aggHan=getAggHan();
  aggHan.forEach(h=>{
    const ms=members.filter(m=>m.han===h.name);if(!ms.length)return;
    html+=`<div style="font-size:12px;font-weight:500;color:#888;padding:5px 14px 2px;background:#fafafa">${h.name}班</div>`;
    ms.forEach(m=>{html+=`<div style="display:flex;align-items:center;gap:8px;padding:6px 14px;border-bottom:1px solid #eee;font-size:13px"><span style="font-weight:500;min-width:80px">${m.sei}${m.mei}</span><span style="font-size:11px;color:#888">${m.nyushin||''}</span><span style="font-size:11px;color:#888">${m.shokai?'紹介：'+m.shokai:''}</span></div>`;});
  });
  el.innerHTML=html;
}
function saveHP(){hPeriod={start:document.getElementById('h-start').value,end:document.getElementById('h-end').value};try{localStorage.setItem('h_period',JSON.stringify(hPeriod));}catch(e){}gasSave('hPeriod',hPeriod);flash('h-pmsg','設定しました');renderHCards();renderHList();}
function saveHR(){
  const date=document.getElementById('h-rdate').value;
  const e={date,total:getHTotal(),byHan:getHByHan()};
  const i=hHist.findIndex(x=>x.date===date);if(i>=0)hHist[i]=e;else hHist.push(e);
  hHist.sort((a,b)=>a.date>b.date?-1:1);
  try{localStorage.setItem('h_hist',JSON.stringify(hHist));}catch(e){}
  gasSave('hHist',hHist);
  flash('h-rmsg','保存しました');if(hHO)renderHHist();
}
function toggleHH(){hHO=!hHO;document.getElementById('h-hist').classList.toggle('open',hHO);document.getElementById('h-hl').textContent=(hHO?'▾':'▸')+' 過去の法戦記録';if(hHO)renderHHist();}
function renderHHist(){const el=document.getElementById('h-hist');if(!hHist.length){el.innerHTML='<div style="font-size:13px;color:#888">まだ記録がありません</div>';return;}let h=`<table class="htbl"><thead><tr><th>報告日</th><th>合計</th></tr></thead><tbody>`;hHist.forEach(e=>{h+=`<tr><td>${e.date}</td><td>${e.total}名</td></tr>`;});el.innerHTML=h+'</tbody></table>';}
