<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$shadcn/button';
	import { LayoutDashboard } from 'lucide-svelte';
	import Calendar from '$lib/components/calendar/Calendar.svelte';

	let { data }: { data: PageData } = $props();

	const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

	interface CalendarDay {
		name: string;
		enabled: boolean;
		date: Date;
	}

	interface CalendarItem {
		title: string;
		className?: string;
		date: Date;
		len: number;
		startCol?: number;
		startRow?: number;
		isBottom?: boolean;
		detailHeader?: string;
		detailContent?: string;
		vlen?: number;
	}

	let headers: string[] = [];
	let now = new Date();
	let year = now.getFullYear();
	let month = now.getMonth();
	let eventText = 'Click an item or date';

	let days: CalendarDay[] = [];
	let items: CalendarItem[] = [];

	function randInt(max: number): number {
		return Math.floor(Math.random() * max) + 1;
	}

	function initMonthItems() {
		let y = year;
		let m = month;
		let d1=new Date(y,m,randInt(7)+7);
		items=[
			{title:"11:00 Task Early in month",className:"task--primary",date:new Date(y,m,randInt(6)),len:randInt(4)+1},
			{title:"7:30 Wk 2 tasks",className:"task--warning",date:d1,len:randInt(4)+2},
			{title:"Overlapping Stuff (isBottom:true)",date:d1,className:"task--info",len:4,isBottom:true},
			{title:"10:00 More Stuff to do",date:new Date(y,m,randInt(7)+14),className:"task--info",len:randInt(4)+1,detailHeader:"Difficult",detailContent:"But not especially so"},
			{title:"All day task",date:new Date(y,m,randInt(7)+21),className:"task--danger",len:1,vlen:2},
		];

		// This is where you calc the row/col to put each dated item
		for (const i of items) {
			const rc = findRowCol(i.date);
			if (rc == null) {
				console.log("didn't find date for ", i);
				i.startCol = 0;
				i.startRow = 0;
			} else {
				i.startCol = rc.col;
				i.startRow = rc.row;
			}
		}
	}

	$: month,year,initContent();

	// choose what date/day gets displayed in each date box.
	function initContent() {
		headers = dayNames;
		initMonth();
		initMonthItems();
	}

	function initMonth() {
		days = [];
		let monthAbbrev = monthNames[month].slice(0,3);
		let nextMonthAbbrev = monthNames[(month+1)%12].slice(0,3);
		//	find the last Monday of the previous month
		var firstDay = new Date(year, month, 1).getDay();
		//console.log('fd='+firstDay+' '+dayNames[firstDay]);
		var daysInThisMonth = new Date(year, month+1, 0).getDate();
		var daysInLastMonth = new Date(year, month, 0).getDate();
		var prevMonth = month==0 ? 11 : month-1;
		
		//	show the days before the start of this month (disabled) - always less than 7
		for (let i=daysInLastMonth-firstDay;i<daysInLastMonth;i++) {
			let d = new Date(prevMonth==11?year-1:year,prevMonth,i+1);
			days.push({name:''+(i+1),enabled:false,date:d,});
		}
		//	show the days in this month (enabled) - always 28 - 31
		for (let i=0;i<daysInThisMonth;i++) {
			let d = new Date(year,month,i+1);
			if (i==0) days.push({name:monthAbbrev+' '+(i+1),enabled:true,date:d,});
			else days.push({name:''+(i+1),enabled:true,date:d,});
			//console.log('i='+i+'  dt is '+d+' date() is '+d.getDate());
		}
		//	show any days to fill up the last row (disabled) - always less than 7
		for (let i=0;days.length%7;i++) {
			let d = new Date((month==11?year+1:year),(month+1)%12,i+1);
			if (i==0) days.push({name:nextMonthAbbrev+' '+(i+1),enabled:false,date:d,});
			else days.push({name:''+(i+1),enabled:false,date:d,});
		}
	}

	function findRowCol(dt: Date): { row: number; col: number } | null {
		for (let i = 0; i < days.length; i++) {
			const d = days[i].date;
			if (d.getFullYear() === dt.getFullYear()
				&& d.getMonth() === dt.getMonth()
				&& d.getDate() === dt.getDate())
				return { row: Math.floor(i / 7) + 2, col: (i % 7) + 1 };
		}
		return null;
	}

	function itemClick(e: CalendarItem) {
		eventText = 'itemClick ' + JSON.stringify(e) + ' localtime=' + e.date.toString();
	}
	function dayClick(e: CalendarDay) {
		eventText = 'onDayClick ' + JSON.stringify(e) + ' localtime=' + e.date.toString();
	}
	function headerClick(e: string) {
		eventText = 'onHheaderClick ' + JSON.stringify(e);
	}
	function next() {
		month++;
		if (month == 12) {
			year++;
			month=0;
		}
	}
	function prev() {
		if (month==0) {
			month=11;
			year--;
		} else {
			month--;
		}
	}
	
</script>

<!-- Admin Dashboard Access -->
{#if data.isAdmin}
	<div class="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
		<div class="text-center space-y-3">
			<h1 class="text-3xl font-bold">Administration</h1>
			<p class="text-muted-foreground text-lg">
				Bienvenue {data.user?.name || data.user?.username || 'Administrateur'}, vous êtes connecté en tant qu'administrateur.
			</p>
		</div>
		<a href="/admin">
			<Button size="lg" class="gap-2">
				<LayoutDashboard class="w-5 h-5" />
				Accéder au dashboard admin
			</Button>
		</a>
	</div>
{:else}
	<!-- Regular User Profile Content -->
	<div class="calendar-container">
		<div class="calendar-header">
			<h1>
				<button on:click={()=>year--}>&Lt;</button>
				<button on:click={()=>prev()}>&lt;</button>
				{monthNames[month]} {year}
				<button on:click={()=>next()}>&gt;</button>
				<button on:click={()=>year++}>&Gt;</button>
			</h1>
			{eventText}
		</div>

		<Calendar
			{headers}
			{days}
			{items}
			on:dayClick={(e)=>dayClick(e.detail)}
			on:itemClick={(e)=>itemClick(e.detail)}
			on:headerClick={(e)=>headerClick(e.detail)}
			/>
	</div>
{/if}
	
<style>
.calendar-container {
  width: 90%;
  margin: auto;
  overflow: hidden;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  background: #fff;
  max-width: 1200px;
}
.calendar-header {
  text-align: center;
  padding: 20px 0;
  background: #eef;
  border-bottom: 1px solid rgba(166, 168, 179, 0.12);
}
.calendar-header h1 {
  margin: 0;
  font-size: 18px;
}
.calendar-header button {
  background: #eef;
  border: 1px ;
  padding: 6;
  color: rgba(81, 86, 93, 0.7);
  cursor: pointer;
  outline: 0;
}
</style>



