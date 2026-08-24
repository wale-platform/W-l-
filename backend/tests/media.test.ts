import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app";
import { env } from "../src/config/env";
import {
  canonicalUploadParams,
  createUploadTicket,
  isCloudinaryDeliveryUrl,
  signUploadParams,
} from "../src/lib/cloudinary";
import { API, getCsrf } from "./helpers";
import { makeSession, makeUser } from "./factories";
import { prismaMock } from "./setup";

/**
 * Media uploads.
 *
 * There is no Cloudinary account in this environment, and there must not be one
 * in CI, so the live round trip is not exercised here (it is recorded as
 * untested in docs/integration-report.md). What IS testable is everything that
 * decides whether that round trip would succeed or be a security problem:
 *
 *  1. THE SIGNATURE ALGORITHM, pinned against the two worked examples in
 *     Cloudinary's own documentation. This matters more than it looks: a wrong
 *     signature fails at Cloudinary with no useful message, and the algorithm
 *     has three easy-to-get-wrong rules (which parameters are excluded, the sort
 *     order, and that the secret is appended with no delimiter). A remembered
 *     value is not good enough — an earlier attempt at this used one and it was
 *     the wrong example.
 *
 *  2. WHAT THE TICKET AUTHORISES — that a caller cannot choose where the file
 *     lands, and that two tickets never point at the same asset.
 *
 *  3. WHO MAY ASK, enforced server-side.
 *
 *  4. WHAT HAPPENS WITH NO CREDENTIALS — the local and CI state. It must be an
 *     honest 503, not a 500 and not a signature made from an empty secret.
 */

const app = createApp();
const SESSION_COOKIE = "wale_session";

/* ------------------------------------------------------ known-answer tests -- */

/**
 * From https://cloudinary.com/documentation/signatures — "abcd" is the example
 * secret used there, not a credential.
 */
const DOC_SECRET = "abcd";

describe("Cloudinary signature", () => {
  it("matches the documented example for a timestamp-only upload", () => {
    expect(signUploadParams({ timestamp: 1315060510 }, DOC_SECRET)).toBe(
      "a21ad0f63beb4de2e5575204b79ab90bffb02c10",
    );
  });

  it("matches the documented example with public_id and eager transformations", () => {
    // Note the parameters are given here in a different order than they must be
    // hashed in — which is exactly the point of the sort.
    expect(
      signUploadParams(
        {
          public_id: "sample_image",
          timestamp: 1315060510,
          eager: "w_400,h_300,c_pad|w_260,h_200,c_crop",
        },
        DOC_SECRET,
      ),
    ).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
  });

  it("excludes the parameters Cloudinary does not sign", () => {
    // These four are POSTed but not hashed. Including any of them yields a
    // signature Cloudinary rejects, so the exclusion is load-bearing.
    expect(
      signUploadParams(
        {
          timestamp: 1315060510,
          file: "data:image/png;base64,iVBOR…",
          cloud_name: "demo",
          resource_type: "image",
          api_key: "1234567890",
          signature: "should-be-ignored",
        },
        DOC_SECRET,
      ),
    ).toBe("a21ad0f63beb4de2e5575204b79ab90bffb02c10");
  });

  it("drops parameters that are absent or empty, because those are not POSTed either", () => {
    expect(
      signUploadParams(
        { timestamp: 1315060510, folder: undefined, tags: "" },
        DOC_SECRET,
      ),
    ).toBe("a21ad0f63beb4de2e5575204b79ab90bffb02c10");
  });

  it("sorts by parameter name, not by the order they were given", () => {
    expect(canonicalUploadParams({ timestamp: 2, allowed_formats: "jpg", public_id: "x" })).toBe(
      "allowed_formats=jpg&public_id=x&timestamp=2",
    );
  });

  it("joins array values with commas", () => {
    // The documented encoding: `tags=a,b`. An array and the joined string are
    // the same upload, so they must produce the same signature.
    expect(canonicalUploadParams({ tags: ["dog", "cat"] })).toBe("tags=dog,cat");
    expect(signUploadParams({ tags: ["dog", "cat"] }, DOC_SECRET)).toBe(
      signUploadParams({ tags: "dog,cat" }, DOC_SECRET),
    );
  });
});

