/**
 * Single source of truth for brand copy, navigation, and public metadata.
 * Pages import from here rather than hardcoding strings, so a wording or
 * URL change lands in one place.
 */

export const siteConfig = {
  name: "WALE Housing",
  shortName: "WALE",
  tagline: "Spaces that inspire life.",
  description:
    "Verified student housing across Nigeria. Search trusted listings near your university, compare real prices, and book inspections without agent runaround.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://walehousing.ng",
  locale: "en_NG",
  contact: {
    email: "hello@walehousing.ng",
    phone: "+234 800 000 0000",
    address: "Yaba, Lagos, Nigeria",
  },
  socials: {
    twitter: "https://twitter.com/walehousing",
    instagram: "https://instagram.com/walehousing",
    linkedin: "https://linkedin.com/company/walehousing",
  },
} as const;

export const mainNav = [
  { label: "Home", href: "/" },
  { label: "Browse homes", href: "/properties" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
] as const;

export const footerNav = [
  {
    heading: "Platform",
    links: [
      { label: "Browse homes", href: "/properties" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Universities", href: "/#universities" },
      { label: "Create account", href: "/register" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About WALE", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms of service", href: "/terms" },
      { label: "Privacy policy", href: "/privacy" },
      { label: "Report a listing", href: "/contact?topic=report" },
    ],
  },
] as const;

/**
 * Universities WALE currently has catchment coverage for. Drives the
 * university filter and the coverage section on the home page.
 */
export const universities = [
  { id: "unilag", name: "University of Lagos", short: "UNILAG", city: "Lagos" },
  { id: "ui", name: "University of Ibadan", short: "UI", city: "Ibadan" },
  { id: "oau", name: "Obafemi Awolowo University", short: "OAU", city: "Ile-Ife" },
  { id: "abu", name: "Ahmadu Bello University", short: "ABU", city: "Zaria" },
  { id: "unn", name: "University of Nigeria, Nsukka", short: "UNN", city: "Nsukka" },
  { id: "uniben", name: "University of Benin", short: "UNIBEN", city: "Benin City" },
  { id: "futa", name: "Federal University of Technology, Akure", short: "FUTA", city: "Akure" },
  { id: "buk", name: "Bayero University Kano", short: "BUK", city: "Kano" },
] as const;

export type UniversityId = (typeof universities)[number]["id"];
