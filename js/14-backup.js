/* ===== バックアップ・復元 ===== */
function exportBackup(){
  const load = function(key, def){
    try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }catch(e){ return def; }
  };
  const backup = {
    _version: 'kenshokai_v7',
    _exported: td,
    roster:        load('roster', []),
    agg_data:      load('agg_data', {}),
    agg_hist:      load('agg_hist', []),
    h_period:      load('h_period', {}),
    h_hist:        load('h_hist', []),
    fukuboku_plans:load('fukuboku_plans', []),
    kumi_map:      load('kumi_map', {}),
    item_modes:    load('item_modes', {}),
    han_list:      load('han_list', []),
    custom_items:  load('custom_items', [])
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kenshokai_backup_' + td.replace(/-/g,'') + '.json';
  a.click();
  URL.revokeObjectURL(url);
  flash('backup-msg', 'エクスポートしました');
}

function importBackup(input){
  const file = input.files[0];
  if(!file) return;
  if(!confirm('バックアップから復元します。現在のデータはすべて上書きされます。よろしいですか？')){
    input.value = ''; return;
  }
  const reader = new FileReader();
  reader.onload = function(e){
    try{
      const backup = JSON.parse(e.target.result);
      // localStorageに書き込み
      const lsKeyMap = {
        roster:'roster', agg_data:'agg_data', agg_hist:'agg_hist',
        h_period:'h_period', h_hist:'h_hist', fukuboku_plans:'fukuboku_plans',
        kumi_map:'kumi_map', item_modes:'item_modes', han_list:'han_list', custom_items:'custom_items'
      };
      const lsKeys = Object.keys(lsKeyMap);
      for(let i = 0; i < lsKeys.length; i++){
        const bk = lsKeys[i];
        if(backup[bk] !== undefined){
          try{ localStorage.setItem(lsKeyMap[bk], JSON.stringify(backup[bk])); }catch(err){}
        }
      }
      // グローバル変数に反映
      if(backup.roster)         roster         = backup.roster;
      if(backup.agg_data)       aggData        = backup.agg_data;
      if(backup.agg_hist)       aggHistory     = backup.agg_hist;
      if(backup.h_period)       hPeriod        = backup.h_period;
      if(backup.h_hist)         hHist          = backup.h_hist;
      if(backup.fukuboku_plans) fukubokuPlans  = backup.fukuboku_plans;
      if(backup.kumi_map)       kumiMap        = backup.kumi_map;
      if(backup.item_modes)     itemModes      = backup.item_modes;
      if(backup.han_list)       hanList        = backup.han_list;
      if(backup.custom_items && Array.isArray(backup.custom_items)){
        for(let i = 0; i < backup.custom_items.length; i++){
          const ci = backup.custom_items[i];
          if(!items.find(function(x){ return x.id === ci.id; })) items.push(ci);
        }
      }
      // GASに全キーを同期
      gasSave('roster', roster);
      gasSave('aggData', aggData);
      gasSave('aggHistory', aggHistory);
      gasSave('hPeriod', hPeriod);
      gasSave('hHist', hHist);
      gasSave('fukubokuPlans', fukubokuPlans);
      gasSave('kumiMap', kumiMap);
      gasSave('itemModes', itemModes);
      gasSave('hanList', hanList);
      // 画面再描画
      if(hPeriod.start){ sv('h-start', hPeriod.start); sv('h-end', hPeriod.end); }
      initAggData();
      rebuildAllHanSelects();
      renderItemChecks(); renderAggTable(); renderAggSummary();
      renderHCards(); renderHList(); renderRoster();
      renderKumiSelect(); renderEditKumiSelect();
      renderKumiTable(); renderHanTable();
      renderKumiNameSelect();
      showMsg('backup-msg', '復元しました', 'ok');
    }catch(err){
      showMsg('backup-msg', '復元エラー：' + err.message, 'err');
    }
    input.value = '';
  };
  reader.readAsText(file);
}
