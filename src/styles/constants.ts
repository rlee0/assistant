/**
 * Centralized Style Constants
 *
 * This file contains all reusable CSS class constants to minimize inline classnames
 * and standardize styling across the application.
 */

// ============================================================================
// Layout Constants
// ============================================================================

export const LAYOUT = {
  container: "flex flex-col",
  containerFull: "flex h-full flex-col",
  containerCentered: "flex items-center justify-center",
  flexRow: "flex flex-row items-center",
  flexCol: "flex flex-col",
  grid: "grid",
  gridCols2: "grid grid-cols-2",
  gridCols3: "grid grid-cols-3",
} as const;

// ============================================================================
// Spacing Constants
// ============================================================================

export const SPACING = {
  gap1: "gap-1",
  gap2: "gap-2",
  gap3: "gap-3",
  gap4: "gap-4",
  gap6: "gap-6",
  gap8: "gap-8",
  p2: "p-2",
  p3: "p-3",
  p4: "p-4",
  pt4: "pt-4",
  px2: "px-2",
  px3: "px-3",
  px4: "px-4",
  px6: "px-6",
  py2: "py-2",
  py3: "py-3",
  py4: "py-4",
  m2: "m-2",
  m4: "m-4",
  mt0: "mt-0",
  mt2: "mt-2",
  mt4: "mt-4",
  mb4: "mb-4",
} as const;

// ============================================================================
// Size Constants
// ============================================================================

export const SIZE = {
  full: "w-full h-full",
  wFull: "w-full",
  hFull: "h-full",
  size4: "size-4",
  size6: "size-6",
  size8: "size-8",
  size24: "size-24",
  minH0: "min-h-0",
  minW0: "min-w-0",
  maxW: {
    xs: "max-w-xs",
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "95%": "max-w-[95%]",
  },
} as const;

// ============================================================================
// Typography Constants
// ============================================================================

export const TEXT = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  semibold: "font-semibold",
  medium: "font-medium",
  normal: "font-normal",
  center: "text-center",
  muted: "text-muted-foreground",
  foreground: "text-foreground",
  primary: "text-primary",
  destructive: "text-destructive",
  truncate: "truncate",
  italic: "italic",
} as const;

// ============================================================================
// Border & Radius Constants
// ============================================================================

export const BORDER = {
  base: "border",
  b: "border-b",
  t: "border-t",
  none: "border-none",
  rounded: {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
  },
} as const;

// ============================================================================
// Background Constants
// ============================================================================

export const BG = {
  background: "bg-background",
  card: "bg-card",
  secondary: "bg-secondary",
  muted: "bg-muted",
  accent: "bg-accent",
  destructive: "bg-destructive",
  transparent: "bg-transparent",
  input: "bg-input",
} as const;

// ============================================================================
// Position Constants
// ============================================================================

export const POSITION = {
  relative: "relative",
  absolute: "absolute",
  fixed: "fixed",
  sticky: "sticky",
  top0: "top-0",
  bottom0: "bottom-0",
  left0: "left-0",
  right0: "right-0",
  zIndex: {
    z10: "z-10",
    z20: "z-20",
    z30: "z-30",
    z40: "z-40",
    z50: "z-50",
  },
} as const;

// ============================================================================
// Interactive States
// ============================================================================

export const INTERACTIVE = {
  hover: {
    accent: "hover:bg-accent",
    accentText: "hover:text-accent-foreground",
    opacity90: "hover:opacity-90",
  },
  focus: {
    ring: "focus-visible:ring-ring/50",
    outline: "outline-none focus-visible:ring-2",
  },
  disabled: {
    opacity: "disabled:opacity-50",
    pointerEvents: "disabled:pointer-events-none",
  },
  cursor: {
    pointer: "cursor-pointer",
    default: "cursor-default",
  },
} as const;

// ============================================================================
// Transition Constants
// ============================================================================

export const TRANSITION = {
  all: "transition-all",
  colors: "transition-colors",
  opacity: "transition-opacity",
} as const;

// ============================================================================
// Overflow Constants
// ============================================================================

export const OVERFLOW = {
  hidden: "overflow-hidden",
  auto: "overflow-auto",
  scroll: "overflow-scroll",
  xHidden: "overflow-x-hidden",
  yHidden: "overflow-y-hidden",
} as const;

// ============================================================================
// Display Constants
// ============================================================================

export const DISPLAY = {
  block: "block",
  hidden: "hidden",
  inlineFlex: "inline-flex",
  srOnly: "sr-only",
} as const;

// ============================================================================
// Shadow Constants
// ============================================================================

export const SHADOW = {
  none: "shadow-none",
  xs: "shadow-xs",
  sm: "shadow-sm",
  md: "shadow-md",
} as const;

// ============================================================================
// Flexbox/Grid Alignment
// ============================================================================

export const ALIGN = {
  itemsCenter: "items-center",
  itemsStart: "items-start",
  itemsEnd: "items-end",
  justifyCenter: "justify-center",
  justifyBetween: "justify-between",
  justifyEnd: "justify-end",
  selfAuto: "self-auto",
} as const;

// ============================================================================
// Common Component Patterns
// ============================================================================

export const PATTERNS = {
  card: "rounded-lg border bg-card p-4",
  button: "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2",
  input: "flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm",
  badge: "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
  modalOverlay: "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm",
  scrollArea: "flex flex-col flex-1 min-h-0 overflow-auto",
} as const;
