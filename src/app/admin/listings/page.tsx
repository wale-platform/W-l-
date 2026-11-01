"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AdminListings } from "@/components/admin/AdminListings";

function ListingsWithFilter() {
  const status = useSearchParams().get("status");
  return <AdminListings initialStatus={status === "pending" || status === "verified" ? status : ""} />;
}

export default function AdminListingsPage() {
  return (
    <Suspense fallback={null}>
      <ListingsWithFilter />
    </Suspense>
  );
}
