import { Router } from "express";

import { authRouter } from "./modules/auth/auth.routes";
import { contactRouter } from "./modules/contact/contact.routes";
import { healthRouter } from "./modules/health/health.routes";
import { inspectionRouter } from "./modules/inspections/inspection.routes";
import { mediaRouter } from "./modules/media/media.routes";
import { propertyRouter } from "./modules/properties/property.routes";
import { residenceRouter } from "./modules/residences/residence.routes";
import { userRouter } from "./modules/users/user.routes";

/**
 * API v1 router. Every feature module mounts here; app.ts mounts this whole
 * tree under `/api/v1`. New modules are added additively — one line each.
 */
export const apiV1Router = Router();

apiV1Router.use("/health", healthRouter);
apiV1Router.use("/auth", authRouter);
apiV1Router.use("/users", userRouter);
apiV1Router.use("/properties", propertyRouter);
apiV1Router.use("/inspections", inspectionRouter);
apiV1Router.use("/residences", residenceRouter);
apiV1Router.use("/media", mediaRouter);
apiV1Router.use("/contact", contactRouter);
