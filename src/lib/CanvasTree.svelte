<script lang="ts" generics="T">
	import { type Snippet, onDestroy } from 'svelte';
	import { TreeProvider, TreeController, type TreeControllerProps } from '@keenmate/svelte-treeview';
	import type { LTreeNode, DropPosition, ContextMenuEntry, TreeNavigation, TreeNavigationOverrides } from '@keenmate/svelte-treeview';
	import type {
		Orientation,
		GrowthDirection,
		LayoutMode,
		ClickBehavior,
		InitialViewport,
		LayoutNode,
		LayoutResult,
		GroupBox,
		NodeRenderSlots,
		CanvasNodeState,
		CanvasVisualConfig,
		RenderNodeCallback,
		RenderSlotCallback,
		MeasureNodeWidthCallback,
		MeasureNodeHeightCallback,
		GetNodeLabelCallback,
		GetBadgeContentCallback,
		LodLevel,
		CanvasLevelConfig,
		FocusOptions
	} from './types.js';
	import { createTextCache } from './canvas-text.js';
	import { computeLayout } from './canvas-layout.js';
	import { drawRadialConnections } from './canvas-layout-radial.js';
	import { drawSunburstNodes, buildSunburstHitTester } from './canvas-layout-sunburst.js';
	import type { CanvasTheme } from './canvas-theme.js';
	import { defaultCanvasTheme, readCssTheme, resolveTheme } from './canvas-theme.js';
	import {
		drawConnections,
		drawBalancedConnections,
		drawFishboneConnections,
		drawGroupBoxes,
		drawDotGrid,
		drawMinimap,
		drawDropZones,
		drawDragGhost,
		drawNode,
		drawNodeSimple,
		drawNodeMedium,
		getBadgeWidth,
		defaultBadgeContent
	} from './canvas-renderer.js';
	import { createInteractionManager } from './canvas-interaction.js';

	// ── Props ─────────────────────────────────────────────────────────────

	interface Props {
		// Data (passed through to TreeController)
		data: T[];
		idMember: string;
		pathMember: string;
		sortCallback?: (items: LTreeNode<T>[]) => LTreeNode<T>[];
		expandLevel?: number;
		// Additional TreeController passthrough props
		isSorted?: boolean;
		parentPathMember?: string;
		levelMember?: string;
		hasChildrenMember?: string;
		displayValueMember?: string;
		getDisplayValueCallback?: (node: LTreeNode<T>) => string;
		searchValueMember?: string;
		getSearchValueCallback?: (node: LTreeNode<T>) => string;
		treePathSeparator?: string;
		dragDropMode?: 'none' | 'self' | 'cross' | 'both';
		shouldUseInternalSearchIndex?: boolean;
		rangeSelectionMode?: 'visual' | 'logical';
		isExpandedMember?: string;
		isDraggableMember?: string;
		getIsDraggableCallback?: (node: LTreeNode<T>) => boolean;
		isDropAllowedMember?: string;
		allowedDropPositionsMember?: string;
		getAllowedDropPositionsCallback?: (node: LTreeNode<T>) => DropPosition[] | null;
		isCollapsibleMember?: string;
		getIsCollapsibleCallback?: (node: LTreeNode<T>) => boolean;
		orderMember?: string;

		// Canvas Visual Config
		layoutMode?: LayoutMode;
		growthDirection?: GrowthDirection;
		initialViewport?: InitialViewport;

		// Balanced layout
		balancedSplit?: 'even' | 'weighted';

		// Fishbone layout
		fishboneCrossNav?: boolean;

		// Radial layout
		radialStartAngle?: number;
		radialSpacing?: number;

		// Sunburst layout
		sunburstRingWidth?: number;
		sunburstRootTitle?: string;
		groupSiblings?: boolean;
		showDotGrid?: boolean;
		clickBehavior?: ClickBehavior;
		collapsible?: boolean;
		nodeHeight?: number;
		nodeMinWidth?: number;
		nodeMaxWidth?: number;
		nodePaddingX?: number;
		nodeGap?: number;
		columnGap?: number;
		levelSpacingV?: number;
		colorBarWidth?: number;
		depthColors?: string[];
		fontSize?: number;
		fontFamily?: string;
		zoomLodText?: number;
		zoomLodSimple?: number;
		gridGap?: number;
		groupPadding?: number;
		maxGridCols?: number;
		gridNodeMaxW?: number;
		levelConfig?: CanvasLevelConfig[];

		// Render callbacks
		renderNodeCallback?: RenderNodeCallback<T>;
		renderBackgroundCallback?: RenderSlotCallback<T>;
		renderColorBarCallback?: RenderSlotCallback<T>;
		renderBodyCallback?: RenderSlotCallback<T>;
		renderChevronCallback?: RenderSlotCallback<T>;
		renderBadgeCallback?: RenderSlotCallback<T>;
		measureNodeWidthCallback?: MeasureNodeWidthCallback<T>;
		measureNodeHeightCallback?: MeasureNodeHeightCallback<T>;
		getNodeLabelCallback?: GetNodeLabelCallback<T>;
		getBadgeContentCallback?: GetBadgeContentCallback<T>;

		// Bindable state
		selectedPath?: string | null;
		selectedPaths?: Set<string>;
		controller?: TreeController<T> | null;

		// Events (on* = fire-and-forget)
		onNodeClick?: (node: LTreeNode<T>) => void;
		onSelectionChange?: (paths: Set<string>, nodes: LTreeNode<T>[]) => void;
		onNodeDrop?: (source: LTreeNode<T>, target: LTreeNode<T>, position: DropPosition) => void;

		// Data providers (get*Callback = returns data)
		getNodeContextMenuItemsCallback?: (node: LTreeNode<T>, selectedNodes?: LTreeNode<T>[]) => ContextMenuEntry[];
		getGroupContextMenuItemsCallback?: (parentNode: LTreeNode<T>, childNodes: LTreeNode<T>[]) => ContextMenuEntry[];
		getCanvasContextMenuItemsCallback?: () => ContextMenuEntry[];

		// Metrics (bindable, readonly)
		layoutTime?: number;
		drawTime?: number;
		visibleCount?: number;
		totalCount?: number;

		// Custom tooltip snippet — receives the LTreeNode and label
		tooltipSnippet?: Snippet<[LTreeNode<T>, string]>;

		// Theme overrides (highest priority, over CSS variables and defaults)
		theme?: Partial<CanvasTheme>;

		// Navigation overrides (partial — override individual nav methods)
		navigationOverrides?: TreeNavigationOverrides<T>;
		/** Auto-pan viewport to keep selected node visible when selectedPath changes */
		autoFocusOnSelect?: boolean;

		// Clipboard support
		enableClipboard?: boolean;
		transformDataForPaste?: (data: T, index: number, operation: 'copy' | 'cut') => T;
		onPaste?: (result: { success: boolean; count: number; error?: string }) => void;
	}

	let {
		// Data props
		data,
		idMember,
		pathMember,
		sortCallback,
		expandLevel = 2,
		isSorted,
		parentPathMember,
		levelMember,
		hasChildrenMember,
		displayValueMember,
		getDisplayValueCallback,
		searchValueMember,
		getSearchValueCallback,
		treePathSeparator,
		dragDropMode = 'self',
		shouldUseInternalSearchIndex,
		rangeSelectionMode = 'visual',
		isExpandedMember,
		isDraggableMember,
		getIsDraggableCallback,
		isDropAllowedMember,
		allowedDropPositionsMember,
		getAllowedDropPositionsCallback,
		isCollapsibleMember,
		getIsCollapsibleCallback,
		orderMember,

		// Visual config
		layoutMode = $bindable('tree'),
		growthDirection = $bindable('right'),
		initialViewport = 'root',
		balancedSplit = 'even',
		fishboneCrossNav = false,
		radialStartAngle = 0,
		radialSpacing,
		sunburstRingWidth = 100,
		sunburstRootTitle,
		groupSiblings = $bindable(true),
		showDotGrid = $bindable(false),
		clickBehavior = $bindable('expand-and-focus'),
		collapsible = true,
		nodeHeight = $bindable<number | undefined>(undefined),
		nodeMinWidth = $bindable<number | undefined>(undefined),
		nodeMaxWidth = $bindable<number | undefined>(undefined),
		nodePaddingX = $bindable<number | undefined>(undefined),
		nodeGap = $bindable<number | undefined>(undefined),
		columnGap = $bindable<number | undefined>(undefined),
		levelSpacingV = $bindable<number | undefined>(undefined),
		colorBarWidth = $bindable<number | undefined>(undefined),
		depthColors = $bindable<string[] | undefined>(undefined),
		fontSize = $bindable<number | undefined>(undefined),
		fontFamily = $bindable<string | undefined>(undefined),
		zoomLodText = $bindable(0.35),
		zoomLodSimple = $bindable(0.12),
		gridGap = $bindable(4),
		groupPadding = $bindable(8),
		maxGridCols = $bindable(10),
		gridNodeMaxW = $bindable(260),
		levelConfig,

		// Render callbacks
		renderNodeCallback,
		renderBackgroundCallback,
		renderColorBarCallback,
		renderBodyCallback,
		renderChevronCallback,
		renderBadgeCallback,
		measureNodeWidthCallback,
		measureNodeHeightCallback,
		getNodeLabelCallback,
		getBadgeContentCallback,

		// Bindable state
		selectedPath = $bindable(null),
		selectedPaths = $bindable(new Set<string>()),
		controller = $bindable(null),

		// Events
		onNodeClick: onNodeClickHandler,
		onSelectionChange: onSelectionChangeHandler,
		onNodeDrop: onNodeDropHandler,
		// Data providers
		getNodeContextMenuItemsCallback: getNodeContextMenuItemsHandler,
		getGroupContextMenuItemsCallback: getGroupContextMenuItemsHandler,
		getCanvasContextMenuItemsCallback: getCanvasContextMenuItemsHandler,

		// Metrics
		layoutTime = $bindable(0),
		drawTime = $bindable(0),
		visibleCount = $bindable(0),
		totalCount = $bindable(0),

		// Tooltip
		tooltipSnippet,

		// Theme overrides
		theme: themePropOverrides,

		// Navigation
		navigationOverrides,
		autoFocusOnSelect = false,

		// Clipboard
		enableClipboard = false,
		transformDataForPaste,
		onPaste: onPasteHandler,
	}: Props = $props();

	// ── Internal State ──────────────────────────────────────────────────

	let canvasEl: HTMLCanvasElement | undefined = $state();
	let containerEl: HTMLDivElement | undefined = $state();
	let ctrlRef: TreeController<T> | null = null;
	let rafId: number | null = null;
	/** Tooltip state — explicitly updated at end of each draw() for reliable reactivity */
	let tooltipLn = $state<LayoutNode<T> | null>(null);
	let tooltipX = $state(0);
	let tooltipY = $state(0);

	/** Canvas-level context menu state (right-click on empty space) */
	let canvasMenuVisible = $state(false);
	let canvasMenuX = $state(0);
	let canvasMenuY = $state(0);
	let canvasMenuEntries = $state<ContextMenuEntry[]>([]);

	// Layout data (non-reactive for performance)
	let layoutNodes: LayoutNode<T>[] = [];
	let groupBoxes: import('./types.js').GroupBox[] = [];
	let layoutWidth = 0;
	let layoutHeight = 0;
	let levelXArr: number[] = [0];
	let cachedSunburstHitTester: ((wx: number, wy: number) => LayoutNode<T> | null) | null = null;

	// Search state
	let matchedPaths: Set<string> = new Set();
	let searchResults: LTreeNode<T>[] = [];
	let currentResultIndex = -1;

	// Text cache
	const textCache = createTextCache();

	// Theme: resolved from defaults → CSS variables → prop overrides
	let resolvedTheme: CanvasTheme = $state(defaultCanvasTheme);

	// Font: read --base-font-family from CSS as fallback
	let cssFontFamily = $state('');

	function buildTheme() {
		const cssOverrides = containerEl ? readCssTheme(containerEl) : {};
		resolvedTheme = resolveTheme(cssOverrides, themePropOverrides ?? {});

		// Read --base-font-family (or --ct-font-family) for canvas text rendering
		if (containerEl) {
			const style = getComputedStyle(containerEl);
			cssFontFamily = (
				style.getPropertyValue('--ct-font-family').trim() ||
				style.getPropertyValue('--base-font-family').trim()
			);
		}
	}

	// ── Effective geometry: prop → theme (which is --ct-* → --base-* → default) ──

	let eNodeHeight   = $derived(nodeHeight   ?? resolvedTheme.nodeHeight);
	let eNodeMinWidth = $derived(nodeMinWidth ?? resolvedTheme.nodeMinWidth);
	let eNodeMaxWidth = $derived(nodeMaxWidth ?? resolvedTheme.nodeMaxWidth);
	let eNodePaddingX = $derived(nodePaddingX ?? resolvedTheme.nodePaddingX);
	let eNodeGap      = $derived(nodeGap      ?? resolvedTheme.nodeGap);
	let eColumnGap    = $derived(columnGap    ?? resolvedTheme.columnGap);
	let eLevelSpacingV= $derived(levelSpacingV?? resolvedTheme.levelSpacingV);
	let eColorBarWidth= $derived(colorBarWidth?? resolvedTheme.colorBarWidth);
	let eFontSize     = $derived(fontSize     ?? resolvedTheme.fontSize);

	// Derived font strings — prop wins, then CSS variable, then default
	let effectiveFamily = $derived(fontFamily || cssFontFamily || '"SF Mono", "Cascadia Code", "Fira Code", monospace');
	let fontStr = $derived(`${eFontSize}px ${effectiveFamily}`);
	let fontBold = $derived(`bold ${eFontSize}px ${effectiveFamily}`);

	// ── Depth Color ────────────────────────────────────────────────────

	// Build 10-color array from theme, overridable by depthColors prop
	const themeDepthColors = $derived([
		resolvedTheme.depthColor0, resolvedTheme.depthColor1,
		resolvedTheme.depthColor2, resolvedTheme.depthColor3,
		resolvedTheme.depthColor4, resolvedTheme.depthColor5,
		resolvedTheme.depthColor6, resolvedTheme.depthColor7,
		resolvedTheme.depthColor8, resolvedTheme.depthColor9,
	]);
	const eDepthColors = $derived(depthColors ?? themeDepthColors);

	function getDepthColor(depth: number): string {
		return levelConfig?.[depth]?.color ?? eDepthColors[depth % eDepthColors.length];
	}

	// ── Node Label ──────────────────────────────────────────────────────

	function getLabel(node: LTreeNode<T>): string {
		if (getNodeLabelCallback) return getNodeLabelCallback(node);
		if (ctrlRef) return ctrlRef.tree.getNodeDisplayValue(node);
		return (node.data as Record<string, unknown>)?.name as string || node.path;
	}

	function getBadgeContent(node: LTreeNode<T>): string | null {
		if (getBadgeContentCallback) return getBadgeContentCallback(node);
		return defaultBadgeContent(node);
	}

	function getSelectedNodesFromPaths(paths: Set<string>): LTreeNode<T>[] {
		if (!ctrlRef) return [];
		const nodes: LTreeNode<T>[] = [];
		for (const p of paths) {
			const n = ctrlRef.getNodeByPath(p);
			if (n) nodes.push(n);
		}
		return nodes;
	}

	// ── Node Width Measurement ──────────────────────────────────────────

	function measureNodeWidthFn(treeNode: LTreeNode<T>): number {
		if (measureNodeWidthCallback) {
			return measureNodeWidthCallback(treeNode, textCache.getTextWidth, {
				nodeHeight: eNodeHeight,
				nodeMinWidth: eNodeMinWidth,
				nodeMaxWidth: eNodeMaxWidth,
				nodePaddingX: eNodePaddingX,
				colorBarWidth: eColorBarWidth,
				font: fontStr,
				fontBold,
				getDepthColor,
				growthDirection
			});
		}
		const label = getLabel(treeNode);
		const tw = textCache.getTextWidth(label);
		const chevronW = treeNode.hasChildren ? resolvedTheme.chevronPaddingEnd + 2 : 0;
		const badgeW = getBadgeWidth(getBadgeContent(treeNode), resolvedTheme);
		const badgeGap = badgeW > 0 ? 4 : 0;
		let w = Math.max(eNodeMinWidth, tw + eNodePaddingX * 2 + eColorBarWidth + chevronW + badgeW + badgeGap);
		if (eNodeMaxWidth > 0) w = Math.min(w, eNodeMaxWidth);
		return w;
	}

	// ── Layout ──────────────────────────────────────────────────────────

	function doLayout() {
		if (!ctrlRef) return;
		const _lt0 = performance.now();
		const result = computeLayout(
			ctrlRef,
			growthDirection,
			groupSiblings,
			measureNodeWidthFn,
			{
				nodeHeight: eNodeHeight,
				nodeGap: eNodeGap,
				columnGap: eColumnGap,
				levelSpacingV: eLevelSpacingV,
				gridGap,
				groupPadding,
				maxGridCols,
				gridNodeMinW: 120,
				gridNodeMaxW,
				nodeMinWidth: eNodeMinWidth,
				levelOverrides: levelConfig
			},
			layoutMode,
			{
				balancedSplit,
				radialStartAngle,
				radialSpacing: radialSpacing ?? eColumnGap * 3,
				sunburstRingWidth,
				sunburstRootTitle
			}
		);
		layoutNodes = result.nodes;
		groupBoxes = result.groupBoxes;
		layoutWidth = result.width;
		layoutHeight = result.height;
		levelXArr = result.levelXArr;
		layoutTime = result.time;
		totalCount = result.nodes.length;

		// Build cached sunburst hit tester (ring-indexed for performance)
		if (layoutMode === 'sunburst' && layoutNodes.length > 0) {
			const rootLn = layoutNodes.find(n => n.depth === 0);
			if (rootLn) {
				cachedSunburstHitTester = buildSunburstHitTester(layoutNodes, rootLn.cx, rootLn.cy);
			} else {
				cachedSunburstHitTester = null;
			}
		} else {
			cachedSunburstHitTester = null;
		}
		console.log(`[doLayout] ${(performance.now() - _lt0).toFixed(1)}ms | ${layoutNodes.length} nodes | mode=${layoutMode}`);
	}

	// ── Draw ────────────────────────────────────────────────────────────

	// Performance logging
	let _perfLogCounter = 0;
	const _PERF_LOG_EVERY = 60; // log every N frames

	function draw() {
		if (!canvasEl || !containerEl) return;
		const t0 = performance.now();
		const doLog = (++_perfLogCounter % _PERF_LOG_EVERY) === 0;
		const ctx = canvasEl.getContext('2d')!;
		const dpr = window.devicePixelRatio || 1;
		const rect = containerEl.getBoundingClientRect();
		const cw = rect.width;
		const ch = rect.height;

		const targetW = Math.round(cw * dpr);
		const targetH = Math.round(ch * dpr);
		if (canvasEl.width !== targetW || canvasEl.height !== targetH) {
			canvasEl.width = targetW;
			canvasEl.height = targetH;
			canvasEl.style.width = cw + 'px';
			canvasEl.style.height = ch + 'px';
		}

		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, cw, ch);

		const iState = interaction.getState();
		const theme = resolvedTheme;

		// Background
		ctx.fillStyle = theme.bg;
		ctx.fillRect(0, 0, cw, ch);
		let tGrid = t0;
		if (showDotGrid) {
			drawDotGrid(ctx, cw, ch, iState.panX, iState.panY, iState.zoom, theme);
			tGrid = performance.now();
		}

		ctx.save();
		ctx.translate(iState.panX, iState.panY);
		ctx.scale(iState.zoom, iState.zoom);

		// Viewport bounds in world coords for culling
		const vl = -iState.panX / iState.zoom;
		const vt = -iState.panY / iState.zoom;
		const vr = vl + cw / iState.zoom;
		const vb = vt + ch / iState.zoom;
		const M = 50;

		const isV = growthDirection === 'up' || growthDirection === 'down';
		const isReversed = growthDirection === 'left' || growthDirection === 'up';
		const isSearchActive = matchedPaths.size > 0;

		// Connections (sunburst uses adjacent arcs, no lines needed)
		if (layoutMode === 'sunburst') {
			// no connection lines
		} else if (layoutMode === 'balanced') {
			drawBalancedConnections(ctx, layoutNodes, vl, vt, vr, vb, theme, eColumnGap, eLevelSpacingV);
		} else if (layoutMode === 'radial') {
			drawRadialConnections(ctx, layoutNodes, vl, vt, vr, vb, theme);
		} else if (layoutMode === 'fishbone') {
			drawFishboneConnections(ctx, layoutNodes, isV, vl, vt, vr, vb, theme);
		} else if (layoutMode !== 'box') {
			drawConnections(ctx, layoutNodes, levelXArr, isV, isReversed, eColumnGap, eLevelSpacingV, vl, vt, vr, vb, theme);
		}
		const tConn = performance.now();

		// Group boxes
		drawGroupBoxes(ctx, groupBoxes, getDepthColor, zoomLodSimple, zoomLodText, iState.zoom, vl, vt, vr, vb);
		const tBoxes = performance.now();

		// Nodes
		let visible = 0;

		if (layoutMode === 'sunburst') {
			// Sunburst: find center from root node and draw arcs
			const rootLn = layoutNodes.find(n => n.depth === 0);
			const scx = rootLn ? rootLn.cx : 0;
			const scy = rootLn ? rootLn.cy : 0;
			visible = drawSunburstNodes(
				ctx, layoutNodes, scx, scy,
				getDepthColor, (node, ln) => ln?.labelOverride ?? getLabel(node),
				iState.hoveredNode as LayoutNode<T> | null,
				selectedPath, fontStr, iState.zoom,
				vl, vt, vr, vb, theme
			);
		} else {
			const lodText = iState.zoom >= zoomLodText;
			const lodSimple = iState.zoom < zoomLodSimple;

			const visualConfig: CanvasVisualConfig = {
				nodeHeight: eNodeHeight,
				nodeMinWidth: eNodeMinWidth,
				nodeMaxWidth: eNodeMaxWidth,
				nodePaddingX: eNodePaddingX,
				colorBarWidth: eColorBarWidth,
				font: fontStr,
				fontBold,
				getDepthColor,
				growthDirection
			};

			const slots: NodeRenderSlots<T> = {
				renderNodeCallback,
				renderBackgroundCallback,
				renderColorBarCallback,
				renderBodyCallback,
				renderChevronCallback,
				renderBadgeCallback
			};

			for (const n of layoutNodes) {
				if (n.isVirtual) continue;
				if (n.x + n.w < vl - M || n.x > vr + M || n.y + n.h < vt - M || n.y > vb + M) continue;
				visible++;

				const depthColor = getDepthColor(n.depth);
				const isSelected = (ctrlRef ? ctrlRef.highlightedPaths.has(n.node.path) : selectedPaths.has(n.node.path)) || n.node.path === selectedPath;
				const isMatch = isSearchActive && matchedPaths.has(n.node.path);
				const isCurrent = isMatch && currentResultIndex >= 0 && searchResults[currentResultIndex]?.path === n.node.path;
				const isDragSrc = iState.dragSrcNode?.node.path === n.node.path && iState.isDragging;
				const isDropTgt = iState.dropTarget?.node.path === n.node.path && iState.isDragging;
				const isHovered = iState.hoveredNode?.node.path === n.node.path && !iState.isDragging;
				const isSearchDimmed = isSearchActive && !isMatch;
				const isCut = ctrlRef ? ctrlRef.cutPaths.has(n.node.path) : false;

				// LOD: simple
				if (lodSimple) {
					if (isCut) ctx.globalAlpha = 0.4;
					drawNodeSimple(ctx, n, depthColor, isSelected, isMatch, isCurrent, isSearchDimmed, theme);
					if (isCut) ctx.globalAlpha = 1;
					continue;
				}

				ctx.globalAlpha = isDragSrc ? 0.3 : isCut ? 0.4 : isSearchDimmed ? 0.25 : 1;

				// LOD: medium
				if (!lodText) {
					drawNodeMedium(ctx, n, depthColor, isSelected, isDropTgt, isMatch, isCurrent, eColorBarWidth, isV, theme);
					ctx.globalAlpha = 1;
					continue;
				}

				// LOD: full detail — use slot-based rendering
				const state: CanvasNodeState = {
					isSelected,
					isHovered,
					isDragSource: isDragSrc,
					isDropTarget: isDropTgt,
					isSearchMatch: isMatch,
					isCurrentSearchResult: isCurrent,
					isSearchDimmed
				};

				const lod: LodLevel = 'full';
				drawNode(ctx, n, getLabel(n.node), getBadgeContent(n.node), state, lod, visualConfig, slots, theme);

				ctx.globalAlpha = 1;
			}
		}
		const tNodes = performance.now();

		// Drop zone buttons
		if (iState.isDragging && iState.dropTarget) {
			drawDropZones(ctx, iState.dropTarget as LayoutNode<T>, iState.dropPosition, isV, isReversed, theme);
		}

		// Drag ghost
		if (iState.isDragging && iState.dragSrcNode) {
			ctx.restore();
			ctx.save();
			drawDragGhost(
				ctx,
				iState.dragSrcNode as LayoutNode<T>,
				iState.dragX,
				iState.dragY,
				fontStr,
				eColorBarWidth,
				eNodePaddingX,
				(ln) => getLabel(ln.node),
				theme
			);
			ctx.restore();
		} else {
			ctx.restore();
		}

		// Selection rectangle overlay (shift+drag)
		if (iState.isSelecting) {
			ctx.save();
			ctx.translate(iState.panX, iState.panY);
			ctx.scale(iState.zoom, iState.zoom);
			const rx = Math.min(iState.selRectStartX, iState.selRectEndX);
			const ry = Math.min(iState.selRectStartY, iState.selRectEndY);
			const rw = Math.abs(iState.selRectEndX - iState.selRectStartX);
			const rh = Math.abs(iState.selRectEndY - iState.selRectStartY);
			ctx.fillStyle = theme.selectionRectFill ?? 'rgba(102, 126, 234, 0.1)';
			ctx.fillRect(rx, ry, rw, rh);
			ctx.strokeStyle = theme.selectionRectStroke ?? 'rgba(102, 126, 234, 0.5)';
			ctx.lineWidth = 1 / iState.zoom;
			ctx.setLineDash([4 / iState.zoom, 4 / iState.zoom]);
			ctx.strokeRect(rx, ry, rw, rh);
			ctx.setLineDash([]);
			ctx.restore();
		}

		// Minimap — pass highlightedPaths for multi-select highlight
		const tMm0 = performance.now();
		drawMinimap(
			ctx, layoutNodes, groupBoxes,
			layoutWidth, layoutHeight,
			getDepthColor, selectedPath,
			iState.panX, iState.panY, iState.zoom,
			cw, ch,
			theme,
			ctrlRef ? ctrlRef.highlightedPaths : selectedPaths
		);
		const tMm1 = performance.now();

		visibleCount = visible;
		drawTime = performance.now() - t0;

		if (doLog) {
			console.log(
				`[draw] total=${drawTime.toFixed(1)}ms | grid=${(tGrid - t0).toFixed(1)} conn=${(tConn - tGrid).toFixed(1)} boxes=${(tBoxes - tConn).toFixed(1)} nodes=${(tNodes - tBoxes).toFixed(1)} minimap=${(tMm1 - tMm0).toFixed(1)} | visible=${visible}/${layoutNodes.length} zoom=${iState.zoom.toFixed(3)}`
			);
		}

		// Sync tooltip state to reactive $state for HTML overlay
		// Compare by path, not reference — tooltipLn is a $state proxy, tt is plain
		const tt = iState.tooltipNode as LayoutNode<T> | null;
		if (tt?.node.path !== tooltipLn?.node.path || iState.tooltipScreenX !== tooltipX || iState.tooltipScreenY !== tooltipY) {
			tooltipLn = tt;
			tooltipX = iState.tooltipScreenX;
			tooltipY = iState.tooltipScreenY;
		}
	}

	function requestRedraw() {
		if (rafId != null) return;
		rafId = requestAnimationFrame(() => {
			rafId = null;
			draw();
		});
	}

	function recomputeAndDraw() {
		if (!ctrlRef) return;
		const _rc0 = performance.now();
		doLayout();
		requestRedraw();
		console.log(`[recomputeAndDraw] layout+schedule: ${(performance.now() - _rc0).toFixed(1)}ms`);
	}

	// ── Interaction Manager ─────────────────────────────────────────────

	const interaction = createInteractionManager<T>(
		{
			getCanvas: () => canvasEl,
			getContainer: () => containerEl,
			getLayoutNodes: () => layoutNodes,
			getLayoutSize: () => ({ width: layoutWidth, height: layoutHeight }),
			getDirection: () => ({
				isV: growthDirection === 'up' || growthDirection === 'down',
				isReversed: growthDirection === 'left' || growthDirection === 'up'
			}),
			requestRedraw,
			onNodeClick: (ln, chevronHit) => {
				// Sunburst accordion: clicking any node collapses its expanded siblings
				// (only if they are collapsible — respect isCollapsible check)
				let accordionChanged = false;
				if (layoutMode === 'sunburst' && ctrlRef) {
					const siblings = ctrlRef.getSiblings(ln.node.path);
					for (const sib of siblings) {
						if (sib.path !== ln.node.path && sib.isExpanded && ctrlRef.getNodeIsCollapsible(sib)) {
							ctrlRef.collapseNodes(sib.path);
							accordionChanged = true;
						}
					}
				}

				const nodeCollapsible = ctrlRef?.getNodeIsCollapsible(ln.node) ?? true;
				const shouldToggle = collapsible && nodeCollapsible && ln.node.hasChildren && (
					clickBehavior !== 'select' || chevronHit
				);
				const wasExpanded = ln.node.isExpanded;
				if (shouldToggle) {
					if (wasExpanded) ctrlRef!.collapseNodes(ln.node.path);
					else ctrlRef!.expandNodes(ln.node.path);
					accordionChanged = true;
				}
				if (accordionChanged) recomputeAndDraw();

				// Sunburst: after expanding, focus on the first child
				if (layoutMode === 'sunburst' && shouldToggle && !wasExpanded) {
					const children = ctrlRef!.getChildren(ln.node.path);
					if (children.length > 0) {
						const firstChildLn = layoutNodes.find(n => n.node.path === children[0].path);
						if (firstChildLn) interaction.focusOnNode(firstChildLn, { select: false });
					}
				}
				onNodeClickHandler?.(ln.node);
			},
			onNodeDblClick: (ln) => {
				// Double-click: toggle expand/collapse (useful in 'select' mode where single click only selects)
				if (!ctrlRef) return;
				const nodeCollapsible = ctrlRef.getNodeIsCollapsible(ln.node);
				if (!collapsible || !nodeCollapsible || !ln.node.hasChildren) return;

				if (ln.node.isExpanded) ctrlRef.collapseNodes(ln.node.path);
				else ctrlRef.expandNodes(ln.node.path);
				recomputeAndDraw();

				if (clickBehavior === 'expand-and-focus' || (layoutMode === 'sunburst' && !ln.node.isExpanded)) {
					// After expand, focus
					const children = ctrlRef.getChildren(ln.node.path);
					if (children.length > 0) {
						const firstChildLn = layoutNodes.find(n => n.node.path === children[0].path);
						if (firstChildLn) interaction.focusOnNode(firstChildLn, { select: false });
					}
				}
			},
			onDragDrop: (src, target, position) => {
				console.log('[CanvasTree] onDragDrop', { src: src.node.path, target: target.node.path, position, hasCtrl: !!ctrlRef });
				if (ctrlRef) {
					const result = ctrlRef.moveNode(src.node.path, target.node.path, position);
					console.log('[CanvasTree] moveNode result:', result);
					if (result.success) {
						console.log('[CanvasTree] recomputeAndDraw after move');
						recomputeAndDraw();
						onNodeDropHandler?.(src.node, target.node, position);
					}
				}
			},
			onContextMenu: (ln, clientX, clientY) => {
				canvasMenuVisible = false;
				const inSelection = ctrlRef ? ctrlRef.highlightedPaths.has(ln.node.path) : selectedPaths.has(ln.node.path);
				console.debug(`[CanvasTree] onContextMenu: ${ln.node.path}, inSelection=${inSelection}`);
				// If right-clicking on an unselected node, clear multi-selection and select it
				// Use direct state manipulation — NOT selectNode() which closes the context menu
				if (!inSelection) {
					console.debug(`[CanvasTree] onContextMenu: clearing selection, selecting only ${ln.node.path}`);
					if (ctrlRef) {
						ctrlRef.clearHighlight();
						// Directly set selection state without going through _onNodeClicked
						ln.node.isSelected = true;
						ctrlRef.selectedPaths = new Set([ln.node.path]);
						ctrlRef.focusedNode = ln.node;
						ctrlRef.lastHighlightedPath = ln.node.path;
					}
					selectedPaths = new Set([ln.node.path]);
					selectedPath = ln.node.path;
					onSelectionChangeHandler?.(selectedPaths, getSelectedNodesFromPaths(selectedPaths));
				} else {
					console.debug(`[CanvasTree] onContextMenu: preserving ${selectedPaths.size} selected nodes`);
				}
				if (ctrlRef && getNodeContextMenuItemsHandler) {
					ctrlRef.getContextMenuItemsHandler = (node, close) => getNodeContextMenuItemsHandler!(node, ctrlRef!.getSelectedNodes());
					ctrlRef.openContextMenu(ln.node, clientX, clientY);
				}
			},
			onCanvasContextMenu: (clientX, clientY) => {
				if (getCanvasContextMenuItemsHandler) {
					canvasMenuEntries = getCanvasContextMenuItemsHandler();
					if (canvasMenuEntries.length > 0) {
						canvasMenuX = clientX;
						canvasMenuY = clientY;
						canvasMenuVisible = true;
					}
				}
			},
			onGroupContextMenu: (parentPath, clientX, clientY) => {
				if (!ctrlRef || !getGroupContextMenuItemsHandler) return;
				const parentNode = ctrlRef.getNodeByPath(parentPath);
				if (!parentNode) return;
				const childNodes = ctrlRef.getChildren(parentPath);
				canvasMenuEntries = getGroupContextMenuItemsHandler(parentNode, childNodes);
				if (canvasMenuEntries.length > 0) {
					canvasMenuX = clientX;
					canvasMenuY = clientY;
					canvasMenuVisible = true;
				}
			},
			getGroupBoxes: () => groupBoxes,
			onCloseContextMenu: () => {
				ctrlRef?.closeContextMenu();
				canvasMenuVisible = false;
			},
			onHoverChange: (_ln) => {
				// Redraw is handled by interaction manager
			},
			onSelectionChange: (path, modifiers) => {
				if (!path) {
					// Clicked empty space — deselect all
					if (ctrlRef) {
						ctrlRef.clearHighlight();
						selectedPaths = ctrlRef.highlightedPaths;
					} else {
						selectedPaths = new Set();
					}
					selectedPath = null;
					onSelectionChangeHandler?.(selectedPaths, []);
					return;
				}

				const ctrl = modifiers?.ctrl ?? false;
				const shift = modifiers?.shift ?? false;

				if (ctrlRef) {
					// Route all selection through TreeController so lastHighlightedPath stays in sync
					if (ctrl) {
						ctrlRef.selectNode(path, 'toggle');
					} else if (shift) {
						if (rangeSelectionMode === 'visual' && ctrlRef.lastHighlightedPath) {
							// 2D bounding-box selection using canvas layout positions
							const anchorPath = ctrlRef.lastHighlightedPath;
							let anchorLn: LayoutNode<T> | null = null;
							let targetLn: LayoutNode<T> | null = null;
							for (const ln of layoutNodes) {
								if (ln.node.path === anchorPath) anchorLn = ln;
								if (ln.node.path === path) targetLn = ln;
								if (anchorLn && targetLn) break;
							}
							if (anchorLn && targetLn) {
								// Compute bounding rect from the two nodes
								const minX = Math.min(anchorLn.x, targetLn.x);
								const minY = Math.min(anchorLn.y, targetLn.y);
								const maxX = Math.max(anchorLn.x + anchorLn.w, targetLn.x + targetLn.w);
								const maxY = Math.max(anchorLn.y + anchorLn.h, targetLn.y + targetLn.h);
								// Hit-test all layout nodes against the rect
								const hitPaths: string[] = [];
								for (const ln of layoutNodes) {
									if (ln.isVirtual) continue;
									if (ln.x + ln.w > minX && ln.x < maxX && ln.y + ln.h > minY && ln.y < maxY) {
										hitPaths.push(ln.node.path);
									}
								}
								console.debug(`[multi-select] Visual 2D range: anchor=${anchorPath}, target=${path}, rect=[${minX.toFixed(0)},${minY.toFixed(0)} → ${maxX.toFixed(0)},${maxY.toFixed(0)}], hit ${hitPaths.length} nodes`);
								ctrlRef.selectNodes(hitPaths);
								// Preserve anchor for subsequent shift+clicks
								ctrlRef.lastHighlightedPath = anchorPath;
							} else {
								// Fallback: use controller's 1D range
								ctrlRef.selectNode(path, 'range');
							}
						} else {
							// Logical mode or no anchor: use controller's tree-order range
							ctrlRef.selectNode(path, 'range');
						}
					} else {
						ctrlRef.selectNode(path, 'replace');
					}
					selectedPaths = ctrlRef.highlightedPaths;
				} else {
					// Fallback without controller
					if (ctrl) {
						const newPaths = new Set(selectedPaths);
						if (newPaths.has(path)) newPaths.delete(path);
						else newPaths.add(path);
						selectedPaths = newPaths;
					} else {
						selectedPaths = new Set([path]);
					}
				}
				selectedPath = path;
				onSelectionChangeHandler?.(selectedPaths, getSelectedNodesFromPaths(selectedPaths));
			},
			onEmptyClick: () => {
				// Click on empty canvas — deselect all
				if (ctrlRef) {
					ctrlRef.clearHighlight();
					selectedPaths = ctrlRef.highlightedPaths;
				} else {
					selectedPaths = new Set();
				}
				selectedPath = null;
				onSelectionChangeHandler?.(selectedPaths, []);
			},
			onRectangleSelect: (paths, additive) => {
				if (additive) {
					const newPaths = new Set(selectedPaths);
					for (const p of paths) newPaths.add(p);
					selectedPaths = newPaths;
				} else {
					selectedPaths = new Set(paths);
				}
				if (paths.length > 0) selectedPath = paths[0];
				onSelectionChangeHandler?.(selectedPaths, getSelectedNodesFromPaths(selectedPaths));
			},
			getNodeLabel: (ln) => getLabel(ln.node),
			onTooltipPositionChange: (_node, x, y) => {
				tooltipX = x;
				tooltipY = y;
			},
			hitTestOverride: () => {
				if (layoutMode !== 'sunburst') return null;
				return cachedSunburstHitTester;
			}
		},
		{
			getClickBehavior: () => clickBehavior,
			getDragDropMode: () => dragDropMode,
			animDuration: 400
		}
	);

	// ── Controller Capture ──────────────────────────────────────────────

	function createCanvasNavigation(): TreeNavigation<T> {
		const nav: TreeNavigation<T> = {
			navTo(path: string) {
				navigateToPath(path);
			},

			navNextSibling() {
				if (!ctrlRef || !selectedPath) return;
				const currentLn = layoutNodes.find(ln => ln.node.path === selectedPath);
				if (!currentLn) return;
				const box = findContainingGroupBox(currentLn);

				if (box) {
					const groupNodes = getNodesInGroupBox(box);
					const { axis, forward } = resolveAxis('crossNext');
					const neighbor = findNearest(currentLn, groupNodes, axis, forward);
					if (neighbor) { navigateToPath(neighbor.node.path); return; }
					const outer = findSpatialNeighborAtDepth(currentLn, axis, forward);
					if (outer) navigateToPath(outer.node.path);
					return;
				}

				if (layoutMode === 'balanced') {
					const rootLn = getBalancedRootLn();
					if (!rootLn) return;
					const armDir = getBalancedArmDir(currentLn, rootLn);
					if (armDir === 'root') return; // no siblings at root
					const { axis, forward } = resolveAxis('crossNext', armDir);
					const neighbor = findBalancedCrossNeighbor(currentLn, rootLn.cx, axis, forward);
					if (neighbor) navigateToPath(neighbor.node.path);
					return;
				}

				if (layoutMode === 'fishbone') {
					fishboneCrossAction(currentLn, 'crossNext');
					return;
				}

				// Generic layout
				const { axis, forward } = resolveAxis('crossNext');
				const neighbor = findSpatialNeighborAtDepth(currentLn, axis, forward);
				if (neighbor) navigateToPath(neighbor.node.path);
			},

			navPrevSibling() {
				if (!ctrlRef || !selectedPath) return;
				const currentLn = layoutNodes.find(ln => ln.node.path === selectedPath);
				if (!currentLn) return;
				const box = findContainingGroupBox(currentLn);

				if (box) {
					const groupNodes = getNodesInGroupBox(box);
					const { axis, forward } = resolveAxis('crossPrev');
					const neighbor = findNearest(currentLn, groupNodes, axis, forward);
					if (neighbor) { navigateToPath(neighbor.node.path); return; }
					const outer = findSpatialNeighborAtDepth(currentLn, axis, forward);
					if (outer) navigateToPath(outer.node.path);
					return;
				}

				if (layoutMode === 'balanced') {
					const rootLn = getBalancedRootLn();
					if (!rootLn) return;
					const armDir = getBalancedArmDir(currentLn, rootLn);
					if (armDir === 'root') return;
					const { axis, forward } = resolveAxis('crossPrev', armDir);
					const neighbor = findBalancedCrossNeighbor(currentLn, rootLn.cx, axis, forward);
					if (neighbor) navigateToPath(neighbor.node.path);
					return;
				}

				if (layoutMode === 'fishbone') {
					fishboneCrossAction(currentLn, 'crossPrev');
					return;
				}

				// Generic layout
				const { axis, forward } = resolveAxis('crossPrev');
				const neighbor = findSpatialNeighborAtDepth(currentLn, axis, forward);
				if (neighbor) navigateToPath(neighbor.node.path);
			},

			navInto() {
				if (!ctrlRef || !selectedPath) return;
				const node = ctrlRef.getNodeByPath(selectedPath);
				if (!node) return;
				const currentLn = layoutNodes.find(ln => ln.node.path === node.path);
				if (!currentLn) return;

				const box = findContainingGroupBox(currentLn);
				if (box) {
					const { axis, forward } = resolveAxis('treeForward');
					const neighbor = findNearest(currentLn, getNodesInGroupBox(box), axis, forward);
					if (neighbor) navigateToPath(neighbor.node.path);
					return;
				}

				if (layoutMode === 'balanced') {
					const rootLn = getBalancedRootLn();
					if (!rootLn) return;
					const armDir = getBalancedArmDir(currentLn, rootLn);
					if (armDir === 'root') {
						// Special case: at balanced root, enter right arm by default
						const rightKids = (currentLn.children || []).filter(c => c.cx > currentLn.cx);
						if (rightKids.length > 0) {
							const best = rightKids.reduce((a, b) =>
								Math.abs(a.cy - currentLn.cy) < Math.abs(b.cy - currentLn.cy) ? a : b
							);
							navigateToPath(best.node.path);
						}
						return;
					}
					// Non-root: standard treeForward within arm
					if (node.hasChildren && node.isExpanded) {
						const children = ctrlRef.getChildren(node.path);
						if (children.length > 0) navigateToPath(children[0].path);
					}
					return;
				}

				if (layoutMode === 'fishbone') {
					fishboneTreeForward(currentLn);
					return;
				}

				// Generic: go to first child if expanded
				if (node.hasChildren && node.isExpanded) {
					const children = ctrlRef.getChildren(node.path);
					if (children.length > 0) navigateToPath(children[0].path);
				}
			},

			navOut() {
				if (!ctrlRef || !selectedPath) return;
				const node = ctrlRef.getNodeByPath(selectedPath);
				if (!node || !node.parentPath) return;
				const currentLn = layoutNodes.find(ln => ln.node.path === node.path);
				if (!currentLn) return;

				const box = findContainingGroupBox(currentLn);
				if (box) {
					const { axis, forward } = resolveAxis('treeBack');
					const neighbor = findNearest(currentLn, getNodesInGroupBox(box), axis, forward);
					if (neighbor) { navigateToPath(neighbor.node.path); return; }
					// At back edge of group → go to parent
					navigateToPath(node.parentPath);
					return;
				}

				if (layoutMode === 'balanced') {
					navigateToPath(node.parentPath);
					return;
				}

				if (layoutMode === 'fishbone') {
					fishboneTreeBack(currentLn);
					return;
				}

				// Generic: go to parent
				navigateToPath(node.parentPath);
			},

			navBackOut() {
				if (!ctrlRef || !selectedPath) return;
				const node = ctrlRef.getNodeByPath(selectedPath);
				if (!node || !node.parentPath) return;
				// Collapse parent and navigate to it
				ctrlRef.collapseNodes(node.parentPath);
				navigateToPath(node.parentPath);
				recomputeAndDraw();
			},

			navToggle() {
				if (!ctrlRef || !selectedPath) return;
				const node = ctrlRef.getNodeByPath(selectedPath);
				if (!node || !node.hasChildren) return;
				if (node.isExpanded) {
					ctrlRef.collapseNodes(selectedPath);
				} else {
					ctrlRef.expandNodes(selectedPath);
				}
				recomputeAndDraw();
			},

			navFirst() {
				if (!ctrlRef) return;
				// Navigate to first node (shallowest depth, closest to origin)
				if (layoutNodes.length === 0) return;
				const rootLn = layoutNodes.find(ln => ln.depth === 0);
				if (rootLn) {
					navigateToPath(rootLn.node.path);
				} else {
					navigateToPath(layoutNodes[0].node.path);
				}
			},

			navLast() {
				if (!ctrlRef) return;
				if (layoutNodes.length === 0) return;
				// Navigate to last visible leaf (furthest from root in layout)
				const { axis, forward } = resolveAxis('treeForward');
				const sorted = [...layoutNodes].sort((a, b) => {
					const aPos = axis === 'x' ? a.cx : a.cy;
					const bPos = axis === 'x' ? b.cx : b.cy;
					return forward ? bPos - aPos : aPos - bPos;
				});
				navigateToPath(sorted[0].node.path);
			},

			// Shift+nav: delegate to controller's default range-highlight logic for now
			navPageDown() { ctrlRef?.navPageDown(); },
			navPageUp() { ctrlRef?.navPageUp(); },
			navHighlightNext() { ctrlRef?.navHighlightNext(); },
			navHighlightPrev() { ctrlRef?.navHighlightPrev(); },
			navHighlightFirst() { ctrlRef?.navHighlightFirst(); },
			navHighlightLast() { ctrlRef?.navHighlightLast(); },
			navHighlightPageDown() { ctrlRef?.navHighlightPageDown(); },
			navHighlightPageUp() { ctrlRef?.navHighlightPageUp(); }
		};

		return nav;
	}

	// ── Fishbone navigation helpers (used by createCanvasNavigation) ────

	function fishboneCrossAction(currentLn: LayoutNode<T>, action: 'crossNext' | 'crossPrev') {
		const isH = !(growthDirection === 'up' || growthDirection === 'down');
		const spineAxis: 'x' | 'y' = isH ? 'x' : 'y';
		const branchAxis: 'x' | 'y' = isH ? 'y' : 'x';
		const rootLn = layoutNodes.find(ln => ln.depth === 0);
		const rootBranchPos = rootLn ? (branchAxis === 'y' ? rootLn.cy : rootLn.cx) : 0;

		const getSpineAncestor = (ln: LayoutNode<T>): LayoutNode<T> => {
			let a = ln;
			while (a.parent && a.depth > 1) a = a.parent;
			return a;
		};
		const getSpineSide = (ln: LayoutNode<T>): 'before' | 'after' => {
			const coord = branchAxis === 'y' ? ln.cy : ln.cx;
			const spine = getSpineAncestor(ln);
			const spineCoord = branchAxis === 'y' ? spine.cy : spine.cx;
			return coord < spineCoord ? 'before' : 'after';
		};

		if (currentLn.depth === 0) return; // root has no cross neighbors

		if (currentLn.depth === 1) {
			// Spine node: forward/backward among same-side spine siblings
			const myBranchPos = branchAxis === 'y' ? currentLn.cy : currentLn.cx;
			const mySpineSide = myBranchPos < rootBranchPos ? 'before' : 'after';
			const allSpine = layoutNodes.filter(ln => ln.depth === 1);
			const forward = action === 'crossNext';
			const mySpinePos = spineAxis === 'x' ? currentLn.cx : currentLn.cy;
			const sameSide = allSpine.filter(ln => {
				const lnBranchPos = branchAxis === 'y' ? ln.cy : ln.cx;
				const lnSide = lnBranchPos < rootBranchPos ? 'before' : 'after';
				return lnSide === mySpineSide;
			});
			const inDir = sameSide.filter(ln => {
				if (ln.node.path === currentLn.node.path) return false;
				const lnPos = spineAxis === 'x' ? ln.cx : ln.cy;
				return forward ? lnPos > mySpinePos + 1 : lnPos < mySpinePos - 1;
			});
			inDir.sort((a, b) => {
				const aPos = spineAxis === 'x' ? a.cx : a.cy;
				const bPos = spineAxis === 'x' ? b.cx : b.cy;
				return forward ? aPos - bPos : bPos - aPos;
			});
			const neighbor = inDir[0] ?? null;
			if (neighbor) {
				navigateToPath(neighbor.node.path);
			} else if (!forward && currentLn.parent) {
				navigateToPath(currentLn.parent.node.path);
			}
		} else {
			// Branch node: same-side siblings at same depth across spine branches
			const mySide = getSpineSide(currentLn);
			const forward = action === 'crossNext';
			const sameSideSiblings = layoutNodes.filter(ln =>
				ln.depth === currentLn.depth && getSpineSide(ln) === mySide
			);
			const neighbor = findNearest(currentLn, sameSideSiblings, spineAxis, forward);
			if (neighbor) {
				navigateToPath(neighbor.node.path);
			} else if (!forward) {
				const spineAnc = getSpineAncestor(currentLn);
				navigateToPath(spineAnc.node.path);
			}
		}
	}

	function fishboneTreeForward(currentLn: LayoutNode<T>) {
		if (!ctrlRef) return;
		const isH = !(growthDirection === 'up' || growthDirection === 'down');
		const branchAxis: 'x' | 'y' = isH ? 'y' : 'x';

		if (currentLn.depth === 0) {
			// Root: enter spine
			const kids = currentLn.children || [];
			if (kids.length > 0) {
				const best = kids.reduce((a, b) => {
					const da = (a.cx - currentLn.cx) ** 2 + (a.cy - currentLn.cy) ** 2;
					const db = (b.cx - currentLn.cx) ** 2 + (b.cy - currentLn.cy) ** 2;
					return da < db ? a : b;
				});
				navigateToPath(best.node.path);
			}
		} else if (currentLn.depth === 1) {
			// Spine: enter branch children (nearest child in either direction)
			const children = currentLn.children || [];
			if (children.length > 0) {
				const spineAxis: 'x' | 'y' = isH ? 'x' : 'y';
				const best = children.reduce((a, b) => {
					const da = Math.abs((spineAxis === 'x' ? a.cx : a.cy) - (spineAxis === 'x' ? currentLn.cx : currentLn.cy));
					const db = Math.abs((spineAxis === 'x' ? b.cx : b.cy) - (spineAxis === 'x' ? currentLn.cx : currentLn.cy));
					return da < db ? a : b;
				});
				navigateToPath(best.node.path);
			}
		} else {
			// Branch: go to children if expanded
			const node = ctrlRef.getNodeByPath(currentLn.node.path);
			if (node && node.hasChildren && node.isExpanded) {
				const children = ctrlRef.getChildren(node.path);
				if (children.length > 0) navigateToPath(children[0].path);
			}
		}
	}

	function fishboneTreeBack(currentLn: LayoutNode<T>) {
		if (currentLn.parent) {
			navigateToPath(currentLn.parent.node.path);
		}
	}

	function captureCtrl(ctrl: TreeController<T>) {
		// Only set the non-reactive internal ref here (called from template)
		ctrlRef = ctrl;
		// Install canvas spatial navigation on the controller
		const canvasNav = createCanvasNavigation();
		if (navigationOverrides) {
			ctrl.navigation = { ...canvasNav, ...navigationOverrides };
		} else {
			ctrl.navigation = canvasNav;
		}
	}

	// Sync the bindable controller prop via $effect (safe for reactive state)
	$effect(() => {
		if (ctrlRef) {
			controller = ctrlRef;
		}
	});

	// Sync rangeSelectionMode prop → controller
	$effect(() => {
		if (ctrlRef) {
			ctrlRef.rangeSelectionMode = rangeSelectionMode ?? 'visual';
		}
	});

	// ── Keyboard ────────────────────────────────────────────────────────
	// Up/Down: sibling navigation (same level, no wrapping)
	// Left: collapse or go to parent
	// Right: expand or go to first child

	/** Find the group box that contains a layout node (if any) */
	function findContainingGroupBox(ln: LayoutNode<T>): GroupBox | null {
		for (const box of groupBoxes) {
			if (ln.cx >= box.x && ln.cx <= box.x + box.w &&
				ln.cy >= box.y && ln.cy <= box.y + box.h) {
				return box;
			}
		}
		return null;
	}

	/** Get all layout nodes inside a given group box */
	function getNodesInGroupBox(box: GroupBox): LayoutNode<T>[] {
		return layoutNodes.filter(ln =>
			ln.cx >= box.x && ln.cx <= box.x + box.w &&
			ln.cy >= box.y && ln.cy <= box.y + box.h
		);
	}

	/**
	 * Find the nearest node in a direction within a set of candidates.
	 * axis: which coordinate to test direction on
	 * forward: true = increasing coordinate, false = decreasing
	 */
	function findNearest(
		currentLn: LayoutNode<T>,
		candidates: LayoutNode<T>[],
		axis: 'x' | 'y',
		forward: boolean
	): LayoutNode<T> | null {
		const pos = axis === 'x' ? currentLn.cx : currentLn.cy;
		let bestLn: LayoutNode<T> | null = null;
		let bestDist = Infinity;

		for (const ln of candidates) {
			if (ln.node.path === currentLn.node.path) continue;
			const lnPos = axis === 'x' ? ln.cx : ln.cy;
			if (forward ? lnPos <= pos + 1 : lnPos >= pos - 1) continue;

			const dx = ln.cx - currentLn.cx;
			const dy = ln.cy - currentLn.cy;
			const dist = dx * dx + dy * dy;
			if (dist < bestDist) {
				bestDist = dist;
				bestLn = ln;
			}
		}
		return bestLn;
	}

	/** Find the nearest same-depth node outside any group box */
	function findSpatialNeighborAtDepth(
		currentLn: LayoutNode<T>,
		axis: 'x' | 'y',
		forward: boolean
	): LayoutNode<T> | null {
		const candidates = layoutNodes.filter(ln => ln.depth === currentLn.depth);
		return findNearest(currentLn, candidates, axis, forward);
	}

	/**
	 * Map a physical arrow key to a logical navigation action based on
	 * orientation and direction.  This keeps all layout-specific key
	 * binding in one place so adding RTL or new orientations is trivial.
	 *
	 * Logical actions:
	 *   treeForward  – toward children  (Right in H-LTR, Down in V, Left in H-RTL)
	 *   treeBack     – toward parent    (Left  in H-LTR, Up   in V, Right in H-RTL)
	 *   crossNext    – next on cross axis (Down in H, Right in V-LTR, Left in V-RTL)
	 *   crossPrev    – prev on cross axis (Up   in H, Left  in V-LTR, Right in V-RTL)
	 */
	type NavAction = 'treeForward' | 'treeBack' | 'crossNext' | 'crossPrev';

	function resolveNavAction(key: string, dir?: GrowthDirection): NavAction | null {
		const effectiveDir = dir ?? growthDirection;
		switch (effectiveDir) {
			case 'right':
				switch (key) {
					case 'ArrowRight': return 'treeForward';
					case 'ArrowLeft':  return 'treeBack';
					case 'ArrowDown':  return 'crossNext';
					case 'ArrowUp':    return 'crossPrev';
				}
				break;
			case 'left':
				switch (key) {
					case 'ArrowLeft':  return 'treeForward';
					case 'ArrowRight': return 'treeBack';
					case 'ArrowDown':  return 'crossNext';
					case 'ArrowUp':    return 'crossPrev';
				}
				break;
			case 'down':
				switch (key) {
					case 'ArrowDown':  return 'treeForward';
					case 'ArrowUp':    return 'treeBack';
					case 'ArrowRight': return 'crossNext';
					case 'ArrowLeft':  return 'crossPrev';
				}
				break;
			case 'up':
				switch (key) {
					case 'ArrowUp':    return 'treeForward';
					case 'ArrowDown':  return 'treeBack';
					case 'ArrowRight': return 'crossNext';
					case 'ArrowLeft':  return 'crossPrev';
				}
				break;
		}
		return null;
	}

	/** Resolve the spatial axis & direction for a logical action */
	function resolveAxis(action: NavAction, dir?: GrowthDirection): { axis: 'x' | 'y'; forward: boolean } {
		const effectiveDir = dir ?? growthDirection;
		const isV = effectiveDir === 'up' || effectiveDir === 'down';
		const isReversed = effectiveDir === 'left' || effectiveDir === 'up';

		if (isV) {
			// tree axis = Y, cross axis = X
			switch (action) {
				case 'treeForward': return { axis: 'y', forward: !isReversed };
				case 'treeBack':    return { axis: 'y', forward: isReversed };
				case 'crossNext':   return { axis: 'x', forward: true };
				case 'crossPrev':   return { axis: 'x', forward: false };
			}
		} else {
			// tree axis = X, cross axis = Y
			switch (action) {
				case 'treeForward': return { axis: 'x', forward: !isReversed };
				case 'treeBack':    return { axis: 'x', forward: isReversed };
				case 'crossNext':   return { axis: 'y', forward: true };
				case 'crossPrev':   return { axis: 'y', forward: false };
			}
		}
	}

	/** Find the root (depth-0) layout node for balanced nav */
	function getBalancedRootLn(): LayoutNode<T> | null {
		return layoutNodes.find(ln => ln.depth === 0) ?? null;
	}

	/** Determine which arm a node belongs to based on its cx relative to root's cx */
	function getBalancedArmDir(currentLn: LayoutNode<T>, rootLn: LayoutNode<T>): GrowthDirection | 'root' {
		if (currentLn.node.path === rootLn.node.path) return 'root';
		return currentLn.cx < rootLn.cx ? 'left' : 'right';
	}

	/** Cross-axis neighbor constrained to the same arm of a balanced layout */
	function findBalancedCrossNeighbor(
		currentLn: LayoutNode<T>, rootCx: number, axis: 'x' | 'y', forward: boolean
	): LayoutNode<T> | null {
		const isLeft = currentLn.cx < rootCx;
		const candidates = layoutNodes.filter(ln =>
			ln.depth === currentLn.depth && (isLeft ? ln.cx < rootCx : ln.cx >= rootCx)
		);
		return findNearest(currentLn, candidates, axis, forward);
	}

	// ── Context menu keyboard shortcut handling ──────────────────────────
	function parseShortcut(shortcut: string): { key: string; ctrl: boolean; shift: boolean; alt: boolean } {
		const parts = shortcut.split('+').map(p => p.trim());
		const key = parts.pop()!;
		return {
			key: key.toLowerCase(),
			ctrl: parts.some(p => p.toLowerCase() === 'ctrl'),
			shift: parts.some(p => p.toLowerCase() === 'shift'),
			alt: parts.some(p => p.toLowerCase() === 'alt'),
		};
	}

	function findEntryByShortcut(entries: ContextMenuEntry[], event: KeyboardEvent): ContextMenuEntry | null {
		for (const entry of entries) {
			if ('divider' in entry) continue;
			if (entry.isVisible === false || entry.isDisabled) continue;
			if (entry.shortcut) {
				const parsed = parseShortcut(entry.shortcut);
				const eventKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
				if (eventKey === parsed.key && event.ctrlKey === parsed.ctrl && event.shiftKey === parsed.shift && event.altKey === parsed.alt) {
					return entry;
				}
			}
			if (entry.children) {
				const found = findEntryByShortcut(entry.children, event);
				if (found) return found;
			}
		}
		return null;
	}

	function onKeyDown(e: KeyboardEvent) {
		// Don't handle keys when focus is in input fields
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

		// Handle node context menu shortcuts
		if (ctrlRef?.contextMenuVisible) {
			if (e.key === 'Escape') {
				ctrlRef.closeContextMenu();
				return;
			}

			if (ctrlRef.contextMenuNode && getNodeContextMenuItemsHandler) {
				const entries = getNodeContextMenuItemsHandler(ctrlRef.contextMenuNode, ctrlRef.getSelectedNodes());
				const match = findEntryByShortcut(entries, e);
				if (match && !('divider' in match) && match.onclick) {
					e.preventDefault();
					try {
						match.onclick();
					} catch (error) {
						console.error('Context menu shortcut error:', error);
					}
					ctrlRef.closeContextMenu();
					return;
				}
			}
		}

		// Handle canvas context menu shortcuts
		if (canvasMenuVisible) {
			if (e.key === 'Escape') {
				canvasMenuVisible = false;
				return;
			}

			const match = findEntryByShortcut(canvasMenuEntries, e);
			if (match && !('divider' in match) && match.onclick) {
				e.preventDefault();
				try {
					match.onclick();
				} catch (error) {
					console.error('Canvas context menu shortcut error:', error);
				}
				canvasMenuVisible = false;
				return;
			}
		}

		// Clipboard shortcuts (Ctrl+C/X/V, Escape to cancel cut)
		if (enableClipboard && ctrlRef && !ctrlRef.contextMenuVisible && !canvasMenuVisible) {
			if (e.ctrlKey && e.key === 'c') {
				ctrlRef.copyNodes();
				e.preventDefault();
				return;
			}
			if (e.ctrlKey && e.key === 'x') {
				ctrlRef.cutNodes();
				requestRedraw();
				e.preventDefault();
				return;
			}
			if (e.ctrlKey && e.key === 'v' && transformDataForPaste) {
				// selectedPath = paste as child; no selection = paste as root
				const result = ctrlRef.pasteNodes(selectedPath ?? '', transformDataForPaste, 'child');
				onPasteHandler?.(result);
				requestRedraw();
				e.preventDefault();
				return;
			}
			if (e.key === 'Escape' && ctrlRef.getClipboardOperation() === 'cut') {
				ctrlRef.cancelCut();
				requestRedraw();
				e.preventDefault();
				return;
			}
		}

		if (!ctrlRef || !selectedPath) return;

		// Enter/Space: toggle expand/collapse
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			ctrlRef.navToggle();
			return;
		}
		// Home: select first node (Shift: extend highlight)
		if (e.key === 'Home') {
			e.preventDefault();
			e.shiftKey ? ctrlRef.navHighlightFirst() : ctrlRef.navFirst();
			return;
		}
		// End: select last node (Shift: extend highlight)
		if (e.key === 'End') {
			e.preventDefault();
			e.shiftKey ? ctrlRef.navHighlightLast() : ctrlRef.navLast();
			return;
		}
		// PageDown/PageUp (Shift: extend highlight)
		if (e.key === 'PageDown') {
			e.preventDefault();
			e.shiftKey ? ctrlRef.navHighlightPageDown() : ctrlRef.navPageDown();
			return;
		}
		if (e.key === 'PageUp') {
			e.preventDefault();
			e.shiftKey ? ctrlRef.navHighlightPageUp() : ctrlRef.navPageUp();
			return;
		}
		// Backspace: collapse parent + select it
		if (e.key === 'Backspace') {
			e.preventDefault();
			ctrlRef.navBackOut();
			return;
		}

		// Arrow keys: resolve physical key → logical action → nav method
		// Special case: balanced root node, ArrowLeft/Right enter specific arms
		if (layoutMode === 'balanced') {
			const node = ctrlRef.getNodeByPath(selectedPath);
			if (node) {
				const currentLn = layoutNodes.find(ln => ln.node.path === node.path);
				const rootLn = getBalancedRootLn();
				if (currentLn && rootLn && getBalancedArmDir(currentLn, rootLn) === 'root') {
					if (e.key === 'ArrowRight') {
						e.preventDefault();
						const rightKids = (currentLn.children || []).filter(c => c.cx > currentLn.cx);
						if (rightKids.length > 0) {
							const best = rightKids.reduce((a, b) =>
								Math.abs(a.cy - currentLn.cy) < Math.abs(b.cy - currentLn.cy) ? a : b
							);
							navigateToPath(best.node.path);
						}
						return;
					} else if (e.key === 'ArrowLeft') {
						e.preventDefault();
						const leftKids = (currentLn.children || []).filter(c => c.cx < currentLn.cx);
						if (leftKids.length > 0) {
							const best = leftKids.reduce((a, b) =>
								Math.abs(a.cy - currentLn.cy) < Math.abs(b.cy - currentLn.cy) ? a : b
							);
							navigateToPath(best.node.path);
						}
						return;
					}
					// Up/Down from root: no siblings — do nothing
					return;
				}
			}
		}

		// Special case: fishbone physical-key-to-action mapping differs from generic
		if (layoutMode === 'fishbone') {
			const currentLn = layoutNodes.find(ln => ln.node.path === selectedPath);
			if (!currentLn) return;

			const isH = !(growthDirection === 'up' || growthDirection === 'down');
			const branchAxis: 'x' | 'y' = isH ? 'y' : 'x';
			const spineForwardKey = isH ? 'ArrowLeft' : 'ArrowUp';
			const spineBackKey = isH ? 'ArrowRight' : 'ArrowDown';
			const branchKey1 = isH ? 'ArrowUp' : 'ArrowLeft';
			const branchKey2 = isH ? 'ArrowDown' : 'ArrowRight';

			if (currentLn.depth === 0) {
				// Root: only spine forward enters children
				if (e.key === spineForwardKey) {
					e.preventDefault();
					ctrlRef.navInto();
				}
				return;
			}

			if (currentLn.depth === 1) {
				// Spine node: spine keys = cross siblings, branch keys = enter/cross children
				if (e.key === spineForwardKey || e.key === spineBackKey) {
					e.preventDefault();
					if (e.key === spineBackKey) ctrlRef.navNextSibling();
					else ctrlRef.navPrevSibling();
				} else if (e.key === branchKey1 || e.key === branchKey2) {
					e.preventDefault();
					// Enter branch children in pressed direction, or cross to other side
					const myBranchPos = branchAxis === 'y' ? currentLn.cy : currentLn.cx;
					const rootLn = layoutNodes.find(ln => ln.depth === 0);
					const rootBranchPos = rootLn ? (branchAxis === 'y' ? rootLn.cy : rootLn.cx) : myBranchPos;
					const mySpineSide = myBranchPos < rootBranchPos ? 'before' : 'after';
					const wantBefore = e.key === branchKey1;
					const children = currentLn.children || [];
					const childrenInDir = children.filter(c => {
						const cPos = branchAxis === 'y' ? c.cy : c.cx;
						return wantBefore ? cPos < myBranchPos : cPos > myBranchPos;
					});

					if (childrenInDir.length > 0) {
						const spineAxis: 'x' | 'y' = isH ? 'x' : 'y';
						const best = childrenInDir.reduce((a, b) => {
							const da = Math.abs((spineAxis === 'x' ? a.cx : a.cy) - (spineAxis === 'x' ? currentLn.cx : currentLn.cy));
							const db = Math.abs((spineAxis === 'x' ? b.cx : b.cy) - (spineAxis === 'x' ? currentLn.cx : currentLn.cy));
							return da < db ? a : b;
						});
						navigateToPath(best.node.path);
					} else {
						// Cross to other side
						const allSpine = layoutNodes.filter(ln => ln.depth === 1);
						const oppositeSide = mySpineSide === 'before' ? 'after' : 'before';
						const otherSide = allSpine.filter(ln => {
							const lnBranchPos = branchAxis === 'y' ? ln.cy : ln.cx;
							const lnSide = lnBranchPos < rootBranchPos ? 'before' : 'after';
							return lnSide === oppositeSide;
						});
						const spineAxis: 'x' | 'y' = isH ? 'x' : 'y';
						const mySpinePos = spineAxis === 'x' ? currentLn.cx : currentLn.cy;
						otherSide.sort((a, b) => {
							const da = Math.abs((spineAxis === 'x' ? a.cx : a.cy) - mySpinePos);
							const db = Math.abs((spineAxis === 'x' ? b.cx : b.cy) - mySpinePos);
							return da - db;
						});
						const nearest = otherSide[0] ?? null;
						if (nearest) navigateToPath(nearest.node.path);
					}
				}
				return;
			}

			// Branch node (depth 2+): spine keys = cross siblings, branch keys = parent/child/cross
			if (e.key === spineForwardKey || e.key === spineBackKey) {
				e.preventDefault();
				if (e.key === spineBackKey) ctrlRef.navNextSibling();
				else ctrlRef.navPrevSibling();
			} else if (e.key === branchKey1 || e.key === branchKey2) {
				e.preventDefault();
				const wantBefore = e.key === branchKey1;
				const myPos = branchAxis === 'y' ? currentLn.cy : currentLn.cx;
				const parent = currentLn.parent;
				const parentPos = parent ? (branchAxis === 'y' ? parent.cy : parent.cx) : null;
				const parentIsBefore = parentPos !== null && parentPos < myPos;
				const parentIsAfter = parentPos !== null && parentPos > myPos;
				const children = currentLn.children || [];
				const childrenInDir = children.filter(c => {
					const cPos = branchAxis === 'y' ? c.cy : c.cx;
					return wantBefore ? cPos < myPos : cPos > myPos;
				});

				if ((wantBefore ? parentIsBefore : parentIsAfter) && parent) {
					navigateToPath(parent.node.path);
				} else if (childrenInDir.length > 0) {
					const spineAxis: 'x' | 'y' = isH ? 'x' : 'y';
					const best = childrenInDir.reduce((a, b) => {
						const da = Math.abs((spineAxis === 'x' ? a.cx : a.cy) - (spineAxis === 'x' ? currentLn.cx : currentLn.cy));
						const db = Math.abs((spineAxis === 'x' ? b.cx : b.cy) - (spineAxis === 'x' ? currentLn.cx : currentLn.cy));
						return da < db ? a : b;
					});
					navigateToPath(best.node.path);
				} else if (fishboneCrossNav) {
					const getSpineAncestor = (ln: LayoutNode<T>): LayoutNode<T> => {
						let a = ln;
						while (a.parent && a.depth > 1) a = a.parent;
						return a;
					};
					const getSpineSide = (ln: LayoutNode<T>): 'before' | 'after' => {
						const coord = branchAxis === 'y' ? ln.cy : ln.cx;
						const spine = getSpineAncestor(ln);
						const spineCoord = branchAxis === 'y' ? spine.cy : spine.cx;
						return coord < spineCoord ? 'before' : 'after';
					};
					const mySide = getSpineSide(currentLn);
					const oppositeSide = mySide === 'before' ? 'after' : 'before';
					const spineAxis: 'x' | 'y' = isH ? 'x' : 'y';
					const crossCandidates = layoutNodes.filter(ln =>
						ln.depth === currentLn.depth && getSpineSide(ln) === oppositeSide
					);
					const nearest = findNearest(currentLn, crossCandidates, spineAxis, true)
						|| findNearest(currentLn, crossCandidates, spineAxis, false);
					if (nearest) {
						navigateToPath(nearest.node.path);
					} else if (parent) {
						navigateToPath(parent.node.path);
					}
				} else if (parent) {
					navigateToPath(parent.node.path);
				}
			}
			return;
		}

		// Generic and balanced (non-root) layouts: map arrow key → nav method
		// For balanced layout, invert Left/Right for nodes on the left arm
		let navDir: GrowthDirection | undefined;
		if (layoutMode === 'balanced') {
			const currentLn = layoutNodes.find(ln => ln.node.path === selectedPath);
			const rootLn = getBalancedRootLn();
			if (currentLn && rootLn) {
				const arm = getBalancedArmDir(currentLn, rootLn);
				if (arm === 'left') navDir = 'left';
				else if (arm === 'right') navDir = 'right';
			}
		}
		const action = resolveNavAction(e.key, navDir);
		if (!action) return;
		e.preventDefault();

		if (e.shiftKey && (action === 'crossNext' || action === 'crossPrev')) {
			// Shift+cross arrow: extend highlight
			if (action === 'crossNext') ctrlRef.navHighlightNext();
			else ctrlRef.navHighlightPrev();
		} else {
			switch (action) {
				case 'crossNext':   ctrlRef.navNextSibling(); break;
				case 'crossPrev':   ctrlRef.navPrevSibling(); break;
				case 'treeForward': ctrlRef.navInto(); break;
				case 'treeBack':    ctrlRef.navOut(); break;
			}
		}
	}

	function navigateToPath(path: string) {
		selectedPath = path;
		selectedPaths = new Set([path]);
		doLayout(); // ensure node is in layout (may have been expanded)
		interaction.ensurePathVisible(path);
	}

	// ── Effects ─────────────────────────────────────────────────────────

	// Auto-pan to selected node when selectedPath changes externally
	$effect(() => {
		const path = selectedPath;
		if (autoFocusOnSelect && path && canvasEl) {
			interaction.ensurePathVisible(path);
			// Also scroll the page so the canvas container is visible
			if (containerEl) {
				containerEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			}
		}
	});

	// Clear text cache when font changes
	$effect(() => {
		const _font = fontStr;
		textCache.setFont(_font);
	});

	// Reposition viewport when growth direction changes via binding
	let prevDirection: GrowthDirection | null = null;
	$effect(() => {
		const dir = growthDirection;
		if (prevDirection !== null && prevDirection !== dir && containerEl) {
			// Direction changed — reposition pan to show root
			doLayout();
			const { x, y } = panForDirection(dir);
			interaction.setPan(x, y);
			interaction.setZoom(1);
			requestRedraw();
		}
		prevDirection = dir;
	});

	// Rebuild layout when tree or config changes
	$effect(() => {
		if (!ctrlRef || !canvasEl) return;
		const _tracker = ctrlRef.tree.changeTracker;
		const _direction = growthDirection;
		const _grouped = groupSiblings;
		const _dots = showDotGrid;
		const _layoutMode = layoutMode;
		// Track all layout-affecting state (effective values resolve prop → theme)
		void [eColumnGap, gridNodeMaxW, eNodeHeight, eNodeGap, eLevelSpacingV,
			eNodePaddingX, eNodeMinWidth, eColorBarWidth, eFontSize, fontFamily,
			gridGap, groupPadding, maxGridCols, eDepthColors, levelConfig,
			zoomLodText, zoomLodSimple, balancedSplit, radialStartAngle, radialSpacing,
			sunburstRingWidth, sunburstRootTitle];
		console.log('[effect:relayout] triggered — changeTracker or config changed');
		doLayout();
		requestRedraw();
	});

	// Sync highlighted paths → local selectedPaths bindable + trigger redraw
	$effect(() => {
		if (!ctrlRef) return;
		const hp = ctrlRef.highlightedPaths;
		selectedPaths = hp;
		requestRedraw();
	});

	// Read CSS theme variables from container
	$effect(() => {
		if (!containerEl) return;
		void themePropOverrides; // re-run when prop overrides change
		buildTheme();
	});

	// ResizeObserver
	$effect(() => {
		if (!containerEl) return;
		const ro = new ResizeObserver(() => {
			buildTheme();
			requestRedraw();
		});
		ro.observe(containerEl);
		return () => ro.disconnect();
	});

	// Cleanup rAF
	$effect(() => {
		return () => {
			if (rafId != null) cancelAnimationFrame(rafId);
		};
	});

	onDestroy(() => {
		interaction.destroy();
	});

	// ── Public Methods ──────────────────────────────────────────────────

	export function zoomToFit() {
		interaction.zoomToFit();
	}

	export function focusOnPath(path: string, options?: FocusOptions) {
		if (!ctrlRef) return;
		const node = ctrlRef.getNodeByPath(path);
		if (!node) return;
		if (node.parentPath) {
			ctrlRef.expandNodes(node.parentPath);
			doLayout();
		}
		interaction.focusOnPath(path, options);
	}

	/** Scroll to a node without changing level-axis pan.
	 *  In horizontal layout: only adjusts vertical scroll.
	 *  In vertical layout: only adjusts horizontal scroll.
	 *  If the node is already visible, does nothing. */
	export function scrollToPath(path: string) {
		if (!ctrlRef) return;
		const node = ctrlRef.getNodeByPath(path);
		if (!node) return;
		if (node.parentPath) {
			ctrlRef.expandNodes(node.parentPath);
			doLayout();
		}
		interaction.scrollToPath(path);
	}

	export function expandAll(nodePath?: string | null) {
		if (!ctrlRef) return;
		if (layoutMode === 'sunburst') {
			sunburstExpandAll(ctrlRef, nodePath ?? null);
		} else {
			ctrlRef.expandAll(nodePath);
		}
		recomputeAndDraw();
		// Focus on the target node (or first root) and zoom out to show the expanded tree
		const focusPath = nodePath ?? ctrlRef.tree.tree[0]?.path;
		if (focusPath) {
			interaction.focusOnPath(focusPath, { zoom: 0.5, select: false });
		}
	}

	/** Sunburst-aware expand: at each parent, check if children would overflow
	 *  into sub-rings. If they fit → expand ALL. If overflow → only the biggest.
	 *  This adapts to the angular space available at each depth. */
	function sunburstExpandAll(ctrl: TreeController<T>, nodePath: string | null) {
		const MIN_ARC = 40; // matches MIN_ARC_PX in canvas-layout-sunburst.ts
		const MAX_CHILD_SWEEP = Math.PI * 1.8; // matches MAX_CHILD_SWEEP in canvas-layout-sunburst.ts
		const MIN_EXPAND_SWEEP = 0.15; // ~8.6°, stop recursing into narrower slices
		const rw = sunburstRingWidth;

		function countAllDescendants(node: LTreeNode<T>): number {
			const children = Object.values(node.children);
			if (children.length === 0) return 0;
			let total = children.length;
			for (const child of children) total += countAllDescendants(child);
			return total;
		}

		/**
		 * @param ringIndex - the actual ring index (accounts for overflow sub-rings from ancestors)
		 */
		function expandNode(node: LTreeNode<T>, ringIndex: number, parentSweep: number) {
			if (!node.hasChildren) return;
			ctrl.expandNodes(node.path);

			const children = ctrl.getChildren(node.path);
			if (children.length === 0) return;

			const childRing = ringIndex + 1;
			const midR = childRing * rw + rw / 2;
			const minChildArc = midR > 0 ? (MIN_ARC / midR) : 0.1;
			const totalMinSweep = children.length * minChildArc;
			const needsOverflow = totalMinSweep > parentSweep;
			const effectiveSweep = needsOverflow ? Math.min(parentSweep, MAX_CHILD_SWEEP) : parentSweep;
			const capacity = Math.max(1, Math.floor(effectiveSweep / minChildArc));

			// Count total descendants for sweep distribution
			const descCounts: { child: LTreeNode<T>; count: number }[] = [];
			let totalDesc = 0;
			for (const child of children) {
				const count = Math.max(1, countAllDescendants(child));
				descCounts.push({ child, count });
				totalDesc += count;
			}

			if (!needsOverflow) {
				// Fits without overflow → expand ALL children, single ring consumed
				// But limit deep recursion to max 1 branch to prevent overlap from
				// multiple siblings each creating deep overflow sub-ring chains
				const MAX_DEEP_BRANCHES = 1;
				let deepCount = 0;
				// Sort by descendant count descending so biggest branches get priority
				const sorted = [...descCounts].sort((a, b) => b.count - a.count);
				for (const { child, count } of sorted) {
					const childSweep = parentSweep * (count / totalDesc);
					const canRecurse = childSweep >= MIN_EXPAND_SWEEP && deepCount < MAX_DEEP_BRANCHES;
					if (canRecurse) {
						deepCount++;
						expandNode(child, childRing, childSweep);
					} else if (child.isExpanded) {
						// Collapse children we don't recurse into — their old expanded
						// subtrees would overlap with the branches we DO expand
						ctrl.collapseNodes(child.path);
					}
				}
			} else {
				// Would overflow → only expand the biggest child
				// Calculate how many sub-rings the overflow consumes (matches layout engine)
				const numRows = Math.ceil(children.length / capacity);
				const extraRings = numRows - 1; // first row is the normal ring

				descCounts.sort((a, b) => b.count - a.count);
				const biggest = descCounts[0];
				const biggestSweep = parentSweep * (biggest.count / totalDesc);

				// Collapse collapsible siblings
				for (const child of children) {
					if (child.path !== biggest.child.path && child.isExpanded && ctrl.getNodeIsCollapsible(child)) {
						ctrl.collapseNodes(child.path);
					}
				}
				// Always drill deeper on the single biggest path — no sweep threshold
				// Skip past the extra sub-rings consumed by the overflow
				expandNode(biggest.child, childRing + extraRings, biggestSweep);
			}
		}

		if (nodePath) {
			const node = ctrl.tree.getNodeByPath(nodePath);
			if (node) expandNode(node, node.level ?? 0, Math.PI * 2);
		} else {
			for (const root of ctrl.tree.tree) {
				expandNode(root, 0, Math.PI * 2);
			}
		}
	}

	export function collapseAll(nodePath?: string | null) {
		if (!ctrlRef) return;
		ctrlRef.collapseAll(nodePath);
		recomputeAndDraw();
		// Focus on the target node (or first root) to center the collapsed tree
		const focusPath = nodePath ?? ctrlRef.tree.tree[0]?.path;
		if (focusPath) {
			interaction.focusOnPath(focusPath, { zoom: 'auto', select: false });
		}
	}

	export function searchNodes(query: string): LTreeNode<T>[] {
		if (!ctrlRef) return [];
		searchResults = ctrlRef.searchNodes(query);
		matchedPaths = new Set(searchResults.map(n => n.path));
		if (searchResults.length > 0) {
			currentResultIndex = 0;
			navigateToResult(0);
		} else {
			currentResultIndex = -1;
			requestRedraw();
		}
		return searchResults;
	}

	export function filterNodes(query: string) {
		if (!ctrlRef) return;
		ctrlRef.filterNodes(query);
		// changeTracker effect handles layout recomputation
	}

	export function clearSearch() {
		searchResults = [];
		currentResultIndex = -1;
		matchedPaths = new Set();
		if (ctrlRef) ctrlRef.filterNodes('');
		requestRedraw();
	}

	export function navigateToResult(index: number) {
		if (!ctrlRef || searchResults.length === 0) return;
		currentResultIndex = ((index % searchResults.length) + searchResults.length) % searchResults.length;
		const node = searchResults[currentResultIndex];
		selectedPath = node.path;
		selectedPaths = new Set([node.path]);
		if (node.parentPath) {
			ctrlRef.expandNodes(node.parentPath);
		}
		doLayout();
		const ln = layoutNodes.find(n => n.node.path === node.path);
		if (ln) interaction.focusOnNode(ln);
		else requestRedraw();
	}

	export function nextResult() {
		if (searchResults.length === 0) return;
		navigateToResult(currentResultIndex + 1);
	}

	export function prevResult() {
		if (searchResults.length === 0) return;
		navigateToResult(currentResultIndex - 1);
	}

	export function getSearchResults() {
		return { results: searchResults, currentIndex: currentResultIndex, matchedPaths };
	}

	/** Compute the initial pan so the viewport starts at the root's corner or at the origin */
	function panForDirection(dir: GrowthDirection): { x: number; y: number } {
		const pad = 40;
		if (initialViewport === 'origin') {
			console.log(`[panForDirection] dir=${dir}, initialViewport=${initialViewport} → pan=(${pad}, ${pad})`);
			return { x: pad, y: pad };
		}
		const rect = containerEl?.getBoundingClientRect();
		const cw = rect?.width ?? 800;
		const ch = rect?.height ?? 600;
		// Center the viewport on the root node:
		// - horizontal dirs (left/right): root is at one horizontal edge, vertically centered
		// - vertical dirs (up/down): root is at one vertical edge, horizontally centered
		const centerY = (ch - layoutHeight) / 2;
		const centerX = (cw - layoutWidth) / 2;
		let result: { x: number; y: number };
		switch (dir) {
			case 'right': result = { x: pad, y: centerY }; break;
			case 'left':  result = { x: cw - layoutWidth - pad, y: centerY }; break;
			case 'down':  result = { x: centerX, y: pad }; break;
			case 'up':    result = { x: centerX, y: ch - layoutHeight - pad }; break;
		}
		console.log(`[panForDirection] dir=${dir}, initialViewport=${initialViewport}, container=${cw}x${ch}, layout=${layoutWidth}x${layoutHeight} → pan=(${result.x}, ${result.y})`);
		return result;
	}

	export function setGrowthDirection(dir: GrowthDirection) {
		growthDirection = dir;
		interaction.setZoom(1);
		doLayout();
		const { x, y } = panForDirection(dir);
		interaction.setPan(x, y);
		requestRedraw();
	}

	/** @deprecated Use setGrowthDirection instead */
	export function setOrientation(o: Orientation) {
		setGrowthDirection(o === 'vertical' ? 'down' : 'right');
	}

	export function getLayoutNodes(): LayoutNode<T>[] {
		return layoutNodes;
	}

	export function refreshTheme() {
		buildTheme();
		requestRedraw();
	}
