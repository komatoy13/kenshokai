/* ===== 権限管理 ===== */
// role: 'socho'（総長）| 'hancho'（班長）| 'fukucho'（副長）
const ROLE = (function(){
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode') || '';
  const han  = decodeURIComponent(params.get('han') || '');
  const sub  = (params.get('sub') || '').split(',').map(function(s){ return decodeURIComponent(s.trim()); }).filter(Boolean);
  if(mode === 'hancho' && han) return {role:'hancho',  han:han, hans:[han]};
  if(mode === 'fukucho'&& han) return {role:'fukucho', han:han, hans:[han].concat(sub)};
  return {role:'socho', han:'', hans:[]};
})();

function isSocho(){   return ROLE.role === 'socho'; }
function isHancho(){  return ROLE.role === 'hancho'; }
function isFukucho(){ return ROLE.role === 'fukucho'; }
function isRestricted(){ return !isSocho(); }

// 自分が閲覧可能な班のメンバーか判定
function canViewMember(m){
  if(isSocho()) return true;
  // hanフィールドが直接設定されている場合
  if(m.han && ROLE.hans.indexOf(m.han) >= 0) return true;
  // hanが空でもkumiからkumiMap経由で班を判定
  if(m.kumi && kumiMap[m.kumi] && ROLE.hans.indexOf(kumiMap[m.kumi]) >= 0) return true;
  return false;
}

// デバッグ：名簿のhanフィールドの実際の値を確認
function dbgCheckHan(){
  const sample = roster.slice(0,5);
  for(let i=0;i<sample.length;i++){
    dbgLog('roster['+i+'] han="'+(sample[i].han||'')+ '" sei='+sample[i].sei);
  }
  dbgLog('ROLE.hans='+JSON.stringify(ROLE.hans));
  // 非集計メンバーのhanを確認
  const nonAgg = roster.filter(function(m){ return !m.aggTarget; }).slice(0,3);
  for(let i=0;i<nonAgg.length;i++){
    dbgLog('非集計['+i+'] han="'+(nonAgg[i].han||'')+ '" sei='+nonAgg[i].sei);
  }
  // ROLE.hansに一致するメンバーの集計/非集計の内訳
  const matched = roster.filter(function(m){ return canViewMember(m); });
  const matchedAgg = matched.filter(function(m){ return m.aggTarget; }).length;
  const matchedNonAgg = matched.filter(function(m){ return !m.aggTarget; }).length;
  dbgLog('一致:集計='+matchedAgg+' 非集計='+matchedNonAgg);
}

function applyRoleRestrictions(){
  if(isSocho()) return;

  // タブを制限（設定・折伏予定・メール）
  const hideTabIds = ['tb4','tb5','tb6','tb7'];
  for(let i = 0; i < hideTabIds.length; i++){
    const el = document.getElementById(hideTabIds[i]);
    if(el) el.style.display = 'none';
  }

  // 名簿タブの管理ボタンを非表示
  const pg3 = document.getElementById('pg3');
  if(pg3){
    const allBtns = pg3.querySelectorAll('button, label');
    for(let i = 0; i < allBtns.length; i++){
      const el = allBtns[i];
      const txt = (el.textContent || '');
      if(txt.indexOf('Excel') >= 0 || txt.indexOf('読み込み') >= 0 || txt.indexOf('出力') >= 0){
        el.style.display = 'none';
      }
    }
    const xlsxInput = pg3.querySelector('#xlsx-import');
    if(xlsxInput) xlsxInput.style.display = 'none';
  }

  // 集計タブ：「班長からの報告を取り込む」「項目選択」「追加」を非表示
  const pg0 = document.getElementById('pg0');
  if(pg0){
    // 班長インポートエリアを非表示
    const hanchoImport = pg0.querySelector('#hancho-import-text');
    if(hanchoImport){
      const importWrap = hanchoImport.closest('.row') || hanchoImport.parentElement;
      if(importWrap) importWrap.style.display = 'none';
    }
    // 「班長からの報告を取り込む」セクション見出しも非表示
    const secHds = pg0.querySelectorAll('.sec-hd');
    for(let i = 0; i < secHds.length; i++){
      if(secHds[i].textContent.indexOf('班長からの報告') >= 0){
        secHds[i].style.display = 'none';
      }
    }
    // 「追加」ボタンと追加項目入力を非表示
    const addRow = pg0.querySelector('#item-add-row');
    if(addRow) addRow.style.display = 'none';
  }

  // 折伏成果タブ：期間設定を操作不可に
  const pg1 = document.getElementById('pg1');
  if(pg1){
    const inputs = pg1.querySelectorAll('input, button, select');
    for(let i = 0; i < inputs.length; i++){
      inputs[i].disabled = true;
    }
  }

  // 集計タブの班プルダウンを再構築（権限フィルタ適用）
  buildHanSelects();

  // 名簿を再描画（権限フィルタ適用）
  dbgLog('applyRoleRestrictions: roster=' + roster.length + ' hans=' + ROLE.hans.join(','));
  const testFiltered = roster.filter(function(m){ return canViewMember(m); });
  dbgLog('フィルタ後件数=' + testFiltered.length);
  renderRoster();
}

