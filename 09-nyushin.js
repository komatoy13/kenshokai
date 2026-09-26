/* ===== 入信者登録 ===== */
function gv(id){return document.getElementById(id)?.value.trim()||'';}
function sv(id,v){const el=document.getElementById(id);if(el)el.value=v||'';}

// ① 読み自動入力（変換前のひらがなを取得）
function onNameInput(field){
  const inputEl = document.getElementById(field==='sei'?'r-sei':'r-mei');
  const readEl  = document.getElementById(field==='sei'?'r-sk':'r-mk');
  if(inputEl._bound) return;
  inputEl._bound = true;
  inputEl._lastKana = '';

  inputEl.addEventListener('compositionstart', function(){
    inputEl._lastKana = '';
  });
  // compositionupdateで変換中のひらがな（未確定文字）を随時保存
  inputEl.addEventListener('compositionupdate', function(e){
    const d = e.data || '';
    // ひらがな・カタカナのみを読みとして記録（漢字に変換されていない状態）
    if(/^[ぁ-んァ-ヶー゛゜ａ-ｚ]+$/.test(d)){
      inputEl._lastKana = d;
    }
  });
  inputEl.addEventListener('compositionend', function(){
    if(inputEl._lastKana && !readEl.value){
      readEl.value = inputEl._lastKana;
    }
    inputEl._lastKana = '';
  });
}

// ② 郵便番号から住所自動入力
let _zipTimer=null;
function onZipInput(el){
  clearTimeout(_zipTimer);
  const raw = el.value.replace(/[^\d]/g,'');
  if(raw.length===7){
    document.getElementById('r-zip-msg').textContent='検索中…';
    _zipTimer=setTimeout(()=>fetchZip(raw),300);
  }
}
function fetchZip(zip){
  fetch('https://zipcloud.ibsrio.com/api/search?zipcode='+zip)
    .then(r=>r.json())
    .then(d=>{
      if(d.results&&d.results[0]){
        const r=d.results[0];
        document.getElementById('r-pref').value=r.address1||'';
        document.getElementById('r-city').value=(r.address2||'')+(r.address3||'');
        document.getElementById('r-zip-msg').textContent='✓';
        setTimeout(()=>document.getElementById('r-zip-msg').textContent='',2000);
      } else {
        document.getElementById('r-zip-msg').textContent='見つかりません';
      }
    })
    .catch(()=>{
      // CORSエラー対策：zipcloudが失敗したらherokサービスで試みる
      fetch('https://zip-cloud.appspot.com/api/search?zipcode='+zip)
        .then(r=>r.json())
        .then(d=>{
          if(d.results&&d.results[0]){
            const r=d.results[0];
            document.getElementById('r-pref').value=r.address1||'';
            document.getElementById('r-city').value=(r.address2||'')+(r.address3||'');
            document.getElementById('r-zip-msg').textContent='✓';
            setTimeout(()=>document.getElementById('r-zip-msg').textContent='',2000);
          } else {
            document.getElementById('r-zip-msg').textContent='エラー';
          }
        })
        .catch(()=>document.getElementById('r-zip-msg').textContent='エラー');
    });
}

// ③ 和暦→西暦変換
const ERA_BASE={令和:2018,平成:1988,昭和:1925,大正:1911,明治:1867};
function warekiToSeireki(era,y){
  const base=ERA_BASE[era];
  if(!base||!y)return null;
  return base+parseInt(y);
}
function getBirthValue(){
  const era=document.getElementById('r-birth-era').value.trim();
  const y=document.getElementById('r-birth-y').value.trim();
  const mo=document.getElementById('r-birth-m').value.trim();
  const d=document.getElementById('r-birth-d').value.trim();
  if(!y)return '';
  let year;
  if(era&&ERA_BASE[era]){
    year=warekiToSeireki(era,y);
  } else if(/^\d{4}$/.test(y)){
    // 西暦直入力
    year=parseInt(y);
  } else {
    return '';
  }
  if(!year)return '';
  const mm=(mo||'1').padStart(2,'0');
  const dd=(d||'1').padStart(2,'0');
  const result=year+'-'+mm+'-'+dd;
  // プレビュー更新
  document.getElementById('r-birth-preview').textContent=year+'年'+mm+'月'+dd+'日';
  return result;
}

// ④ 所属組変更で班を自動表示
function onKumiChange(){
  const kumi=document.getElementById('r-kumi').value;
  const han=kumiMap[kumi]||'';
  document.getElementById('r-han').value=han;
  document.getElementById('r-han-disp').textContent=han?han+'班':'―';
  document.getElementById('r-kumi-note').textContent=han?'':'（組と班の対応が未設定です→設定タブで登録）';
}

// 組プルダウンを再描画
function renderKumiSelect(){
  const sel=document.getElementById('r-kumi');
  if(!sel)return;
  const cur=sel.value;
  const names=Object.keys(kumiMap).sort();
  sel.innerHTML='<option value="">― 選択 ―</option>'+names.map(k=>'<option value="'+k+'">'+k+'</option>').join('');
  if(cur)sel.value=cur;
}

function saveKumiMap(){
  try{localStorage.setItem('kumi_map',JSON.stringify(kumiMap));}catch(e){}
  gasSave('kumiMap', kumiMap);
}

