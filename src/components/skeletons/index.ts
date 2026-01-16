/**
 * Skeleton Components Module
 *
 * Loading skeleton components for better UX during async operations.
 *
 * @module components/skeletons
 */

// Message skeletons
export { MessageSkeleton, MessageLoadingIndicator } from "./message-skeleton";

// Sidebar skeletons
export { SidebarConversationsSkeleton, UserProfileSkeleton } from "./sidebar-skeleton";

// Page skeletons
export { ChatInputSkeleton, ConversationAreaSkeleton, PageLoadingSkeleton } from "./page-skeleton";

// Model selector skeletons (aliased to avoid conflicts)
export { ModelSelectorSkeleton as ChatModelSelectorSkeleton } from "./chat-skeleton";
export { ModelSelectorSkeleton as SidebarModelSelectorSkeleton } from "./sidebar-skeleton";

// Generic loading components
export { LoadingCard, LoadingTableRow, LoadingCardGrid, LoadingList } from "./loading-components";
