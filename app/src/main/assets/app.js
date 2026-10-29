/* RAUSO v1.4 — mobile discovery + community prototype.
 * In demo mode all social content is local and labelled; no messages are delivered.
 * A dedicated Supabase project can be configured for real multi-user data.
 */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const config = window.ERLEBEN_CONFIG || {};
const hasBackend = !!(config.supabaseUrl && config.supabasePublishableKey && window.supabase);
const api = hasBackend ? window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey) : null;
const STORE = 'rauso-v1-live';
const safeLoad = () => {try{return JSON.parse(localStorage.getItem(STORE) || '{}')}catch{return {}}};
const cache = safeLoad();

let rausoOwnBirthdate=null;
let rausoBirthdateReady=false;
function rausoAge(date){
 if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(String(date)))return null;
 const [y,m,d]=String(date).split('-').map(Number),parsed=new Date(Date.UTC(y,m-1,d));
 if(parsed.getUTCFullYear()!==y||parsed.getUTCMonth()!==m-1||parsed.getUTCDate()!==d)return null;
 const now=new Date();let age=now.getFullYear()-y;
 if(now.getMonth()+1<m||(now.getMonth()+1===m&&now.getDate()<d))age--;
 return age>=0&&age<=125?age:null;
}
function rausoAdult(){const age=rausoAge(rausoOwnBirthdate);return age!==null&&age>=18}
async function rausoLoadOwnBirthdate(){
 if(!state.user||!api){rausoOwnBirthdate=null;rausoBirthdateReady=false;return}
 const {data,error}=await api.from('rauso_birthdates').select('birth_date').eq('user_id',myId()).maybeSingle();
 if(error){console.warn('Geburtsdatum',error.message);return}
 rausoOwnBirthdate=data?.birth_date||null;rausoBirthdateReady=true;
}
function rausoRequestBirthdate(){
 if(!state.user||rausoOwnBirthdate)return;
 modal('Geburtsdatum einmalig speichern',
  '<form id="birthdateForm" class="stack"><p class="quiet">Das Geburtsdatum ist nach der Bestätigung nicht mehr änderbar und nur für dein eigenes Konto sichtbar.</p>'+
  '<div class="input-group"><label for="birthdateOnce">Geburtsdatum (Pflichtfeld)</label><input id="birthdateOnce" type="date" min="1900-01-01" max="'+new Date().toISOString().slice(0,10)+'" required></div>'+
  '<button type="submit" class="primary-btn">Dauerhaft speichern</button></form>');
 $('birthdateForm').onsubmit=async e=>{
  e.preventDefault();const value=$('birthdateOnce').value;
  if(rausoAge(value)===null){toast('Bitte gültiges Geburtsdatum eingeben.');return}
  const b=$('birthdateForm').querySelector('button[type=submit]');b.disabled=true;
  try{const {error}=await api.from('rauso_birthdates').insert({user_id:myId(),birth_date:value});if(error)throw error;
   await rausoLoadOwnBirthdate();closeModal();renderProfile();renderDating();renderEvents();renderFamily();toast('Geburtsdatum dauerhaft gespeichert.');
  }catch(err){b.disabled=false;toast(err.message)}
 };
}

const regionData = {
 'wiener-neustadt':[47.815,16.245],wien:[48.208,16.373],'st-poelten':[48.204,15.625],graz:[47.071,15.439],linz:[48.306,14.286],salzburg:[47.801,13.045],innsbruck:[47.269,11.404],klagenfurt:[46.624,14.306],bregenz:[47.504,9.748],eisenstadt:[47.846,16.522],baden:[48.005,16.232],villach:[46.612,13.850],krems:[48.411,15.611],zell:[47.323,12.797],'wr-neudorf':[48.082,16.314],amstetten:[48.121,14.877],tulln:[48.330,16.056],mistelbach:[48.570,16.578],neunkirchen:[47.722,16.078],leoben:[47.381,15.094],kapfenberg:[47.445,15.293],wels:[48.158,14.027],steyr:[48.042,14.422],gmunden:[47.918,13.800],'bad-ischl':[47.712,13.621],'bad-gastein':[47.116,13.135],saalfelden:[47.427,12.849],'st-johann':[47.521,12.427],kufstein:[47.583,12.170],lienz:[46.829,12.768],feldkirch:[47.236,9.601],dornbirn:[47.414,9.742],oberwart:[47.290,16.206],pinkafeld:[47.371,16.123],neusiedl:[47.949,16.844]
};
const cats = {
 kino:{icon:'🎬',expr:'["amenity"="cinema"]'},
 bowling:{icon:'🎳',expr:'["leisure"="bowling_alley"]'},
 spielspass:{icon:'🎯',expr:'["leisure"~"^(amusement_arcade|escape_game|miniature_golf|indoor_play|trampoline_park)$"]'},
 restaurants:{icon:'🍽️',expr:'["amenity"~"^(restaurant|cafe|fast_food)$"]'},
 thermen:{icon:'♨️',expr:'["leisure"~"^(spa|water_park|swimming_pool)$"];node(around:RADIUS,LAT,LON)["amenity"="public_bath"]'},
 ausfluege:{icon:'🎒',expr:'["tourism"~"^(attraction|viewpoint|zoo|theme_park)$"]'},
 natur:{icon:'🌲',expr:'["leisure"~"^(park|nature_reserve|garden)$"]'},
 kultur:{icon:'🏛️',expr:'["tourism"~"^(museum|gallery)$"]'},
 uebernachten:{icon:'🛏️',expr:'["tourism"~"^(hotel|hostel|guest_house|camp_site)$"]'},
 sport:{icon:'🚴',expr:'["leisure"~"^(sports_centre|fitness_centre|swimming_pool)$"]'},
 anime:{icon:'★',expr:'["shop"~"^(anime|comics)$"]'},
 familie:{icon:'👨‍👩‍👧',expr:'["leisure"~"^(playground|park)$"]'}
};
const samplePlaces = [
 {id:'demo-r1',name:'Altes Backhaus',region:'Wiener Neustadt',category:'restaurants',lat:47.8158,lon:16.2426,type:'Restaurant · Beispielvorschau'},
 {id:'demo-r2',name:'Café-Restaurant zum Einhorn',region:'Wiener Neustadt',category:'restaurants',lat:47.8127,lon:16.2441,type:'Restaurant · Beispielvorschau'},
 {id:'demo-r3',name:'Restaurant O.L.Y.M.P.',region:'Wiener Neustadt',category:'restaurants',lat:47.8153,lon:16.245,type:'Restaurant · Beispielvorschau'},
 {id:'demo-p1',name:'Therme Wien',region:'Wien',category:'thermen',lat:48.143,lon:16.402,type:'Therme · Beispielvorschau'},
 {id:'demo-p2',name:'Schloss Schönbrunn',region:'Wien',category:'ausfluege',lat:48.184,lon:16.312,type:'Sehenswürdigkeit · Beispielvorschau'},
 {id:'demo-p3',name:'Lainzer Tiergarten',region:'Wien',category:'natur',lat:48.183,lon:16.240,type:'Natur · Beispielvorschau'},
 {id:'demo-p4',name:'Tiergarten Schönbrunn',region:'Wien',category:'familie',lat:48.182,lon:16.303,type:'Familie · Beispielvorschau'},
 {id:'demo-p5',name:'Kunsthistorisches Museum',region:'Wien',category:'kultur',lat:48.204,lon:16.361,type:'Museum · Beispielvorschau'},
 {id:'demo-p6',name:'Rax-Seilbahn',region:'Niederösterreich',category:'ausfluege',lat:47.719,lon:15.779,type:'Ausflug · Beispielvorschau'},
 {id:'demo-p7',name:'Stadtpark Wiener Neustadt',region:'Wiener Neustadt',category:'natur',lat:47.815,lon:16.240,type:'Park · Beispielvorschau'},
 {id:'demo-p8',name:'Schloss Hof',region:'Niederösterreich',category:'familie',lat:48.214,lon:16.938,type:'Ausflug · Beispielvorschau'},
 {id:'demo-p9',name:'Grazer Schlossberg',region:'Graz',category:'ausfluege',lat:47.076,lon:15.438,type:'Ausflug · Beispielvorschau'},
 {id:'demo-p10',name:'Haus der Natur',region:'Salzburg',category:'kultur',lat:47.802,lon:13.037,type:'Museum · Beispielvorschau'},
 {id:'demo-p11',name:'Alpenzoo Innsbruck',region:'Innsbruck',category:'familie',lat:47.284,lon:11.398,type:'Zoo · Beispielvorschau'}
];
const demoPeople = [
 {id:'demo-u1',display_name:'Alex (Demo)',city:'Wiener Neustadt',bio:'Wandern, Thermen und gutes Essen.',dating_enabled:true,adult_confirmed:true},
 {id:'demo-u2',display_name:'Sam (Demo)',city:'Wien',bio:'Ich entdecke gern neue Cafés und Museen.',dating_enabled:true,adult_confirmed:true},
 {id:'demo-u3',display_name:'Kim (Demo)',city:'Baden',bio:'Spontane Ausflüge und Natur.',dating_enabled:false,adult_confirmed:true}
];
const datePlus = n => {const d=new Date();d.setDate(d.getDate()+n);d.setHours(16,0,0,0);return d.toISOString()};
const demoEventDefaults = [
 {id:'demo-e1',author_id:'demo-u1',author:'Alex (Demo)',title:'Gemütlicher Thermennachmittag',place_name:'Therme Wien',description:'Beispiel-Treffen: zusammen Wellness genießen.',starts_at:datePlus(3),category:'thermen',family_friendly:false,demo:true},
 {id:'demo-e2',author_id:'demo-u2',author:'Sam (Demo)',title:'Wandern und Aussicht genießen',place_name:'Rax',description:'Beispiel-Treffen: eine kleine Wandergruppe.',starts_at:datePlus(6),category:'natur',family_friendly:false,demo:true,transport_mode:'zug'},
 {id:'demo-e3',author_id:'demo-u3',author:'Kim (Demo)',title:'Mit Kindern in den Tierpark',place_name:'Familien-Ausflug · Wiener Neustadt',description:'Beispiel-Treffen für Eltern und Kinder. Treffpunkt vor Ort.',starts_at:datePlus(4),category:'familie',family_friendly:true,demo:true,transport_mode:'zufuss'},
 {id:'demo-e4',author_id:'demo-u2',author:'Sam (Demo)',title:'Zusammen kochen und plaudern',place_name:'Wien · genauere Gegend nach Zusage',description:'Demo eines privaten Treffens. Keine echte Einladung.',starts_at:datePlus(5),category:'familie',family_friendly:false,demo:true,visibility:'private',meeting_type:'kochen',transport_mode:'ubahn'}
];
const state = {
 tab:'discover',cat:'thermen',region:'wiener-neustadt',radius:25000,query:'',places:[],placesLive:false,placeLoading:false,
 map:null,markers:null,mapOpen:false, session:null,profile:null,user:null,
 favorites:new Set(cache.favorites||[]), bookmarks:{...(cache.bookmarks||{})}, profilePhotoUrl:null, demoProfile:cache.profile||{display_name:'Mein RAUSO-Profil',city:'Wiener Neustadt',bio:'Ich bin gerne unterwegs.',dating_enabled:false,adult_confirmed:false},
 demoEvents:[], demoReactions:cache.reactions||{}, demoConnections:{}, demoDatingLikes:cache.datingLikes||{}, demoMessages:cache.messages||{}, demoBlocks:cache.blocks||{},
 outings:[], people:[], connections:[], datingLikes:[], blocks:[], currentChat:null, eventMode:'all', meetFilter:'upcoming', 
};
const persist = () => {try{localStorage.setItem(STORE,JSON.stringify({favorites:[...state.favorites],bookmarks:state.bookmarks,profile:state.demoProfile,events:state.demoEvents,reactions:state.demoReactions,connections:state.demoConnections,datingLikes:state.demoDatingLikes,messages:state.demoMessages,blocks:state.demoBlocks,...Object.fromEntries(Object.entries(cache).filter(([k])=>k.startsWith('osm:')))}))}catch{}};
const myId = () => state.user?.id||'local-user';
const profile = () => state.profile||state.demoProfile;
const demoMode = () => !state.user;
function mustVerify(action){
 if(state.user){
  if(rausoBirthdateReady&&!rausoOwnBirthdate){rausoRequestBirthdate();toast('Bitte zuerst das Geburtsdatum speichern.');return false}
  if(state.profile&&rausoValidDisplayName(state.profile.display_name))return true;
  rausoCompleteProfile();toast('Bitte zuerst einen eigenen Profilnamen eingeben.');return false
 }
 showAuth();toast('Für '+action+' ist eine Anmeldung erforderlich.');return false
}
function checkVehicle(){return mustVerify('Mitfahrgelegenheiten')}
const transportMeta={auto:['🚗','Auto'],ubahn:['🚇','U-Bahn'],bus:['🚌','Bus'],zug:['🚆','Zug'],zufuss:['🚶','Zu Fuß']};
const meetingMeta={kochen:'🍳 Kochen',basteln:'🎨 Basteln',backen:'🧁 Backen',spiele:'🎲 Spieleabend',kaffee:'☕ Kaffee & Plaudern',sonstiges:'🏡 Sonstiges'};
function openSafetyReport(id){modal('🛡 Sicherheitsfall melden',`<div class="status-banner"><strong>Akute Gefahr? Sofort 133 (Polizei) oder 112 (Euronotruf) wählen.</strong> Diese Demo löst keinen Alarm aus und kontaktiert keinen Rettungsdienst.</div><p class="quiet">Melde einen Vorfall zu einem Treffen oder einer Fahrt. In der echten App wird die Meldung mit den vorhandenen Termin- und Teilnehmer-IDs verknüpft, nicht öffentlich angezeigt.</p><form id="incidentForm" class="stack"><div class="input-group"><label>Art des Vorfalls</label><select id="incidentType"><option value="danger">Bedrohung / Gefährdung</option><option value="missing">Person vermisst</option><option value="identity">Falsche Identität / Fahrzeug</option><option value="other">Sonstiger Vorfall</option></select></div><div class="input-group"><label>Beschreibung</label><textarea id="incidentText" minlength="10" maxlength="1500" placeholder="Was ist wann passiert?" required></textarea></div><button type="submit" class="primary-btn">Vorfall melden</button><a class="outline-btn" style="text-align:center;text-decoration:none" href="tel:133">📞 Polizei 133 anrufen</a></form><p class="helper-text">Kein Zugriff anderer Mitglieder auf Ausweise oder private Vorfalldaten. Nur autorisierte Stellen nach Prüfung einer rechtlichen Grundlage.</p>`);$('incidentForm').onsubmit=async e=>{e.preventDefault();if(demoMode()){toast('Nur Demo: keine Meldung übertragen. Bei Gefahr 133 wählen.');closeModal();return}const {error}=await api.from('incident_reports').insert({reporter_id:myId(),outing_id:id||null,kind:$('incidentType').value,description:$('incidentText').value.trim()});if(error){toast('Meldung konnte nicht gespeichert werden: '+error.message);return}closeModal();toast('Sicherheitsmeldung erfasst. Bei akuter Gefahr trotzdem 133 wählen.')}}

let toastTimeout;
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').classList.remove('visible'),3700)}
function closeModal(){$('modalRoot').innerHTML=''}
function modal(title,body){$('modalRoot').innerHTML=`<div class="modal-overlay" id="modalOverlay"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-header"><h2>${esc(title)}</h2><button id="closeModal" aria-label="Schließen">×</button></div>${body}</div></div>`;$('closeModal').onclick=closeModal;$('modalOverlay').onclick=e=>{if(e.target.id==='modalOverlay')closeModal()}}
/* Keep real in-app navigation history; Android Back must never close RAUSO. */
const rausoTabHistory=[];
function switchTab(tab, recordHistory=true){
 if(!['discover','family','profile','shows','events','myMeetings','collections'].includes(tab) && !hasBackend){showAuth();return;}
 if(recordHistory && state.tab && tab!==state.tab){
   rausoTabHistory.push(state.tab);
   if(rausoTabHistory.length>60)rausoTabHistory.shift();
 }
 state.tab=tab;if($('headerMessages'))$('headerMessages').classList.toggle('active',tab==='messages');document.querySelectorAll('.screen').forEach(e=>e.classList.toggle('active',e.id===tab+'Screen'));document.querySelectorAll('.nav-item').forEach(e=>e.classList.toggle('active',e.dataset.tab===tab));window.scrollTo({top:0,behavior:'instant'});if(tab==='discover')renderPlaces();if(tab==='events')renderEvents();refreshMeetingBadge();if(tab==='family')renderFamily();if(tab==='myMeetings')renderMyMeetings();if(tab==='messages'){renderMessages();loadMessageInbox()}if(tab==='dating')renderDating();if(tab==='profile'){renderProfile();injectProfileExtras();addReadiness();addMoreLink()};if(tab==='collections')renderCollections();if(tab==='admin')renderAdmin();if(tab==='shows')renderShows();if(tab==='notifications')renderNotifications();}
