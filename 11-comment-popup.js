/* ===== コメントポップアップ ===== */
let _commentId = null;

function openCommentModal(id){
  const m=roster.find(x=>String(x.id)===String(id));
  if(!m) return;
  _commentId=m.id;
  const nameDisp=m.sei+(m.mei||'');
  document.getElementById('cm-title').textContent=nameDisp;

  // メタ情報をHTML形式で構築（電話・住所リンクを含む）
  const metaEl = document.getElementById('cm-meta');
  let metaHtml = '';
  if(m.nyushin) metaHtml += '<span>入信日：' + m.nyushin + '</span>　';
  if(m.kumi)    metaHtml += '<span>' + m.kumi + '</span>　';
  if(m.han)     metaHtml += '<span>' + m.han + '班</span>　';
  if(m.tel){
    metaHtml += '<a href="tel:' + m.tel + '" style="color:#1a6bbf;text-decoration:none;">📞 ' + m.tel + '</a>';
    if(m.tel2) metaHtml += '　<a href="tel:' + m.tel2 + '" style="color:#1a6bbf;text-decoration:none;">' + m.tel2 + '</a>';
    metaHtml += '　';
  }
  const addrStr = (m.pref||'') + (m.city||'') + (m.addr||'');
  if(addrStr){
    const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(addrStr);
    metaHtml += '<a href="' + mapsUrl + '" target="_blank" rel="noopener" style="color:#1a8f5a;text-decoration:none;">📍 ' + addrStr + '</a>';
  }
  metaEl.innerHTML = metaHtml;

  document.getElementById('cm-text').value=m.comment||(m.biko||'');
  document.getElementById('cm-updated').textContent=m.commentUpdated||'なし';
  document.getElementById('cm-msg').textContent='';
  document.getElementById('comment-modal').style.display='';
  setTimeout(()=>document.getElementById('cm-text').focus(),100);
}

function closeCommentModal(e){
  if(e && e.target!==document.getElementById('comment-modal')) return;
  document.getElementById('comment-modal').style.display='none';
  _commentId=null;
}

function saveComment(){
  if(!_commentId) return;
  const m=roster.find(x=>String(x.id)===String(_commentId));
  if(!m) return;
  m.comment=document.getElementById('cm-text').value.trim();
  m.commentUpdated=td;
  document.getElementById('cm-updated').textContent=td;
  saveRoster();
  renderRoster();
  document.getElementById('cm-msg').textContent='保存しました';
  document.getElementById('cm-msg').style.color='#27ae60';
  setTimeout(()=>document.getElementById('cm-msg').textContent='',2000);
}

// クイック入力関数
function insertQuickComment(label){
  const today = new Date();
  const y = today.getFullYear();
  const mo = String(today.getMonth()+1).padStart(2,'0');
  const d = String(today.getDate()).padStart(2,'0');
  const stamp = '[' + y + '/' + mo + '/' + d + ': ' + label + ']';
  const ta = document.getElementById('cm-text');
  const cur = ta.value.trim();
  ta.value = cur ? stamp + '\n' + cur : stamp;
  ta.focus();
}
let _editingId = null;

function renderEditKumiSelect(){
  const sel=document.getElementById('e-kumi');
  if(!sel) return;
  const cur=sel.value;
  const names=Object.keys(kumiMap).sort();
  sel.innerHTML='<option value="">― 選択 ―</option>'+names.map(k=>'<option value="'+k+'">'+k+'</option>').join('');
  if(cur) sel.value=cur;
}

function onEditKumiChange(){
  const kumi=document.getElementById('e-kumi').value;
  const han=kumiMap[kumi]||'';
  document.getElementById('e-han').value=han;
  document.getElementById('e-han-disp').textContent=han?han+'班':'―';
}

function toggleEditMinyushin(){
  const isMini=document.getElementById('e-minyushin').checked;
  document.getElementById('e-nyushin-row').style.display=isMini?'none':'';
}

function openEditModal(id){
  const m=roster.find(x=>String(x.id)===String(id));
  if(!m) return;
  _editingId=m.id;
  sv('e-sei',m.sei);sv('e-mei',m.mei||'');
  sv('e-sk',m.seiK||'');sv('e-mk',m.meiK||'');
  sv('e-pref',m.pref||'');sv('e-city',m.city||'');sv('e-addr',m.addr||'');
  sv('e-tel',m.tel||'');sv('e-tel2',m.tel2||'');sv('e-birth',m.birth||'');
  renderEditKumiSelect();
  sv('e-kumi',m.kumi||'');
  document.getElementById('e-han').value=m.han||'';
  document.getElementById('e-han-disp').textContent=m.han?m.han+'班':'―';
  sv('e-shokai',m.shokai||'');sv('e-nyushin',m.nyushin||'');
  const ec=document.getElementById('e-comment'); if(ec) ec.value=m.comment||(m.biko||'');
  document.getElementById('e-minyushin').checked=!!m.minyushin;
  document.getElementById('e-nyushin-row').style.display=m.minyushin?'none':'';
  document.getElementById('e-aggtarget').checked=!!m.aggTarget;
  document.getElementById('e-msg').textContent='';
  document.getElementById('edit-modal').style.display='';
}

