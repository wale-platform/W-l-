import { Router } from "express";

import { authRouter } from "./modules/auth/auth.routes";
import { contactRouter } from "./modules/contact/contact.routes";
import { healthRouter } from "./modules/health/health.routes";
import { propertyRouter } from "./modules/properties/property.routes";

/**
 * API v1 router. Every feature module mounts here; app.ts mounts this whole
 * tree under `/api/v1`. New modules are added additively — one line each.
 */
export const apiV1Router = Router();

apiV1Router.use("/health", healthRouter);
apiV1Router.use("/auth", authRouter);
apiV1Router.use("/properties", propertyRouter);
apiV1Router.use("/contact", contactRouter);