function rausoBack(){
 const dialog=document.querySelector('#modalRoot .modal-overlay');
 if(dialog){
    // Einstellungen > Design is a two-step flow; Back returns to Einstellungen.
    if($('uiSave') && state.tab==='profile' && typeof openSettings==='function'){
       openSettings();return true;
    }
    closeModal();return true;
 }
 if(state.tab==='discover' && state.mapOpen){showMap();return true;}
 if(rausoTabHistory.length){
    const prior=rausoTabHistory.pop();
    switchTab(prior,false);
    return true;
 }
 if(state.tab!=='discover'){switchTab('discover',false);return true;}
 if(window.scrollY>40){window.scrollTo({top:0,behavior:'smooth'});return true;}
 toast('Du bist auf der Startseite.');
 return true;
}
window.RAUSO_BACK=rausoBack;
window.addEventListener('keydown',event=>{
 if(event.key==='Escape'||event.key==='BrowserBack'){
   event.preventDefault();rausoBack();
 }
});
function fmt(d){return new Intl.DateTimeFormat('de-AT',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Vienna'}).format(new Date(d))}
function km(a,b,c,d){const R=6371,rad=x=>x*Math.PI/180,dy=rad(c-a),dx=rad(d-b),v=Math.sin(dy/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(dx/2)**2;return R*2*Math.atan2(Math.sqrt(v),Math.sqrt(1-v))}
function osmLink(p){return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(p.lat)}&mlon=${encodeURIComponent(p.lon)}#map=16/${encodeURIComponent(p.lat)}/${encodeURIComponent(p.lon)}`}

let rausoGps=null;
function rausoReferencePoint(){return rausoGps||regionData[state.region]||null}
function rausoDistanceLabel(place){
 const p=rausoReferencePoint(),latitude=Number(place.lat),longitude=Number(place.lon);
 if(!p||!Number.isFinite(latitude)||!Number.isFinite(longitude)||!latitude||!longitude)return '– km';
 const distance=km(p[0],p[1],latitude,longitude);
 return (rausoGps?'':'≈')+(distance<10?distance.toFixed(1):Math.round(distance).toString())+' km';
}
function rausoDistanceOrigin(){return rausoGps?'Luftlinie ab deinem Standort':'Ungefähre Luftlinie ab Zentrum der gewählten Region'}
function rausoSiteUrl(place){
 let u=String(place.website||place.source||'').trim();
 if(/^https:\/\//i.test(u))return u;
 if(/^http:\/\//i.test(u))return 'https://'+u.slice(7);
 if(/^www\./i.test(u))return 'https://'+u;
 if(Number(place.lat)&&Number(place.lon))return osmLink(place);
 return 'https://www.openstreetmap.org/search?query='+encodeURIComponent((place.name||place.title||'')+' '+(place.addr||place.region||''));
}
function rausoOpenPlace(place){window.location.assign(rausoSiteUrl(place))}
function rausoHasVenueWebsite(place){return /^(https?:\/\/|www\.)/i.test(String(place.website||'').trim())}
function rausoRequestLocation(){
 const btn=$('distanceLocation');
 if(!navigator.geolocation){toast('Standort nicht verfügbar. Entfernung ab der gewählten Region.');return}
 if(btn)btn.disabled=true;
 navigator.geolocation.getCurrentPosition(position=>{
  rausoGps=[position.coords.latitude,position.coords.longitude];
  if(btn){btn.disabled=false;btn.textContent='★ Standort aktiv'}
  renderPlaces();toast('Standort aktiviert. Entfernungen als Luftlinie.')
 },()=>{if(btn)btn.disabled=false;toast('Standort nicht freigegeben. Luftlinie ab gewählter Region.')},
 {enableHighAccuracy:false,timeout:13000,maximumAge:300000})
}

function buildQuery(){const [lat,lon]=regionData[state.region],r=state.radius,expr=cats[state.cat].expr;const terms=expr.split(';').filter(Boolean).map(t=>t.includes('RADIUS')?t.replaceAll('RADIUS',r).replaceAll('LAT',lat).replaceAll('LON',lon):`nwr(around:${r},${lat},${lon})${t}`).join(';')+';';return `[out:json][timeout:24];(${terms});out center 180;`}
function nearestSamples(){return []}
async function queryPlaces(){state.placeLoading=true;state.placesLive=false;const key=`osm:${state.region}:${state.radius}:${state.cat}`;const last=cache[key];
 if(last && Date.now()-last.t<6*3600e3){state.places=last.v;state.placesLive=true;state.placeLoading=false;renderPlaces();return}
 $('placeStatus').textContent='Orte aus OpenStreetMap werden geladen …';$('places').innerHTML='<div class="empty">Die Suche läuft. Öffentliche Kartendienste können zeitweise überlastet sein.</div>';
 try {const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),16000);let res;
 try {res=await fetch('https://overpass.private.coffee/api/interpreter',{method:'POST',body:new URLSearchParams({data:buildQuery()}),signal:controller.signal,headers:{'Content-Type':'application/x-www-form-urlencoded'}})}finally{clearTimeout(timer)}
 if(!res.ok)throw Error(`API ${res.status}`);const json=await res.json();state.places=(json.elements||[]).map(x=>{const t=x.tags||{},lat=x.lat??x.center?.lat,lon=x.lon??x.center?.lon;return {id:`osm-${x.type}-${x.id}`,name:t.name||t['name:de']||'',region:t['addr:city']||t['addr:place']||'',category:state.cat,lat,lon,type:t.cuisine||t.tourism||t.leisure||t.amenity||'',addr:[t['addr:street'],t['addr:housenumber']].filter(Boolean).join(' '),website:t.website||t['contact:website']||'',fee:t.fee||'',charge:t.charge||'',min_age:t.min_age||''}}).filter(x=>x.name&&Number.isFinite(x.lat)&&Number.isFinite(x.lon));state.places.sort((a,b)=>a.name.localeCompare(b.name,'de'));state.placesLive=true;cache[key]={t:Date.now(),v:state.places};
 } catch(err) {console.warn('OSM unavailable:',err);state.places=[];state.placesLive=false;toast('Ortsdienst gerade nicht erreichbar. Bitte erneut versuchen.');}
 finally{state.placeLoading=false;renderPlaces()}
}

function bookmarkKey(type,id){return type+':'+String(id)}
function isBookmarked(type,id){return !!state.bookmarks[bookmarkKey(type,id)] || (type==='place'&&state.favorites.has(id))}
async function toggleBookmark(type,item){
 const key=bookmarkKey(type,item.id);
 const existing=isBookmarked(type,item.id);
 const before=state.bookmarks[key];
 if(existing){delete state.bookmarks[key];if(type==='place')state.favorites.delete(item.id)}
 else{
  state.bookmarks[key]={type,id:String(item.id),title:String(item.title||item.name||'Unternehmung'),subtitle:String(item.place_name||item.region||''),lat:item.lat,lon:item.lon,website:item.website||item.source||'',addr:item.addr||'',category:item.category||'',author_id:item.author_id||'',starts_at:item.starts_at||'',description:item.description||''};
  if(type==='place')state.favorites.add(item.id)
 }
 persist();updateBookmarkShortcut();
 if(!demoMode()){
  const request=existing
   ? api.from('rauso_bookmarks').delete().eq('user_id',myId()).eq('item_type',type).eq('item_id',String(item.id))
   : api.from('rauso_bookmarks').upsert({user_id:myId(),item_type:type,item_id:String(item.id),title:state.bookmarks[key].title,subtitle:state.bookmarks[key].subtitle,details:{lat:item.lat||null,lon:item.lon||null,website:item.website||item.source||'',addr:item.addr||'',category:item.category||'',author_id:item.author_id||'',starts_at:item.starts_at||'',description:item.description||''}},{onConflict:'user_id,item_type,item_id'});
  const {error}=await request;
  if(error){
   if(before)state.bookmarks[key]=before;else delete state.bookmarks[key];
   if(type==='place'){if(existing)state.favorites.add(item.id);else state.favorites.delete(item.id)}
   persist();toast('Merkliste konnte nicht gespeichert werden: '+error.message)
  }
 }
 renderPlaces();renderEvents();renderFamily();renderCollections();
}
async function loadBookmarks(){
 if(!state.user)return;
 const {data,error}=await api.from('rauso_bookmarks').select('item_type,item_id,title,subtitle,details').eq('user_id',myId());
 if(error){toast('Merkliste konnte nicht synchronisiert werden.');return}
 state.bookmarks={};
 for(const r of data||[])state.bookmarks[bookmarkKey(r.item_type,r.item_id)]={type:r.item_type,id:r.item_id,title:r.title,subtitle:r.subtitle,lat:r.details?.lat,lon:r.details?.lon,website:r.details?.website||'',addr:r.details?.addr||'',category:r.details?.category||'',author_id:r.details?.author_id||'',starts_at:r.details?.starts_at||'',description:r.details?.description||''};
 state.favorites=new Set((data||[]).filter(x=>x.item_type==='place').map(x=>x.item_id));
 persist();renderPlaces();renderEvents();renderCollections();
}
function updateBookmarkShortcut(){
 const total=Object.keys(state.bookmarks||{}).length;
 const badge=$('bookmarkNavCount');
 if(badge){badge.textContent=total>99?'99+':String(total);badge.classList.toggle('hidden',total===0)}
 const button=document.querySelector('.bottomnav .nav-item[data-tab="collections"]');
 if(button)button.setAttribute('aria-label','Merkliste mit '+total+' Einträgen öffnen');
}

function rausoOpenBookmark(item){
 if(!item)return;
 if(item.type!=='outing'){
  const p=rausoViennaPicks.find(x=>String(x.id)===String(item.id)) ||
    state.places.find(x=>String(x.id)===String(item.id)) || item;
  const place=Object.assign({name:item.title,region:item.subtitle},p);
  const linkLabel=rausoHasVenueWebsite(place)?'WEBSITE ÖFFNEN':'KARTE ÖFFNEN';
  modal('Ort · '+(place.name||item.title),
   '<div class="stack rauso-bookmark-detail"><p class="quiet">'+esc(place.addr||place.region||item.subtitle||'Österreich')+'</p>'+
   '<button type="button" id="savedPlaceSite" class="primary-btn">'+linkLabel+' ↗</button>'+
   '<button type="button" id="savedPlaceCreate" class="outline-btn"><span class="rauso-plus-mark" aria-hidden="true"></span> TREFFEN HIER ERSTELLEN</button></div>');
  $('savedPlaceSite').onclick=()=>{closeModal();rausoOpenPlace(place)};
  $('savedPlaceCreate').onclick=()=>{closeModal();createOuting(place)};
  return;
 }
 const event=eventList().find(x=>String(x.id)===String(item.id))||item;
 const name=event.title||item.title,where=event.place_name||item.subtitle;
 let dateText='';
 try{if(event.starts_at)dateText=fmt(event.starts_at)}catch{}
 modal('Ausflug · '+name,'<div class="stack"><p class="quiet">★ '+esc(where||'Treffpunkt auf Anfrage')+'</p>'+
  (dateText?'<p>📅 '+esc(dateText)+'</p>':'')+
  (event.description?'<p>'+esc(event.description)+'</p>':'')+
  '<button id="bookmarkViewEvents" class="primary-btn">Zur Unternehmung</button>'+
  (event.author_id?'<button id="bookmarkViewOrganizer" class="outline-btn">Profil des Veranstalters</button>':'')+
  '</div>');
 $('bookmarkViewEvents').onclick=()=>{closeModal();state.eventMode='all';switchTab('events')};
 if($('bookmarkViewOrganizer'))$('bookmarkViewOrganizer').onclick=()=>{
   const author=availablePeople().find(p=>String(p.id)===String(event.author_id));
   if(!author){toast('Das Profil dieses Mitglieds ist derzeit nicht sichtbar.');return}
   modal('Profil · '+(author.display_name||'Mitglied'),'<div class="stack"><p>★ '+esc(author.city||'Österreich')+'</p><p>'+esc(author.bio||'Kein Profiltext')+'</p></div>')
 };
}
function renderCollections(){
 updateBookmarkShortcut();
 const el=$('collectionsContent');if(!el)return;
 const items=Object.values(state.bookmarks);
 el.innerHTML='<div class="surface stack"><h2>♥ Meine Merkliste ('+items.length+')</h2>'+
  '<p class="quiet">Orange Herzen sind gespeichert. Tippe auf einen Eintrag für die Details und den Website-Link.</p></div>'+
  (items.length?items.map(item=>{
   const key=bookmarkKey(item.type,item.id);
   return '<div class="surface bookmark-row"><button type="button" class="bookmark-open" data-bookmark-open="'+esc(key)+'">'+
    '<strong>'+esc(item.title)+'</strong><span class="quiet">'+esc(item.type==='outing'?'Ausflugsvorschlag':'Ort')+' · '+esc(item.subtitle||'')+'</span>'+
    '<span class="bookmark-arrow" aria-hidden="true">›</span></button>'+
    '<button type="button" class="small-btn star-btn is-liked bookmark-remove" data-bookmark-remove="'+esc(key)+'" aria-label="Aus Merkliste entfernen" title="Aus Merkliste entfernen">♥</button></div>';
  }).join(''):'<div class="empty">Noch keine Favoriten. Tippe auf ein Herz bei Orten oder Unternehmungen.</div>');
 el.querySelectorAll('[data-bookmark-open]').forEach(b=>b.onclick=()=>rausoOpenBookmark(state.bookmarks[b.dataset.bookmarkOpen]));
 el.querySelectorAll('[data-bookmark-remove]').forEach(b=>b.onclick=()=>{
  const item=state.bookmarks[b.dataset.bookmarkRemove];if(item)toggleBookmark(item.type,item)
 });
}

/* Curated, individually checked real addresses. Illustration imagery is not a venue photo. */
const rausoViennaPicks = [
 {id:'verified-vienna-figlmueller-wollzeile',lat:48.20942,lon:16.37484,website:'https://www.figlmueller.at/',name:'Figlmüller Wollzeile',addr:'Wollzeile 5, 1010 Wien',region:'Wien',type:'Wiener Schnitzel',category:'restaurants',short:'Wiener Küche · Innenstadt',source:'https://www.figlmueller.at/lage-kontakt/'},
 {id:'verified-vienna-plachutta-wollzeile',lat:48.20755,lon:16.37876,website:'https://www.plachutta.at/restaurants/',name:'Plachutta Wollzeile',addr:'Wollzeile 38, 1010 Wien',region:'Wien',type:'Wiener Küche',category:'restaurants',short:'Tafelspitz & Wiener Klassiker',source:'https://www.plachutta.at/restaurants/'},
 {id:'verified-vienna-lugeck',lat:48.20970,lon:16.37515,website:'https://www.lugeck.com/',name:'Lugeck',addr:'Lugeck 4, 1010 Wien',region:'Wien',type:'Wiener Küche',category:'restaurants',short:'Wirtshaus · Wiener Innenstadt',source:'https://www.lugeck.com/'},
 {id:'verified-vienna-melker-stiftskeller',lat:48.2122736,lon:16.363614,website:'https://www.melkerstiftskeller.at/',name:'Melker Stiftskeller',addr:'Schottengasse 3, 1010 Wien',region:'Wien',type:'Österreichisches Gasthaus',category:'restaurants',short:'Historischer Keller · Wirtshaus',source:'https://www.openstreetmap.org/search?query=Melker%20Stiftskeller%20Wien'},
 {id:'verified-vienna-therme-wien',lat:48.1437114,lon:16.4010266,website:'https://thermewien.at/',name:'Therme Wien',addr:'Kurbadstraße 14, 1100 Wien',region:'Wien · Oberlaa',type:'Therme & Wellness',category:'thermen',short:'Thermalbaden · U1 Oberlaa',source:'https://thermewien.at/kontakt/'},
 {id:'verified-baden-roemertherme',lat:48.0082,lon:16.2316,website:'https://www.roemertherme.at/',name:'Römertherme Baden',addr:'Brusattiplatz 4, 2500 Baden',region:'Baden bei Wien',type:'Therme & Wellness',category:'thermen',short:'Thermalwasser · Baden bei Wien',source:'https://www.openstreetmap.org/search?query=R%C3%B6mertherme%20Baden'}
];
let rausoShowAllHighlights=false;
function renderViennaHighlights(){
 const el=$('viennaHighlights');if(!el)return;
 const sorted=[...rausoViennaPicks].sort((a,b)=>(a.category===state.cat?0:1)-(b.category===state.cat?0:1));
 const first=sorted[0],different=sorted.find(x=>x.category!==first?.category);
 const list=rausoShowAllHighlights?sorted:[first,different].filter(Boolean);
 el.innerHTML=list.map(p=>{
  const liked=isBookmarked('place',p.id);
  const label=p.category==='thermen'?'♨ THERMEN':'🍽 RESTAURANTS';
  return '<article class="featured-card rauso-place-link" data-venue-category="'+esc(p.category)+'" data-featured-open="'+esc(p.id)+'" tabindex="0" role="link" title="Website von '+esc(p.name)+' öffnen">'+
   '<div class="featured-image rauso-place-create"><button type="button" class="rauso-create-venue-btn" data-featured-create="'+esc(p.id)+'" aria-label="Unternehmung bei '+esc(p.name)+' erstellen" title="Unternehmung erstellen"><span class="rauso-plus-mark" aria-hidden="true"></span></button></div>'+
   '<span class="featured-map venue-distance" title="'+esc(rausoDistanceOrigin())+'">★ '+esc(rausoDistanceLabel(p))+'</span>'+
   '<div class="featured-text"><h4>'+esc(p.name)+'</h4><p>'+esc(p.short)+'</p>'+
   '<span class="featured-cat '+(p.category==='thermen'?'thermal':'')+'">'+esc(label)+'</span></div>'+'<button type="button" class="rauso-venue-site rauso-featured-site" data-featured-site="'+esc(p.id)+'" aria-label="'+(rausoHasVenueWebsite(p)?'Website':'Karte')+' von '+esc(p.name)+' öffnen">'+(rausoHasVenueWebsite(p)?'WEBSEITE ↗':'KARTE ↗')+'</button>'+
   '<button type="button" class="featured-heart heart-btn star-btn '+(liked?'is-liked':'')+'" '+
   'aria-label="'+(liked?'Aus Merkliste entfernen':'In Merkliste speichern')+'" '+
   'aria-pressed="'+liked+'" data-featured-like="'+esc(p.id)+'">'+(liked?'♥':'♡')+'</button></article>';
 }).join('');
 el.querySelectorAll('[data-featured-open]').forEach(card=>{
  const open=()=>{const item=rausoViennaPicks.find(x=>x.id===card.dataset.featuredOpen);if(item)rausoOpenPlace(item)};
  card.onclick=e=>{if(!e.target.closest('button'))open()};
  card.onkeydown=e=>{if(e.target===card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open()}}
 });
 el.querySelectorAll('[data-featured-create]').forEach(b=>b.onclick=e=>{e.stopPropagation();const p=rausoViennaPicks.find(x=>x.id===b.dataset.featuredCreate);if(p)createOuting(p)});
 el.querySelectorAll('[data-featured-site]').forEach(b=>b.onclick=e=>{e.stopPropagation();const p=rausoViennaPicks.find(x=>x.id===b.dataset.featuredSite);if(p)rausoOpenPlace(p)});
 el.querySelectorAll('[data-featured-like]').forEach(b=>b.onclick=e=>{
  e.stopPropagation();const item=rausoViennaPicks.find(x=>x.id===b.dataset.featuredLike);
  if(item)toggleBookmark('place',item)
 });
 const section=$('featuredSection');let toggle=$('moreViennaHighlights');
 if(section&&!toggle){
  toggle=document.createElement('button');toggle.id='moreViennaHighlights';
  toggle.type='button';toggle.className='outline-btn more-highlights';
  section.insertBefore(toggle,section.querySelector('.featured-note'));
 }
 if(toggle){
  toggle.textContent=rausoShowAllHighlights?'Weniger Orte anzeigen':'Weitere 4 Orte anzeigen';
  toggle.onclick=()=>{rausoShowAllHighlights=!rausoShowAllHighlights;renderViennaHighlights()}
 }
}

function renderPlaces(){
 const filtered=state.places.filter(p=>(p.name+' '+p.region+' '+p.type).toLowerCase().includes(state.query.toLowerCase()));
 $('placeStatus').textContent=state.placesLive?filtered.length+' Orte · OpenStreetMap · Angaben ohne Gewähr':state.placeLoading?'Orte werden geladen …':'Keine Live-Daten geladen. Tippe auf „Orte laden“.';
 $('places').innerHTML=filtered.length?filtered.slice(0,100).map(p=>{
  const liked=isBookmarked('place',p.id);
  return '<article class="place-card rauso-place-link" data-venue-category="'+esc(p.category||state.cat)+'" data-place-open="'+esc(p.id)+'" tabindex="0" role="link" title="'+esc(p.name)+' – '+(p.website?'Website':'Karte')+' öffnen">'+
   '<div class="place-cover rauso-place-create"><button type="button" class="rauso-create-venue-btn" data-with="'+esc(p.id)+'" aria-label="Unternehmung bei '+esc(p.name)+' erstellen" title="Unternehmung erstellen"><span class="rauso-plus-mark" aria-hidden="true"></span></button></div>'+
   '<span class="venue-distance osm-distance" title="'+esc(rausoDistanceOrigin())+'">★ '+esc(rausoDistanceLabel(p))+'</span>'+
   '<div class="place-header"><div class="place-emoji">'+cats[state.cat].icon+'</div><div class="place-body">'+
   '<h3>'+esc(p.name)+'</h3><p class="place-sub">'+esc([p.region,p.addr].filter(Boolean).join(' · ')||'Österreich')+'</p></div></div>'+
   '<div class="place-actions"><button type="button" class="rauso-venue-site" data-place-site="'+esc(p.id)+'" aria-label="'+(rausoHasVenueWebsite(p)?'Website':'Karte')+' von '+esc(p.name)+' öffnen">'+(rausoHasVenueWebsite(p)?'WEBSEITE ↗':'KARTE ↗')+'</button>'+
   '<button class="small-btn heart-btn star-btn '+(liked?'is-liked':'')+'" data-favorite="'+esc(p.id)+'" aria-label="'+(liked?'Aus Merkliste entfernen':'In Merkliste speichern')+'" aria-pressed="'+liked+'">'+(liked?'♥':'♡')+'</button></div></article>';
 }).join(''):'<div class="empty"><strong>Keine Orte gefunden</strong>Versuche eine andere Kategorie oder einen größeren Umkreis.</div>';
 $('places').querySelectorAll('[data-place-open]').forEach(card=>{
  const p=state.places.find(item=>String(item.id)===card.dataset.placeOpen);
  if(!p)return;
  card.onclick=e=>{if(!e.target.closest('button'))rausoOpenPlace(p)};
  card.onkeydown=e=>{if(e.target===card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();rausoOpenPlace(p)}};
 });
 $('places').querySelectorAll('[data-place-site]').forEach(b=>b.onclick=e=>{e.stopPropagation();const p=state.places.find(item=>String(item.id)===b.dataset.placeSite);if(p)rausoOpenPlace(p)});
 $('places').querySelectorAll('[data-favorite]').forEach(b=>b.onclick=e=>{
  e.stopPropagation();const p=state.places.find(item=>String(item.id)===b.dataset.favorite);
  if(p)toggleBookmark('place',p)
 });
 $('places').querySelectorAll('[data-with]').forEach(b=>b.onclick=e=>{
  e.stopPropagation();const p=state.places.find(item=>String(item.id)===b.dataset.with);if(p)createOuting(p)
 });
 renderViennaHighlights();updateBookmarkShortcut();if(state.mapOpen)drawMap(filtered);
}
function drawMap(places){if(!window.L){$('mapView').innerHTML='<div class="empty">Karte benötigt eine Internetverbindung.</div>';return}const center=regionData[state.region];if(!state.map){state.map=L.map('map',{zoomControl:false}).setView(center,11);L.control.zoom({position:'bottomright'}).addTo(state.map);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap-Mitwirkende',maxZoom:18}).addTo(state.map);state.markers=L.layerGroup().addTo(state.map)}state.map.setView(center,11);state.markers.clearLayers();places.slice(0,100).forEach(p=>L.marker([p.lat,p.lon]).bindPopup(`<strong>${esc(p.name)}</strong>`).addTo(state.markers));setTimeout(()=>state.map.invalidateSize(),150)}
function showMap(){state.mapOpen=!state.mapOpen;$('mapView').classList.toggle('hidden',!state.mapOpen);$('mapToggle').textContent=state.mapOpen?'≡ Liste':'◫ Karte';if(state.mapOpen)drawMap(state.places)}
function eventList(){return demoMode()?state.demoEvents:state.outings}

function rausoCapacityHtml(e){
 const c=e.availability;
 const max=c?.max_participants??e.max_participants;
 if(max==null||max==='')return '<div class="rauso-capacity">Teilnehmerzahl: nicht begrenzt</div>';
 if(!c)return '<div class="rauso-capacity">Max. '+esc(max)+' Personen · freie Plätze werden geladen</div>';
 const full=c.is_full===true,free=Math.max(0,Number(c.free_slots)||0);
 return '<div class="rauso-capacity '+(full?'rauso-full':'')+'"><strong>'+esc(c.confirmed)+' / '+esc(max)+' zugesagt</strong><span>'+(full?'VOLL':free+' frei')+'</span></div>';
}
function rausoIsFull(e){return e.availability?.is_full===true}

function rausoAgeAtEvent(date,startsAt){
 if(rausoAge(date)===null||!startsAt)return null;
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Vienna',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(startsAt)).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
 const [y,m,d]=date.split('-').map(Number);
 return parts.year-y-(parts.month<m||(parts.month===m&&parts.day<d)?1:0);
}
function rausoAgeRangeLabel(e){
 if(e.min_age==null&&e.max_age==null)return 'Alle Altersgruppen';
 if(e.min_age!=null&&e.max_age!=null)return 'Alter: '+e.min_age+'–'+e.max_age+' Jahre';
 if(e.min_age!=null)return 'Alter: ab '+e.min_age+' Jahren';
 return 'Alter: bis '+e.max_age+' Jahre';
}
function rausoEventAgeEligibility(e){
 if(!state.user)return {ok:true,reason:''};
 if(!rausoOwnBirthdate)return {ok:false,reason:'Bitte zuerst dein Geburtsdatum im Profil hinterlegen.'};
 const age=rausoAgeAtEvent(rausoOwnBirthdate,e.starts_at);
 if(age===null)return {ok:false,reason:'Dein Alter konnte nicht bestimmt werden.'};
 if((e.min_age!=null&&age<Number(e.min_age))||(e.max_age!=null&&age>Number(e.max_age)))
   return {ok:false,reason:'Du erfüllst die Altersgrenze dieser Veranstaltung nicht ('+rausoAgeRangeLabel(e)+').'};
 return {ok:true,reason:''};
}
function renderEventCard(e){const r=demoMode()?(state.demoReactions[e.id]||''):(e.mineReaction||'');const t=transportMeta[e.transport_mode]||transportMeta.auto;const privateMode=e.visibility==='private';const offering=e.transport_mode==='auto' && e.ride_role==='offer';const detail=offering&&e.seats_offered?`${e.seats_offered} Plätze`:'';const ageCheck=rausoEventAgeEligibility(e);return `<article class="event-card ${r==='going'?'event-joined':''}" data-outing-id="${esc(e.id)}"><div class="event-top"><span class="pill">${esc(privateMode?'🏡 Privat':cats[e.category]?.icon||'★')} ${esc(privateMode?meetingMeta[e.meeting_type]||'Privates Treffen':e.category||'Ausflug')}</span><span class="event-date">${esc(fmt(e.starts_at))}</span></div><h3>${esc(e.title)}</h3><div class="event-meta">★ ${esc(e.place_name)}<br><button type="button" class="event-author-link" data-event-organizer="${esc(e.id)}" title="Veranstalterprofil öffnen">👤 ${esc(e.author||'RAUSO-Mitglied')} <span aria-hidden="true">›</span></button>${e.authorOnline?' · 🟢 Online':''}${e.family_friendly?' · 👨‍👩‍👧 Familienfreundlich':''}</div><p class="rauso-age-note">◷ ${esc(rausoAgeRangeLabel(e))}</p><p class="event-descr">${esc(e.description||'')}</p>${rausoCapacityHtml(e)}<div class="event-transport"><span>${t[0]} ${t[1]}</span>${detail?`<span>💺 ${esc(detail)}</span>`:''}${e.departure_place?`<span>↗ ${esc(e.departure_place)}</span>`:''}</div>${privateMode?'<div class="locked-note">🔐 Privatadresse nicht öffentlich; erst nach bestätigter Teilnahme teilen.</div>':''}<div class="event-actions"><button class="small-btn heart-btn star-btn ${isBookmarked('outing',e.id)?'is-liked':''}" data-react="${esc(e.id)}" data-type="like" aria-pressed="${isBookmarked('outing',e.id)}">${isBookmarked('outing',e.id)?'♥':'♡'}</button><button class="small-btn join-btn ${r==='going'?'is-joined':''}" data-react="${esc(e.id)}" data-type="going" aria-pressed="${r==='going'?'true':'false'}" title="${esc(ageCheck.reason||'Teilnehmen')}" ${(rausoIsFull(e)||(!ageCheck.ok&&!!rausoOwnBirthdate))&&r!=='going'?'disabled aria-disabled="true"':''}>${r==='going'?'✓ Du bist dabei':rausoIsFull(e)?'VOLL':!ageCheck.ok?(rausoOwnBirthdate?'ALTER PASST NICHT':'GEBURTSDATUM FEHLT'):'✓ Bin dabei'}</button>${!demoMode()&&e.author_id!==myId()?`<button class="small-btn event-friend" data-friend-outing="${esc(e.id)}">👥 Freundschaft</button>`:'' }<button class="small-btn" data-share="${esc(e.id)}">↗ Teilen</button><button class="small-btn" data-incident="${esc(e.id)}">🛡 Melden</button></div></article>`}
async function openEventOrganizerProfile(outingId){
 const outing=eventList().find(event=>String(event.id)===String(outingId));
 if(!outing){toast('Veranstaltung nicht gefunden.');return}
 if(!outing.author_id){
  modal('Veranstalterprofil','<div class="surface"><strong>'+esc(outing.author||'RAUSO-Mitglied')+'</strong><p class="quiet">Für dieses Beispiel ist kein echtes Mitgliederprofil vorhanden.</p></div>');
  return
 }
 let person=availablePeople().find(p=>p.id===outing.author_id)||{id:outing.author_id,display_name:outing.author||'RAUSO-Mitglied'};
 if(state.user){
  const {data,error}=await api.from('rauso_profiles').select('id,display_name,city,bio').eq('id',outing.author_id).maybeSingle();
  if(error){toast('Profil konnte nicht geladen werden: '+error.message);return}
  if(data)person=data
 }
 let photoUrl='';
 if(state.user && person.id){
  const {data:approved}=await api.from('profile_photos').select('storage_path').eq('user_id',person.id)
    .eq('is_public',true).eq('moderation_status','approved').order('is_primary',{ascending:false}).limit(1);
  if(approved?.[0]){
   const {data:url}=await api.storage.from('profile-photos').createSignedUrl(approved[0].storage_path,600);
   photoUrl=url?.signedUrl||''
  }
 }
 const own=state.user?.id===person.id;
 const friendship=own?'self':connection(person);
 const incoming=state.connections.some(c=>c.sender_id===person.id&&c.recipient_id===myId()&&c.status==='pending');
 const action=own?'':!state.user?'<button class="primary-btn" id="organizerLogin">Anmelden und Freundschaftsanfrage senden</button>':
  friendship==='accepted'?'<button class="primary-btn" id="organizerChat">✉ Nachricht senden</button>':
  friendship==='pending'?(incoming?'<button class="primary-btn" id="organizerAccept">✓ Anfrage annehmen</button>':'<p class="quiet">⏳ Freundschaftsanfrage bereits gesendet.</p>'):
  friendship==='declined'?'<p class="quiet">Freundschaftsanfrage abgelehnt.</p>':
  '<button class="primary-btn" id="organizerFriend"><span class="rauso-plus-mark" aria-hidden="true"></span> Freundschaftsanfrage senden</button>';
 modal('👤 Veranstalterprofil','<div class="surface stack organizer-profile"><div class="profile-row">'+
   (photoUrl?'<img class="organizer-avatar" src="'+esc(photoUrl)+'" alt="Freigegebenes Profilfoto">':avatar(person))+
   '<div class="profile-meta"><h3>'+esc(person.display_name||'RAUSO-Mitglied')+'</h3><small>'+esc(person.city||'Österreich')+'</small></div></div>'+
   '<p>'+esc(person.bio||'Dieses Mitglied hat noch keinen Profiltext veröffentlicht.')+'</p>'+
   '<p class="quiet">Veranstaltung: '+esc(outing.title||'Ausflug')+'</p>'+action+'</div>');
 if($('organizerLogin'))$('organizerLogin').onclick=showAuth;
 if($('organizerFriend'))$('organizerFriend').onclick=async()=>{await requestContact(person.id);closeModal()};
 if($('organizerAccept'))$('organizerAccept').onclick=async()=>{await acceptContact(person.id);closeModal()};
 if($('organizerChat'))$('organizerChat').onclick=()=>openChat(person.id);
}
function wireEventButtons(root,data){
 root.querySelectorAll('[data-event-organizer]').forEach(btn=>btn.onclick=()=>openEventOrganizerProfile(btn.dataset.eventOrganizer));
 root.querySelectorAll('[data-friend-outing]').forEach(btn=>btn.onclick=()=>requestEventFriendship(btn.dataset.friendOuting));root.querySelectorAll('[data-react]').forEach(b=>b.onclick=()=>reactOuting(b.dataset.react,b.dataset.type));root.querySelectorAll('[data-share]').forEach(b=>b.onclick=()=>{const e=data.find(e=>e.id===b.dataset.share);if(e)shareOuting(e)});root.querySelectorAll('[data-incident]').forEach(b=>b.onclick=()=>openSafetyReport(b.dataset.incident))}
function renderEvents(){const data=eventList().filter(e=>new Date(e.starts_at).getTime()>Date.now()-3600000 && (state.eventMode==='all'||(state.eventMode==='private' ? e.visibility==='private':e.visibility!=='private'))).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));$('eventList').innerHTML=(demoMode()?'<div class="status-banner">Vorschau: Treffen und Reaktionen bleiben auf diesem Gerät. Keine reale Teilnahme oder Sicherheitsüberprüfung.</div>':'')+(data.length?data.map(renderEventCard).join(''):'<div class="empty"><strong>Keine passenden Treffen</strong>Du kannst selbst ein Treffen vorschlagen.</div>');document.querySelectorAll('[data-event-mode]').forEach(b=>b.classList.toggle('active',b.dataset.eventMode===state.eventMode));wireEventButtons($('eventList'),data)}
// Participation is a user's own RSVP. "going" is not an organizer-confirmed booking.
function meetingReaction(e){return demoMode()?(state.demoReactions[e.id]||''):(e.mineReaction||'')}
function myMeetingData(){return eventList().filter(e=>e.author_id===myId()||meetingReaction(e)==='going')}
let rausoMeetingDataReady=false;
function refreshMeetingBadge(){
 const badge=$('meetingNavCount');if(!badge)return;
 if(!rausoMeetingDataReady){badge.classList.add('hidden');return}
 const key='rauso-meeting-changes:'+myId(),current={};
 for(const e of myMeetingData()){
  if(Date.parse(e.starts_at)<Date.now()-3600000)continue;
  current[e.id]=[(e.author_id===myId()?'organized':'going'),(e.availability?.confirmed??'unknown')].join(':');
 }
 let old=null;try{old=JSON.parse(localStorage.getItem(key)||'null')}catch{}
 const pending=Array.isArray(old?.pending)?old.pending:[];
 if(old?.current)for(const id of new Set([...Object.keys(old.current),...Object.keys(current)])){
  if(old.current[id]!==current[id]&&!pending.includes(id))pending.push(id);
 }
 if(state.tab==='myMeetings')pending.length=0;
 try{localStorage.setItem(key,JSON.stringify({current,pending}))}catch{}
 const count=pending.length;
 badge.classList.toggle('hidden',count===0);
 badge.textContent=count>99?'99+':String(count);
 badge.setAttribute('aria-label',count+' neue Zusagen, Absagen oder Treffen');
}
function renderMyMeetings(){
 const root=$('myMeetingsList');if(!root)return;
 const mine=myMeetingData(),now=Date.now(),upcoming=mine.filter(e=>Date.parse(e.starts_at)>=now-3600000);
 const organized=upcoming.filter(e=>e.author_id===myId()).length;
 const going=upcoming.filter(e=>meetingReaction(e)==='going'&&e.author_id!==myId()).length;
 const summary=$('myMeetingsSummary');summary.innerHTML=`<div class="meeting-stat"><strong>${going}</strong><span>Zugesagt</span></div><div class="meeting-stat"><strong>${organized}</strong><span>Organisiert</span></div>`;
 refreshMeetingBadge();
 document.querySelectorAll('[data-meeting-filter]').forEach(b=>b.classList.toggle('active',b.dataset.meetingFilter===state.meetFilter));
 const filters={upcoming:e=>Date.parse(e.starts_at)>=now-3600000,going:e=>Date.parse(e.starts_at)>=now-3600000&&meetingReaction(e)==='going',organized:e=>Date.parse(e.starts_at)>=now-3600000&&e.author_id===myId(),past:e=>Date.parse(e.starts_at)<now-3600000};
 const selected=mine.filter(filters[state.meetFilter]||filters.upcoming).sort((a,b)=>state.meetFilter==='past'?Date.parse(b.starts_at)-Date.parse(a.starts_at):Date.parse(a.starts_at)-Date.parse(b.starts_at));
 root.innerHTML=`${demoMode()?'<div class="status-banner">Vorschau: Deine Zusagen und Treffen werden nur auf diesem Gerät gespeichert. Das ist noch keine echte Bestätigung durch Veranstalter.</div>':''}${selected.length?selected.map(e=>{
 const reaction=meetingReaction(e),isOwn=e.author_id===myId(),t=transportMeta[e.transport_mode]||transportMeta.auto;
 const status=isOwn?'✦ Von dir organisiert':'✓ Deine Teilnahme zugesagt';
 const statusClass=isOwn?'organized':'going';
 return `<article class="meeting-card"><div class="meeting-card-head"><span class="meeting-status ${statusClass}">${status}</span><span class="meeting-date">${new Date(e.starts_at).toLocaleDateString('de-AT',{day:'2-digit',month:'short',year:'numeric',timeZone:'Europe/Vienna'})}</span></div><h3>${esc(e.title)}</h3><div class="meeting-detail">🕒 ${esc(fmt(e.starts_at).split(', ').pop())}</div><div class="meeting-detail">★ ${esc(e.place_name)}</div><div class="meeting-detail">👤 ${isOwn?'Du organisierst':esc(e.author||'RAUSO-Mitglied')}</div>${rausoCapacityHtml(e)}<div class="meeting-detail">${t[0]} ${t[1]}${e.departure_place?' · Start: '+esc(e.departure_place):''}${e.seats_offered&&e.ride_role==='offer'?' · '+esc(e.seats_offered)+' Mitfahrplätze':''}</div>${e.visibility==='private'?'<p class="locked-note">🔒 Privatadresse wird nicht öffentlich gezeigt.</p>':''}<div class="meeting-actions"><button class="small-btn" data-open-meeting="${esc(e.id)}">Treffen ansehen ↗</button>${!isOwn&&reaction==='going'&&Date.parse(e.starts_at)>now?`<button class="small-btn" data-remove-meeting="${esc(e.id)}">Zusage zurücknehmen</button>`:''}</div></article>`;
 }).join(''):'<div class="empty"><strong>Hier ist noch nichts geplant.</strong>Wenn du bei einem Treffen „Bin dabei“ auswählst oder selbst eines erstellst, erscheint es hier automatisch.<div style="margin-top:13px"><button id="browseFromMeetings" class="primary-btn">Treffen entdecken</button></div></div>'}`;
 root.querySelectorAll('[data-open-meeting]').forEach(b=>b.onclick=()=>openMeetingFromMine(b.dataset.openMeeting));
 root.querySelectorAll('[data-remove-meeting]').forEach(b=>b.onclick=()=>{const e=eventList().find(x=>x.id===b.dataset.removeMeeting);if(e)reactOuting(e.id,meetingReaction(e))});
 const browse=$('browseFromMeetings');if(browse)browse.onclick=()=>switchTab('events');
}
function openMeetingFromMine(id){
 const event=eventList().find(e=>e.id===id);if(!event)return;
 if(Date.parse(event.starts_at)<Date.now()-3600000){
   const travel=transportMeta[event.transport_mode]||transportMeta.auto;
   modal('Vergangenes Treffen',`<div class="stack"><h3>${esc(event.title)}</h3><div class="meeting-detail">🕒 ${esc(fmt(event.starts_at))}</div><div class="meeting-detail">★ ${esc(event.place_name)}</div><div class="meeting-detail">👤 ${esc(event.author||'Mitglied')}</div><div class="meeting-detail">${travel[0]} ${travel[1]}</div><p class="quiet">${esc(event.description||'')}</p><p class="helper-text">Dieses Treffen liegt in der Vergangenheit.</p></div>`);return;
 }
 state.eventMode='all';switchTab('events');
 const el=Array.from(document.querySelectorAll('#eventList [data-outing-id]')).find(x=>x.dataset.outingId===id);
 if(!el){toast('Dieses Treffen ist in der aktuellen Liste nicht mehr verfügbar.');return}
 el.classList.add('meeting-highlight');el.scrollIntoView({block:'center',behavior:'smooth'});
}
function renderFamily(){const events=eventList().filter(e=>e.family_friendly && Date.parse(e.starts_at)>Date.now()-3600000);$('familyEvents').innerHTML=(demoMode()?'<div class="status-banner">Beispielangebote. Alle Treffenden müssen als Erwachsene geprüft werden. Kinder erhalten kein eigenes Konto.</div>':'')+(events.length?events.map(renderEventCard).join(''):'<div class="empty">Noch keine Familientreffen. Erstelle selbst eines.</div>');wireEventButtons($('familyEvents'),events)}
async function shareOuting(e){
 const privateMode=e.visibility==='private';
 const text='♥ RAUSO Unternehmung: '+String(e.title||'Treffen')+'\n'+
  'Wann: '+fmt(e.starts_at)+'\nWo: '+(privateMode?'Privater Treffpunkt – nach Zusage erfragen':String(e.place_name||'Treffpunkt offen'));
 // No private home addresses appear in outward invitations.
 modal('Unternehmung teilen',
  '<div class="stack rauso-share-options"><p class="quiet">Wähle die gewünschte App. Private Adressen werden nicht geteilt.</p>'+
  '<button type="button" class="outline-btn" id="shareWhatsApp">WhatsApp</button>'+
  '<button type="button" class="outline-btn" id="shareInstagram">Instagram</button>'+
  '<button type="button" class="outline-btn" id="shareFacebook">Facebook</button>'+
  '<button type="button" class="outline-btn" id="shareOther">Weitere Apps …</button>'+
  '<button type="button" class="outline-btn" id="shareCopy">Einladung kopieren</button></div>');
 const copyText=async()=>{
  try{
   if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);
   else{
    const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.left='-10000px';
    document.body.appendChild(area);area.select();const copied=document.execCommand('copy');area.remove();if(!copied)throw Error('Kopieren nicht möglich');
   }
   closeModal();toast('Einladung kopiert. Du kannst sie in einer App einfügen.');
  }catch{toast('Kopieren fehlgeschlagen. Verwende Weitere Apps.')}
 };
 const shareWith=async(target)=>{
  if(window.RAUSOShare?.shareTo){
   window.RAUSOShare.shareTo(target,text);closeModal();return;
  }
  if(target==='whatsapp'){
   closeModal();window.location.assign('https://wa.me/?text='+encodeURIComponent(text));return;
  }
  if(navigator.share){
   try{await navigator.share({title:'RAUSO Unternehmung',text});closeModal();return}
   catch(err){if(err?.name==='AbortError')return}
  }
  // Web browsers cannot reliably target Instagram/Facebook with a text-only share.
  await copyText();
 };
 $('shareWhatsApp').onclick=()=>shareWith('whatsapp');
 $('shareInstagram').onclick=()=>shareWith('instagram');
 $('shareFacebook').onclick=()=>shareWith('facebook');
 $('shareOther').onclick=()=>shareWith('all');
 $('shareCopy').onclick=copyText;
}
async function reactOuting(id,type){
 if(type==='like'){const item=eventList().find(x=>x.id===id);if(item)await toggleBookmark('outing',item);return}
 if(!mustVerify('Teilnahme und Reaktionen'))return;
 const requested=eventList().find(outing=>outing.id===id);
 if(type==='going'&&requested&&meetingReaction(requested)!=='going'){
  const eligible=rausoEventAgeEligibility(requested);
  if(!eligible.ok){if(!rausoOwnBirthdate)rausoRequestBirthdate();else toast(eligible.reason);return}
 }
 const buttons=[...document.querySelectorAll('[data-react]')].filter(b=>b.dataset.react===id);
 if(buttons.some(b=>b.disabled))return;
 buttons.forEach(b=>b.disabled=true);
 try{
  const outing=eventList().find(e=>e.id===id);
  const previous=outing?.mineReaction||null;
  const next=previous===type?null:type;
  let error;
  if(next===null){
   ({error}=await api.from('rauso_rsvps').delete().eq('outing_id',id).eq('user_id',myId()));
  }else{
   ({error}=await api.from('rauso_rsvps').upsert({outing_id:id,user_id:myId(),status:next},{onConflict:'outing_id,user_id'}));
  }
  if(error)throw error;
  if(outing)outing.mineReaction=next;
  renderEvents();
  renderFamily();
  refreshMeetingBadge();
  renderMyMeetings();
  toast(next==='going'?'✓ Du bist dabei!':'Teilnahme aktualisiert.');
  await loadOutings();
 }catch(err){
  toast(String(err?.message||'').toLowerCase().includes('voll')?'Das Treffen ist bereits VOLL.':'Teilnahme konnte nicht gespeichert werden: '+(err?.message||String(err)));
   await loadOutings().catch(()=>{});
 }finally{
  buttons.forEach(b=>b.disabled=false);
 }
}
function createOuting(p,opts={}){if(!mustVerify('Treffen erstellen'))return;const place=p?.name||'';const category=opts.family?'familie':p?.category||'ausfluege';const future=new Date(Date.now()+86400000);future.setMinutes(future.getMinutes()-future.getTimezoneOffset());const planned=new Date('2026-10-24T18:00:00');const date=(Date.now()<planned.getTime()? '2026-10-24T18:00':future.toISOString().slice(0,16));
 modal('Treffen vorschlagen',`<form id="outingForm" class="stack"><div class="input-group"><label for="oTitle">Titel</label><input id="oTitle" required minlength="4" maxlength="100" placeholder="z. B. Gemeinsam kochen"></div><div class="input-group"><label for="oVisibility">Wo treffen wir uns?</label><select id="oVisibility"><option value="public">🌳 Draußen / öffentlicher Ort</option><option value="private" ${opts.private?'selected':''}>🏡 Privat zu Hause</option></select></div><div id="privateKind" class="input-group"><label for="oMeeting">Aktivität</label><select id="oMeeting">${Object.entries(meetingMeta).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></div><div class="input-group"><label for="oPlace">Treffpunkt / öffentliche Gegend (keine Privatadresse)</label><input id="oPlace" required minlength="2" maxlength="160" value="${esc(place)}" placeholder="z. B. Wiener Neustadt · Innenstadt"></div><div class="input-group"><label for="oDate">Datum und Uhrzeit</label><input id="oDate" type="datetime-local" required min="${future.toISOString().slice(0,16)}" value="${date}"></div><div class="input-group"><label>Altersangaben für Teilnehmer (optional)</label><div class="rauso-age-fields"><label>Mindestalter<input id="oMinAge" type="number" min="0" max="120" step="1" placeholder="Kein Minimum"></label><label>Höchstalter<input id="oMaxAge" type="number" min="0" max="120" step="1" placeholder="Kein Maximum"></label></div><small>Alter am Veranstaltungstag; beide Felder leer = keine Altersgrenze.</small></div><div class="input-group"><label for="oCat">Kategorie</label><select id="oCat">${Object.entries(cats).map(([key,x])=>`<option value="${key}" ${key===category?'selected':''}>${x.icon} ${esc(key)}</option>`).join('')}</select></div><label class="quiet"><input type="checkbox" id="oFamily" ${opts.family?'checked':''}> 👨‍👩‍👧 Für Familien geeignet</label><div class="section-head"><h2>So komme ich hin</h2></div><div class="transport-picks" role="radiogroup" aria-label="Anreise">${Object.entries(transportMeta).map(([key,v])=>`<label><input type="radio" name="oTransport" value="${key}" ${key==='auto'?'checked':''}><span><b>${v[0]}</b>${v[1]}</span></label>`).join('')}</div><div id="transportInfo" class="stack"><div class="input-group"><label for="oDeparture">Start / Haltestelle</label><input id="oDeparture" maxlength="160" placeholder="z. B. Wiener Neustadt"></div><div class="input-group" id="lineWrap"><label for="oLine">Linie / Verbindung</label><input id="oLine" maxlength="80" placeholder="z. B. REX / U1"></div><div class="input-group" id="rideRoleWrap"><label for="oRideRole">Mitfahrgelegenheit</label><select id="oRideRole"><option value="none">Keine Plätze anbieten</option><option value="offer">🚗 Ich biete Plätze</option><option value="seek">Ich suche Mitfahrt</option></select></div><div class="input-group" id="seatsWrap"><label for="oSeats">Freie Plätze</label><select id="oSeats"><option value="1">1</option><option value="2">2</option><option value="3" selected>3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option></select><p class="helper-text">Plätze anbieten nur mit geprüfter Identität, Zulassungsbescheinigung und Kennzeichen.</p></div></div><div class="input-group"><label for="oMaxParticipants">Maximale Teilnehmerzahl (inklusive dir)</label><input id="oMaxParticipants" type="number" min="2" max="500" step="1" inputmode="numeric" value="10" required><p class="helper-text">Wenn alle Plätze vergeben sind, sind keine weiteren Zusagen möglich.</p></div><div class="input-group"><label for="oDesc">Beschreibung (optional)</label><textarea id="oDesc" maxlength="1200" placeholder="Was habt ihr vor?"></textarea></div><button type="submit" class="primary-btn">${demoMode()?'Demo-Treffen speichern':'Treffen veröffentlichen'}</button><p class="helper-text">Keine exakte Privatadresse veröffentlichen. Sie darf erst nach persönlicher Zusage separat geteilt werden.</p></form>`);
 const update=()=>{const choice=document.querySelector('input[name="oTransport"]:checked')?.value||'auto';$('rideRoleWrap').classList.toggle('hidden',choice!=='auto');$('lineWrap').classList.toggle('hidden',choice==='auto'||choice==='zufuss');$('seatsWrap').classList.toggle('hidden',choice!=='auto'||$('oRideRole').value!=='offer');$('privateKind').classList.toggle('hidden',$('oVisibility').value!=='private')};document.querySelectorAll('input[name="oTransport"]').forEach(x=>x.onchange=update);$('oRideRole').onchange=update;$('oVisibility').onchange=update;update();
 $('outingForm').onsubmit=async e=>{e.preventDefault();const transport_mode=document.querySelector('input[name="oTransport"]:checked').value,ride_role=transport_mode==='auto'?$('oRideRole').value:'none';if(ride_role==='offer'&&!checkVehicle())return;const minRaw=$('oMinAge').value.trim(),maxRaw=$('oMaxAge').value.trim();const minAge=minRaw===''?null:Number(minRaw),maxAge=maxRaw===''?null:Number(maxRaw);if((minAge!==null&&(!Number.isInteger(minAge)||minAge<0||minAge>120))||(maxAge!==null&&(!Number.isInteger(maxAge)||maxAge<0||maxAge>120))||(minAge!==null&&maxAge!==null&&minAge>maxAge)){toast('Ungültige Altersangabe: 0–120 Jahre, Minimum darf Maximum nicht übersteigen.');return}const val={min_age:minAge,max_age:maxAge,title:$('oTitle').value.trim(),place_name:$('oPlace').value.trim(),starts_at:new Date($('oDate').value).toISOString(),category:$('oCat').value,description:$('oDesc').value.trim(),family_friendly:$('oFamily').checked,visibility:$('oVisibility').value,meeting_type:$('oVisibility').value==='private'?$('oMeeting').value:null,transport_mode,ride_role,departure_place:$('oDeparture').value.trim(),transport_line:transport_mode!=='auto'&&transport_mode!=='zufuss'?$('oLine').value.trim():'',seats_offered:ride_role==='offer'?Number($('oSeats').value):null,max_participants:Number($('oMaxParticipants').value)};if(!Number.isInteger(val.max_participants)||val.max_participants<2||val.max_participants>500){toast('Bitte zwischen 2 und 500 Personen auswählen.');return}if(val.visibility==='private' && /\d/.test(val.place_name)){toast('Bitte nur Ort oder Stadtteil angeben, keine genaue Privatadresse.');return}if(Date.parse(val.starts_at)<=Date.now()){toast('Bitte einen Termin in der Zukunft auswählen.');return}try{if(demoMode()){showAuth();return;state.demoEvents.unshift({...val,id:'local-'+Date.now(),author_id:myId(),author:profile().display_name,demo:true});persist()}else{const {error}=await api.from('rauso_outings').insert({title:val.title,place_name:val.place_name,starts_at:val.starts_at,description:val.description,visibility:val.visibility,author_id:myId(),max_participants:val.max_participants,min_age:val.min_age,max_age:val.max_age});if(error)throw error;await loadOutings()}closeModal();switchTab('events');toast(demoMode()?'Test-Treffen nur lokal gespeichert.':'Treffen veröffentlicht.')}catch(err){toast(err.message)}}
}
async function loadOutings(){
 if(demoMode()){state.demoEvents=[];renderEvents();return}
 const [{data:events,error},reacts,members,presence,capacity]=await Promise.all([
  api.from('rauso_outings').select('*').order('starts_at',{ascending:true}).limit(80),
  api.from('rauso_rsvps').select('outing_id,user_id,status'),
  api.from('rauso_profiles').select('id,display_name'),
  api.from('rauso_presence').select('user_id,last_seen_at'),
  api.rpc('rauso_outing_availability')
 ]);
 if(error){toast('Treffen konnten nicht geladen werden: '+error.message);return}
 const names=Object.fromEntries((members.data||[]).map(p=>[p.id,p.display_name]));
 const online=new Set((presence.data||[]).filter(p=>Date.now()-new Date(p.last_seen_at).getTime()<90000).map(p=>p.user_id));
 const mine=Object.fromEntries((reacts.data||[]).filter(r=>r.user_id===myId()).map(r=>[r.outing_id,r.status]));
 const availability=Object.fromEntries((capacity.data||[]).map(c=>[c.outing_id,c]));
 const attendees={};
 for(const response of (reacts.data||[])){
  const row=attendees[response.outing_id]||(attendees[response.outing_id]={going:0});
  if(response.status==='going')row.going++;
 }
 state.outings=(events||[]).map(e=>({...e,category:'ausfluege',transport_mode:'zufuss',family_friendly:false,author:names[e.author_id]||'Mitglied',authorOnline:online.has(e.author_id),mineReaction:mine[e.id],attendance:e.author_id===myId()?(attendees[e.id]||{going:0}):null,availability:availability[e.id]||null}));
 rausoMeetingDataReady=true;renderEvents();refreshMeetingBadge();if(state.tab==='myMeetings')renderMyMeetings();
}
function avatar(p){return `<span class="avatar">${esc((p.display_name||'?').replace(' (Demo)','').slice(0,1).toUpperCase())}</span>`}
async function loadSocial(){
 if(demoMode()){renderMessages();renderDating();return}
 const [people,friends]=await Promise.all([
  api.from('rauso_profiles').select('id,display_name,city,bio').limit(100),
  api.from('rauso_friendships').select('id,sender_id,recipient_id,status,created_at').limit(500)
 ]);
 if(people.error)toast('Mitglieder konnten nicht geladen werden: '+people.error.message);
 state.people=(people.data||[]).filter(p=>p.id!==myId());
 state.connections=(friends.data||[]).map(c=>({...c,receiver_id:c.recipient_id}));
 state.datingLikes=[];state.blocks=[];
 renderMessages();renderDating();
}
function availablePeople(){const blocked=demoMode()?Object.keys(state.demoBlocks).filter(k=>state.demoBlocks[k]):state.blocks.map(x=>x.blocker_id===myId()?x.blocked_id:x.blocker_id);return (demoMode()?demoPeople:state.people).filter(p=>!blocked.includes(p.id))}
function connection(p){if(demoMode())return state.demoConnections[p.id]||'';const c=state.connections.find(c=>c.sender_id===p.id||c.receiver_id===p.id);return c?.status||''}

async function openFriendsPanel(){
 if(!state.user){showAuth();return}
 await loadSocial();
 const connections=state.connections.filter(c=>c.sender_id===myId()||c.recipient_id===myId());
 const received=connections.filter(c=>c.status==='pending'&&c.recipient_id===myId());
 const sent=connections.filter(c=>c.status==='pending'&&c.sender_id===myId());
 const friends=connections.filter(c=>c.status==='accepted');
 const idOf=c=>c.sender_id===myId()?c.recipient_id:c.sender_id;
 const person=id=>state.people.find(p=>p.id===id)||{id,display_name:'RAUSO-Mitglied',city:''};
 function member(c,action){const p=person(idOf(c));return '<div class="profile-row">'+avatar(p)+'<div class="profile-meta"><strong>'+esc(p.display_name)+'</strong><small>'+esc(p.city||'Österreich')+'</small></div>'+action(p)+'</div>'}
 const incoming=received.map(c=>member(c,p=>'<button type="button" class="small-btn" data-friend-accept="'+esc(p.id)+'">Annehmen</button><button type="button" class="small-btn" data-friend-decline="'+esc(p.id)+'">Ablehnen</button>')).join('');
 const accepted=friends.map(c=>member(c,p=>'<button type="button" class="small-btn" data-friend-chat="'+esc(p.id)+'">✉ Chat</button>')).join('');
 const outgoing=sent.map(c=>member(c,()=>'<span class="quiet">Anfrage gesendet</span>')).join('');
 modal('Freunde & Anfragen','<div class="stack rauso-friends-panel"><p class="quiet">'+friends.length+' Freunde · '+received.length+' neue Anfragen</p><h3>Freundschaftsanfragen ('+received.length+')</h3>'+(incoming||'<p class="quiet">Keine neuen Anfragen.</p>')+'<h3>Meine Freunde ('+friends.length+')</h3>'+(accepted||'<p class="quiet">Noch keine bestätigten Freunde.</p>')+'<h3>Gesendete Anfragen ('+sent.length+')</h3>'+(outgoing||'<p class="quiet">Keine offenen Anfragen.</p>')+'<button type="button" class="outline-btn" id="findFriends">Freunde suchen</button></div>');
 const root=$('modalRoot');
 root.querySelectorAll('[data-friend-accept]').forEach(b=>b.onclick=async()=>{await acceptContact(b.dataset.friendAccept);await openFriendsPanel()});
 root.querySelectorAll('[data-friend-decline]').forEach(b=>b.onclick=async()=>{await declineContact(b.dataset.friendDecline);await openFriendsPanel()});
 root.querySelectorAll('[data-friend-chat]').forEach(b=>b.onclick=()=>{const id=b.dataset.friendChat;closeModal();openChat(id)});
 $('findFriends').onclick=()=>{closeModal();switchTab('messages');$('rausoFindPeople').open=true;$('peopleSearch')?.focus()};
}
function connectionRow(p){const status=connection(p),mine=demoMode()?status==='pending-out':state.connections.some(c=>c.sender_id===myId()&&c.receiver_id===p.id&&c.status==='pending');let action=status==='accepted'?`<button class="small-btn" data-chat="${esc(p.id)}">✉ Chat</button>`:(status==='pending-in'||(status==='pending'&&!mine))?`<button class="small-btn" data-accept="${esc(p.id)}">✓ Annehmen</button>`:(status==='pending'||status==='pending-out')?'<span class="quiet">Anfrage gesendet</span>':`<button class="small-btn" data-add="${esc(p.id)}"><span class="rauso-plus-mark" aria-hidden="true"></span> Kontakt</button>`;if(demoMode()&&status==='pending-in')action=`<button class="small-btn" data-accept="${esc(p.id)}">✓ Annehmen</button>`;
 return `<div class="profile-row">${avatar(p)}<div class="profile-meta"><strong>${esc(p.display_name)}</strong><small>${esc(p.city||'Österreich')}</small></div>${action}<button class="small-btn" aria-label="Mehr Optionen" data-options="${esc(p.id)}">⋯</button></div>`}

let rausoInboxMessages=[];
let rausoInboxView='all';
let rausoInboxBusy=false;
let rausoInboxSearch='';
function rausoReadColor(message){return message.read_at?'read':'unread'}
function rausoReadLabel(message){return message.read_at?'✓ Gelesen':'✓ Ungelesen'}
function rausoUpdateMessageBadge(){
 const num=rausoInboxMessages.filter(m=>m.recipient_id===myId()&&!m.read_at).length;
 const headerBadge=$('headerMessageCount');
 if(headerBadge){headerBadge.textContent=num>99?'99+':String(num);headerBadge.classList.toggle('hidden',num===0)}
 const headerButton=$('headerMessages');
 if(headerButton)headerButton.setAttribute('aria-label',num?num+' ungelesene Nachrichten öffnen':'Nachrichten öffnen');
}
function rausoMessageDate(value){
 try{const d=new Date(value);return d.toDateString()===new Date().toDateString()?rausoMessageTime(value):d.toLocaleDateString('de-AT',{day:'2-digit',month:'2-digit'})}catch{return ''}
}
function rausoMessageTime(value){
 try{return new Date(value).toLocaleTimeString('de-AT',{hour:'2-digit',minute:'2-digit'})}catch{return ''}
}
async function loadMessageInbox(){
 if(rausoInboxBusy)return;
 if(!state.user){
  const examples=[];
  Object.entries(state.demoMessages||{}).forEach(([id,messages])=>
   messages.forEach(m=>examples.push({...m,sender_id:m.sender_id||myId(),recipient_id:id})));
  rausoInboxMessages=examples.sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
  rausoUpdateMessageBadge();
  if(state.tab==='messages')renderMessages();
  return;
 }
 rausoInboxBusy=true;
 try{
  const {data,error}=await api.from('rauso_messages')
   .select('id,sender_id,recipient_id,body,created_at,read_at')
   .or('sender_id.eq.'+myId()+',recipient_id.eq.'+myId())
   .order('created_at',{ascending:false}).limit(400);
  if(error){console.warn('Nachrichten:',error.message);if(state.tab==='messages')toast('Nachrichten konnten nicht geladen werden.');return}
  rausoInboxMessages=data||[];
  const missing=[...new Set(rausoInboxMessages.map(m=>m.sender_id===myId()?m.recipient_id:m.sender_id))]
   .filter(pid=>!state.people.some(p=>p.id===pid));
  if(missing.length){
   const {data:people}=await api.from('rauso_profiles').select('id,display_name,city,bio').in('id',missing.slice(0,100));
   if(people?.length)state.people=[...state.people,...people.filter(p=>!state.people.some(a=>a.id===p.id))];
  }
  rausoUpdateMessageBadge();
  if(state.tab==='messages')renderMessages();
 }finally{rausoInboxBusy=false}
}
function rausoChatRows(){
 const list=new Map();
 for(const m of rausoInboxMessages){
  const other=m.sender_id===myId()?m.recipient_id:m.sender_id;
  if(!other)continue;
  if(!list.has(other))list.set(other,{id:other,last:m,unread:0});
  if(m.recipient_id===myId()&&!m.read_at)list.get(other).unread++;
 }
 return [...list.values()].sort((a,b)=>Number(b.unread>0)-Number(a.unread>0)||Date.parse(b.last.created_at)-Date.parse(a.last.created_at));
}
function renderInboxRows(){
 const target=$('rausoInboxRows');if(!target)return;
 const rows=rausoChatRows().filter(row=>{
  if(rausoInboxView==='unread'&&!row.unread)return false;
  if(rausoInboxView==='contacts'){
   const p=state.people.find(p=>p.id===row.id);
   if(!p||connection(p)!=='accepted')return false;
  }
  const person=state.people.find(p=>p.id===row.id);
  return (person?.display_name||row.id).toLocaleLowerCase('de-AT').includes(rausoInboxSearch.toLocaleLowerCase('de-AT'))||
    row.last.body.toLocaleLowerCase('de-AT').includes(rausoInboxSearch.toLocaleLowerCase('de-AT'))
 });
 target.innerHTML=rows.length?rows.map(item=>{
  const p=state.people.find(p=>p.id===item.id)||{id:item.id,display_name:'RAUSO-Mitglied',city:''};
  const last=item.last;
  const mine=last.sender_id===myId();
  const cls=rausoReadColor(last);
  return '<button type="button" class="rauso-chat-row '+(item.unread?'unread':'')+'" data-inbox-chat="'+esc(item.id)+'" aria-label="Chat mit '+esc(p.display_name)+' öffnen">'+
   avatar(p)+'<span class="profile-meta"><strong>'+esc(p.display_name)+'</strong>'+
   '<small>'+(mine?'Du: ':'')+esc(last.body.length>60?last.body.slice(0,60)+'…':last.body)+'</small></span>'+
   '<span class="rauso-chat-tail"><span class="rauso-chat-time">'+esc(rausoMessageDate(last.created_at))+'</span>'+
   (item.unread?'<span class="rauso-unread-count">'+item.unread+'</span>':'')+
   (mine?'<span class="rauso-read-status '+cls+'" title="'+rausoReadLabel(last)+'">✓</span>':'')+'</span></button>';
 }).join(''):'<div class="inbox-empty">Keine Gespräche in dieser Ansicht.</div>';
 target.querySelectorAll('[data-inbox-chat]').forEach(btn=>btn.onclick=()=>openChat(btn.dataset.inboxChat));
}
function renderMessages(){
 const list=availablePeople();
 const rows=rausoChatRows();
 const unread=rausoInboxMessages.filter(m=>m.recipient_id===myId()&&!m.read_at).length;
 const el=$('messagesContent');if(!el)return;
 el.innerHTML=
  (demoMode()?'<div class="status-banner">Vorschau: Nachrichten werden nicht an andere Personen gesendet. <button class="small-btn" id="contactsLogin">Jetzt anmelden</button></div>':'')+
  '<div class="surface"><div class="rauso-inbox-summary"><div><h2 class="inbox-overview-heading">Chats</h2>'+
  '<p class="quiet">'+rows.length+' Gespräche · '+unread+' ungelesen</p></div>'+
  '<button type="button" class="primary-btn" id="chooseChatRecipient"><span class="rauso-plus-mark" aria-hidden="true"></span> Schreiben</button></div>'+
  '<div class="rauso-inbox-tabs">'+
   '<button type="button" data-inbox-view="all" class="'+(rausoInboxView==='all'?'active':'')+'">Alle</button>'+
   '<button type="button" data-inbox-view="unread" class="'+(rausoInboxView==='unread'?'active':'')+'">Ungelesen ('+unread+')</button>'+
   '<button type="button" data-inbox-view="contacts" class="'+(rausoInboxView==='contacts'?'active':'')+'">Kontakte</button></div>'+
  '<div class="searchbox rauso-message-search"><span>⌕</span><input type="search" id="inboxSearch" autocomplete="off" placeholder="Nachricht oder Name suchen" value="'+esc(rausoInboxSearch)+'"></div>'+
  '<p class="rauso-chat-hint">Ungelesene Chats zuerst · Rot / Grün: Lesestatus gesendeter Nachrichten</p>'+
  '<div id="rausoInboxRows" class="rauso-inbox-list"></div></div>'+
  '<details class="surface" id="rausoFindPeople"><summary>★ Freunde finden und Anfragen senden</summary>'+
  '<div class="searchbox"><span>⌕</span><input id="peopleSearch" placeholder="Name oder Stadt suchen" autocomplete="off"></div>'+
  '<div id="peopleRows">'+(list.length?list.map(connectionRow).join(''):'<div class="empty">Noch keine Mitglieder gefunden.</div>')+'</div></details>';
 renderInboxRows();
 el.querySelectorAll('[data-inbox-view]').forEach(btn=>btn.onclick=()=>{
  rausoInboxView=btn.dataset.inboxView;renderMessages()
 });
 $('inboxSearch').oninput=e=>{rausoInboxSearch=e.target.value;renderInboxRows()};
 $('peopleSearch').oninput=e=>{
  const q=e.target.value.toLocaleLowerCase('de-AT');
  $('peopleRows').innerHTML=list.filter(p=>((p.display_name||'')+' '+(p.city||'')).toLocaleLowerCase('de-AT').includes(q))
   .map(connectionRow).join('')||'<div class="empty">Keine Treffer</div>';
  wirePeople($('peopleRows'))
 };
 wirePeople($('peopleRows'));
 $('chooseChatRecipient').onclick=chooseChatRecipient;
 if($('contactsLogin'))$('contactsLogin').onclick=showAuth;
}
function chooseChatRecipient(){
 if(!state.user){showAuth();toast('Bitte zuerst anmelden, damit du echte Mitglieder auswählen kannst.');return}
 const contacts=availablePeople().filter(p=>connection(p)==='accepted');
 if(!contacts.length){modal('Nachricht schreiben','<p>Du hast noch keine bestätigten Kontakte. Suche oben unter „Menschen entdecken“ einen Namen und sende eine Kontaktanfrage. Nach der Annahme kannst du der Person schreiben.</p>');return}
 modal('Empfänger auswählen','<div class="stack"><label for="chatRecipient">An wen möchtest du schreiben?</label><select id="chatRecipient">'+contacts.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.display_name||'RAUSO-Mitglied')+' · '+esc(p.city||'')+'</option>').join('')+'</select><button class="primary-btn" id="startSelectedChat">Chat öffnen</button></div>');
 $('startSelectedChat').onclick=()=>{const id=$('chatRecipient').value;closeModal();openChat(id)};
}
function wirePeople(el){el.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>requestContact(b.dataset.add));el.querySelectorAll('[data-accept]').forEach(b=>b.onclick=()=>acceptContact(b.dataset.accept));el.querySelectorAll('[data-chat]').forEach(b=>b.onclick=()=>openChat(b.dataset.chat));el.querySelectorAll('[data-options]').forEach(b=>b.onclick=()=>personOptions(b.dataset.options))}
async function requestContact(id){if(!mustVerify('Kontaktanfragen'))return;if(id===myId()){toast('Eigenes Profil.');return}if(demoMode()){state.demoConnections[id]='pending-out';persist();toast('Test-Kontaktanfrage vorgemerkt.');renderMessages();return}try{
 const prior=state.connections.find(c=>(c.sender_id===myId()&&c.recipient_id===id)||(c.sender_id===id&&c.recipient_id===myId()));
 if(prior?.status==='pending'){toast('Freundschaftsanfrage ist bereits offen.');return}
 if(prior?.status==='accepted'){toast('Ihr seid bereits befreundet.');return}
 const {error}=await api.from('rauso_friendships').insert({sender_id:myId(),recipient_id:id,status:'pending'});if(error)throw error;await loadSocial();toast('Kontaktanfrage verschickt.')}catch(err){toast(err.message)}}