function closeEditModal(){
  document.getElementById('edit-modal').style.display='none';
  _editingId=null;
}

function saveEditMbr(){
  if(!_editingId) return;
  const sei=document.getElementById('e-sei').value.trim();
  if(!sei){document.getElementById('e-msg').textContent='姓は必須です';document.getElementById('e-msg').style.color='#c0392b';return;}
  const idx=roster.findIndex(x=>String(x.id)===String(_editingId));
  if(idx<0) return;
  const minyushin=document.getElementById('e-minyushin').checked;
  const aggTarget=document.getElementById('e-aggtarget').checked;
  const oldHan=roster[idx].han;
  const oldName=roster[idx].sei+(roster[idx].mei||'');
  roster[idx]={
    ...roster[idx],
    sei,mei:document.getElementById('e-mei').value.trim(),
    seiK:document.getElementById('e-sk').value.trim(),meiK:document.getElementById('e-mk').value.trim(),
    pref:document.getElementById('e-pref').value.trim(),city:document.getElementById('e-city').value.trim(),
    addr:document.getElementById('e-addr').value.trim(),
    tel:document.getElementById('e-tel').value.trim().replace(/[-ー－]/g,''),
    tel2:document.getElementById('e-tel2').value.trim().replace(/[-ー－]/g,''),
    birth:document.getElementById('e-birth').value.trim(),
    kumi:document.getElementById('e-kumi').value,han:document.getElementById('e-han').value,
    shokai:document.getElementById('e-shokai').value.trim(),
    nyushin:minyushin?'':normalizeDate(document.getElementById('e-nyushin').value.trim()),
    biko:'',
    comment:(document.getElementById('e-comment').value||'').trim(),
    commentUpdated:(document.getElementById('e-comment').value||'').trim() ? td : (roster[idx].commentUpdated||''),
    minyushin,aggTarget
  };
  // aggDataのキーを更新（名前or班が変わった場合）
  const newHan=roster[idx].han||'（班未設定）';
  const newName=sei+(document.getElementById('e-mei').value.trim()||'');
  const oldKey=memberKey(oldHan||'（班未設定）',oldName);
  const newKey=memberKey(newHan,newName);
  if(oldKey!==newKey && aggData[oldKey]){
    aggData[newKey]=aggData[oldKey];
    delete aggData[oldKey];
  }
  closeEditModal();
  buildHanSelects();
  rebuildFpHan();
  renderAggTable();
  renderAggSummary();
  renderHCards();renderHList();
  renderRoster();
  saveRoster();
}

function deleteEditMbr(){
  if(!_editingId) return;
  if(!confirm('この人を名簿から削除しますか？')) return;
  roster=roster.filter(x=>String(x.id)!==String(_editingId));
  saveRoster();
  buildHanSelects();
  rebuildFpHan();
  renderAggTable();
  renderAggSummary();
  renderRoster();
  closeEditModal();
}
function exportXlsx(){
  if(!roster.length){alert('登録データがありません');return;}
  // 日付文字列→Excelシリアル値（1900年1月1日=1）
  function toSerial(s){
    if(!s) return '';
    const d=new Date(s);
    if(isNaN(d)) return s;
    // Excelのシリアル値：1900/1/1=1（うるう年バグで+2）
    return Math.floor((d - new Date(Date.UTC(1899,11,30)))/86400000);
  }
  // 電話番号からハイフンを除去して数値に
  function toTelNum(s){
    if(!s) return '';
    const n=String(s).replace(/[-ー－\s]/g,'');
    return /^\d+$/.test(n) ? Number(n) : n;
  }
  const rows=roster.map((m,i)=>({
    'No.':i+1,
    '姓':m.sei,'名':m.mei,
    '読み（姓）':m.seiK,'読み（名）':m.meiK,
    '都道府県':m.pref,'市区町村':m.city,'住所':m.addr,
    '電話番号①':toTelNum(m.tel),
    '電話番号②':toTelNum(m.tel2||''),
    '生年月日':toSerial(m.birth),
    '所属組':m.kumi,
    '紹介者':m.shokai,
    '入信日':toSerial(m.nyushin),
    '備考':m.comment||m.biko||'',
    'コメント更新日':m.commentUpdated||'',
    '集計対象':m.aggTarget?'○':'',
  }));
  const ws=XLSX.utils.json_to_sheet(rows);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'入信者名簿');
  XLSX.writeFile(wb,`入信者名簿_${td}.xlsx`);
}

