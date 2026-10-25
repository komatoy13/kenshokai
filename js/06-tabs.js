/* ===== タブ切替 ===== */
// メニュー項目は id="tb{n}"、ページは id="pg{n}" で対応（並び順に依存しない）
function sw(i){
  dbgLog('sw(' + i + ')呼び出し');
  document.querySelectorAll('.mi').forEach(t=>t.classList.toggle('active',t.id==='tb'+i));
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='pg'+i));
  const pg3 = document.getElementById('pg3');
  dbgLog('pg3.classList=' + (pg3 ? pg3.className : 'null'));
  if(i===0 || i===1) refreshReportDates();
  if(i===1) renderPendingList();
  if(i===3) renderRoster();
  if(i===4) renderFukubokuList();
  if(i===5) generateMail();
  if(i===6){ renderKumiTable(); renderHanTable(); renderHanchoBtnList(); renderKumiNameSelect(); }
  if(i===7){ renderAnalysisItemChecks(); renderAnalysisHanSelect(); }
  if(i===8 && typeof renderGraphs==='function') renderGraphs();
  if(typeof onMenuSwitch==='function') onMenuSwitch(i);
}