async function acceptContact(id){if(!mustVerify('Kontakte bestätigen'))return;if(demoMode()){state.demoConnections[id]='accepted';persist();renderMessages();toast('Testkontakt bestätigt.');return}try{await loadSocial();const conn=state.connections.find(c=>c.sender_id===id&&c.receiver_id===myId()&&c.status==='pending');if(!conn)throw Error('Keine eingehende Anfrage.');const {error}=await api.from('rauso_friendships').update({status:'accepted'}).eq('id',conn.id);if(error)throw error;await loadSocial()}catch(err){toast(err.message)}}
async function declineContact(id){
 if(!state.user)return showAuth();
 await loadSocial();const conn=state.connections.find(c=>c.sender_id===id && c.recipient_id===myId() && c.status==='pending');
 if(!conn){toast('Keine offene Anfrage gefunden.');return}
 const {error}=await api.from('rauso_friendships').update({status:'declined'}).eq('id',conn.id);
 if(error)toast(error.message);else{await loadSocial();await pollRausoNotifications(false);toast('Freundschaftsanfrage abgelehnt.')}
}
async function requestEventFriendship(eventId){
 if(!mustVerify('Freundschaftsanfragen'))return;
 const event=eventList().find(x=>String(x.id)===String(eventId));
 if(!event?.author_id){toast('Veranstalterprofil nicht gefunden.');return}
 if(event.author_id===myId()){toast('Das ist deine eigene Veranstaltung.');return}
 await requestContact(event.author_id);
}
function mutualLike(id){if(demoMode())return state.demoDatingLikes[id]==='match';return state.datingLikes.some(l=>l.liker_id===myId()&&l.liked_id===id)&&state.datingLikes.some(l=>l.liker_id===id&&l.liked_id===myId())}
function openChat(id){
 let p=availablePeople().find(p=>p.id===id);
 if(!p)p=state.people.find(p=>p.id===id);
 if(!p)p={id,display_name:'RAUSO-Mitglied'};
 const past=rausoInboxMessages.some(m=>m.sender_id===id||m.recipient_id===id);
 if(connection(p)!=='accepted'&&!mutualLike(id)&&!past){
  toast('Chat erst nach bestätigtem Kontakt oder gegenseitigem Dating-Like.');return
 }
 state.currentChat=id;
 modal('Chat mit '+p.display_name,
  '<div id="chatMessages" class="chat-board"></div>'+
  '<form id="chatForm" class="sendline"><input id="chatInput" maxlength="2000" required placeholder="Nachricht schreiben …" autocomplete="off">'+
  '<button type="submit">➤</button></form>'+
  '<p class="quiet">'+(demoMode()?'Demo-Nachrichten sind nur lokal sichtbar.':'Rot = ungelesen, Grün = gelesen. Lesestatus wird nur beim Öffnen des Chats aktualisiert.')+'</p>');
 loadChat();$('chatForm').onsubmit=sendChat
}
async function loadChat(){
 const target=$('chatMessages'),chatId=state.currentChat;
 if(!target||!chatId)return;
 let messages;
 if(demoMode()){
  messages=state.demoMessages[chatId]||[];
  for(const m of messages)if(m.sender_id!==myId()&&!m.read_at)m.read_at=new Date().toISOString();
  persist()
 }else{
  const {data,error}=await api.from('rauso_messages').select('id,sender_id,recipient_id,body,created_at,read_at')
   .or('and(sender_id.eq.'+myId()+',recipient_id.eq.'+chatId+'),and(sender_id.eq.'+chatId+',recipient_id.eq.'+myId()+')')
   .order('created_at',{ascending:true}).limit(150);
  if(error){toast(error.message);return}messages=data||[];
  const unread=messages.filter(m=>m.recipient_id===myId()&&!m.read_at).map(m=>m.id);
  if(unread.length&&state.currentChat===chatId&&$('chatMessages')){
   const readAt=new Date().toISOString();
   const {error:readError}=await api.from('rauso_messages').update({read_at:readAt})
    .eq('recipient_id',myId()).in('id',unread);
   if(!readError){
    messages.forEach(m=>{if(unread.includes(m.id))m.read_at=readAt});
   }else console.warn('Lesestatus:',readError.message);
  }
 }
 if(!$('chatMessages')||state.currentChat!==chatId)return;
 target.innerHTML=messages.map(m=>{
  const mine=m.sender_id===myId();
  return '<div class="bubble '+(mine?'mine':'')+'">'+esc(m.body)+
   '<small>'+esc(rausoMessageTime(m.created_at))+
   '<span class="rauso-read-status '+rausoReadColor(m)+'" title="'+(mine?'Empfänger':'Du')+
   (m.read_at?' hat gelesen':' hat noch nicht gelesen')+'">'+rausoReadLabel(m)+'</span></small></div>';
 }).join('')||'<div class="quiet">Noch keine Nachrichten.</div>';
 target.scrollTop=target.scrollHeight;
 loadMessageInbox()
}
async function sendChat(e){
 e.preventDefault();
 if(!mustVerify('Nachrichten schreiben'))return;
 const input=$('chatInput');const body=input?.value.trim();if(!body||!state.currentChat)return;
 try{
  if(demoMode()){
   (state.demoMessages[state.currentChat]??=[]).push({
    sender_id:myId(),recipient_id:state.currentChat,body,created_at:new Date().toISOString(),read_at:null
   });persist()
  }else{
   const {error}=await api.from('rauso_messages').insert({sender_id:myId(),recipient_id:state.currentChat,body});
   if(error)throw error
  }
  if(input)input.value='';
  await loadChat();
 }catch(err){toast(err.message)}
}
function personOptions(id){const p=availablePeople().find(p=>p.id===id);if(!p)return;modal(`${p.display_name} · Optionen`,`<div class="stack"><p class="quiet">Du kannst Nutzer blockieren oder unangemessenes Verhalten melden.</p><button id="blockPerson" class="outline-btn">⛔ ${demoMode()?'Testprofil ausblenden':'Nutzer blockieren'}</button><button id="reportPerson" class="outline-btn">⚑ Profil melden</button></div>`);$('blockPerson').onclick=()=>blockPerson(id);$('reportPerson').onclick=()=>reportPerson(id)}
async function blockPerson(id){try{if(demoMode()){state.demoBlocks[id]=true;persist()}else{const {error}=await api.from('blocks').insert({blocker_id:myId(),blocked_id:id});if(error)throw error;await loadSocial()}closeModal();renderMessages();toast('Profil ausgeblendet.')}catch(err){toast(err.message)}}
function reportPerson(id){modal('Profil melden',`<form id="reportForm" class="stack"><div class="input-group"><label for="reason">Grund der Meldung</label><textarea id="reason" required minlength="5" maxlength="500" placeholder="Beschreibe das Problem"></textarea></div><button class="primary-btn" type="submit">Meldung senden</button></form>`);$('reportForm').onsubmit=async e=>{e.preventDefault();if(demoMode()){toast('Demo: Meldung wurde nicht an einen Server gesendet.');closeModal();return}const {error}=await api.from('reports').insert({reporter_id:myId(),target_id:id,reason:$('reason').value.trim()});if(error)toast(error.message);else{closeModal();toast('Meldung eingereicht.')}}}
function renderDating(){const main=$('datingContent');if(!demoMode()&&!rausoAdult()){main.innerHTML='<div class="surface stack"><h2>Dating ab 18 Jahren</h2><p class="quiet">Dating ist nur ab 18 Jahren mit hinterlegtem Geburtsdatum möglich.</p></div>';return}const opt=profile().dating_enabled===true;if(!opt){main.innerHTML=`<div class="surface stack"><div style="font-size:47px">♡</div><h2>Dating ist ausgeschaltet</h2><p class="quiet">Dein Profil erscheint nicht im Dating-Bereich. Du kannst Dating jederzeit freiwillig einschalten – nur für Erwachsene ab 18 Jahren.</p><p class="quiet">Mindestalter 18 Jahre · Prüfung anhand deines Geburtsdatums.</p><button class="primary-btn" id="activateDating">Dating aktivieren</button><p class="quiet">Freundschaften und normale Unternehmungen funktionieren unabhängig davon.</p></div>`;$('activateDating').onclick=()=>{if(!rausoAdult()){toast('Dating ist erst ab 18 Jahren erlaubt.');return}setDating(true,true)};return}
 const people=availablePeople().filter(p=>p.dating_enabled&&p.adult_confirmed);main.innerHTML=`<div class="status-banner">${demoMode()?'Dating-Demo: Diese Profile sind nur Beispiele. Es entstehen keine echten Matches.':'Dating aktiv: Dein Profil ist für andere angemeldete Dating-Nutzer sichtbar.'}</div><div class="section-head"><h2>Menschen kennenlernen</h2><button class="outline-btn" id="deactivateDating">Dating aus</button></div><div class="stack">${people.length?people.map(p=>`<article class="surface"><div class="profile-row">${avatar(p)}<div class="profile-meta"><strong>${esc(p.display_name)}</strong><small>${esc(p.city)}</small></div></div><p class="quiet">${esc(p.bio||'Lust, neue Leute kennenzulernen.')}</p><div class="place-actions"><button class="small-btn ${likedPerson(p.id)?'active':''}" data-date-like="${esc(p.id)}">${likedPerson(p.id)?'♥ Gefällt mir':'♡ Like'}</button>${mutualLike(p.id)?`<button class="small-btn" data-chat="${esc(p.id)}">✉ Match-Chat</button>`:''}<button class="small-btn" data-options="${esc(p.id)}">⋯</button></div></article>`).join(''):'<div class="empty">Derzeit keine Dating-Profile gefunden.</div>'}</div>`;
 $('deactivateDating').onclick=()=>setDating(false,false);main.querySelectorAll('[data-date-like]').forEach(b=>b.onclick=()=>dateLike(b.dataset.dateLike));wirePeople(main)}