function importXlsx(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    try{
      const wb = XLSX.read(e.target.result, {type:'array', cellDates:true});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {defval:''});
      if(!rows.length){ showMsg('import-msg','データが空です','err'); return; }

      // 列名の揺れに対応するマッピング
      function col(row, ...keys){
        for(const k of keys){
          if(row[k]!==undefined && row[k]!=='') return String(row[k]).trim();
        }
        return '';
      }
      // 電話番号専用：数値型でも文字列型でも正しく処理
      function toTelStr(v){
        if(v===undefined || v===null || v==='') return '';
        // ハイフン・スペース・全角ハイフン等を除去した文字列に変換
        let s = String(v).replace(/[-ー－\s　]/g,'').trim();
        if(!s) return '';
        // 数値として読み込まれて先頭の0が消えている場合に補完
        // 日本の固定・携帯は10桁または11桁。9桁以下なら先頭に0を補完
        if(/^\d+$/.test(s) && s.length <= 10){
          s = '0' + s;
        }
        return s;
      }
      // 日付型セルを YYYY-MM-DD 文字列に変換
      function toDateStr(v){
        if(!v) return '';
        if(v instanceof Date){
          return v.toISOString().slice(0,10);
        }
        const s = String(v).trim();
        // YYYY/MM/DD や YYYY-MM-DD → YYYY-MM-DD
        const m = s.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
        if(m) return m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
        return s;
      }

      let added = 0, updated = 0, skipped = 0;
      for(let ri = 0; ri < rows.length; ri++){
        const row = rows[ri];
        const sei = col(row,'姓','sei');
        const mei = col(row,'名','mei');
        if(!sei){ skipped++; continue; }
        const nyushin = toDateStr(col(row,'入信日','nyushin'));
        const miny = col(row,'未入信','minyushin')==='○' || col(row,'未入信')===true;
        // 所属組を取得
        const kumiVal = col(row,'所属組','kumi') || col(row,'班','han');
        const hanVal = kumiVal ? (kumiMap[kumiVal] || '') : '';
        // 更新データを組み立て
        const newData = {
          sei, mei,
          seiK:  col(row,'読み（姓）','seiK','姓読み'),
          meiK:  col(row,'読み（名）','meiK','名読み'),
          pref:  col(row,'都道府県','pref'),
          city:  col(row,'市区町村','city'),
          addr:  col(row,'住所','addr'),
          tel:   toTelStr(row['電話番号①'] ?? row['電話番号'] ?? row['tel'] ?? ''),
          tel2:  toTelStr(row['電話番号②'] ?? row['tel2'] ?? ''),
          birth: toDateStr(col(row,'生年月日','birth')),
          kumi:  kumiVal,
          han:   hanVal,
          shokai:col(row,'紹介者','shokai'),
          nyushin,
          biko:  col(row,'備考','biko'),
          hossen: false,
          minyushin: miny,
        };
        // 既存メンバーを姓＋名で検索
        const idx = roster.findIndex(function(m){ return m.sei===sei && m.mei===(mei||''); });
        if(idx >= 0){
          // 既存メンバーを上書き（comment・aggTarget・commentUpdatedはアプリ側を保持）
          const old = roster[idx];
          roster[idx] = Object.assign({}, newData, {
            id:             old.id,
            comment:        old.comment        || '',
            commentUpdated: old.commentUpdated || '',
            aggTarget:      old.aggTarget      || false,
          });
          updated++;
        } else {
          // 新規追加
          roster.push(Object.assign({}, newData, {
            id: Date.now() + added,
            comment: '',
            commentUpdated: '',
            aggTarget: col(row,'集計対象')==='○',
          }));
          added++;
        }
      }
      const unmapped = [];
      const kumiSet2 = {};
      for(let i = 0; i < roster.length; i++){
        const k = roster[i].kumi;
        if(k && !kumiMap[k] && !kumiSet2[k]){ unmapped.push(k); kumiSet2[k]=true; }
      }
      const warnMsg = unmapped.length
        ? '（' + unmapped.length + '組が設定タブで班未設定: ' + unmapped.slice(0,3).join('、') + (unmapped.length>3?'…':'') + '）'
        : '';
      saveRoster();
      saveKumiMap();
      initAggData();
      buildHanSelects();
      rebuildFpHan();
      renderRoster();
      renderHCards();
      renderHList();
      renderKumiSelect();
      renderEditKumiSelect();
      renderKumiNameSelect();
      showMsg('import-msg', '追加:'+added+'名 / 更新:'+updated+'名 / スキップ:'+skipped+'件'+warnMsg, 'ok');
    }catch(err){
      showMsg('import-msg','読み込みエラー：'+err.message,'err');
    }
    // inputをリセット（同じファイルを再度読み込めるよう）
    input.value='';
  };
  reader.readAsArrayBuffer(file);
}
