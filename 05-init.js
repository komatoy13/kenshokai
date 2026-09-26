/* ===== 初期化 ===== */
function memberKey(han,name){return han+'__'+name;}
function initAggData(){
  getAggAllMembers().forEach(m=>{
    const k=memberKey(m.han,m.name);
    if(!aggData[k]) aggData[k]={};
    items.forEach(item=>{
      if(!aggData[k][item.id]){
        const isNum=['kikanshi','kuyou'].includes(item.type);
        aggData[k][item.id]={grab:'', result: isNum ? 0 : false, confirmed: false};
      }
    });
  });
}

// 班ドロップダウンを生成（roster動的）
function buildHanSelects(){
  let aggHan = getAggHan();
  // 班長・副長は自分の許可班のみ表示
  if(isRestricted()){
    aggHan = aggHan.filter(function(h){ return ROLE.hans.indexOf(h.name) >= 0; });
  }
  let opts = '';
  // 総長・副長のみ「全班まとめ」を表示
  if(isSocho() || isFukucho()){
    opts += '<option value="__all__">全班まとめ</option>';
  }
  for(let i = 0; i < aggHan.length; i++){
    opts += '<option value="' + aggHan[i].name + '">' + aggHan[i].name + '班</option>';
  }
  document.getElementById('agg-han').innerHTML = opts;
}