</script>

<svelte:window onkeydown={onKeyDown} />

<TreeProvider
	{data}
	{idMember}
	{pathMember}
	{sortCallback}
	{isSorted}
	{expandLevel}
	parentPathMember={parentPathMember}
	levelMember={levelMember}
	hasChildrenMember={hasChildrenMember}
	displayValueMember={displayValueMember}
	getDisplayValueCallback={getDisplayValueCallback}
	searchValueMember={searchValueMember}
	getSearchValueCallback={getSearchValueCallback}
	treePathSeparator={treePathSeparator}
	dragDropMode={dragDropMode}
	shouldUseInternalSearchIndex={shouldUseInternalSearchIndex}
	rangeSelectionMode={rangeSelectionMode}
	isExpandedMember={isExpandedMember}
	isDraggableMember={isDraggableMember}
	getIsDraggableCallback={getIsDraggableCallback}
	isDropAllowedMember={isDropAllowedMember}
	allowedDropPositionsMember={allowedDropPositionsMember}
	getAllowedDropPositionsCallback={getAllowedDropPositionsCallback}
	isCollapsibleMember={isCollapsibleMember}
	getIsCollapsibleCallback={getIsCollapsibleCallback}
	orderMember={orderMember}
	getContextMenuItemsCallback={getNodeContextMenuItemsHandler ? (node, _close, selectedNodes) => getNodeContextMenuItemsHandler(node, selectedNodes) : undefined}
	contextMenuXOffset={8}
	contextMenuYOffset={4}
