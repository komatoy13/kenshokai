/* ===== グラフタブ ===== */
// 見せ方：
//   支隊長 … 「支隊全体」または班を選択（班を選ぶと 班＋支隊全体の合計 を並べて表示）
//   班長   … 自班 ＋ 支隊全体の合計（他班の個人名は出さない）
//   副長   … 担当班まとめ／各担当班 ＋ 支隊全体の合計
// データ：aggHistory[].summary（支隊全体の合計）／aggHistory[].members（個人別・班別。更新後の結果保存分から）／hHist（折伏成果）

function grAllowedHans(){
  const all = getAggHan().map(function(h){ return h.name; });
  if(isSocho()) return all;
  return all.filter(function(h){ return ROLE.hans.indexOf(h) >= 0; });
}

function grScopeOptions(){
  const hans = grAllowedHans();
  let opts = [];
  if(isSocho()){
    opts.push({key:'__all__', label:'支隊全体', hans:null});
  } else if(isFukucho() && hans.length > 1){
    opts.push({key:'__mine__', label:'担当班まとめ', hans:hans.slice()});
  }
  hans.forEach(function(h){ opts.push({key:h, label:h + '班', hans:[h]}); });
  if(!opts.length && !isSocho()){
    const h = ROLE.han;
    opts.push({key:h, label:h + '班', hans:[h]});
  }
  return opts;
}

// 画面上部のフィルタ（選択値は保ったまま作り直す）
function grFillFilters(){
  const selItem = document.getElementById('gr-item');
  const prevItem = selItem.value;
  while(selItem.firstChild) selItem.removeChild(selItem.firstChild);
  items.forEach(function(it){
    const o = document.createElement('option');
    o.value = it.id; o.textContent = it.label;
    selItem.appendChild(o);
  });
  const ids = items.map(function(x){ return x.id; });
  selItem.value = (prevItem && ids.indexOf(prevItem) >= 0) ? prevItem : (ids.indexOf('sunday') >= 0 ? 'sunday' : (ids[0] || ''));

  const selHan = document.getElementById('gr-han');
  const prevHan = selHan.value;
  while(selHan.firstChild) selHan.removeChild(selHan.firstChild);
  const opts = grScopeOptions();
  opts.forEach(function(op){
    const o = document.createElement('option');
    o.value = op.key; o.textContent = op.label;
    selHan.appendChild(o);
  });
  const keys = opts.map(function(x){ return x.key; });
  if(prevHan && keys.indexOf(prevHan) >= 0) selHan.value = prevHan;
  document.getElementById('gr-han-wrap').style.display = opts.length > 1 ? '' : 'none';
}

function grCurrentScope(){
  const opts = grScopeOptions();
  const k = document.getElementById('gr-han').value;
  for(let i = 0; i < opts.length; i++){ if(opts[i].key === k) return opts[i]; }
  return opts[0] || {key:'__all__', label:'支隊全体', hans:null};
}

// 描くパネル：選んだ範囲 ＋（班のときは）支隊全体の合計
function grDrawScopes(primary){
  if(primary.hans === null) return [{label:'支隊全体', hans:null}];
  return [primary, {label:'支隊全体（合計）', hans:null}];
}

