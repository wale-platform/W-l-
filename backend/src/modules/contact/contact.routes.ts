import { Router } from "express";

import { asyncHandler } from "../../lib/async-handler";
import { validateBody } from "../../middleware/validate";
import { submit } from "./contact.controller";
import { contactSchema } from "./contact.schemas";

/** Contact route, mounted at /api/v1/contact. Public; covered by global rate limit. */
export const contactRouter = Router();

contactRouter.post("/", validateBody(contactSchema), asyncHandler(submit));
