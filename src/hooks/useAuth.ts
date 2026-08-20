"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import {
  heldRoles,
  roleHomePath,
  type LoginData,
  type RegisterData,
  type Role,
  type User,
} from "@/lib/api/schemas";

/**
 * Auth state.
 *
 * The session is an httpOnly cookie, so the SERVER is the source of truth and
 * the only way to know who we are is to ask it. That makes TanStack Query the
 * natural home for this: one cached `GET /auth/me` shared by every consumer,
 * invalidated on login/logout. A separate client-side store mirroring the same
 * thing would be a second source of truth that goes stale the moment a session
 * expires or is revoked on another device.
 *
 * Nothing is persisted to localStorage. There is no token to persist, and
 * putting the user object there would just be a cache that outlives the
 * session it describes.
 */

export const AUTH_QUERY_KEY = ["auth", "me"] as const;

export interface AuthState {
  user: User | null;
  /** True only while the first `me()` is in flight — guards flicker. */
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Every role held, empty when signed out. */
  roles: Role[];
  /** True if the user holds any of `allowed`. UI convenience, NOT a security boundary. */
  can: (allowed: readonly Role[]) => boolean;
  /** The dashboard this user lands on by default. */
  homePath: string;
}

export function useAuth(): AuthState {
  const { data: user, isPending } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: authApi.me,
    // The signed-in user changes rarely, but a revoked session should be
    // noticed reasonably soon — a minute is a fair compromise.
    staleTime: 60_000,
    // `me()` already turns 401 into null, so a rejection here is a real
    // failure. Retrying it just delays the error.
    retry: false,
  });

  const resolved = user ?? null;
  const roles = resolved ? heldRoles(resolved) : [];

  return {
    user: resolved,
    isLoading: isPending,
    isAuthenticated: resolved !== null,
    roles,
    // Not memoized on purpose: `roles` is rebuilt every render, so a
    // useCallback keyed on it would never hit anyway, and the predicate is a
    // handful of string comparisons.
    can: (allowed: readonly Role[]) => roles.some((role) => allowed.includes(role)),
    homePath: resolved ? roleHomePath[resolved.role] : "/",
  };
}

/**
 * Login / register / logout mutations, sharing one cache-update policy.
 *
 * On success the fresh user is written straight into the cache rather than
 * refetched, so the UI updates in the same tick the redirect happens. Logout
 * clears everything — leaving other queries cached would show the previous
 * user's data to whoever signs in next on a shared machine.
 */
export function useAuthActions() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const setUser = useCallback(
    (user: User | null) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
    },
    [queryClient],
  );

  const login = useMutation({
    mutationFn: (payload: LoginData) => authApi.login(payload),
    onSuccess: ({ user }) => setUser(user),
  });

  const register = useMutation({
    mutationFn: (payload: RegisterData) => authApi.register(payload),
    onSuccess: ({ user }) => setUser(user),
  });

  const logout = useMutation({
    mutationFn: () => authApi.logout(),
    // Clear on settled, not just success: if the request failed because the
    // session was already gone, staying "signed in" in the UI is worse.
    onSettled: () => {
      setUser(null);
      queryClient.clear();
      router.push("/");
      router.refresh();
    },
  });

  return { login, register, logout, setUser };
}