function likedPerson(id){return demoMode()?!!state.demoDatingLikes[id]:state.datingLikes.some(l=>l.liker_id===myId()&&l.liked_id===id)}
async function dateLike(id){if(!mustVerify('Dating-Likes'))return;if(demoMode()){state.demoDatingLikes[id]=state.demoDatingLikes[id]?'':(id==='demo-u2'?'match':'liked');persist();renderDating();renderMessages();toast(state.demoDatingLikes[id]==='match'?'Demo-Match! Du kannst den Test-Chat ausprobieren.':'Demo-Like gespeichert.');return}try{const req=likedPerson(id)?api.from('dating_likes').delete().eq('liker_id',myId()).eq('liked_id',id):api.from('dating_likes').insert({liker_id:myId(),liked_id:id});const {error}=await req;if(error)throw error;await loadSocial();toast(mutualLike(id)?'Match! Ihr könnt jetzt schreiben.':'Like gespeichert.')}catch(err){toast(err.message)}}
async function setDating(enabled,adult){if(enabled&&!rausoAdult()){toast('Dating ist erst ab 18 Jahren möglich.');return}if(enabled&&!mustVerify('Dating aktivieren'))return;try{if(demoMode()){state.demoProfile={...state.demoProfile,dating_enabled:enabled,adult_confirmed:adult};persist()}else{const {error}=await api.from('rauso_profiles').update({dating_enabled:enabled,adult_confirmed:enabled?adult:profile().adult_confirmed}).eq('id',myId());if(error)throw error;state.profile={...state.profile,dating_enabled:enabled,adult_confirmed:adult}}renderDating();renderProfile();toast(enabled?'Dating aktiviert.':'Dating deaktiviert.')}catch(err){toast(err.message)}}
function renderProfile(){const p=profile();$('profileContent').innerHTML=`<div class="surface stack"><div class="profile-row">${avatar(p)}<div class="profile-meta"><strong>${esc(p.display_name)}</strong><small>${esc(p.city||'Österreich')} · ${demoMode()?'Demo-Vorschau':'RAUSO-Mitglied'}</small></div></div><div class="rauso-age-display">Alter: ${rausoAge(rausoOwnBirthdate)===null?"Nicht hinterlegt":esc(rausoAge(rausoOwnBirthdate))+" Jahre"} · Geburtsdatum unveränderbar</div><form id="profileForm" class="stack"><div class="input-group"><label for="myName">Anzeigename</label><input id="myName" minlength="2" maxlength="40" required  value="${esc(p.display_name)}"></div><div class="input-group"><label for="myCity">Wohnort / Region</label><input id="myCity" maxlength="80" value="${esc(p.city)}"></div><div class="input-group"><label for="myBio">Über mich</label><textarea id="myBio" maxlength="500">${esc(p.bio)}</textarea></div><button class="primary-btn" type="submit">Profil speichern</button></form></div><div class="section-head"><h2>Mein Konto</h2></div><div class="surface stack"><button id="reportSafety" class="safety-action">🛡 Sicherheitsfall melden · Notfall 133 / 112</button><p class="quiet">${demoMode()?'Alle sozialen Daten und Musterprofile sind lokale Vorschau.':'Angemeldet als '+esc(state.user?.email||'')}</p>${demoMode()?'<button class="outline-btn" id="loginBtn">Konto erstellen / Anmelden</button>':'<button class="outline-btn" id="logoutBtn">Abmelden</button>'}<button class="outline-btn" id="deleteLocal">Lokale Testdaten löschen</button><p class="quiet">RAUSO v${APP_VERSION} · Ortsdaten © OpenStreetMap</p></div>`;
 $('profileForm').onsubmit=saveProfile;$('reportSafety').onclick=()=>openSafetyReport(null);$('deleteLocal').onclick=()=>{if(confirm('Testdaten auf diesem Gerät wirklich löschen?')){localStorage.removeItem(STORE);location.reload()}};if(demoMode())$('loginBtn').onclick=showAuth;else $('logoutBtn').onclick=logout;injectProfileExtras()}