>
	{#snippet children(ctrl)}
		{@const _init = captureCtrl(ctrl)}
		<div class="canvas-tree-wrapper" bind:this={containerEl}>
			<canvas
				bind:this={canvasEl}
				onwheel={interaction.onWheel}
				onmousedown={interaction.onMouseDown}
				onmousemove={interaction.onMouseMove}
				onmouseup={interaction.onMouseUp}
				onmouseleave={interaction.onMouseLeave}
				ondblclick={interaction.onDblClick}
				oncontextmenu={interaction.onContextMenu}
			></canvas>
		</div>

		{#if tooltipLn && !ctrl.contextMenuVisible && !canvasMenuVisible}
			<div class="canvas-tree-tooltip" style="position: fixed; left: {tooltipX}px; top: {tooltipY}px;">
				{#if tooltipSnippet}
					{@render tooltipSnippet(tooltipLn.node, getLabel(tooltipLn.node))}
				{:else}
					<strong>{getLabel(tooltipLn.node)}</strong>
					<span class="canvas-tree-tooltip-meta">Path: {tooltipLn.node.path}</span>
					{#if tooltipLn.node.hasChildren}
						<span class="canvas-tree-tooltip-meta">Children: {Object.keys(tooltipLn.node.children).length}{tooltipLn.node.isExpanded ? ' (expanded)' : ''}</span>
					{/if}
				{/if}
			</div>
		{/if}

		{#snippet renderCanvasEntries(entries: ContextMenuEntry[], closeFn: () => void)}
			{#each entries as entry}
				{#if 'divider' in entry}
					<div class="canvas-tree-ctx-menu-divider" role="separator">
						{#if entry.label}
							<span class="canvas-tree-ctx-menu-divider-label">{entry.label}</span>
						{/if}
					</div>
				{:else if entry.isVisible !== false}
					{@const hasChildren = entry.children && entry.children.length > 0}
					<div class="canvas-tree-ctx-menu-item-wrapper">
					<button
						class="canvas-tree-ctx-menu-item {entry.className || ''}"
						class:disabled={entry.isDisabled}
						class:has-children={hasChildren}
						disabled={entry.isDisabled}
						role="menuitem"
						onclick={async () => {
							if (!hasChildren) {
								try {
									await entry.onclick?.();
								} catch (error) {
									console.error('Context menu callback error:', error);
								}
								closeFn();
							}
						}}
					>
						{#if entry.icon}
							<span class="canvas-tree-ctx-menu-icon">{entry.icon}</span>
						{/if}
						<span class="canvas-tree-ctx-menu-label">{entry.label}</span>
						{#if entry.shortcut}
							<span class="canvas-tree-ctx-menu-shortcut">{entry.shortcut}</span>
						{/if}
						{#if hasChildren}
							<span class="canvas-tree-ctx-menu-arrow">&#x25B8;</span>
						{/if}
					</button>
					{#if hasChildren}
						<div class="canvas-tree-ctx-submenu" role="menu">
							{@render renderCanvasEntries(entry.children!, closeFn)}
						</div>
					{/if}
					</div>
				{/if}
			{/each}
		{/snippet}

		{#if ctrl.contextMenuVisible && ctrl.contextMenuNode}
			{@const menuEntries = ctrl.getContextMenuItemsHandler?.(ctrl.contextMenuNode, ctrl.closeContextMenu.bind(ctrl)) || []}
			{@const _log = console.debug(`[CanvasTree] Rendering context menu: node=${ctrl.contextMenuNode.path}, entries=${menuEntries.length}, pos=${ctrl.contextMenuX},${ctrl.contextMenuY}`)}
			<div class="canvas-tree-ctx-menu" style="position: fixed; left: {ctrl.contextMenuX}px; top: {ctrl.contextMenuY}px; z-index: 10000;" role="menu">
				<div class="canvas-tree-ctx-menu-header">{getLabel(ctrl.contextMenuNode as LTreeNode<T>)}</div>
				{@render renderCanvasEntries(menuEntries, ctrl.closeContextMenu.bind(ctrl))}
			</div>
		{/if}

		{#if canvasMenuVisible && canvasMenuEntries.length > 0}
			<div class="canvas-tree-ctx-menu" style="position: fixed; left: {canvasMenuX}px; top: {canvasMenuY}px;" role="menu">
				{@render renderCanvasEntries(canvasMenuEntries, () => { canvasMenuVisible = false; })}
			</div>
		{/if}
	{/snippet}
</TreeProvider>

<style>
	.canvas-tree-wrapper {
		width: 100%;
		height: 100%;
		min-height: 200px;
		overflow: hidden;
		position: relative;
	}

	.canvas-tree-wrapper canvas {
		display: block;
		width: 100%;
		height: 100%;
	}

	.canvas-tree-tooltip {
		pointer-events: none;
		background: var(--ct-tooltip-bg, #1e293b);
		color: var(--ct-tooltip-text, #f1f5f9);
		padding: 6px 10px;
		border-radius: var(--ct-tooltip-radius, 6px);
		font-size: 0.8rem;
		line-height: 1.4;
		max-width: 280px;
		z-index: 1000;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.canvas-tree-tooltip strong {
		display: block;
		margin-bottom: 2px;
	}

	:global(.canvas-tree-tooltip-meta) {
		display: block;
		color: #94a3b8;
		font-size: 0.75rem;
	}

	.canvas-tree-ctx-menu {
		background: var(--ct-menu-bg, #1e293b);
		border-radius: var(--ct-menu-radius, 8px);
		padding: 4px 0;
		min-width: 160px;
		z-index: 1000;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
		position: relative;
	}

	.canvas-tree-ctx-menu-header {
		padding: 6px 12px;
		font-size: 0.75rem;
		color: #94a3b8;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 200px;
	}

	.canvas-tree-ctx-menu-item {
		display: flex;
		align-items: center;
		width: 100%;
		padding: 6px 12px;
		border: none;
		background: none;
		color: var(--ct-menu-text, #f1f5f9);
		font-size: 0.8rem;
		text-align: left;
		cursor: pointer;
		white-space: nowrap;
		position: relative;
	}

	.canvas-tree-ctx-menu-item:hover:not(:disabled) {
		background: var(--ct-menu-hover, #334155);
	}

	.canvas-tree-ctx-menu-item.disabled {
		opacity: 0.4;
		cursor: default;
	}

	.canvas-tree-ctx-menu-item.danger {
		color: #f87171;
	}

	.canvas-tree-ctx-menu-item.danger:hover:not(:disabled) {
		background: rgba(248, 113, 113, 0.15);
	}

	.canvas-tree-ctx-menu-item.has-children {
		cursor: default;
	}

	.canvas-tree-ctx-menu-icon {
		margin-right: 8px;
		font-size: 0.75rem;
		width: 16px;
		text-align: center;
		flex-shrink: 0;
	}

	.canvas-tree-ctx-menu-label {
		flex-grow: 1;
	}

	.canvas-tree-ctx-menu-shortcut {
		margin-left: auto;
		padding-left: 16px;
		color: #64748b;
		font-size: 0.7rem;
		flex-shrink: 0;
	}

	.canvas-tree-ctx-menu-arrow {
		margin-left: 8px;
		font-size: 0.65rem;
		color: #64748b;
		flex-shrink: 0;
	}

	.canvas-tree-ctx-menu-divider {
		display: flex;
		align-items: center;
		margin: 4px 0;
		height: 1px;
		background: var(--ct-menu-hover, #334155);
	}

	.canvas-tree-ctx-menu-divider:has(.canvas-tree-ctx-menu-divider-label) {
		height: auto;
		background: none;
		gap: 8px;
		padding: 0 12px;
	}

	.canvas-tree-ctx-menu-divider:has(.canvas-tree-ctx-menu-divider-label)::before,
	.canvas-tree-ctx-menu-divider:has(.canvas-tree-ctx-menu-divider-label)::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--ct-menu-hover, #334155);
	}

	.canvas-tree-ctx-menu-divider-label {
		font-size: 0.65rem;
		color: #64748b;
		white-space: nowrap;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.canvas-tree-ctx-menu-item-wrapper {
		position: relative;
	}

	.canvas-tree-ctx-submenu {
		position: absolute;
		left: 100%;
		top: 0;
		background: var(--ct-menu-bg, #1e293b);
		border-radius: var(--ct-menu-radius, 8px);
		padding: 4px 0;
		min-width: 140px;
		z-index: 1001;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
		display: none;
	}

	.canvas-tree-ctx-menu-item-wrapper:hover > .canvas-tree-ctx-submenu {
		display: block;
	}
</style>
