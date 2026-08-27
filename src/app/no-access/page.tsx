import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { homePathFor, requireUser } from "@/lib/api/server-auth";
import { heldRoles, roleLabels, roleSchema, type Role } from "@/lib/api/schemas";
import { Button } from "@/components/ui";

/**
 * Where `requireRole()` sends a signed-in user who holds the wrong role.
 *
 * A page of its own rather than a panel swapped in by a layout, because a layout
 * cannot stop the page it is wrapping from rendering — see the note in
 * `server-auth.ts`. Redirecting here means the page they asked for is never
 * built, and they still get told why.
 */
export default async function NoAccessPage({ searchParams }: PageProps<"/no-access">) {
  // Signed in, just not with the right role — so a session is still required
  // here, or this becomes a page that tells strangers which roles exist.
  const user = await requireUser();
  const params = await searchParams;

  const allow = parseRoles(params?.allow);
  const held = heldRoles(user);

  return (
    <main id="main" className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-amber-50">
          <ShieldAlert aria-hidden="true" className="size-6 text-amber-600" />
        </span>

        <h1 className="text-xl font-semibold tracking-tight text-ink-900">
          This page isn&apos;t for your account type
        </h1>

        <p className="mt-2 text-pretty text-sm leading-relaxed text-ink-600">
          {allow.length > 0 ? (
            <>
              It&apos;s for {listRoles(allow)}, and you&apos;re signed in as{" "}
              {listRoles(held)}. If you need that access too, you can add the role
              from your profile.
            </>
          ) : (
            <>
              You&apos;re signed in as {listRoles(held)}, which doesn&apos;t have
              access to that page. You can add another role from your profile.
            </>
          )}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={homePathFor(user)}>
            <Button>Go to your dashboard</Button>
          </Link>
          <Link href="/profile">
            <Button tone="outline">Open profile</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

/**
 * Read the `allow` list back out of the query.
 *
 * Validated against the enum rather than trusted: this value is in a URL anyone
 * can edit, and unchecked it would let a stranger put arbitrary text into the
 * sentence above.
 */
function parseRoles(raw: string | string[] | undefined): Role[] {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return [];

  return value
    .split(",")
    .map((part) => roleSchema.safeParse(part.trim()))
    .flatMap((result) => (result.success ? [result.data] : []));
}

/** "a landlord", "a tenant or an administrator" — reads as a sentence, not an enum. */
function listRoles(list: readonly Role[]): string {
  const labels = list.map((role) => withArticle(roleLabels[role].toLowerCase()));
  if (labels.length <= 1) return labels[0] ?? "a different account type";
  return `${labels.slice(0, -1).join(", ")} or ${labels[labels.length - 1]}`;
}

/** "an administrator", not "a administrator". */
function withArticle(label: string): string {
  return `${/^[aeiou]/.test(label) ? "an" : "a"} ${label}`;
}
