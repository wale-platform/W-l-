import { isAxiosError } from "axios";
import { apiClient } from "./client";
import { contactFormSchema, type ContactFormValues } from "./schemas";

export const contactApi = {
  /**
   * `website` is the form's hidden honeypot field; it is passed through
   * untouched so the server can recognise bot submissions.
   */
  async submit(payload: ContactFormValues & { website?: string }): Promise<{ message: string }> {
    const validated = contactFormSchema.parse(payload);
    try {
      const { data } = await apiClient.post("/contact", { ...validated, website: payload.website ?? "" });
      return data;
    } catch (error) {
      // Surface the server's explanation (e.g. rate limiting) rather than
      // axios's generic "Request failed with status code 429".
      if (isAxiosError(error) && typeof error.response?.data?.message === "string") {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },
};