// ⑤ 設定タブ：組管理テーブル
function renderKumiTable(){
  const wrap = document.getElementById('kumi-table-wrap');
  const names = Object.keys(kumiMap).sort();
  if(!names.length){
    wrap.innerHTML = '<div style="font-size:13px;color:#888;padding:8px 0">まだ登録されていません</div>';
    return;
  }
  let h = '<table style="width:100%;border-collapse:collapse;font-size:13px">'
    + '<thead><tr style="border-bottom:1px solid #ddd">'
    + '<th style="text-align:left;padding:5px 4px;color:#888;font-weight:400">組名</th>'
    + '<th style="text-align:left;padding:5px 4px;color:#888;font-weight:400">所属班</th>'
    + '<th style="width:60px"></th>'
    + '</tr></thead><tbody>';
  for(let i = 0; i < names.length; i++){
    const kumi = names[i];
    let opts = '<option value="">― 選択 ―</option>';
    for(let j = 0; j < hanList.length; j++){
      const hname = hanList[j].name;
      const sel = kumiMap[kumi] === hname ? ' selected' : '';
      opts += '<option value="' + hname + '"' + sel + '>' + hname + '班</option>';
    }
    h += '<tr style="border-bottom:1px solid #eee">'
      + '<td style="padding:5px 4px">' + kumi + '</td>'
      + '<td style="padding:5px 4px"><select class="kumi-han-sel" data-kumi="' + kumi + '" style="font-size:12px;padding:3px 6px">' + opts + '</select></td>'
      + '<td style="padding:5px 4px;text-align:center"><button class="btn btn-w" style="font-size:11px;padding:2px 8px" data-del-kumi="' + kumi + '">削除</button></td>'
      + '</tr>';
  }
  wrap.innerHTML = h + '</tbody></table>';
}

// 組テーブルのイベント委譲
document.addEventListener('change', function(e){
  const sel = e.target.closest('.kumi-han-sel');
  if(!sel) return;
  kumiMap[sel.dataset.kumi] = sel.value;
  saveKumiMap();
  renderKumiSelect();
});
document.addEventListener('click', function(e){
  const btn = e.target.closest('[data-del-kumi]');
  if(!btn) return;
  delete kumiMap[btn.dataset.delKumi];
  saveKumiMap();
  renderKumiTable();
  renderKumiSelect();
});
function addKumiMapping(){
  const name = document.getElementById('cfg-kumi-name').value;
  const han = document.getElementById('cfg-kumi-han').value;
  if(!name){ flash('cfg-msg','組名を選択してください'); return; }
  kumiMap[name] = han;
  saveKumiMap();
  document.getElementById('cfg-kumi-name').value = '';
  renderKumiTable();
  renderKumiSelect();
  renderKumiNameSelect();
  flash('cfg-msg','追加しました');
}

// 名簿から組名一覧を取得してドロップダウンを更新
function renderKumiNameSelect(){
  const sel = document.getElementById('cfg-kumi-name');
  if(!sel) return;
  // 名簿から組名を収集（重複排除・50音順）
  const kumiSet = {};
  for(let i = 0; i < roster.length; i++){
    const k = (roster[i].kumi || '').trim();
    if(k) kumiSet[k] = true;
  }
  const kumiNames = Object.keys(kumiSet).sort();
  let html = '<option value="">― 組を選択 ―</option>';
  for(let i = 0; i < kumiNames.length; i++){
    html += '<option value="' + kumiNames[i] + '">' + kumiNames[i] + '</option>';
  }
  sel.innerHTML = html;
}

function toggleMinyushin(){
  const isMini = document.getElementById('r-minyushin').checked;
  document.getElementById('r-nyushin-row').style.display = isMini ? 'none' : '';
  if(isMini) sv('r-nyushin','');
}

function registerMbr(){
  const sei=gv('r-sei');
  if(!sei){showMsg('r-msg','姓を入力してください','err');return;}
  const mei=gv('r-mei');
  const minyushin=document.getElementById('r-minyushin').checked;
  const birth=getBirthValue();
  const m={
    id:Date.now(),sei,mei,
    seiK:gv('r-sk'),meiK:gv('r-mk'),
    pref:gv('r-pref'),city:gv('r-city'),addr:gv('r-addr'),
    tel:gv('r-tel').replace(/[-ー－]/g,''),
    tel2:gv('r-tel2').replace(/[-ー－]/g,''),
    birth,
    kumi:document.getElementById('r-kumi').value,
    han:document.getElementById('r-han').value,
    shokai:gv('r-shokai'),
    nyushin:minyushin?'':normalizeDate(gv('r-nyushin')),
    biko:'',
    comment:document.getElementById('r-comment').value.trim(),
    commentUpdated:document.getElementById('r-comment').value.trim() ? td : '',
    minyushin
  };
  roster.push(m);saveRoster();
  buildHanSelects();rebuildFpHan();
  if(m.aggTarget) initAggData();
  showMsg('r-msg',(sei+(mei||''))+' を登録しました','ok');clearReg();renderHCards();renderHList();
}

function clearReg(){
  ['r-sei','r-mei','r-sk','r-mk','r-pref','r-city','r-addr','r-tel','r-tel2','r-zip','r-shokai','r-nyushin'].forEach(id=>sv(id,''));
  ['r-birth-era','r-birth-y','r-birth-m','r-birth-d'].forEach(id=>sv(id,''));
  document.getElementById('r-birth-preview').textContent='';
  document.getElementById('r-zip-msg').textContent='';
  const rc=document.getElementById('r-comment'); if(rc) rc.value='';
  document.getElementById('r-kumi').value='';
  document.getElementById('r-han').value='';
  document.getElementById('r-han-disp').textContent='―';
  document.getElementById('r-kumi-note').textContent='';
  document.getElementById('r-minyushin').checked=false;
  document.getElementById('r-nyushin-row').style.display='';
}
function saveRoster(){
  try{localStorage.setItem('roster',JSON.stringify(roster));}catch(e){}
  gasSave('roster', roster);
}
