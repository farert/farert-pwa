<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>経路運賃営業キロ計算アプリ Farert</title>
	<link rel="icon" href="/favicon.png" />
</svelte:head>

{@render children()}
