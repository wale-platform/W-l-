import { z } from "zod";

/**
 * Contact form schema — mirrors the frontend `contactFormSchema` exactly,
 * including the Nigerian phone format, so client and server agree on validity.
 */
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  phone: z
    .string()
    .regex(/^(\+234|0)[789]\d{9}$/, "Invalid Nigerian phone number")
    .optional(),
  subject: z.string().trim().min(5, "Subject must be at least 5 characters"),
  message: z.string().trim().min(20, "Message must be at least 20 characters"),
});

export type ContactInput = z.infer<typeof contactSchema>;
