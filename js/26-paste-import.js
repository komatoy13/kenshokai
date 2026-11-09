/* ===== 文面取り込み（入信者登録）=====
   メール等の文面を貼り付けると、氏名・生年月日・住所・電話・入信日・紹介者を読み取って
   入信者登録フォームに自動入力する。すべてブラウザ内で処理（外部送信なし）。
   ・読み取りはルールベース。自信のない項目は橙色（要確認）で表示する
   ・未入力の必須項目は赤色で表示する
   ・複数人まとめて貼った場合は1人ずつ順に取り込む
   ・名簿に同名の方がいる場合は「新規／更新」を選ばせる（更新は支隊長のみ）
   フォームの項目名（id）は index.html の #pg2 を参照。 */

const PI = {
  active:false, queue:[], idx:0,
  registering:false, loading:false, addrLocked:false,
  dupChoice:null, dupKey:'', cur:null
};

/* ---------- 地名テーブル（都道府県の推定用） ---------- */
const PI_CITY_SRC = {
  '岐阜県':'岐阜市,大垣市,高山市,多治見市,関市,中津川市,美濃市,瑞浪市,羽島市,恵那市,美濃加茂市,土岐市,各務原市,可児市,山県市,瑞穂市,飛騨市,本巣市,郡上市,下呂市,海津市,岐南町,笠松町,養老町,垂井町,関ケ原町,神戸町,輪之内町,安八町,揖斐川町,大野町,池田町,北方町,坂祝町,富加町,川辺町,七宗町,八百津町,白川町,東白川村,御嵩町,白川村',
  '愛知県':'名古屋市,豊橋市,岡崎市,一宮市,瀬戸市,半田市,春日井市,豊川市,津島市,碧南市,刈谷市,豊田市,安城市,西尾市,蒲郡市,犬山市,常滑市,江南市,小牧市,稲沢市,新城市,東海市,大府市,知多市,知立市,尾張旭市,高浜市,岩倉市,豊明市,日進市,田原市,愛西市,清須市,北名古屋市,弥富市,みよし市,あま市,長久手市',
  '三重県':'津市,四日市市,伊勢市,松阪市,桑名市,鈴鹿市,名張市,尾鷲市,亀山市,鳥羽市,熊野市,いなべ市,志摩市,伊賀市',
  '滋賀県':'大津市,彦根市,長浜市,近江八幡市,草津市,守山市,栗東市,甲賀市,野洲市,湖南市,高島市,東近江市,米原市',
  '長野県':'長野市,松本市,上田市,飯田市,諏訪市,伊那市',
  '静岡県':'静岡市,浜松市,沼津市,富士市',
  '福井県':'福井市','石川県':'金沢市','富山県':'富山市',
  '京都府':'京都市','大阪府':'大阪市,堺市,豊中市,吹田市,高槻市,枚方市,東大阪市',
  '兵庫県':'神戸市,姫路市,尼崎市,西宮市,明石市,宝塚市','奈良県':'奈良市','和歌山県':'和歌山市',
  '北海道':'札幌市','宮城県':'仙台市','神奈川県':'横浜市,川崎市,相模原市','埼玉県':'さいたま市',
  '千葉県':'千葉市','新潟県':'新潟市','岡山県':'岡山市','広島県':'広島市','福岡県':'福岡市,北九州市','熊本県':'熊本市'
};
const PI_CITY_PREF = (function(){
  const map = {};
  Object.keys(PI_CITY_SRC).forEach(function(p){
    PI_CITY_SRC[p].split(',').forEach(function(c){ map[c] = p; });
  });
  return map;
})();

const PI_ERA_LETTER = {M:'明治',T:'大正',S:'昭和',H:'平成',R:'令和'};
const PI_ERA_MAX = {明治:45,大正:15,昭和:64,平成:31,令和:99};
const PI_PREF_RE = /^(北海道|東京都|京都府|大阪府|[^\d\s都道府県]{2,3}県)/;
const PI_CITY_RE = /^((?:[^\d\s郡市区町村]{1,6}郡)?(?:[^\d\s郡市区町村]{1,6}?市(?:[^\d\s郡市区町村]{1,5}?区)?|[^\d\s郡市区町村]{1,6}?[町村])|[^\d\s郡市区町村]{1,6}?区)/;
const PI_BLD_RE = /(ハイツ|マンション|アパート|コーポ|レジデンス|メゾン|ハウス|パレス|ビル|荘|棟|館|号室|団地|コート|ヒルズ|タワー|テラス|プラザ|ガーデン|レジデンシャル|\d階)/;
const PI_SEI_COMPOUND = ['佐々木','小笠原','長谷川','五十嵐','阿久津','久保田','三ツ谷','小田切','茅野','勅使河原','四方田','留守'];
const PI_NOISE_WORD = /^(男性?|女性?|様|さん|氏|以上|よろしく|お願い|お願いします|入信|入信者|新入信者|折伏|新規|報告|なし|無し|無|-|―|不明|未定)$/;
const PI_NOISE_LINE = /^(お疲れ|おつかれ|いつも|お世話|よろしくお願い|以上|ご確認|宛|from|to|cc|subject|件名|送信|日時|re:|fwd?:|>|報告します|報告です|下記|以下|新入信者|ご報告)/i;

