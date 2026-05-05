<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let regenerating = $state(false);
	let regenerateDone = $state(false);
</script>

<div class="u-back-row">
<a href="/user" class="u-back-lnk">
<svg width="12" height="12" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke="var(--txd)" stroke-width="1.5" stroke-linecap="round"/></svg>
<span class="u-back-lbl">Accueil</span>
</a>
<div class="u-back-head">Paramètres</div>
</div>

<div class="hero">
<div class="hero-top">
<div>
<div class="hero-title">Paramètres</div>
<div class="hero-sub">Compte &amp; préférences</div>
</div>
<svg class="logo-svg" viewBox="0 0 44 38" fill="none">
<polygon points="22,2 42,36 2,36" fill="#2A1E0C"/>
<polygon points="22,2 42,36 22,24" fill="#3A2810"/>
</svg>
</div>
</div>

<a href="/user/parametres/profil" class="li">
<div class="li-th"><div style="width:10px;height:10px;background:var(--g)"></div></div>
<div class="li-b"><div class="li-t">Profil &amp; Données</div><div class="li-s">Objectif · Mesures · Allergies</div></div>
<div class="li-r"><div class="arr"></div></div>
</a>
<a href="/user/parametres/abonnement" class="li">
<div class="li-th"><div style="width:10px;height:10px;background:var(--gd)"></div></div>
<div class="li-b"><div class="li-t">Abonnement</div><div class="li-s">Plan actif</div></div>
<div class="li-r"><div class="arr"></div></div>
</a>
<a href="/user/parametres/notifications" class="li">
<div class="li-th"><div style="width:10px;height:10px;border-radius:50%;background:var(--txd)"></div></div>
<div class="li-b"><div class="li-t">Notifications</div><div class="li-s">Rappels séances · Horaires</div></div>
<div class="li-r"><div class="arr"></div></div>
</a>
{#if data.canRegenerateNutrition}
<form
	method="POST"
	action="?/regenerateNutrition"
	use:enhance={() => {
		regenerating = true;
		return async ({ result, update }) => {
			await update({ reset: false });
			regenerating = false;
			if (result.type === 'success') regenerateDone = true;
		};
	}}
	class="li li-regen"
>
	<button type="submit" class="regen-btn" disabled={regenerating}>
		<div class="li-th"><div style="width:10px;height:10px;border-radius:50%;background:var(--cy)"></div></div>
		<div class="li-b">
			<div class="li-t">{regenerating ? 'Recalibrage en cours…' : regenerateDone ? 'Plan recalibré ✓' : 'Recalibrer mon plan nutrition'}</div>
			<div class="li-s">Recalcule les repas selon ton profil actuel</div>
		</div>
		{#if !regenerating && !regenerateDone}
			<div class="li-r"><div class="arr"></div></div>
		{/if}
	</button>
	{#if form?.error}
		<p class="regen-err">{form.error}</p>
	{/if}
</form>
{/if}

<form method="POST" action="/auth?/signout" class="li li-logout">
<button type="submit" class="logout-btn">
<div class="li-th"><div style="width:10px;height:10px;border:1.5px solid var(--txd)"></div></div>
<div class="li-b"><div class="li-t" style="color:var(--txd)">Se déconnecter</div></div>
<div class="li-r"><div class="arr" style="border-color:var(--txm)"></div></div>
</button>
</form>

<style>
.hero { background:var(--s1); padding:14px 18px 18px; border-bottom:1px solid var(--br); position:sticky; top:0; z-index:10; }
.hero-top { display:flex; justify-content:space-between; align-items:flex-start; }
.hero-title { font-family:var(--fh); font-size:2.4rem; font-weight:800; color:var(--gb); letter-spacing:-.1em; line-height:.92; text-transform:uppercase; text-shadow:0 0 22px var(--gg); }
.hero-sub { font-size:.55rem; color:var(--txd); letter-spacing:.1em; text-transform:uppercase; margin-top:5px; font-family:var(--fb); }
.logo-svg { width:40px; height:34px; opacity:.5; flex-shrink:0; }

.li { display:flex; align-items:center; gap:10px; padding:10px 18px; border-bottom:1px solid var(--br); -webkit-tap-highlight-color:transparent; }
.li:active { background:rgba(200,130,20,.05); }
.li-th { width:34px; height:34px; background:var(--s2); border:1px solid var(--br2); flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.li-b { flex:1; min-width:0; }
.li-t { font-size:.6875rem; font-weight:500; color:var(--tx); font-family:var(--fb); }
.li-s { font-size:.5625rem; color:var(--txd); margin-top:2px; font-family:var(--fb); }
.li-r { flex-shrink:0; }
.arr { width:5px; height:5px; border-right:1.5px solid var(--txd); border-top:1.5px solid var(--txd); transform:rotate(45deg); }
.li-logout { margin-top:20px; border-top:1px solid var(--br); }
.logout-btn { display:flex; align-items:center; gap:10px; width:100%; padding:0; border:0; background:transparent; text-align:left; cursor:pointer; color:inherit; }
.li-regen { margin-top:8px; border-top:1px solid var(--br); }
.regen-btn { display:flex; align-items:center; gap:10px; width:100%; padding:0; border:0; background:transparent; text-align:left; cursor:pointer; color:inherit; }
.regen-btn:disabled { opacity:.6; cursor:not-allowed; }
.regen-err { font-size:.52rem; color:rgba(255,120,80,.9); padding:0 18px 8px; margin:0; }
</style>
