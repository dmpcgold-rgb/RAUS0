'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
const js=fs.readFileSync('app/src/main/assets/app.js','utf8');
const css=fs.readFileSync('app/src/main/assets/style.css','utf8');
const java=fs.readFileSync('app/src/main/java/at/rauso/app/MainActivity.java','utf8');
for(const id of ['headerFriends','headerMessages','headerMessageCount','heroBookmarks','heroGoing','heroOrganized','accountShortcut','messagesContent'])assert(html.includes('id="'+id+'"'),'Missing '+id);
for(const id of ['headerBookmarks','heroDiscover','heroConnect','heroExperience','wishlistShortcut'])assert(!html.includes('id="'+id+'"'),'Legacy '+id);
assert(html.includes('data-cat="anime"')&&html.includes('value="anime"'));
assert(js.includes("anime:{icon:'★'")&&js.includes('openFriendsPanel')&&js.includes('data-featured-create'));
assert(js.includes("state.meetFilter='going'")&&js.includes("state.meetFilter='organized'"));
assert(js.includes('RAUSOShare')&&java.includes('Intent.createChooser'));
assert(js.includes("privateMode?'Privater Treffpunkt"));
assert(!html.includes('📍')&&!js.includes('📍'));
for(const t of ['orange','purple','carbon','rainbow','light'])assert(css.includes('html[data-rauso-theme="'+t+'"]{--rauso-glow:'));
console.log('RAUSO category, UI, navigation, native share and theme checks passed');

assert(html.indexOf('id="headerFriends"')<html.indexOf('id="headerMessages"')&&html.indexOf('id="headerMessages"')<html.indexOf('id="notificationBell"'),'Messages must be directly beside Friends');
assert(js.includes("$('headerMessages').onclick=()=>switchTab('messages')"),'Header messages must open messages tab');
assert(js.includes("headerBadge.classList.toggle('hidden',num===0)"),'Header unread badge must update');
assert(css.includes('#headerMessages.active')&&css.includes('@media(max-width:355px)'), 'Message button must have responsive styles');

/* RAUSO 2.7.3: Round photo categories, explicit website and create controls, profile clean-up. */
for(const category of ["thermen","restaurants","kino","ausfluege","familie","bowling","spielspass","natur","kultur","uebernachten","sport","anime"]){
 assert(html.includes('data-cat="'+category+'"'),'Missing category: '+category);
 assert(css.includes('#categoryStrip .chip[data-cat="'+category+'"]'),'Missing category color/photo: '+category);
}
assert(html.includes('data-cat="thermen">♨ THERMEN')&&html.includes('data-cat="restaurants">🍽 RESTAURANTS'),'Uppercase category names');
assert(js.includes('data-featured-site')&&js.includes('data-place-site'),'Per-place website buttons missing');
assert(js.includes("rausoHasVenueWebsite(p)?'WEBSEITE ↗':'KARTE ↗'"),'Website/map fallback missing');
assert(js.includes('data-with=')&&js.includes('data-featured-create='),'Create shortcuts missing');
assert(!js.includes('☆ Unternehmung starten'),'Legacy full text still visible');
assert(!js.includes('function addAppearanceLink'),'Profile settings tile not removed');
assert(css.includes('border-radius:50%!important')&&css.includes('var(--category-image)'),'Circular photo categories missing');
