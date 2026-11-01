"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, LogOut } from "lucide-react";
import { Container, Section, SectionHeading } from "@/components/layout/Container";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { Badge, Button, Card, CardBody, CardHeader, CardTitle, Spinner } from "@/components/ui";
import { dashboardPath, useLogout, useSession } from "@/lib/auth/client-session";

export default function AccountPage() {
  const router = useRouter();
  const { data: user, isPending } = useSession();
  const logout = useLogout();

  useEffect(() => {
    if (!isPending && !user) router.replace("/login?next=/account");
  }, [isPending, router, user]);

  if (!user) {
    return (
      <Section>
        <Container size="narrow" className="flex justify-center py-16">
          <Spinner />
        </Container>
      </Section>
    );
  }

  return (
    <Section>
      <Container size="narrow" className="flex flex-col gap-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading eyebrow="Account" title="Account settings" lead="Manage your sign-in details." />
          <Link href={dashboardPath(user.role)}>
            <Button tone="outline">Back to dashboard</Button>
          </Link>
        </div>

        <EmailVerificationBanner />

        <Card>
          <CardHeader>
            <CardTitle>Your details</CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-500">Name</dt>
                <dd className="mt-1 font-semibold text-ink-900">{user.fullName}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Account type</dt>
                <dd className="mt-1 font-semibold capitalize text-ink-900">{user.role}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Email</dt>
                <dd className="mt-1 flex flex-wrap items-center gap-2 font-semibold text-ink-900">
                  {user.email}
                  {user.emailVerified ? (
                    <Badge tone="success">
                      <CheckCircle2 aria-hidden="true" className="size-3.5" /> Confirmed
                    </Badge>
                  ) : (
                    <Badge tone="warning">Not confirmed</Badge>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-ink-500">Phone</dt>
                <dd className="mt-1 font-semibold text-ink-900">{user.phone ?? "Not added"}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{user.hasPassword ? "Change password" : "Set a password"}</CardTitle>
          </CardHeader>
          <CardBody>
            <ChangePasswordForm user={user} />
          </CardBody>
        </Card>

        <div>
          <Button
            tone="outline"
            onClick={() => logout.mutate()}
            isLoading={logout.isPending}
            loadingText="Logging out..."
            className="border-danger/25 text-danger hover:bg-danger-subtle"
          >
            <LogOut aria-hidden="true" className="size-4" /> Log out
          </Button>
        </div>
      </Container>
    </Section>
  );
}
