<script lang="ts">
import type { PageData } from './$types';
let { data } = $props<{ data: PageData }>();

type Video = { id: string; title: string; thumbnailUrl: string | null; completed: boolean };
const videos = $derived((data.videos ?? []) as Video[]);
</script>

<div class="back-row">
<a href="/user/decouverte" class="back-lnk">
<svg width="12" height="12" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke="var(--txd)" stroke-width="1.5" stroke-linecap="round"/></svg>
<span class="back-lbl">Découverte</span>
</a>
<div class="back-head">Motivation</div>
</div>
<div class="sh">
	<div class="sh-t">Bienvenue · Programme</div>
	<div class="sh-s">{videos.length} vidéo{videos.length > 1 ? 's' : ''}</div>
</div>

{#if videos.length === 0}
	<div class="empty-state">Aucune vidéo disponible pour le moment.</div>
{:else}
<div class="vid-list">
	{#each videos as video (video.id)}
		<a href="/user/decouverte/motivation/{video.id}" class="vcell" class:done={video.completed}>
			<div class="vcell-thumb">
				{#if video.thumbnailUrl}
					<img src={video.thumbnailUrl} alt="" class="vcell-img" />
				{:else}
					<div class="vcell-img vcell-img-empty"></div>
				{/if}
				<div class="vcell-play">
					{#if video.completed}
						<div class="vcell-check"></div>
					{:else}
						<svg width="14" height="14" viewBox="0 0 14 14"><polygon points="3,2 12,7 3,12" fill="white"/></svg>
					{/if}
				</div>
			</div>
			<div class="vcell-t">{video.title}</div>
		</a>
	{/each}
</div>
{/if}

<style>
.back-row { display:flex; align-items:center; justify-content:space-between; padding:11px 18px; background:var(--s1); border-bottom:1px solid var(--br); position:sticky; top:0; z-index:10; }
.back-lnk { display:flex; align-items:center; gap:7px; -webkit-tap-highlight-color:transparent; }
.back-lbl { font-size:.55rem; color:var(--txd); font-family:var(--fb); }
.back-head { font-family:var(--fh); font-size:1.35rem; font-weight:800; color:var(--gb); letter-spacing:-.08em; line-height:1; text-transform:uppercase; text-shadow:0 0 10px var(--gg); }
.sh { padding:12px 18px 8px; border-bottom:1px solid var(--br); }
.sh-t { font-family:var(--fh); font-size:1rem; font-weight:800; color:var(--tx); letter-spacing:-.06em; text-transform:uppercase; }
.sh-s { font-size:.5625rem; color:var(--txd); margin-top:3px; font-family:var(--fb); }
.empty-state { padding:40px 18px; text-align:center; font-size:.75rem; color:var(--txd); font-family:var(--fb); }

.vid-list { display:flex; flex-direction:column; gap:0; }
.vcell { display:flex; align-items:center; gap:14px; padding:12px 18px; border-bottom:1px solid var(--br); -webkit-tap-highlight-color:transparent; text-decoration:none; }
.vcell:active { background:rgba(200,130,20,.04); }
.vcell-thumb { position:relative; width:80px; height:50px; flex-shrink:0; border-radius:4px; overflow:hidden; background:var(--s2); }
.vcell-img { width:100%; height:100%; object-fit:cover; display:block; }
.vcell-img-empty { width:100%; height:100%; background:var(--s2); }
.vcell-play { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.25); }
.vcell-check { width:12px; height:12px; border-radius:50%; background:var(--g); }
.vcell-t { font-size:.75rem; color:var(--tx); font-family:var(--fb); font-weight:600; flex:1; line-height:1.3; }
</style>
