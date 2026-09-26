/* ===== 集計タブ ===== */

// 項目チェックボックスを描画
function renderItemChecks(){
  const el=document.getElementById('item-checks');
  el.innerHTML=items.map(item=>{
    const active=activeItemIds.includes(item.id);
    return`<div class="ic ${active?'active':''}" onclick="toggleItem('${item.id}')">${item.label}</div>`;
  }).join('');
}

function toggleItem(id){
  if(activeItemIds.includes(id)){
    activeItemIds=activeItemIds.filter(x=>x!==id);
  } else {
    activeItemIds.push(id);
    const item=items.find(x=>x.id===id);
    getAggAllMembers().forEach(m=>{
      const k=memberKey(m.han,m.name);
      if(!aggData[k]) aggData[k]={};
      if(!aggData[k][id]) aggData[k][id]={grab:'',result:item.type==='grab_num'?0:false};
    });
  }
  renderItemChecks();
  renderAggTable();
  renderAggSummary();
}

function addCustomItem(){
  const name=document.getElementById('custom-name').value.trim();
  const type=document.getElementById('custom-type').value;
  if(!name){alert('項目名を入力してください');return;}
  const id='custom_'+Date.now();
  const newItem={id,label:name,type,accumulate:type==='grab_check'&&confirm(`「${name}」は推移蓄積型にしますか？\nOK=推移蓄積（日曜勤行・総部集会と同じ）\nキャンセル=最終確定型`)};
  items.push(newItem);
  getAggAllMembers().forEach(m=>{
    const k=memberKey(m.han,m.name);
    if(!aggData[k]) aggData[k]={};
    aggData[k][id]={grab:'',result:newItem.type==='grab_num'?0:false};
  });
  document.getElementById('custom-name').value='';
  saveItems();
  renderItemChecks();
}

// 項目ごとのモード切替
function setItemMode(itemId, m){
  itemModes[itemId]=m;
  renderAggTable();
  renderAggSummary();
}

function getItemMode(itemId){
  if(itemModes[itemId]) return itemModes[itemId];
  const item=items.find(x=>x.id===itemId);
  if(!item) return 'grab';
  if(item.type==='confirm') return 'confirm';
  return 'grab';
}

function finalizeItem(itemId){
  getAggAllMembers().forEach(m=>{
    const k=memberKey(m.han,m.name);
    if(!aggData[k]) aggData[k]={};
    if(!aggData[k][itemId]) aggData[k][itemId]={grab:'',result:false,confirmed:false};
    aggData[k][itemId].confirmed=true;
  });
  itemModes[itemId]='confirmed';
  renderAggTable(); renderAggSummary();
  flash('agg-msg','確定しました。「確定保存」で記録してリセットします。');
}