function initHanchoMode(){
  if(isSocho()) return;

  _hanchoHan = ROLE.han;

  // ヘッダーに役職バッジを追加（重複防止）
  if(!document.getElementById('role-badge')){
    const roleLabel = isHancho()
      ? ROLE.han + '班長'
      : ROLE.han + '班 副長（担当：' + ROLE.hans.join('・') + '）';
    const badge = document.createElement('div');
    badge.id = 'role-badge';
    badge.style.cssText = 'background:#1a6bbf;color:#fff;font-size:12px;padding:3px 10px;text-align:right;';
    badge.textContent = '🔑 ' + roleLabel + ' モード';
    document.body.insertBefore(badge, document.body.firstChild);
  }

  // 制限UIを適用
  applyRoleRestrictions();

  // 入信者登録ボタンを「仮登録」に変更
  const regBtn = document.getElementById('reg-main-btn');
  if(regBtn){
    regBtn.textContent = '仮登録（支隊長に申請）';
    regBtn.onclick = pendingRegMbr;
  }
}

function getHanchoMembers(){
  // rosterがあれば使う。班員として roster から指定班＋aggTarget=trueを抽出
  const members = [];
  for(let i = 0; i < roster.length; i++){
    const m = roster[i];
    if(m.han === _hanchoHan && m.aggTarget){
      members.push(m.sei + (m.mei || ''));
    }
  }
  // rosterがなければ _hanchoData のキーから復元（URLからの起動時）
  if(!members.length){
    const prefix = _hanchoHan + '__';
    const keys = Object.keys(_hanchoData);
    for(let i = 0; i < keys.length; i++){
      if(keys[i].startsWith(prefix)){
        members.push(keys[i].slice(prefix.length));
      }
    }
  }
  return members;
}

function renderHanchoItemChecks(){
  const el = document.getElementById('hancho-item-checks');
  if(!el) return;
  let html = '';
  for(let i = 0; i < items.length; i++){
    const item = items[i];
    const active = _hanchoActiveItems.indexOf(item.id) >= 0;
    html += '<div class="ic ' + (active ? 'active' : '') + '" data-hancho-item="' + item.id + '">' + item.label + '</div>';
  }
  el.innerHTML = html;
}

// 項目チェックのイベント委譲（init後に登録）
document.addEventListener('click', function(e){
  const ic = e.target.closest('[data-hancho-item]');
  if(!ic) return;
  const id = ic.dataset.hanchoItem;
  const idx = _hanchoActiveItems.indexOf(id);
  if(idx >= 0){
    _hanchoActiveItems.splice(idx, 1);
  } else {
    _hanchoActiveItems.push(id);
  }
  renderHanchoItemChecks();
  renderHanchoTable();
});

