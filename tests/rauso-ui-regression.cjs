'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
const js=fs.readFileSync('app/src/main/assets/app.js','utf8');
const css=fs.readFileSync('app/src/main/assets/style.css','utf8');
const java=fs.readFileSync('app/src/main/java/at/rauso/app/MainActivity.java','utf8');
for(const id of ['headerFriends','headerMessages','headerMessageCount','bookmarkNavCount','heroGoing','heroOrganized','accountShortcut','messagesContent'])assert(html.includes('id="'+id+'"'),'Missing '+id);
for(const id of ['headerBookmarks','heroDiscover','heroConnect','heroExperience','wishlistShortcut'])assert(!html.includes('id="'+id+'"'),'Legacy '+id);
assert(html.includes('data-cat="anime"')&&html.includes('value="anime"'));
assert(js.includes("anime:{icon:'★'")&&js.includes('openFriendsPanel')&&js.includes('data-featured-create'));
assert(js.includes("state.meetFilter='going'")&&js.includes("state.meetFilter='organized'"));
assert(js.includes('RAUSOShare')&&java.includes('Intent.createChooser'));
assert(js.includes("privateMode?'Privater Treffpunkt"));
assert(!html.includes('📍')&&!js.includes('📍'));
for(const t of ['orange','purple','carbon','rainbow','light'])assert(css.includes('html[data-rauso-theme="'+t+'"]{--rauso-glow:'));
console.log('RAUSO category, UI, navigation, native share and theme checks passed');

assert(!html.slice(html.indexOf('<header'),html.indexOf('</header>')).includes('id="headerMessages"'),'Messages must not appear in header');
assert(html.includes('id="incognitoToggle"')&&html.includes('id="heroBookmarksCircle"'),'Privacy icon and bookmark circle required');
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
assert(css.includes('/* RAUSO 2.9.3: neon category circles and round meeting shortcuts */')&&css.includes('color:var(--category-color)!important')&&css.includes('border-radius:50%!important'),'Neon category circles missing');

/* RAUSO 2.7.4: one main navigation Merkliste, messages only in the header. */
const nav=html.slice(html.indexOf('<nav class="bottomnav"'),html.indexOf('</nav>')+6);
assert((nav.match(/data-tab="collections"/g)||[]).length===1,'Bottom nav must contain Merkliste once');
assert(nav.includes('data-tab="messages"')&&!nav.includes('data-tab="myMeetings"'),'Messages must replace Meine Treffen in bottom navigation');
assert(nav.indexOf('data-tab="messages"')<nav.indexOf('data-tab="collections"')&&!nav.includes('data-tab="dating"'),'Nachrichten beside Merkliste; Dating removed');
assert(!html.includes('id="heroBookmarks"'),'Hero must not duplicate Merkliste');
assert(!js.includes('id="mySaved"')&&!js.includes("['🧡 Meine Merkliste','collections']"),'Profile and More must not duplicate Merkliste');
assert(!js.includes("for(const tab of ['collections','shows','notifications'])"),'Merkliste must never be hidden in nav');
assert(js.includes("const badge=$('bookmarkNavCount')"),'Merkliste badge must stay updated');
assert(css.includes('.bottomnav .nav-item[data-tab="collections"]{display:grid!important'),'Merkliste must be visible in every theme');

/* RAUSO 2.8.2: immutable birthday, creator-selected age range and RSVP gate. */
assert(js.includes("id=\"signupBirth\"")&&js.includes("birth_date:birth"),'Birthday must be required at registration');
assert(js.includes('rausoRequestBirthdate'),'Legacy birthdate prompt must be available');
assert(js.includes('function rausoAgeAtEvent(')&&js.includes("timeZone:'Europe/Vienna'"),'Age must be checked on event date');
assert(js.includes('id="oMinAge"')&&js.includes('id="oMaxAge"'),'Event age range inputs missing');
assert(js.includes('min_age:val.min_age,max_age:val.max_age'),'Event age limits must be persisted');
assert(js.includes('rausoEventAgeEligibility(requested)'),'RSVP must check age');
assert(css.includes('.rauso-age-fields')&&css.includes('.rauso-age-note'),'Age input styles missing');

