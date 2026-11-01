"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, type AuthUser } from "@/lib/api/auth";

export const sessionKey = ["session"] as const;

export function dashboardPath(role: AuthUser["role"]): string {
  if (role === "admin") return "/admin";
  if (role === "landlord") return "/landlord";
  if (role === "lawyer") return "/lawyer";
  if (role === "tenant") return "/tenant";
  return "/student";
}

/**
 * Where to send a user after login: the `?next=` page Proxy redirected them
 * from, if it is a same-site path, otherwise their dashboard.
 */
export function postLoginPath(user: AuthUser): string {
  if (typeof window !== "undefined") {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) {
      return next;
    }
  }
  return dashboardPath(user.role);
}

/** The signed-in user (`null` when signed out), verified by the server. */
export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: authApi.me,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

/** Store a freshly signed-in user so guards don't refetch before navigating. */
export function useSetSessionUser() {
  const queryClient = useQueryClient();
  return (user: AuthUser) => queryClient.setQueryData(sessionKey, user);
}

/**
 * Guards a dashboard: redirects to /login when signed out, or to the
 * user's own dashboard when their role doesn't match. `user` is only
 * returned once the role is confirmed.
 */
export function useRequireRole(role: AuthUser["role"]) {
  const router = useRouter();
  const session = useSession();
  const user = session.data;

  useEffect(() => {
    if (session.isPending || session.isError) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    } else if (user.role !== role) {
      router.replace(dashboardPath(user.role));
    }
  }, [role, router, session.isError, session.isPending, user]);

  return {
    user: user && user.role === role ? user : null,
    isChecking: session.isPending || (!session.isError && user?.role !== role),
    isError: session.isError,
    retry: session.refetch,
  };
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      // Drop every cached query so the next user can't see this one's data.
      queryClient.clear();
      queryClient.setQueryData(sessionKey, null);
      router.push("/login");
    },
  });
}
