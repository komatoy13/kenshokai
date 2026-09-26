/* ===== 起動 ===== */
function init(){
  const load=(key,def)=>{try{const v=localStorage.getItem(key);return v?JSON.parse(v):def;}catch(e){return def;}};
  aggHistory=load('agg_hist',[]);
  roster=load('roster',[]);
  hPeriod=load('h_period',{start:'',end:''});
  hHist=load('h_hist',[]);
  fukubokuPlans=load('fukuboku_plans',[]);
  kumiMap=load('kumi_map',{});
  hanList=load('han_list',[]);
  pendingMembers=load('pending_members',[]);

  // aggData: localStorageに保存済みのデータを読み込み、なければrosterから初期化
  const savedAggData = load('agg_data', null);
  if(savedAggData){
    aggData = savedAggData;
    // rosterに新しいメンバーが追加されている場合は補完
    initAggData();
  } else {
    initAggData();
  }

  document.getElementById('agg-date').value=td;
  document.getElementById('h-rdate') && (document.getElementById('h-rdate').value=td);
  document.getElementById('r-nyushin') && (document.getElementById('r-nyushin').value=td);

  // カスタム項目を復元
  const customItems=load('custom_items',[]);
  customItems.forEach(ci=>{
    if(!items.find(x=>x.id===ci.id)){
      items.push(ci);
      getAggAllMembers().forEach(m=>{
        const k=memberKey(m.han,m.name);
        if(!aggData[k]) aggData[k]={};
        if(!aggData[k][ci.id]) aggData[k][ci.id]={grab:'',result:ci.type==='grab_num'?0:false};
      });
    }
  });

  if(hPeriod.start){sv('h-start',hPeriod.start);sv('h-end',hPeriod.end);}
  buildHanSelects();
  renderItemChecks();
  renderAggTable();
  renderAggSummary();
  renderHCards();renderHList();

  // 全ての班プルダウンを初期化
  rebuildAllHanSelects();
  // 組プルダウン初期化
  renderKumiSelect();
  // 編集モーダルの組プルダウン初期化
  renderEditKumiSelect();

  // GAS URL表示と同期状態初期化
  const gasInput = document.getElementById('gas-url-input');
  if(gasInput) gasInput.value = GAS_URL;
  updateSyncBadge(GAS_URL ? 'syncing' : 'local');
  dbgLog('init開始 ROLE=' + ROLE.role + ' han=' + ROLE.han + ' GAS_URL=' + (GAS_URL ? '設定済' : '未設定'));
  if(GAS_URL){
    dbgLog('gasLoad呼び出し');
    gasLoad();
  } else {
    dbgLog('GAS_URL未設定 gasLoad未実行');
  }

  // ヘッダーボタンのイベント委譲（data属性方式）
  document.addEventListener('click',function(e){ if(!e.target.closest('#agg-thead')) return;
    const btn=e.target.closest('[data-action]');
    if(!btn)return;
    const action=btn.dataset.action;
    const id=btn.dataset.id;
    if(action==='finalize') finalizeItem(id);
    else if(action==='mode') setItemMode(id,btn.dataset.val);
  });

  // 班長モード判定
  initHanchoMode();
  // 設定タブ班長URL描画
  renderHanchoBtnList();
  // 組名ドロップダウン初期化
  renderKumiNameSelect();
}
init();