// 集計テーブル描画
function renderAggTable(){
  if(!activeItemIds.length){
    document.getElementById('agg-thead').innerHTML='';
    document.getElementById('agg-tbody').innerHTML='<tr><td style="padding:14px;color:#888;font-size:13px">上の項目から集計したいものを選んでください</td></tr>';
    return;
  }
  const hanVal=document.getElementById('agg-han').value;
  const aggHan = getAggHan();
  const targetHans=hanVal==='__all__'?aggHan:aggHan.filter(h=>h.name===hanVal);

  // ヘッダー（項目ごとにモード切替ボタン）
  const selItems=activeItemIds.map(id=>items.find(x=>x.id===id)).filter(Boolean);
  // ヘッダーをdata属性方式で生成（テンプレートリテラルのネスト回避）
  let theadRow = '<tr><th class="name-col">氏名</th>';
  selItems.forEach(function(item){
    const m=getItemMode(item.id);
    let btns='';
    if(item.type==='confirm'){
      if(m==='confirmed'){
        btns='<span style="font-size:10px;color:#1a8f5a;font-weight:500">✓確定済</span>';
      } else {
        btns='<button data-action="finalize" data-id="'+item.id+'" style="font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid #c0392b;cursor:pointer;background:#fff;color:#c0392b;font-weight:500">確定</button>';
      }
    } else {
      const bgG=m==='grab'?'#1a6bbf':'#f0f0f0';
      const fgG=m==='grab'?'#fff':'#666';
      const bgR=m==='result'?'#1a6bbf':'#f0f0f0';
      const fgR=m==='result'?'#fff':'#666';
      btns='<button data-action="mode" data-id="'+item.id+'" data-val="grab" style="font-size:10px;padding:1px 5px;border-radius:4px;border:1px solid #ccc;cursor:pointer;background:'+bgG+';color:'+fgG+'">掴み</button>'
          +'<button data-action="mode" data-id="'+item.id+'" data-val="result" style="font-size:10px;padding:1px 5px;border-radius:4px;border:1px solid #ccc;cursor:pointer;background:'+bgR+';color:'+fgR+'">結果</button>';
    }
    theadRow+='<th style="min-width:80px"><div>'+item.label+'</div><div style="display:flex;justify-content:center;gap:3px;margin-top:3px;flex-wrap:wrap;">'+btns+'</div></th>';
  });
  theadRow+='</tr>';
  document.getElementById('agg-thead').innerHTML=theadRow;

  // ボディ
  let tbody='';
  targetHans.forEach(h=>{
    // 班ヘッダー行（全班表示時のみ）
    if(hanVal==='__all__'){
      tbody+=`<tr><td class="name-cell" colspan="${selItems.length+1}" style="background:#fafafa;font-size:11px;font-weight:500;color:#888;padding:4px 10px">${h.name}班</td></tr>`;
    }
    h.members.forEach(m=>{
      const k=memberKey(h.name,m);
      tbody+=`<tr><td class="name-cell">${m}</td>`;
      selItems.forEach(item=>{
        const isNum=['kikanshi','kuyou'].includes(item.type);
        const d=aggData[k][item.id]||{grab:'',result:isNum?0:false,confirmed:false};
        const imode=getItemMode(item.id);

        if(item.type==='confirm'){
          // 総幹部会: チェックのみ（確定済みなら色を変える）
          const c=!!d.result;
          const isDone=imode==='confirmed';
          tbody+=`<td><button class="ckb ${c?'on':''}" onclick="${isDone?'':'togAgg'}('${k}','${item.id}')" style="${isDone?'opacity:0.6;cursor:default':''}">${c?'✓':'　'}</button></td>`;
        } else if(imode==='grab'){
          const s=d.grab||'';
          tbody+=`<td><button class="abcb ${s?'s-'+s:'s-e'}" onclick="cycAgg('${k}','${item.id}')">${s||'―'}</button></td>`;
        } else {
          // 結果モード
          const gs=d.grab||'';
          const clr={'A':'#1D9E75','B':'#639922','C':'#BA7517','D':'#888','E':'#E24B4A'};
          const gbadge=gs
            ?`<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font-size:10px;font-weight:500;margin-right:3px;background:${clr[gs]};color:#fff;opacity:0.85">${gs}</span>`
            :'<span style="display:inline-block;width:18px;margin-right:3px"></span>';
          if(isNum){
            const v=d.result||0;
            const step=item.type==='kuyou'?0.1:1;
            tbody+=`<td>${gbadge}<div class="numcell" style="display:inline-flex">
              <button class="numb" onclick="adjNum('${k}','${item.id}',${-step})">－</button>
              <span class="numv">${item.type==='kuyou'?parseFloat(v).toFixed(1):v}</span>
              <button class="numb" onclick="adjNum('${k}','${item.id}',${step})">＋</button>
            </div></td>`;
          } else {
            const c=!!d.result;
            tbody+=`<td><div style="display:inline-flex;align-items:center">${gbadge}<button class="ckb ${c?'on':''}" onclick="togAgg('${k}','${item.id}')">${c?'✓':'　'}</button></div></td>`;
          }
        }
      });
      tbody+='</tr>';
    });
    // 班小計行
    if(hanVal==='__all__'||targetHans.length===1){
      tbody+=`<tr class="summary-row"><td class="name-cell">　小計</td>`;
      selItems.forEach(item=>{
        const hanMembers=h.members;
        const imode=getItemMode(item.id);
        if(imode==='grab'){
          const total=hanMembers.reduce((s,m)=>s+(AWt[aggData[memberKey(h.name,m)][item.id]?.grab]||0),0);
          tbody+=`<td>${total.toFixed(1)}</td>`;
        } else {
          if(item.type==='grab_num'){
            const total=hanMembers.reduce((s,m)=>s+(aggData[memberKey(h.name,m)][item.id]?.result||0),0);
            tbody+=`<td>${total}</td>`;
          } else {
            const total=hanMembers.filter(m=>!!aggData[memberKey(h.name,m)][item.id]?.result).length;
            tbody+=`<td>${total}</td>`;
          }
        }
      });
      tbody+='</tr>';
    }
  });

  // 全体合計行
  if(hanVal==='__all__'){
    tbody+=`<tr class="summary-row"><td class="name-cell" style="font-weight:700">合計</td>`;
    selItems.forEach(item=>{
      const imode=getItemMode(item.id);
      if(imode==='grab'){
        const total=getAggAllMembers().reduce((s,m)=>s+(AWt[aggData[memberKey(m.han,m.name)][item.id]?.grab]||0),0);
        tbody+=`<td style="font-weight:700">${total.toFixed(1)}</td>`;
      } else {
        if(item.type==='grab_num'){
          const total=getAggAllMembers().reduce((s,m)=>s+(aggData[memberKey(m.han,m.name)][item.id]?.result||0),0);
          tbody+=`<td style="font-weight:700">${total}</td>`;
        } else {
          const total=getAggAllMembers().filter(m=>!!aggData[memberKey(m.han,m.name)][item.id]?.result).length;
          tbody+=`<td style="font-weight:700">${total}</td>`;
        }
      }
    });
    tbody+='</tr>';
  }
  document.getElementById('agg-tbody').innerHTML=tbody;
}

