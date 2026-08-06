import { apiClient } from "./client";
import { contactFormSchema, type ContactFormData } from "./schemas";

export const contactApi = {
  async submit(payload: ContactFormData): Promise<{ message: string }> {
    const validated = contactFormSchema.parse(payload);
    const { data } = await apiClient.post("/contact", validated);
    return data;
  },
};
