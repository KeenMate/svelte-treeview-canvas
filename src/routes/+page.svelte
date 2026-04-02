<script>
	import { onMount } from 'svelte';

	const version = 'v1.0.0-rc03';

	const examples = [
		{
			href: '/examples/interaction',
			icon: '🖱️',
			title: 'Interaction',
			description: 'Click behavior modes, multi-select with Ctrl/Shift+click, rectangle selection, and keyboard navigation.'
		},
		{
			href: '/examples/canvas-dendrogram',
			icon: '🖼️',
			title: 'Canvas Dendrogram',
			description: 'Canvas 2D dendrogram for 5000+ nodes with pan, zoom, click expand/collapse, and drag-drop.'
		},
		{
			href: '/examples/org-chart',
			icon: '🏢',
			title: 'Org Chart',
			description: 'Management org chart with business-card nodes featuring avatars, departments, and status indicators.'
		},
		{
			href: '/examples/nhl-playoffs',
			icon: '🏒',
			title: 'NHL Playoff Bracket',
			description: 'Tournament bracket with custom matchup cards showing team names, seeds, and series scores.'
		},
		{
			href: '/examples/context-menu',
			icon: '📋',
			title: 'Context Menu',
			description: 'Right-click menus with icons, shortcuts, submenus, named dividers, disabled/hidden items, and danger actions.'
		},
		{
			href: '/examples/theming',
			icon: '🎨',
			title: 'Theming',
			description: 'Shared --base-* CSS design tokens that flow into the canvas theme. Presets, priority chain, dark mode.'
		},
		{
			href: '/examples/branch-operations',
			icon: '🌿',
			title: 'Branch Operations',
			description: 'Bulk subtree operations — insertBranch, replaceBranch, deleteBranch — with single emission on canvas.'
		},
		{
			href: '/dev/layout-modes',
			icon: '🔧',
			title: 'Layout Modes',
			badge: 'dev',
			description: 'Development page testing all CanvasTree layout modes with configuration controls.'
		},
		{
			href: '/dev/json-loader',
			icon: '📂',
			title: 'JSON Loader',
			badge: 'dev',
			description: 'Load custom JSON files, configure settings, and test canvas rendering performance.'
		}
	];

	onMount(() => {
		document.body.classList.add('landing-body');
		return () => {
			document.body.classList.remove('landing-body');
		};
	});
</script>

<svelte:head>
	<title>Svelte Treeview Canvas Examples</title>
</svelte:head>

<div class="page-container">
	<header class="header-card">
		<h1>Svelte Treeview Canvas</h1>
		<p class="subtitle">Canvas 2D rendering for @keenmate/svelte-treeview</p>
		<span class="version-badge">{version}</span>
	</header>

	<div class="cards">
		{#each examples as example}
			<a href={example.href} class="card-link">
				<div class="card-icon">{example.icon}</div>
				<h2 class="card-title">
					{example.title}
					{#if example.badge}
						<span class="badge">{example.badge}</span>
					{/if}
				</h2>
				<p class="card-description">{example.description}</p>
			</a>
		{/each}
	</div>

	<footer>
		<p>
			Created by <a href="https://github.com/keenmate" target="_blank">KeenMate</a> |
			<a href="https://github.com/keenmate/svelte-treeview-canvas" target="_blank">GitHub</a> |
			<a href="https://www.npmjs.com/package/@keenmate/svelte-treeview-canvas" target="_blank">npm</a>
		</p>
	</footer>
</div>
