"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  BedDouble,
  Bath,
  CalendarDays,
  ShieldCheck,
  User,
  Phone,
  Mail,
  ChevronLeft,
  X,
  CheckCircle2,
  Clock,
  Compass,
} from "lucide-react";
import { useProperty } from "@/hooks/useProperties";
import { inspectionsApi } from "@/lib/api/inspections";
import {
  Button,
  Card,
  Badge,
  VerifiedBadge,
  Alert,
  toast,
} from "@/components/ui";
import {
  formatRent,
  formatDate,
  formatPropertyType,
  universityName,
} from "@/lib/utils/format";

// Generate date choices for the next 5 days
const getInspectionDates = () => {
  const dates = [];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  for (let i = 1; i <= 5; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push({
      iso: d.toISOString().split("T")[0],
      dayName: days[d.getDay()],
      dayNum: d.getDate(),
      month: months[d.getMonth()],
    });
  }
  return dates;
};

const TIME_SLOTS = [
  "09:00 AM - 11:00 AM",
  "11:00 AM - 01:00 PM",
  "01:00 PM - 03:00 PM",
  "03:00 PM - 05:00 PM",
];

export function PropertyDetail({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const { data: property, isLoading, isError } = useProperty(id);
  
  // Image Gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Booking Modal Flow state
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState<"dateTime" | "confirm" | "success">("dateTime");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");

  // Contact Modal state
  const [isContactOpen, setIsContactOpen] = useState(false);

  // Mutation for creating inspection request
  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!property) throw new Error("Property not loaded");
      return inspectionsApi.createRequest(property.id, selectedDate, selectedTime);
    },
    onSuccess: () => {
      setBookingStep("success");
      // Invalidate inspections list query so dashboard is synced
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
      toast.success("Inspection requested successfully!");
    },
    onError: (err: any) => {
      toast.error("Booking failed", { description: err.message });
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 h-5 w-24 animate-pulse rounded bg-ink-200" />
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="aspect-[16/9] w-full animate-pulse rounded-card bg-ink-200" />
            <div className="flex gap-3">
              <div className="h-20 w-32 animate-pulse rounded-card bg-ink-200" />
              <div className="h-20 w-32 animate-pulse rounded-card bg-ink-200" />
              <div className="h-20 w-32 animate-pulse rounded-card bg-ink-200" />
            </div>
            <div className="space-y-3 pt-4">
              <div className="h-8 w-2/3 animate-pulse rounded bg-ink-200" />
              <div className="h-5 w-1/3 animate-pulse rounded bg-ink-200" />
            </div>
          </div>
          <div className="space-y-6">
            <div className="h-64 w-full animate-pulse rounded-card bg-ink-200" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !property) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold text-ink-900">Hostel not found</h2>
        <p className="mt-2 text-ink-600">The listing you are looking for may have been archived or removed.</p>
        <Link href="/properties" className="mt-6 inline-block">
          <Button>Back to browsing</Button>
        </Link>
      </div>
    );
  }

  const uniName = universityName(property.university);
  const inspectionDates = getInspectionDates();

  const handleStartBooking = () => {
    // Select first slot by default
    setSelectedDate(inspectionDates[0].iso);
    setSelectedTime(TIME_SLOTS[0]);
    setBookingStep("dateTime");
    setIsBookingOpen(true);
  };

  const handleBookingSubmit = () => {
    bookingMutation.mutate();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/properties"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 transition-colors hover:text-ink-900"
        >
          <ChevronLeft className="size-4" />
          Back to all properties
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content: Gallery + Info */}
        <div className="lg:col-span-2 space-y-8">
          {/* Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-card border bg-ink-50">
              <Image
                src={property.images[activeImageIndex]}
                alt={property.title}
                fill
                priority
                className="object-cover"
              />
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                {property.verified && <VerifiedBadge />}
                {uniName && (
                  <Badge tone="outline" className="bg-white/95 backdrop-blur font-medium">
                    {uniName} Proximity
                  </Badge>
                )}
              </div>
            </div>

            {/* Thumbnails */}
            {property.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1" role="tablist" aria-label="Gallery thumbnails">
                {property.images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    role="tab"
                    aria-selected={activeImageIndex === index}
                    aria-label={`View image ${index + 1}`}
                    className={`relative h-20 w-32 shrink-0 overflow-hidden rounded-card border-2 transition-all ${
                      activeImageIndex === index
                        ? "border-brand-600 ring-2 ring-brand-100"
                        : "border-ink-200 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={img}
                      alt=""
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title & Core Meta */}
          <div className="border-b border-ink-100 pb-6 space-y-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
                {property.title}
              </h1>
              <p className="flex items-center gap-1.5 text-ink-600">
                <MapPin className="size-4 shrink-0 text-ink-400" />
                <span>{property.address}, {property.city}, {property.state} State</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-ink-700">
              <div className="flex items-center gap-2 rounded-field bg-ink-50 px-3 py-1.5">
                <BedDouble className="size-4 text-brand-600" />
                <span className="font-medium">{formatPropertyType(property.type)}</span>
              </div>
              <div className="flex items-center gap-2 rounded-field bg-ink-50 px-3 py-1.5">
                <Bath className="size-4 text-brand-600" />
                <span className="font-medium">{property.bathrooms} Bathrooms</span>
              </div>
              <div className="flex items-center gap-2 rounded-field bg-ink-50 px-3 py-1.5">
                <CalendarDays className="size-4 text-brand-600" />
                <span className="font-medium">Available {formatDate(property.availableDate)}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-ink-900">About this apartment</h2>
            <p className="text-base leading-relaxed text-ink-700 whitespace-pre-line">
              {property.description}
            </p>
          </div>

          {/* Amenities */}
          <div className="space-y-4 pt-4">
            <h2 className="text-lg font-semibold text-ink-900">Amenities & features</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {property.amenities.map((amenity) => (
                <div key={amenity} className="flex items-center gap-2.5 rounded-card border p-3.5 text-sm text-ink-800">
                  <span className="flex size-5 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <CheckCircle2 className="size-3.5" />
                  </span>
                  <span className="font-medium">{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Proximity / Location Map */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-900">Location proximity</h2>
              {uniName && (
                <span className="text-sm font-semibold text-brand-700">
                  Catchment area: {uniName}
                </span>
              )}
            </div>

            {/* Map Placeholder */}
            <Card className="relative flex aspect-[21/9] w-full flex-col items-center justify-center border-dashed bg-ink-50/70 p-6 text-center">
              <Compass className="size-8 text-ink-400 animate-pulse" />
              <h4 className="mt-2 font-medium text-ink-900">Map view is loading...</h4>
              <p className="max-w-xs text-xs text-ink-500">
                Interactive location maps are verifying on-ground coords. Landlord coordinates: lat {property.coordinates?.lat}, lng {property.coordinates?.lng}.
              </p>
            </Card>
          </div>
        </div>

        {/* Sidebar: Booking Panel */}
        <div className="space-y-6">
          <Card className="p-6 sticky top-24 shadow-card">
            <div className="space-y-6">
              <div>
                <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider">Annual Rent</span>
                <p className="text-3xl font-bold text-brand-900 mt-1">{formatRent(property.price)}</p>
              </div>

              {/* Trust validation panel */}
              <div className="rounded-card bg-brand-950 p-4 text-white space-y-3">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="size-5 text-brand-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Trust Guarantee</h4>
                    <p className="text-xs text-brand-200 mt-0.5 leading-normal">
                      This listing carries WALE Verification. The rent and specs have been confirmed in person by our student team.
                    </p>
                  </div>
                </div>

                <div className="border-t border-brand-800 pt-3 flex items-center justify-between text-xs">
                  <span className="text-brand-300">Listing source:</span>
                  <span className="font-semibold text-white">
                    {property.source === "wale"
                      ? "WALE Managed"
                      : property.source === "landlord"
                      ? "Direct Landlord"
                      : "Verified Lawyer / Agent"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button size="lg" block onClick={handleStartBooking}>
                  Request Inspection
                </Button>
                <Button size="lg" tone="outline" block onClick={() => setIsContactOpen(true)}>
                  Contact Landlord
                </Button>
              </div>

              <p className="text-center text-xs text-ink-500">
                Inspections are 100% free of charge. WALE does not charge agency commissions or viewing fees.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* ------------------------------------------------ Inspection Modal -- */}
      {isBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <Card className="w-full max-w-lg overflow-hidden shadow-lifted bg-white animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-ink-100 p-5">
              <h3 className="text-lg font-bold text-ink-900">
                {bookingStep === "dateTime" && "Select inspection slot"}
                {bookingStep === "confirm" && "Confirm request"}
                {bookingStep === "success" && "Request submitted"}
              </h3>
              {bookingStep !== "success" && (
                <button
                  type="button"
                  onClick={() => setIsBookingOpen(false)}
                  className="rounded-field p-1 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
                >
                  <X className="size-5" />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-5">
              {bookingStep === "dateTime" && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-ink-800 block">Choose Date</label>
                    <div className="grid grid-cols-5 gap-2">
                      {inspectionDates.map((d) => (
                        <button
                          key={d.iso}
                          type="button"
                          onClick={() => setSelectedDate(d.iso)}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-card border text-center transition-all ${
                            selectedDate === d.iso
                              ? "border-brand-600 bg-brand-50 text-brand-900 font-semibold ring-1 ring-brand-600"
                              : "border-ink-200 hover:border-ink-300 text-ink-700"
                          }`}
                        >
                          <span className="text-[10px] uppercase font-bold text-ink-400">{d.dayName}</span>
                          <span className="text-lg leading-none mt-1">{d.dayNum}</span>
                          <span className="text-[10px] text-ink-500 mt-1">{d.month}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-ink-800 block">Available Time Slots</label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {TIME_SLOTS.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedTime(t)}
                          className={`flex items-center gap-2 p-3 rounded-card border text-left text-sm transition-all ${
                            selectedTime === t
                              ? "border-brand-600 bg-brand-50 text-brand-900 font-semibold ring-1 ring-brand-600"
                              : "border-ink-200 hover:border-ink-300 text-ink-700"
                          }`}
                        >
                          <Clock className="size-4 text-brand-600 shrink-0" />
                          <span>{t}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    size="lg"
                    block
                    className="mt-4"
                    disabled={!selectedDate || !selectedTime}
                    onClick={() => setBookingStep("confirm")}
                  >
                    Continue to confirmation
                  </Button>
                </div>
              )}

              {bookingStep === "confirm" && (
                <div className="space-y-5">
                  <Alert tone="warning" title="Inspection Policies">
                    Inspections are guided by accredited student hosts. Be present at the gate of the compound at your selected time slot.
                  </Alert>

                  <div className="rounded-card border p-4 bg-ink-50/50 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ink-500">Property:</span>
                      <span className="font-semibold text-ink-900 text-right max-w-[240px] truncate">
                        {property.title}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-500">Date:</span>
                      <span className="font-semibold text-ink-900">
                        {formatDate(selectedDate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-500">Time Window:</span>
                      <span className="font-semibold text-ink-900">
                        {selectedTime}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-500">Service Fee:</span>
                      <span className="font-semibold text-success">
                        ₦0.00 (Free)
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      tone="outline"
                      size="lg"
                      className="flex-1"
                      disabled={bookingMutation.isPending}
                      onClick={() => setBookingStep("dateTime")}
                    >
                      Back
                    </Button>
                    <Button
                      size="lg"
                      className="flex-1"
                      isLoading={bookingMutation.isPending}
                      loadingText="Requesting..."
                      onClick={handleBookingSubmit}
                    >
                      Confirm Request
                    </Button>
                  </div>
                </div>
              )}

              {bookingStep === "success" && (
                <div className="flex flex-col items-center text-center p-4 space-y-4">
                  <div className="flex size-14 items-center justify-center rounded-full bg-success-subtle text-success">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-ink-900">Request Received</h4>
                    <p className="text-sm text-ink-600 max-w-sm">
                      We have queued your inspection request. You can check the approval status in your student dashboard.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 w-full pt-4">
                    <Link href="/student" className="w-full">
                      <Button size="lg" block>
                        Go to Dashboard
                      </Button>
                    </Link>
                    <Button
                      tone="outline"
                      size="lg"
                      block
                      onClick={() => setIsBookingOpen(false)}
                    >
                      Back to listing
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* -------------------------------------------------- Contact Modal -- */}
      {isContactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <Card className="w-full max-w-md overflow-hidden shadow-lifted bg-white animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-ink-100 p-5">
              <h3 className="text-lg font-bold text-ink-900">Contact publisher</h3>
              <button
                type="button"
                onClick={() => setIsContactOpen(false)}
                className="rounded-field p-1 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <User className="size-5" />
                </span>
                <div>
                  <h4 className="font-semibold text-ink-900">{property.landlord.name}</h4>
                  <p className="text-xs text-ink-500 uppercase tracking-wide font-medium mt-0.5">
                    {property.source === "landlord"
                      ? "Property Owner"
                      : property.source === "wale"
                      ? "WALE Officer"
                      : "Verified Lawyer"}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <a
                  href={`tel:${property.landlord.phone}`}
                  className="flex items-center justify-between rounded-card border p-3 hover:bg-ink-50/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 text-sm text-ink-800 font-medium">
                    <Phone className="size-4 text-brand-600" />
                    <span>{property.landlord.phone}</span>
                  </div>
                  <span className="text-xs font-semibold text-brand-700">Call Phone</span>
                </a>

                {property.landlord.email && (
                  <a
                    href={`mailto:${property.landlord.email}`}
                    className="flex items-center justify-between rounded-card border p-3 hover:bg-ink-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 text-sm text-ink-800 font-medium">
                      <Mail className="size-4 text-brand-600" />
                      <span>{property.landlord.email}</span>
                    </div>
                    <span className="text-xs font-semibold text-brand-700">Send Email</span>
                  </a>
                )}
              </div>

              <Button
                tone="outline"
                size="lg"
                block
                className="mt-2"
                onClick={() => setIsContactOpen(false)}
              >
                Close dialog
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
