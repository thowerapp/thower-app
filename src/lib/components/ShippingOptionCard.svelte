<script lang="ts">
	import { CheckCircle, XCircle, MapPin, Home, Clock, Shield, Truck } from 'lucide-svelte';
	
	export let option: any;
	export let isSelected: boolean;
	export let onSelect: (option: any) => void;
	
	// Fonction pour obtenir l'icône du transporteur
	function getCarrierIcon(carrierName: string) {
		switch (carrierName.toLowerCase()) {
			case 'ups':
				return Truck;
			case 'chronopost':
				return Clock;
			case 'colissimo':
				return Shield;
			case 'mondial relay':
				return MapPin;
			default:
				return Truck;
		}
	}
	
	// Fonction pour obtenir la couleur du transporteur
	function getCarrierColor(carrierName: string) {
		switch (carrierName.toLowerCase()) {
			case 'ups':
				return 'bg-brown-100 text-brown-800 border-brown-200';
			case 'chronopost':
				return 'bg-blue-100 text-blue-800 border-blue-200';
			case 'colissimo':
				return 'bg-green-100 text-green-800 border-green-200';
			case 'mondial relay':
				return 'bg-purple-100 text-purple-800 border-purple-200';
			default:
				return 'bg-gray-100 text-gray-800 border-gray-200';
		}
	}
	
	// Fonction pour obtenir le délai de livraison
	function getDeliveryTime(leadTime: number | undefined) {
		if (!leadTime) return 'Délai non précisé';
		if (leadTime === 1) return 'Livraison en 24h';
		if (leadTime === 2) return 'Livraison en 48h';
		return `Livraison en ${leadTime} jours`;
	}
	
	// Fonction pour obtenir les fonctionnalités clés
	function getKeyFeatures(option: any) {
		const features = [];
		
		if (option.functionalities?.signature) {
			features.push('Signature obligatoire');
		}
		
		if (option.functionalities?.last_mile === 'service_point') {
			features.push('Point relais');
		} else {
			features.push('Livraison domicile');
		}
		
		if (option.product.name.includes('Express')) {
			features.push('Service express');
		} else if (option.product.name.includes('Standard')) {
			features.push('Service standard');
		}
		
		return features;
	}
</script>

<button 
	type="button"
	class="relative border rounded-lg p-4 transition-all duration-200 cursor-pointer hover:shadow-md text-left w-full {isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}"
	on:click={() => onSelect(option)}
	on:keydown={(e) => e.key === 'Enter' && onSelect(option)}
>
	<!-- Radio button -->
	<div class="absolute top-4 right-4">
		<div class="w-5 h-5 rounded-full border-2 flex items-center justify-center {isSelected ? 'border-primary bg-primary' : 'border-gray-300'}">
			{#if isSelected}
				<div class="w-2.5 h-2.5 rounded-full bg-white"></div>
			{/if}
		</div>
	</div>
	
	<!-- Header avec transporteur et prix -->
	<div class="flex items-start justify-between mb-3">
		<div class="flex items-center gap-3">
			<div class="p-2 rounded-lg {getCarrierColor(option.carrier.name)}">
				<svelte:component this={getCarrierIcon(option.carrier.name)} class="w-5 h-5" />
			</div>
			<div>
				<h3 class="font-semibold text-lg">{option.carrier.name}</h3>
				<p class="text-sm text-gray-600">{option.product.name}</p>
			</div>
		</div>
		
		<div class="text-right">
			<div class="text-2xl font-bold text-primary">
				{option.quotes?.[0]?.price?.total?.value ? option.quotes[0].price.total.value + ' €' : 'N/A'}
			</div>
			{#if option.quotes?.[0]?.lead_time}
				<div class="text-sm text-gray-500">{getDeliveryTime(option.quotes[0].lead_time)}</div>
			{/if}
		</div>
	</div>
	
	<!-- Fonctionnalités clés -->
	<div class="flex flex-wrap gap-2 mb-3">
		{#each getKeyFeatures(option) as feature}
			<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
				{feature}
			</span>
		{/each}
	</div>
	
	<!-- Détails spécifiques par transporteur -->
	{#if option.carrier.name === 'UPS'}
		<div class="space-y-2 text-sm text-gray-600">
			<div class="flex items-center gap-2">
				{#if option.functionalities?.signature}
					<CheckCircle class="w-4 h-4 text-green-600" />
					<span>Signature obligatoire - Livraison sécurisée</span>
				{:else}
					<XCircle class="w-4 h-4 text-gray-500" />
					<span>Sans signature - Plus flexible</span>
				{/if}
			</div>
			
			<div class="flex items-center gap-2">
				{#if option.functionalities?.last_mile === 'service_point'}
					<MapPin class="w-4 h-4 text-blue-600" />
					<span>Retrait en point relais</span>
				{:else}
					<Home class="w-4 h-4 text-orange-600" />
					<span>Livraison à domicile</span>
				{/if}
			</div>
			
			{#if option.product.name.includes('Express')}
				<div class="flex items-center gap-2">
					<Clock class="w-4 h-4 text-red-600" />
					<span>Service express - Livraison prioritaire</span>
				</div>
			{:else if option.product.name.includes('Standard')}
				<div class="flex items-center gap-2">
					<Truck class="w-4 h-4 text-gray-600" />
					<span>Service standard - Économique</span>
				</div>
			{/if}
		</div>
		
	{:else if option.carrier.name === 'Chronopost'}
		<div class="space-y-2 text-sm text-gray-600">
			{#if option.product.name.includes('Express')}
				<div class="flex items-center gap-2">
					<Clock class="w-4 h-4 text-red-600" />
					<span>Livraison express en 24h</span>
				</div>
			{:else if option.product.name.includes('Relais')}
				<div class="flex items-center gap-2">
					<MapPin class="w-4 h-4 text-blue-600" />
					<span>Retrait en point relais</span>
				</div>
			{:else}
				<div class="flex items-center gap-2">
					<Truck class="w-4 h-4 text-gray-600" />
					<span>Service standard en 2-3 jours</span>
				</div>
			{/if}
		</div>
		
	{:else if option.carrier.name === 'Colissimo'}
		<div class="space-y-2 text-sm text-gray-600">
			<div class="flex items-center gap-2">
				{#if option.functionalities?.signature}
					<Shield class="w-4 h-4 text-green-600" />
					<span>Signature obligatoire - Plus sécurisé</span>
				{:else}
					<XCircle class="w-4 h-4 text-gray-500" />
					<span>Sans signature - Plus flexible</span>
				{/if}
			</div>
		</div>
		
	{:else if option.carrier.name === 'Mondial Relay'}
		<div class="space-y-2 text-sm text-gray-600">
			<div class="flex items-center gap-2">
				<MapPin class="w-4 h-4 text-purple-600" />
				<span>Retrait en point relais</span>
			</div>
			{#if option.product.name.includes('QR')}
				<div class="flex items-center gap-2">
					<CheckCircle class="w-4 h-4 text-green-600" />
					<span>Code QR pour retrait simplifié</span>
				</div>
			{/if}
		</div>
	{/if}
	
	<!-- Indicateur de sélection -->
	{#if isSelected}
		<div class="absolute top-0 left-0 w-full h-1 bg-primary rounded-t-lg"></div>
	{/if}
</button>
