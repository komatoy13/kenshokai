/* ===== 仮登録（班長・副長から支隊長への申請） ===== */
function savePendingMembers(){
  try{ localStorage.setItem('pending_members', JSON.stringify(pendingMembers)); }catch(e){}
  gasSave('pendingMembers', pendingMembers);
}

function pendingRegMbr(){
  const sei = (document.getElementById('r-sei').value||'').trim();
  if(!sei){ showMsg('r-msg','姓は必須です','err'); return; }
  const minyushin = document.getElementById('r-minyushin').checked;
  const pending = {
    id: 'pending_' + Date.now(),
    sei, mei: (document.getElementById('r-mei').value||'').trim(),
    seiK: gv('r-sk'), meiK: gv('r-mk'),
    pref: gv('r-pref'), city: gv('r-city'), addr: gv('r-addr'),
    tel: gv('r-tel').replace(/[-ー－]/g,''),
    tel2: gv('r-tel2').replace(/[-ー－]/g,''),
    birth: gv('r-birth') || '',
    kumi: document.getElementById('r-kumi').value,
    han: document.getElementById('r-han').value,
    shokai: gv('r-shokai'),
    nyushin: minyushin ? '' : normalizeDate(gv('r-nyushin')),
    minyushin,
    comment: gv('r-comment')||'',
    appliedBy: ROLE.han + (isHancho() ? '班長' : '班副長'),
    appliedAt: td,
  };
  pendingMembers.push(pending);
  savePendingMembers();
  showMsg('r-msg', '仮登録しました。支隊長の承認をお待ちください。', 'ok');
  clearReg();
}

function renderPendingList(){
  const sec = document.getElementById('pending-section');
  const listEl = document.getElementById('pending-list');
  if(!sec || !listEl) return;
  if(isSocho() && pendingMembers.length > 0){
    sec.style.display = '';
  } else {
    sec.style.display = 'none';
    return;
  }
  let html = '';
  for(let i = 0; i < pendingMembers.length; i++){
    const p = pendingMembers[i];
    html += '<div style="padding:10px 14px;border-bottom:1px solid #eee;">'
      + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">'
      + '<span style="font-weight:500;font-size:14px;">' + p.sei + (p.mei||'') + '</span>'
      + '<span style="font-size:11px;color:#888;">' + (p.kumi||'') + ' ' + (p.han ? p.han+'班':'') + '</span>'
      + '<span style="font-size:11px;color:#888;">申請：' + p.appliedBy + '（' + p.appliedAt + '）</span>'
      + '</div>'
      + '<div style="font-size:12px;color:#666;margin-top:3px;">'
      + (p.nyushin ? '入信日：' + p.nyushin + '　' : '未入信　')
      + (p.tel ? '📞' + p.tel + '　' : '')
      + (p.pref||'') + (p.city||'') + (p.addr||'')
      + '</div>'
      + '<div style="display:flex;gap:8px;margin-top:6px;">'
      + '<button class="btn btn-p" style="font-size:12px;padding:4px 14px;" data-approve-id="' + p.id + '">✅ 承認して名簿に追加</button>'
      + '<button class="btn btn-w" style="font-size:12px;padding:4px 14px;" data-reject-id="' + p.id + '">❌ 却下</button>'
      + '</div>'
      + '</div>';
  }
  listEl.innerHTML = html || '<div style="padding:10px 14px;font-size:13px;color:#888">承認待ちなし</div>';
}

