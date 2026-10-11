<script lang="ts">
import type { PageData } from './$types';
import DiscoveryVideoPage from '$lib/components/DiscoveryVideoPage.svelte';

let { data }: { data: PageData } = $props();
</script>

<DiscoveryVideoPage video={data.video} />
