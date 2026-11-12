'use strict';
function migrateQuickAccess(state,library){
  if(!state||typeof state!=='object'||!library)return 0;
  const legacy=Array.isArray(state.quickAccess)?state.quickAccess:[];
  const paths=[...new Set(legacy.map(item=>typeof item==='string'?item:item?.path).filter(item=>typeof item==='string'&&item))];
  if(paths.length)library.action('shelf:add',{paths});
  if(Array.isArray(state.quickAccess))state.quickAccess=[];
  return paths.length;
}
module.exports={migrateQuickAccess};
