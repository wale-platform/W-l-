import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes with conflict resolution.
 *
 * `clsx` flattens conditionals; `twMerge` then drops earlier classes that
 * collide with later ones on the same CSS property. This is what lets
 * component variants be overridden from the outside:
 *
 *   <Button className="bg-white" />  // beats the variant's bg-brand-600
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
