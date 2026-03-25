<script lang="ts">
	import * as Collapsible from '$shadcn/collapsible';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import type { UserSelected } from '../types';

	let { userSelected }: { userSelected: UserSelected } = $props();
	let open = $state(false);
</script>

<div class="space-y-6">
	<Collapsible.Root bind:open>
		<Collapsible.Trigger class="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50">
			<ChevronDown class="size-4 transition-transform {open ? 'rotate-180' : ''}" />
			Données brutes (JSON)
		</Collapsible.Trigger>
		<Collapsible.Content>
			<div class="mt-2 rounded-lg border bg-muted/30 overflow-auto p-4">
				<pre class="text-xs font-mono whitespace-pre-wrap break-all">{JSON.stringify(userSelected, null, 2)}</pre>
			</div>
		</Collapsible.Content>
	</Collapsible.Root>
</div>
