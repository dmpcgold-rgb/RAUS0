'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const js=fs.readFileSync('app/src/main/assets/app.js','utf8');
const css=fs.readFileSync('app/src/main/assets/style.css','utf8');
new vm.Script(js,{filename:'app.js'});
const start=js.indexOf("let rausoGroupInbox=[];");
const end=js.indexOf('function rausoReadColor(',start);
assert(start>=0&&end>start,'Group inbox module missing');
const moduleSource=js.slice(start,end);
const state={user:{id:'me'},tab:'discover',outings:[
 {id:'hosting',author_id:'me',mineReaction:'',title:'Kochabend',place_name:'Wien',starts_at:'2026-11-01T18:00:00Z'},
 {id:'joined',author_id:'other',mineReaction:'going',title:'Wandern',place_name:'Wiener Neustadt',starts_at:'2026-11-02T09:00:00Z'},
 {id:'pending',author_id:'other',mineReaction:'pending',title:'Angefragt',starts_at:'2026-11-02T10:00:00Z'},
 {id:'declined',author_id:'other',mineReaction:'declined',title:'Abgelehnt',starts_at:'2026-11-03T09:00:00Z'}
]};
let requestedIds=[];
const mockResponse={data:[
 {outing_id:'joined',sender_id:'other',body:'Treffpunkt steht',created_at:'2026-10-30T09:00:00Z'},
 {outing_id:'hosting',sender_id:'me',body:'Hallo zusammen',created_at:'2026-10-30T08:00:00Z'}
],error:null};
const terminal={limit:async()=>mockResponse};
const orderResult={order:()=>terminal};
const inResult={in:(key,ids)=>{
 assert.equal(key,'outing_id');requestedIds=ids;return orderResult;
}};
const selectResult={select:()=>inResult};
const mockApi={from:(table)=>{
 assert.equal(table,'rauso_outing_messages');return selectResult;
},rpc:async(name)=>{
 assert.equal(name,'rauso_group_chat_unread_counts');return {data:[],error:null};
}};
const factory=new Function('state','myId','api','renderMessages','rausoUpdateMessageBadge',moduleSource+
 'return {eligible:rausoEligibleGroupOutings,load:rausoLoadGroupInbox,rows:()=>rausoGroupInbox};');
const inbox=factory(state,()=> 'me',mockApi,()=>{},()=>{});
assert.deepEqual(inbox.eligible().map(x=>x.id),['hosting','joined'],'Pending and declined must never be listed');
(async()=>{
 await inbox.load();
 assert.deepEqual(requestedIds,['hosting','joined'],'Only authorized group IDs must be queried');
 const rows=inbox.rows();
 assert.equal(rows.length,2,'Both authorized group chats are shown');
 assert.equal(rows[0].id,'joined','Latest active group first');
 assert.equal(rows[0].last.body,'Treffpunkt steht','Show last real message');
 state.user=null;await inbox.load();
 assert.equal(inbox.rows().length,0,'Logout clears group chats');
 assert(js.includes('data-inbox-group'),'Inbox rows should open group chats');
 assert(js.includes("data-inbox-view=\"groups\""),'Dedicated group filter missing');
 assert(js.includes("rausoInboxView==='all'"),'Group conversations must appear under Alle');
 assert(js.includes("rausoLoadGroupInbox()"),'Group previews refresh on opening Nachrichten');
 assert(js.includes("myId()!==viewerId"),'Prevent cross-account preview races');
 assert(css.includes('RAUSO 2.9.8: group conversations'),'New group visual styling missing');
 console.log('RAUSO groups in Nachrichten tests passed');
})().catch(error=>{console.error(error);process.exitCode=1});
