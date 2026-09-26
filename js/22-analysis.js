/* ===== 分析 ===== */
let analysisSelectedItems=null; // null=未初期化 → 初回は全選択

function analysisItemList(){
  return items; // 01-constants.js の DEFAULT_ITEMS + カスタム項目
}

function renderAnalysisItemChecks(){
  const el=document.getElementById('analysis-item-checks');
  if(!el) return;
  if(!analysisSelectedItems){
    analysisSelectedItems=analysisItemList().map(it=>it.id);
  }
  let h='';
  analysisItemList().forEach(it=>{
    const on=analysisSelectedItems.indexOf(it.id)>=0;
    h+=`<div class="ic ${on?'active':''}" data-analysis-item="${it.id}" onclick="toggleAnalysisItem('${it.id}')">${it.label}</div>`;
  });
  el.innerHTML=h;
}
function toggleAnalysisItem(id){
  const i=analysisSelectedItems.indexOf(id);
  if(i>=0) analysisSelectedItems.splice(i,1); else analysisSelectedItems.push(id);
  renderAnalysisItemChecks();
}
function analysisSelectAll(on){
  analysisSelectedItems=on?analysisItemList().map(it=>it.id):[];
  renderAnalysisItemChecks();
}

function renderAnalysisHanSelect(){
  const sel=document.getElementById('analysis-han');
  if(!sel) return;
  const cur=sel.value;
  const hans=getAggHan();
  let h='<option value="">全班</option>';
  hans.forEach(hh=>{h+=`<option value="${hh.name}">${hh.name}班</option>`;});
  sel.innerHTML=h;
  if(cur) sel.value=cur;
}

// 選択中の項目・班・期間に合う aggHistory のエントリを返す（日付昇順）
function getFilteredAggHistory(){
  const start=document.getElementById('analysis-start').value;
  const end=document.getElementById('analysis-end').value;
  return aggHistory
    .filter(e=>(!start||e.date>=start)&&(!end||e.date<=end))
    .slice()
    .sort((a,b)=>a.date<b.date?-1:1);
}

function analysisItemLabel(id){
  const it=analysisItemList().find(x=>x.id===id);
  return it?it.label:id;
}

// summary(1件)から「結果」の主要な数値を取り出す
function summaryResultVal(s){
  if(!s) return '';
  if(s.type==='confirm') return s.count!=null?s.count:'';
  if(s.type==='kikanshi') return s.units!=null?s.units:'';
  if(s.type==='kuyou') return (s.count!=null?s.count:'')+(s.amt!=null?'(/'+s.amt+'万円)':'');
  return s.count!=null?s.count:'';
}
function summaryGrabVal(s){
  if(!s||s.type==='confirm') return '';
  return s.grabW!=null?s.grabW:'';
}

// ===== 画面プレビュー（支隊全体の推移、日付×項目） =====
function renderAnalysisPreview(){
  const msg=document.getElementById('analysis-msg');
  const ta=document.getElementById('analysis-preview');
  const selIds=(analysisSelectedItems||[]).filter(id=>analysisItemList().some(it=>it.id===id));
  if(!selIds.length){ if(msg)msg.textContent='項目を1つ以上選んでください'; return; }
  const hist=getFilteredAggHistory();
  if(!hist.length){ ta.value='該当する記録がありません（期間や保存記録をご確認ください）'; document.getElementById('analysis-copy-btn').style.display='none'; return; }

  // ヘッダー
  const header=['日付'];
  selIds.forEach(id=>{
    const lb=analysisItemLabel(id);
    header.push(lb+'(結果)');
    const it=analysisItemList().find(x=>x.id===id);
    if(it&&it.type!=='confirm') header.push(lb+'(掴み)');
  });
  const rows=[header];
  hist.forEach(e=>{
    const row=[e.date];
    selIds.forEach(id=>{
      const s=(e.summary||{})[id];
      row.push(s?String(summaryResultVal(s)):'');
      const it=analysisItemList().find(x=>x.id===id);
      if(it&&it.type!=='confirm') row.push(s?String(summaryGrabVal(s)):'');
    });
    rows.push(row);
  });

  // Markdown表として整形（Claudeにそのまま貼りやすい形式）
  let text='| '+rows[0].join(' | ')+' |\n';
  text+='|'+rows[0].map(()=>'---').join('|')+'|\n';
  for(let i=1;i<rows.length;i++) text+='| '+rows[i].join(' | ')+' |\n';

  ta.value=text;
  document.getElementById('analysis-copy-btn').style.display='';
  if(msg) msg.textContent='';
}

