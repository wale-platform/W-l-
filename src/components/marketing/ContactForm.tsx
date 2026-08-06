"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { contactApi } from "@/lib/api";
import { contactFormSchema, type ContactFormData } from "@/lib/api/schemas";
import {
  Button,
  FormField,
  Input,
  Textarea,
  Alert,
  toast,
} from "@/components/ui";

/**
 * Contact form.
 *
 * The same `contactFormSchema` validates here and inside the route
 * handler — client-side for instant feedback, server-side because the
 * client can always be bypassed.
 */
export function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    mode: "onBlur",
  });

  const mutation = useMutation({
    mutationFn: contactApi.submit,
    onSuccess: (data) => {
      toast.success("Message sent", { description: data.message });
      reset();
    },
    onError: (error: Error) => {
      toast.error("Couldn't send message", { description: error.message });
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      noValidate
      className="flex flex-col gap-5"
    >
      {/* Server-side failures surface here as well as in the toast — a
          toast alone disappears before a slow reader gets to it. */}
      {mutation.isError && (
        <Alert tone="danger" title="Your message wasn't sent">
          {mutation.error.message}
        </Alert>
      )}

      {mutation.isSuccess && (
        <Alert tone="success" title="Message received">
          Thanks for reaching out — we reply within one working day.
        </Alert>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Full name" required error={errors.name?.message}>
          {(field) => (
            <Input
              {...field}
              {...register("name")}
              autoComplete="name"
              placeholder="Amina Bello"
            />
          )}
        </FormField>

        <FormField label="Email address" required error={errors.email?.message}>
          {(field) => (
            <Input
              {...field}
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="amina@example.com"
            />
          )}
        </FormField>
      </div>

      <FormField
        label="Phone number"
        hint="Optional. Nigerian format — 08012345678 or +2348012345678."
        error={errors.phone?.message}
      >
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

      <FormField label="Subject" required error={errors.subject?.message}>
        {(field) => (
          <Input
            {...field}
            {...register("subject")}
            placeholder="Question about a listing near UNILAG"
          />
        )}
      </FormField>

      <FormField label="Message" required error={errors.message?.message}>
        {(field) => (
          <Textarea
            {...field}
            {...register("message")}
            rows={6}
            placeholder="Tell us what you need help with…"
          />
        )}
      </FormField>

      <Button
        type="submit"
        size="lg"
        isLoading={mutation.isPending}
        loadingText="Sending…"
        className="sm:self-start"
      >
        <Send aria-hidden="true" className="size-4" />
        Send message
      </Button>
    </form>
  );
}
