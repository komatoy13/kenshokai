/* ===== 名簿 ===== */
// アプローチキーワードのグループ順（備考欄内容でソート）
const APPROACH_KW_ORDER = ['死亡','所在不明','電話番号使われていない','住所変わっている','連絡不可','電話出ない'];

function getRosterSortKey(m, sortMode){
  if(sortMode === 'han'){
    return (m.han||'ﾟ') + (m.kumi||'') + (m.seiK||'') + (m.meiK||'');
  }
  if(sortMode === 'addr'){
    return (m.pref||'') + (m.city||'') + (m.addr||'');
  }
  if(sortMode === 'comment_kw'){
    const c = (m.comment||'').toLowerCase();
    for(let i = 0; i < APPROACH_KW_ORDER.length; i++){
      if(c.indexOf(APPROACH_KW_ORDER[i]) >= 0) return String(i).padStart(2,'0');
    }
    return '99';
  }
  if(sortMode === 'comment_date_desc'){
    return (m.commentUpdated||'0000-00-00');
  }
  if(sortMode === 'comment_date_asc'){
    return (m.commentUpdated||'9999-99-99');
  }
  if(sortMode === 'tel_first'){
    return (m.tel||m.tel2) ? '0' : '1';
  }
  if(sortMode === 'addr_first'){
    return (m.pref||m.city) ? '0' : '1';
  }
  // default: 組昇順→読み昇順
  return (m.kumi||'') + (m.seiK||'') + (m.meiK||'');
}

function applyRosterFilter(list, filterMode){
  if(filterMode === 'tel_only')       return list.filter(function(m){ return !!(m.tel||m.tel2); });
  if(filterMode === 'no_tel')         return list.filter(function(m){ return !(m.tel||m.tel2); });
  if(filterMode === 'addr_only')      return list.filter(function(m){ return !!(m.pref||m.city); });
  if(filterMode === 'no_addr')        return list.filter(function(m){ return !(m.pref||m.city); });
  if(filterMode === 'kw_contact_ng'){
    return list.filter(function(m){
      const c = m.comment||'';
      return c.indexOf('連絡不可') >= 0 || c.indexOf('電話出ない') >= 0 || c.indexOf('電話番号使われていない') >= 0;
    });
  }
  if(filterMode === 'kw_unknown'){
    return list.filter(function(m){ return (m.comment||'').indexOf('所在不明') >= 0; });
  }
  return list;
}

