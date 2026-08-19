"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { User, Shield, GraduationCap, DollarSign, MapPin } from "lucide-react";
import { usersApi, studentProfileSchema, type StudentProfile } from "@/lib/api/users";
import { universities } from "@/config/site";
import {
  Button,
  FormField,
  Input,
  Select,
  Alert,
  toast,
} from "@/components/ui";

const levels = [
  { value: "100", label: "100 Level" },
  { value: "200", label: "200 Level" },
  { value: "300", label: "300 Level" },
  { value: "400", label: "400 Level" },
  { value: "500", label: "500 Level" },
  { value: "postgraduate", label: "Postgraduate" },
];

export default function StudentProfilePage() {
  const queryClient = useQueryClient();

  // 1. Fetch Profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ["studentProfile"],
    queryFn: usersApi.getProfile,
  });

  // 2. Form Setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<StudentProfile>({
    resolver: zodResolver(studentProfileSchema),
    mode: "onBlur",
  });

  // Reset form when profile data is loaded
  useEffect(() => {
    if (profile) {
      reset(profile);
    }
  }, [profile, reset]);

  // 3. Mutation for updating profile
  const mutation = useMutation({
    mutationFn: usersApi.updateProfile,
    onSuccess: (data) => {
      toast.success("Profile saved", { description: data.message });
      // Invalidate query to refresh cached data across dashboard
      queryClient.setQueryData(["studentProfile"], data.profile);
      reset(data.profile); // reset isDirty state
    },
    onError: (err: any) => {
      toast.error("Save failed", { description: err.message });
    },
  });

  const onSubmit = (values: StudentProfile) => {
    mutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded bg-ink-200" />
        <div className="h-64 rounded-card bg-ink-200" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
          My Student Profile
        </h1>
        <p className="text-sm text-ink-500">
          Verify your student enrollment status and set housing preferences.
        </p>
      </div>

      {mutation.isError && (
        <Alert tone="danger" title="Save Failed">
          {mutation.error.message}
        </Alert>
      )}

      {mutation.isSuccess && (
        <Alert tone="success" title="Profile Saved">
          Your profile updates have been successfully saved.
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="rounded-card border bg-white shadow-sm overflow-hidden">
          <div className="border-b border-ink-150 p-5 bg-ink-50/50 flex items-center gap-2">
            <User className="size-4 text-brand-700" />
            <h3 className="font-semibold text-ink-950 text-sm">Personal details</h3>
          </div>
          <div className="p-5 grid gap-4 sm:grid-cols-2">
            <FormField label="Full name" required error={errors.name?.message}>
              {(field) => <Input {...field} {...register("name")} autoComplete="name" />}
            </FormField>

            <FormField label="Email address" required error={errors.email?.message}>
              {(field) => (
                <Input
                  {...field}
                  {...register("email")}
                  type="email"
                  autoComplete="email"
                  disabled // Email is login key, disable changing it in profile edit
                />
              )}
            </FormField>

            <FormField label="Phone number" required error={errors.phone?.message}>
              {(field) => (
                <Input
                  {...field}
                  {...register("phone")}
                  type="tel"
                  autoComplete="tel"
                  placeholder="08012345678"
                />
              )}
            </FormField>
          </div>
        </div>

        {/* Section 2: University details */}
        <div className="rounded-card border bg-white shadow-sm overflow-hidden">
          <div className="border-b border-ink-150 p-5 bg-ink-50/50 flex items-center gap-2">
            <GraduationCap className="size-4 text-brand-700" />
            <h3 className="font-semibold text-ink-950 text-sm">Academic credentials</h3>
          </div>
          <div className="p-5 grid gap-4 sm:grid-cols-2">
            <FormField label="University" required error={errors.university?.message}>
              {(field) => (
                <Select {...field} {...register("university")}>
                  <option value="">Select your university</option>
                  {universities.map((uni) => (
                    <option key={uni.id} value={uni.id}>
                      {uni.name} ({uni.short.toUpperCase()})
                    </option>
                  ))}
                </Select>
              )}
            </FormField>

            <FormField label="Student ID / Matric Number" required error={errors.studentId?.message}>
              {(field) => <Input {...field} {...register("studentId")} placeholder="180805001" />}
            </FormField>

            <FormField label="Faculty" required error={errors.faculty?.message}>
              {(field) => <Input {...field} {...register("faculty")} placeholder="e.g. Science" />}
            </FormField>

            <FormField label="Department" required error={errors.department?.message}>
              {(field) => <Input {...field} {...register("department")} placeholder="e.g. Computer Sciences" />}
            </FormField>

            <FormField label="Level" required error={errors.level?.message}>
              {(field) => (
                <Select {...field} {...register("level")}>
                  <option value="">Select your current level</option>
                  {levels.map((lvl) => (
                    <option key={lvl.value} value={lvl.value}>
                      {lvl.label}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
          </div>
        </div>

        {/* Section 3: Housing preferences */}
        <div className="rounded-card border bg-white shadow-sm overflow-hidden">
          <div className="border-b border-ink-150 p-5 bg-ink-50/50 flex items-center gap-2">
            <DollarSign className="size-4 text-brand-700" />
            <h3 className="font-semibold text-ink-950 text-sm">Housing preferences</h3>
          </div>
          <div className="p-5 grid gap-4 sm:grid-cols-2">
            <FormField
              label="Preferred Annual Budget (₦)"
              required
              error={errors.preferredBudget?.message}
            >
              {(field) => (
                <Input
                  {...field}
                  {...register("preferredBudget", { valueAsNumber: true })}
                  type="number"
                  placeholder="e.g. 500000"
                />
              )}
            </FormField>

            <FormField
              label="Preferred Neighborhood / Areas"
              required
              error={errors.preferredLocation?.message}
              hint="Separate multiple areas with commas"
            >
              {(field) => <Input {...field} {...register("preferredLocation")} placeholder="e.g. Akoka, Yaba, Agbowo" />}
            </FormField>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            size="lg"
            disabled={!isDirty || mutation.isPending}
            isLoading={mutation.isPending}
            loadingText="Saving..."
          >
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
