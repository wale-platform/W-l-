"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Container,
  Section,
  SectionHeading,
} from "@/components/layout/Container";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  Select,
  Textarea,
  toast,
} from "@/components/ui";
import { PropertyImagePicker, type PickedImage } from "@/components/property/PropertyImagePicker";
import { propertyApi } from "@/lib/api/property";
import { PROPERTY_TYPES, propertyInputSchema } from "@/lib/api/schemas";
import { todayDateInputValue } from "@/lib/utils/format";
import { useSession } from "@/lib/auth/client-session";
import { universities } from "@/config/site";

const uploadFormSchema = propertyInputSchema
  .omit({ amenities: true, contactName: true })
  .extend({
    amenities: z.string().max(1000).optional(),
    // Blank means "use the phone on my account".
    contactPhone: propertyInputSchema.shape.contactPhone.or(z.literal("")),
  });

type UploadFormValues = z.input<typeof uploadFormSchema>;
type UploadFormOutput = z.output<typeof uploadFormSchema>;

export default function UploadPropertyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const [images, setImages] = useState<PickedImage[]>([]);
  const [imagesError, setImagesError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UploadFormValues, unknown, UploadFormOutput>({
    resolver: zodResolver(uploadFormSchema),
    mode: "onBlur",
    defaultValues: {
      availableDate: todayDateInputValue(),
      bedrooms: 1,
      bathrooms: 1,
      state: "Kwara",
      contactPhone: user?.phone ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: ({ amenities, ...values }: UploadFormOutput) =>
      propertyApi.create(
        {
          ...values,
          university: values.university || undefined,
          contactPhone: values.contactPhone || undefined,
          amenities: (amenities ?? "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        },
        images.map((image) => image.file),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["myProperties"] });
      void queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast.success("Listing submitted", {
        description: "Your property listing has been submitted and is pending verification.",
      });
      router.push("/landlord/properties");
    },
    onError: (error: Error) => {
      toast.error("Submission failed", { description: error.message });
    },
  });

  const onSubmit = (values: UploadFormOutput) => {
    if (images.length === 0) {
      setImagesError("Add at least one photo of the property.");
      return;
    }
    mutation.mutate(values);
  };

  return (
    <main>
      <Section>
        <Container
          size="narrow"
          className="flex flex-col gap-8"
        >
          <SectionHeading
            eyebrow="Properties"
            title="Upload a property"
            lead="Add the details of your property so students can find it on WALE."
          />

          <Card>
            <CardHeader>
              <CardTitle>Property Information</CardTitle>
            </CardHeader>

            <CardBody>
              <form
                onSubmit={handleSubmit(onSubmit, () => {
                  if (images.length === 0) setImagesError("Add at least one photo of the property.");
                })}
                noValidate
                className="flex flex-col gap-6"
              >
                {mutation.isError && (
                  <Alert tone="danger" title="Submission failed">
                    {mutation.error.message}
                  </Alert>
                )}

                <FormField label="Property title" required error={errors.title?.message}>
                  {(field) => (
                    <Input {...field} {...register("title")} placeholder="e.g. Spacious 2 Bedroom Flat" />
                  )}
                </FormField>

                <FormField
                  label="Description"
                  required
                  hint="Describe the rooms, water and power supply, and distance to campus."
                  error={errors.description?.message}
                >
                  {(field) => (
                    <Textarea {...field} {...register("description")} placeholder="Describe the property..." />
                  )}
                </FormField>

                <div className="flex flex-col gap-1.5">
                  <p className="text-sm font-medium text-ink-800">
                    Photos<span className="ml-0.5 text-danger" aria-hidden="true">*</span>
                  </p>
                  <PropertyImagePicker
                    images={images}
                    onChange={(next) => {
                      setImages(next);
                      if (next.length) setImagesError("");
                    }}
                    error={imagesError}
                    disabled={mutation.isPending}
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField label="Yearly rent (₦)" required error={errors.price?.message}>
                    {(field) => (
                      <Input
                        {...field}
                        {...register("price")}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        placeholder="e.g. 500000"
                      />
                    )}
                  </FormField>

                  <FormField label="Apartment type" required error={errors.type?.message}>
                    {(field) => (
                      <Select {...field} {...register("type")} defaultValue="">
                        <option value="" disabled>Select type</option>
                        {PROPERTY_TYPES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    )}
                  </FormField>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField label="Number of bedrooms" required error={errors.bedrooms?.message}>
                    {(field) => (
                      <Input {...field} {...register("bedrooms")} type="number" inputMode="numeric" min={0} />
                    )}
                  </FormField>

                  <FormField label="Number of bathrooms" required error={errors.bathrooms?.message}>
                    {(field) => (
                      <Input {...field} {...register("bathrooms")} type="number" inputMode="numeric" min={1} />
                    )}
                  </FormField>
                </div>

                <FormField label="Full address" required error={errors.address?.message}>
                  {(field) => (
                    <Input {...field} {...register("address")} autoComplete="street-address" placeholder="e.g. 12 University Road, Tanke" />
                  )}
                </FormField>

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField label="City" required error={errors.city?.message}>
                    {(field) => <Input {...field} {...register("city")} placeholder="e.g. Ilorin" />}
                  </FormField>

                  <FormField label="State" required error={errors.state?.message}>
                    {(field) => <Input {...field} {...register("state")} placeholder="e.g. Kwara" />}
                  </FormField>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField label="Nearby university" error={errors.university?.message}>
                    {(field) => (
                      <Select {...field} {...register("university")} defaultValue="">
                        <option value="">Not near a listed university</option>
                        {universities.map((university) => (
                          <option key={university.id} value={university.id}>
                            {university.name}
                          </option>
                        ))}
                      </Select>
                    )}
                  </FormField>

                  <FormField label="Available from" required error={errors.availableDate?.message}>
                    {(field) => <Input {...field} {...register("availableDate")} type="date" />}
                  </FormField>
                </div>

                <FormField
                  label="Amenities"
                  hint="Separate amenities with commas."
                  error={errors.amenities?.message}
                >
                  {(field) => (
                    <Input {...field} {...register("amenities")} placeholder="e.g. Water, Parking, Security" />
                  )}
                </FormField>

                <FormField
                  label="Contact phone"
                  required={!user?.phone}
                  hint="Students will use this number to reach you about the property."
                  error={errors.contactPhone?.message}
                >
                  {(field) => (
                    <Input
                      {...field}
                      {...register("contactPhone")}
                      type="tel"
                      autoComplete="tel"
                      placeholder="08012345678"
                    />
                  )}
                </FormField>

                <div className="flex justify-end gap-3">
                  <Button
                    tone="outline"
                    type="button"
                    onClick={() => router.push("/landlord")}
                    disabled={mutation.isPending}
                  >
                    Cancel
                  </Button>

                  <Button type="submit" isLoading={mutation.isPending} loadingText="Submitting...">
                    Submit Property
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </Container>
      </Section>
    </main>
  );
}
