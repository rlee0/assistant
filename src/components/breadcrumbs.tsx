"use client";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface BreadcrumbSegment {
  label: string;
  href: string;
}

// Map of route segments to human-readable labels
const segmentLabels: Record<string, string> = {
  settings: "Settings",
  login: "Login",
  signup: "Sign Up",
  chat: "Chat",
  api: "API",
  account: "Account",
  models: "Models",
};

function formatSegmentLabel(segment: string): string {
  // Check if there's a custom label
  if (segmentLabels[segment]) {
    return segmentLabels[segment];
  }

  // If it looks like a UUID or ID, keep it as is or truncate
  if (segment.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i)) {
    return segment.slice(0, 8) + "...";
  }

  // Otherwise, capitalize and replace hyphens/underscores with spaces
  return segment
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface BreadcrumbsProps {
  /**
   * Maximum number of items to show before collapsing into a dropdown
   * @default 3
   */
  maxItems?: number;
  /**
   * Show home icon instead of "Home" text
   * @default true
   */
  showHomeIcon?: boolean;
  /**
   * Custom segment labels to override defaults
   */
  customLabels?: Record<string, string>;
  /**
   * Class name for the breadcrumb container
   */
  className?: string;
}

export function Breadcrumbs({
  maxItems = 3,
  showHomeIcon = true,
  customLabels = {},
  className,
}: BreadcrumbsProps = {}) {
  const pathname = usePathname();

  // Merge custom labels with defaults
  const labels = { ...segmentLabels, ...customLabels };

  // Parse pathname into segments
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((segment) => !segment.startsWith("(") && !segment.endsWith(")")); // Filter out route groups

  // Build breadcrumb items
  const items: BreadcrumbSegment[] = [
    { label: "Home", href: "/" },
    ...segments.map((segment, index) => ({
      label: labels[segment] || formatSegmentLabel(segment),
      href: "/" + segments.slice(0, index + 1).join("/"),
    })),
  ];

  // If we're on the home page, don't show breadcrumbs
  if (items.length === 1) {
    return null;
  }

  // Determine if we need to collapse items
  const shouldCollapse = items.length > maxItems + 1;
  const visibleItems = shouldCollapse ? [items[0], ...items.slice(-(maxItems - 1))] : items;
  const collapsedItems = shouldCollapse ? items.slice(1, items.length - (maxItems - 1)) : [];

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {visibleItems.map((item, index) => {
          const isLast = index === visibleItems.length - 1;
          const isFirst = index === 0;

          return (
            <div key={item.href} className="contents">
              {/* Show collapsed dropdown after home */}
              {isFirst && shouldCollapse && (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href={item.href}>
                        {showHomeIcon ? <Home className="h-4 w-4" /> : item.label}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center gap-1">
                        <BreadcrumbEllipsis />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {collapsedItems.map((collapsedItem) => (
                          <DropdownMenuItem key={collapsedItem.href} asChild>
                            <Link href={collapsedItem.href}>{collapsedItem.label}</Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </BreadcrumbItem>
                </>
              )}

              {/* Regular items */}
              {!isFirst && (
                <>
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={item.href}>{item.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </>
              )}

              {/* Home item without collapse */}
              {isFirst && !shouldCollapse && (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href={item.href}>
                        {showHomeIcon ? <Home className="h-4 w-4" /> : item.label}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </>
              )}
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
