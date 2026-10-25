/* ===== メニュー（右下フローティング ≡） ===== */
// ・項目の表示/非表示は権限処理(18-permissions.js)が各ボタンの style.display で行う
// ・グループは、中の項目がすべて非表示になったら見出しごと隠す（班長・副長は「支隊長用」が消える）

function isMenuOpen(){
  const p = document.getElementById('menu-panel');
  return !!(p && p.classList.contains('open'));
}

function refreshMenuGroups(){
  document.querySelectorAll('#menu-panel .mg').forEach(function(g){
    const btns = g.querySelectorAll('.mi');
    let any = false;
    for(let i = 0; i < btns.length; i++){
      if(btns[i].style.display !== 'none'){ any = true; break; }
    }
    g.style.display = any ? '' : 'none';
  });
}

function openMenu(){
  refreshMenuGroups();
  document.getElementById('menu-panel').classList.add('open');
  document.getElementById('menu-overlay').classList.add('open');
  const fab = document.getElementById('menu-fab');
  fab.setAttribute('aria-expanded', 'true');
  fab.setAttribute('aria-label', 'メニューを閉じる');
}

function closeMenu(){
  const panel = document.getElementById('menu-panel');
  if(!panel) return;
  panel.classList.remove('open');
  document.getElementById('menu-overlay').classList.remove('open');
  const fab = document.getElementById('menu-fab');
  fab.setAttribute('aria-expanded', 'false');
  fab.setAttribute('aria-label', 'メニューを開く');
}

function toggleMenu(){
  if(isMenuOpen()) closeMenu(); else openMenu();
}

// 画面切替のたびに呼ばれる（06-tabs.js の sw から）
function onMenuSwitch(i){
  closeMenu();
  const el = document.getElementById('tb' + i);
  const cur = document.getElementById('menu-cur');
  if(el && cur) cur.textContent = el.getAttribute('data-short') || el.textContent;
  try{ window.scrollTo(0, 0); }catch(e){}
}

document.addEventListener('keydown', function(e){
  if(e.key === 'Escape') closeMenu();
});

// スクロール中は≡を薄くして内容の邪魔にならないようにする
(function(){
  let timer = null;
  window.addEventListener('scroll', function(){
    const fab = document.getElementById('menu-fab');
    if(!fab || isMenuOpen()) return;
    fab.classList.add('dim');
    clearTimeout(timer);
    timer = setTimeout(function(){ fab.classList.remove('dim'); }, 700);
  }, {passive:true});
})();

// 起動時：権限適用後の状態でグループの表示を整える
refreshMenuGroups();