async function saveProfile(e){e.preventDefault();const name=$('myName').value.trim();if(!rausoValidDisplayName(name)){toast('Bitte einen eigenen Profilnamen mit 2–40 Zeichen eingeben.');$('myName').focus();return}const data={display_name:name,city:$('myCity').value.trim(),bio:$('myBio').value.trim()};try{if(demoMode()){state.demoProfile={...state.demoProfile,...data};persist()}else{const {error}=await api.from('rauso_profiles').upsert({id:myId(),...data});if(error)throw error;state.profile={...state.profile,...data}}toast('Profil gespeichert.');updateHeaderAccount();renderProfile();injectProfileExtras();addMoreLink();addReadiness()}catch(err){toast(err.message)}}
function rausoValidDisplayName(value){
 const name=String(value||'').trim();
 return name.length>=2 && name.length<=40 && !['RAUSO-Mitglied','Mein RAUSO-Profil'].includes(name);
}
function showAuth(){
 if(!hasBackend){modal('RAUSO-Konto noch nicht eingerichtet','<p>Die Online-Anmeldung ist momentan nicht konfiguriert.</p>');return}
 modal('Anmelden oder registrieren',
  '<form class="stack" id="authForm">'+
  '<div class="input-group" id="signupNameWrap" hidden><label for="signupName">Dein Profilname (Pflichtfeld)</label>'+
  '<input id="signupName" minlength="2" maxlength="40" autocomplete="nickname" placeholder="Wie sollen andere dich sehen?">'+
  '<small>Jeder RAUSO-Account benötigt einen selbst gewählten Namen.</small></div>'+
   '<div class="input-group" id="signupBirthWrap" hidden><label for="signupBirth">Geburtsdatum (Pflichtfeld, später nicht änderbar)</label>'+
   '<input id="signupBirth" type="date" min="1900-01-01" max="'+new Date().toISOString().slice(0,10)+'">'+
   '<small>Das Geburtsdatum wird nur für dein Konto gespeichert.</small></div>'+
  '<div class="input-group"><label for="authEmail">E-Mail</label><input id="authEmail" type="email" required autocomplete="email"></div>'+
  '<div class="input-group"><label for="authPassword">Passwort (mind. 8 Zeichen)</label>'+
  '<input id="authPassword" type="password" minlength="8" required autocomplete="current-password"></div>'+
  '<div class="form-actions"><button class="primary-btn" type="submit" id="authSubmit">Anmelden</button>'+
  '<button class="outline-btn" type="button" id="signup">Registrieren</button></div>'+
  '<button class="outline-btn" type="button" id="resendConfirmation">Bestätigungs-E-Mail erneut senden</button>'+
  '<p class="quiet">Bei Registrierung erst Profilnamen wählen, danach E-Mail und Passwort eingeben.</p></form>');
 let register=false;
 $('authForm').onsubmit=e=>{e.preventDefault();runAuth(register)};
 $('signup').onclick=()=>{
  register=true;$('signupNameWrap').hidden=false;$('signupName').required=true;$('signupBirthWrap').hidden=false;$('signupBirth').required=true;
  $('authSubmit').textContent='Konto registrieren';$('signup').textContent='Zur Anmeldung';
  $('signup').onclick=()=>showAuth();
  $('signupName').focus()
 };
 $('resendConfirmation').onclick=resendConfirmationEmail;
}
async function resendConfirmationEmail(){
 const email=$('authEmail')?.value.trim();
 if(!email){toast('Bitte zuerst deine E-Mail-Adresse eintragen.');return}
 const button=$('resendConfirmation');button.disabled=true;
 try{
  const {error}=await api.auth.resend({type:'signup',email,options:{emailRedirectTo:'rauso://auth/callback'}});
  if(error)throw error;
  toast('Falls das Konto noch unbestätigt ist, wurde eine neue E-Mail angefordert. Bitte auch Spam prüfen.');
 }catch(err){toast('Bestätigung konnte nicht angefordert werden: '+err.message)}
 finally{button.disabled=false}
}
async function runAuth(signup){
 const email=$('authEmail')?.value.trim(),password=$('authPassword')?.value;
 const name=signup?$('signupName')?.value.trim():'';
 const birth=signup?$('signupBirth')?.value:'';
 if(signup&&!rausoValidDisplayName(name)){toast('Profilname verpflichtend: 2–40 Zeichen und kein Platzhalter.');$('signupName').focus();return}
 const options={emailRedirectTo:'rauso://auth/callback'};
 if(signup&&rausoAge(birth)===null){toast('Bitte gültiges Geburtsdatum eintragen.');$('signupBirth').focus();return}
 if(signup)options.data={display_name:name,birth_date:birth};
 const {data,error}=signup
  ?await api.auth.signUp({email,password,options})
  :await api.auth.signInWithPassword({email,password});
 if(error){toast(error.message);return}
 closeModal();
 if(data.session){await refreshUser();toast('Angemeldet.')}
 else toast('Bitte bestätige deine E-Mail-Adresse.');
}
async function rausoCompleteProfile(){
 if(!state.user)return;
 modal('Profilname erforderlich',
  '<form id="finishProfileForm" class="stack"><p>Bitte wähle einen Profilnamen, damit du RAUSO vollständig verwenden kannst.</p>'+
  '<label for="finishProfileName">Dein Profilname</label>'+
  '<input id="finishProfileName" required minlength="2" maxlength="40" placeholder="Dein Anzeigename" autocomplete="nickname">'+
  '<button class="primary-btn" type="submit">Profilnamen speichern</button></form>');
 $('finishProfileForm').onsubmit=async e=>{
  e.preventDefault();const name=$('finishProfileName').value.trim();
  if(!rausoValidDisplayName(name)){toast('Bitte einen gültigen Namen mit 2–40 Zeichen eingeben.');return}
  const {error}=await api.from('rauso_profiles').upsert({id:myId(),display_name:name});
  if(error){toast(error.message);return}
  state.profile={...state.profile,display_name:name};
  closeModal();await loadSocial();renderProfile();updateHeaderAccount();toast('Profilname gespeichert.')
 };
}
async function logout(){rausoMeetingDataReady=false;if(rausoNotificationsChannel){api.removeChannel(rausoNotificationsChannel);rausoNotificationsChannel=null}await api.auth.signOut();state.user=null;rausoOwnBirthdate=null;rausoBirthdateReady=false;state.profile=null;state.outings=[];state.people=[];state.connections=[];rausoInboxMessages=[];rausoUpdateMessageBadge();updateHeaderAccount();switchTab('discover')}
let rausRealtimeChannel=null;
let rausRefreshPending=false;
function scheduleRausoRefresh(){
 if(rausRefreshPending || !state.user)return;
 rausRefreshPending=true;
 setTimeout(async()=>{
  try{if(state.user){await loadOutings();await pollRausoNotifications(false);if(state.tab==='notifications')await renderNotifications()}}
  catch(err){console.warn('RAUSO realtime refresh',err)}
  finally{rausRefreshPending=false}
 },350);
}
function attachRausoRealtime(){
 if(!api)return;
 if(rausRealtimeChannel){api.removeChannel(rausRealtimeChannel);rausRealtimeChannel=null}
 if(!state.user)return;
 rausRealtimeChannel=api.channel('rauso-live-'+state.user.id)
  .on('postgres_changes',{event:'*',schema:'public',table:'rauso_rsvps'},scheduleRausoRefresh)
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'rauso_notifications',filter:'user_id=eq.'+state.user.id},scheduleRausoRefresh)
  .on('postgres_changes',{event:'*',schema:'public',table:'rauso_friendships'},()=>{if(state.user)loadSocial()})
  .on('postgres_changes',{event:'*',schema:'public',table:'rauso_messages'},event=>{const m=event.new||event.old;if(state.user&&m&&(m.sender_id===state.user.id||m.recipient_id===state.user.id)){loadMessageInbox();if($('chatMessages')&&state.currentChat&&(m.sender_id===state.currentChat||m.recipient_id===state.currentChat))loadChat();pollRausoNotifications(true)}})
  .subscribe();
}
async function refreshUser(){
 const {data:{user}}=await api.auth.getUser();
 state.user=user||null;rausoOwnBirthdate=null;rausoBirthdateReady=false;rausoMeetingDataReady=false;state.profilePhotoUrl=null;attachRausoRealtime();updateHeaderAccount();
 if(!user){
  state.profile=null;state.profilePhotoUrl=null;updateHeaderAccount();rausoInboxMessages=[];rausoUpdateMessageBadge();renderMessages();return
 }
 const {data,error}=await api.from('rauso_profiles').select('*').eq('id',user.id).maybeSingle();
 if(error)console.error(error);
 if(data)state.profile=data;
 else{
  const metadataName=String(user.user_metadata?.display_name||'').trim();
  if(rausoValidDisplayName(metadataName)){
   const {data:created,error:insertError}=await api.from('rauso_profiles')
    .insert({id:user.id,display_name:metadataName,city:'',bio:''}).select('*').single();
   if(insertError){console.warn('Profil:',insertError.message);state.profile=null}
   else state.profile=created;
  }else state.profile=null
 }
 await Promise.all([rausoLoadOwnBirthdate(),loadOutings(),loadSocial(),loadBookmarks(),loadMessageInbox()]);
 await pollRausoNotifications(false);
 subscribeRausoNotifications();renderProfile();updateHeaderAccount();
  if(rausoBirthdateReady&&!rausoOwnBirthdate){rausoRequestBirthdate();return}
 if(!state.profile||!rausoValidDisplayName(state.profile.display_name)){
  rausoCompleteProfile()
 }
}
const configV16 = config || {};
async function requireUserFor(feature){if(!state.user){showAuth();toast('Bitte für '+feature+' anmelden.');return false}return true}
async function openWishlist(id){const {data,error}=await api.from('wishlist_items').select('id,place_id,place_name,notes').eq('wishlist_id',id);modal('Wunschliste',`<div class="stack">${error?esc(error.message):(data||[]).map(x=>`<div class="surface">${esc(x.place_name)} · ${esc(x.notes||'')}</div>`).join('')||'Liste ist leer.'}<form id="addWish"><input id="wishPlace" required maxlength="120" placeholder="Ort / Ausflugsziel"><button class="primary-btn">Ort hinzufügen</button></form></div>`);$('addWish').onsubmit=async e=>{e.preventDefault();const {error}=await api.from('wishlist_items').insert({wishlist_id:id,place_name:$('wishPlace').value.trim(),added_by:myId()});if(error)toast(error.message);else openWishlist(id)}}

