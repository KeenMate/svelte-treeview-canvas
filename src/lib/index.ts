// Component
export { default as CanvasTree } from "./CanvasTree.svelte"

// Canvas types (for users writing custom render callbacks)
export type {
    CanvasRenderContext, CanvasNodeBounds, CanvasNodeState, CanvasVisualConfig,
    CanvasLevelConfig,
    RenderNodeCallback, RenderSlotCallback,
    MeasureNodeWidthCallback, MeasureNodeHeightCallback, GetNodeLabelCallback,
    LodLevel, Orientation, GrowthDirection, LayoutMode, ClickBehavior, InitialViewport,
    LayoutNode, GroupBox, NodeRenderSlots,
    FocusAnchor, FocusZoom, FocusOptions
} from "./types.js"

// Default renderers (for composition)
export {
    defaultRenderBackground, defaultRenderColorBar,
    defaultRenderBody, defaultRenderChevron, defaultRenderBadge
} from "./canvas-renderer.js"

// Canvas theming
export type { CanvasTheme } from "./canvas-theme.js"
export { defaultCanvasTheme } from "./canvas-theme.js"

// Re-export core types for convenience
export type { LTreeNode, DropPosition, ContextMenuItem, TreeControllerProps } from "@keenmate/svelte-treeview"
export { TreeController } from "@keenmate/svelte-treeview"
