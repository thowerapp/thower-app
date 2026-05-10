<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$shadcn/button';
	import * as Table from '$shadcn/table';
	import TableRow from '$shadcn/table/table-row.svelte';
	import TableCell from '$shadcn/table/table-cell.svelte';
	import { Input } from '$shadcn/input';
	import * as Popover from '$shadcn/popover/index.js';
	import * as RadioGroup from '$shadcn/radio-group/index.js';
	import * as DropdownMenu from '$shadcn/dropdown-menu/index.js';
	import * as AlertDialog from '$shadcn/alert-dialog/index.js';
	import { Label } from '$shadcn/label';
	import * as Tooltip from '$shadcn/tooltip/index.js';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import { Plus } from 'lucide-svelte';

	interface TableColumn {
		key: string;
		label: string;
		formatter?: (v: unknown) => unknown;
	}

	interface TableItem {
		id: string;
		[key: string]: unknown;
	}

	type FormTableAction = {
		type: 'form';
		name: string;
		url: string | ((item: TableItem) => string);
		icon?: unknown;
		/** Si false, soumet directement sans dialog de confirmation. Défaut : true */
		confirm?: boolean;
		onSuccess?: (item: TableItem) => void;
		// kept for API compat with existing callers, not used internally
		enhanceAction?: unknown;
	};

	let {
		data,
		columns,
		name,
		actions = null,
		addLink = null
	} = $props<{
		data: TableItem[];
		columns: TableColumn[];
		name: string;
		actions?: Array<{
			type: string;
			name: string;
			url: string | ((item: TableItem) => string);
			icon?: unknown;
			confirm?: boolean;
			onSuccess?: (item: TableItem) => void;
			enhanceAction?: unknown;
		}> | null;
		addLink?: string | null;
	}>();

	let searchQuery = $state('');
	let currentPage = $state(1);
	let itemsPerPage = $state(5);

	const optionPage = $state([
		{ label: '5', value: 5 },
		{ label: '10', value: 10 },
		{ label: '15', value: 15 },
		{ label: '20', value: 20 }
	]);

	let itemsPerPageString = $state('5');
	let sortColumn = $state('');
	let sortDirection = $state('asc');
	let filteredItems = $state<TableItem[]>([]);
	let paginatedItems = $state<TableItem[]>([]);

	let pendingFormDialog = $state<{ item: TableItem; action: FormTableAction } | null>(null);
	let formConfirmOpen = $state(false);

	function closeFormConfirm() {
		formConfirmOpen = false;
		pendingFormDialog = null;
	}

	function openFormConfirm(item: TableItem, action: FormTableAction) {
		pendingFormDialog = { item, action };
		formConfirmOpen = true;
	}

	const initialColumnsVisibility = $derived.by(() =>
		columns.reduce((acc: Record<string, boolean>, col: TableColumn) => {
			acc[col.key] = true;
			return acc;
		}, {} as Record<string, boolean>)
	);
	let userVisibilityOverrides = $state<Record<string, boolean>>({});
	const columnsVisibility = $derived.by(() => ({ ...initialColumnsVisibility, ...userVisibilityOverrides }));

	const sortItems = (column: string) => {
		if (sortColumn === column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = column;
			sortDirection = 'asc';
		}

		data = data.sort((a: TableItem, b: TableItem) => {
			let aValue: unknown = a[column];
			let bValue: unknown = b[column];

			if (typeof aValue === 'string' && typeof bValue === 'string') {
				aValue = aValue.toLowerCase();
				bValue = bValue.toLowerCase();
			}

			return ((aValue as string | number) < (bValue as string | number) ? -1 : 1) * (sortDirection === 'asc' ? 1 : -1);
		});

		updateFilteredAndPaginatedItems();
	};

	const updateFilteredAndPaginatedItems = () => {
		const filtered = data.filter((item: TableItem) =>
			Object.values(item).some((value) =>
				String(value).toLowerCase().includes(searchQuery.toLowerCase())
			)
		);
		filteredItems = filtered;

		const start = (currentPage - 1) * itemsPerPage;
		const end = start + itemsPerPage;
		paginatedItems = filtered.slice(start, end);
	};

	updateFilteredAndPaginatedItems();

	$effect(() => {
		void data;
		updateFilteredAndPaginatedItems();
	});

	$effect(() => {
		if (!pendingFormDialog) return;
		const stillHere = data.some((d: TableItem) => d.id === pendingFormDialog!.item.id);
		if (!stillHere) {
			closeFormConfirm();
		}
	});

	const changePage = (page: number) => {
		currentPage = page;
		updateFilteredAndPaginatedItems();
	};

	const changeItemsPerPage = (items: number) => {
		itemsPerPage = items;
		currentPage = 1;
		updateFilteredAndPaginatedItems();
	};

	$effect(() => {
		const newItems = parseInt(itemsPerPageString, 10);
		if (newItems !== itemsPerPage) {
			changeItemsPerPage(newItems);
		}
	});

	function resolveUrl(action: FormTableAction, item: TableItem): string {
		return typeof action.url === 'function' ? action.url(item) : action.url;
	}
