"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, MapPin, Phone } from "lucide-react";

import {
  Alert,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { fieldErrorsFrom, messageFrom } from "@/lib/api/field-errors";
import {
  propertyFormSchema,
  type PropertyFormValues,
  type PropertyPayload,
} from "@/lib/api/schemas";

/**
 * The listing form, shared by every surface that writes a property: a landlord
 * adding their own place, a landlord editing it, and a lawyer submitting on a
 * landlord's behalf.
 *
 * One component rather than three, because the field set IS the backend
 * contract — three copies would drift, and a form that sends a field the server
 * rejects (or omits one it requires) fails at submit time with a message nobody
 * can act on.
 *
 * Validation lives in `propertyFormSchema` (see lib/api/schemas.ts), which also
 * converts the string values an `<input>` produces into the JSON the API wants.
 * The server validates independently — this is for fast feedback, not safety.
 */

/**
 * When someone lists on another person's behalf, the published contact must be
 * the landlord's.
 *
 * The server falls back to the *creating account's* name and phone when these
 * are blank, which is right for a landlord listing their own flat and wrong for
 * a lawyer — it would publish the lawyer's number and send every enquiry to
 * them. So the agent variant demands them explicitly.
 */
const agentPropertyFormSchema = propertyFormSchema.superRefine((values, ctx) => {
  if (!values.contactName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["contactName"],
      message: "Enter the landlord's name — it is published on the listing",
    });
  }
  if (!values.contactPhone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["contactPhone"],
      message: "Enter the landlord's phone number so students can reach them",
    });
  }
});

/** Blank form. Spelled out so a missing key cannot leave an input uncontrolled. */
const EMPTY: PropertyFormValues = {
  title: "",
  description: "",
  price: "",
  type: "studio",
  bedrooms: "",
  bathrooms: "",
  address: "",
  city: "",
  state: "",
  neighborhood: "",
  university: "",
  availableDate: "",
  amenities: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
};

const APARTMENT_TYPES = [
  { value: "studio", label: "Self-contained / Studio" },
  { value: "one_bedroom", label: "1 Bedroom" },
  { value: "two_bedroom", label: "2 Bedroom" },
  { value: "shared", label: "Shared apartment" },
] as const;

/**
 * Turn a saved listing back into form values.
 *
 * Re-exported from the schema module, which is where it lives — it is the exact
 * inverse of what `propertyFormSchema` does on submit, so the two belong
 * together. Re-exported here because the edit view reaches for the form and its
 * adapter as one thing.
 */
export { propertyFormValuesFrom } from "@/lib/api/schemas";

/** Field names the server may reject, so a 422 lands on the right input. */
const SERVER_FIELDS = new Set<keyof PropertyFormValues>(
  Object.keys(EMPTY) as (keyof PropertyFormValues)[],
);

export interface PropertyFormProps {
  /** Pre-filled values when editing. Anything omitted starts blank. */
  defaultValues?: Partial<PropertyFormValues>;
  onSubmit: (payload: PropertyPayload) => void;
  isPending: boolean;
  submitLabel: string;
  pendingLabel: string;
  cancelHref: string;
  /** The failed mutation, if any — field errors are mapped onto their inputs. */
  error?: unknown;
  /** Headline for the error alert, e.g. "Couldn't save your listing". */
  errorTitle?: string;
  /** True when listing on someone else's behalf: the contact becomes required. */
  onBehalfOfOwner?: boolean;
}

