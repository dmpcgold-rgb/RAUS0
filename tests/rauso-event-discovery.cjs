'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
const js=fs.readFileSync('app/src/main/assets/app.js','utf8');
const css=fs.readFileSync('app/src/main/assets/style.css','utf8');
const start=js.indexOf('function rausoLocalEventDay(');
const end=js.indexOf('function renderEvents(){',start);
assert(start>=0&&end>start,'Pure discovery predicates missing');
const functions=new Function('state','rausoOwnBirthdate','rausoEventAgeEligibility','myId','rausoReferencePoint','km','regionData',js.slice(start,end)+';return {rausoLocalEventDay,rausoEventMatchesFilters,rausoQuickMeetupCount};');
const state={eventMode:'all',eventTime:'all',eventCategory:'all',eventOpenOnly:false,eventAgeOnly:false};
const f=functions(state,'1992-12-05',()=>({ok:true}),()=> 'myself',()=>[47.815,16.245],(a,b,c,d)=>Math.hypot(a-c,b-d)*111,{'wiener-neustadt':[47.815,16.245],wien:[48.208,16.373]});
const now=Date.parse('2026-10-30T09:00:00Z'); // Friday in Austria
const event=(iso,extras={})=>({id:'some-event',author_id:'another',starts_at:iso,visibility:'public',category:'thermen',availability:{is_full:false},...extras});
assert.equal(f.rausoLocalEventDay('2026-06-01T22:30:00Z'),'2026-06-02','Vienna summer UTC day rollover');
assert.equal(f.rausoLocalEventDay('2026-10-30T22:30:00Z'),'2026-10-30','Vienna winter UTC day rollover');
const sat=event('2026-10-31T11:00:00Z'),sun=event('2026-11-01T11:00:00Z'),mon=event('2026-11-02T11:00:00Z');
state.eventTime='weekend';
assert(f.rausoEventMatchesFilters(sat,now)&&f.rausoEventMatchesFilters(sun,now),'This weekend should include Sat/Sun');
assert(!f.rausoEventMatchesFilters(mon,now),'Weekend must exclude Monday');
assert(f.rausoEventMatchesFilters(sun,Date.parse('2026-11-01T08:00:00Z')),'Sunday should still be this weekend');
state.eventTime='today';
assert(f.rausoEventMatchesFilters(event('2026-10-30T17:00:00Z'),now),'Today');
assert(!f.rausoEventMatchesFilters(sat,now),'Today should exclude tomorrow');
state.eventTime='tomorrow';assert(f.rausoEventMatchesFilters(sat,now),'Tomorrow');
state.eventTime='all';state.eventCategory='familie';assert(!f.rausoEventMatchesFilters(sat,now),'Category should use actual DB category');
assert(f.rausoEventMatchesFilters(event(sat.starts_at,{category:'familie'}),now),'Matching category');
state.eventCategory='all';state.eventOpenOnly=true;
assert(!f.rausoEventMatchesFilters(event(sat.starts_at,{availability:null}),now),'Unknown capacity is not a confirmed free place');
assert(!f.rausoEventMatchesFilters(event(sat.starts_at,{availability:{is_full:true}}),now),'Full should be excluded');
assert(f.rausoEventMatchesFilters(sat,now),'Available should be included');
state.eventOpenOnly=false;state.eventAgeOnly=true;
assert(f.rausoEventMatchesFilters(sat,now),'Eligibility pass');
const bad=functions(state,'1992-12-05',()=>({ok:false}),()=> 'myself',()=>[47.815,16.245],(a,b,c,d)=>Math.hypot(a-c,b-d)*111,{'wiener-neustadt':[47.815,16.245],wien:[48.208,16.373]});
assert(!bad.rausoEventMatchesFilters(sat,now),'Age filter must respect eligibility');
const unknown=functions(state,null,()=>({ok:true}),()=> 'myself',()=>[47.815,16.245],(a,b,c,d)=>Math.hypot(a-c,b-d)*111,{'wiener-neustadt':[47.815,16.245],wien:[48.208,16.373]});
assert(!unknown.rausoEventMatchesFilters(sat,now),'Unknown birthdate must not bypass age filter');
for(const id of ['rausoEventTime','rausoEventCategory','rausoEventOpen','rausoEventAge','rausoEventReset','rausoEventResultCount']) assert(html.includes('id="'+id+'"'),'Missing UI '+id);
assert(js.includes('const extra={category:val.category,family_friendly:val.family_friendly'),'Creator extra fields must be submitted');
assert(js.includes('category:e.category&&cats[e.category]?e.category:null'),'Legacy category must not be invented');
assert(!js.includes("category:'ausfluege',transport_mode:'zufuss',family_friendly:false,author:"),'Legacy defaulting bug remains');
assert(js.includes('confirmedVisible')&&js.includes('rausoAttendeePreview'),'Visible confirmed attendees must be supported');
assert(css.includes('RAUSO 2.9.6: event discovery and participant cards'),'Event design styles missing');
console.log('RAUSO event discovery timezone, filter, capacity, age, migration compatibility and UI tests passed');

