/**
 * Utility functions for the SuperInstance Core App
 *
 * @module lib/utils
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge
 *
 * This utility merges Tailwind CSS classes intelligently, removing
 * conflicting classes while preserving the order of precedence.
 *
 * @param inputs - Variable number of class value inputs (strings, arrays, objects)
 * @returns A merged class name string with conflicts resolved
 *
 * @example
 * ```ts
 * cn("px-4 py-2", "px-6") // Returns "py-2 px-6" (px-4 is overridden by px-6)
 * cn("text-red-500", someCondition && "text-blue-500") // Conditional classes
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