let rausoNotificationsChannel=null;
function subscribeRausoNotifications(){
 if(!state.user||!api)return;
 if(rausoNotificationsChannel){api.removeChannel(rausoNotificationsChannel);rausoNotificationsChannel=null}
 rausoNotificationsChannel=api.channel('rauso-notifications-'+myId())
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'rauso_notifications',filter:'user_id=eq.'+myId()},()=>{
   pollRausoNotifications(true);
 }).subscribe();
}
let rausoNotificationKnown=new Set();
let rausoNotificationInitialized=false;
let rausoNotificationPolling=false;
async function pollRausoNotifications(announce=true){
 if(!state.user||!api||rausoNotificationPolling||document.hidden)return;
 rausoNotificationPolling=true;
 try{
  const {data,error}=await api.from('rauso_notifications')
   .select('id,type,body,is_read,created_at,actor_id,outing_id')
   .eq('user_id',myId()).order('created_at',{ascending:false}).limit(80);
  if(error){console.warn('Notifications:',error.message);return}
  const notifications=data||[];
  const unread=notifications.filter(n=>!n.is_read);
  const badge=$('notificationCount');
  if(badge){badge.textContent=unread.length>99?'99+':String(unread.length);badge.classList.toggle('hidden',unread.length===0)}
  const newItems=unread.filter(n=>!rausoNotificationKnown.has(n.id));
  for(const n of notifications)rausoNotificationKnown.add(n.id);
  if(rausoNotificationInitialized && announce && newItems.length){
   toast('🔔 '+newItems[0].body+(newItems.length>1?' · +'+(newItems.length-1)+' weitere':''));
  }
  rausoNotificationInitialized=true;
  if(state.tab==='notifications')drawRausoNotifications(notifications);
 }catch(e){console.warn('Benachrichtigungen:',e.message)}
 finally{rausoNotificationPolling=false}
}
async function renderNotifications(){
 const el=$('notificationsContent');if(!el)return;
 if(!state.user){el.innerHTML='<div class="surface">Bitte anmelden, um Benachrichtigungen zu erhalten.</div>';return}
 const {data,error}=await api.from('rauso_notifications')
  .select('id,type,body,is_read,created_at,actor_id,outing_id')
  .eq('user_id',myId()).order('created_at',{ascending:false}).limit(80);
 if(error){el.innerHTML='<div class="status-banner">Benachrichtigungen nicht verfügbar: '+esc(error.message)+'</div>';return}
 drawRausoNotifications(data||[]);
}
function drawRausoNotifications(notifications){
 const el=$('notificationsContent');if(!el)return;
 el.innerHTML='<div class="surface"><h2>🔔 Benachrichtigungen</h2><p class="quiet">Neue Freundschaftsanfragen, Nachrichten, Zusagen und Absagen erscheinen hier während die App geöffnet ist. Benachrichtigungen bei geschlossener App erfordern zusätzlich einen Push-Dienst.</p><button id="readAllNotifs" class="outline-btn">Alle als gelesen markieren</button></div>'+
  (notifications.length?notifications.map(n=>{
   const action=n.type==='friend_request'&&n.actor_id?
     '<div class="notification-actions"><button class="small-btn join-btn" data-accept-request="'+esc(n.actor_id)+'">✓ Annehmen</button><button class="small-btn" data-decline-request="'+esc(n.actor_id)+'">✕ Ablehnen</button></div>':'';
   return '<article class="surface notification-item '+(n.is_read?'':'unread-notification')+'"><strong>'+esc(n.type==='friend_request'?'👥 Freundschaftsanfrage':n.type==='friend_accepted'?'👥 Freundschaft bestätigt':n.type==='friend_declined'?'👥 Anfrage abgelehnt':n.type==='message'?'✉ Neue Nachricht':n.type==='rsvp'?'📅 Veranstaltung':'🔔 Mitteilung')+'</strong>'+
    '<p>'+esc(n.body)+'</p><small>'+esc(fmt(n.created_at))+'</small>'+action+
    (n.is_read?'':'<button class="small-btn" data-notif-read="'+esc(n.id)+'">Gelesen</button>')+
    '</article>';
  }).join(''):'<div class="empty">Noch keine Mitteilungen.</div>');
 el.querySelectorAll('[data-accept-request]').forEach(b=>b.onclick=async()=>{
  await acceptContact(b.dataset.acceptRequest);await renderNotifications();await pollRausoNotifications(false)
 });
 el.querySelectorAll('[data-decline-request]').forEach(b=>b.onclick=async()=>{
  await declineContact(b.dataset.declineRequest);await renderNotifications();await pollRausoNotifications(false)
 });
 el.querySelectorAll('[data-notif-read]').forEach(b=>b.onclick=async()=>{
  const {error}=await api.from('rauso_notifications').update({is_read:true}).eq('id',b.dataset.notifRead).eq('user_id',myId());
  if(error)toast(error.message);else{await renderNotifications();await pollRausoNotifications(false)}
 });
 const all=$('readAllNotifs');if(all)all.onclick=async()=>{
  const {error}=await api.from('rauso_notifications').update({is_read:true}).eq('user_id',myId()).eq('is_read',false);
  if(error)toast(error.message);else{await renderNotifications();await pollRausoNotifications(false)}
 };
}
setInterval(()=>{if(!document.hidden&&state.user)pollRausoNotifications(true)},7500);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.user)pollRausoNotifications(false)});
async function renderShows(){const el=$('showsContent');el.innerHTML=`<div class="surface stack"><h2>Verlässliche Veranstaltungstermine</h2><p>Derzeit kein lizenzierter Datenlieferant konfiguriert. Es werden ausdrücklich keine erfundenen Filmzeiten, Tickets oder freien Plätze angezeigt.</p><button id="showPlaceSearch" class="outline-btn">🎬 Kinos in meiner Region finden</button><button id="showEvents" class="outline-btn">Offizielle Veranstaltungsseiten öffnen</button></div>`;$('showPlaceSearch').onclick=()=>{switchTab('discover');document.querySelector('[data-cat="kino"]').click()};$('showEvents').onclick=()=>window.open('https://www.wien.info/de/aktuell/veranstaltungen','_blank','noopener')}
async function renderAdmin(){
 const zone=$('adminContent');if(!zone)return;
 if(!state.user){zone.innerHTML='<div class="surface">Bitte anmelden.</div>';return}
 const {data:role,error:roleError}=await api.from('rauso_roles').select('role')
  .eq('user_id',myId()).maybeSingle();
 if(roleError||!role){
  zone.innerHTML='<div class="surface">Nur berechtigte Moderatoren können Fotos freigeben. Hochgeladene Bilder bleiben bis zur Moderation privat.</div>';
  return
 }
 const {data:pending,error}=await api.rpc('rauso_pending_photo_review');
 if(error){zone.innerHTML='<div class="surface">'+esc(error.message)+'</div>';return}
 const images=await Promise.all((pending||[]).map(async row=>{
  const {data:signed}=await api.storage.from('profile-photos').createSignedUrl(row.storage_path,600);
  return {...row,url:signed?.signedUrl||''}
 }));
 zone.innerHTML='<div class="surface"><h2>Foto-Moderation</h2>'+
  '<p>RAUSO erlaubt nur vollständig bekleidete Personen: keine Bikinis, Badebekleidung, Unterwäsche oder Nacktheit. Bei Zweifel ablehnen.</p>'+
  '<p class="quiet">Vor einer manuellen Freigabe sind neue Bilder ausschließlich privat.</p></div>'+
  (images.map(row=>'<article class="surface moderation-photo">'+
    (row.url?'<img src="'+esc(row.url)+'" alt="Foto zur manuellen Prüfung">':'<p>Bild nicht verfügbar.</p>')+
    '<div class="photo-controls"><button class="small-btn" data-review-approve="'+esc(row.id)+'">✓ Bekleidet · Freigeben</button>'+
    '<button class="small-btn" data-review-reject="'+esc(row.id)+'">✕ Ablehnen</button></div></article>'
  ).join('')||'<div class="empty">Keine Fotos zur Prüfung.</div>');
 for(const decision of ['approved','rejected']){
  const attr=decision==='approved'?'reviewApprove':'reviewReject';
  zone.querySelectorAll('[data-review-'+(decision==='approved'?'approve':'reject')+']').forEach(button=>button.onclick=async()=>{
   if(decision==='approved'&&!confirm('Foto geprüft: vollständig bekleidet, keine Bikini-/Bade-/Unterwäsche und keine Nacktheit?'))return;
   const {error:err}=await api.rpc('rauso_review_photo',{photo:button.dataset[attr],decision});
   if(err)toast(err.message);else{toast(decision==='approved'?'Foto freigegeben.':'Foto abgelehnt.');renderAdmin()}
  })
 }
}

