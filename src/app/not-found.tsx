import type { Metadata } from "next";
import NotFoundContent from "./NotFoundContent";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return <NotFoundContent />;
}
