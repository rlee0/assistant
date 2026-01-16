# Components Module (`/src/components`)

Reusable React components organized by category and purpose.

## Directory Structure

```
components/
├── ai/              # AI-specific UI components
├── feedback/        # User feedback components (errors, loading states)
├── providers/       # React context providers
├── skeletons/       # Loading skeleton components
└── ui/              # Base UI components (Radix UI + custom)
```

## Categories

### AI Components (`/components/ai`)

Components for visualizing and interacting with AI:

**Message & Content:**

- `Message` - Message display with streaming support
- `CodeBlock` - Syntax-highlighted code with copy functionality
- `Image` - AI-generated or attached images
- `Artifact` - AI-generated artifacts and deliverables
- `Canvas` - Interactive drawing/editing canvas
- `WebPreview` - Embedded web page previews

**Process Visualization:**

- `ChainOfThought` - Visualize AI reasoning process
- `Reasoning` - Display reasoning/thinking mode output
- `Checkpoint` - Show decision checkpoints
- `Plan` - Display AI-generated plans
- `Task` - Individual task representation
- `Queue` - Task queue visualization

**Interaction:**

- `PromptInput` - Enhanced input for prompts
- `ModelSelector` - Select AI model
- `Controls` - Action controls for AI
- `Toolbar` - AI interaction toolbar
- `Confirmation` - Confirm AI actions

**Navigation:**

- `Conversation` - Conversation list item
- `Panel` - Collapsible panels
- `OpenInChatGPT`, `OpenInClaude`, etc. - External AI integrations

**Graph Components:**

- `Node` - Graph node (@xyflow/react)
- `Edge` - Graph edge
- `Connection` - Node connections

**Information:**

- `Context` - Contextual information display
- `Sources` - Source citations
- `InlineCitation` - Inline reference citations
- `Tool` - Tool usage display
- `Suggestion` - Suggested prompts

**Feedback:**

- `Loader` - Loading indicators
- `Shimmer` - Shimmer loading effect

### UI Components (`/components/ui`)

Base UI components built with Radix UI:

**Form Controls:**

- `Button`, `ButtonGroup` - Action buttons
- `Input`, `Textarea` - Text input fields
- `Select`, `NativeSelect` - Selection dropdowns
- `Checkbox`, `Radio`, `Switch` - Boolean inputs
- `Slider` - Range input
- `Calendar` - Date picker
- `InputOTP` - One-time password input

**Layout:**

- `Card` - Content containers
- `Dialog`, `Sheet`, `Drawer` - Modal overlays
- `Tabs` - Tabbed content
- `Accordion`, `Collapsible` - Expandable sections
- `Separator` - Visual dividers
- `Sidebar` - Application sidebar
- `Resizable` - Resizable panels
- `ScrollArea` - Custom scrollbars

**Navigation:**

- `NavigationMenu` - Top-level navigation
- `Breadcrumb` - Breadcrumb trails
- `Menubar` - Menu bar
- `ContextMenu` - Right-click menus
- `DropdownMenu` - Dropdown menus
- `Pagination` - Page navigation

**Feedback:**

- `Alert`, `AlertDialog` - Alerts and confirmations
- `Toast` (via Sonner) - Toast notifications
- `Progress`, `ProgressBar` - Progress indicators
- `Spinner` - Loading spinner
- `Skeleton` - Content placeholders
- `Empty` - Empty state display

**Data Display:**

- `Table` - Data tables
- `Chart` - Recharts integration
- `Badge` - Status badges
- `Avatar` - User avatars
- `Tooltip` - Contextual help
- `HoverCard` - Hover-triggered cards
- `Popover` - Floating content

**Utilities:**

- `Label` - Form labels
- `Command` - Command palette
- `Field` - Form field wrapper
- `Item` - List item wrapper
- `Kbd` - Keyboard shortcut display

### Skeleton Components (`/components/skeletons`)

Loading states for better UX:

- `ChatSkeleton` - Chat interface loading state
- `MessageSkeleton` - Message loading placeholder
- `SidebarSkeleton` - Sidebar loading state
- `PageSkeleton` - Full page loading state
- `LoadingComponents` - Various loading states

### Feedback Components (`/components/feedback`)

User feedback and error handling:

- `ErrorBoundary` - React error boundary for graceful error handling

### Providers (`/components/providers`)

React context providers:

- `ProgressBarProvider` - Navigation progress bar context

## Usage Guidelines

### Importing Components

```typescript
// UI components - import from barrel export
import { Button, Dialog, Card } from "@/components/ui";

// AI components
import { Message, CodeBlock, Reasoning } from "@/components/ai";

// Skeletons
import { ChatSkeleton } from "@/components/skeletons";
```

### Component Patterns

**1. Composition over Configuration:**

```typescript
// Good: Composable
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>Content</DialogContent>
</Dialog>

// Avoid: Too many props
<Dialog open={...} onOpenChange={...} title={...} content={...} />
```

**2. Forwarding Refs:**

```typescript
const MyComponent = forwardRef<HTMLDivElement, Props>((props, ref) => {
  return <div ref={ref} {...props} />;
});
```

**3. Variant Types with CVA:**

```typescript
import { cva } from "class-variance-authority";

const buttonVariants = cva("base-classes", {
  variants: {
    variant: { default: "...", destructive: "..." },
    size: { default: "...", sm: "...", lg: "..." },
  },
});
```

## Best Practices

1. **Use barrel exports**: Import from category indexes when available
2. **Extend, don't modify**: Extend UI components rather than modifying them
3. **Use cn() utility**: For className merging and Tailwind conflicts
4. **Type safety**: Always type component props
5. **Accessibility**: Use Radix UI primitives for a11y
6. **Responsive design**: Use mobile-first Tailwind classes
7. **Dark mode**: Support with next-themes
8. **Documentation**: Add JSDoc comments for complex props

## Adding New Components

1. **Choose the right category**: ai, ui, skeletons, feedback, or providers
2. **Follow naming convention**: PascalCase for components, kebab-case for files
3. **Use TypeScript**: Define proper prop types
4. **Add to barrel export**: Update category `index.ts`
5. **Document props**: Use JSDoc for complex props
6. **Test responsiveness**: Verify mobile and desktop layouts
7. **Support themes**: Ensure dark mode compatibility