async function addProfilePhoto(file){
 if(!state.user){showAuth();return}
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024||file.size===0){
  toast('Nur JPG, PNG oder WebP bis 5 MB.');return
 }
 if(!confirm('Nur Fotos vollständig bekleideter Personen sind erlaubt. Keine Bikini-, Badebekleidungs-, Unterwäsche- oder Nacktbilder. Das Foto bleibt bis zur Moderation privat. Entspricht dein Foto dieser Regel?'))return;
 const path=myId()+'/'+crypto.randomUUID()+'.'+(file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg');
 try{
  const {data:existing,error:readError}=await api.from('profile_photos').select('id').eq('user_id',myId());
  if(readError)throw readError;
  if((existing||[]).length>=6)throw Error('Maximal sechs Profilfotos.');
  const {error:uploadError}=await api.storage.from('profile-photos').upload(path,file,{contentType:file.type,upsert:false});
  if(uploadError)throw uploadError;
  const {error}=await api.from('profile_photos').insert({
   user_id:myId(),storage_path:path,is_primary:(existing||[]).length===0,is_public:false
  });
  if(error){await api.storage.from('profile-photos').remove([path]);throw error}
  toast('Foto gespeichert – es bleibt bis zur Prüfung privat.');
  await renderProfilePhotos()
 }catch(err){toast('Foto konnte nicht gespeichert werden: '+(err.message||String(err)))}
}
async function makePrimaryProfilePhoto(row){
 if(!state.user||!row)return;
 const {error:e1}=await api.from('profile_photos').update({is_primary:false})
  .eq('user_id',myId()).eq('is_primary',true);
 if(e1){toast(e1.message);return}
 const {error:e2}=await api.from('profile_photos').update({is_primary:true})
  .eq('user_id',myId()).eq('id',row.id);
 if(e2){toast(e2.message);return}
 await renderProfilePhotos();
}
async function renderProfilePhotos(){
 const zone=$('myPhotos');if(!zone)return;
 if(!state.user){zone.innerHTML='<p class="quiet">Für Profilfotos bitte anmelden.</p>';return}
 const {data,error}=await api.from('profile_photos').select('id,storage_path,is_primary,is_public,moderation_status,created_at')
  .eq('user_id',myId()).order('created_at',{ascending:false});
 if(error){zone.innerHTML='<p class="status-banner">'+esc(error.message)+'</p>';return}
 const rows=await Promise.all((data||[]).map(async row=>{
  const {data:signed,error:err}=await api.storage.from('profile-photos').createSignedUrl(row.storage_path,1800);
  return Object.assign({},row,{url:err?'':signed?.signedUrl||''})
 }));
 const first=rows.find(x=>x.is_primary)||rows[0];
 state.profilePhotoUrl=first?.url||null;
 updateHeaderAccount();
 const header=document.querySelector('#profileContent .profile-row .avatar');
 if(header&&state.profilePhotoUrl){
  header.innerHTML='<img src="'+esc(state.profilePhotoUrl)+'" alt="Profilbild">';
  header.classList.add('profile-avatar-photo')
 }
 let html='<div class="photo-row">';
 for(const row of rows){
  html+='<div class="photo-tile"><div class="photo-thumb">'+
   (row.url?'<img loading="lazy" src="'+esc(row.url)+'" alt="Profilfoto">':'<span>Bild nicht verfügbar</span>')+
   (row.is_primary?'<span class="profile-primary-label">★ Hauptbild</span>':'')+
   '</div><p class="photo-review-status">'+(row.moderation_status==='approved'?'✓ Geprüft':row.moderation_status==='rejected'?'✕ Abgelehnt':'⏳ In Prüfung')+'</p><div class="photo-controls">'+
   '<button class="small-btn" data-main-photo="'+esc(row.id)+'" '+(row.is_primary?'disabled':'')+'>★ Hauptbild</button>'+
   '<button class="small-btn '+(row.is_public?'photo-public':'')+'" data-public-photo="'+esc(row.id)+'" '+(row.moderation_status!=='approved'?'disabled':'')+'>'+(row.is_public?'🌐 Sichtbar':row.moderation_status==='approved'?'🔒 Privat':'⏳ Noch nicht geprüft')+'</button>'+
   '<button class="small-btn" data-delete-photo="'+esc(row.id)+'">Entfernen</button></div></div>'
 }
 html+='</div><label class="outline-btn photo-upload-btn"><span class="rauso-plus-mark" aria-hidden="true"></span> Foto hinzufügen'+
  '<input id="photoPicker" type="file" accept="image/jpeg,image/png,image/webp" hidden '+(rows.length>=6?'disabled':'')+'></label>'+
  '<p class="quiet">Nur vollständig bekleidete Personen. Keine Bikini-, Badebekleidungs-, Unterwäsche- oder Nacktbilder. Neue Fotos sind privat und werden erst nach Moderation und deiner Freigabe sichtbar. Maximal 6 Fotos bis 5 MB.</p>';
 zone.innerHTML=html;
 const picker=$('photoPicker');if(picker)picker.onchange=e=>{const file=e.target.files?.[0];if(file)addProfilePhoto(file)};
 zone.querySelectorAll('[data-main-photo]').forEach(btn=>btn.onclick=()=>makePrimaryProfilePhoto(rows.find(x=>x.id===btn.dataset.mainPhoto)));
 zone.querySelectorAll('[data-public-photo]').forEach(btn=>btn.onclick=async()=>{
  const row=rows.find(x=>x.id===btn.dataset.publicPhoto);if(!row)return;
  const {error:err}=await api.from('profile_photos').update({is_public:!row.is_public})
   .eq('user_id',myId()).eq('id',row.id);
  if(err)toast(err.message);
  else{toast(row.is_public?'Bild wieder privat.':'Bild für angemeldete Mitglieder freigegeben.');await renderProfilePhotos()}
 });
 zone.querySelectorAll('[data-delete-photo]').forEach(btn=>btn.onclick=async()=>{
  const row=rows.find(x=>x.id===btn.dataset.deletePhoto);if(!row||!confirm('Foto dauerhaft löschen?'))return;
  const {error:err}=await api.storage.from('profile-photos').remove([row.storage_path]);
  if(err){toast(err.message);return}
  const {error:delErr}=await api.from('profile_photos').delete().eq('user_id',myId()).eq('id',row.id);
  if(delErr){toast(delErr.message);return}
  if(row.is_primary){const next=rows.find(x=>x.id!==row.id);if(next)await makePrimaryProfilePhoto(next)}
  await renderProfilePhotos();toast('Foto gelöscht.')
 })
}
function injectProfileExtras(){const el=$('profileContent');if(!el)return;if(!$('myPhotos')){const wrap=document.createElement('div');wrap.className='surface stack';wrap.innerHTML='<h2>Meine Profilfotos</h2><p>Bis zu 5 MB pro Bild. Fotos können jederzeit gelöscht werden.</p><div id="myPhotos"></div>';el.prepend(wrap)}if(state.user && !$('notificationAccess')){const b=document.createElement('button');b.id='notificationAccess';b.className='outline-btn';b.textContent='🔔 Meine Benachrichtigungen';b.onclick=()=>switchTab('notifications');el.appendChild(b)}if(state.user && !$('adminAccess')){const b=document.createElement('button');b.id='adminAccess';b.className='outline-btn';b.textContent='⚙ Verwaltung (nur Berechtigte)';b.onclick=()=>switchTab('admin');el.appendChild(b)}renderProfilePhotos()}