function renderHanchoTable(){
  const members = getHanchoMembers();
  const selItems = [];
  for(let i = 0; i < _hanchoActiveItems.length; i++){
    const found = items.find(function(x){ return x.id === _hanchoActiveItems[i]; });
    if(found) selItems.push(found);
  }

  // ヘッダー
  let thead = '<tr><th class="name-col">氏名</th>';
  for(let i = 0; i < selItems.length; i++){
    thead += '<th>' + selItems[i].label + '</th>';
  }
  thead += '</tr>';
  document.getElementById('hancho-thead').innerHTML = thead;

  // ボディ
  let tbody = '';
  for(let mi = 0; mi < members.length; mi++){
    const mname = members[mi];
    const k = memberKey(_hanchoHan, mname);
    if(!_hanchoData[k]) _hanchoData[k] = {};
    tbody += '<tr><td class="name-cell">' + mname + '</td>';
    for(let ii = 0; ii < selItems.length; ii++){
      const item = selItems[ii];
      if(!_hanchoData[k][item.id]){
        const isNum = (item.type === 'kikanshi' || item.type === 'kuyou');
        _hanchoData[k][item.id] = {grab: '', result: isNum ? 0 : false};
      }
      const d = _hanchoData[k][item.id];
      if(_hanchoMode === 'grab'){
        const g = d.grab || '';
        const cls = g ? 's-' + g : 's-e';
        tbody += '<td><button class="abcb ' + cls + '" data-hancho-cyc data-k="' + k + '" data-item="' + item.id + '">' + (g || '―') + '</button></td>';
      } else {
        // 結果モード
        if(item.type === 'kikanshi' || item.type === 'kuyou'){
          const v = d.result || 0;
          tbody += '<td><div class="numcell">'
            + '<button class="numb" data-hancho-adj data-k="' + k + '" data-item="' + item.id + '" data-delta="-1">－</button>'
            + '<span class="numv">' + v + '</span>'
            + '<button class="numb" data-hancho-adj data-k="' + k + '" data-item="' + item.id + '" data-delta="1">＋</button>'
            + '</div></td>';
        } else {
          const on = !!d.result;
          tbody += '<td><button class="ckb ' + (on ? 'on' : '') + '" data-hancho-tog data-k="' + k + '" data-item="' + item.id + '">✔</button></td>';
        }
      }
    }
    tbody += '</tr>';
  }
  if(!members.length){
    tbody = '<tr><td colspan="' + (selItems.length + 1) + '" style="padding:14px;color:#888;font-size:13px">班員が見つかりません。支隊長からURLを受け取り直してください。</td></tr>';
  }
  document.getElementById('hancho-tbody').innerHTML = tbody;
}

// 班長テーブルのイベント委譲
document.addEventListener('click', function(e){
  // ABCサイクル
  const cycBtn = e.target.closest('[data-hancho-cyc]');
  if(cycBtn){
    const k = cycBtn.dataset.k;
    const itemId = cycBtn.dataset.item;
    if(!_hanchoData[k]) _hanchoData[k] = {};
    if(!_hanchoData[k][itemId]) _hanchoData[k][itemId] = {grab: '', result: false};
    const cur = _hanchoData[k][itemId].grab || '';
    _hanchoData[k][itemId].grab = ABCC[(ABCC.indexOf(cur) + 1) % ABCC.length];
    renderHanchoTable();
    return;
  }
  // チェックトグル
  const togBtn = e.target.closest('[data-hancho-tog]');
  if(togBtn){
    const k = togBtn.dataset.k;
    const itemId = togBtn.dataset.item;
    if(!_hanchoData[k]) _hanchoData[k] = {};
    if(!_hanchoData[k][itemId]) _hanchoData[k][itemId] = {grab: '', result: false};
    _hanchoData[k][itemId].result = !_hanchoData[k][itemId].result;
    renderHanchoTable();
    return;
  }
  // 数値加減
  const adjBtn = e.target.closest('[data-hancho-adj]');
  if(adjBtn){
    const k = adjBtn.dataset.k;
    const itemId = adjBtn.dataset.item;
    const delta = parseInt(adjBtn.dataset.delta) || 0;
    if(!_hanchoData[k]) _hanchoData[k] = {};
    if(!_hanchoData[k][itemId]) _hanchoData[k][itemId] = {grab: '', result: 0};
    _hanchoData[k][itemId].result = Math.max(0, (_hanchoData[k][itemId].result || 0) + delta);
    renderHanchoTable();
    return;
  }
});

function copyHanchoData(){
  const payload = {
    han: _hanchoHan,
    items: _hanchoActiveItems,
    data: _hanchoData
  };
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  const text = 'HANCHO:' + b64;

  // クリップボードにコピー
  const copy = function(){
    try{
      navigator.clipboard.writeText(text).then(function(){
        document.getElementById('hancho-copy-msg').textContent = 'コピーしました！LINEに貼り付けて送信してください。';
        setTimeout(function(){ document.getElementById('hancho-copy-msg').textContent = ''; }, 4000);
      });
    } catch(e){
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try{ document.execCommand('copy'); }catch(e2){}
      document.body.removeChild(ta);
      document.getElementById('hancho-copy-msg').textContent = 'コピーしました！';
      setTimeout(function(){ document.getElementById('hancho-copy-msg').textContent = ''; }, 4000);
    }
  };
  copy();

  // LINEリンクを表示
  const lineLink = document.getElementById('hancho-line-link');
  const lineText = encodeURIComponent(_hanchoHan + '班報告\n' + text);
  lineLink.href = 'https://line.me/R/msg/text/?' + lineText;
  lineLink.style.display = '';
}
