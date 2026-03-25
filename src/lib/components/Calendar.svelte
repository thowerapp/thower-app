<script lang="ts">
	export type CalendarDay = {
		name: string;
		enabled: boolean;
		date: Date;
	};

	export type CalendarItem = {
		title: string;
		className?: string;
		date: Date;
		len?: number;
		startRow?: number;
		startCol?: number;
		isBottom?: boolean;
		detailHeader?: string;
		detailContent?: string;
		vlen?: number;
		[key: string]: unknown;
	};

	let {
		headers = [] as string[],
		days = [] as CalendarDay[],
		items = [] as CalendarItem[],
		onDayClick = (_d: CalendarDay) => {},
		onItemClick = (_i: CalendarItem) => {},
		onHeaderClick = (_h: string) => {}
	}: {
		headers?: string[];
		days?: CalendarDay[];
		items?: CalendarItem[];
		onDayClick?: (day: CalendarDay) => void;
		onItemClick?: (item: CalendarItem) => void;
		onHeaderClick?: (header: string) => void;
	} = $props();
</script>

<div class="calendar-grid">
	{#each headers as header}
		<span
			class="calendar-day-name"
			role="button"
			tabindex="0"
			onclick={() => onHeaderClick(header)}
			onkeydown={(e) => e.key === 'Enter' && onHeaderClick(header)}>{header}</span
		>
	{/each}

	{#each days as day}
		{#if day.enabled}
			<span
				class="calendar-day"
				role="button"
				tabindex="0"
				onclick={() => onDayClick(day)}
				onkeydown={(e) => e.key === 'Enter' && onDayClick(day)}>{day.name}</span
			>
		{:else}
			<span
				class="calendar-day calendar-day-disabled"
				role="button"
				tabindex="0"
				onclick={() => onDayClick(day)}
				onkeydown={(e) => e.key === 'Enter' && onDayClick(day)}>{day.name}</span
			>
		{/if}
	{/each}

	{#each items as item}
		<section
			class="calendar-task {item.className ?? ''}"
			style="grid-column: {item.startCol ?? 1} / span {item.len ?? 1};
			grid-row: {item.startRow ?? 1};
			align-self: {item.isBottom ? 'end' : 'center'};"
			role="button"
			tabindex="0"
			onclick={() => onItemClick(item)} onkeydown={(e) => e.key === 'Enter' && onItemClick(item)}>
			{item.title}
			{#if item.detailHeader}
				<div class="calendar-task-detail">
					<h3 class="calendar-task-detail-title">{item.detailHeader}</h3>
					{#if item.detailContent}
						<p class="calendar-task-detail-content">{item.detailContent}</p>
					{/if}
				</div>
			{/if}
		</section>
	{/each}
</div>

<style>
	.calendar-grid {
		display: grid;
		width: 100%;
		grid-template-columns: repeat(7, minmax(100px, 1fr));
		grid-template-rows: 50px;
		grid-auto-rows: 110px;
		overflow: auto;
		border-radius: 8px;
		border: 1px solid var(--border, #e5e7eb);
		background: var(--background, #fff);
	}

	.calendar-day {
		border-bottom: 1px solid rgba(166, 168, 179, 0.12);
		border-right: 1px solid rgba(166, 168, 179, 0.12);
		text-align: right;
		padding: 10px 14px;
		font-size: 13px;
		box-sizing: border-box;
		color: var(--muted-foreground, #6b7280);
		position: relative;
		z-index: 1;
		cursor: pointer;
	}
	.calendar-day:nth-of-type(7n + 7) {
		border-right: 0;
	}
	.calendar-day:nth-of-type(n + 1):nth-of-type(-n + 7) {
		grid-row: 1;
	}
	.calendar-day:nth-of-type(n + 8):nth-of-type(-n + 14) {
		grid-row: 2;
	}
	.calendar-day:nth-of-type(n + 15):nth-of-type(-n + 21) {
		grid-row: 3;
	}
	.calendar-day:nth-of-type(n + 22):nth-of-type(-n + 28) {
		grid-row: 4;
	}
	.calendar-day:nth-of-type(n + 29):nth-of-type(-n + 35) {
		grid-row: 5;
	}
	.calendar-day:nth-of-type(n + 36):nth-of-type(-n + 42) {
		grid-row: 6;
	}
	.calendar-day:nth-of-type(7n + 1) {
		grid-column: 1;
	}
	.calendar-day:nth-of-type(7n + 2) {
		grid-column: 2;
	}
	.calendar-day:nth-of-type(7n + 3) {
		grid-column: 3;
	}
	.calendar-day:nth-of-type(7n + 4) {
		grid-column: 4;
	}
	.calendar-day:nth-of-type(7n + 5) {
		grid-column: 5;
	}
	.calendar-day:nth-of-type(7n + 6) {
		grid-column: 6;
	}
	.calendar-day:nth-of-type(7n + 7) {
		grid-column: 7;
	}

	.calendar-day-name {
		font-size: 11px;
		text-transform: uppercase;
		color: var(--muted-foreground, #9ca3af);
		text-align: center;
		border-bottom: 1px solid rgba(166, 168, 179, 0.12);
		line-height: 50px;
		font-weight: 600;
		cursor: pointer;
	}

	.calendar-day-disabled {
		color: rgba(152, 160, 166, 0.5);
		background-image: url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23f8fafc' fill-opacity='0.5' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E");
	}

	.calendar-task {
		border-left-width: 3px;
		border-left-style: solid;
		padding: 6px 10px;
		margin: 6px;
		font-size: 12px;
		position: relative;
		align-self: center;
		z-index: 2;
		border-radius: 8px;
		cursor: pointer;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.calendar-task--sport {
		border-left-color: #f59e0b;
		background: rgba(254, 243, 199, 0.9);
		color: #b45309;
	}
	.calendar-task--nutrition {
		border-left-color: #10b981;
		background: rgba(209, 250, 229, 0.9);
		color: #047857;
	}
	.calendar-task--primary {
		border-left-color: #3b82f6;
		background: rgba(219, 234, 254, 0.9);
		color: #1d4ed8;
	}
	.calendar-task-detail {
		position: absolute;
		left: 0;
		top: calc(100% + 6px);
		background: var(--card, #fff);
		border: 1px solid rgba(166, 168, 179, 0.2);
		padding: 12px;
		box-sizing: border-box;
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
		z-index: 10;
		min-width: 160px;
	}
	.calendar-task-detail-title {
		font-size: 13px;
		margin: 0 0 4px 0;
		font-weight: 600;
	}
	.calendar-task-detail-content {
		font-size: 12px;
		margin: 0;
		white-space: pre-wrap;
	}
</style>
