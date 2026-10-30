'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const js=fs.readFileSync('app/src/main/assets/app.js','utf8');
const sql=fs.readFileSync('supabase/migrations/20261030091500_rauso_group_chat_unread.sql','utf8');
new vm.Script(js,{filename:'RAUSO app.js'});
const start=js.indexOf('let rausoGroupUnread={};');
const end=js.indexOf('let rausoGroupInboxBusy=false;',start);
assert(start>=0&&end>start,'Unread module not present');
const moduleCode=js.slice(start,end);
const state={user:{id:'me'},tab:'discover',outings:[{id:'joined',author_id:'host',mineReaction:'going'}]};
let badgeCalls=0;
let written=null;
let counts=[{outing_id:'joined',unread_count:3},{outing_id:'another',unread_count:2}];
const api={
 rpc:async name=>{
  assert.equal(name,'rauso_group_chat_unread_counts');
  return {data:counts,error:null};
 },
 from:table=>{
  assert.equal(table,'rauso_outing_chat_reads');
  return {upsert:async(row,options)=>{
   written={row,options};
   counts=[{outing_id:'another',unread_count:2}];
   return {error:null};
  }};
 }
};
const create=new Function('state','myId','api','rausoCanOpenOutingChat','eventList','rausoUpdateMessageBadge','renderMessages',moduleCode+
 'return {load:rausoLoadGroupUnread,mark:rausoMarkGroupRead,total:rausoUnreadGroupTotal,count:rausoUnreadGroupCount,rows:()=>rausoGroupUnread};');
const mod=create(state,()=> 'me',api,e=>e?.mineReaction==='going',()=>state.outings,()=>badgeCalls++,()=>{});
(async()=>{
 await mod.load();
 assert.equal(mod.total(),5,'Total includes all RLS-visible groups');
 assert.equal(mod.count('joined'),3,'Per-group count');
 assert.equal(mod.count('none'),0,'No messages means zero');
 assert.equal(badgeCalls,1,'Header should refresh after counts');
 const time='2026-10-30T08:30:00Z';
 await mod.mark('joined',time);
 assert.deepEqual(written.row,{outing_id:'joined',user_id:'me',last_read_at:time});
 assert.deepEqual(written.options,{onConflict:'outing_id,user_id'});
 assert.equal(mod.count('joined'),0,'Mark read refreshes group badge');
 assert.equal(mod.total(),2,'Other chats stay unread');
 assert.equal(badgeCalls,2);
 await mod.mark('joined',time);
 assert.equal(badgeCalls,2,'Repeated same timestamp must not trigger update');
 state.outings[0].mineReaction='pending';
 written=null;
 await mod.mark('joined','2026-10-30T09:00:00Z');
 assert.equal(written,null,'Pending member cannot mark group as read');
 state.user=null;
 await mod.load();
 assert.equal(mod.total(),2,'No new authenticated RPC after logout');
 assert(js.includes("const num=privateNum+rausoUnreadGroupTotal()"),'Kuvert must aggregate both unread sources');
 assert(js.includes("rausoInboxView==='groups'||rausoInboxView==='unread'"),'Unread must include groups');
 assert(js.includes("if((data||[]).length)await rausoMarkGroupRead(id,data[0].created_at)"),'Read marks must use displayed server timestamp');
 assert(js.includes("order('created_at',{ascending:false}).limit(100)"),'Load latest group-chat messages');
 assert(sql.includes('ENABLE ROW LEVEL SECURITY'),'Server read markers need RLS');
 assert(sql.includes('SECURITY INVOKER'),'Counter must respect message RLS');
 assert(sql.includes("m.sender_id<>(SELECT auth.uid())"),'Own messages must not appear unread');
 assert(sql.includes("m.created_at>COALESCE(r.last_read_at"),'Count only new messages');
 assert(sql.includes("AND r.status='going'"),'Pending attendee has no marker write access');
 console.log('RAUSO group unread counts, mark-read, badges and permissions checks passed');
})().catch(error=>{console.error(error);process.exitCode=1});