/* ---------- 文字列ユーティリティ ---------- */
function piNorm(s){
  let t = String(s||'');
  try{ t = t.normalize('NFKC'); }catch(e){}
  t = t.replace(/\r\n?/g,'\n').replace(/\t/g,' ').replace(/[​-‍﻿]/g,'');
  t = t.replace(/[（(]\s*\d{1,3}\s*[歳才]\s*[）)]/g,' ');             // （27歳）
  t = t.replace(/(\d)[‐‑‒–—―−ー-]+(?=\d)/g,'$1-');                    // 数字の間の各種ハイフン
  t = t.replace(/(\d)[ ]+([年月日])/g,'$1$2').replace(/([年月])[ ]+(\d)/g,'$1$2');
  t = t.replace(/(明治|大正|昭和|平成|令和)[ ]+(\d|元)/g,'$1$2');
  // 空白区切りの電話番号 090 1234 5678 → 090-1234-5678
  t = t.replace(/(^|[^\d])(0\d{1,3})[ -]+(\d{2,4})[ -]+(\d{3,4})(?!\d)/g,'$1$2-$3-$4');
  return t;
}
function piIsKana(s){ return /^[ぁ-んァ-ヶー・゛゜]+$/.test(s); }
function piIsHira(s){ return /^[ぁ-んー・]+$/.test(s); }
function piHasKanji(s){ return /[㐀-鿿々〆]/.test(s); }
function piToHira(s){ return s.replace(/[ァ-ヶ]/g,function(c){ return String.fromCharCode(c.charCodeAt(0)-0x60); }); }
function piDaysIn(y,m){ return new Date(y,m,0).getDate(); }
function piPad(n){ n=String(n); return n.length<2?'0'+n:n; }
function piLocalYear(){ return parseInt(todayLocal().slice(0,4),10); }