/* RAUSO 2.9: updated icon and discovery layout checks. */
assert(html.includes('id="heroCreate"')&&html.includes('id="eventDateFilter"'),'Missing discover controls');
for(const klass of ['rauso-created-exclamation','rauso-nav-star','rauso-nav-family'])assert(html.includes(klass),'Missing navigation symbol '+klass);
assert(css.includes('/* RAUSO 2.9: screenshot-inspired compact discovery')&&css.includes('#headerMessages>span:first-child'),'Missing 2.9 UI styles');
assert(js.includes('rausoMatchesPrice')&&js.includes('rausoShowAllHighlights'),'Price-filter and highlights integration missing');

/* RAUSO 2.9.1: new navigation and shortcuts. */
for(const cls of ['rauso-nav-star','rauso-nav-family','rauso-created-exclamation','rauso-neon-envelope','rauso-hero-shortcuts']){
 assert(html.includes(cls),'Missing visual token '+cls);
}
assert(js.includes("const APP_VERSION='3.0.4'"),'JS version should be 2.9.2');
assert(js.includes("destination==='nearby'")&&js.includes("rausoOpenMeetingsFromHero"),'Hero shortcuts must navigate');
assert(css.includes('background-image:none!important;'),'Pill category backgrounds must stay image-free');

/* Organizer confirmation: manual choice, pending state, participant notifications. */
assert(html.includes('data-meeting-filter="pending"'));
for(const key of ['oRequiresApproval','rausoPendingReviewHtml','rausoReviewRequest','pendingRequests','requires_approval:val.requires_approval'])assert(js.includes(key),'Missing approval flow '+key);
assert(css.includes('.rauso-approval-row')&&css.includes('.join-btn.is-pending'));
/* RAUSO 2.9.5: restore the previous design with circular category and meeting buttons. */
assert(css.includes('RAUSO 2.9.3: neon category circles and round meeting shortcuts'));
assert(!css.includes('RAUSO 2.9.4: universal black surface'));
assert(css.includes('/* RAUSO 2.9.5: rounded green RSVP shortcut retained across all display modes */'));
assert(html.includes('id="heroGoing"')&&html.includes('id="heroOrganized"'));
assert(css.includes('aspect-ratio:1/1!important;border-radius:50%!important'));

assert(html.includes('✓ Zugesagte Treffen')&&html.includes('id="heroOrganized"')&&html.includes('id="heroBookmarksCircle"'),'Three home shortcuts');
assert(css.includes('RAUSO 3.0.1: symmetric orange header')&&css.includes('Equal-sized, symmetrical green/orange/black circles'),'Layout and colors');
assert(!html.includes('INKOGNITO</small>')&&html.includes('rauso-incognito-icon'),'Icon-only incognito');
assert(!nav.includes('meetingNavCount')&&html.includes('id="meetingNavCount"'),'Meeting-change badge belongs to home');

assert(css.includes('RAUSO 3.0.2: precisely centered circular header controls.'));
assert(html.includes('id="heroBookmarksCircle"') && html.includes('id="headerMessages"') && !html.includes('data-tab="myMeetings"'));

for(const period of ['today','tomorrow','weekend','next-week','next-month'])assert(html.includes('data-quick-meeting-period="'+period+'"'),'Missing period '+period);
assert(html.includes('id="heroMeetingCategory"')&&html.includes('data-rauso-hero-go="nearby"'));
assert(!html.includes('> Erleben</button>')&&!html.includes('> Verbinden</button>'));

/* RAUSO 3.0.4: meetup-counter and colorful filter regression */
assert(html.includes('class="rauso-quick-count"')&&js.includes('rausoQuickMeetupCount'));
assert(js.includes('rausoSyncFilterTextColors')&&css.includes('RAUSO 3.0.4: colored text and live event counts'));
