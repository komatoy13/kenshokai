/* ===== 状態 ===== */
let items=[...DEFAULT_ITEMS];
let activeItemIds=['sunday'];
let itemModes={}; // {itemId: 'grab'|'result'|'confirmed'}
let aggData={}; // {memberKey: {itemId: {grab:'A', result:false|0|0.0, confirmed:false}}}
let aggHistory=[]; // 結果保存・確定保存の履歴（掴みは含まない）
let aggHistOpen=false;

let hPeriod={start:'',end:''}, hHist=[], hHO=false;
let roster=[];
let kumiMap={}; // {組名: 班名}