function renderRoster(){
  const q = (document.getElementById('mbr-search')?.value||'').toLowerCase();
  const sortMode = document.getElementById('mbr-sort')?.value || 'default';
  const filterMode = document.getElementById('mbr-filter')?.value || 'all';

  // GAS同期前でrosterが空の場合（班長・副長モードで特に発生）
  if(isRestricted() && roster.length === 0){
    document.getElementById('mbr-list').innerHTML = '<div style="padding:12px 14px;font-size:13px;color:#888">⏳ データ読み込み中…（同期完了後に表示されます）</div>';
    document.getElementById('mbr-count').textContent = '';
    return;
  }

  // 検索フィルタ
  let filtered = q
    ? roster.filter(function(m){ return (m.sei+(m.mei||'')+(m.seiK||'')+(m.meiK||'')+(m.kumi||'')+(m.han||'')+(m.pref||'')+(m.city||'')+(m.addr||'')+(m.tel||'')+(m.tel2||'')+(m.comment||'')).toLowerCase().indexOf(q) >= 0; })
    : roster.slice();

  // 権限フィルタ（班長・副長は自分の班のみ）
  if(isRestricted()){
    filtered = filtered.filter(function(m){ return canViewMember(m); });
    dbgLog('renderRoster権限フィルタ後=' + filtered.length);
  }

  const mbrList = document.getElementById('mbr-list');
  dbgLog('mbr-list exists=' + !!mbrList);

  // 絞り込みフィルタ
  filtered = applyRosterFilter(filtered, filterMode);

  // ソート
  if(sortMode === 'comment_date_desc'){
    filtered.sort(function(a,b){
      const ka = getRosterSortKey(a, sortMode);
      const kb = getRosterSortKey(b, sortMode);
      return kb < ka ? -1 : kb > ka ? 1 : 0; // 新しい順（降順）
    });
  } else {
    filtered.sort(function(a,b){
      const ka = getRosterSortKey(a, sortMode);
      const kb = getRosterSortKey(b, sortMode);
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
  }

  const aggCount = roster.filter(function(m){ return m.aggTarget; }).length;
  document.getElementById('mbr-count').textContent = filtered.length + '名 / 計' + roster.length + '名（集計対象：' + aggCount + '名）';

  if(!filtered.length){
    document.getElementById('mbr-list').innerHTML = '<div style="padding:12px 14px;font-size:13px;color:#888">該当者なし</div>';
    return;
  }

  let html = '';
  for(let i = 0; i < filtered.length; i++){
    const m = filtered[i];
    const nameDisp = m.sei + (m.mei||'');
    const aggOn = !!m.aggTarget;
    const hasComment = !!(m.comment||'').trim();

    // 住所文字列（Googleマップ用）
    const addrStr = (m.pref||'') + (m.city||'') + (m.addr||'');
    const mapsUrl = addrStr ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(addrStr) : '';

    // 電話番号リンク（tel: スキーム）
    let telHtml = '';
    if(m.tel){
      telHtml += '<a href="tel:' + m.tel + '" style="color:#1a6bbf;text-decoration:none;font-size:11px;">📞 ' + m.tel + '</a>';
      if(m.tel2) telHtml += ' / <a href="tel:' + m.tel2 + '" style="color:#1a6bbf;text-decoration:none;font-size:11px;">' + m.tel2 + '</a>';
    }

    // 住所リンク
    let addrHtml = '';
    if(addrStr){
      addrHtml = '<a href="' + mapsUrl + '" target="_blank" rel="noopener" style="color:#1a8f5a;text-decoration:none;font-size:11px;">📍 ' + addrStr + '</a>';
    }

    html += '<div style="display:flex;align-items:flex-start;padding:8px 14px;border-bottom:1px solid #eee;gap:8px;flex-wrap:nowrap;">'
      + '<div style="flex:1;min-width:0;">'
      + '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">'
      + '<span style="font-size:14px;font-weight:500;cursor:pointer;color:#1a6bbf;text-decoration:underline dotted;" data-open-comment="' + m.id + '">' + nameDisp + '</span>'
      + (m.minyushin ? '<span class="tag" style="background:#ffeeba;color:#856404;border:1px solid #ffc107">未入信</span>' : '')
      + (aggOn ? '<span class="tag" style="background:#d4edda;color:#155724;border:1px solid #28a745">集計</span>' : '')
      + (hasComment ? '<span style="font-size:11px;color:#888">💬</span>' : '')
      + '</div>'
      + '<div style="font-size:11px;color:#888">' + (m.seiK||'') + (m.meiK||'') + ' ' + (m.kumi||'') + (m.han ? ' ' + m.han + '班' : '') + '</div>'
      + (telHtml ? '<div style="margin-top:2px;">' + telHtml + '</div>' : '')
      + (addrHtml ? '<div style="margin-top:2px;">' + addrHtml + '</div>' : '')
      + (hasComment ? '<div style="font-size:11px;color:#aaa;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;">' + (m.comment||'').split('\n')[0] + '</div>' : '')
      + '</div>'
      + '<label style="display:flex;align-items:center;gap:4px;font-size:11px;color:#555;cursor:pointer;white-space:nowrap;flex-shrink:0;">'
      + '<input type="checkbox" ' + (aggOn ? 'checked' : '') + ' data-agg-id="' + m.id + '" style="width:15px;height:15px;">集計'
      + '</label>'
      + '<button class="btn" style="font-size:11px;padding:3px 10px;flex-shrink:0;" data-open-edit="' + m.id + '">編集</button>'
      + '</div>';
  }
  document.getElementById('mbr-list').innerHTML = html;
}

// 名簿リストのイベント委譲（コメント・編集・集計チェック）
document.addEventListener('click', function(e){
  // コメントモーダル
  const cmBtn = e.target.closest('[data-open-comment]');
  if(cmBtn){ openCommentModal(cmBtn.dataset.openComment); return; }
  // 編集モーダル
  const edBtn = e.target.closest('[data-open-edit]');
  if(edBtn){ openEditModal(edBtn.dataset.openEdit); return; }
});
document.addEventListener('change', function(e){
  // 集計チェックボックス
  const cb = e.target.closest('[data-agg-id]');
  if(cb){ toggleAggTarget(cb.dataset.aggId, cb.checked); }
});

function toggleAggTarget(id, checked){
  const m=roster.find(x=>String(x.id)===String(id));
  if(!m) return;
  m.aggTarget=checked;
  saveRoster();
  // aggDataに新規メンバーを追加
  if(checked){
    const name=m.sei+(m.mei||'');
    const han=m.han||'（班未設定）';
    const k=memberKey(han,name);
    if(!aggData[k]) aggData[k]={};
    items.forEach(item=>{
      if(!aggData[k][item.id]){
        const isNum=['kikanshi','kuyou'].includes(item.type);
        aggData[k][item.id]={grab:'',result:isNum?0:false,confirmed:false};
      }
    });
  }
  buildHanSelects();
  rebuildFpHan();
  renderAggTable();
  renderAggSummary();
  renderRoster();
}

function rebuildFpHan(){
  const aggHan=getAggHan();
  const fpHan=document.getElementById('fp-han');
  if(fpHan) fpHan.innerHTML='<option value="">― 選択 ―</option>'+aggHan.map(h=>'<option value="'+h.name+'">'+h.name+'班</option>').join('');
}
