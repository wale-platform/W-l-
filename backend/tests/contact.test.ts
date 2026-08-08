import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app";
import { API, getCsrf } from "./helpers";

/**
 * Contact endpoint. The submission is dispatched through the email abstraction
 * (log transport in tests) rather than persisted, so we spy on `sendMail` to
 * assert the enquiry is routed with the submitter set as reply-to. CSRF applies
 * because POST is an unsafe method.
 */

// Spy on the email module the controller calls. Declared before app import path
// matters only for the mock target; vi.mock is hoisted.
vi.mock("../src/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/email")>();
  return { ...actual, sendMail: vi.fn().mockResolvedValue(undefined) };
});

import { sendMail } from "../src/lib/email";

const app = createApp();

async function postCsrf(path: string, body: object) {
  const { token, cookie } = await getCsrf(app);
  return request(app)
    .post(`${API}${path}`)
    .set("Cookie", cookie)
    .set("X-CSRF-Token", token)
    .send(body);
}

const VALID = {
  name: "Ada Obi",
  email: "ada@example.com",
  phone: "+2348012345678",
  subject: "Question about a listing",
  message: "I would like to know if the Akoka studio is still available for rent.",
};

describe("POST /contact", () => {
  it("accepts a valid enquiry and dispatches it with reply-to set", async () => {
    const res = await postCsrf("/contact", VALID);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "hello@walehousing.ng",
        replyTo: "ada@example.com",
        subject: expect.stringContaining(VALID.subject),
      }),
    );
  });

  it("rejects a too-short message with 422 and does not send", async () => {
    vi.mocked(sendMail).mockClear();

    const res = await postCsrf("/contact", { ...VALID, message: "too short" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("rejects a non-Nigerian phone number with 422", async () => {
    const res = await postCsrf("/contact", { ...VALID, phone: "+15551234567" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