/* RAUSO 3.0.3: date ranges and approximate nearby filter. */
state.eventAgeOnly=false;state.eventTime='next-week';
assert(f.rausoEventMatchesFilters(event('2026-11-02T12:00:00Z'),now),'Next Monday included');
assert(f.rausoEventMatchesFilters(event('2026-11-08T12:00:00Z'),now),'Next Sunday included');
assert(!f.rausoEventMatchesFilters(event('2026-11-09T12:00:00Z'),now),'Next Monday+1w excluded');
state.eventTime='next-month';
assert(f.rausoEventMatchesFilters(event('2026-11-01T12:00:00Z'),now),'Next month included');
assert(!f.rausoEventMatchesFilters(event('2026-12-01T12:00:00Z'),now),'Month after next excluded');
state.eventTime='all';state.eventNearbyOnly=true;state.radius=25000;
assert(f.rausoEventMatchesFilters(event('2026-11-02T12:00:00Z',{place_name:'Wiener Neustadt Innenstadt'}),now),'Near town included');
assert(!f.rausoEventMatchesFilters(event('2026-11-02T12:00:00Z',{place_name:'Wien Innenstadt'}),now),'Far town excluded');
assert(!f.rausoEventMatchesFilters(event('2026-11-02T12:00:00Z',{place_name:'Geheimer Treffpunkt'}),now),'Unknown place excluded');

/* RAUSO 3.0.4: actual circle counts from recorded events and optional category. */
const upcoming=[
 event('2026-10-30T17:00:00Z'),
 event('2026-10-31T11:00:00Z'),
 event('2026-10-31T12:00:00Z',{category:'kino'}),
 event('2026-11-01T11:00:00Z')
];
assert.equal(f.rausoQuickMeetupCount(upcoming,'today','all',now),1,'Today count');
assert.equal(f.rausoQuickMeetupCount(upcoming,'tomorrow','all',now),2,'Tomorrow count');
assert.equal(f.rausoQuickMeetupCount(upcoming,'weekend','all',now),3,'Weekend count');
assert.equal(f.rausoQuickMeetupCount(upcoming,'tomorrow','thermen',now),1,'Selected category count');
assert.equal(f.rausoQuickMeetupCount(upcoming,'tomorrow','familie',now),0,'Empty category count');
assert.equal(f.rausoQuickMeetupCount(upcoming,'next-week','all',now),0,'Next week count');
assert.equal(f.rausoQuickMeetupCount([event('2026-11-02T12:00:00Z')],'next-week','all',now),1,'Next week boundary');
assert.equal(f.rausoQuickMeetupCount([event('2026-11-01T12:00:00Z')],'next-month','all',now),1,'Next month boundary');
assert(html.includes('class="rauso-quick-count"')&&css.includes('RAUSO 3.0.4: colored text'));
