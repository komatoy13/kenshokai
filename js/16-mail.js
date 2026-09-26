/* ===== メール生成 ===== */

// 氏名から表示用の短縮名を生成（名字。同姓が同じ班にいる場合は名の一文字を追加）
function shortName(fullName, hanMembers){
  // fullNameはsei+meiの結合文字列。rosterから該当メンバーを探してseiを取得
  const member = roster.find(function(m){ return (m.sei+(m.mei||'')) === fullName; });
  const sei = member ? member.sei : fullName;
  const mei = member ? (member.mei||'') : '';
  // 同じ班で同じ苗字が複数いるか確認
  const sameSei = hanMembers.filter(function(n){
    const m2 = roster.find(function(m){ return (m.sei+(m.mei||'')) === n; });
    return m2 ? m2.sei === sei : n.startsWith(sei);
  });
  if(sameSei.length <= 1) return sei;
  // 同じ苗字が複数いる場合は名の1文字を追加
  return sei + (mei ? mei[0] : '');
}

function generateMail(){
  let num = 1;
  const lines = [];

  // 1. 折伏成果（折伏成果タブの期間合計）
  const hossenTotal = getHTotal();
  lines.push(num++ + '.折伏成果' + hossenTotal + '名');

  // 2以降：集計タブでアクティブな項目を順に出力
  const selItems = activeItemIds.map(id => items.find(x => x.id === id)).filter(Boolean);

  for(let i = 0; i < selItems.length; i++){
    const item = selItems[i];
    const imode = getItemMode(item.id);
    const isGrab = (imode === 'grab');

    if(item.type === 'confirm'){
      const count = getAggAllMembers().filter(m => !!aggData[memberKey(m.han,m.name)][item.id]?.result).length;
      lines.push(num++ + '.' + item.label + '　' + count + '名');
      const aggHan0=getAggHan();
      for(let hi = 0; hi < aggHan0.length; hi++){
        const h = aggHan0[hi];
        const checked = h.members.filter(m => !!aggData[memberKey(h.name,m)][item.id]?.result);
        lines.push(checked.length > 0
          ? checked.map(m => shortName(m, h.members)).join('、')
          : '');
      }

    } else if(isGrab){
      // A=1, B=0.5, C=0.2, それ以外=0 でスコア計算
      const grabScore = {'A':1,'B':0.5,'C':0.2};
      const totalScore = getAggAllMembers().reduce(function(s,m){
        const g = aggData[memberKey(m.han,m.name)][item.id]?.grab;
        return s + (grabScore[g]||0);
      }, 0);
      const abcCount = getAggAllMembers().filter(m => {
        const g = aggData[memberKey(m.han,m.name)][item.id]?.grab;
        return g === 'A' || g === 'B' || g === 'C';
      }).length;
      lines.push(num++ + '.' + item.label + '掴み　' + abcCount + '名（' + totalScore.toFixed(1) + '）');
      const aggHan1=getAggHan();
      for(let hi = 0; hi < aggHan1.length; hi++){
        const h = aggHan1[hi];
        const abcMembers = h.members.filter(m => {
          const g = aggData[memberKey(h.name,m)][item.id]?.grab;
          return g === 'A' || g === 'B' || g === 'C';
        });
        lines.push(abcMembers.length > 0
          ? abcMembers.map(m => {
              const g = aggData[memberKey(h.name,m)][item.id]?.grab;
              return g + shortName(m, h.members);
            }).join('、')
          : '');
      }

    } else {
      let count = 0;
      const aggHan2=getAggHan();
      if(item.type === 'kikanshi'){
        count = getAggAllMembers().reduce((s,m) => s + (parseInt(aggData[memberKey(m.han,m.name)][item.id]?.result)||0), 0);
        lines.push(num++ + '.' + item.label + '結果　' + count + '部');
        for(let hi = 0; hi < aggHan2.length; hi++){
          const h = aggHan2[hi];
          const checked = h.members.filter(m => (aggData[memberKey(h.name,m)][item.id]?.result||0) > 0);
          lines.push(checked.length > 0 ? checked.map(m => shortName(m, h.members)).join('、') : '');
        }
      } else if(item.type === 'kuyou'){
        count = getAggAllMembers().filter(m => (aggData[memberKey(m.han,m.name)][item.id]?.result||0) > 0).length;
        const amt = getAggAllMembers().reduce((s,m) => s + (parseFloat(aggData[memberKey(m.han,m.name)][item.id]?.result)||0), 0);
        lines.push(num++ + '.' + item.label + '結果　' + count + '名 / ' + amt.toFixed(1) + '万円');
        for(let hi = 0; hi < aggHan2.length; hi++){
          const h = aggHan2[hi];
          const checked = h.members.filter(m => (aggData[memberKey(h.name,m)][item.id]?.result||0) > 0);
          lines.push(checked.length > 0 ? checked.map(m => shortName(m, h.members)).join('、') : '');
        }
      } else {
        count = getAggAllMembers().filter(m => !!aggData[memberKey(m.han,m.name)][item.id]?.result).length;
        lines.push(num++ + '.' + item.label + '結果　' + count + '名');
        for(let hi = 0; hi < aggHan2.length; hi++){
          const h = aggHan2[hi];
          const checked = h.members.filter(m => !!aggData[memberKey(h.name,m)][item.id]?.result);
          lines.push(checked.length > 0 ? checked.map(m => shortName(m, h.members)).join('、') : '');
        }
      }
    }
  }

  // 最後：段取り（今日〜翌週月曜日）
  const now = new Date();
  const todayStr = now.toISOString().slice(0,10);
  const nextMon = new Date(now);
  const dow = now.getDay();
  const daysUntilMon = dow === 1 ? 7 : (8 - dow) % 7;
  nextMon.setDate(now.getDate() + daysUntilMon);
  const nextMonStr = nextMon.toISOString().slice(0,10);
  const plans = fukubokuPlans.filter(p => p.date >= todayStr && p.date <= nextMonStr);
  lines.push(num++ + '.段取り　' + plans.length + '件');
  plans.forEach(p => {
    const dateDisp = p.date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2月$3日');
    lines.push(dateDisp + '、' + (p.time ? p.time + '〜、' : '') + p.member + (p.memo ? '、' + p.memo : ''));
  });

  const text = lines.join('\n');
  document.getElementById('ml-text').value = text;

  // プレビュー描画（見出し行は太字・青、名前行は通常、空行はグレーの「―」）
  const preview = document.getElementById('ml-preview');
  preview.innerHTML = lines.map(line => {
    if(/^\d+\./.test(line)){
      // 番号付き見出し行
      return '<span style="font-weight:600;color:#1a6bbf">' + line.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</span>';
    } else if(line === ''){
      return '<span style="color:#ddd;font-size:11px">（参加者なし）</span>';
    } else {
      return '<span>' + line.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</span>';
    }
  }).join('\n');

  document.getElementById('ml-output').style.display = '';
}

function copyMail(){
  const t = document.getElementById('ml-text');
  t.select();
  try{
    document.execCommand('copy');
    flash('ml-msg','コピーしました');
  }catch(e){
    navigator.clipboard?.writeText(t.value).then(()=>flash('ml-msg','コピーしました'));
  }
}