/* ---------- 文面を「人ごと」のかたまりに分ける ---------- */
function piSplitPersons(text){
  const lines = piNorm(text).split('\n');
  const sep = /^[\s\-―—–=_*~◆◇■□●○▼▽▲△#]{2,}$/;
  const mark = /^(?:第?\d+人目|No\.?\s*\d+(?!\d)|#\d+)\s*[:.)、]?\s*/i;
  let blocks = [], cur = [];
  function flush(){ if(cur.some(function(l){ return l.trim(); })) blocks.push(cur); cur = []; }
  lines.forEach(function(raw){
    const l = raw.trim();
    if(sep.test(l)){ flush(); return; }
    const m = l.match(mark);
    if(m){ flush(); const rest = l.slice(m[0].length).trim(); if(rest) cur.push(rest); return; }
    cur.push(l);
  });
  flush();
  // 空行で区切られている → 各かたまりに日付か電話があれば別人とみなす
  const out = [];
  blocks.forEach(function(b){
    const subs = []; let s = [];
    b.forEach(function(l){ if(!l){ if(s.length) subs.push(s); s=[]; } else s.push(l); });
    if(s.length) subs.push(s);
    if(subs.length>1 && subs.every(piLooksLikePerson)){ subs.forEach(function(x){ out.push(x); }); return; }
    const flat = b.filter(function(l){ return l; });
    // 1行1人（各行が日付or電話を含み、4語以上）
    if(flat.length>=2 && flat.every(function(l){ return l.split(/ +/).length>=4 && piLooksLikePerson([l]); })){
      flat.forEach(function(l){ out.push([l]); });
      return;
    }
    out.push(flat);
  });
  return out;
}
function piLooksLikePerson(lines){
  const t = lines.join('\n');
  return /0\d{9,10}|0\d{1,4}-\d{1,4}-\d{3,4}/.test(t) || /\d{1,4}[./月-]\d{1,2}/.test(t) || /(昭和|平成|令和|大正|明治)\d/.test(t);
}

/* ---------- トークンの判定 ---------- */
function piPhone(tok){
  let t = tok.replace(/[()]/g,'').replace(/^tel[:：]?/i,'');
  t = t.replace(/^\+81-?0?/,'0');
  if(!/^0[\d-]{8,13}$/.test(t)) return '';
  const d = t.replace(/-/g,'');
  return /^0\d{9,10}$/.test(d) ? d : '';
}
function piDateTok(tok){
  let t = tok.replace(/[()（）]/g,'');
  let hint = '';
  if(/入信/.test(t)){ hint='nyushin'; t = t.replace(/入信日?|入信年月日/g,''); }
  if(/生年月日|生まれ|誕生日|生$/.test(t)){ hint='birth'; t = t.replace(/生年月日|生まれ|誕生日|生$/g,''); }
  t = t.replace(/^[:：]/,'');
  if(!t) return null;
  let m = t.match(/^(明治|大正|昭和|平成|令和|[MTSHRmtshr])\.?(\d{1,2}|元)[年./-](\d{1,2})[月./-](\d{1,2})日?$/);
  if(m){
    const era = PI_ERA_LETTER[m[1].toUpperCase()] || m[1];
    const y = m[2]==='元' ? 1 : parseInt(m[2],10);
    return {kind:'era', era:era, y:y, m:parseInt(m[3],10), d:parseInt(m[4],10), hint:hint, src:tok};
  }
  m = t.match(/^(\d{4}|\d{2})[年./-](\d{1,2})[月./-](\d{1,2})日?$/);
  if(m){
    return {kind:'ymd', y:parseInt(m[1],10), two:m[1].length===2, m:parseInt(m[2],10), d:parseInt(m[3],10), hint:hint, src:tok};
  }
  m = t.match(/^(\d{1,2})[月/.](\d{1,2})日?$/);
  if(m){
    return {kind:'md', m:parseInt(m[1],10), d:parseInt(m[2],10), hint:hint||'', src:tok};
  }
  return null;
}
function piAddrTok(t, cityList){
  if(PI_PREF_RE.test(t) && t.length>3) return true;
  if(/\d/.test(t) && /[市区町村郡丁目番地]/.test(t) && piHasKanji(t)) return true;
  for(let i=0;i<cityList.length;i++){ if(t.indexOf(cityList[i])===0) return true; }
  if(/[市区町村郡]$/.test(t) && t.length>=3 && !PI_NOISE_WORD.test(t)) return true;
  return false;
}
function piLooksBuilding(t){ return /\d/.test(t) || PI_BLD_RE.test(t); }

/* ---------- 住所を 都道府県／市区町村／それ以下 に分ける ---------- */
function piParseAddr(a, ctx, P){
  let rest = a.trim();
  let pref = '', city = '';
  const pm = rest.match(PI_PREF_RE);
  if(pm && rest.length>pm[0].length){ pref = pm[0]; rest = rest.slice(pref.length); }
  // 名簿に出てくる市区町村を優先
  const cities = ctx.cities;
  for(let i=0;i<cities.length;i++){
    if(rest.indexOf(cities[i])===0){ city = cities[i]; break; }
  }
  if(!city){
    for(let i=0;i<ctx.knownCities.length;i++){
      if(rest.indexOf(ctx.knownCities[i])===0){ city = ctx.knownCities[i]; break; }
    }
  }
  if(!city){
    const cm = rest.match(PI_CITY_RE);
    if(cm) city = cm[0];
  }
  // 「神戸市」のあとに区が続く場合は区までを市区町村に含める
  if(city && /市$/.test(city)){
    const wm = rest.slice(city.length).match(/^[^\d\s郡市区町村]{1,5}?区/);
    if(wm) city += wm[0];
  }
  if(city) rest = rest.slice(city.length);
  rest = rest.trim();
  if(!pref){
    const key = city.replace(/^[^\d\s郡]{1,6}郡/,'').replace(/(市)[^市]*区$/,'$1');
    pref = ctx.cityPref[city] || ctx.cityPref[key] || PI_CITY_PREF[city] || PI_CITY_PREF[key] || '';
    if(pref) P.warn.pref = '都道府県は市区町村から推定しました';
  }
  if(!city) P.warn.city = '市区町村を判別できなかったため「それ以下」に入れました';
  return {pref:pref, city:city, addr:rest};
}

/* ---------- 氏名 ---------- */
function piStripHonor(t){
  const m = t.match(/^(.{2,}?)(さん|様|サマ|殿|氏|君|くん|ちゃん|先生)$/);
  return m ? m[1] : t;
}
function piSplitName(t, ctx, P, who){
  // 区切り記号があればそこで分ける
  const d = t.match(/^(.+?)[・=](.+)$/);
  if(d) return {sei:d[1], mei:d[2]};
  if(piIsKana(t) || /^[A-Za-z.'-]+$/.test(t)){
    P.warn[who+'name'] = '姓と名の区切りが分からないため、姓の欄に全部入れました。分けてください';
    return {sei:t, mei:''};
  }
  const mixed = t.match(/^([㐀-鿿々〆]+)([ぁ-んァ-ヶー]+)$/);
  if(mixed && mixed[1].length>=1) return {sei:mixed[1], mei:mixed[2]};
  for(let i=0;i<ctx.seis.length;i++){
    const s = ctx.seis[i];
    if(t.length>s.length && t.indexOf(s)===0) return {sei:s, mei:t.slice(s.length)};
  }
  for(let i=0;i<PI_SEI_COMPOUND.length;i++){
    const s = PI_SEI_COMPOUND[i];
    if(t.length>s.length && t.indexOf(s)===0){ P.warn[who+'name']='姓名の区切りを推定しました'; return {sei:s, mei:t.slice(s.length)}; }
  }
  P.warn[who+'name'] = '姓名の区切りを推定しました（名簿にない姓です）';
  const n = t.length;
  if(t.charAt(1)==='々' && n>3) return {sei:t.slice(0,3), mei:t.slice(3)};
  if(n<=2) return {sei:t.slice(0,1), mei:t.slice(1)};
  if(n===3) return {sei:t.slice(0,2), mei:t.slice(2)};
  if(n===4) return {sei:t.slice(0,2), mei:t.slice(2)};
  if(n===5) return {sei:t.slice(0,2), mei:t.slice(2)};
  return {sei:t.slice(0,3), mei:t.slice(3)};
}
function piPairLike(a,b){
  if(!a||!b||a.line!==b.line) return false;
  if(piIsKana(a.t) && piIsKana(b.t) && a.t.length<=7 && b.t.length<=7) return true;
  return a.t.length<=3 && b.t.length<=3 && a.t.length+b.t.length<=6;
}
function piFullName(g){ return g.map(function(x){ return x.t; }).join(''); }

/* ---------- 1人ぶんの文面を解析 ---------- */
function piParseBlock(lines, ctx){
  const P = {sei:'',mei:'',seiK:'',meiK:'',shokai:'',birth:null,nyushin:'',
    zip:'',pref:'',city:'',addr:'',tel:'',tel2:'',kumi:'',minyushin:false,comment:'',
    rest:[],notes:[],warn:{},auto:{}};
  const nameC = [], readC = [], dates = [], phones = [], zips = [], addrParts = [];
  let lastKind = '', order = 0, lastWasName = null;
  const labelRe = /^(氏名|お名前|名前|ふりがな|フリガナ|よみがな|読み|生年月日|誕生日|生まれ|住所|現住所|ご住所|所在地|電話番号|電話|TEL|携帯電話|携帯|連絡先|郵便番号|紹介者|ご紹介者|紹介|折伏者|入信年月日|入信日|入信|備考|メモ|性別|年齢|組|所属)\s*(?:[:：=]\s*|\s+|$)(.*)$/i;
  const emptyVal = /^(なし|無し|無|-|―|不明|未定|特になし)$/;

  function addDateTokens(v, hint){
    const toks = v.split(/ +/); let any = false;
    toks.forEach(function(t){
      if(!t) return;
      const d = piDateTok(t);
      if(d){ if(hint && !d.hint) d.hint = hint; dates.push(d); any = true; }
      else P.rest.push(t);
    });
    return any;
  }
  function addPhones(v){
    v.split(/[ ,、/]+/).forEach(function(t){
      if(!t) return; const p = piPhone(t);
      if(p) phones.push(p); else if(!/^(tel|電話)$/i.test(t)) P.rest.push(t);
    });
  }
  function addNameTokens(v, hint){
    v.split(/ +/).forEach(function(t){ if(t) pushNameTok(t, hint); });
  }
  function pushNameTok(t, hint){
    // 道家豊光（どうけとよみつ）
    const pm = t.match(/^(.+?)[（(]([ぁ-んァ-ヶー・]+)[）)]$/);
    if(pm){ t = pm[1]; readC.push({t:pm[2], line:order}); }
    t = piStripHonor(t.replace(/[()（）【】「」『』]/g,''));
    if(!t || PI_NOISE_WORD.test(t)) return;
    if(!/^[぀-ヿ㐀-鿿ー々〆ヶ・A-Za-z.'-]+$/.test(t)){ P.rest.push(t); return; }
    const o = {t:t, line:order, hint:hint||'', seq:nameC.length};
    nameC.push(o); lastWasName = o;
  }

  lines.forEach(function(rawLine){
    order++;
    let line = rawLine.replace(/^[・●○◆◇■□▶▷☆★※\-*]\s*/,'').trim();
    if(!line) return;
    if(/@|https?:|www\./i.test(line)) return;
    if(PI_NOISE_LINE.test(line)) return;
    if(/[。]/.test(line) && line.length>12 && !/\d{3,}/.test(line)) return;   // 挨拶文など
    if(/未入信|入信前|未入会/.test(line)){ P.minyushin = true; line = line.replace(/未入信|入信前|未入会/g,' ').trim(); if(!line) return; }

    // 郵便番号が行頭にある（〒500-8888 岐阜県…）
    line = line.replace(/〒\s*(\d{3}-?\d{4})\s*/g,function(_,z){ zips.push(z.replace('-','')); return ' '; }).trim();
    if(!line) return;

    const lm = line.match(labelRe);
    if(lm){
      const lab = lm[1], val = (lm[2]||'').trim();
      if(!val || emptyVal.test(val)){ return; }
      if(/^(氏名|お名前|名前)$/.test(lab)){ addNameTokens(val,'person'); lastKind='name'; return; }
      if(/^(ふりがな|フリガナ|よみがな|読み)$/.test(lab)){ val.split(/ +/).forEach(function(t){ readC.push({t:t,line:order,labeled:true}); }); return; }
      if(/^(生年月日|誕生日|生まれ)$/.test(lab)){ addDateTokens(val,'birth'); return; }
      if(/^(入信年月日|入信日|入信)$/.test(lab)){ addDateTokens(val,'nyushin'); return; }
      if(/^(住所|現住所|ご住所|所在地)$/.test(lab)){ addrParts.push(val); lastKind='addr'; return; }
      if(/^(電話番号|電話|TEL|携帯電話|携帯|連絡先)$/i.test(lab)){ addPhones(val); return; }
      if(/^郵便番号$/.test(lab)){ zips.push(val.replace(/\D/g,'')); return; }
      if(/^(紹介者|ご紹介者|紹介|折伏者)$/.test(lab)){ addNameTokens(val,'shokai'); return; }
      if(/^(備考|メモ)$/.test(lab)){ P.comment += (P.comment?'\n':'')+val; return; }
      if(/^(組|所属)$/.test(lab)){ if(ctx.kumiNames.indexOf(val)>=0) P.kumi=val; else P.rest.push(lab+'：'+val); return; }
      return; // 性別・年齢は無視
    }

    const toks = line.split(/ +/).filter(function(x){ return x; });
    let inAddr = false;
    toks.forEach(function(t, ti){
      const ph = piPhone(t);
      if(ph){ phones.push(ph); return; }
      if(/^\d{7}$/.test(t)){ zips.push(t); return; }
      if(/^\d{3}-\d{4}$/.test(t)){ zips.push(t.replace('-','')); return; }
      if(/^\d+$/.test(t)) return;                                   // 「7」など通し番号
      const dt = piDateTok(t);
      if(dt){ dates.push(dt); lastKind='date'; return; }
      if(/紹介/.test(t)){
        const r = t.replace(/紹介者?|ご紹介/g,'').replace(/^[:：]/,'');
        if(r) pushNameTok(r,'shokai');
        return;
      }
      if(piAddrTok(t, ctx.cityHeads)){ addrParts.push(t); inAddr = true; lastKind='addr'; lastWasName=null; return; }
      // 住所のあとに続く建物名・部屋番号
      if((inAddr || (lastKind==='addr' && ti===0)) && piLooksBuilding(t)){
        // 「サンティアラ B-105」のように建物名と部屋番号が分かれている場合
        if(/^[A-Za-z]?-?\d{1,4}(号室?)?$/.test(t) && lastWasName && lastWasName.line===order && lastWasName.seq===nameC.length-1 && inAddr){
          nameC.pop(); addrParts[addrParts.length-1] += ' ' + lastWasName.t;
        }
        addrParts[addrParts.length-1] += ' ' + t;
        lastWasName = null;
        return;
      }
      pushNameTok(t,'');
      lastKind = 'name';
    });
  });

  /* --- 日付の振り分け --- */
  const thisYear = piLocalYear(), today = todayLocal();
  let birth = null, nyu = null, pool = [];
  function validDate(y,m,d){ return m>=1&&m<=12&&d>=1&&d<=piDaysIn(y,m); }
  dates.forEach(function(d){
    if(d.kind==='era'){
      const mx = PI_ERA_MAX[d.era];
      const y = (PI_ERA_MAX[d.era]?ERA_BASE[d.era]:0) + d.y;
      if(!mx || d.y<1 || d.y>mx || !validDate(y,d.m,d.d)){ P.rest.push(d.src); return; }
      d.year = y;
      if(d.hint==='nyushin'){ if(!nyu) nyu = d; else P.rest.push(d.src); }
      else { if(!birth) birth = d; else P.rest.push(d.src); }
    } else if(d.kind==='md'){
      if(!validDate(2000,d.m,d.d)){ P.rest.push(d.src); return; }
      if(d.hint==='birth'){ P.rest.push(d.src); return; }
      if(!nyu) nyu = d; else P.rest.push(d.src);
    } else {
      let y = d.y;
      if(d.two){ y = (2000+y>thisYear) ? 1900+y : 2000+y; }
      if(!validDate(y,d.m,d.d)){ P.rest.push(d.src); return; }
      d.year = y;
      if(d.hint==='nyushin'){ if(!nyu) nyu = d; else P.rest.push(d.src); }
      else if(d.hint==='birth'){ if(!birth) birth = d; else P.rest.push(d.src); }
      else pool.push(d);
    }
  });
  if(pool.length){
    pool.sort(function(a,b){ return a.year-b.year; });
    pool.forEach(function(d){
      let toBirth;
      if(!birth && !nyu){ toBirth = pool.length>1 ? (d===pool[0]) : (d.year < thisYear-1); }
      else if(!birth) toBirth = true;
      else toBirth = false;
      if(toBirth && !birth){ birth = d; if(pool.length===1) P.warn.birth = '生年月日か入信日か判断できませんでした。ご確認ください'; }
      else if(!nyu){ nyu = d; if(pool.length===1) P.warn.nyushin = '生年月日か入信日か判断できませんでした。ご確認ください'; }
      else P.rest.push(d.src);
    });
  }
  if(birth){
    if(birth.kind==='era') P.birth = {era:birth.era, y:String(birth.y), m:String(birth.m), d:String(birth.d), year:birth.year};
    else P.birth = {era:'', y:String(birth.year), m:String(birth.m), d:String(birth.d), year:birth.year};
    if(birth.kind==='ymd' && birth.two) P.warn.birth = '2桁の年を '+birth.year+'年 と解釈しました。ご確認ください';
    if(birth.year<1900 || birth.year>thisYear) P.warn.birth = '生年月日が不自然です（'+birth.year+'年）';
  }
  if(nyu){
    let y = nyu.year, note = '';
    if(nyu.kind==='md'){
      y = thisYear;
      if(y+'-'+piPad(nyu.m)+'-'+piPad(nyu.d) > today){ y = thisYear-1; }
      note = '年が書かれていないため '+y+'年 として入力しました';
    }
    P.nyushin = y+'-'+piPad(nyu.m)+'-'+piPad(nyu.d);
    if(nyu.kind==='ymd' && nyu.two) P.warn.nyushin = '2桁の年を '+y+'年 と解釈しました';
    else if(note) P.warn.nyushin = note;
    else if(!P.warn.nyushin && P.nyushin>today) P.warn.nyushin = '入信日が未来の日付です';
  }
  if(P.minyushin && P.nyushin){ P.notes.push('「未入信」と入信日の両方がありました。入信日を優先し、未入信にはしていません'); P.minyushin=false; }

  /* --- 電話・郵便番号 --- */
  const seenPh = {}; const ph2 = [];
  phones.forEach(function(p){ if(!seenPh[p]){ seenPh[p]=1; ph2.push(p); } });
  P.tel = ph2[0]||''; P.tel2 = ph2[1]||'';
  if(ph2.length>2) P.rest.push('電話：'+ph2.slice(2).join('、'));
  if(zips.length) P.zip = zips[0].replace(/(\d{3})(\d{4})/,'$1-$2');

  /* --- 住所 --- */
  if(addrParts.length){
    const ap = piParseAddr(addrParts.join(' '), ctx, P);
    P.pref = ap.pref; P.city = ap.city; P.addr = ap.addr;
    if(addrParts.length>1) P.notes.push('住所が複数ありました。つなげて入力しています');
  }

  /* --- 氏名の振り分け --- */
  // ひらがなだけの語が漢字名の直後にあれば「読み」とみなす
  const free = [], labeledP = [], labeledS = [];
  nameC.forEach(function(c){
    if(c.hint==='person') labeledP.push(c);
    else if(c.hint==='shokai') labeledS.push(c);
    else free.push(c);
  });
  const freeNames = [];
  free.forEach(function(c, i){
    const prev = freeNames.length ? freeNames[freeNames.length-1] : null;
    if(piIsHira(c.t) && prev && piHasKanji(prev.t) && prev.line===c.line){ readC.push({t:c.t,line:c.line}); return; }
    freeNames.push(c);
  });
  function groupsOf(arr){
    const gs = []; let i = 0;
    while(i<arr.length){
      if(i+1<arr.length && piPairLike(arr[i],arr[i+1])){ gs.push([arr[i],arr[i+1]]); i+=2; }
      else { gs.push([arr[i]]); i++; }
    }
    return gs;
  }
  let personG = null, shoG = null;
  if(labeledP.length){
    personG = labeledP.slice(0,2);
    if(labeledP.length>2) P.rest.push(labeledP.slice(2).map(function(x){return x.t;}).join(' '));
  }
  if(labeledS.length) shoG = labeledS.slice(0,2);
  const gs = groupsOf(freeNames);
  if(!personG && gs.length){ personG = gs.shift(); }
  if(!shoG && gs.length){
    shoG = gs.shift();
    if(!labeledS.length && !labeledP.length) P.warn.shokai = '紹介者かどうか、ご確認ください（2人目の名前を紹介者として入力）';
  }
  gs.forEach(function(g){ P.rest.push(piFullName(g)); });
  // 名簿にいる人が「本人」側に入っていたら入れ替え（紹介者は通常すでに名簿にいる）
  if(personG && shoG && !labeledP.length && !labeledS.length){
    const isMember = function(g){ return ctx.fullNames.indexOf(piFullName(g))>=0; };
    if(isMember(personG) && !isMember(shoG)){
      const tmp = personG; personG = shoG; shoG = tmp;
      P.warn.shokai = '名簿にいる方を紹介者として入力しました。ご確認ください';
    }
  }
  if(personG){
    if(personG.length===2){ P.sei = personG[0].t; P.mei = personG[1].t; }
    else { const sp = piSplitName(personG[0].t, ctx, P, ''); P.sei = sp.sei; P.mei = sp.mei; }
    if(piIsKana(P.sei) && !piHasKanji(P.sei)){
      // カタカナ名（外国の方など）は読みも自動で入れる
      P.seiK = piToHira(P.sei); P.meiK = piToHira(P.mei);
      P.auto.seiK = P.auto.meiK = true;
    }
  }
  if(shoG){
    P.shokai = shoG.length===2 ? shoG[0].t+shoG[1].t : shoG[0].t;
  }
  // 読み
  if(readC.length && P.sei && !P.seiK){
    const rs = readC.map(function(r){ return piToHira(r.t.replace(/・/g,'')); });
    if(rs.length>=2){ P.seiK = rs[0]; P.meiK = rs[1]; P.auto.seiK = P.auto.meiK = true; }
    else { P.notes.push('読み「'+rs[0]+'」を読み取りました（姓・名の区切りが分からないため入力していません）'); }
  }
  // 氏名の警告キーを統一
  if(P.warn.name){ P.warn.sei = P.warn.mei = P.warn.name; delete P.warn.name; }
  if(P.warn.shokai && !P.shokai) delete P.warn.shokai;
  return P;
}

function piBuildCtx(){
  const cities = {}, cityPref = {}, seis = {}, fullNames = [];
  const cnt = {};
  roster.forEach(function(m){
    if(m.city){
      cities[m.city] = 1;
      if(m.pref){ cnt[m.city] = cnt[m.city]||{}; cnt[m.city][m.pref] = (cnt[m.city][m.pref]||0)+1; }
    }
    if(m.sei && m.sei.length>=1) seis[m.sei] = 1;
    fullNames.push((m.sei||'')+(m.mei||''));
  });
  Object.keys(cnt).forEach(function(c){
    let best='',bn=0; Object.keys(cnt[c]).forEach(function(p){ if(cnt[c][p]>bn){ bn=cnt[c][p]; best=p; } });
    cityPref[c] = best;
  });
  const byLen = function(a,b){ return b.length-a.length; };
  const cityList = Object.keys(cities).sort(byLen);
  const knownCities = Object.keys(PI_CITY_PREF).sort(byLen);
  return {
    cities:cityList, knownCities:knownCities, cityPref:cityPref,
    seis:Object.keys(seis).sort(byLen), fullNames:fullNames,
    cityHeads:cityList.concat(knownCities),
    kumiNames:Object.keys(kumiMap||{})
  };
}

function piParseAll(text){
  const ctx = piBuildCtx();
  const out = [];
  piSplitPersons(text).forEach(function(lines){
    const P = piParseBlock(lines, ctx);
    if(P.sei || P.tel || P.addr || P.birth || P.nyushin) out.push(P);
  });
  return out;
}

/* ---------- 画面への反映 ---------- */
const PI_FIELD_IDS = {
  sei:['r-sei'], mei:['r-mei'], seiK:['r-sk'], meiK:['r-mk'], zip:['r-zip'],
  pref:['r-pref'], city:['r-city'], addr:['r-addr'], tel:['r-tel'], tel2:['r-tel2'],
  birth:['r-birth-era','r-birth-y','r-birth-m','r-birth-d'], kumi:['r-kumi'],
  shokai:['r-shokai'], nyushin:['r-nyushin'], comment:['r-comment']
};
function piMark(field, cls){
  (PI_FIELD_IDS[field]||[]).forEach(function(id){
    const el = document.getElementById(id); if(el) el.classList.add(cls);
  });
}
function piClearMarks(){
  document.querySelectorAll('#pg2 .imp-auto,#pg2 .imp-warn,#pg2 .imp-miss').forEach(function(el){
    el.classList.remove('imp-auto','imp-warn','imp-miss');
  });
}
function piAddrLocked(){ return PI.active && PI.addrLocked; }

function piFormHasData(){
  return ['r-sei','r-mei','r-tel','r-addr','r-shokai'].some(function(id){ return gv(id); });
}
function piEsc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function piLoad(i){
  const P = PI.queue[i]; if(!P) return;
  PI.idx = i; PI.cur = P; PI.dupChoice = null; PI.dupKey = '';
  PI.loading = true; clearReg(); PI.loading = false;
  piClearMarks();
  const set = function(id,v,field,auto){ if(v){ sv(id,v); if(field) piMark(field, P.warn[field]?'imp-warn':'imp-auto'); } };
  set('r-sei',P.sei,'sei'); set('r-mei',P.mei,'mei');
  set('r-sk',P.seiK,'seiK'); set('r-mk',P.meiK,'meiK');
  set('r-pref',P.pref,'pref'); set('r-city',P.city,'city'); set('r-addr',P.addr,'addr');
  set('r-tel',P.tel,'tel'); set('r-tel2',P.tel2,'tel2');
  set('r-shokai',P.shokai,'shokai');
  if(P.zip){ sv('r-zip',P.zip); piMark('zip','imp-auto'); }
  if(P.birth){
    sv('r-birth-era',P.birth.era); sv('r-birth-y',P.birth.y); sv('r-birth-m',P.birth.m); sv('r-birth-d',P.birth.d);
    getBirthValue();
    piMark('birth', P.warn.birth?'imp-warn':'imp-auto');
  }
  if(P.minyushin){ document.getElementById('r-minyushin').checked = true; toggleMinyushin(); }
  else if(P.nyushin){ sv('r-nyushin',P.nyushin); piMark('nyushin', P.warn.nyushin?'imp-warn':'imp-auto'); }
  if(P.kumi){ sv('r-kumi',P.kumi); onKumiChange(); piMark('kumi','imp-auto'); }
  if(P.comment){ sv('r-comment',P.comment); piMark('comment','imp-auto'); }
  // 住所：取り込んだ内容を郵便番号検索で上書きしない
  PI.addrLocked = !!(P.pref || P.city || P.addr);
  if(P.zip && (!P.pref || !P.city)){ onZipInput(document.getElementById('r-zip')); }
  // 未入力の項目
  if(!P.sei) piMark('sei','imp-miss');
  if(!P.kumi) piMark('kumi','imp-miss');
  if(!P.minyushin && !P.nyushin) piMark('nyushin','imp-miss');
  if(!P.birth) piMark('birth','imp-miss');
  if(!P.tel) piMark('tel','imp-miss');
  if(!P.city && !P.addr) piMark('addr','imp-miss');
  PI.active = true;
  piRender();
}

function piFindDup(sei, mei, tel, tel2){
  const norm = function(s){ return String(s||'').replace(/\s/g,''); };
  const n = norm(sei)+norm(mei);
  return roster.filter(function(m){
    if(n && norm(m.sei)+norm(m.mei)===n) return true;
    const t = [tel,tel2].filter(function(x){return x;});
    return t.some(function(x){ return x===m.tel || x===m.tel2; });
  });
}

function piRender(){
  const box = document.getElementById('imp-result');
  if(!box) return;
  if(!PI.active){ box.innerHTML = ''; return; }
  const P = PI.cur, total = PI.queue.length;
  let h = '';
  h += '<div class="imp-stat"><b>'+(total>1 ? (PI.idx+1)+' / '+total+' 人目' : '取り込み結果')+'</b>'
     + '<span class="imp-leg"><i class="imp-auto-s"></i>自動入力　<i class="imp-warn-s"></i>要確認　<i class="imp-miss-s"></i>未入力</span></div>';
  const items = [];
  Object.keys(P.warn).forEach(function(k){
    if(k==='sei'||k==='mei'){ if(k==='mei') return; }
    items.push('⚠ '+piEsc(P.warn[k]));
  });
  P.notes.forEach(function(n){ items.push('ℹ '+piEsc(n)); });
  const miss = [];
  if(!P.kumi) miss.push('所属組');
  if(!P.minyushin && !P.nyushin) miss.push('入信日');
  if(!P.birth) miss.push('生年月日');
  if(!P.tel) miss.push('電話番号');
  if(!P.city && !P.addr) miss.push('住所');
  if(miss.length) items.push('✏ 未入力：'+miss.join('、')+'（フォームで追加してください）');
  if(items.length) h += '<ul class="imp-notes"><li>'+items.join('</li><li>')+'</li></ul>';
  if(P.rest.length){
    h += '<div class="imp-rest">どの項目にも当てはまらなかった文字：<b>'+piEsc(P.rest.join(' / '))+'</b> '
       + '<button class="btn btn-w" style="font-size:11px;padding:2px 8px" onclick="piRestToComment()">備考に追加</button></div>';
  }
  h += '<div id="imp-dup"></div>';
  h += '<div class="imp-btns2">'
     + (total>1 ? '<button class="btn btn-w" style="font-size:12px" onclick="piSkip()">この人をスキップ</button>' : '')
     + '<button class="btn btn-w" style="font-size:12px" onclick="piCancel()">取り込みをやめる</button></div>';
  box.innerHTML = h;
  piRenderDup(piFindDup(gv('r-sei'),gv('r-mei'),gv('r-tel'),gv('r-tel2')));
}

function piDupLabel(m){
  return piEsc((m.sei||'')+(m.mei||''))+'（'+piEsc((m.kumi||'組未設定')+(m.han?' / '+m.han+'班':''))
    +(m.tel?' / '+piEsc(m.tel):'')+(m.nyushin?' / 入信 '+piEsc(m.nyushin):(m.minyushin?' / 未入信':''))+'）';
}
function piRenderDup(dups){
  const el = document.getElementById('imp-dup');
  if(!el) return;
  if(!PI.active || !dups.length){ el.innerHTML=''; return; }
  const key = dups.map(function(m){return m.id;}).join(',');
  if(key!==PI.dupKey){ PI.dupKey = key; PI.dupChoice = null; }
  const soc = (typeof isSocho==='function') && isSocho();
  let h = '<div class="imp-dup"><b>⚠ 名簿に同じ名前（または同じ電話番号）の方がいます</b><div>'
        + dups.map(piDupLabel).join('<br>')+'</div>';
  if(PI.dupChoice==='new') h += '<div class="imp-chosen">→ 「別人として新規登録」を選択済み。『名簿に登録』を押してください。</div>';
  else if(PI.dupChoice==='update') h += '<div class="imp-chosen">→ 「既存の方を更新」を選択済み。『名簿に登録』を押すと、変更内容を確認してから更新します。</div>';
  h += '<div class="imp-btns2"><button class="btn btn-w" style="font-size:12px" onclick="piChoose(\'new\')">別人として新規登録</button>'
     + (soc ? '<button class="btn btn-p" style="font-size:12px" onclick="piChoose(\'update\')">この方の情報を更新</button>' : '<span style="font-size:11px;color:#888">（既存の方の更新は支隊長のみ）</span>')
     + '</div></div>';
  el.innerHTML = h;
}
function piChoose(c){
  if(c==='update' && !((typeof isSocho==='function') && isSocho())) return;
  PI.dupChoice = c;
  piRenderDup(piFindDup(gv('r-sei'),gv('r-mei'),gv('r-tel'),gv('r-tel2')));
}
function piRestToComment(){
  const P = PI.cur; if(!P||!P.rest.length) return;
  const el = document.getElementById('r-comment');
  el.value = (el.value?el.value+'\n':'')+P.rest.join(' ');
  P.rest = [];
  piRender();
}

/* ---------- 操作 ---------- */
function piRun(){
  const ta = document.getElementById('imp-text');
  const msg = document.getElementById('imp-msg');
  const text = ta.value;
  if(!text.trim()){ if(msg) msg.textContent='文面を貼り付けてください'; return; }
  let list;
  try{ list = piParseAll(text); }catch(e){ if(msg) msg.textContent='読み取りでエラーが出ました：'+e.message; return; }
  if(!list.length){ if(msg) msg.textContent='読み取れる情報が見つかりませんでした'; return; }
  if(!PI.active && piFormHasData() && !confirm('入力中のフォームの内容は、取り込んだ内容で置き換わります。よろしいですか？')) return;
  if(msg) msg.textContent = list.length+'人分を読み取りました';
  PI.queue = list; PI.registering = false;
  piLoad(0);
}
function piSkip(){
  if(PI.idx+1<PI.queue.length) piLoad(PI.idx+1); else piFinish('取り込みを終了しました');
}
function piCancel(){
  piReset();
  PI.loading = true; clearReg(); PI.loading = false;
  piClearMarks();
}
function piReset(){
  PI.active=false; PI.queue=[]; PI.idx=0; PI.cur=null; PI.dupChoice=null; PI.dupKey='';
  PI.addrLocked=false; PI.registering=false;
  const ta = document.getElementById('imp-text'); if(ta) ta.value='';
  const msg = document.getElementById('imp-msg'); if(msg) msg.textContent='';
  piRender();
}
function piFinish(text){
  const n = PI.queue.length;
  piReset(); piClearMarks();
  const msg = document.getElementById('imp-msg');
  if(msg) msg.textContent = text || ('取り込んだ '+n+'人分の登録が完了しました');
}

/* ---------- 登録処理とのつなぎ（09-nyushin.js / 15-provisional.js から呼ぶ） ---------- */
function pasteImportOnClear(){
  if(PI.loading || PI.registering){ piClearMarks(); return; }
  if(PI.active) piReset();
  piClearMarks();
}
// 登録前：同名チェック・更新。false を返したら登録を中止する
function pasteImportBeforeRegister(){
  if(!PI.active) return true;
  const f = readRegForm();
  const dups = piFindDup(f.sei,f.mei,f.tel,f.tel2);
  if(dups.length){
    const key = dups.map(function(m){return m.id;}).join(',');
    if(key!==PI.dupKey){ PI.dupKey=key; PI.dupChoice=null; }
    if(!PI.dupChoice){
      piRenderDup(dups);
      showMsg('r-msg','名簿に同じ名前（または電話番号）の方がいます。上の案内で「新規」か「更新」を選んでください','err');
      const box = document.getElementById('imp-box'); if(box&&box.scrollIntoView) box.scrollIntoView({block:'center'});
      return false;
    }
    if(PI.dupChoice==='update'){
      if(!((typeof isSocho==='function') && isSocho())) return false;
      piApplyUpdate(dups[0], f);
      return false;
    }
  }
  PI.registering = true;
  return true;
}
function pasteImportAfterRegister(){
  PI.registering = false;
  if(!PI.active) return;
  PI.addrLocked = false;
  if(PI.idx+1<PI.queue.length){ piLoad(PI.idx+1); }
  else piFinish();
}

// 既存の方を更新（支隊長のみ）。空欄でない項目だけ上書き、備考は追記
function piApplyUpdate(m, f){
  const label = {seiK:'読み(姓)',meiK:'読み(名)',pref:'都道府県',city:'市区町村',addr:'それ以下',tel:'電話①',tel2:'電話②',
    birth:'生年月日',kumi:'所属組',han:'班',shokai:'紹介者',nyushin:'入信日'};
  const changes = {};
  ['seiK','meiK','pref','city','addr','tel','tel2','birth','kumi','han','shokai'].forEach(function(k){
    if(f[k] && f[k]!==m[k]) changes[k] = f[k];
  });
  if(f.nyushin && !f.minyushin && f.nyushin!==m.nyushin) changes.nyushin = f.nyushin;
  let newComment = m.comment||'';
  if(f.comment && (m.comment||'').indexOf(f.comment)<0){ newComment = (m.comment?m.comment+'\n':'')+f.comment; }
  const commentChanged = newComment!==(m.comment||'');
  const keys = Object.keys(changes);
  if(!keys.length && !commentChanged){
    showMsg('r-msg','既存の情報と同じため、変更はありませんでした','ok');
    return;
  }
  const lines = keys.map(function(k){ return '・'+label[k]+'：'+(m[k]||'（空）')+' → '+changes[k]; });
  if(commentChanged) lines.push('・備考：追記');
  if(!confirm((m.sei||'')+(m.mei||'')+' さんの情報を更新します。\n\n'+lines.join('\n')+'\n\nよろしいですか？')) return;
  keys.forEach(function(k){ m[k] = changes[k]; });
  if(changes.nyushin){ m.minyushin = false; }
  if(commentChanged){ m.comment = newComment; m.commentUpdated = td; }
  saveRoster();
  buildHanSelects(); rebuildFpHan(); renderHCards(); renderHList();
  showMsg('r-msg',(m.sei||'')+(m.mei||'')+' さんの情報を更新しました','ok');
  PI.registering = true; clearReg();
  pasteImportAfterRegister();
}

/* ---------- イベント登録 ---------- */
(function(){
  const ta = document.getElementById('imp-text');
  if(ta){
    // 貼り付けたら自動で取り込む
    ta.addEventListener('paste', function(){ setTimeout(piRun, 0); });
  }
  // 取り込んだ欄を手で直したら、色（自動入力・要確認・未入力）を消す
  const pg = document.getElementById('pg2');
  if(pg){
    const clr = function(e){
      const el = e.target; if(!el || !el.classList) return;
      if(!(el.classList.contains('imp-auto')||el.classList.contains('imp-warn')||el.classList.contains('imp-miss'))) return;
      if(/^r-birth-/.test(el.id)){
        ['r-birth-era','r-birth-y','r-birth-m','r-birth-d'].forEach(function(id){
          const x = document.getElementById(id); if(x) x.classList.remove('imp-auto','imp-warn','imp-miss');
        });
      } else el.classList.remove('imp-auto','imp-warn','imp-miss');
    };
    pg.addEventListener('input', clr);
    pg.addEventListener('change', clr);
  }
})();