// 承認・却下のイベント委譲
document.addEventListener('click', function(e){
  const approveBtn = e.target.closest('[data-approve-id]');
  if(approveBtn){
    const id = approveBtn.dataset.approveId;
    const idx = pendingMembers.findIndex(function(p){ return p.id === id; });
    if(idx < 0) return;
    const p = pendingMembers[idx];
    // 正式に名簿に追加
    roster.push({
      id: Date.now(),
      sei: p.sei, mei: p.mei||'',
      seiK: p.seiK||'', meiK: p.meiK||'',
      pref: p.pref||'', city: p.city||'', addr: p.addr||'',
      tel: p.tel||'', tel2: p.tel2||'',
      birth: p.birth||'',
      kumi: p.kumi||'', han: p.han||'',
      shokai: p.shokai||'',
      nyushin: p.nyushin||'',
      minyushin: !!p.minyushin,
      comment: p.comment||'',
      commentUpdated: '',
      aggTarget: false,
      hossen: false,
    });
    pendingMembers.splice(idx, 1);
    saveRoster();
    savePendingMembers();
    renderHCards(); renderHList();
    renderPendingList();
    return;
  }
  const rejectBtn = e.target.closest('[data-reject-id]');
  if(rejectBtn){
    const id = rejectBtn.dataset.rejectId;
    if(!confirm('この仮登録を却下しますか？')) return;
    pendingMembers = pendingMembers.filter(function(p){ return p.id !== id; });
    savePendingMembers();
    renderPendingList();
    return;
  }
});

function fpUpdateMembers(){
  const hanName = document.getElementById('fp-han').value;
  const sel = document.getElementById('fp-member');
  if(!hanName){ sel.innerHTML='<option value="">― 選択 ―</option>'; return; }
  const han = getAggHan().find(h=>h.name===hanName);
  sel.innerHTML = '<option value="">― 選択 ―</option>' + (han?han.members.map(m=>`<option value="${m}">${m}</option>`).join(''):'');
}

function addFukubokuPlan(){
  const date = document.getElementById('fp-date').value;
  const time = document.getElementById('fp-time').value;
  const han  = document.getElementById('fp-han').value;
  const member = document.getElementById('fp-member').value;
  if(!date||!han||!member){ flash('fp-msg','日にち・班・班員を入力してください'); return; }
  const plan = { id:Date.now(), date, time, han, member, memo: document.getElementById('fp-memo').value.trim() };
  fukubokuPlans.push(plan);
  fukubokuPlans.sort((a,b)=>a.date>b.date?1:a.date<b.date?-1:(a.time>b.time?1:-1));
  saveFukubokuPlans();
  flash('fp-msg','追加しました');
  document.getElementById('fp-memo').value='';
  renderFukubokuList();
}

function deleteFukubokuPlan(id){
  fukubokuPlans = fukubokuPlans.filter(p=>p.id!==id);
  saveFukubokuPlans();
  renderFukubokuList();
}

function saveFukubokuPlans(){
  try{ localStorage.setItem('fukuboku_plans', JSON.stringify(fukubokuPlans)); }catch(e){}
  gasSave('fukubokuPlans', fukubokuPlans);
}

function renderFukubokuList(){
  const el = document.getElementById('fp-list'); if(!el) return;
  if(!fukubokuPlans.length){
    el.innerHTML='<div style="font-size:13px;color:#888;padding:10px 14px">予定はありません</div>';
    return;
  }
  const today = new Date().toISOString().slice(0,10);
  el.innerHTML = fukubokuPlans.map(p=>{
    const past = p.date < today;
    const dateDisp = p.date.replace(/^(\d{4})-(\d{2})-(\d{2})$/,'$2月$3日');
    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid #eee;flex-wrap:wrap;${past?'color:#bbb;background:#fafafa':''}">
      <span style="font-size:13px;min-width:70px">${dateDisp}${p.time?' '+p.time+'〜':''}</span>
      <span style="font-size:13px;min-width:60px">${p.member}</span>
      ${p.memo?`<span style="font-size:12px;color:${past?'#bbb':'#888'}">${p.memo}</span>`:''}
      <button class="btn btn-w" style="margin-left:auto;font-size:11px;padding:3px 8px" onclick="deleteFukubokuPlan(${p.id})">削除</button>
    </div>`;
  }).join('');
}
