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
assert.match(header,/id="heroPlan"[^>]*><span class="rauso-plus-mark"[^>]*><\/span><\/button>[\s\S]*id="headerFriends"[\s\S]*id="headerMessages"/);
assert.equal((html.match(/id="heroPlan"/g)||[]).length,1);
assert.match(header,/id="headerSettings"/);
assert.match(header,/id="accountShortcut"/);
assert.match(footer,/data-tab="collections"[\s\S]*<small>Merkliste<\/small>/);
assert.match(footer,/id="datingNav"[\s\S]*<span class="nav-icon rauso-nav-dating-heart"[^>]*>♥<\/span>/);
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
assert.match(js,/const APP_VERSION='2\.9\.2'/);
assert.match(gradle,/versionCode 43; versionName '2\.9\.2'/);
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
for(const id of ['heroCreate','priceFilter','headerMessages'])assert(html.includes('id="'+id+'"'),'Missing '+id);
for(const nav of ['rauso-nav-star','rauso-nav-dating-heart','rauso-nav-smile','rauso-nav-family','rauso-created-exclamation'])assert(html.includes(nav),'Missing nav symbol '+nav);
assert.match(css,/RAUSO 2\.9: screenshot-inspired compact discovery/);
assert.match(css,/\.rauso-place-link\[data-venue-category="thermen"\]/);
assert.match(css,/#headerMessages>span:first-child/);
assert.match(js,/\$\('priceFilter'\)\.onchange=/);
assert.match(js,/\$\('heroCreate'\)\.onclick=/);
assert.match(js,/function rausoMatchesPrice/);

/* Screenshot reference UI: icons and shortcuts are implemented and functional. */
for(const cls of ['rauso-nav-smile','rauso-nav-star','rauso-nav-family','rauso-nav-dating-heart','rauso-created-exclamation','rauso-neon-envelope','rauso-hero-shortcuts']){
 assert(html.includes(cls),'Screenshot UI missing class '+cls);
}
assert(js.includes("data-rauso-hero-go")&&js.includes("destination==='friends'"),'Hero shortcuts must navigate');
assert(css.includes('RAUSO 2.9: screenshot-inspired compact discovery'),'Reference layout CSS missing');

/* RAUSO 2.9.2: approval actions and pending state. */
assert(html.includes('data-meeting-filter="pending"'));
assert(js.includes('id="oRequiresApproval"')&&js.includes('requires_approval:val.requires_approval'));
assert(js.includes('function rausoReviewRequest(')&&js.includes('function rausoPendingReviewHtml(')&&js.includes("actual==='pending'"));
assert(css.includes('.rauso-approval-panel')&&css.includes('.rauso-approve'));