// サマリーカード
function renderAggSummary(){
  if(!activeItemIds.length){document.getElementById('agg-scards').innerHTML='';return;}
  const selItems=activeItemIds.map(id=>items.find(x=>x.id===id)).filter(Boolean);
  let html='';
  selItems.forEach(item=>{
    const imode=getItemMode(item.id);
    let grabW=0, resultCount=0, resultAmt=0;
    getAggAllMembers().forEach(m=>{
      const d=aggData[memberKey(m.han,m.name)][item.id]||{};
      grabW+=AWt[d.grab]||0;
      if(item.type==='kuyou'){
        if(d.result>0) resultCount++;
        resultAmt+=parseFloat(d.result)||0;
      } else if(item.type==='kikanshi'){
        resultCount+=parseInt(d.result)||0;
      } else if(d.result||d.confirmed){
        resultCount++;
      }
    });
    // 掴みフェーズの人数（御供養・機関紙はABC加重）
    if(item.type==='kuyou'){
      if(imode==='grab'){
        html+=`<div class="sc"><div class="sc-l">${item.label}</div><div class="sc-v">${grabW.toFixed(1)}</div><div class="sc-s">掴み人数計</div></div>`;
      } else {
        html+=`<div class="sc"><div class="sc-l">${item.label} 人数</div><div class="sc-v">${resultCount}</div><div class="sc-s">結果</div></div>`;
        html+=`<div class="sc"><div class="sc-l">${item.label} 金額</div><div class="sc-v">${resultAmt.toFixed(1)}</div><div class="sc-s">万円</div></div>`;
      }
    } else if(item.type==='kikanshi'){
      if(imode==='grab'){
        html+=`<div class="sc"><div class="sc-l">${item.label}</div><div class="sc-v">${grabW.toFixed(1)}</div><div class="sc-s">掴み計</div></div>`;
      } else {
        html+=`<div class="sc"><div class="sc-l">${item.label}</div><div class="sc-v">${resultCount}</div><div class="sc-s">部数</div></div>`;
      }
    } else if(item.type==='confirm'){
      const total=getAggAllMembers().filter(m=>!!aggData[memberKey(m.han,m.name)][item.id]?.result).length;
      html+=`<div class="sc"><div class="sc-l">${item.label}</div><div class="sc-v">${total}</div><div class="sc-s">${imode==='confirmed'?'確定済':'集計中'}</div></div>`;
    } else {
      if(imode==='grab'){
        html+=`<div class="sc"><div class="sc-l">${item.label}</div><div class="sc-v">${grabW.toFixed(1)}</div><div class="sc-s">掴み計</div></div>`;
      } else {
        html+=`<div class="sc"><div class="sc-l">${item.label}</div><div class="sc-v">${resultCount}</div><div class="sc-s">結果</div></div>`;
      }
    }
  });
  document.getElementById('agg-scards').innerHTML=html;
}

