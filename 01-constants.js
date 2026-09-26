/* ===== 定数 ===== */
const ABCC=['','A','B','C','D','E'];
const AWt={'':0,A:1,B:.5,C:.2,D:0,E:0};
const td=new Date().toISOString().slice(0,10);

// 班リスト（localStorage＋GAS保存。初期値は空）
let hanList=[]; // [{name:'道家豊光'}, ...]
// HAN は hanList の別名として参照（後方互換）
Object.defineProperty(window,'HAN',{get:()=>hanList});

function saveHanList(){
  try{localStorage.setItem('han_list',JSON.stringify(hanList));}catch(e){}
  gasSave('hanList', hanList);
}

function renderHanTable(){
  const wrap=document.getElementById('han-table-wrap');
  if(!wrap) return;
  if(!hanList.length){
    wrap.innerHTML='<div style="font-size:13px;color:#888;padding:8px 14px">まだ登録されていません</div>';
    return;
  }
  wrap.innerHTML='<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:1px solid #ddd"><th style="text-align:left;padding:5px 8px;color:#888;font-weight:400">班名</th><th style="width:80px"></th></tr></thead><tbody>'
    +hanList.map((h,i)=>`<tr style="border-bottom:1px solid #eee">
      <td style="padding:5px 8px">
        <input value="${h.name}" style="font-size:13px;border:none;border-bottom:1px solid #ddd;width:140px;padding:2px 4px;"
          onchange="renameHan(${i},this.value)">
      </td>
      <td style="padding:5px 4px;text-align:center">
        <button class="btn btn-w" style="font-size:11px;padding:3px 8px" onclick="deleteHan(${i})">削除</button>
      </td>
    </tr>`).join('')
    +'</tbody></table>';
}

function addHan(){
  const name=document.getElementById('cfg-han-name').value.trim();
  if(!name){flash('cfg-han-msg','班名を入力してください');return;}
  if(hanList.find(h=>h.name===name)){flash('cfg-han-msg','同じ班名がすでにあります');return;}
  hanList.push({name});
  saveHanList();
  document.getElementById('cfg-han-name').value='';
  renderHanTable();
  renderKumiTable();
  rebuildAllHanSelects();
  renderHanchoBtnList();
  flash('cfg-han-msg','追加しました');
}

function renameHan(idx, newName){
  newName=newName.trim();
  if(!newName) return;
  const old=hanList[idx].name;
  hanList[idx].name=newName;
  Object.keys(kumiMap).forEach(k=>{ if(kumiMap[k]===old) kumiMap[k]=newName; });
  roster.forEach(m=>{ if(m.han===old) m.han=newName; });
  saveHanList();
  saveKumiMap();
  saveRoster();
  renderHanTable();
  renderKumiTable();
  rebuildAllHanSelects();
  renderHanchoBtnList();
  renderRoster();
}

function deleteHan(idx){
  const name=hanList[idx].name;
  const inUse=roster.some(m=>m.han===name);
  if(inUse && !confirm(`「${name}班」は名簿で使用中のメンバーがいます。\n削除すると該当メンバーの班が空欄になります。続けますか？`)) return;
  if(!inUse && !confirm(`「${name}班」を削除しますか？`)) return;
  hanList.splice(idx,1);
  // kumiMapから参照を削除
  Object.keys(kumiMap).forEach(k=>{ if(kumiMap[k]===name) kumiMap[k]=''; });
  saveHanList();
  saveKumiMap();
  renderHanTable();
  rebuildAllHanSelects();
  renderKumiTable();
}

// 全ての班プルダウンを再構築
function rebuildAllHanSelects(){
  // 設定タブ：組→班の班プルダウン
  const cfgHan=document.getElementById('cfg-kumi-han');
  if(cfgHan) cfgHan.innerHTML='<option value="">班を選択</option>'+hanList.map(h=>'<option value="'+h.name+'">'+h.name+'班</option>').join('');
  buildHanSelects();
  rebuildFpHan();
  renderKumiSelect();
  renderEditKumiSelect();
}

// 集計対象メンバーを roster から動的に構築（組昇順→読み昇順でソート）
function sortedAggTargets(){
  let targets = roster.filter(function(m){ return m.aggTarget; });
  // 班長・副長は自分の許可班のみに絞る
  if(isRestricted()){
    targets = targets.filter(function(m){ return canViewMember(m); });
  }
  targets.sort(function(a, b){
    const ka = (a.kumi||'');
    const kb = (b.kumi||'');
    if(ka < kb) return -1;
    if(ka > kb) return 1;
    const ra = (a.seiK||'') + (a.meiK||'');
    const rb = (b.seiK||'') + (b.meiK||'');
    if(ra < rb) return -1;
    if(ra > rb) return 1;
    return 0;
  });
  return targets;
}
function getAggHan(){
  const targets = sortedAggTargets();
  const hanMap = {};
  const hanOrder = [];
  for(let i = 0; i < targets.length; i++){
    const m = targets[i];
    const h = m.han || '（班未設定）';
    if(!hanMap[h]){ hanMap[h]=[]; hanOrder.push(h); }
    hanMap[h].push(m.sei+(m.mei||''));
  }
  const result = [];
  for(let i = 0; i < hanOrder.length; i++){
    result.push({name: hanOrder[i], members: hanMap[hanOrder[i]]});
  }
  return result;
}
function getAggAllMembers(){
  const targets = sortedAggTargets();
  const result = [];
  for(let i = 0; i < targets.length; i++){
    const m = targets[i];
    result.push({han: m.han||'（班未設定）', name: m.sei+(m.mei||'')});
  }
  return result;
}
