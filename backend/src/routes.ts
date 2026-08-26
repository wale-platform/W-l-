import { Router } from "express";

import { authRouter } from "./modules/auth/auth.routes";
import { contactRouter } from "./modules/contact/contact.routes";
import { healthRouter } from "./modules/health/health.routes";
import { inspectionRouter } from "./modules/inspections/inspection.routes";
import { mediaRouter } from "./modules/media/media.routes";
import { propertyRouter } from "./modules/properties/property.routes";
import { residenceRouter } from "./modules/residences/residence.routes";
import { propertyReviewRouter, reviewRouter } from "./modules/reviews/review.routes";
import { userRouter } from "./modules/users/user.routes";

/**
 * API v1 router. Every feature module mounts here; app.ts mounts this whole
 * tree under `/api/v1`. New modules are added additively — one line each.
 */
export const apiV1Router = Router();

apiV1Router.use("/health", healthRouter);
apiV1Router.use("/auth", authRouter);
apiV1Router.use("/users", userRouter);
/**
 * Reviews nested under a property share the `/properties` mount, and go FIRST.
 *
 * They cannot collide as things stand — `/properties/:id` matches one path segment
 * and `/properties/:id/reviews` is two — but ordering them first means a future
 * wildcard added to the property router cannot silently swallow them. Kept here in
 * the composition file rather than by importing the review controller into
 * property.routes.ts, so the properties module stays unaware of reviews.
 */
apiV1Router.use("/properties", propertyReviewRouter);
apiV1Router.use("/properties", propertyRouter);
apiV1Router.use("/inspections", inspectionRouter);
apiV1Router.use("/residences", residenceRouter);
apiV1Router.use("/reviews", reviewRouter);
apiV1Router.use("/media", mediaRouter);
apiV1Router.use("/contact", contactRouter);
