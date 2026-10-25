/* ===== グラフ部品（外部ライブラリなし・SVGをDOMで組み立てる） ===== */
// 方針：細い線(2px)・4px丸みの棒・凡例（2系列以上）・数値は最新/最大のみ直接表示・
//       タップ/ホバーで全数値のツールチップ・「数値表」で全数値を確認可能（色だけに頼らない）
// 文字はすべて textContent で入れる（氏名などのデータをHTMLとして解釈しない）

const CK = {
  s1:'#2a78d6',      // 系列1（青）
  s2:'#eb6834',      // 系列2（橙）
  ink:'#0b0b0b',     // 主な文字
  ink2:'#52514e',    // 補助の文字
  muted:'#898781',   // 軸の文字
  grid:'#e1e0d9',    // 罫線（ヘアライン）
  base:'#c3c2b7',    // 基準線
  surface:'#fcfcfb'  // グラフの背景
};
const CK_SVGNS = 'http://www.w3.org/2000/svg';
const CK_FONT = 'system-ui,-apple-system,"Segoe UI",sans-serif';

function ckSvg(tag, attrs, parent, text){
  const el = document.createElementNS(CK_SVGNS, tag);
  if(attrs) Object.keys(attrs).forEach(function(k){ el.setAttribute(k, attrs[k]); });
  if(text !== undefined && text !== null) el.textContent = String(text);
  if(parent) parent.appendChild(el);
  return el;
}
function ckHtml(tag, cls, text, parent){
  const el = document.createElement(tag);
  if(cls) el.className = cls;
  if(text !== undefined && text !== null) el.textContent = String(text);
  if(parent) parent.appendChild(el);
  return el;
}

