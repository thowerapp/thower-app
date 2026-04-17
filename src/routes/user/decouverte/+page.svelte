<script lang="ts">
import type { PageData } from './$types';
let { data } = $props<{ data: PageData }>();
</script>

<div class="u-back-row">
<a href="/user" class="u-back-lnk">
<svg width="12" height="12" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke="var(--txd)" stroke-width="1.5" stroke-linecap="round"/></svg>
<span class="u-back-lbl">Accueil</span>
</a>
<div class="u-back-head">Découverte</div>
</div>

<div class="hero">
<div class="hero-top">
<div>
<div class="hero-title">Découverte</div>
<div class="hero-sub">Bibliothèques · Pratiques</div>
</div>
<svg class="logo-svg" viewBox="0 0 44 38" fill="none">
<polygon points="22,2 42,36 2,36" fill="#2A1E0C"/>
<polygon points="22,2 42,36 22,24" fill="#3A2810"/>
</svg>
</div>
</div>

<a href="/user/decouverte/meditation" class="dec-card">
<div class="dec-icon"><div style="width:14px;height:14px;border-radius:50%;border:2px solid var(--g)"></div></div>
<div class="dec-body">
<div class="dec-t">Méditation</div>
<div class="dec-s">Pleine conscience · Guidée</div>
<div class="dec-c">3 débloquées</div>
</div>
<div class="arr-wrap"><div class="arr"></div></div>
</a>
<a href="/user/decouverte/mindset" class="dec-card">
<div class="dec-icon"><div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:13px solid var(--cy)"></div></div>
<div class="dec-body">
<div class="dec-t">Mindset</div>
<div class="dec-s">Motivation · Discipline</div>
<div class="dec-c">2 débloquées</div>
</div>
<div class="arr-wrap"><div class="arr"></div></div>
</a>
<a href="/user/decouverte/breathwork" class="dec-card">
<div class="dec-icon"><div style="width:14px;height:14px;border:2px solid var(--g);border-radius:2px"></div></div>
<div class="dec-body">
<div class="dec-t">Breathwork</div>
<div class="dec-s">Cohérence · Anti-stress</div>
<div class="dec-c">2 débloquées</div>
</div>
<div class="arr-wrap"><div class="arr"></div></div>
</a>

<style>
.hero { background:var(--s1); padding:14px 18px 18px; border-bottom:1px solid var(--br); position:sticky; top:0; z-index:10; }
.hero-top { display:flex; justify-content:space-between; align-items:flex-start; }
.hero-title { font-family:var(--fh); font-size:2.4rem; font-weight:700; color:var(--gb); letter-spacing:-.07em; line-height:.92; text-shadow:0 0 22px var(--gg); }
.hero-sub { font-size:.55rem; color:var(--txd); letter-spacing:.1em; text-transform:uppercase; margin-top:5px; font-family:var(--fb); }
.logo-svg { width:40px; height:34px; opacity:.5; flex-shrink:0; }

.dec-card { display:flex; align-items:center; gap:14px; padding:14px 18px; border-bottom:1px solid var(--br); -webkit-tap-highlight-color:transparent; }
.dec-card:active { background:rgba(200,130,20,.04); }
.dec-icon { width:42px; height:42px; background:var(--s2); border:1px solid var(--br2); flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.dec-body { flex:1; }
.dec-t { font-family:var(--fh2); font-size:1.05rem; color:var(--tx); letter-spacing:.05em; line-height:1; }
.dec-s { font-size:.5625rem; color:var(--txd); margin-top:3px; font-family:var(--fb); }
.dec-c { font-size:.5625rem; color:var(--txm); margin-top:2px; font-family:var(--fb); }
.arr-wrap { flex-shrink:0; }
.arr { width:5px; height:5px; border-right:1.5px solid var(--txd); border-top:1.5px solid var(--txd); transform:rotate(45deg); }
</style>
