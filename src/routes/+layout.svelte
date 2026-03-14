<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';

	let { children } = $props();

	onMount(() => {
		let theme: 'light' | 'dark' = 'light';

		if (typeof localStorage !== 'undefined') {
			const stored = localStorage.getItem('theme');
			if (stored === 'light' || stored === 'dark') {
				theme = stored;
			}
		}

		if (typeof window !== 'undefined' && theme === 'light') {
			if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
				theme = 'dark';
			}
		}

		if (typeof document !== 'undefined') {
			document.documentElement.setAttribute('data-theme', theme);
		}
	});
</script>

<svelte:head>
	<title>経路運賃営業キロ計算アプリ Farert</title>
	<link rel="icon" href="/favicon.png" />
</svelte:head>

{@render children()}
