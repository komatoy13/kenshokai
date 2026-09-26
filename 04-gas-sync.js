// ============================================================
// Google Apps Script 連携
// ============================================================
// スマホデバッグ用ログ
const _dbgLogs = [];
function dbgLog(msg){
  _dbgLogs.push(msg);
  const el = document.getElementById('debug-log');
  if(el) el.innerHTML = _dbgLogs.map(function(l){ return '<div>' + l + '</div>'; }).join('');
}

let GAS_URL = '';
try { GAS_URL = localStorage.getItem('gas_url') || ''; } catch(e){}
// URLパラメータにgas=が含まれている場合（班長・副長URL経由）は上書き
(function(){
  try{
    const params = new URLSearchParams(window.location.search);
    const gasFromUrl = params.get('gas');
    if(gasFromUrl){
      GAS_URL = decodeURIComponent(gasFromUrl);
      try{ localStorage.setItem('gas_url', GAS_URL); }catch(e){}
    }
  }catch(e){}
})();


function setGasUrl(url){
  GAS_URL = url.trim();
  try { localStorage.setItem('gas_url', GAS_URL); } catch(e){}
  document.getElementById('gas-url-input').value = GAS_URL;
  if(GAS_URL){ updateSyncBadge('syncing'); gasLoad(); }
  else updateSyncBadge('local');
}

function updateSyncBadge(status, msg){
  const el = document.getElementById('sync-badge');
  if(!el) return;
  const map = {
    local:   {color:'#aaa',  text:'⚪ ローカル'},
    syncing: {color:'#f39c12',text:'🔄 同期中…'},
    synced:  {color:'#27ae60',text:'✅ 同期済'},
    error:   {color:'#e74c3c',text:'❌ エラー'},
  };
  const s = map[status] || map.local;
  el.textContent = s.text + (msg ? ' '+msg : '');
  el.style.color = s.color;
}

async function gasLoad(){
  dbgLog('gasLoad開始 GAS_URL=' + (GAS_URL ? GAS_URL.slice(0,40)+'...' : '空'));
  if(!GAS_URL){ dbgLog('GAS_URL未設定のため中断'); return; }
  updateSyncBadge('syncing');
  try {
    dbgLog('fetch開始...');
    const res = await fetch(GAS_URL+'?t='+Date.now());
    dbgLog('fetch完了 status=' + res.status);
    const json = await res.json();
    if(!json.ok) throw new Error(json.error||'fetch失敗');
    const d = json.data;
    dbgLog('データ取得OK roster件数=' + (d.roster ? d.roster.length : 0));
    if(d.roster)        roster        = d.roster;
    if(d.aggData)       aggData       = d.aggData;
    if(d.aggHistory)    aggHistory    = d.aggHistory;
    if(d.hHist)         hHist         = d.hHist;
    if(d.hPeriod)       hPeriod       = d.hPeriod;
    if(d.fukubokuPlans) fukubokuPlans = d.fukubokuPlans;
    if(d.pendingMembers) pendingMembers = d.pendingMembers;
    if(d.kumiMap)       kumiMap       = d.kumiMap;
    if(d.itemModes)     itemModes     = d.itemModes;
    if(d.hanList)       hanList       = d.hanList;
    if(d.customItems && Array.isArray(d.customItems)){
      d.customItems.forEach(x=>{ if(!items.find(i=>i.id===x.id)) items.push(x); });
    }
    // ローカルにも保存
    const lsMap = {roster:'roster',aggData:'agg_data',aggHistory:'agg_hist',
      hHist:'h_hist',hPeriod:'h_period',fukubokuPlans:'fukuboku_plans',
      kumiMap:'kumi_map',itemModes:'item_modes',hanList:'han_list',
      pendingMembers:'pending_members'};
    Object.entries(lsMap).forEach(([k,lk])=>{ try{if(d[k]) localStorage.setItem(lk,JSON.stringify(d[k]));}catch(e){} });
    initAggData(); rebuildAllHanSelects();
    renderItemChecks(); renderAggTable(); renderAggSummary();
    renderHCards(); renderHList(); renderRoster();
    renderKumiSelect(); renderEditKumiSelect();
    renderHanTable();
    renderPendingList();
    dbgLog('描画完了 ROLE=' + ROLE.role + ' hans=' + ROLE.hans.join(','));
    dbgCheckHan();
    // 班長・副長モードの場合、データロード完了後に制限UIを再適用
    if(isRestricted()){
      applyRoleRestrictions();
      dbgLog('権限制限適用完了');
    }
    updateSyncBadge('synced');
  } catch(err) {
    dbgLog('エラー: ' + err.message);
    updateSyncBadge('error', err.message);
  }
}

// キーを指定してGASに保存（大きいデータは分割送信）
async function gasSaveAsync(gasKey, value){
  if(!GAS_URL) return;
  const str = JSON.stringify(value);
  const CHUNK = 40000; // セルの50000文字制限より小さく
  const chunks = [];
  for(let i = 0; i < str.length; i += CHUNK){
    chunks.push(str.slice(i, i + CHUNK));
  }
  const res = await fetch(GAS_URL, {
    method:'POST',
    redirect:'follow',
    body: JSON.stringify({key:gasKey, chunks:chunks}),
    headers:{'Content-Type':'text/plain'}
  });
  return await res.json();
}

const _syncTimers = {};
function gasSave(gasKey, value){
  if(!GAS_URL) return;
  clearTimeout(_syncTimers[gasKey]);
  updateSyncBadge('syncing');
  _syncTimers[gasKey] = setTimeout(async ()=>{
    try {
      const snapshot = JSON.parse(JSON.stringify(value)); // タイマー内でスナップショット
      await gasSaveAsync(gasKey, snapshot);
      updateSyncBadge('synced');
    } catch(err) { updateSyncBadge('error', err.message); }
  }, 3000);
}