// RAUSO 2.0: persistent appearance, compact navigation, personalized discovery and offline state.
const APP_VERSION='2.8.2';
const UI_PREF='rauso-ui-2';
const readPref=()=>{try{return JSON.parse(localStorage.getItem(UI_PREF)||'{}')}catch{return {}}};
const uiPref={theme:'orange',autoTheme:false,start:'discover',...readPref()};
const saveUi=()=>{try{localStorage.setItem(UI_PREF,JSON.stringify(uiPref))}catch(e){console.warn('Settings storage unavailable',e)}};
const themes={light:'Hell · Natürlich',purple:'Lila Neon',orange:'Orange Neon',rainbow:'Regenbogen',carbon:'Carbon Schwarz'};
function setAppearance(){let t=uiPref.theme;if(uiPref.autoTheme){const hour=new Date().getHours();t=hour>=19||hour<7?'carbon':'light'}document.documentElement.dataset.rausoTheme=t;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',t==='light'?'#f8f7f3':'#09090a');const lab=$('themePickerLabel');if(lab)lab.textContent=themes[t]||'Neon Orange'}
function openAppearance(){
const options=Object.entries(themes).map(([v,t])=>`<label class="theme-line"><input type="radio" name="theme" value="${v}" ${uiPref.theme===v?'checked':''}><span class="theme-swatch swatch-${v}"></span><strong>${t}</strong></label>`).join('');
modal('Design & Startseite',`<div class="stack"><p class="quiet">Wähle ein Design. Die Einstellung wird auf diesem Gerät gespeichert.</p>${options}<label class="theme-line"><input type="checkbox" id="uiAuto" ${uiPref.autoTheme?'checked':''}><strong>Automatisch: tagsüber hell, abends dunkel</strong></label><label class="input-group"><span>Startbereich</span><select id="uiStart"><option value="discover">Entdecken</option><option value="events">Treffen</option><option value="family">Familie</option><option value="myMeetings">Meine Treffen</option></select></label><button class="primary-btn" id="uiSave">Speichern</button><div class="rauso-version-info">RAUSO v${APP_VERSION}</div></div>`);
$('uiStart').value=uiPref.start;
$('uiSave').onclick=()=>{uiPref.theme=document.querySelector('input[name="theme"]:checked').value;uiPref.autoTheme=$('uiAuto').checked;uiPref.start=$('uiStart').value;saveUi();setAppearance();closeModal();toast('Einstellungen gespeichert.')};
}
function updateHeaderAccount(){
 const logged=!!state.user;
 const label=$('accountShortcutLabel'),icon=$('accountShortcutIcon'),btn=$('accountShortcut');
 const name=logged?String(state.profile?.display_name||'Profil').trim():'Anmelden';
 if(label)label.textContent=name;
 if(icon){if(logged&&state.profilePhotoUrl){icon.innerHTML='<img class="rauso-header-photo" src="'+esc(state.profilePhotoUrl)+'" alt="">';}else icon.textContent=logged?name.slice(0,1).toUpperCase():'↪';}
 if(btn){btn.setAttribute('aria-label',logged?'Profil von '+name+' öffnen':'Anmelden');btn.title=logged?name:'Anmelden';}
}
function openSettings(){
 modal('⚙ Einstellungen', '<div class="stack"><p class="quiet">Passe das Aussehen und die Startseite von RAUSO an.</p>'+
 '<button class="outline-btn" id="settingDesign">🎨 Design auswählen</button>'+
 '<button class="outline-btn" id="settingStart">⌂ Startseite & Anzeige</button>'+
 '<p class="quiet">Deine Auswahl bleibt auf diesem Smartphone gespeichert.</p></div>');
 $('settingDesign').onclick=openAppearance;
 $('settingStart').onclick=openAppearance;
}
function openReadiness(){
const configured=!!(window.ERLEBEN_CONFIG?.supabaseUrl&&window.ERLEBEN_CONFIG?.supabasePublishableKey);
const checks=[['Android-Version','2.1.0 · API 36'],['Designs','5 Designs verfügbar'],['Online-Backend',configured?'Konfiguriert – Funktionstest nötig':'Noch nicht verbunden'],['Benutzeranmeldung',configured?'Anmeldung testen':'Nicht verfügbar'],['Treffen und Nachrichten',configured?'Mehrbenutzertest erforderlich':'Nur Vorschau'],['Push-Mitteilungen','Firebase noch nicht eingerichtet'],['Kinoprogramme','Lizenzierte Quelle fehlt'],['Play Store','Signierter Release und Datenschutzprüfung fehlen']];
modal('Technischer Status',`<div class="stack"><p class="quiet">Die Angaben zeigen den Einrichtungsstand, nicht eine bestandene Sicherheitsprüfung.</p>${checks.map(([a,b])=>`<div class="surface"><strong>${esc(a)}</strong><p class="quiet">${esc(b)}</p></div>`).join('')}<div class="rauso-version-info">RAUSO v${APP_VERSION}</div></div>`);
}
function addReadiness(){const el=$('profileContent');if(!el||$('readinessBtn'))return;const b=document.createElement('button');b.id='readinessBtn';b.className='outline-btn';b.textContent='ⓘ Technischer Status';b.onclick=openReadiness;el.appendChild(b)}

function addMoreLink(){
 const el=$('profileContent');if(!el||$('rausoMore'))return;
 const b=document.createElement('button');b.id='rausoMore';b.className='outline-btn';
 b.textContent='☰ Weitere Bereiche: Programm & Hinweise';
 b.onclick=()=> {
  const pages=[['🎟 Programm','shows'],
   ['🔔 Benachrichtigungen','notifications'],['♡ Dating (ab 18)','dating'],
   ['⚙ Verwaltung (Berechtigung erforderlich)','admin']];
  modal('Weitere Bereiche','<div class="stack">'+pages.map(([label,tab])=>
   '<button class="outline-btn" data-more-tab="'+esc(tab)+'">'+esc(label)+'</button>').join('')+'</div>');
  document.querySelectorAll('[data-more-tab]').forEach(x=>x.onclick=()=>{closeModal();switchTab(x.dataset.moreTab)});
 };
 el.appendChild(b)
}
function addNavMore(){
 const nav=document.querySelector('.bottomnav');if(!nav)return;
 for(const tab of ['shows','notifications'])nav.querySelector('[data-tab="'+tab+'"]')?.classList.add('hidden');
 nav.querySelector('#rausoMore')?.remove();
 addMoreLink()
}
function addOfflineState(){if($('networkStatus'))return;const n=document.createElement('div');n.id='networkStatus';n.setAttribute('role','status');document.querySelector('main')?.prepend(n);const update=()=>{n.textContent=navigator.onLine?'':'Offline: Gespeicherte Daten sind sichtbar; aktuelle Orte und Zusagen benötigen Internet.';n.hidden=navigator.onLine};window.addEventListener('online',update);window.addEventListener('offline',update);update()}

function saveDiscoverySettings(){
 try{localStorage.setItem('rauso-discovery-settings',JSON.stringify({region:state.region,radius:state.radius,category:state.cat}))}catch{}
}
function restoreDiscoverySettings(){
 let saved={};try{saved=JSON.parse(localStorage.getItem('rauso-discovery-settings')||'{}')||{}}catch{}
 const region=$('regionSelect'),radius=$('radiusSelect');
 if(region&&[...region.options].some(o=>o.value===saved.region)){region.value=saved.region;state.region=saved.region}
 if(radius&&[...radius.options].some(o=>Number(o.value)===Number(saved.radius))){radius.value=String(saved.radius);state.radius=Number(saved.radius)}
 if(cats[saved.category]){state.cat=saved.category;document.querySelectorAll('[data-cat]').forEach(b=>b.classList.toggle('selected',b.dataset.cat===state.cat))}const categoryDropdown=$('categorySelect');if(categoryDropdown)categoryDropdown.value=state.cat;
}

function init(){restoreDiscoverySettings();if($('distanceLocation'))$('distanceLocation').onclick=rausoRequestLocation;if($('notificationBell'))$('notificationBell').onclick=()=>state.user?switchTab('notifications'):showAuth();document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));$('accountShortcut').onclick=()=>state.user?switchTab('profile'):showAuth();$('headerSettings').onclick=openSettings;updateHeaderAccount();$('heroPlan').onclick=()=>createOuting();$('createEvent').onclick=()=>createOuting();$('createPrivate').onclick=()=>createOuting(null,{private:true});$('familyCreate').onclick=()=>createOuting(null,{family:true});$('familyExplore').onclick=()=>{switchTab('discover');const btn=document.querySelector('[data-cat="familie"]');btn.click()};document.querySelectorAll('[data-event-mode]').forEach(b=>b.onclick=()=>{state.eventMode=b.dataset.eventMode;renderEvents()});$('refreshEvents').onclick=()=>demoMode()?renderEvents():loadOutings();document.querySelectorAll('[data-meeting-filter]').forEach(b=>b.onclick=()=>{state.meetFilter=b.dataset.meetingFilter;renderMyMeetings()});$('regionSelect').onchange=e=>{state.region=e.target.value;saveDiscoverySettings();state.places=[];state.placesLive=false;renderPlaces();queryPlaces()};$('radiusSelect').onchange=e=>{state.radius=+e.target.value;saveDiscoverySettings();state.places=[];state.placesLive=false;renderPlaces();queryPlaces()};$('placeSearch').oninput=e=>{state.query=e.target.value;renderPlaces()};$('clearSearch').onclick=()=>{$('placeSearch').value='';state.query='';renderPlaces()};$('mapToggle').onclick=showMap;$('categoryStrip').querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{state.cat=b.dataset.cat;saveDiscoverySettings();document.querySelectorAll('[data-cat]').forEach(x=>x.classList.toggle('selected',x===b));if($('categorySelect'))$('categorySelect').value=state.cat;state.places=[];state.placesLive=false;renderPlaces();queryPlaces()});
 $('categorySelect').onchange=e=>{document.querySelector('[data-cat="'+e.target.value+'"]')?.click()};
 $('loadPlaces').onclick=queryPlaces;state.places=[];renderPlaces();renderEvents();renderFamily();renderMyMeetings();renderMessages();loadMessageInbox();renderProfile();injectProfileExtras();queryPlaces();if(hasBackend){api.auth.onAuthStateChange((event)=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT')setTimeout(()=>refreshUser().then(()=>{updateOnlinePresence();switchTab(state.tab)}),0)});refreshUser().then(()=>switchTab(state.tab))}
}
async function updateOnlinePresence(){
 if(!state.user||!navigator.onLine)return;
 try{await api.from('rauso_presence').upsert({user_id:myId(),last_seen_at:new Date().toISOString()},{onConflict:'user_id'})}catch{}
}
setInterval(()=>{if(!document.hidden)updateOnlinePresence()},30000);
setInterval(()=>{if(!document.hidden&&state.user)loadMessageInbox()},15000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateOnlinePresence()});
document.addEventListener('DOMContentLoaded',()=>{
 if(!uiPref.referenceDesign24){uiPref.theme='orange';uiPref.autoTheme=false;uiPref.referenceDesign24=true;saveUi()}
 setAppearance();init();addNavMore();addOfflineState();addReadiness();
 if($('headerFriends'))$('headerFriends').onclick=openFriendsPanel;
 if($('headerMessages'))$('headerMessages').onclick=()=>switchTab('messages');

 if($('heroGoing'))$('heroGoing').onclick=()=>{state.meetFilter='going';switchTab('myMeetings')};
 if($('heroOrganized'))$('heroOrganized').onclick=()=>{state.meetFilter='organized';switchTab('myMeetings')};
 if(uiPref.start!=='discover')switchTab(uiPref.start)
});
})();
