<script lang="ts">

</script>

<div class="hero">
<div class="hero-top">
<div>
<div class="hero-title">Progression</div>
<div class="hero-sub">Semaine 4 · Niveau 3</div>
</div>
<svg class="logo-svg" viewBox="0 0 44 38" fill="none">
<polygon points="22,2 42,36 2,36" fill="#2A1E0C"/>
<polygon points="22,2 42,36 22,24" fill="#3A2810"/>
</svg>
</div>
</div>

<div class="stats-row">
<div class="sbox"><div class="sv">340</div><div class="sl">Points</div></div>
<div class="sbox"><div class="sv">12</div><div class="sl">Séances</div></div>
<div class="sbox"><div class="sv">87%</div><div class="sl">Score</div></div>
</div>

<div class="status-card">
<div class="stat-name">Bambou Furieux</div>
<div class="stat-sub">86% → 90% · Prochain : Guerrier en devenir</div>
<div class="progbar"><div class="progfill"></div></div>
<div class="prog-labels">
<span>86%</span>
<span class="prog-you">87% — toi</span>
<span>90%</span>
</div>
</div>

<div class="sh"><div class="sh-t">Mes badges</div><div class="sh-s">2 obtenus · 3 en cours</div></div>

<div class="li">
<div class="li-th" style="border-color:var(--g)"><div style="width:9px;height:9px;border-radius:50%;border:1.5px solid var(--g)"></div></div>
<div class="li-b"><div class="li-t">7 jours sans rater</div><div class="li-s">6 / 7 — Plus qu'un jour !</div></div>
<div class="li-r"><div class="arr"></div></div>
</div>
<div class="li">
<div class="li-th" style="background:var(--gd)"><div style="width:9px;height:9px;border:1.5px solid var(--gb)"></div></div>
<div class="li-b"><div class="li-t">21 respirations d'affilée</div><div class="li-s li-done">Obtenu ✓</div></div>
</div>
<div class="li" style="opacity:.5">
<div class="li-th"><div style="width:9px;height:9px;border-radius:50%;background:var(--br2)"></div></div>
<div class="li-b"><div class="li-t">3 semaines sans soda</div><div class="li-s">En cours · Semaine 2/3</div></div>
<div class="li-r"><div class="arr"></div></div>
</div>

<div class="sh"><div class="sh-t">Photos du mois</div></div>
<div class="photo-grid">
<div class="pcell filled">
<div class="pc-plus" style="color:var(--g)">+</div>
<div class="pc-lbl" style="color:var(--g)">Face ✓</div>
</div>
<div class="pcell">
<div class="pc-plus">+</div>
<div class="pc-lbl">Profil</div>
</div>
<div class="pcell">
<div class="pc-plus">+</div>
<div class="pc-lbl">Dos</div>
</div>
</div>

<style>
.hero { background:var(--s1); padding:14px 18px 18px; border-bottom:1px solid var(--br); position:sticky; top:0; z-index:10; }
.hero-top { display:flex; justify-content:space-between; align-items:flex-start; }
.hero-title { font-family:var(--fh); font-size:2.4rem; font-weight:700; color:var(--gb); letter-spacing:-.07em; line-height:.92; text-shadow:0 0 22px var(--gg); }
.hero-sub { font-size:.55rem; color:var(--txd); letter-spacing:.1em; text-transform:uppercase; margin-top:5px; font-family:var(--fb); }
.logo-svg { width:40px; height:34px; opacity:.5; flex-shrink:0; }

.stats-row { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; padding:10px 18px 6px; }
.sbox { background:var(--s2); border:1px solid var(--br2); padding:11px 6px; text-align:center; position:relative; }
.sbox::before { content:''; position:absolute; bottom:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--gd),transparent); opacity:.5; }
.sv { font-size:1.25rem; font-weight:700; color:var(--gb); line-height:1; text-shadow:0 0 10px var(--gg); font-family:var(--fh); }
.sl { font-size:.44rem; color:var(--txd); text-transform:uppercase; letter-spacing:.1em; margin-top:4px; font-family:var(--fb); }

.status-card { margin:10px 18px; padding:13px; background:var(--s2); border:1px solid var(--br2); animation:gbtn 2.5s ease-in-out infinite; }
.stat-name { font-family:var(--fh2); font-size:1.25rem; color:var(--gb); letter-spacing:.06em; text-shadow:0 0 10px var(--gg); }
.stat-sub { font-size:.5rem; color:var(--txd); margin-top:3px; font-family:var(--fb); }
.progbar { margin-top:10px; height:3px; background:var(--br2); }
.progfill { height:3px; background:linear-gradient(90deg,var(--gd),var(--gb)); width:72%; box-shadow:0 0 8px var(--gg); }
.prog-labels { display:flex; justify-content:space-between; margin-top:4px; font-size:.44rem; color:var(--txd); font-family:var(--fb); }
.prog-you { color:var(--g); font-weight:600; }

.sh { padding:12px 18px 8px; border-bottom:1px solid var(--br); }
.sh-t { font-family:var(--fh2); font-size:1rem; color:var(--tx); letter-spacing:.05em; }
.sh-s { font-size:.5rem; color:var(--txd); margin-top:3px; font-family:var(--fb); }

.li { display:flex; align-items:center; gap:10px; padding:10px 18px; border-bottom:1px solid var(--br); -webkit-tap-highlight-color:transparent; }
.li:active { background:rgba(200,130,20,.05); }
.li-th { width:34px; height:34px; background:var(--s2); border:1px solid var(--br2); flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.li-b { flex:1; min-width:0; }
.li-t { font-size:.68rem; font-weight:500; color:var(--tx); font-family:var(--fb); }
.li-s { font-size:.5rem; color:var(--txd); margin-top:2px; font-family:var(--fb); }
.li-done { color:var(--g) !important; }
.li-r { flex-shrink:0; }
.arr { width:5px; height:5px; border-right:1.5px solid var(--txd); border-top:1.5px solid var(--txd); transform:rotate(45deg); }

.photo-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:5px; padding:10px 18px 20px; }
.pcell { aspect-ratio:3/4; background:var(--s2); border:1px dashed var(--br2); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; -webkit-tap-highlight-color:transparent; }
.pcell:active { background:var(--s3); border-color:var(--gd); }
.pcell.filled { border:1px solid var(--br2); }
.pc-plus { font-size:.85rem; color:var(--txd); }
.pc-lbl { font-size:.44rem; color:var(--txd); text-align:center; font-family:var(--fb); }
</style>
