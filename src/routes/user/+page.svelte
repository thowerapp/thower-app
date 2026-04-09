<script lang="ts">
import type { PageData } from './$types';
import EmberCanvas from '$lib/components/EmberCanvas.svelte';
let { data } = $props<{ data: PageData }>();
</script>

<div class="hero">
<div class="hero-top">
<div>
<div class="hero-title">Thower</div>
<div class="hero-sub">Semaine 4 · Jour 21</div>
</div>
<div class="hero-right">
<svg class="logo-svg" viewBox="0 0 44 38" fill="none">
<polygon points="22,2 42,36 2,36" fill="#2A1E0C"/>
<polygon points="22,2 42,36 22,24" fill="#3A2810"/>
</svg>
<a href="/user/parametres" class="pbtn">
<div class="pbtn-sq"></div>
<div class="npip"></div>
</a>
</div>
</div>
<div class="hero-pills">
<a href="/user/journee" class="hpill">Aujourd'hui</a>
<a href="/user/parametres" class="hpill">Profil</a>
</div>
</div>

<a href="/user/sport" class="notif-banner">
<EmberCanvas active={true} />
<div class="ndot-wrap"><div class="ndot"></div></div>
<div class="nb">
<div class="nb-t">Séance du jour en attente</div>
<div class="nb-s">Muscu · Corps entier · 30 min</div>
</div>
<div class="ncta">Commencer →</div>
</a>

<div class="sh"><div class="sh-t">Mon programme</div><div class="sh-s">Jour 21 / 91</div></div>
<div class="split-cards">
<a href="/user/sport" class="scard">
<div class="scard-circle"></div>
<div class="scard-lbl">Sport</div>
<div class="scard-sub">Calendrier · Séances</div>
</a>
<a href="/user/nutrition" class="scard">
<div class="scard-sq"></div>
<div class="scard-lbl">Nutrition</div>
<div class="scard-sub">Cadencier · Recettes</div>
</a>
</div>

<div class="sh"><div class="sh-t">À la une</div></div>
<div class="li">
<div class="li-th"><div style="width:11px;height:11px;border-radius:50%;background:var(--gd)"></div></div>
<div class="li-b"><div class="li-t">La méthode Thower</div><div class="li-s">Vidéo principale</div></div>
<div class="li-r"><div class="arr"></div></div>
</div>
<div class="li">
<div class="li-th"><div style="width:10px;height:10px;background:var(--cyd)"></div></div>
<div class="li-b"><div class="li-t">Élastiques &amp; Matériel</div><div class="li-s">Partenaires · Achats</div></div>
<div class="li-r"><div class="arr"></div></div>
</div>

<style>
.hero { background:var(--s1); padding:14px 18px 20px; border-bottom:1px solid var(--br); position:sticky; top:0; z-index:10; }
.hero::after { content:''; position:absolute; bottom:-1px; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--gd),transparent); opacity:.7; }
.hero-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; }
.hero-title { font-family:var(--fh); font-size:2.4rem; font-weight:700; color:var(--gb); letter-spacing:-.07em; line-height:.92; text-shadow:0 0 22px var(--gg),0 0 45px rgba(200,130,20,.12); }
.hero-sub { font-size:.55rem; color:var(--txd); letter-spacing:.1em; text-transform:uppercase; margin-top:5px; font-family:var(--fb); }
.hero-right { display:flex; align-items:flex-start; gap:8px; }
.logo-svg { width:40px; height:34px; opacity:.5; }
.pbtn { width:32px; height:32px; background:var(--s2); border:1px solid var(--br2); display:flex; align-items:center; justify-content:center; position:relative; -webkit-tap-highlight-color:transparent; }
.pbtn:active { border-color:var(--g); }
.pbtn-sq { width:11px; height:11px; background:var(--txd); }
.npip { position:absolute; top:-3px; right:-3px; width:7px; height:7px; border-radius:50%; background:var(--cy); border:1.5px solid var(--s1); animation:npip 2s ease-in-out infinite; }
.hero-pills { display:flex; gap:5px; flex-wrap:wrap; }
.hpill { padding:5px 11px; border:1px solid var(--br2); color:var(--txd); background:transparent; font-size:.55rem; letter-spacing:.04em; font-family:var(--fb); -webkit-tap-highlight-color:transparent; }
.hpill:active { background:rgba(200,130,20,.08); color:var(--g); border-color:var(--gd); }

.notif-banner { display:flex; align-items:center; gap:11px; margin:10px 18px 0; border:1px solid var(--br2); border-left:2px solid var(--g); padding:12px 13px; background:var(--s2); position:relative; overflow:hidden; -webkit-tap-highlight-color:transparent; animation:gbtn 2.5s ease-in-out infinite; }
.notif-banner:active { background:var(--s3); }
.ndot { width:9px; height:9px; border-radius:50%; background:var(--g); animation:gpulse 2.5s ease-in-out infinite; position:relative; z-index:4; }
.nb { flex:1; position:relative; z-index:4; }
.nb-t { font-size:.7rem; font-weight:500; color:var(--tx); margin-bottom:3px; font-family:var(--fb); }
.nb-s { font-size:.5rem; color:var(--txd); line-height:1.4; font-family:var(--fb); }
.ncta { font-size:.55rem; font-weight:600; color:var(--cy); white-space:nowrap; letter-spacing:.04em; font-family:var(--fb); text-shadow:0 0 8px var(--cyg); position:relative; z-index:4; }

.sh { padding:12px 18px 8px; border-bottom:1px solid var(--br); }
.sh-t { font-family:var(--fh2); font-size:1rem; color:var(--tx); letter-spacing:.05em; line-height:1; }
.sh-s { font-size:.5rem; color:var(--txd); margin-top:3px; font-family:var(--fb); }

.split-cards { display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:12px 18px; }
.scard { background:var(--s2); border:1px solid var(--br2); padding:16px 14px; display:block; -webkit-tap-highlight-color:transparent; }
.scard:active { background:var(--s3); border-color:var(--gd); }
.scard-circle { width:18px; height:18px; border-radius:50%; background:var(--gd); box-shadow:0 0 6px var(--gg); margin-bottom:12px; }
.scard-sq { width:16px; height:16px; background:var(--cyd); box-shadow:0 0 6px var(--cyg); margin-bottom:12px; }
.scard-lbl { font-family:var(--fh2); font-size:1.1rem; color:var(--tx); letter-spacing:.06em; line-height:1; }
.scard-sub { font-size:.5rem; color:var(--txd); margin-top:4px; font-family:var(--fb); }

.li { display:flex; align-items:center; gap:10px; padding:10px 18px; border-bottom:1px solid var(--br); -webkit-tap-highlight-color:transparent; }
.li:active { background:rgba(200,130,20,.05); }
.li-th { width:34px; height:34px; background:var(--s2); border:1px solid var(--br2); flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.li-b { flex:1; min-width:0; }
.li-t { font-size:.68rem; font-weight:500; color:var(--tx); font-family:var(--fb); }
.li-s { font-size:.5rem; color:var(--txd); margin-top:2px; font-family:var(--fb); }
.li-r { flex-shrink:0; }
.arr { width:5px; height:5px; border-right:1.5px solid var(--txd); border-top:1.5px solid var(--txd); transform:rotate(45deg); }
</style>