export function PropertyForm({
  defaultValues,
  onSubmit,
  isPending,
  submitLabel,
  pendingLabel,
  cancelHref,
  error,
  errorTitle = "Couldn't save your listing",
  onBehalfOfOwner = false,
}: PropertyFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PropertyFormValues, unknown, PropertyPayload>({
    resolver: zodResolver(
      onBehalfOfOwner ? agentPropertyFormSchema : propertyFormSchema,
    ),
    mode: "onBlur",
    defaultValues: { ...EMPTY, ...defaultValues },
  });

  // A rejection from the server is ordinary validation as far as the person
  // filling in the form is concerned, so put it on the field it belongs to
  // rather than only in the alert at the top.
  useEffect(() => {
    if (!error) return;
    for (const { field, message } of fieldErrorsFrom(error)) {
      if (SERVER_FIELDS.has(field as keyof PropertyFormValues)) {
        setError(field as keyof PropertyFormValues, { message });
      }
    }
  }, [error, setError]);

  const submit = handleSubmit((payload) => onSubmit(payload));

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      {Boolean(error) && (
        <Alert tone="danger" title={errorTitle}>
          {messageFrom(error, "Please check the details and try again.")}
        </Alert>
      )}

      {/* ── The place itself ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <Building2 aria-hidden="true" className="size-4 text-brand-600" />
              About the place
            </span>
          </CardTitle>
          <CardDescription>
            Write it the way you would describe it to a student on the phone.
          </CardDescription>
        </CardHeader>

        <CardBody className="flex flex-col gap-5">
          <FormField
            label="Listing title"
            required
            hint="What a student will see first in search results."
            error={errors.title?.message}
          >
            {(field) => (
              <Input
                {...field}
                {...register("title")}
                placeholder="Bright 2-bedroom flat, 5 minutes from the main gate"
              />
            )}
          </FormField>

          <FormField
            label="Description"
            required
            hint="Water, power, security, the compound, the landlord's rules — the things people ask about."
            error={errors.description?.message}
          >
            {(field) => (
              <Textarea
                {...field}
                {...register("description")}
                rows={6}
                placeholder="A tidy two-bedroom flat in a fenced compound with steady water…"
              />
            )}
          </FormField>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              label="Annual rent"
              required
              hint="Digits only, in naira, for a full year."
              error={errors.price?.message}
            >
              {(field) => (
                <Input
                  {...field}
                  {...register("price")}
                  inputMode="numeric"
                  placeholder="1200000"
                  leading={<span className="text-sm">₦</span>}
                />
              )}
            </FormField>

            <FormField
              label="Apartment type"
              required
              error={errors.type?.message}
            >
              {(field) => (
                <Select {...field} {...register("type")}>
                  {APARTMENT_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              label="Bedrooms"
              required
              hint="Enter 0 for a self-contained room."
              error={errors.bedrooms?.message}
            >
              {(field) => (
                <Input
                  {...field}
                  {...register("bedrooms")}
                  inputMode="numeric"
                  placeholder="2"
                />
              )}
            </FormField>

            <FormField
              label="Bathrooms"
              required
              error={errors.bathrooms?.message}
            >
              {(field) => (
                <Input
                  {...field}
                  {...register("bathrooms")}
                  inputMode="numeric"
                  placeholder="1"
                />
              )}
            </FormField>
          </div>

          <FormField
            label="Available from"
            required
            error={errors.availableDate?.message}
          >
            {(field) => <Input {...field} {...register("availableDate")} type="date" />}
          </FormField>

          <FormField
            label="Amenities"
            hint="Separate them with commas — borehole, prepaid meter, tiled, parking."
            error={errors.amenities?.message}
          >
            {(field) => (
              <Input
                {...field}
                {...register("amenities")}
                placeholder="Borehole, Prepaid meter, Security, Parking"
              />
            )}
          </FormField>
        </CardBody>
      </Card>

      {/* ── Where it is ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <MapPin aria-hidden="true" className="size-4 text-brand-600" />
              Where it is
            </span>
          </CardTitle>
          <CardDescription>
            Students search by area and by campus, so be specific.
          </CardDescription>
        </CardHeader>

        <CardBody className="flex flex-col gap-5">
          <FormField label="Street address" required error={errors.address?.message}>
            {(field) => (
              <Input
                {...field}
                {...register("address")}
                placeholder="14 Akoka Road"
                autoComplete="street-address"
              />
            )}
          </FormField>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="City" required error={errors.city?.message}>
              {(field) => (
                <Input
                  {...field}
                  {...register("city")}
                  placeholder="Yaba"
                  autoComplete="address-level2"
                />
              )}
            </FormField>

            <FormField label="State" required error={errors.state?.message}>
              {(field) => (
                <Input
                  {...field}
                  {...register("state")}
                  placeholder="Lagos"
                  autoComplete="address-level1"
                />
              )}
            </FormField>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              label="Area"
              hint="Optional. The name locals use."
              error={errors.neighborhood?.message}
            >
              {(field) => (
                <Input {...field} {...register("neighborhood")} placeholder="Akoka" />
              )}
            </FormField>

            <FormField
              label="Nearest university"
              hint="Optional, but it is how most students filter."
              error={errors.university?.message}
            >
              {(field) => (
                <Input
                  {...field}
                  {...register("university")}
                  placeholder="University of Lagos"
                />
              )}
            </FormField>
          </div>
        </CardBody>
      </Card>

      {/* ── Who students contact ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <Phone aria-hidden="true" className="size-4 text-brand-600" />
              Who students contact
            </span>
          </CardTitle>
          <CardDescription>
            {onBehalfOfOwner
              ? "The landlord's own details, so enquiries reach them directly."
              : "Leave these blank to use the name and phone number on your account."}
          </CardDescription>
        </CardHeader>

        <CardBody className="flex flex-col gap-5">
          <FormField
            label="Contact name"
            required={onBehalfOfOwner}
            error={errors.contactName?.message}
          >
            {(field) => (
              <Input {...field} {...register("contactName")} placeholder="Ada Okoye" />
            )}
          </FormField>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              label="Contact phone"
              required={onBehalfOfOwner}
              error={errors.contactPhone?.message}
            >
              {(field) => (
                <Input
                  {...field}
                  {...register("contactPhone")}
                  type="tel"
                  placeholder="08012345678"
                />
              )}
            </FormField>

            <FormField
              label="Contact email"
              hint="Optional, and never taken from your login email."
              error={errors.contactEmail?.message}
            >
              {(field) => (
                <Input
                  {...field}
                  {...register("contactEmail")}
                  type="email"
                  placeholder="ada@example.com"
                />
              )}
            </FormField>
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={cancelHref} className="sm:w-auto">
          <Button tone="outline" type="button" block>
            Cancel
          </Button>
        </Link>

        <Button type="submit" isLoading={isPending} loadingText={pendingLabel}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
