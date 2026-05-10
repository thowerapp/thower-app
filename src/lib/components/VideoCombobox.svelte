<script lang="ts">
	import * as Popover from '$shadcn/popover/index.js';
	import * as Command from '$shadcn/command/index.js';
	import { Button } from '$shadcn/button';
	import { Badge } from '$shadcn/badge';
	import ChevronsUpDown from 'lucide-svelte/icons/chevrons-up-down';
	import Check from 'lucide-svelte/icons/check';
	import Video from 'lucide-svelte/icons/video';

	interface VideoOption {
		id: string;
		title: string;
		category: string;
	}

	const categoryLabels: Record<string, string> = {
		MEDITATION: 'Méditation',
		MINDSET: 'Mindset',
		MOTIVATION: 'Motivation',
		BREATHWORK: 'Respiration',
		EXPLICATION: 'Explication'
	};

	const categoryColors: Record<string, string> = {
		MEDITATION: 'bg-violet-100 text-violet-800',
		MINDSET: 'bg-blue-100 text-blue-800',
		MOTIVATION: 'bg-orange-100 text-orange-800',
		BREATHWORK: 'bg-teal-100 text-teal-800',
		EXPLICATION: 'bg-gray-100 text-gray-700'
	};

	let {
		videos = [],
		value = $bindable(''),
		name = 'discoveryContentId',
		placeholder = 'Choisir une vidéo…'
	} = $props<{
		videos: VideoOption[];
		value?: string;
		name?: string;
		placeholder?: string;
	}>();

	let open = $state(false);
	let search = $state('');

	const selected = $derived(videos.find((v) => v.id === value) ?? null);

	const grouped = $derived.by(() => {
		const q = search.toLowerCase();
		const filtered = q
			? videos.filter(
					(v) =>
						v.title.toLowerCase().includes(q) ||
						(categoryLabels[v.category] ?? v.category).toLowerCase().includes(q)
				)
			: videos;

		const map = new Map<string, VideoOption[]>();
		for (const v of filtered) {
			if (!map.has(v.category)) map.set(v.category, []);
			map.get(v.category)!.push(v);
		}
		return map;
	});

	function select(id: string) {
		value = id;
		open = false;
		search = '';
	}

	function clear() {
		value = '';
		open = false;
		search = '';
	}
</script>

<!-- Champ caché pour la soumission du formulaire -->
<input type="hidden" {name} {value} />

<Popover.Root bind:open>
	<Popover.Trigger>
		<Button
			variant="outline"
			role="combobox"
			aria-expanded={open}
			class="w-full justify-between font-normal {!selected ? 'text-muted-foreground' : ''}"
		>
			{#if selected}
				<span class="flex items-center gap-2 truncate">
					<Video class="size-3.5 shrink-0 text-muted-foreground" />
					<span class="truncate">{selected.title}</span>
					<span class="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium {categoryColors[selected.category] ?? 'bg-gray-100 text-gray-700'}">
						{categoryLabels[selected.category] ?? selected.category}
					</span>
				</span>
			{:else}
				<span class="flex items-center gap-2">
					<Video class="size-3.5 text-muted-foreground" />
					{placeholder}
				</span>
			{/if}
			<ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
		</Button>
	</Popover.Trigger>

	<Popover.Content class="w-[--radix-popover-trigger-width] p-0" align="start">
		<Command.Root shouldFilter={false}>
			<Command.Input
				bind:value={search}
				placeholder="Rechercher par titre ou catégorie…"
				class="h-9"
			/>
			<Command.List class="max-h-72 overflow-y-auto">
				{#if grouped.size === 0}
					<Command.Empty>Aucune vidéo trouvée.</Command.Empty>
				{/if}

				{#if value}
					<Command.Group>
						<Command.Item onSelect={clear} class="text-muted-foreground italic">
							Effacer la sélection
						</Command.Item>
					</Command.Group>
					<Command.Separator />
				{/if}

				{#each grouped.entries() as [cat, items]}
					<Command.Group heading={categoryLabels[cat] ?? cat}>
						{#each items as video (video.id)}
							<Command.Item
								value={video.id}
								onSelect={() => select(video.id)}
								class="flex items-center gap-2"
							>
								<Check class="size-4 shrink-0 {video.id === value ? 'opacity-100' : 'opacity-0'}" />
								<span class="truncate">{video.title}</span>
							</Command.Item>
						{/each}
					</Command.Group>
				{/each}
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
