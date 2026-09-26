/* ===== 班長モード ===== */
let _hanchoHan = '';           // URLパラメータから取得した班名
let _hanchoMode = 'grab';      // 'grab' | 'result'
let _hanchoActiveItems = [];   // 選択中の項目ID
let _hanchoData = {};          // {memberKey: {itemId: {grab:'', result:false}}}
