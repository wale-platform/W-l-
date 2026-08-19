import { NextResponse, type NextRequest } from "next/server";
import { properties } from "@/lib/fixtures/properties";

/** Artificial latency to test loading skeleton states on detail views */
const LATENCY_MS = 400;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
  
  const { id } = await params;
  const property = properties.find((p) => p.id === id);
  
  if (!property) {
    return NextResponse.json(
      { message: `Property with ID ${id} not found` },
      { status: 404 }
    );
  }
  
  return NextResponse.json(property);
}
