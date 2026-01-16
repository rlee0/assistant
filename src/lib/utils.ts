import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple classnames while safely merging Tailwind CSS classes.
 * This utility should be used for all dynamic classname logic to avoid
 * conflicting Tailwind utilities.
 *
 * @param inputs - Class values to merge (strings, arrays, or objects)
 * @returns A merged classname string with Tailwind conflicts resolved
 *
 * @example
 * // Basic usage
 * className={cn("px-4 py-2", "px-6")} // Results in "py-2 px-6"
 *
 * @example
 * // With conditional classes
 * className={cn("base-class", isActive && "active-class")}
 *
 * @example
 * // With component props
 * className={cn("default-style", className)}
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
