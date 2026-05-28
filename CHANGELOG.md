# Changelog

All notable changes to `@keenmate/svelte-treeview-canvas` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0-rc04] - 2026-05-28

### Added
- **Array variants on `expandAll` / `collapseAll`**: Both wrappers now accept `string | string[] | null` and forward to the core's array-aware methods (single emit per call). For the non-array case behavior is unchanged.
- **`{ exclusive: true }` on `expandAll`**: Forwarded to core. Opens the target path(s) and collapses anything currently expanded that isn't on the union-of-spines or under a target subtree — single pass, single emit. Sunburst mode approximates this by collapsing everything first (with `noEmit`) and then running the overflow-aware sunburst expand pass.
- **`{ noEmit: true }` on `expandAll` and `collapseAll`**: Skips the change emit so callers can batch operations and emit once via `controller.tree.refresh()`.
- **`expandNodes(path, options?)` and `collapseNodes(path, options?)` exported on `CanvasTree`**: Parity with the HTML `Tree` component. Accept `string | string[]` and forward to the core. Saves users from reaching into `ctrlRef` for common operations.
- **`isSelectedMember` and `isSelectableMember` props**: Passed through to the underlying `TreeProvider`. Seeds the bindable `selectedPaths` Set at insert time and controls whether a node is selectable. Requires `@keenmate/svelte-treeview` >= 5.0.0-rc07.

### Changed
- **Internal: `selectNode` / `selectNodes` → `highlightNode` / `highlightNodes`**: Migrated the canvas interaction handlers and the dendrogram example to the rc06-renamed methods. The old names still work on the core (deprecated aliases) but the canvas no longer calls them. No user-visible API change.
- **Peer dependency**: `@keenmate/svelte-treeview` >= 5.0.0-rc08 recommended (required for array variants, `{ exclusive }`, `{ noEmit }`, and `isSelectedMember`).

## [1.0.0-rc03] - 2026-03-31

### Added
- **Shift+Arrow/Home/End/PageUp/PageDown keyboard highlight**: Extends highlight selection via keyboard, delegating to core's `navHighlightNext`/`navHighlightPrev`/`navHighlightFirst`/`navHighlightLast`/`navHighlightPageDown`/`navHighlightPageUp`.
- **PageUp/PageDown navigation**: Jumps 10 visible nodes forward/back.
- **Interaction example page** (`/examples/interaction`): Interactive demo for click behavior, Ctrl+click / Shift+click multi-select, keyboard navigation, and selection state display (focused node, highlighted paths).

### Changed
- **`ClickBehavior` type**: Now imported from `@keenmate/svelte-treeview` instead of locally defined. Requires `@keenmate/svelte-treeview` >= 5.0.0-rc05.
- **Selection state reads `highlightedPaths` from controller**: Canvas draw, minimap, and context menu now read `ctrlRef.highlightedPaths` instead of local `selectedPaths` for visual highlight. This aligns with the core's three-level selection model (`focusedNode` / `highlightedPaths` / `selectedPaths`).
- **`deselectAll()` → `clearHighlight()`**: Empty-space click now calls `clearHighlight()` to clear UI highlights without affecting checkbox state.
- **`selectedNode` → `focusedNode`**: Internal references updated to match core API rename.
- **`lastSelectedPath` → `lastHighlightedPath`**: Internal references updated.

### Fixed
- **Highlighted nodes not visually updating on keyboard navigation**: Added `$effect` to sync `ctrlRef.highlightedPaths` → local `selectedPaths` bindable and trigger canvas redraw.

## [1.0.0-rc02] - 2026-03-12

### Added
- **Multi-select**: Ctrl+click toggles, Shift+click range selects, Shift+drag draws a selection rectangle on the canvas. New `selectedPaths` bindable (`Set<string>`), `onSelectionChanged` event, and `rangeSelectionMode` prop.
- **Visual vs Logical range selection**: `rangeSelectionMode="visual"` (default) uses 2D bounding-box from the canvas layout positions — only nodes visually between anchor and target are selected. `"logical"` selects all nodes in depth-first tree order (delegates to TreeController).
- **Selection rectangle**: Shift+drag on empty canvas space draws a dashed rectangle overlay. Nodes inside the rectangle are selected on mouse-up. Hold Ctrl+Shift+drag for additive selection.
- **Double-click expand**: In `clickBehavior="select"` mode, single click selects (for multi-select workflows) and double-click expands/collapses. Double-click works in all click modes.
- **4-level context menu system**: Node, node-selection, group box (`getGroupContextMenuItemsCallback`), and canvas (`getCanvasContextMenuItemsCallback`). Selection-aware menus via `selectedNodes` parameter.
- **`autoFocusOnSelect` prop**: When enabled, changing `selectedPath` auto-pans the canvas viewport to the selected node AND scrolls the browser page to the canvas container (using `scrollIntoView({ block: 'nearest' })` — no page jump if already visible).
- **Spatial keyboard navigation**: Full arrow-key navigation based on node positions. Layout-aware: handles tree, balanced, fishbone, and box modes with correct axis mapping. Includes `Home`/`End` for first/last node, `Backspace` to collapse-and-go-to-parent, `Space`/`Enter` to toggle expand.
- **`navigationOverrides` prop**: `TreeNavigationOverrides<T>` — override individual nav methods (`navInto`, `navOut`, `navNextSibling`, etc.) while keeping defaults for the rest.
- **Canvas clipboard integration**: `enableClipboard` prop enables Ctrl+C/X/V keyboard shortcuts. Cut nodes rendered at 40% opacity. `transformDataForPaste` and `onPaste` callbacks for custom paste workflows.
- **Branch-operations example** (`/examples/branch-operations`): Server-simulated cut/paste with visual cut dimming.
- **Canvas Dendrogram example**: Visual/Logical range mode toggle, selection count panel, all 4 context menu levels, double-click expand option, localStorage config persistence.
- **Org-chart localStorage persistence**: Layout mode, growth direction, theme, compact mode, auto-focus, click behavior, and group peers settings are now persisted across page reloads.
- **Unified Context Menu types**: Uses shared `ContextMenuEntry` / `ContextMenuDivider` / `ContextMenuItem` from `@keenmate/svelte-treeview`. Supports icons, keyboard shortcut hints, submenus (nested `children`), named dividers, `isVisible`, `isDisabled`, `className` (e.g. `"danger"`), and async `onclick`.
- **Context menu keyboard shortcuts**: When the context menu is open, pressing a shortcut key (e.g. `V`, `Ctrl+C`) triggers the matching item's `onclick`. Supports modifier keys (Ctrl, Shift, Alt). Escape closes the menu.
- **Context Menu example page** (`/examples/context-menu`): Interactive demo with 7 preset configurations (basic, icons+shortcuts, submenus, dividers, disabled/hidden, danger, full). Event log panel shows triggered actions.
- **`GroupBox.parentPath`**: Group boxes now store the path of their parent node for hit-testing.
- **Selection rectangle theme tokens**: `selectionRectFill` / `selectionRectStroke` in `CanvasTheme`, with CSS variables `--ct-selection-rect-fill` / `--ct-selection-rect-stroke`.

