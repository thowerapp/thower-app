<script lang="ts">
	import * as Dialog from '$lib/components/shadcn/ui/dialog';

	type DayPopup = { id: string; title: string | null; body: string | null; videoUrl: string | null };

	let { popups }: { popups: DayPopup[] } = $props();

	// Chaque pop-up du jour programme ne s'affiche qu'une fois (mémorisé dans le navigateur).
	function storageKey(id: string) {
		return `dayPopup:${id}`;
	}

	function wasSeen(id: string): boolean {
		try {
			return localStorage.getItem(storageKey(id)) != null;
		} catch {
			return false;
		}
	}

	function markSeen(id: string) {
		try {
			localStorage.setItem(storageKey(id), new Date().toISOString());
		} catch {
			// stockage indisponible (navigation privée) : la pop-up pourra réapparaître
		}
	}

	let dismissed = $state<string[]>([]);
	const current = $derived(
		typeof window === 'undefined'
			? null
			: (popups.find((p) => !dismissed.includes(p.id) && !wasSeen(p.id)) ?? null)
	);

	function close() {
		if (!current) return;
		markSeen(current.id);
		dismissed = [...dismissed, current.id];
	}
</script>

{#if current}
	<Dialog.Root
		open={true}
		onOpenChange={(open) => {
			if (!open) close();
		}}
	>
		<Dialog.Content class="day-popup">
			<Dialog.Header>
				<Dialog.Title class="day-popup-title">{current.title ?? 'Thower'}</Dialog.Title>
				{#if current.body}
					<Dialog.Description class="day-popup-body">{current.body}</Dialog.Description>
				{/if}
			</Dialog.Header>
			<div class="day-popup-actions">
				{#if current.videoUrl}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a href={current.videoUrl} target="_blank" rel="noopener noreferrer" class="day-popup-btn day-popup-btn--ghost" onclick={close}>
						Voir la vidéo
					</a>
				{/if}
				<button type="button" class="day-popup-btn" onclick={close}>C'est parti</button>
			</div>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<style>
	:global(.day-popup) {
		background: var(--s2, #1a1a1a) !important;
		color: var(--tx, #eaeaea) !important;
		border: 1px solid var(--br2, #333) !important;
		border-left: 2px solid var(--gb, #d4af37) !important;
		box-shadow: 0 0 24px var(--gg, rgba(201, 168, 78, 0.15)) !important;
		border-radius: 4px !important;
	}
	:global(.day-popup-title) {
		font-family: var(--fh2, sans-serif);
		font-size: 1.6rem !important;
		letter-spacing: 0.02em;
		color: var(--gb, #d4af37);
	}
	:global(.day-popup-body) {
		font-family: var(--fb, sans-serif);
		color: var(--tx2, rgba(234, 234, 234, 0.8)) !important;
		line-height: 1.5;
	}
	.day-popup-actions {
		display: flex;
		gap: 8px;
		justify-content: flex-end;
	}
	.day-popup-btn {
		padding: 8px 14px;
		border: 1px solid var(--cy, #00e5ff);
		background: transparent;
		color: var(--cy, #00e5ff);
		font-family: var(--fb, sans-serif);
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
	}
	.day-popup-btn--ghost {
		border-color: var(--br2, #333);
		color: var(--tx, #eaeaea);
	}
</style>
