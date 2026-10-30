// Lightweight regression checks for RAUSO's native bridge and mobile UI.
// Does not replace manual Samsung/WebView tests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const read = path => fs.readFileSync(path,'utf8');
const html=read('app/src/main/assets/index.html');
const js=read('app/src/main/assets/app.js');
const css=read('app/src/main/assets/style.css');
const java=read('app/src/main/java/at/rauso/app/MainActivity.java');
const gradle=read('app/build.gradle');
new vm.Script(js,{filename:'app.js'}); // Validate all JavaScript syntax.
const header=html.match(/<header[\s\S]*?<\/header>/)?.[0]||'';
const footer=html.match(/<nav class="bottomnav"[\s\S]*?<\/nav>/)?.[0]||'';
assert.match(header,/id="heroPlan"[^>]*><span class="rauso-plus-mark"[^>]*><\/span><\/button>[\s\S]*id="headerFriends"/);
assert(!header.includes('id="headerMessages"'),"Messages removed from header");
assert(footer.includes('data-tab="messages"')&&!footer.includes('data-tab="myMeetings"'),"Bottom navigation now contains Nachrichten instead of Meine Treffen");
assert.equal((html.match(/id="heroPlan"/g)||[]).length,1);
assert.match(header,/id="headerSettings"/);
assert.match(header,/id="accountShortcut"/);
assert.match(footer,/data-tab="collections"[\s\S]*<small>Merkliste<\/small>/);
assert(!footer.includes('id="datingNav"'),'Dating must not appear in navigation');
assert.match(html,/data-cat="anime"/);
for(const key of ['thermen','restaurants','kino','anime','sport']){
 assert.match(css,new RegExp('#categoryStrip \\.chip\\[data-cat="'+key+'"\\]'));
}
assert.match(css,/html\[data-rauso-theme="orange"\] #categoryStrip \.chip\.selected/);
assert.match(css,/border-radius:50%!important/);
assert.match(js,/function shareOuting/);
for(const target of ['shareWhatsApp','shareInstagram','shareFacebook','shareOther','shareCopy']){
 assert.match(js,new RegExp(target));
}
assert.match(js,/function rausoOpenBookmark/);
assert.match(js,/id="savedPlaceSite"/);
assert.match(js,/id="savedPlaceCreate"/);
assert.match(js,/Orange Herzen/);
assert.match(js,/const APP_VERSION='3\.0\.3'/);
assert.match(gradle,/versionCode 54; versionName '3\.0\.3'/);
for(const target of ['com.whatsapp','com.instagram.android','com.facebook.katana']){
 assert.ok(java.includes(target),'Missing Android share target '+target);
}
assert.match(java,/shouldOverrideUrlLoading/);
assert.match(java,/getInsets\(/);
assert.match(java,/window\.RAUSO_BACK/);
console.log('RAUSO 2.8 UI/JavaScript static regression checks passed. Samsung tests still required.');

assert(!html.includes('header-message-text'),'Header messages must be envelope only');
const nav=html.slice(html.indexOf('<nav class="bottomnav"'),html.indexOf('</nav>')+6);
assert(nav.indexOf('data-tab="shows"')<nav.indexOf('data-tab="family"') && nav.indexOf('data-tab="family"')<nav.indexOf('data-tab="notifications"'),'Family second from right');
assert(css.includes('--category-fill:')&&css.includes('background:var(--category-fill'),'Dark category color fill missing');
assert(js.includes('rauso_outing_availability')&&js.includes('max_participants'),'Capacity UI missing');
assert(js.includes('rausoOwnBirthdate')&&js.includes('signupBirth')&&js.includes('rausoAdult()'),'Age onboarding and dating gate missing');
assert(js.includes('rauso-meeting-changes:')&&!js.includes("count+' bevorstehende zugesagte"),'Unread-only meeting changes missing');

/* RAUSO 2.9.0: screenshot-style discovery with actual controls. */
for(const id of ['heroCreate','eventDateFilter','eventClockFilter','incognitoToggle','headerMessages','heroBookmarksCircle'])assert(html.includes('id="'+id+'"'),'Missing '+id);
for(const nav of ['rauso-nav-star','rauso-nav-family','rauso-created-exclamation'])assert(html.includes(nav),'Missing nav symbol '+nav);
assert.match(css,/RAUSO 2\.9: screenshot-inspired compact discovery/);
assert.match(css,/\.rauso-place-link\[data-venue-category="thermen"\]/);
assert.match(css,/#headerMessages>span:first-child/);
assert(js.includes("$('eventDateFilter').onchange=")&&js.includes("$('eventClockFilter').onchange="));
assert.match(js,/\$\('heroCreate'\)\.onclick=/);
assert.match(js,/function rausoMatchesPrice/);

/* Screenshot reference UI: icons and shortcuts are implemented and functional. */
for(const cls of ['rauso-nav-star','rauso-nav-family','rauso-created-exclamation','rauso-neon-envelope','rauso-hero-shortcuts']){
 assert(html.includes(cls),'Screenshot UI missing class '+cls);
}
assert(js.includes("data-rauso-hero-go")&&js.includes("destination==='nearby'"),'Hero shortcuts must navigate');
assert(css.includes('RAUSO 2.9: screenshot-inspired compact discovery'),'Reference layout CSS missing');

/* RAUSO 2.9.2: approval actions and pending state. */
assert(html.includes('data-meeting-filter="pending"'));
assert(js.includes('id="oRequiresApproval"')&&js.includes('requires_approval:val.requires_approval'));
assert(js.includes('function rausoReviewRequest(')&&js.includes('function rausoPendingReviewHtml(')&&js.includes("actual==='pending'"));
assert(css.includes('.rauso-approval-panel')&&css.includes('.rauso-approve'));

assert.match(css,/RAUSO 2\.9\.5: rounded green RSVP shortcut/);
assert.ok(!css.includes('RAUSO 2.9.4: universal black surface'));
assert.ok(html.includes('id="heroGoing"')&&html.includes('id="heroOrganized"'));


/* RAUSO 2.9.6 event test linked */
for(const id of ['rausoEventTime','rausoEventCategory','rausoEventOpen','rausoEventAge','rausoEventReset'])assert(html.includes('id="'+id+'"'),'Missing event filter: '+id);
assert(js.includes('rausoEventMatchesFilters')&&js.includes('rausoAttendeePreview'),'Event discovery must be active');

/* RAUSO social discovery protection */
assert(js.includes('rausoCanOpenOutingChat')&&js.includes('rausoMatchesMember'),'Social filters and group chat should exist');

/* RAUSO 2.9.8 group chats in Nachrichten */
assert(js.includes('rausoGroupInbox')&&js.includes('rausoLoadGroupInbox'),'Group chat inbox integration must remain');
assert(js.includes('data-inbox-group')&&js.includes('data-inbox-view="groups"'),'Group list and filter must exist');

/* RAUSO 2.9.9 unread group marker check */
assert(js.includes('rausoUnreadGroupTotal')&&js.includes('rausoMarkGroupRead'),'Unread group messages must be counted and marked read');
assert(js.includes("rauso_group_chat_unread_counts"),'Database unread-count function must be used');

assert(html.includes('✓ Zugesagte Treffen')&&html.includes('id="heroOrganized"')&&html.includes('id="heroBookmarksCircle"'),'Three circular shortcuts required');
assert(!html.includes('INKOGNITO</small>')&&html.includes('rauso-incognito-icon'),'Inkognito must have icon only');
assert(footer.includes('id="headerMessages"')&&!header.includes('id="headerMessages"'),'Message badge moved with button');

/* RAUSO 3.0.3: all six top controls must be circular and evenly sized. */
assert(html.includes('class="topbar compact-topbar"') && html.includes('id="incognitoToggle"'));
assert(css.includes('RAUSO 3.0.3: precisely centered circular header controls.'));
assert(css.includes('border-radius:50%!important;'));

/* RAUSO 3.0.3: quick meetup circles and adjacent optional category. */
for(const period of ['today','tomorrow','weekend','next-week','next-month'])assert(html.includes('data-quick-meeting-period="'+period+'"'),'Missing quick period '+period);
assert(html.includes('id="heroMeetingCategory"')&&html.includes('id="rausoEventNearby"'),'Meetup discovery controls missing');
assert(js.includes('rausoOpenMeetingsFromHero')&&js.includes('rausoNearbyEventMatches'),'Meetup discovery handlers missing');
assert(css.includes('RAUSO 3.0.3: five small circular date filters'));
