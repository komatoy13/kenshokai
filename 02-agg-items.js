/* ===== 集計項目定義 =====
   type: 'grab_check' 掴み(ABC)+結果(チェック)  推移蓄積
         'grab_num'   掴み(ABC)+結果(数値)       最終確定
         'cumulative' 累計型(ABC+チェック、期間集計) 最終確定
*/
// type:
//  'grab_check' 掴み(ABC)→結果(チェック) 結果保存でリセット
//  'confirm'    チェック累計→確定保存でリセット（総幹部会）
//  'kikanshi'   掴み(ABC)+部数(数値)→結果保存でリセット
//  'kuyou'      掴み(ABC)+金額(数値)→結果保存でリセット（人数+金額集計）
const DEFAULT_ITEMS=[
  {id:'sunday',   label:'日曜勤行', type:'grab_check'},
  {id:'sohkan',   label:'総幹部会', type:'confirm'},
  {id:'sobu',     label:'総部集会', type:'grab_check'},
  {id:'kikanshi', label:'機関紙',   type:'kikanshi'},
  {id:'kuyou',    label:'御供養',   type:'kuyou'},
  {id:'toyo',     label:'登用試験', type:'grab_check'},
  {id:'kyu5',     label:'5級試験',  type:'grab_check'},
  {id:'kyu4',     label:'4級試験',  type:'grab_check'},
  {id:'kyu3',     label:'3級試験',  type:'grab_check'},
];
