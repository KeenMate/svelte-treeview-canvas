<script lang="ts">
	import { CanvasTree } from '$lib/index.js';
	import type { LTreeNode, ContextMenuEntry } from '@keenmate/svelte-treeview';
	import type { TreeController } from '@keenmate/svelte-treeview';

	// ── Types ──────────────────────────────────────────────────────────────

	interface Item {
		id: number;
		path: string;
		parentPath: string;
		level: number;
		name: string;
		role: string;
		email: string;
		status: 'active' | 'away' | 'busy';
		hasChildren: boolean;
		readonly: boolean;
	}

	// ── Sample data ──────────────────────────────────────────────────────

	const sampleData: Item[] = [
		{ id: 1,  path: '1',       parentPath: '',    level: 1, name: 'Engineering',     role: 'Department',       email: 'eng@acme.com',      status: 'active', hasChildren: true,  readonly: true },
		{ id: 2,  path: '1.1',     parentPath: '1',   level: 2, name: 'Frontend',        role: 'Team',             email: 'fe@acme.com',       status: 'active', hasChildren: true,  readonly: false },
		{ id: 3,  path: '1.1.1',   parentPath: '1.1', level: 3, name: 'Alice Chen',      role: 'Senior Developer', email: 'alice@acme.com',    status: 'active', hasChildren: false, readonly: false },
		{ id: 4,  path: '1.1.2',   parentPath: '1.1', level: 3, name: 'Bob Rivera',      role: 'Developer',        email: 'bob@acme.com',      status: 'away',   hasChildren: false, readonly: false },
		{ id: 5,  path: '1.1.3',   parentPath: '1.1', level: 3, name: 'Carol Wu',        role: 'Junior Developer', email: 'carol@acme.com',    status: 'busy',   hasChildren: false, readonly: false },
		{ id: 6,  path: '1.2',     parentPath: '1',   level: 2, name: 'Backend',         role: 'Team',             email: 'be@acme.com',       status: 'active', hasChildren: true,  readonly: false },
		{ id: 7,  path: '1.2.1',   parentPath: '1.2', level: 3, name: 'Dave Sharma',     role: 'Lead Engineer',    email: 'dave@acme.com',     status: 'active', hasChildren: false, readonly: false },
		{ id: 8,  path: '1.2.2',   parentPath: '1.2', level: 3, name: 'Eve Johnson',     role: 'Developer',        email: 'eve@acme.com',      status: 'active', hasChildren: false, readonly: true },
		{ id: 9,  path: '2',       parentPath: '',    level: 1, name: 'Design',          role: 'Department',       email: 'design@acme.com',   status: 'active', hasChildren: true,  readonly: true },
		{ id: 10, path: '2.1',     parentPath: '2',   level: 2, name: 'UX Research',     role: 'Team',             email: 'ux@acme.com',       status: 'active', hasChildren: true,  readonly: false },
		{ id: 11, path: '2.1.1',   parentPath: '2.1', level: 3, name: 'Frank Kim',       role: 'UX Researcher',    email: 'frank@acme.com',    status: 'away',   hasChildren: false, readonly: false },
		{ id: 12, path: '2.1.2',   parentPath: '2.1', level: 3, name: 'Grace Lee',       role: 'UX Designer',      email: 'grace@acme.com',    status: 'active', hasChildren: false, readonly: false },
		{ id: 13, path: '2.2',     parentPath: '2',   level: 2, name: 'Visual Design',   role: 'Team',             email: 'visual@acme.com',   status: 'active', hasChildren: false, readonly: false },
		{ id: 14, path: '3',       parentPath: '',    level: 1, name: 'Product',         role: 'Department',       email: 'product@acme.com',  status: 'active', hasChildren: true,  readonly: true },
		{ id: 15, path: '3.1',     parentPath: '3',   level: 2, name: 'PM Team',         role: 'Team',             email: 'pm@acme.com',       status: 'busy',   hasChildren: true,  readonly: false },
		{ id: 16, path: '3.1.1',   parentPath: '3.1', level: 3, name: 'Hannah Torres',   role: 'Product Manager',  email: 'hannah@acme.com',   status: 'active', hasChildren: false, readonly: false },
	];

	// ── State ────────────────────────────────────────────────────────────

	let treeData = $state.raw<Item[]>(sampleData);
	let selectedPath = $state<string | null>(null);
	let ctrlRef = $state<TreeController<Item> | null>(null);
	let eventLog = $state<string[]>([]);

	function sortByName(items: LTreeNode<Item>[]) {
		return [...items].sort((a, b) => (a.data?.name || '').localeCompare(b.data?.name || ''));
	}

	function log(msg: string) {
		const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
		eventLog = [`[${time}] ${msg}`, ...eventLog.slice(0, 19)];
	}

	// ── Menu presets ─────────────────────────────────────────────────────

	type MenuPreset = 'basic' | 'icons-shortcuts' | 'submenus' | 'dividers' | 'disabled-hidden' | 'danger' | 'full';

	let activePreset: MenuPreset = $state('full');

	const presetDescriptions: Record<MenuPreset, string> = {
		'basic': 'Simple label + onclick. No icons, no shortcuts.',
		'icons-shortcuts': 'Icons and keyboard shortcut hints on each item.',
		'submenus': 'Nested children menus that open on hover.',
		'dividers': 'Plain and named dividers to group related actions.',
		'disabled-hidden': 'Conditional isDisabled and isVisible based on node data.',
		'danger': 'className="danger" for destructive actions.',
		'full': 'Everything combined: icons, shortcuts, submenus, dividers, disabled, danger, isVisible.',
	};

	function getBasicMenu(node: LTreeNode<Item>): ContextMenuEntry[] {
		return [
			{ label: 'Select', onclick: () => { selectedPath = node.path; log(`Selected: ${node.data?.name}`); } },
			{ label: 'Log Path', onclick: () => { log(`Path: ${node.path}`); } },
			{ label: 'Alert Name', onclick: () => { log(`Alert: ${node.data?.name}`); alert(node.data?.name); } },
		];
	}

	function getIconsShortcutsMenu(node: LTreeNode<Item>): ContextMenuEntry[] {
		const d = node.data!;
		return [
			{ icon: '👤', label: 'View Profile', shortcut: 'V', onclick: () => { log(`View profile: ${d.name}`); } },
			{ icon: '✉', label: 'Send Email', shortcut: 'E', onclick: () => { log(`Email: ${d.email}`); } },
			{ icon: '📋', label: 'Copy Email', shortcut: 'Ctrl+C', onclick: async () => { await navigator.clipboard.writeText(d.email); log(`Copied: ${d.email}`); } },
			{ icon: '🔗', label: 'Copy Path', shortcut: 'Ctrl+P', onclick: async () => { await navigator.clipboard.writeText(node.path); log(`Copied path: ${node.path}`); } },
		];
	}

	function getSubmenusMenu(node: LTreeNode<Item>): ContextMenuEntry[] {
		const d = node.data!;
		return [
			{ icon: '👤', label: 'View', onclick: () => { log(`View: ${d.name}`); } },
			{
				icon: '📋', label: 'Copy As...', children: [
					{ label: 'Name', onclick: async () => { await navigator.clipboard.writeText(d.name); log(`Copied name: ${d.name}`); } },
					{ label: 'Email', onclick: async () => { await navigator.clipboard.writeText(d.email); log(`Copied email: ${d.email}`); } },
					{ label: 'Path', onclick: async () => { await navigator.clipboard.writeText(node.path); log(`Copied path: ${node.path}`); } },
					{
						label: 'Formatted', children: [
							{ label: 'JSON', onclick: () => { log(`Copy JSON for ${d.name}`); } },
							{ label: 'CSV', onclick: () => { log(`Copy CSV for ${d.name}`); } },
							{ label: 'vCard', onclick: () => { log(`Copy vCard for ${d.name}`); } },
						]
					}
				]
			},
			{
				icon: '📧', label: 'Email To...', children: [
					{ icon: '👤', label: `${d.name}`, onclick: () => { log(`Email ${d.name}`); } },
					{ icon: '👥', label: 'Team', onclick: () => { log(`Email team`); } },
					{ icon: '🏢', label: 'Department', onclick: () => { log(`Email department`); } },
				]
			},
		];
	}

	function getDividersMenu(node: LTreeNode<Item>): ContextMenuEntry[] {
		const d = node.data!;
		return [
			{ icon: '👤', label: 'View Profile', onclick: () => { log(`View: ${d.name}`); } },
			{ icon: '✏️', label: 'Edit', onclick: () => { log(`Edit: ${d.name}`); } },
			{ divider: true },
			{ icon: '📋', label: 'Copy Name', onclick: async () => { await navigator.clipboard.writeText(d.name); log(`Copied: ${d.name}`); } },
			{ icon: '✉', label: 'Copy Email', onclick: async () => { await navigator.clipboard.writeText(d.email); log(`Copied: ${d.email}`); } },
			{ divider: true, label: 'Navigation' },
			{ icon: '🔍', label: 'Focus', onclick: () => { log(`Focus: ${node.path}`); } },
			...(node.hasChildren ? [
				{
					icon: node.isExpanded ? '📂' : '📁',
					label: node.isExpanded ? 'Collapse' : 'Expand',
					onclick: () => {
						if (node.isExpanded) ctrlRef?.collapseNodes(node.path);
						else ctrlRef?.expandNodes(node.path);
						log(`${node.isExpanded ? 'Collapse' : 'Expand'}: ${node.path}`);
					}
				}
			] as ContextMenuEntry[] : []),
			{ divider: true, label: 'Danger zone' },
			{ icon: '🗑️', label: 'Delete', className: 'danger', onclick: () => { log(`Delete (blocked): ${d.name}`); } },
		];
	}

	function getDisabledHiddenMenu(node: LTreeNode<Item>): ContextMenuEntry[] {
		const d = node.data!;
		return [
			{ icon: '👤', label: 'View Profile', onclick: () => { log(`View: ${d.name}`); } },
			{ icon: '✏️', label: 'Edit', isDisabled: d.readonly, onclick: () => { log(`Edit: ${d.name}`); } },
			{ icon: '🗑️', label: 'Delete', isDisabled: d.readonly, onclick: () => { log(`Delete: ${d.name}`); } },
			{ divider: true },
			{ icon: '✉', label: 'Send Email', isVisible: d.level >= 3, onclick: () => { log(`Email: ${d.email}`); } },
			{ icon: '👥', label: 'View Team', isVisible: d.hasChildren, onclick: () => { log(`View team: ${d.name}`); } },
			{ icon: '🟢', label: 'Set Active', isVisible: d.status !== 'active', onclick: () => { log(`Set active: ${d.name}`); } },
			{ icon: '🟡', label: 'Set Away', isVisible: d.status !== 'away', onclick: () => { log(`Set away: ${d.name}`); } },
		];
	}

	function getDangerMenu(node: LTreeNode<Item>): ContextMenuEntry[] {
		const d = node.data!;
		return [
			{ icon: '👤', label: 'View Profile', onclick: () => { log(`View: ${d.name}`); } },
			{ icon: '✏️', label: 'Rename', onclick: () => { log(`Rename: ${d.name}`); } },
			{ divider: true },
			{ icon: '⚠️', label: 'Disable Account', className: 'danger', isDisabled: d.readonly, onclick: () => { log(`Disable: ${d.name}`); } },
			{ icon: '🗑️', label: 'Delete Permanently', className: 'danger', isDisabled: d.readonly, onclick: () => { log(`Delete: ${d.name}`); } },
			{ icon: '🔥', label: 'Remove from Organization', className: 'danger', onclick: () => { log(`Remove: ${d.name}`); } },
		];
	}

	function getFullMenu(node: LTreeNode<Item>): ContextMenuEntry[] {
		const d = node.data!;
		return [
			{ icon: '👤', label: 'View Profile', shortcut: 'V', onclick: () => { log(`View profile: ${d.name}`); } },
			{ icon: '✏️', label: 'Edit', shortcut: 'E', isDisabled: d.readonly, onclick: () => { log(`Edit: ${d.name}`); } },
			{ divider: true },
			{ icon: '✉', label: 'Send Email', shortcut: 'M', isVisible: d.level >= 3, onclick: () => { log(`Email: ${d.email}`); } },
			{
				icon: '📋', label: 'Copy...', children: [
					{ icon: '👤', label: 'Name', shortcut: 'N', onclick: async () => { await navigator.clipboard.writeText(d.name); log(`Copied name: ${d.name}`); } },
					{ icon: '✉', label: 'Email', shortcut: 'E', onclick: async () => { await navigator.clipboard.writeText(d.email); log(`Copied email: ${d.email}`); } },
					{ divider: true },
					{ icon: '🔗', label: 'Path', onclick: async () => { await navigator.clipboard.writeText(node.path); log(`Copied path: ${node.path}`); } },
				]
			},
			...(node.hasChildren ? [
				{ divider: true, label: 'Team' } as ContextMenuEntry,
				{
					icon: node.isExpanded ? '📂' : '📁',
					label: node.isExpanded ? 'Collapse' : 'Expand',
					shortcut: 'Space',
					onclick: () => {
						if (node.isExpanded) ctrlRef?.collapseNodes(node.path);
						else ctrlRef?.expandNodes(node.path);
						log(`${node.isExpanded ? 'Collapse' : 'Expand'}: ${node.path}`);
					}
				} as ContextMenuEntry,
				{
					icon: '👥', label: 'View Members', isVisible: node.isExpanded,
					onclick: () => { log(`View members: ${d.name} (${Object.keys(node.children).length} direct)`); }
				} as ContextMenuEntry,
			] : []),
			{ divider: true, label: 'Danger zone' },
			{ icon: '🗑️', label: 'Delete', shortcut: 'Del', className: 'danger', isDisabled: d.readonly, onclick: () => { log(`Delete (${d.readonly ? 'blocked - readonly' : 'confirmed'}): ${d.name}`); } },
		];
	}

	function getContextMenu(node: LTreeNode<Item>): ContextMenuEntry[] {
		if (!node.data) return [];
		switch (activePreset) {
			case 'basic': return getBasicMenu(node);
			case 'icons-shortcuts': return getIconsShortcutsMenu(node);
			case 'submenus': return getSubmenusMenu(node);
			case 'dividers': return getDividersMenu(node);
			case 'disabled-hidden': return getDisabledHiddenMenu(node);
			case 'danger': return getDangerMenu(node);
			case 'full': return getFullMenu(node);
		}
	}

	function getCanvasContextMenu(): ContextMenuEntry[] {
		return [
			{ icon: '🌲', label: 'Expand All', shortcut: 'E', onclick: () => { ctrlRef?.expandAll(); log('Expand all'); } },
			{ icon: '📁', label: 'Collapse All', shortcut: 'C', onclick: () => { ctrlRef?.collapseAll(); log('Collapse all'); } },
			{ divider: true },
			{ icon: '🔢', label: `${treeData.length} nodes loaded`, isDisabled: true, onclick: () => {} },
			{ icon: '📊', label: `Preset: ${activePreset}`, isDisabled: true, onclick: () => {} },
		];
	}
