import { cn } from "./cn";

/**
 * Minimal variant resolver — a local stand-in for `class-variance-authority`.
 *
 * CVA is not in package.json and this is the only thing we need from it, so
 * we avoid the dependency. Given a base class, a map of variant groups, and
 * defaults, it returns a function that resolves props to a class string.
 *
 *   const button = variants("inline-flex", {
 *     tone: { solid: "bg-brand-600", ghost: "bg-transparent" },
 *     size: { sm: "h-9", md: "h-11" },
 *   }, { tone: "solid", size: "md" });
 *
 *   button({ tone: "ghost" }) // "inline-flex bg-transparent h-11"
 */
type VariantMap = Record<string, Record<string, string>>;

type VariantProps<M extends VariantMap> = {
  [K in keyof M]?: keyof M[K];
};

export function variants<M extends VariantMap>(
  base: string,
  map: M,
  defaults: { [K in keyof M]: keyof M[K] },
) {
  return (props?: VariantProps<M> & { className?: string }) => {
    const picked = (Object.keys(map) as Array<keyof M>).map((group) => {
      const chosen = props?.[group] ?? defaults[group];
      return map[group][chosen as string];
    });

    return cn(base, picked, props?.className);
  };
}

export type { VariantProps };
