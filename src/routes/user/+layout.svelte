<script lang="ts">
import { page } from '$app/stores';
import type { LayoutData } from './$types';
let { data } = $props<{ data: LayoutData }>();

$: currentTab = getTabFromRoute($page.url.pathname);

function getTabFromRoute(pathname: string): string {
if (pathname.includes('/decouverte')) return 'decouverte';
if (pathname.includes('/journee')) return 'journee';
if (pathname.includes('/progression')) return 'progression';
if (pathname.includes('/parametres')) return 'parametres';
return 'home';
}
</script>

<div class="screen">
<div class="sbar"></div>
<div class="screen-body">
<slot />
</div>
<nav class="bottom-nav">
<a href="/user/decouverte" class="ni" class:on={currentTab === 'decouverte'}>
<div class="ndot"></div>
<div class="nlbl">Découverte</div>
<div class="nbar"></div>
</a>
<a href="/user/journee" class="ni" class:on={currentTab === 'journee'}>
<div class="ndot"></div>
<div class="nlbl">Journée</div>
<div class="nbar"></div>
</a>
<a href="/user/progression" class="ni" class:on={currentTab === 'progression'}>
<div class="ndot"></div>
<div class="nlbl">Progression</div>
<div class="nbar"></div>
</a>
<a href="/user/parametres" class="ni" class:on={currentTab === 'parametres'}>
<div class="ndot"></div>
<div class="nlbl">Paramètres</div>
<div class="nbar"></div>
</a>
</nav>
</div>

<style>
/* ── Design tokens ── */
:global(:root) {
--g: #C8A44A;
--gb: #F0C040;
--gd: #5C4A1A;
--gg: rgba(200, 130, 20, .32);
--cy: #00D4E8;
--cyd: #004D58;
--cyg: rgba(0, 200, 220, .35);
--s1: #0D0A05;
--s2: #141008;
--s3: #1C1609;
--tx: #EDE5D0;
--txd: #6A5E48;
--txm: #2E2618;
--br: #1E1608;
--br2: #2A1E0C;
--fh: 'DM Sans', sans-serif;
--fh2: 'Bebas Neue', sans-serif;
--fb: 'Public Sans', sans-serif;
}

/* ── Keyframes ── */
@keyframes gpulse {
0%, 100% { box-shadow: 0 0 4px 1px rgba(200,130,20,.45), 0 0 10px 2px var(--gg); }
50%       { box-shadow: 0 0 8px 3px rgba(240,192,64,.6), 0 0 18px 5px rgba(200,130,20,.35); }
}
@keyframes cpulse {
0%, 100% { box-shadow: 0 0 4px 1px rgba(0,200,220,.4); }
50%       { box-shadow: 0 0 8px 3px rgba(0,220,240,.65); }
}
@keyframes checkIdle {
0%, 100% { border-color: rgba(92,74,26,.8); }
50%       { box-shadow: 0 0 7px 2px rgba(200,130,20,.45); border-color: rgba(200,164,74,1); }
}
@keyframes gbtn {
0%, 100% { box-shadow: 0 0 12px var(--gg); }
50%       { box-shadow: 0 0 22px rgba(240,192,64,.65); }
}
@keyframes npip {
0%, 100% { box-shadow: 0 0 3px 1px rgba(0,200,220,.5); }
50%       { box-shadow: 0 0 7px 3px rgba(0,220,240,.7); }
}

/* ── Base ── */
:global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
:global(body) {
font-family: var(--fb);
background: var(--s1);
color: var(--tx);
-webkit-font-smoothing: antialiased;
overscroll-behavior: none;
}
:global(a) { color: inherit; text-decoration: none; }

/* ── Screen ── */
.screen {
display: flex;
flex-direction: column;
height: 100dvh;
background: var(--s1);
overflow: hidden;
}

.sbar {
padding: 26px 18px 0;
flex-shrink: 0;
height: 28px;
background: var(--s1);
}

.screen-body {
flex: 1;
min-height: 0;
overflow-y: auto;
overflow-x: hidden;
-webkit-overflow-scrolling: touch;
background: var(--s1);
scrollbar-width: none;
}
.screen-body::-webkit-scrollbar { display: none; }

/* ── Bottom nav ── */
.bottom-nav {
display: flex;
align-items: center;
padding: 7px 0 calc(13px + env(safe-area-inset-bottom, 0px));
border-top: 1px solid var(--br);
background: var(--s1);
flex-shrink: 0;
position: relative;
}
.bottom-nav::before {
content: '';
position: absolute;
top: -1px; left: 0; right: 0;
height: 1px;
background: linear-gradient(90deg, transparent, rgba(200,130,20,.28), transparent);
}

.ni {
display: flex;
flex-direction: column;
align-items: center;
gap: 3px;
padding: 3px 6px;
flex: 1;
-webkit-tap-highlight-color: transparent;
transition: opacity .12s;
}
.ni:active { opacity: .7; }

.ndot {
width: 6px;
height: 6px;
border-radius: 50%;
background: var(--br2);
transition: background .22s, box-shadow .22s;
}
.ni.on .ndot {
background: var(--cy);
animation: cpulse 2s ease-in-out infinite;
}

.nlbl {
font-size: 0.44rem;
color: var(--txd);
text-transform: uppercase;
letter-spacing: .06em;
font-family: var(--fb);
transition: color .22s;
text-align: center;
}
.ni.on .nlbl {
color: var(--cy);
font-weight: 600;
}

.nbar {
width: 18px;
height: 1.5px;
background: transparent;
transition: background .22s, box-shadow .22s;
}
.ni.on .nbar {
background: var(--cy);
box-shadow: 0 0 4px var(--cyg);
}
</style>