/* ---------------------------------------------------------------- tickets -- */

const CONFIG = { cloudName: "demo", apiKey: "1234567890", apiSecret: DOC_SECRET };

describe("upload ticket", () => {
  it("posts exactly the fields it signed", () => {
    const ticket = createUploadTicket("usr_landlord", CONFIG, 1315060510);

    const { signature, api_key: apiKey, ...signed } = ticket.fields;

    // Recomputed independently from the fields the browser will actually send:
    // if the server ever signs a set that differs from the set it returns, every
    // upload breaks, and this is the only place that can catch it.
    expect(signature).toBe(signUploadParams(signed, CONFIG.apiSecret));
    expect(apiKey).toBe(CONFIG.apiKey);
  });

  it("scopes the asset to the uploader and never repeats an id", () => {
    const a = createUploadTicket("usr_landlord", CONFIG);
    const b = createUploadTicket("usr_landlord", CONFIG);

    expect(a.publicId).toMatch(/^wale\/properties\/usr_landlord\/[0-9a-f]{32}$/);
    expect(b.publicId).not.toBe(a.publicId);
  });

  it("restricts the formats that can be stored", () => {
    // Without this the ticket would be permission to upload anything at all.
    expect(createUploadTicket("usr_landlord", CONFIG).fields.allowed_formats).toBe(
      "jpg,jpeg,png,webp",
    );
  });

  it("expires an hour after its timestamp", () => {
    const ticket = createUploadTicket("usr_landlord", CONFIG, 1315060510);
    expect(ticket.fields.timestamp).toBe("1315060510");
    expect(ticket.expiresAt).toBe(new Date((1315060510 + 3600) * 1000).toISOString());
  });

  it("uploads to the configured cloud", () => {
    expect(createUploadTicket("usr_landlord", CONFIG).uploadUrl).toBe(
      "https://api.cloudinary.com/v1_1/demo/image/upload",
    );
  });
});

/* ------------------------------------------------------------- delivery URLs -- */

describe("isCloudinaryDeliveryUrl", () => {
  // `env` is mutated rather than re-imported because config is parsed once at
  // import time; both states have to be reachable from one process.
  const original = env.CLOUDINARY_CLOUD_NAME;
  afterEach(() => {
    env.CLOUDINARY_CLOUD_NAME = original;
  });

  it("accepts an asset in our own cloud", () => {
    env.CLOUDINARY_CLOUD_NAME = "demo";
    expect(isCloudinaryDeliveryUrl("https://res.cloudinary.com/demo/image/upload/v1/a.jpg")).toBe(
      true,
    );
  });

  it("rejects an asset in somebody else's cloud", () => {
    // The owner of that account can replace the file afterwards, which would
    // change the photos on a listing we had already verified.
    env.CLOUDINARY_CLOUD_NAME = "demo";
    expect(
      isCloudinaryDeliveryUrl("https://res.cloudinary.com/attacker/image/upload/v1/a.jpg"),
    ).toBe(false);
  });

  it("rejects lookalike hosts", () => {
    env.CLOUDINARY_CLOUD_NAME = "demo";
    for (const url of [
      "https://res.cloudinary.com.evil.example/demo/image/upload/a.jpg",
      "https://evil.res.cloudinary.com/demo/image/upload/a.jpg",
      "https://res.cloudinary.com@evil.example/demo/a.jpg",
      "https://res.cloudinary.com:8443/demo/image/upload/a.jpg",
      "http://res.cloudinary.com/demo/image/upload/a.jpg",
      "//res.cloudinary.com/demo/image/upload/a.jpg",
      "javascript:alert(1)",
      "not a url",
    ]) {
      expect(isCloudinaryDeliveryUrl(url), url).toBe(false);
    }
  });

  it("checks only the host when no cloud is configured", () => {
    // The local and CI state. Loosening this far is deliberate: it keeps the
    // seeded catalogue editable without credentials.
    env.CLOUDINARY_CLOUD_NAME = undefined;
    expect(isCloudinaryDeliveryUrl("https://res.cloudinary.com/anything/image/upload/a.jpg")).toBe(
      true,
    );
    expect(isCloudinaryDeliveryUrl("https://images.example.com/a.jpg")).toBe(false);
  });
});