/* ---------- データ ---------- */
function grEntriesAsc(){
  return aggHistory.slice().sort(function(a, b){ return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
}

// 1回分の記録から、項目の値を取り出す（hans=null は支隊全体の合計、配列はその班の個人別から集計）
function grItemPoint(e, item, hans){
  const id = item.id;
  if(hans === null){
    const s = e.summary && e.summary[id];
    if(!s) return null;
    return {
      result: s.type === 'kikanshi' ? s.units : s.count,
      grab: (s.type === 'confirm' || s.grabW === undefined) ? null : s.grabW,
      amt: s.type === 'kuyou' ? s.amt : null
    };
  }
  const ms = e.members;
  if(!ms) return null;
  let has = false, result = 0, grab = 0, amt = 0;
  Object.keys(ms).forEach(function(k){
    const m = ms[k];
    if(hans.indexOf(m.han) < 0) return;
    const d = m[id];
    if(!d) return;
    has = true;
    grab += AWt[d.grab] || 0;
    if(item.type === 'kikanshi') result += parseInt(d.result) || 0;
    else if(item.type === 'kuyou'){ if(d.result > 0){ result++; amt += parseFloat(d.result) || 0; } }
    else if(d.result) result++;
  });
  if(!has) return null;
  return {
    result: result,
    grab: item.type === 'confirm' ? null : Math.round(grab * 10) / 10,
    amt: item.type === 'kuyou' ? Math.round(amt * 10) / 10 : null
  };
}

function grPeriodN(){
  return parseInt(document.getElementById('gr-period').value, 10) || 0;
}
function grWindow(arr){
  const n = grPeriodN();
  return n > 0 ? arr.slice(-n) : arr;
}

function grSeries(item, hans){
  const out = [];
  grEntriesAsc().forEach(function(e){
    const p = grItemPoint(e, item, hans);
    if(p) out.push({e:e, p:p});
  });
  return grWindow(out);
}

function grEmptyMsg(scope){
  return scope.hans !== null
    ? '班別の記録がありません（班別・個人別は、この機能を追加した後に「結果保存」した分から表示されます）'
    : '記録がありません。集計タブで「結果保存」をすると表示されます';
}
function grSigned(v){
  const r = Math.round(v * 10) / 10;
  return (r > 0 ? '+' : (r < 0 ? '−' : '±')) + Math.abs(r);
}

/* ---------- ① 項目別の推移 ---------- */
function grTrendCard(item, scope){
  const pts = grSeries(item, scope.hans);
  const isUnits = item.type === 'kikanshi';
  const name = isUnits ? '部数' : '結果（人）';
  let sub = '';
  if(pts.length >= 2){
    const a = pts[pts.length - 1], b = pts[pts.length - 2];
    sub = '直近 ' + ckDate(a.e.date) + '：' + ckNum(a.p.result) + (isUnits ? '部' : '人') + '（前回比 ' + grSigned(a.p.result - b.p.result) + '）';
  } else if(pts.length === 1){
    sub = '直近 ' + ckDate(pts[0].e.date) + '：' + ckNum(pts[0].p.result) + (isUnits ? '部' : '人');
  }
  const isKuyou = item.type === 'kuyou';
  return ckChart('line', {
    title: scope.label + '｜' + item.label + 'の推移（' + (isUnits ? '部数' : '結果・人数') + '）',
    subtitle: sub,
    cats: pts.map(function(x){ return {label:ckDate(x.e.date), full:ckDateFull(x.e.date)}; }),
    series: [{name:name, color:CK.s1, values:pts.map(function(x){ return x.p.result; })}],
    integer: true,
    tipExtra: isKuyou ? function(i){ return ['金額 ' + ckNum(pts[i].p.amt) + '万円']; } : null,
    tableExtra: isKuyou ? [{name:'金額(万円)', values:pts.map(function(x){ return ckNum(x.p.amt); })}] : null,
    empty: grEmptyMsg(scope)
  });
}

/* ---------- ② 掴み vs 結果 ---------- */
function grGrabCard(item, scope){
  const pts = grSeries(item, scope.hans);
  let sub = '';
  const withG = pts.filter(function(x){ return x.p.grab !== null; });
  if(withG.length){
    const a = withG[withG.length - 1];
    const d = a.p.result - a.p.grab;
    let sum = 0;
    withG.forEach(function(x){ sum += (x.p.result - x.p.grab); });
    sub = '直近 ' + ckDate(a.e.date) + '：掴み ' + ckNum(a.p.grab) + ' → 結果 ' + ckNum(a.p.result) + '（差 ' + grSigned(d) + '）／平均差 ' + grSigned(sum / withG.length);
  }
  return ckChart('bar', {
    title: scope.label + '｜' + item.label + '：掴み（ABC加重）と結果',
    subtitle: sub,
    cats: pts.map(function(x){ return {label:ckDate(x.e.date), full:ckDateFull(x.e.date)}; }),
    series: [
      {name:'掴み（加重）', color:CK.s2, values:pts.map(function(x){ return x.p.grab; })},
      {name:'結果（人）', color:CK.s1, values:pts.map(function(x){ return x.p.result; })}
    ],
    integer: true,
    tipExtra: function(i){
      const g = pts[i].p.grab;
      return g === null ? [] : ['差（結果−掴み） ' + grSigned(pts[i].p.result - g)];
    },
    tableExtra: [{name:'差(結果−掴み)', values:pts.map(function(x){ return x.p.grab === null ? '' : grSigned(x.p.result - x.p.grab); })}],
    empty: grEmptyMsg(scope)
  });
}
function grHasGrab(item, scope){
  return grSeries(item, scope.hans).some(function(x){ return x.p.grab !== null && x.p.grab > 0; });
}

/* ---------- ③ 折伏成果の推移 ---------- */
function grShakubukuCard(scope){
  const asc = hHist.slice().sort(function(a, b){ return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
  let pts = [];
  asc.forEach(function(e){
    let v = null;
    if(scope.hans === null) v = e.total;
    else if(e.byHan){
      v = 0;
      scope.hans.forEach(function(h){ v += (e.byHan[h] || 0); });
    }
    if(v !== null && v !== undefined) pts.push({date:e.date, v:v});
  });
  pts = grWindow(pts);
  let sub = '';
  if(pts.length >= 2){
    const a = pts[pts.length - 1], b = pts[pts.length - 2];
    sub = '直近 ' + ckDate(a.date) + '：' + ckNum(a.v) + '名（前回比 ' + grSigned(a.v - b.v) + '）';
  } else if(pts.length === 1){
    sub = '直近 ' + ckDate(pts[0].date) + '：' + ckNum(pts[0].v) + '名';
  }
  return ckChart('bar', {
    title: scope.label + '｜折伏成果の推移（報告日時点の期間合計・名）',
    subtitle: sub,
    cats: pts.map(function(x){ return {label:ckDate(x.date), full:ckDateFull(x.date)}; }),
    series: [{name:'入信者（名）', color:CK.s1, values:pts.map(function(x){ return x.v; })}],
    integer: true,
    empty: scope.hans !== null
      ? '班別の記録がありません（折伏成果タブで「報告日を保存」した分から表示されます）'
      : '記録がありません。折伏成果タブで報告日を保存すると表示されます'
  });
}

/* ---------- ④ 個人別 ○× 一覧（誰が増えている・減っている） ---------- */
function grIsPos(v){
  return v === true || (typeof v === 'number' && v > 0) || (typeof v === 'string' && v !== '' && v !== 'false' && !isNaN(parseFloat(v)) && parseFloat(v) > 0);
}
function grIsEmpty(v){ return v === undefined || v === null || v === ''; }

function grHeatmapCard(item, scope){
  const card = ckHtml('div', 'gr-card');
  const hans = scope.hans === null ? grAllowedHans() : scope.hans;
  ckHtml('div', 'gr-ct', scope.label + '｜' + item.label + ' 個人別', card);

  // 対象の回（この項目の個人記録がある回）
  const cols = [];
  grEntriesAsc().forEach(function(e){
    if(!e.members) return;
    const has = Object.keys(e.members).some(function(k){
      const m = e.members[k];
      return hans.indexOf(m.han) >= 0 && m[item.id];
    });
    if(has) cols.push(e);
  });
  const win = grWindow(cols);
  if(!win.length){
    ckHtml('div', 'gr-empty', '個人別の記録がまだありません（この機能を追加した後に「結果保存」した分から表示されます）', card);
    return card;
  }

  // 行（氏名）：現在の名簿順 → 過去の記録にだけいる人
  const info = {}, order = [];
  getAggAllMembers().forEach(function(m){
    const k = memberKey(m.han, m.name);
    info[k] = {han:m.han, name:m.name};
    order.push(k);
  });
  win.forEach(function(e){
    Object.keys(e.members).forEach(function(k){
      if(!info[k]){ info[k] = {han:e.members[k].han, name:e.members[k].name}; order.push(k); }
    });
  });
  const hanOrder = getAggHan().map(function(h){ return h.name; });
  const rowsByHan = {};
  order.forEach(function(k){
    const inf = info[k];
    if(hans.indexOf(inf.han) < 0) return;
    const vals = win.map(function(e){
      const m = e.members[k];
      return (m && m[item.id]) ? m[item.id].result : undefined;
    });
    if(vals.every(grIsEmpty)) return;
    (rowsByHan[inf.han] = rowsByHan[inf.han] || []).push({key:k, name:inf.name, vals:vals});
  });

  // 傾向：前半と後半の参加率を比べる（記録4回以上）
  let up = 0, down = 0;
  Object.keys(rowsByHan).forEach(function(h){
    rowsByHan[h].forEach(function(r){
      const arr = r.vals.filter(function(v){ return !grIsEmpty(v); }).map(grIsPos);
      r.n = arr.length;
      r.p = arr.filter(Boolean).length;
      r.trend = '—';
      if(arr.length >= 4){
        const half = Math.floor(arr.length / 2);
        const rate = function(a){ return a.filter(Boolean).length / a.length; };
        const diff = rate(arr.slice(arr.length - half)) - rate(arr.slice(0, half));
        if(diff >= 0.25){ r.trend = '↑ 増'; up++; }
        else if(diff <= -0.25){ r.trend = '↓ 減'; down++; }
        else r.trend = '→ 横ばい';
      }
    });
  });
  const isNum = item.type === 'kikanshi' || item.type === 'kuyou';
  ckHtml('div', 'gr-cs',
    (isNum ? '数字＝実績（0は実績なし）' : '○＝参加・達成／×＝不参加') + '／空欄＝その回は記録なし。傾向は前半→後半の変化（記録4回以上）。増 ' + up + '名・減 ' + down + '名', card);

  const wrap = ckHtml('div', 'gr-hm-wrap', null, card);
  const tb = ckHtml('table', 'gr-hm', null, wrap);
  const thead = ckHtml('thead', null, null, tb);
  const trh = ckHtml('tr', null, null, thead);
  ckHtml('th', 'hm-name', '', trh);
  win.forEach(function(e){ ckHtml('th', null, ckDate(e.date), trh); });
  ckHtml('th', null, '回数', trh);
  ckHtml('th', null, '傾向', trh);

  let numMax = 0;
  if(isNum){
    Object.keys(rowsByHan).forEach(function(h){
      rowsByHan[h].forEach(function(r){ r.vals.forEach(function(v){ const x = parseFloat(v); if(x > numMax) numMax = x; }); });
    });
  }
  const BLUES = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#1c5cab'];
  const tbody = ckHtml('tbody', null, null, tb);
  const hanKeys = hanOrder.filter(function(h){ return rowsByHan[h]; });
  Object.keys(rowsByHan).forEach(function(h){ if(hanKeys.indexOf(h) < 0) hanKeys.push(h); });
  hanKeys.forEach(function(h){
    if(hanKeys.length > 1 || scope.hans === null){
      const trg = ckHtml('tr', 'hm-han', null, tbody);
      const tdg = ckHtml('td', null, h + '班', trg);
      tdg.setAttribute('colspan', String(win.length + 3));
    }
    rowsByHan[h].forEach(function(r){
      const tr = ckHtml('tr', null, null, tbody);
      ckHtml('td', 'hm-name', r.name, tr);
      r.vals.forEach(function(v, i){
        const td = ckHtml('td', 'hm-c', '', tr);
        const when = ckDateFull(win[i].date);
        if(grIsEmpty(v)){
          td.style.background = '#f6f5f1';
          td.setAttribute('title', when + '｜' + r.name + '：記録なし');
        } else if(isNum){
          const x = parseFloat(v) || 0;
          td.textContent = ckNum(x);
          if(x > 0){
            const idx = Math.min(4, Math.max(0, Math.ceil((x / (numMax || 1)) * 5) - 1));
            td.style.background = BLUES[idx];
            td.style.color = idx >= 3 ? '#fff' : CK.ink;
          } else {
            td.style.background = CK.grid;
            td.style.color = CK.ink2;
          }
          td.setAttribute('title', when + '｜' + r.name + '：' + ckNum(x));
        } else if(grIsPos(v)){
          td.textContent = '○';
          td.style.background = CK.s1;
          td.style.color = '#fff';
          td.setAttribute('title', when + '｜' + r.name + '：○');
        } else {
          td.textContent = '×';
          td.style.background = CK.grid;
          td.style.color = CK.ink2;
          td.setAttribute('title', when + '｜' + r.name + '：×');
        }
      });
      ckHtml('td', 'hm-s', r.p + '/' + r.n, tr);
      ckHtml('td', 'hm-t', r.trend, tr);
    });
  });
  return card;
}

/* ---------- 画面全体 ---------- */
function renderGraphs(){
  const body = document.getElementById('gr-body');
  if(!body) return;
  grFillFilters();
  while(body.firstChild) body.removeChild(body.firstChild);

  const item = items.filter(function(x){ return x.id === document.getElementById('gr-item').value; })[0];
  const primary = grCurrentScope();
  const scopes = grDrawScopes(primary);

  const note = document.getElementById('gr-note');
  note.textContent = primary.hans === null
    ? '支隊全体の合計を表示しています。班を選ぶと、その班と支隊全体の合計を並べて見られます。'
    : '「' + primary.label + '」と「支隊全体（合計）」を並べて表示しています。支隊全体は合計のみで、他の班の個人名は表示されません。';

  if(!item){ ckHtml('div', 'gr-empty', '項目がありません', body); return; }

  ckHtml('div', 'gr-h', '① ' + item.label + 'の推移', body);
  scopes.forEach(function(sc){ body.appendChild(grTrendCard(item, sc)); });

  ckHtml('div', 'gr-h', '② 掴みと結果の比べ', body);
  if(item.type === 'confirm'){
    ckHtml('div', 'gr-sub', '「' + item.label + '」は掴みを使わない項目なので、この比較はありません。', body);
  } else if(!scopes.some(function(sc){ return grHasGrab(item, sc); })){
    ckHtml('div', 'gr-sub', '「' + item.label + '」には掴み（ABC）の記録がありません。総部集会など、掴みを使っている項目を選ぶと表示されます。', body);
  } else {
    scopes.forEach(function(sc){ body.appendChild(grGrabCard(item, sc)); });
  }

  ckHtml('div', 'gr-h', '③ 折伏成果の推移', body);
  scopes.forEach(function(sc){ body.appendChild(grShakubukuCard(sc)); });

  ckHtml('div', 'gr-h', '④ ' + item.label + '：誰が増えている・減っている', body);
  body.appendChild(grHeatmapCard(item, primary));

  // 最新の日付が見えるよう、右端までスクロールしておく
  body.querySelectorAll('.gr-scroll, .gr-hm-wrap').forEach(function(s){ s.scrollLeft = s.scrollWidth; });
}
