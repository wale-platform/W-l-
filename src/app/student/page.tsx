"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Compass,
  UserCircle2,
  Calendar,
  Clock,
  ArrowRight,
} from "lucide-react";
import { usersApi } from "@/lib/api/users";
import { inspectionsApi, type InspectionRequest } from "@/lib/api/inspections";
import { SuggestedListings } from "@/components/student/SuggestedListings";
import { useSession } from "@/lib/auth/client-session";
import { Button, Card, Badge, toast } from "@/components/ui";
import { formatRent, formatDate } from "@/lib/utils/format";

// Map inspection statuses to visual tone badges
const statusBadgeTones: Record<InspectionRequest["status"], "warning" | "success" | "danger" | "neutral" | "brand"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
  COMPLETED: "brand",
};

export default function StudentDashboardPage() {
  const queryClient = useQueryClient();

  // 1. Fetch Student Profile
  const { data: profile } = useQuery({
    queryKey: ["studentProfile"],
    queryFn: usersApi.getProfile,
  });

  // 2. Fetch Inspection Requests
  const { data: inspections, isLoading: isInspectionsLoading } = useQuery({
    queryKey: ["inspections"],
    queryFn: () => inspectionsApi.listRequests("mine"),
  });

  // 3. Suggestions use the profile's preferences, falling back to the account.
  const { data: user } = useSession();
  const [now] = useState(() => Date.now());
  const suggestionPreferences = useMemo(
    () => ({
      university: profile?.university || user?.university,
      maxBudget: profile?.preferredBudget,
      location: profile?.preferredLocation,
    }),
    [profile?.preferredBudget, profile?.preferredLocation, profile?.university, user?.university],
  );

  // 4. Mutation to cancel inspection request
  const cancelMutation = useMutation({
    mutationFn: inspectionsApi.cancelRequest,
    onSuccess: (data) => {
      toast.success("Inspection cancelled", {
        description: `Your inspection for ${data.propertyTitle} has been cancelled.`,
      });
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
    },
    onError: (err: Error) => {
      toast.error("Cancellation failed", { description: err.message });
    },
  });

  // Calculate profile completion percentage
  const getProfileCompletion = () => {
    if (!profile) return 0;
    const fields = [
      profile.name,
      profile.email,
      profile.phone,
      profile.university,
      profile.faculty,
      profile.department,
      profile.level,
      profile.studentId,
      profile.preferredBudget,
      profile.preferredLocation,
    ];
    const filled = fields.filter((f) => f !== undefined && f !== null && f !== "").length;
    return Math.round((filled / fields.length) * 100);
  };

  const completionPct = getProfileCompletion();

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showAllInspections, setShowAllInspections] = useState(false);

  const handleCancelRequest = (id: string) => {
    setCancellingId(id);
  };

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink-950 sm:text-2xl">
          Welcome back, {(profile?.name || user?.fullName || "").split(/\s+/)[0]}!
        </h1>
        <p className="text-sm text-ink-500">Track your inspections and explore homes picked for you.</p>
      </div>

      {/* Compact overview: profile completion + quick actions */}
      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <Card className="flex flex-col justify-center gap-2 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink-900">Profile completion</h2>
            <span className="flex items-center gap-3">
              <Badge tone={completionPct === 100 ? "success" : "warning"} size="sm">
                {completionPct}%
              </Badge>
              <Link
                href="/student/profile"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
              >
                Update <ArrowRight className="size-3" />
              </Link>
            </span>
          </div>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-brand-600 transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <p className="text-xs text-ink-500">
            {completionPct === 100
              ? `Matric ${profile?.studentId}. You're all set for matched homes.`
              : "Add your matric details and preferences for better matches."}
          </p>
        </Card>

        <Card className="flex flex-col justify-center gap-2 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-ink-900">Quick actions</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/properties">
              <Button size="sm">
                <Compass className="size-3.5" /> Browse homes
              </Button>
            </Link>
            <Link href="/student/profile">
              <Button size="sm" tone="outline">
                <UserCircle2 className="size-3.5" /> My profile
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Inspections */}
      <Card className="overflow-hidden shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
          <h2 className="text-sm font-bold text-ink-900">
            Your inspections
            {inspections && inspections.length > 0 && (
              <span className="ml-1.5 font-normal text-ink-500">({inspections.length})</span>
            )}
          </h2>
          {inspections && inspections.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllInspections((value) => !value)}
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              {showAllInspections ? "Show less" : `Show all ${inspections.length}`}
            </button>
          )}
        </div>

        {isInspectionsLoading ? (
          <p className="px-4 py-4 text-sm text-ink-500">Loading your inspections…</p>
        ) : !inspections || inspections.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <p className="flex items-center gap-2 text-sm text-ink-600">
              <Calendar className="size-4 text-ink-400" />
              No inspections booked yet — open a listing to book a free viewing.
            </p>
            <Link href="/properties">
              <Button size="sm" tone="outline">Find homes</Button>
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {(showAllInspections ? inspections : inspections.slice(0, 3)).map((req) => (
              <li key={req.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={req.propertyImage} alt="" className="size-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/properties/${req.propertyId}`}
                    className="block truncate text-sm font-semibold text-ink-900 hover:text-brand-700"
                  >
                    {req.propertyTitle}
                  </Link>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3 text-brand-600" /> {formatDate(req.date)} · {req.time}
                    </span>
                    <span>{formatRent(req.price)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={statusBadgeTones[req.status]} size="sm">
                    {req.status.charAt(0) + req.status.slice(1).toLowerCase()}
                  </Badge>
                  {(req.status === "PENDING" || req.status === "APPROVED") && (
                    <Button
                      size="sm"
                      tone="ghost"
                      onClick={() => handleCancelRequest(req.id)}
                      disabled={cancelMutation.isPending}
                      className="h-8 px-3 text-danger hover:bg-danger-subtle"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Suggestions below the dashboard tools */}
      <SuggestedListings preferences={suggestionPreferences} now={now} />

      {/* Custom Cancel Request Confirmation Modal */}
      {cancellingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <Card className="w-full max-w-md overflow-hidden shadow-lifted bg-white animate-in fade-in zoom-in-95 duration-150 p-5 space-y-4">
            <h3 className="text-lg font-bold text-ink-900">Cancel Inspection Request</h3>
            <p className="text-sm text-ink-600">
              Are you sure you want to cancel this inspection request? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <Button
                tone="outline"
                size="sm"
                onClick={() => setCancellingId(null)}
              >
                No, Keep booking
              </Button>
              <Button
                size="sm"
                tone="danger"
                isLoading={cancelMutation.isPending}
                onClick={() => {
                  cancelMutation.mutate(cancellingId, {
                    onSuccess: () => setCancellingId(null)
                  });
                }}
              >
                Yes, Cancel request
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
