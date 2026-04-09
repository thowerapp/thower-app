<script lang="ts">


let items = $state([
  { key: 'water',      label: "Boire 2L d'eau",         pts: 5,  done: false },
  { key: 'meditation', label: '10 min de méditation',    pts: 5,  done: false },
  { key: 'nosugar',    label: 'Pas de sucre ajouté',     pts: 5,  done: false },
  { key: 'coffeemax',  label: 'Max 4 cafés',             pts: 5,  done: false },
  { key: 'coffeetime', label: 'Pas de café après 14h',   pts: 5,  done: false },
  { key: 'notobacco',  label: 'Pas de tabac',            pts: 10, done: false },
]);

let ptsChecklist = $derived(items.filter(i => i.done).reduce((s, i) => s + (i.pts ?? 0), 0));
let countDone    = $derived(items.filter(i => i.done).length);
</script>

<div class="hero">
<div class="hero-top">
<div>
<div class="hero-title">Journée</div>
<div class="hero-sub">Ligne directrice · Jeudi 21</div>
</div>
<svg class="logo-svg" viewBox="0 0 44 38" fill="none">
<polygon points="22,2 42,36 2,36" fill="#2A1E0C"/>
<polygon points="22,2 42,36 22,24" fill="#3A2810"/>
</svg>
</div>
</div>

<div class="sh">
<div class="sh-t">Ma checklist du jour</div>
<div class="sh-s">{countDone} / {items.length} complétées</div>
</div>

<div class="checklist">
{#each items as item}
<button class="citem" class:done={item.done} onclick={() => item.done = !item.done}>
<div class="cbox" class:done={item.done} class:idle={!item.done}>
{#if item.done}
<svg width="9" height="7" viewBox="0 0 9 7" fill="none">
<path d="M1 3.5l2.5 2.5 5-5" stroke="var(--s1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
{/if}
</div>
<div class="clbl" class:done={item.done}>{item.label}</div>
<div class="cpts" class:earned={item.done}>
{item.done ? item.pts + ' pts' : '+' + item.pts + ' pts'}
</div>
</button>
{/each}
</div>

<div class="stats-row">
<div class="sbox">
<div class="sv">{ptsChecklist}</div>
<div class="sl">Checklist</div>
</div>
<div class="sbox">
<div class="sv">0</div>
<div class="sl">Séance</div>
</div>
<div class="sbox">
<div class="sv">{ptsChecklist}</div>
<div class="sl">Total jour</div>
</div>
</div>

<style>
.hero { background:var(--s1); padding:14px 18px 18px; border-bottom:1px solid var(--br); position:sticky; top:0; z-index:10; }
.hero-top { display:flex; justify-content:space-between; align-items:flex-start; }
.hero-title { font-family:var(--fh); font-size:2.4rem; font-weight:700; color:var(--gb); letter-spacing:-.07em; line-height:.92; text-shadow:0 0 22px var(--gg); }
.hero-sub { font-size:.55rem; color:var(--txd); letter-spacing:.1em; text-transform:uppercase; margin-top:5px; font-family:var(--fb); }
.logo-svg { width:40px; height:34px; opacity:.5; flex-shrink:0; }

.sh { padding:12px 18px 8px; border-bottom:1px solid var(--br); }
.sh-t { font-family:var(--fh2); font-size:1rem; color:var(--tx); letter-spacing:.05em; }
.sh-s { font-size:.5rem; color:var(--txd); margin-top:3px; font-family:var(--fb); }

.checklist { padding:4px 0; }

.citem {
display:flex; align-items:center; gap:11px;
padding:10px 18px;
border:none; border-bottom:1px solid var(--br);
background:transparent; width:100%; text-align:left;
cursor:pointer;
-webkit-tap-highlight-color:transparent;
}
.citem:active { background:rgba(200,130,20,.05); }

.cbox {
width:17px; height:17px;
border:1.5px solid var(--br2);
background:transparent;
flex-shrink:0;
display:flex; align-items:center; justify-content:center;
transition:all .22s;
}
.cbox.idle {
border-color:var(--gd);
animation:checkIdle 3s ease-in-out infinite;
}
.cbox.done {
background:var(--g);
border-color:var(--gb);
box-shadow:0 0 8px 2px rgba(240,192,64,.5), 0 0 18px 4px var(--gg);
animation:none;
}

.clbl { font-size:.65rem; color:var(--tx); flex:1; font-family:var(--fb); transition:color .2s; }
.clbl.done { color:var(--txd); text-decoration:line-through; }
.cpts { font-size:.5rem; color:var(--txd); flex-shrink:0; font-family:var(--fb); }
.cpts.earned { color:var(--g); font-weight:600; text-shadow:0 0 5px var(--gg); }

.stats-row { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; padding:10px 18px 6px; }
.sbox { background:var(--s2); border:1px solid var(--br2); padding:11px 6px; text-align:center; position:relative; }
.sbox::before { content:''; position:absolute; bottom:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--gd),transparent); opacity:.5; }
.sv { font-size:1.25rem; font-weight:700; color:var(--gb); line-height:1; text-shadow:0 0 10px var(--gg); font-family:var(--fh); }
.sl { font-size:.44rem; color:var(--txd); text-transform:uppercase; letter-spacing:.1em; margin-top:4px; font-family:var(--fb); }
</style>
