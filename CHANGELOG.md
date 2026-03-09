# Changelog

All notable changes to `@keenmate/svelte-treeview-canvas` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0-rc02] - 2026-03-09

### Added
- **Unified Context Menu types**: Uses shared `ContextMenuEntry` / `ContextMenuDivider` / `ContextMenuItem` from `@keenmate/svelte-treeview`. Supports icons, keyboard shortcut hints, submenus (nested `children`), named dividers, `isVisible`, `isDisabled`, `className` (e.g. `"danger"`), and async `onclick`.
- **Context menu keyboard shortcuts**: When the context menu is open, pressing a shortcut key (e.g. `V`, `Ctrl+C`) triggers the matching item's `onclick`. Supports modifier keys (Ctrl, Shift, Alt). Escape closes the menu.
- **Context Menu example page** (`/examples/context-menu`): Interactive demo with 7 preset configurations (basic, icons+shortcuts, submenus, dividers, disabled/hidden, danger, full). Event log panel shows triggered actions.
- **`onCanvasContextMenu` prop**: Right-click on empty canvas space (no node) triggers a canvas-level context menu. Callback signature: `() => ContextMenuEntry[]`. Renders the same menu UI without the node header. Keyboard shortcuts work for canvas menu too.

### Fixed
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
