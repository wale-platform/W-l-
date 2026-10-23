"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Container, Section, SectionHeading } from "@/components/layout/Container";
import { Alert, Card, CardBody, CardHeader, CardTitle, Badge, Button, toast } from "@/components/ui";
import { User, Mail, Trash2 } from "lucide-react";

import { DEFAULT_USERS } from "@/lib/api/auth";

interface MockUser {
  name?: string;
  fullName?: string;
  email: string;
  role: string;
  createdAt?: string;
}

function listUsers(): MockUser[] {
  const stored = localStorage.getItem("wale_mock_registered_users");
  if (!stored) {
    localStorage.setItem("wale_mock_registered_users", JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }

  const users: unknown = JSON.parse(stored);
  if (!Array.isArray(users)) throw new Error("Saved user data is not a list.");
  return users as MockUser[];
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: listUsers,
  });

  const handleDeleteUser = (email: string) => {
    if (email === "admin@wale.ng") {
      toast.error("Action denied", { description: "Cannot delete the primary admin account." });
      return;
    }

    if (confirm(`Are you sure you want to delete the user account for ${email}?`)) {
      const updated = users.filter((u) => u.email !== email);
      try {
        localStorage.setItem("wale_mock_registered_users", JSON.stringify(updated));
        queryClient.setQueryData(["adminUsers"], updated);
        toast.success("User deleted", { description: "The user account has been successfully removed." });
      } catch (error) {
        toast.error("Could not delete user", {
          description: error instanceof Error ? error.message : "Please try again.",
        });
      }
    }
  };

  return (
    <main>
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Admin"
            title="Manage Users"
            lead="Review, inspect, and manage WALE student, landlord, lawyer, tenant, and admin accounts."
          />

          {isError && (
            <Alert tone="danger" title="User accounts could not be loaded">
              Refresh the page to retry. No account data has been changed.
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Registered Users ({users.length})</CardTitle>
            </CardHeader>

            <CardBody>
              {isLoading ? (
                <div className="h-32 animate-pulse rounded-card bg-ink-100" />
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-16 text-center">
                  <h3 className="text-lg font-semibold text-ink-900">No users to display</h3>
                  <Badge tone="neutral">No data</Badge>
                </div>
              ) : (
                <div className="divide-y divide-ink-100">
                  {users.map((user) => (
                    <div key={user.email} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-4">
                        <div className="size-10 bg-brand-50 text-brand-700 rounded-full flex items-center justify-center">
                          <User className="size-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-ink-950">{user.fullName || user.name || "Unnamed user"}</p>
                          <p className="text-sm text-ink-500 flex items-center gap-1 mt-0.5">
                            <Mail className="size-3 text-ink-400" />
                            {user.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          tone={
                            user.role === "admin"
                              ? "success"
                              : user.role === "landlord"
                              ? "warning"
                              : user.role === "lawyer"
                              ? "neutral"
                              : user.role === "tenant"
                              ? "brand"
                              : "neutral"
                          }
                          className="uppercase font-semibold"
                        >
                          {user.role}
                        </Badge>
                        <Button
                          size="sm"
                          tone="danger"
                          className="p-2"
                          aria-label={`Delete user ${user.email}`}
                          onClick={() => handleDeleteUser(user.email)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </Container>
      </Section>
    </main>
  );
}