### Changed
- **Context menu callback naming**: `onNodeContextMenu` → `getNodeContextMenuItemsCallback`, `onGroupContextMenu` → `getGroupContextMenuItemsCallback`, `onCanvasContextMenu` → `getCanvasContextMenuItemsCallback`. Clearer distinction between events (fire-and-forget `on*`) and data providers (return value `get*Callback`).
- **`onSelectionChanged` → `onSelectionChange`**: Consistent event naming.

### Fixed
- **Balanced layout keyboard navigation**: Left/Right arrow keys were inverted for nodes on the left arm — pressing Left went to parent instead of children. Now correctly resolves direction per-arm.
- **Submenu aligned to top of menu instead of parent item**: Submenus (`children`) were positioned relative to the menu container, appearing at the top edge. Wrapped each item + submenu in a `position: relative` container so the submenu aligns with its parent item.

## [1.0.0-rc01] - 2026-03-08

### Added
- **`nodeMaxWidth` prop**: Caps node width so long labels get ellipsis-truncated instead of stretching indefinitely. Default `0` (unlimited). Also available as `--ct-node-max-width` CSS variable and in `CanvasTheme`.
- **`truncateText()` utility**: Exported helper for custom `renderBodyCallback` implementations — binary-search ellipsis truncation on a canvas context.
- **Ellipsis truncation in `defaultRenderBody`**: Text that exceeds available node width is now truncated with `…` instead of browser squish-to-fit.
- **`chevronFontWeight` theme property**: Controls the font weight used for chevron icons (`--ct-chevron-font-weight`, default `normal`). Enables icon fonts like Font Awesome Solid (weight `900`).
- **`chevronPaddingEnd` theme property**: Controls the distance from the node's end edge to the chevron icon (`--ct-chevron-padding-end`, default `14`). Uses logical naming for RTL compatibility. Replaces the previously hardcoded `14px` offset.

### Changed
- **Theming example — richer data**: Sample data replaced with org-chart-style people (name + role title + email) across 3 departments (17 nodes). Two-line `renderBodyCallback` draws bold name + muted subtitle per node.
- **Theming example — context menu**: Right-click menu with "Email", "Copy Email", and "Expand/Collapse Team" actions.
- **Theming example — geometry controls**: Added `nodeMaxWidth` slider and `showDotGrid` checkbox. Default `nodeHeight` raised to 44 for two-line content.
- **Theming example — Audi preset**: Uses Font Awesome 6 Solid chevron icons (`fa-chevron-right` / `fa-chevron-down`) to demonstrate icon font support.

## [0.1.0] - 2026-03-05

Initial internal release — canvas rendering extracted from `@keenmate/svelte-treeview` into a standalone package. (Published internally as `5.0.0-rc01` to match the parent package version; renumbered to `0.1.0` as this is a separate package.)

### Features
- **`CanvasTree` component**: Pan/zoom canvas with tree, balanced, fishbone, radial, box, and sunburst layout modes.
- **CSS variable theming**: `--base-*` shared design tokens flow into `--ct-*` component variables. Priority: `theme` prop → `--ct-*` → `--base-*` → hardcoded default.
- **Slot-level render callbacks**: `renderBackgroundCallback`, `renderColorBarCallback`, `renderBodyCallback`, `renderChevronCallback`, `renderBadgeCallback`, and full `renderNodeCallback` override.
- **`measureNodeWidthCallback` / `measureNodeHeightCallback`**: Custom node sizing.
- **Level-of-detail (LOD)**: Three zoom tiers (`full`, `medium`, `simple`) for progressive detail reduction.
- **Minimap**: Always-visible overview with viewport indicator.
- **Dot grid**: Optional background grid.
- **Drag and drop**: Canvas-native with drop zone overlays (before/after/child).
- **Context menu**: `onNodeContextMenu` callback returning `ContextMenuEntry[]`.
- **Tooltip**: DOM-based tooltip snippet over hovered nodes.
- **Search integration**: Dimming, match highlighting, and current-result navigation.
- **Focus API**: `focusOnPath()` / `focusOnNode()` with anchor, zoom, and animation options.
- **Depth colors**: 10-level cycling palette, configurable per-level via `levelConfig`.
- **Per-level overrides**: `CanvasLevelConfig` for height, width, gap, color per depth.
