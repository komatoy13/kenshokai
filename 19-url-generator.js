/* ===== 班長・副長URL生成（設定タブ） ===== */
function renderHanchoBtnList(){
  const wrap = document.getElementById('hancho-url-wrap');
  if(!wrap) return;
  if(!hanList.length){
    wrap.innerHTML = '<div style="font-size:13px;color:#888;padding:4px 0">班が登録されていません</div>';
    renderFukuchoHanSelects();
    return;
  }
  const base = location.href.split('?')[0];
  const gasParam = GAS_URL ? '&gas=' + encodeURIComponent(GAS_URL) : '';
  let html = '<div style="display:flex;flex-direction:column;gap:6px;">';
  for(let i = 0; i < hanList.length; i++){
    const hname = hanList[i].name;
    const url = base + '?mode=hancho&han=' + encodeURIComponent(hname) + gasParam;
    html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">'
      + '<span style="font-size:13px;min-width:100px">' + hname + '班</span>'
      + '<button class="btn btn-p" style="font-size:11px;padding:3px 10px" data-hancho-url="' + url + '">班長URLコピー</button>'
      + '<span style="font-size:11px;color:#aaa;word-break:break-all;max-width:260px">' + url + '</span>'
      + '</div>';
  }
  html += '</div>';
  wrap.innerHTML = html;
  renderFukuchoHanSelects();
}

function renderFukuchoHanSelects(){
  const mainSel = document.getElementById('fukucho-main-han');
  const subWrap = document.getElementById('fukucho-sub-hans');
  if(!mainSel || !subWrap) return;
  let mainHtml = '<option value="">― 選択 ―</option>';
  let subHtml = '';
  for(let i = 0; i < hanList.length; i++){
    const hname = hanList[i].name;
    mainHtml += '<option value="' + hname + '">' + hname + '班</option>';
    subHtml += '<label style="display:inline-flex;align-items:center;gap:3px;font-size:12px;">'
      + '<input type="checkbox" data-fukucho-sub="' + hname + '" style="width:14px;height:14px;">'
      + hname + '班</label>';
  }
  mainSel.innerHTML = mainHtml;
  subWrap.innerHTML = subHtml;
}

let _fukuchoUrl = '';
function generateFukuchoUrl(){
  const mainHan = document.getElementById('fukucho-main-han').value;
  if(!mainHan){ flash('cfg-han-msg', 'メイン班を選択してください'); return; }
  const subCbs = document.querySelectorAll('[data-fukucho-sub]:checked');
  const subs = [];
  for(let i = 0; i < subCbs.length; i++){
    const v = subCbs[i].dataset.fukuchoSub;
    if(v !== mainHan) subs.push(v);
  }
  const base = location.href.split('?')[0];
  const gasParam = GAS_URL ? '&gas=' + encodeURIComponent(GAS_URL) : '';
  _fukuchoUrl = base + '?mode=fukucho&han=' + encodeURIComponent(mainHan)
    + (subs.length ? '&sub=' + subs.map(function(s){ return encodeURIComponent(s); }).join(',') : '')
    + gasParam;
  const resultEl = document.getElementById('fukucho-url-result');
  const copyBtn = document.getElementById('fukucho-url-copy-btn');
  resultEl.textContent = _fukuchoUrl;
  copyBtn.style.display = '';
}

function copyFukuchoUrl(){
  if(!_fukuchoUrl) return;
  try{
    navigator.clipboard.writeText(_fukuchoUrl).then(function(){
      flash('cfg-han-msg', '副長URLをコピーしました');
    });
  } catch(e){
    const ta = document.createElement('textarea');
    ta.value = _fukuchoUrl;
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand('copy'); }catch(e2){}
    document.body.removeChild(ta);
    flash('cfg-han-msg', '副長URLをコピーしました');
  }
}

// 班長URLコピーボタンのイベント委譲
document.addEventListener('click', function(e){
  const btn = e.target.closest('[data-hancho-url]');
  if(!btn) return;
  const url = btn.dataset.hanchoUrl;
  try{
    navigator.clipboard.writeText(url).then(function(){
      flash('cfg-han-msg', 'URLをコピーしました');
    });
  } catch(e2){
    const ta = document.createElement('textarea');
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand('copy'); }catch(e3){}
    document.body.removeChild(ta);
    flash('cfg-han-msg', 'URLをコピーしました');
  }
});