// '2026-09-06' → '9/6'、完全表記 → '2026/9/6'
function ckDate(s){
  const m = String(s || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  return m ? (parseInt(m[2],10) + '/' + parseInt(m[3],10)) : String(s || '');
}
function ckDateFull(s){
  const m = String(s || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  return m ? (m[1] + '/' + parseInt(m[2],10) + '/' + parseInt(m[3],10)) : String(s || '');
}
function ckNum(v){
  if(v === null || v === undefined || v === '') return '';
  const r = Math.round(Number(v) * 10) / 10;
  return String(r);
}

// きりのよい目盛り（0から始める）
function ckScale(maxV, integer){
  if(!(maxV > 0)) return {max:4, step:1, ticks:[0,1,2,3,4]};
  const rough = maxV / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const m = rough / pow;
  let step = (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * pow;
  if(integer && step < 1) step = 1;
  const max = Math.ceil(maxV / step - 1e-9) * step;
  const ticks = [];
  for(let t = 0; t <= max + 1e-9; t += step) ticks.push(Math.round(t * 100) / 100);
  return {max:max, step:step, ticks:ticks};
}
function ckAxisNum(t){
  if(t >= 1000) return (Math.round(t / 100) / 10) + 'K';
  return String(Math.round(t * 10) / 10);
}

// 描画領域の幅（スマホで画面幅に収まるように）
function ckAvailWidth(){
  const body = document.getElementById('gr-body');
  const w = body ? body.clientWidth : 0;
  return Math.max(300, (w || 0) - 52);
}

function ckLayout(n, availW){
  const padL = 34, padR = 12, padT = 20, padB = 26, plotH = 150;
  const step = Math.min(64, Math.max(30, (availW - padL - padR) / Math.max(n, 1)));
  return {padL:padL, padR:padR, padT:padT, padB:padB, plotH:plotH, step:step,
          W:Math.round(padL + padR + step * n), H:padT + plotH + padB};
}

// 数値を直接表示する位置（最新・最大のみ）
function ckLabelIdx(values){
  const set = {};
  let last = -1, maxI = -1;
  values.forEach(function(v, i){
    if(v === null || v === undefined) return;
    last = i;
    if(maxI < 0 || v > values[maxI]) maxI = i;
  });
  if(last >= 0) set[last] = true;
  if(maxI >= 0 && values[maxI] > 0) set[maxI] = true;
  return Object.keys(set).map(Number);
}

// 棒（上の角だけ4px丸め、基準線側は直角）
function ckBarPath(x, y, w, h, base){
  const r = Math.min(4, w / 2, h);
  return 'M' + x + ',' + base +
    ' L' + x + ',' + (y + r) +
    ' Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
    ' L' + (x + w - r) + ',' + y +
    ' Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) +
    ' L' + (x + w) + ',' + base + ' Z';
}

// 数値表（全数値をここで確認できる）
function ckTable(card, head, rows){
  const d = ckHtml('details', 'gr-tv', null, card);
  ckHtml('summary', null, '数値表', d);
  const wrap = ckHtml('div', 'gr-tv-scroll', null, d);
  const tb = ckHtml('table', null, null, wrap);
  const thead = ckHtml('thead', null, null, tb);
  const trh = ckHtml('tr', null, null, thead);
  head.forEach(function(h){ ckHtml('th', null, h, trh); });
  const tbody = ckHtml('tbody', null, null, tb);
  rows.forEach(function(r){
    const tr = ckHtml('tr', null, null, tbody);
    r.forEach(function(c){ ckHtml('td', null, c, tr); });
  });
}

/* kind: 'line' | 'bar'
   o = {
     title, subtitle,
     cats:   [{label:'9/6', full:'2026/9/6'}],
     series: [{name, color, values:[数値|null,...]}],
     integer: true/false,
     tipExtra: function(i){ return ['補足テキスト', ...]; }   // 任意
     tableExtra: [{name, values:[...]}]                          // 任意（数値表にだけ出す列）
     empty: '記録がありません'
   } */
function ckChart(kind, o){
  const card = ckHtml('div', 'gr-card');
  if(o.title) ckHtml('div', 'gr-ct', o.title, card);
  if(o.subtitle) ckHtml('div', 'gr-cs', o.subtitle, card);
  const n = o.cats.length;
  if(!n){ ckHtml('div', 'gr-empty', o.empty || '記録がありません', card); return card; }

  // 凡例：2系列以上のときだけ（1系列はタイトルが凡例の代わり）
  if(o.series.length >= 2){
    const lg = ckHtml('div', 'gr-legend', null, card);
    o.series.forEach(function(s){
      const sp = ckHtml('span', null, null, lg);
      const sw = ckHtml('i', null, null, sp);
      sw.style.background = s.color;
      ckHtml('b', null, s.name, sp).style.fontWeight = 'normal';
    });
  }

  const scroll = ckHtml('div', 'gr-scroll', null, card);
  const inner = ckHtml('div', 'gr-inner', null, scroll);
  const L = ckLayout(n, ckAvailWidth());

  let maxV = 0;
  o.series.forEach(function(s){ s.values.forEach(function(v){ if(v !== null && v !== undefined && v > maxV) maxV = v; }); });
  const sc = ckScale(maxV, o.integer !== false);
  const xC = function(i){ return L.padL + L.step * (i + 0.5); };
  const yV = function(v){ return L.padT + L.plotH * (1 - v / sc.max); };
  const baseY = L.padT + L.plotH;

  const svg = ckSvg('svg', {width:L.W, height:L.H, viewBox:'0 0 ' + L.W + ' ' + L.H, role:'img',
    'aria-label':(o.title || 'グラフ'), 'font-family':CK_FONT}, inner);

  // 罫線と縦軸の数字
  sc.ticks.forEach(function(t){
    const y = yV(t);
    ckSvg('line', {x1:L.padL, x2:L.W - L.padR, y1:y, y2:y, stroke:(t === 0 ? CK.base : CK.grid), 'stroke-width':1}, svg);
    ckSvg('text', {x:L.padL - 6, y:y + 3.5, 'text-anchor':'end', 'font-size':10, fill:CK.muted}, svg, ckAxisNum(t));
  });
  // 横軸の日付（最新が必ず出るように間引く）
  const every = L.step >= 36 ? 1 : 2;
  o.cats.forEach(function(c, i){
    if((n - 1 - i) % every !== 0) return;
    ckSvg('text', {x:xC(i), y:baseY + 16, 'text-anchor':'middle', 'font-size':10, fill:CK.muted}, svg, c.label);
  });

  // カーソル（線＝縦のヘアライン、棒＝薄い帯）
  let cursor;
  if(kind === 'line'){
    cursor = ckSvg('line', {y1:L.padT, y2:baseY, stroke:CK.base, 'stroke-width':1, visibility:'hidden', 'class':'gr-cur'}, svg);
  } else {
    cursor = ckSvg('rect', {y:L.padT, width:L.step, height:L.plotH, fill:'rgba(26,107,191,0.07)', visibility:'hidden', 'class':'gr-cur'}, svg);
  }

  // 本体（マーク）
  const s = o.series.length;
  if(kind === 'line'){
    o.series.forEach(function(se){
      let d = '', pen = false;
      se.values.forEach(function(v, i){
        if(v === null || v === undefined){ pen = false; return; }
        d += (pen ? ' L' : ' M') + xC(i) + ',' + yV(v);
        pen = true;
      });
      if(d) ckSvg('path', {d:d.trim(), fill:'none', stroke:se.color, 'stroke-width':2, 'stroke-linejoin':'round', 'stroke-linecap':'round'}, svg);
      se.values.forEach(function(v, i){
        if(v === null || v === undefined) return;
        ckSvg('circle', {cx:xC(i), cy:yV(v), r:6, fill:CK.surface}, svg);   // 面色のリング
        ckSvg('circle', {cx:xC(i), cy:yV(v), r:4, fill:se.color}, svg);
      });
    });
  } else {
    const gap = 2;
    const bw = Math.max(4, Math.min(24, (L.step - 8 - (s - 1) * gap) / s));
    const gw = s * bw + (s - 1) * gap;
    o.series.forEach(function(se, j){
      se.values.forEach(function(v, i){
        if(v === null || v === undefined || v <= 0) return;
        const x = xC(i) - gw / 2 + j * (bw + gap);
        const y = yV(v);
        ckSvg('path', {d:ckBarPath(x, y, bw, baseY - y, baseY), fill:se.color}, svg);
      });
    });
  }

  // 数値の直接表示は最新と最大だけ（残りはタップ／数値表）
  const labelled = {};
  o.series.forEach(function(se, j){
    const idxs = ckLabelIdx(se.values);
    idxs.forEach(function(i){
      const v = se.values[i];
      let x = xC(i);
      if(kind === 'bar'){
        const bw = Math.max(4, Math.min(24, (L.step - 8 - (s - 1) * 2) / s));
        const gw = s * bw + (s - 1) * 2;
        x = xC(i) - gw / 2 + j * (bw + 2) + bw / 2;
      }
      let y = yV(v) - (kind === 'line' ? 10 : 4);
      if(y < 11) y = yV(v) + 18;
      let anchor = 'middle';
      if(x < 16) anchor = 'start'; else if(x > L.W - 16) anchor = 'end';
      ckSvg('text', {x:x, y:y, 'text-anchor':anchor, 'font-size':11, 'font-weight':600, fill:CK.ink}, svg, ckNum(v));
    });
  });

  // ツールチップ（タップ・ホバー・キーボードのフォーカスで全系列の値を表示）
  const tip = ckHtml('div', 'gr-tip', null, inner);
  const hideAll = function(){
    document.querySelectorAll('.gr-tip.show').forEach(function(t){ t.classList.remove('show'); });
    document.querySelectorAll('.gr-cur').forEach(function(c){ c.setAttribute('visibility', 'hidden'); });
  };
  const show = function(i){
    hideAll();
    while(tip.firstChild) tip.removeChild(tip.firstChild);
    ckHtml('div', 'tt-h', o.cats[i].full, tip);
    o.series.forEach(function(se){
      const v = se.values[i];
      if(v === null || v === undefined) return;
      const r = ckHtml('div', 'tt-r', null, tip);
      const k = ckHtml('span', 'tt-k', null, r);
      k.style.borderTopColor = se.color;
      ckHtml('span', 'tt-v', ckNum(v), r);
      ckHtml('span', 'tt-n', se.name, r);
    });
    if(o.tipExtra){
      (o.tipExtra(i) || []).forEach(function(t){ ckHtml('div', 'tt-n', t, tip); });
    }
    tip.classList.add('show');
    let left = xC(i) + 10;
    const w = tip.offsetWidth;
    if(left + w > L.W - 2) left = xC(i) - w - 10;
    if(left < 2) left = 2;
    tip.style.left = left + 'px';
    tip.style.top = (L.padT + 2) + 'px';
    if(kind === 'line'){
      cursor.setAttribute('x1', xC(i)); cursor.setAttribute('x2', xC(i));
    } else {
      cursor.setAttribute('x', L.padL + L.step * i);
    }
    cursor.setAttribute('visibility', 'visible');
  };
  // 当たり判定は棒・点より大きい（1日分の縦帯ぜんぶ）
  o.cats.forEach(function(c, i){
    const parts = [c.full];
    o.series.forEach(function(se){
      const v = se.values[i];
      if(v !== null && v !== undefined) parts.push(se.name + ' ' + ckNum(v));
    });
    const hit = ckSvg('rect', {x:L.padL + L.step * i, y:L.padT, width:L.step, height:L.plotH,
      'class':'gr-hit', tabindex:0, role:'button', 'aria-label':parts.join('、')}, svg);
    hit.addEventListener('click', function(){ show(i); });
    hit.addEventListener('pointerenter', function(e){ if(e.pointerType === 'mouse') show(i); });
    hit.addEventListener('pointerleave', function(e){ if(e.pointerType === 'mouse') hideAll(); });
    hit.addEventListener('focus', function(){ show(i); });
    hit.addEventListener('blur', hideAll);
  });

  // 数値表
  const head = ['日付'].concat(o.series.map(function(se){ return se.name; }));
  if(o.tableExtra) o.tableExtra.forEach(function(x){ head.push(x.name); });
  const rows = o.cats.map(function(c, i){
    const r = [c.full];
    o.series.forEach(function(se){ r.push(ckNum(se.values[i])); });
    if(o.tableExtra) o.tableExtra.forEach(function(x){ r.push(x.values[i] === null || x.values[i] === undefined ? '' : String(x.values[i])); });
    return r;
  });
  ckTable(card, head, rows);
  return card;
}

// タップした場所がグラフの当たり判定の外なら、ツールチップを閉じる
document.addEventListener('click', function(e){
  const t = e.target;
  if(t && t.getAttribute && t.getAttribute('class') === 'gr-hit') return;
  document.querySelectorAll('.gr-tip.show').forEach(function(x){ x.classList.remove('show'); });
  document.querySelectorAll('.gr-cur').forEach(function(c){ c.setAttribute('visibility', 'hidden'); });
});
