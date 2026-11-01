"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { contactApi } from "@/lib/api";
import {
  CONTACT_TOPICS,
  contactFormSchema,
  type ContactFormData,
  type ContactFormValues,
} from "@/lib/api/schemas";
import { useSession } from "@/lib/auth/client-session";
import {
  Button,
  FormField,
  Input,
  Select,
  Textarea,
  Alert,
  toast,
} from "@/components/ui";

type ContactTopic = ContactFormData["topic"];

/**
 * Contact form.
 *
 * The same `contactFormSchema` validates here and inside the route
 * handler — client-side for instant feedback, server-side because the
 * client can always be bypassed.
 */
export function ContactForm({ initialTopic = "general" }: { initialTopic?: ContactTopic }) {
  // Signed-in users don't have to retype their name and email.
  const { data: user } = useSession();
  const [honeypot, setHoneypot] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues, unknown, ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    mode: "onBlur",
    defaultValues: { topic: initialTopic },
    values: user
      ? { topic: initialTopic, name: user.fullName, email: user.email, phone: user.phone ?? "", subject: "", message: "" }
      : undefined,
    resetOptions: { keepDirtyValues: true },
  });

  const mutation = useMutation({
    mutationFn: (values: ContactFormData) => contactApi.submit({ ...values, website: honeypot }),
    onSuccess: (data, values) => {
      toast.success("Message sent", { description: data.message });
      reset({ topic: values.topic, name: values.name, email: values.email, phone: values.phone ?? "", subject: "", message: "" });
    },
    onError: (error: Error) => {
      toast.error("Couldn't send message", { description: error.message });
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      noValidate
      className="relative flex flex-col gap-5"
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

      {/* Honeypot: hidden from people and assistive tech; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </label>
      </div>

      <FormField label="What can we help with?" required error={errors.topic?.message}>
        {(field) => (
          <Select {...field} {...register("topic")}>
            {CONTACT_TOPICS.map((topic) => (
              <option key={topic.value} value={topic.value}>
                {topic.label}
              </option>
            ))}
          </Select>
        )}
      </FormField>

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
            placeholder="Question about a self-contain in Tanke"
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
