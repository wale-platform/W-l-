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

  const handleCancelRequest = (id: string) => {
    setCancellingId(id);
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
          Welcome back, {(profile?.name || user?.fullName || "").split(/\s+/)[0]}!
        </h1>
        <p className="text-sm text-ink-500">
          Here are homes picked for you. Book inspections and track them below.
        </p>
      </div>

      {/* Suggestions come first: they're what students log in for. */}
      <SuggestedListings preferences={suggestionPreferences} now={now} />

      {/* Overview stats: Profile Completion & Quick Actions */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Completion Card */}
        <Card className="p-5 md:col-span-2 flex flex-col justify-between shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink-900">Student Profile Completion</h2>
              <Badge tone={completionPct === 100 ? "success" : "warning"} size="sm">
                {completionPct}% Complete
              </Badge>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full bg-brand-600 transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <p className="text-xs text-ink-500">
              Complete your matric details and preferences to get matched with pre-approved apartments.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-ink-100 flex items-center justify-between">
            <span className="text-xs text-ink-600">Matric: {profile?.studentId || "Not verified"}</span>
            <Link
              href="/student/profile"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
            >
              Update Profile Details
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-5 flex flex-col justify-between shadow-sm">
          <h2 className="text-sm font-semibold text-ink-900 mb-3">Quick Actions</h2>
          <div className="flex flex-col gap-2">
            <Link href="/properties" className="w-full">
              <Button size="sm" block className="justify-start gap-2">
                <Compass className="size-3.5" />
                Browse properties
              </Button>
            </Link>

            <Link href="/student/profile" className="w-full">
              <Button size="sm" tone="outline" block className="justify-start gap-2">
                <UserCircle2 className="size-3.5" />
                My Profile
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Inspections requests */}
      <Card className="overflow-hidden shadow-sm">
        <div className="border-b border-ink-150 p-5">
          <h2 className="text-base font-bold text-ink-900">Your Requested Inspections</h2>
          <p className="text-xs text-ink-500 mt-0.5">Track and manage dates with verified student hosts</p>
        </div>

        <div className="p-5">
          {isInspectionsLoading ? (
            <p className="py-6 text-center text-sm text-ink-500">Loading your inspections…</p>
          ) : inspections && inspections.length === 0 ? (
            <div className="text-center py-10">
              <Calendar className="size-8 text-ink-300 mx-auto" />
              <h4 className="font-semibold text-ink-900 mt-2">No inspections booked</h4>
              <p className="text-xs text-ink-500 max-w-xs mx-auto mt-1">
                You haven&apos;t scheduled any viewings yet. Browse properties and book a free slot.
              </p>
              <Link href="/properties" className="inline-block mt-4">
                <Button size="sm">Find Hostels</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-ink-100 -my-5">
              {inspections?.map((req) => (
                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-5 gap-4">
                  <div className="flex items-start gap-3.5">
                    {/* Thumbnail placeholder */}
                    <div className="relative size-12 overflow-hidden rounded bg-ink-100 shrink-0 border">
                      <img src={req.propertyImage} alt="" className="object-cover size-full" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-ink-900 hover:text-brand-700">
                        <Link href={`/properties/${req.propertyId}`}>{req.propertyTitle}</Link>
                      </h4>
                      <p className="text-xs text-ink-500 flex items-center gap-3">
                        <span>Rent: <strong className="text-ink-800">{formatRent(req.price)}</strong></span>
                        <span className="size-1 rounded-full bg-ink-300" />
                        <span>Booked on: {formatDate(req.createdAt.split("T")[0])}</span>
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-ink-700 bg-ink-50 px-2 py-0.5 rounded self-start w-fit">
                        <Clock className="size-3 text-brand-600" />
                        <span>{formatDate(req.date)} @ {req.time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 justify-end">
                    <Badge tone={statusBadgeTones[req.status]} size="sm">
                      {req.status}
                    </Badge>

                    {(req.status === "PENDING" || req.status === "APPROVED") && (
                      <Button
                        size="sm"
                        tone="outline"
                        onClick={() => handleCancelRequest(req.id)}
                        disabled={cancelMutation.isPending}
                        className="text-danger border-danger/20 hover:bg-danger-subtle"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

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
