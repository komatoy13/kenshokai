/* ===== 班長データ取り込み（集計タブ） ===== */
function importHanchoData(){
  const raw = (document.getElementById('hancho-import-text').value || '').trim();
  if(!raw){ flash('hancho-import-msg', 'データを貼り付けてください'); return; }
  try{
    let json;
    if(raw.startsWith('HANCHO:')){
      const b64 = raw.slice(7);
      json = decodeURIComponent(escape(atob(b64)));
    } else {
      json = raw;
    }
    const payload = JSON.parse(json);
    if(!payload.han || !payload.data){ throw new Error('データ形式が不正です'); }
    const hanName = payload.han;
    const srcData = payload.data;
    let count = 0;
    const keys = Object.keys(srcData);
    for(let ki = 0; ki < keys.length; ki++){
      const k = keys[ki];
      // キーが指定班に属するものか確認
      if(!k.startsWith(hanName + '__')) continue;
      if(!aggData[k]) aggData[k] = {};   // ガード
      const itemIds = Object.keys(srcData[k]);
      for(let ii = 0; ii < itemIds.length; ii++){
        const itemId = itemIds[ii];
        const src = srcData[k][itemId];
        if(!aggData[k][itemId]){
          const item = items.find(function(x){ return x.id === itemId; });
          const isNum = item && (item.type === 'kikanshi' || item.type === 'kuyou');
          aggData[k][itemId] = {grab: '', result: isNum ? 0 : false, confirmed: false};
        }
        if(src.grab !== undefined) aggData[k][itemId].grab = src.grab;
        if(src.result !== undefined) aggData[k][itemId].result = src.result;
        count++;
      }
    }
    saveResult();
    renderAggTable();
    renderAggSummary();
    document.getElementById('hancho-import-text').value = '';
    flash('hancho-import-msg', hanName + '班のデータを取り込みました（' + count + '件）');
  } catch(err){
    flash('hancho-import-msg', 'エラー：' + err.message);
  }
}