</script>

<svelte:head>
	<title>Context Menu - Canvas Treeview</title>
	<link rel="stylesheet" href="/examples-shared.css" />
</svelte:head>

<div class="container">
	<header>
		<a href="/" class="back-link">&larr; Back to Examples</a>
		<h1>Context Menu</h1>
		<p class="subtitle">Right-click any node to see the node context menu, or right-click empty canvas space for the canvas menu. Switch presets to explore different <code>ContextMenuEntry</code> features.</p>
	</header>

	<!-- Preset selector -->
	<div class="card">
		<h2>Menu Preset</h2>
		<p class="description">Each preset demonstrates a different combination of context menu features. The menu is built dynamically via <code>getNodeContextMenuItemsCallback</code> callback.</p>

		<div class="preset-grid">
			{#each Object.entries(presetDescriptions) as [key, desc]}
				<button
					class="preset-btn"
					class:active={activePreset === key}
					onclick={() => { activePreset = key as MenuPreset; }}
				>
					<span class="preset-name">{key}</span>
					<span class="preset-desc">{desc}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Feature badges -->
	<div class="card">
		<h2>Active Features</h2>
		<div class="feature-badges">
			<span class="badge-item" class:badge-active={activePreset !== 'basic'}>Icons</span>
			<span class="badge-item" class:badge-active={activePreset === 'icons-shortcuts' || activePreset === 'full'}>Shortcuts</span>
			<span class="badge-item" class:badge-active={activePreset === 'submenus' || activePreset === 'full'}>Submenus</span>
			<span class="badge-item" class:badge-active={activePreset === 'dividers' || activePreset === 'full'}>Dividers</span>
			<span class="badge-item" class:badge-active={activePreset === 'dividers' || activePreset === 'full'}>Named Dividers</span>
			<span class="badge-item" class:badge-active={activePreset === 'disabled-hidden' || activePreset === 'full'}>isDisabled</span>
			<span class="badge-item" class:badge-active={activePreset === 'disabled-hidden' || activePreset === 'full'}>isVisible</span>
			<span class="badge-item" class:badge-active={activePreset === 'danger' || activePreset === 'dividers' || activePreset === 'full'}>className="danger"</span>
		</div>
	</div>

	<!-- Canvas tree -->
	<div class="card">
		<h2>Tree</h2>
		<p class="description">
			Right-click any node. Try different nodes to see conditional items (e.g., readonly nodes disable Edit/Delete, leaf nodes hide team actions).
		</p>

		<div class="tree-hints">
			<span class="hint">Readonly nodes: <strong>Engineering, Design, Product</strong> (departments) and <strong>Eve Johnson</strong></span>
			<span class="hint">Nodes with children show expand/collapse actions</span>
			<span class="hint">Status varies: active, away, busy</span>
		</div>

		<div class="canvas-wrapper">
			<CanvasTree
				data={treeData}
				idMember="id"
				pathMember="path"
				sortCallback={sortByName}
				isSorted={true}
				expandLevel={3}
				growthDirection="right"
				nodeHeight={32}
				nodeMinWidth={100}
				nodeMaxWidth={200}
				nodeGap={6}
				columnGap={45}
				fontSize={12}
				showDotGrid={true}
				bind:selectedPath
				bind:controller={ctrlRef}
				getNodeLabelCallback={(node) => node.data?.name || node.path}
				getNodeContextMenuItemsCallback={getContextMenu}
				getCanvasContextMenuItemsCallback={getCanvasContextMenu}
			/>
		</div>
	</div>

	<!-- Event log -->
	<div class="card">
		<h2>Event Log</h2>
		<p class="description">Actions triggered by context menu clicks appear here.</p>

		<div class="log-controls">
			<button class="btn secondary" onclick={() => { eventLog = []; }}>Clear Log</button>
			<span class="log-count">{eventLog.length} events</span>
		</div>

		<div class="event-log">
			{#if eventLog.length === 0}
				<div class="log-empty">Right-click a node and select an action to see events here.</div>
			{:else}
				{#each eventLog as entry}
					<div class="log-entry">{entry}</div>
				{/each}
			{/if}
		</div>
	</div>

	<!-- API reference -->
	<div class="card">
		<h2>API Reference</h2>

		<div class="code-block">
			<pre>{`// Type definitions (from @keenmate/svelte-treeview)

interface ContextMenuDivider {
  divider: true;
  label?: string;        // named divider: ──── label ────
}

interface ContextMenuItem {
  id?: string;
  label: string;
  icon?: string;         // emoji or icon character
  shortcut?: string;     // keyboard hint (e.g. "Ctrl+C")
  isDisabled?: boolean;  // grayed out, not clickable
  isVisible?: boolean;   // false = skip rendering
  className?: string;    // e.g. "danger" for red styling
  onclick?: () => void | Promise<void>;
  children?: ContextMenuEntry[];  // nested submenu
}

type ContextMenuEntry = ContextMenuItem | ContextMenuDivider;`}</pre>
		</div>

		<div class="code-block" style="margin-top: 0.75rem;">
			<pre>{`// Usage with CanvasTree

<CanvasTree
  {data}
  getNodeContextMenuItemsCallback={getContextMenu}
  ...
/>

function getContextMenu(node: LTreeNode<Item>): ContextMenuEntry[] {
  return [
    { icon: '👤', label: 'View', shortcut: 'V', onclick: () => view(node) },
    { divider: true, label: 'Actions' },
    { icon: '✏️', label: 'Edit', isDisabled: node.data.readonly, onclick: () => edit(node) },
    { icon: '📋', label: 'Copy...', children: [
      { label: 'Name', onclick: () => copyName(node) },
      { label: 'Email', onclick: () => copyEmail(node) },
    ]},
    { divider: true, label: 'Danger zone' },
    { icon: '🗑️', label: 'Delete', className: 'danger', onclick: () => del(node) },
  ];
}`}</pre>
		</div>
	</div>

	<footer>
		<p><a href="/">&larr; Back to Examples</a></p>
	</footer>
</div>

<style>
	.preset-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.preset-btn {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.75rem 1rem;
		border: 2px solid #e2e8f0;
		border-radius: 8px;
		background: #ffffff;
		cursor: pointer;
		text-align: left;
		transition: border-color 0.15s, box-shadow 0.15s;
	}

	.preset-btn:hover {
		border-color: #94a3b8;
	}

	.preset-btn.active {
		border-color: #667eea;
		box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
	}

	.preset-name {
		font-weight: 600;
		font-size: 0.95rem;
		color: #1e293b;
		font-family: 'SF Mono', 'Cascadia Code', monospace;
	}

	.preset-desc {
		font-size: 0.8rem;
		color: #64748b;
		line-height: 1.4;
	}

	.feature-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.badge-item {
		padding: 0.3rem 0.75rem;
		border-radius: 20px;
		font-size: 0.8rem;
		font-weight: 500;
		border: 1px solid #e2e8f0;
		color: #94a3b8;
		background: #f8fafc;
		transition: all 0.2s;
	}

	.badge-active {
		border-color: #667eea;
		color: #667eea;
		background: #eef2ff;
	}

	.canvas-wrapper {
		height: 500px;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		overflow: hidden;
		margin-top: 1rem;
	}

	.tree-hints {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.5rem;
		margin-top: 0.5rem;
		font-size: 0.8rem;
		color: #64748b;
	}

	.hint::before {
		content: '•';
		margin-right: 0.4rem;
		color: #cbd5e1;
	}

	.description {
		color: #64748b;
		margin-bottom: 0.5rem;
	}

	.description code {
		background: #f1f5f9;
		padding: 0.15rem 0.4rem;
		border-radius: 4px;
		font-size: 0.85em;
	}

	.event-log {
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		max-height: 260px;
		overflow-y: auto;
		font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
		font-size: 0.8rem;
		background: #f8fafc;
	}

	.log-entry {
		padding: 0.35rem 0.75rem;
		border-bottom: 1px solid #f1f5f9;
		color: #334155;
	}

	.log-entry:last-child {
		border-bottom: none;
	}

	.log-empty {
		padding: 1.5rem;
		text-align: center;
		color: #94a3b8;
		font-family: inherit;
	}

	.log-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.log-count {
		font-size: 0.8rem;
		color: #94a3b8;
	}

	.code-block {
		background: #1e293b;
		color: #e2e8f0;
		padding: 1.25rem;
		border-radius: 8px;
		overflow-x: auto;
		margin-top: 0.5rem;
	}

	.code-block pre {
		font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
		font-size: 0.82rem;
		line-height: 1.6;
		margin: 0;
	}
</style>
