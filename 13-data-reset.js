/* ===== データ管理（リセット） ===== */
function resetRoster(){
  if(!confirm('名簿を全削除します。\n集計対象の設定もすべて消えます。\nよろしいですか？')) return;
  roster=[];
  saveRoster();
  initAggData();
  buildHanSelects();
  rebuildFpHan();
  renderRoster();
  renderHCards();renderHList();
  renderAggTable();renderAggSummary();
  showMsg('reset-msg','名簿を削除しました','ok');
}

function resetAggData(){
  if(!confirm('集計データ（掴み・結果・確定・履歴）をリセットします。\n名簿と組設定は残ります。\nよろしいですか？')) return;
  aggData={};
  aggHistory=[];
  itemModes={};
  try{localStorage.setItem('agg_data','{}');}catch(e){}
  try{localStorage.setItem('agg_hist','[]');}catch(e){}
  try{localStorage.setItem('item_modes','{}');}catch(e){}
  gasSave('aggData',{});
  gasSave('aggHistory',[]);
  gasSave('itemModes',{});
  initAggData();
  renderItemChecks();
  renderAggTable();renderAggSummary();
  showMsg('reset-msg','集計データをリセットしました','ok');
}

function resetAllData(){
  if(!confirm('【警告】名簿・集計・折伏成果・折伏予定・組設定を含む\nすべてのデータを初期化します。\n本当によろしいですか？')) return;
  if(!confirm('最終確認：この操作は取り消せません。実行しますか？')) return;
  roster=[]; aggData={}; aggHistory=[]; hHist=[]; hPeriod={start:'',end:''};
  fukubokuPlans=[]; kumiMap={}; itemModes={};
  const keys=['roster','agg_data','agg_hist','h_hist','h_period','fukuboku_plans','kumi_map','item_modes','custom_items'];
  keys.forEach(k=>{try{localStorage.removeItem(k);}catch(e){}});
  ['roster','aggData','aggHistory','hHist','hPeriod','fukubokuPlans','kumiMap','itemModes'].forEach(k=>gasSave(k, k.includes('Map')||k==='aggData'||k==='itemModes'?{}:[]));
  initAggData();
  buildHanSelects();rebuildFpHan();
  renderItemChecks();renderAggTable();renderAggSummary();
  renderHCards();renderHList();
  renderRoster();
  renderKumiSelect();renderEditKumiSelect();
  renderKumiTable();
  showMsg('reset-msg','すべてのデータを初期化しました','ok');
}
