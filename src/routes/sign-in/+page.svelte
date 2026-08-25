<script lang="ts">
	import ClerkWidget from '$lib/ClerkWidget.svelte';
</script>

<svelte:head><title>Logowanie · Curio</title></svelte:head>

<main class="auth-page">
	<ClerkWidget mode="sign-in" />
</main>

<style>
	.auth-page { display: grid; min-height: calc(100vh - 100px); padding: 40px 16px; place-items: center; }
</style>
