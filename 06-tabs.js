/* ===== タブ切替 ===== */
function sw(i){
  dbgLog('sw(' + i + ')呼び出し');
  document.querySelectorAll('.tab').forEach((t,j)=>t.classList.toggle('active',j===i));
  document.querySelectorAll('.page').forEach((p,j)=>p.classList.toggle('active',j===i));
  const pg3 = document.getElementById('pg3');
  dbgLog('pg3.classList=' + (pg3 ? pg3.className : 'null'));
  if(i===1) renderPendingList();
  if(i===3) renderRoster();
  if(i===4) renderFukubokuList();
  if(i===5) generateMail();
  if(i===6){ renderKumiTable(); renderHanTable(); renderHanchoBtnList(); renderKumiNameSelect(); }
  if(i===7){ renderAnalysisItemChecks(); renderAnalysisHanSelect(); }
}