function saveAggData(){
  try{ localStorage.setItem('agg_data', JSON.stringify(aggData)); }catch(e){}
  gasSave('aggData', aggData);
}

function cycAgg(k,itemId){
  if(!aggData[k]) aggData[k]={};
  if(!aggData[k][itemId]) aggData[k][itemId]={grab:'',result:false};
  const cur=aggData[k][itemId].grab||'';
  aggData[k][itemId].grab=ABCC[(ABCC.indexOf(cur)+1)%ABCC.length];
  renderAggTable(); renderAggSummary();
  saveAggData();
}
function togAgg(k,itemId){
  if(!aggData[k]) aggData[k]={};
  if(!aggData[k][itemId]) aggData[k][itemId]={grab:'',result:false};
  aggData[k][itemId].result=!aggData[k][itemId].result;
  renderAggTable(); renderAggSummary();
  saveAggData();
}
function adjNum(k,itemId,delta){
  if(!aggData[k]) aggData[k]={};
  if(!aggData[k][itemId]) aggData[k][itemId]={grab:'',result:0};
  aggData[k][itemId].result=Math.max(0,(aggData[k][itemId].result||0)+delta);
  renderAggTable(); renderAggSummary();
  saveAggData();
}

// 掴み保存（リセットなし、上書き）

// 結果保存（履歴に追加・同日は追記マージ、個人別記録も同時に保存）
function saveResult(){
  const date=document.getElementById('agg-date').value;
  if(!date){flash('agg-msg','日付を選んでください');return;}
  // 対象：結果モードの項目 + 確定済み項目
  const targetIds=activeItemIds.filter(id=>{
    const item=items.find(x=>x.id===id);if(!item)return false;
    if(item.type==='confirm') return getItemMode(id)==='confirmed';
    return getItemMode(id)==='result';
  });
  if(!targetIds.length){flash('agg-msg','結果モードまたは確定済みの項目がありません');return;}
  const summary={};
  // 個人別記録（分析タブ用）：氏名ごとに掴み・結果のスナップショットを残す
  const membersSnap={};
  getAggAllMembers().forEach(m=>{
    const k=memberKey(m.han,m.name);
    const rec={han:m.han,name:m.name};
    targetIds.forEach(id=>{
      const d=(aggData[k]&&aggData[k][id])||{};
      rec[id]={grab:d.grab||'',result:(d.result!==undefined?d.result:'')};
    });
    membersSnap[k]=rec;
  });
  targetIds.forEach(id=>{
    const item=items.find(x=>x.id===id);if(!item)return;
    if(item.type==='confirm'){
      const count=getAggAllMembers().filter(m=>!!aggData[memberKey(m.han,m.name)][id]?.result).length;
      summary[id]={label:item.label,type:item.type,count};
    } else if(item.type==='kuyou'){
      let count=0,amt=0,grabW=0;
      getAggAllMembers().forEach(m=>{
        const d=aggData[memberKey(m.han,m.name)][id]||{};
        grabW+=AWt[d.grab]||0;
        if(d.result>0){count++;amt+=parseFloat(d.result)||0;}
      });
      summary[id]={label:item.label,type:item.type,count,amt:parseFloat(amt.toFixed(1)),grabW:parseFloat(grabW.toFixed(1))};
    } else if(item.type==='kikanshi'){
      let units=0,grabW=0;
      getAggAllMembers().forEach(m=>{
        const d=aggData[memberKey(m.han,m.name)][id]||{};
        grabW+=AWt[d.grab]||0;
        units+=parseInt(d.result)||0;
      });
      summary[id]={label:item.label,type:item.type,units,grabW:parseFloat(grabW.toFixed(1))};
    } else {
      let count=0,grabW=0;
      getAggAllMembers().forEach(m=>{
        const d=aggData[memberKey(m.han,m.name)][id]||{};
        grabW+=AWt[d.grab]||0;
        if(d.result) count++;
      });
      summary[id]={label:item.label,type:item.type,count,grabW:parseFloat(grabW.toFixed(1))};
    }
  });
  const i=aggHistory.findIndex(e=>e.date===date);
  if(i>=0){
    // 同じ日付が既にある場合は上書きせず追記マージ（項目単位・氏名単位）
    const ex=aggHistory[i];
    ex.summary=Object.assign({},ex.summary,summary);
    ex.members=ex.members||{};
    Object.keys(membersSnap).forEach(k=>{
      ex.members[k]=Object.assign({},ex.members[k],membersSnap[k]);
    });
  } else {
    aggHistory.push({date,summary,members:membersSnap});
  }
  aggHistory.sort((a,b)=>a.date>b.date?-1:1);
  try{localStorage.setItem('agg_hist',JSON.stringify(aggHistory));}catch(e){}
  gasSave('aggHistory', aggHistory);
  flash('agg-msg','保存しました');
  renderAggHist_ifOpen();
}