</script>

<div class="rcs w-[90%]">
	<div class="w-full mt-10">
		<div class="border rounded p-2">
			<h2 class="text-2xl font-bold mb-5">{name}</h2>

			<div class="rcb mb-5 w-full">
				<div class="flex items-center space-x-4">
					<Input
						type="text"
						placeholder="Cherchez dans le tableau"
						class="max-w-xs"
						bind:value={searchQuery}
						oninput={updateFilteredAndPaginatedItems}
					/>

					<Popover.Root>
						<Popover.Trigger class="border rounded px-2 py-1">
							{itemsPerPage}
						</Popover.Trigger>
						<Popover.Content class="p-4 border rounded w-48 bg-white shadow-lg">
							<div class="mb-2 font-medium">nombre d'items :</div>
							<RadioGroup.Root bind:value={itemsPerPageString} class="space-y-2">
								{#each optionPage as option}
									<div class="flex items-center space-x-2">
										<RadioGroup.Item value={String(option.value)} id={'option' + option.value} />
										<Label for={'option' + option.value}>{option.label}</Label>
									</div>
								{/each}
							</RadioGroup.Root>
						</Popover.Content>
					</Popover.Root>

					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							<Button variant="outline" class="ml-auto">
								Colonnes <ChevronDown class="ml-2 size-4" />
							</Button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							{#each columns as column (column.key)}
								<DropdownMenu.CheckboxItem
									class="capitalize"
									checked={columnsVisibility[column.key]}
									onCheckedChange={(value) => {
										userVisibilityOverrides = {
											...userVisibilityOverrides,
											[column.key]: value
										};
									}}
								>
									{column.label}
								</DropdownMenu.CheckboxItem>
							{/each}
						</DropdownMenu.Content>
					</DropdownMenu.Root>

				{#if addLink}
					<Button href={addLink} class="ml-auto">
						<Plus class="size-4" />
					</Button>
					{/if}
				</div>
			</div>

			<div class="border rounded">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							{#each columns.filter((col: TableColumn) => columnsVisibility[col.key]) as column}
								<Table.Head class="border-r border-r-gray-800 pr-2">
									<div class="rcb">
										{column.label}
										<button onclick={() => sortItems(column.key)}>
											<ChevronDown class="cursor-pointer" />
										</button>
									</div>
								</Table.Head>
							{/each}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each paginatedItems as item (item.id)}
							<TableRow>
								{#each columns.filter((col: TableColumn) => columnsVisibility[col.key]) as column}
									<td class="border border-gray-300 p-2">
										{#if column.key === 'images'}
											{@html item[column.key]}
										{:else if column.formatter}
											{column.formatter(item[column.key])}
										{:else}
											{item[column.key]}
										{/if}
									</td>
								{/each}

								{#if actions && actions.length > 0}
									{#each actions as action}
										<TableCell>
											{#if action.type === 'link'}
												<Tooltip.Provider>
													<Tooltip.Root>
														<Tooltip.Trigger>
															<a href={action.url(item)} class="border rounded p-2">
																{#if action.icon}
																	<action.icon class="h-4 w-4 inline" />
																{/if}
															</a>
														</Tooltip.Trigger>
														<Tooltip.Content>
															<p>{action.name}</p>
														</Tooltip.Content>
													</Tooltip.Root>
												</Tooltip.Provider>
										{:else if action.type === 'form'}
											<Tooltip.Provider>
												<Tooltip.Root>
													<Tooltip.Trigger>
														{#if action.confirm === false}
															<form
																method="POST"
																action={resolveUrl(action as FormTableAction, item)}
																use:enhance={() => async ({ update }) => {
																	(action as FormTableAction).onSuccess?.(item);
																	await update({ invalidateAll: true });
																}}
																class="inline"
															>
																<input type="hidden" name="id" value={item.id} />
																<Button type="submit" variant="outline" class="m-1 p-1 text-xs">
																	{#if action.icon}
																		<action.icon class="h-4 w-4 inline" />
																	{/if}
																</Button>
															</form>
														{:else}
															<Button
																type="button"
																variant="outline"
																class="m-1 p-1 text-xs"
																onclick={() => openFormConfirm(item, action as FormTableAction)}
															>
																{#if action.icon}
																	<action.icon class="h-4 w-4 inline" />
																{/if}
															</Button>
														{/if}
													</Tooltip.Trigger>
													<Tooltip.Content>
														<p>{action.name}</p>
													</Tooltip.Content>
												</Tooltip.Root>
											</Tooltip.Provider>
											{/if}
										</TableCell>
									{/each}
								{/if}
							</TableRow>
						{/each}
					</Table.Body>
				</Table.Root>

				{#if actions?.some((a: { type: string }) => a.type === 'form')}
					<AlertDialog.Root bind:open={formConfirmOpen} onOpenChange={(open) => !open && closeFormConfirm()}>
						<AlertDialog.Content>
							<AlertDialog.Header>
								<AlertDialog.Title>Confirmer l'action</AlertDialog.Title>
								<AlertDialog.Description>
									{#if pendingFormDialog?.item?.title != null && String(pendingFormDialog.item.title) !== ''}
										<span class="mt-3 block font-medium text-foreground">
											{String(pendingFormDialog.item.title)}
										</span>
									{:else if pendingFormDialog?.item?.label != null}
										<span class="mt-3 block font-medium text-foreground">
											{String(pendingFormDialog.item.label)}
										</span>
									{/if}
								</AlertDialog.Description>
							</AlertDialog.Header>
							<AlertDialog.Footer>
								<AlertDialog.Cancel type="button">Annuler</AlertDialog.Cancel>
								{#if pendingFormDialog}
									<form
										method="POST"
										action={resolveUrl(pendingFormDialog.action, pendingFormDialog.item)}
										use:enhance={() => {
											return async ({ update, result }) => {
												if (result.type === 'success' || result.type === 'redirect') {
													pendingFormDialog?.action?.onSuccess?.(pendingFormDialog.item);
												}
												await update({ invalidateAll: true });
											};
										}}
										class="contents"
									>
										<input type="hidden" name="id" value={pendingFormDialog.item.id} />
										<Button type="submit" variant="destructive" size="sm">Confirmer</Button>
									</form>
								{/if}
							</AlertDialog.Footer>
						</AlertDialog.Content>
					</AlertDialog.Root>
				{/if}
			</div>

			<div class="pagination-controls mt-4 rce">
				{#if currentPage > 1}
					<Button onclick={() => changePage(currentPage - 1)}>Previous</Button>
				{/if}
				<div class="">
					{#each Array(Math.ceil(filteredItems.length / itemsPerPage)) as _, pageIndex}
						<Button class="mx-1" onclick={() => changePage(pageIndex + 1)}>{pageIndex + 1}</Button>
					{/each}
				</div>
				{#if currentPage < Math.ceil(filteredItems.length / itemsPerPage)}
					<Button onclick={() => changePage(currentPage + 1)}>Next</Button>
				{/if}
			</div>
		</div>
	</div>
</div>