/* ------------------------------------------------------------- the endpoint -- */

function signedInAs(user: ReturnType<typeof makeUser>) {
  const session = makeSession({ userId: user.id });
  prismaMock.session.findUnique.mockResolvedValue({ ...session, user } as never);
  prismaMock.session.update.mockResolvedValue(session as never);
  return [`${SESSION_COOKIE}=valid-raw-token`];
}

const landlord = () =>
  makeUser({ id: "usr_landlord", role: "LANDLORD", roles: [{ role: "LANDLORD" }] });

const tenant = () => makeUser({ id: "usr_tenant", role: "TENANT", roles: [{ role: "TENANT" }] });

async function askForSignature(cookies: string[], body: object = {}) {
  const { token, cookie } = await getCsrf(app);
  return request(app)
    .post(`${API}/media/upload-signature`)
    .set("Cookie", [...cookie, ...cookies])
    .set("X-CSRF-Token", token)
    .send(body);
}

describe("POST /media/upload-signature", () => {
  const originals = {
    cloud: env.CLOUDINARY_CLOUD_NAME,
    key: env.CLOUDINARY_API_KEY,
    secret: env.CLOUDINARY_API_SECRET,
  };

  beforeEach(() => {
    env.CLOUDINARY_CLOUD_NAME = CONFIG.cloudName;
    env.CLOUDINARY_API_KEY = CONFIG.apiKey;
    env.CLOUDINARY_API_SECRET = CONFIG.apiSecret;
  });

  afterEach(() => {
    env.CLOUDINARY_CLOUD_NAME = originals.cloud;
    env.CLOUDINARY_API_KEY = originals.key;
    env.CLOUDINARY_API_SECRET = originals.secret;
  });

  it("issues a usable ticket to a landlord", async () => {
    const res = await askForSignature(signedInAs(landlord()));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const ticket = res.body.data;
    expect(ticket.uploadUrl).toBe("https://api.cloudinary.com/v1_1/demo/image/upload");
    expect(ticket.publicId).toContain("/usr_landlord/");

    const { signature, api_key: apiKey, ...signed } = ticket.fields;
    expect(signature).toBe(signUploadParams(signed, CONFIG.apiSecret));
    expect(apiKey).toBe(CONFIG.apiKey);
  });

  it("never returns the API secret", async () => {
    const res = await askForSignature(signedInAs(landlord()));
    // The whole point of signing on the server. Checked against the serialized
    // body so a secret nested anywhere in the response is caught.
    expect(JSON.stringify(res.body)).not.toContain(CONFIG.apiSecret);
  });

  it("puts each caller's uploads in their own folder", async () => {
    const first = await askForSignature(signedInAs(landlord()));
    const second = await askForSignature(
      signedInAs(makeUser({ id: "usr_other", role: "LANDLORD", roles: [{ role: "LANDLORD" }] })),
    );

    expect(first.body.data.publicId).toContain("/usr_landlord/");
    expect(second.body.data.publicId).toContain("/usr_other/");
  });

  it("requires a session", async () => {
    const res = await askForSignature([]);
    expect(res.status).toBe(401);
  });

  it("refuses a tenant", async () => {
    // A signature is permission to write to our storage account, so it is gated
    // to the roles that can own a listing — not to anyone with an account.
    const res = await askForSignature(signedInAs(tenant()));
    expect(res.status).toBe(403);
  });

  it("refuses a request that tries to choose its own folder", async () => {
    const res = await askForSignature(signedInAs(landlord()), {
      folder: "wale/properties/usr_other",
      public_id: "wale/properties/usr_other/theirs",
    });

    expect(res.status).toBe(422);
    // And nothing was signed for that path.
    expect(JSON.stringify(res.body)).not.toContain("usr_other/theirs");
  });

  it("answers 503, not 500, when Cloudinary is not configured", async () => {
    env.CLOUDINARY_API_SECRET = undefined;

    const res = await askForSignature(signedInAs(landlord()));

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("SERVICE_UNAVAILABLE");
    // The message tells a landlord what to do; it does not name the variable.
    expect(res.body.error.message).toMatch(/add photos later/i);
    expect(JSON.stringify(res.body)).not.toContain("CLOUDINARY");
  });
});