// リセット
// ・掴みモードの項目：何もしない
// ・結果モードの項目：result + grab をリセット（ABCが復活しないよう）、モードは掴みに戻す
// ・confirm型（総幹部会）：確定済み(confirmed)のときだけリセット。未確定はそのまま
function resetResult(){
  if(!confirm('リセットします。よろしいですか？'))return;
  activeItemIds.forEach(function(id){
    const item=items.find(function(x){return x.id===id;});
    if(!item)return;
    const mode=getItemMode(id);

    if(item.type==='confirm'){
      // 総幹部会：確定済みのときだけリセット
      if(mode==='confirmed'){
        getAggAllMembers().forEach(function(mem){
          const k=memberKey(mem.han,mem.name);
          if(!aggData[k]||!aggData[k][id])return;
          aggData[k][id].result=false;
          aggData[k][id].confirmed=false;
        });
        delete itemModes[id];
      }
      // 未確定（confirm中）はリセットしない
    } else if(mode==='result'){
      // 結果モード：result と grab 両方リセット、掴みモードに戻す
      getAggAllMembers().forEach(function(mem){
        const k=memberKey(mem.han,mem.name);
        if(!aggData[k]||!aggData[k][id])return;
        const d=aggData[k][id];
        d.grab='';
        d.result=(item.type==='kikanshi'||item.type==='kuyou')?0:false;
        d.confirmed=false;
      });
      delete itemModes[id];
    }
    // 掴みモード（grab）は何もしない
  });
  flash('agg-msg','リセットしました');
  renderAggTable();
  renderAggSummary();
}

function renderAggHist_ifOpen(){
  if(aggHistOpen) renderAggHist();
}


function toggleAggHist(){
  aggHistOpen=!aggHistOpen;
  document.getElementById('agg-hist-area').classList.toggle('open',aggHistOpen);
  document.getElementById('agg-hl').textContent=(aggHistOpen?'▾':'▸')+' 過去の記録を見る';
  if(aggHistOpen) renderAggHist();
}

function renderAggHist(){
  const el=document.getElementById('agg-hist-area');
  if(!aggHistory.length){el.innerHTML='<div style="font-size:13px;color:#888">まだ記録がありません</div>';return;}
  let h=`<table class="htbl"><thead><tr><th>日付</th><th>項目</th><th>結果</th></tr></thead><tbody>`;
  aggHistory.forEach(e=>{
    const entries=Object.entries(e.summary||{});
    if(!entries.length) return;
    entries.forEach(([id,s],si)=>{
      let resultStr='';
      if(s.type==='confirm') resultStr=`${s.count}人`;
      else if(s.type==='kuyou') resultStr=`${s.count}人 / ${s.amt}万円`;
      else if(s.type==='kikanshi') resultStr=`${s.units}部`;
      else resultStr=`${s.count}人`;
      h+=`<tr>
        ${si===0?`<td rowspan="${entries.length}" style="vertical-align:top;white-space:nowrap">${e.date}</td>`:''}
        <td>${s.label}</td><td>${resultStr}</td>
      </tr>`;
    });
  });
  el.innerHTML=h+'</tbody></table>';
}