function copyAnalysisTable(){
  const ta=document.getElementById('analysis-preview');
  const msg=document.getElementById('analysis-msg');
  if(!ta||!ta.value){ if(msg)msg.textContent='先に「表を作成」を押してください'; return; }
  const doFallback=()=>{
    ta.removeAttribute('readonly');
    ta.select();
    try{document.execCommand('copy');}catch(e){}
    ta.setAttribute('readonly','readonly');
  };
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(ta.value).then(()=>{
      if(msg){msg.textContent='コピーしました';setTimeout(()=>{msg.textContent='';},2500);}
    }).catch(()=>{ doFallback(); if(msg){msg.textContent='コピーしました';setTimeout(()=>{msg.textContent='';},2500);} });
  } else {
    doFallback();
    if(msg){msg.textContent='コピーしました';setTimeout(()=>{msg.textContent='';},2500);}
  }
}

// ===== CSV共通ユーティリティ =====
function csvCell(v){
  const s=(v===undefined||v===null)?'':String(v);
  if(/[",\n]/.test(s)) return '"'+s.replace(/"/g,'""')+'"';
  return s;
}
function downloadCSV(filename,rows){
  const csv=rows.map(r=>r.map(csvCell).join(',')).join('\r\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function fmtIndivResult(v){
  if(v===true) return '○';
  if(v===false) return '×';
  if(v===''||v===undefined||v===null) return '';
  return v;
}

// ===== 個人別CSV（集計項目：掴み・結果の推移） =====
function exportAnalysisMemberCSV(){
  const msg=document.getElementById('analysis-csv-msg');
  const selIds=(analysisSelectedItems||[]).filter(id=>analysisItemList().some(it=>it.id===id));
  if(!selIds.length){ if(msg)msg.textContent='項目を1つ以上選んでください'; return; }
  const hanFilter=document.getElementById('analysis-han').value;
  const hist=getFilteredAggHistory();
  if(!hist.length){ if(msg)msg.textContent='該当する記録がありません'; return; }

  const header=['日付','班','氏名'];
  selIds.forEach(id=>{
    const lb=analysisItemLabel(id);
    const it=analysisItemList().find(x=>x.id===id);
    if(it&&it.type!=='confirm') header.push(lb+'(掴み)');
    header.push(lb+'(結果)');
  });
  const rows=[header];
  hist.forEach(e=>{
    const members=e.members||{};
    Object.keys(members).forEach(k=>{
      const m=members[k];
      if(hanFilter&&m.han!==hanFilter) return;
      const hasAny=selIds.some(id=>m[id]&&(m[id].grab||m[id].result!==''));
      if(!hasAny) return;
      const row=[e.date,m.han,m.name];
      selIds.forEach(id=>{
        const d=m[id]||{};
        const it=analysisItemList().find(x=>x.id===id);
        if(it&&it.type!=='confirm') row.push(d.grab||'');
        row.push(fmtIndivResult(d.result));
      });
      rows.push(row);
    });
  });
  if(rows.length<=1){ if(msg)msg.textContent='該当する個人記録がありません'; return; }
  const today=new Date().toISOString().slice(0,10).replace(/-/g,'');
  downloadCSV('分析用_個人別_'+today+'.csv',rows);
  if(msg){msg.textContent='ダウンロードしました';setTimeout(()=>{msg.textContent='';},2500);}
}

// ===== 入信者リストCSV（折伏成果：roster の入信日ベース） =====
function exportNyushinCSV(){
  const msg=document.getElementById('analysis-csv-msg');
  const start=document.getElementById('analysis-start').value;
  const end=document.getElementById('analysis-end').value;
  const hanFilter=document.getElementById('analysis-han').value;
  const list=roster.filter(m=>{
    if(m.minyushin) return false;
    const nd=normalizeDate(m.nyushin);
    if(!nd) return false;
    if(start&&nd<start) return false;
    if(end&&nd>end) return false;
    if(hanFilter&&m.han!==hanFilter) return false;
    return true;
  }).sort((a,b)=>normalizeDate(a.nyushin)<normalizeDate(b.nyushin)?-1:1);
  if(!list.length){ if(msg)msg.textContent='該当する入信者がいません'; return; }
  const rows=[['入信日','班','氏名','紹介者']];
  list.forEach(m=>{rows.push([normalizeDate(m.nyushin),m.han||'',(m.sei||'')+(m.mei||''),m.shokai||'']);});
  const today=new Date().toISOString().slice(0,10).replace(/-/g,'');
  downloadCSV('分析用_入信者_'+today+'.csv',rows);
  if(msg){msg.textContent='ダウンロードしました';setTimeout(()=>{msg.textContent='';},2500);}
}
