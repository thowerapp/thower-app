<script lang="ts">
import type { PageData } from './$types';
let { data } = $props<{ data: PageData }>();
</script>

<div class="back-row">
<a href="/user" class="back-lnk">
<svg width="12" height="12" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke="var(--txd)" stroke-width="1.5" stroke-linecap="round"/></svg>
<span class="back-lbl">Accueil</span>
</a>
<div class="back-head">Sport</div>
</div>

<div class="sh"><div class="sh-t">Semaine 4</div><div class="sh-s">3 séances A→B→C</div></div>

<div class="sport-week">
<div class="sd done"><div class="sd-n">Lun</div><div class="sd-d">18</div><div class="sd-b" style="color:var(--g)">A✓</div></div>
<div class="sd done"><div class="sd-n">Mar</div><div class="sd-d">19</div><div class="sd-b" style="color:var(--g)">B✓</div></div>
<div class="sd" style="opacity:.3"><div class="sd-n">Mer</div><div class="sd-d" style="color:var(--txd)">20</div><div class="sd-b" style="color:var(--txd)">—</div></div>
<div class="sd today"><div class="sd-n" style="color:var(--txd)">Jeu</div><div class="sd-d">21</div><div class="sd-b">C→</div></div>
<div class="sd placed"><div class="sd-n">Ven</div><div class="sd-d">22</div><div class="sd-b" style="color:var(--txd)">★</div></div>
<div class="sd free"><div class="sd-n">Sam</div><div class="sd-d">23</div><div class="sd-b" style="color:var(--txm)">+</div></div>
<div class="sd free"><div class="sd-n">Dim</div><div class="sd-d">24</div><div class="sd-b" style="color:var(--txm)">+</div></div>
</div>

<div class="sh"><div class="sh-t">Séances semaine 4</div></div>

<div class="li" style="opacity:.4">
<div class="li-th" style="background:var(--gd)"><span style="font-size:.62rem;font-weight:700;color:var(--gb);font-family:var(--fh2)">A</span></div>
<div class="li-b"><div class="li-t">Séance A — Lundi 18</div><div class="li-s" style="color:var(--g)">Validée ✓ · +50 pts</div></div>
</div>
<div class="li" style="opacity:.4">
<div class="li-th" style="background:var(--gd)"><span style="font-size:.62rem;font-weight:700;color:var(--gb);font-family:var(--fh2)">B</span></div>
<div class="li-b"><div class="li-t">Séance B — Mardi 19</div><div class="li-s" style="color:var(--g)">Validée ✓ · +50 pts</div></div>
</div>
<div class="li li-cta">
<div class="li-th" style="background:var(--g)"><span style="font-size:.62rem;font-weight:700;color:var(--s1);font-family:var(--fh2)">C</span></div>
<div class="li-b"><div class="li-t">Séance C — Aujourd'hui</div><div class="li-s">+50 pts à gagner</div></div>
<div class="li-r"><div class="arr"></div></div>
</div>

<style>
.back-row { display:flex; align-items:center; justify-content:space-between; padding:11px 18px; background:var(--s1); border-bottom:1px solid var(--br); position:sticky; top:0; z-index:10; }
.back-lnk { display:flex; align-items:center; gap:7px; -webkit-tap-highlight-color:transparent; }
.back-lbl { font-size:.55rem; color:var(--txd); font-family:var(--fb); }
.back-head { font-family:var(--fh2); font-size:1.35rem; color:var(--gb); letter-spacing:.06em; line-height:1; text-shadow:0 0 10px var(--gg); }

.sh { padding:12px 18px 8px; border-bottom:1px solid var(--br); }
.sh-t { font-family:var(--fh2); font-size:1rem; color:var(--tx); letter-spacing:.05em; }
.sh-s { font-size:.5rem; color:var(--txd); margin-top:3px; font-family:var(--fb); }

.sport-week { display:grid; grid-template-columns:repeat(7,1fr); gap:3px; padding:8px 18px; }
.sd { display:flex; flex-direction:column; align-items:center; padding:6px 2px; border:1px solid var(--br2); gap:2px; -webkit-tap-highlight-color:transparent; }
.sd-n { font-size:.38rem; color:var(--txd); text-transform:uppercase; font-family:var(--fb); }
.sd-d { font-size:.68rem; font-weight:700; color:var(--tx); font-family:var(--fh); }
.sd-b { font-size:.5rem; font-weight:700; margin-top:1px; font-family:var(--fb); }
.sd.done { background:var(--s3); border-color:var(--gd); }
.sd.done .sd-d { color:var(--gb); }
.sd.today { border:1.5px solid var(--g); box-shadow:0 0 8px var(--gg); animation:gpulse 2.5s ease-in-out infinite; }
.sd.today .sd-d { color:var(--gb); }
.sd.today .sd-b { color:var(--cy); }
.sd.placed { background:var(--s2); border:1px dashed var(--txd); }
.sd.free { opacity:.6; }

.li { display:flex; align-items:center; gap:10px; padding:10px 18px; border-bottom:1px solid var(--br); -webkit-tap-highlight-color:transparent; }
.li:active { background:rgba(200,130,20,.05); }
.li-th { width:34px; height:34px; background:var(--s2); border:1px solid var(--br2); flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.li-b { flex:1; min-width:0; }
.li-t { font-size:.68rem; font-weight:500; color:var(--tx); font-family:var(--fb); }
.li-s { font-size:.5rem; color:var(--txd); margin-top:2px; font-family:var(--fb); }
.li-r { flex-shrink:0; }
.arr { width:5px; height:5px; border-right:1.5px solid var(--txd); border-top:1.5px solid var(--txd); transform:rotate(45deg); }
.li-cta { border-left:2px solid var(--g); box-shadow:inset 2px 0 8px var(--gg); animation:gbtn 2.5s ease-in-out infinite; }
</style>
