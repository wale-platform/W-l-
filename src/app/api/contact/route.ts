import { NextResponse } from "next/server";
import { contactFormSchema } from "@/lib/api/schemas";

/**
 * Mock contact endpoint.
 *
 * Validates with the same Zod schema the client uses, so a payload that
 * passes client-side validation is guaranteed to pass here too — and a
 * crafted request that bypasses the form still gets rejected.
 */
export async function POST(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 700));

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = contactFormSchema.safeParse(body);

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { message: first.message, field: String(first.path[0] ?? "") },
      { status: 422 },
    );
  }

  // A real implementation would queue an email or write to a CRM here.
  console.log("[contact] enquiry received from", parsed.data.email);

  return NextResponse.json({
    message: "Thanks for reaching out. Our team replies within one business day.",
  });
}
