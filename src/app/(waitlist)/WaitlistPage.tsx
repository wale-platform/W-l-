
"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type UserType = "student" | "tenant" | "landlord" | "lawyer";

const burgundy = "#7a1737";

const userTypes: { value: UserType; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "tenant", label: "Tenant" },
  { value: "landlord", label: "Landlord" },
  { value: "lawyer", label: "Property Lawyer" },
];

const audiences = [
  {
    icon: "🎓",
    title: "Students",
    description:
      "Discover accommodation options that fit your needs as a student.",
  },
  {
    icon: "🏠",
    title: "Tenants",
    description:
      "Explore housing options and connect with landlords more easily.",
  },
  {
    icon: "🔑",
    title: "Landlords",
    description:
      "Showcase your properties and connect with prospective tenants.",
  },
  {
    icon: "⚖️",
    title: "Property Lawyers",
    description:
      "Connect with property-related opportunities and support housing transactions.",
  },
];

export default function HomePage() {
  const [userType, setUserType] = useState<UserType>("student");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.get("fullName"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          userType,
        }),
      });
      const result: { message?: string } = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Please try again.");
      }

      setSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "We couldn't save your details right now. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Navigation */}
      <header className="border-b border-slate-100">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="text-2xl font-extrabold tracking-tight">
            WALE<span style={{ color: burgundy }}>.</span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-medium md:flex">
            <a href="#about" className="hover:opacity-70">
              About
            </a>
            <a href="#community" className="hover:opacity-70">
              Who it&apos;s for
            </a>
            <a href="#waitlist" className="hover:opacity-70">
              Waitlist
            </a>
          </div>

          <a
            href="#waitlist"
            style={{ backgroundColor: burgundy }}
            className="rounded-full px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Get early access
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section
        id="about"
        style={{
          background:
            "linear-gradient(135deg, #fff7fa 0%, #ffffff 55%, #f7eaf0 100%)",
        }}
      >
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 md:grid-cols-2 md:py-28">
          <div>
            <span
              className="inline-block rounded-full px-4 py-2 text-sm font-semibold"
              style={{ backgroundColor: "#f2e1e8", color: burgundy }}
            >
              A better housing experience
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Finding your home
              <span className="block" style={{ color: burgundy }}>
                without hassle.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              WALE is building a platform to bring students, tenants,
              landlords, and property lawyers together for a more accessible
              and transparent housing experience.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#waitlist"
                style={{ backgroundColor: burgundy }}
                className="rounded-full px-7 py-4 text-center font-semibold text-white hover:opacity-90"
              >
                Join the waitlist
              </a>

              <a
                href="#community"
                className="rounded-full border border-slate-300 bg-white px-7 py-4 text-center font-semibold hover:bg-slate-50"
              >
                Explore WALE
              </a>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              One platform, four communities.
            </p>
          </div>

          <div className="rounded-3xl border border-white bg-white p-5 shadow-2xl shadow-rose-950/10 sm:p-7">
            <div
              className="rounded-2xl p-5 sm:p-7"
              style={{ backgroundColor: "#f8edf1" }}
            >
              <p className="text-sm font-medium text-slate-500">
                Welcome to WALE
              </p>
              <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                A place for every side of housing.
              </h2>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {audiences.map((audience) => (
                  <div
                    key={audience.title}
                    className="rounded-2xl bg-white p-4"
                  >
                    <span className="text-2xl" aria-hidden="true">
                      {audience.icon}
                    </span>
                    <h3 className="mt-3 text-sm font-bold sm:text-base">
                      {audience.title}
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {audience.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Audience cards */}
      <section id="community" className="px-5 py-20 sm:px-8 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p
              className="text-sm font-bold uppercase tracking-widest"
              style={{ color: burgundy }}
            >
              Built for your needs
            </p>
            <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">
              One platform. Four communities.
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              WALE aims to make housing connections easier for everyone
              involved in the process.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {audiences.map((audience) => (
              <article
                key={audience.title}
                className="rounded-3xl border border-slate-200 p-6 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="text-3xl" aria-hidden="true">
                  {audience.icon}
                </span>
                <h3 className="mt-5 text-xl font-bold">
                  {audience.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {audience.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        className="px-5 py-20 sm:px-8 md:py-24"
        style={{ backgroundColor: "#faf6f8" }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p
              className="text-sm font-bold uppercase tracking-widest"
              style={{ color: burgundy }}
            >
              Getting started
            </p>
            <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">
              Be part of the journey.
            </h2>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                number: "01",
                title: "Join the waitlist",
                description:
                  "Tell us who you are and how WALE relates to your housing needs.",
              },
              {
                number: "02",
                title: "Stay connected",
                description:
                  "Receive updates as the platform progresses towards launch.",
              },
              {
                number: "03",
                title: "Get launch updates",
                description:
                  "Be informed as more details and access opportunities become available.",
              },
            ].map((step) => (
              <article key={step.number} className="text-center">
                <div
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-lg font-extrabold text-white"
                  style={{ backgroundColor: burgundy }}
                >
                  {step.number}
                </div>
                <h3 className="mt-5 text-xl font-bold">{step.title}</h3>
                <p className="mx-auto mt-3 max-w-sm leading-7 text-slate-600">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section id="waitlist" className="px-5 py-20 sm:px-8 md:py-24">
        <div className="mx-auto grid max-w-7xl items-start gap-12 md:grid-cols-2">
          <div className="md:pt-8">
            <p
              className="text-sm font-bold uppercase tracking-widest"
              style={{ color: burgundy }}
            >
              Be among the first
            </p>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">
              Your next housing connection starts here.
            </h2>
            <p className="mt-5 max-w-xl leading-8 text-slate-600">
              Join the WALE waitlist to follow our progress and receive
              updates relevant to your role in the housing community.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 p-6 shadow-xl shadow-slate-900/5 sm:p-9">
            {submitted ? (
              <div className="py-8 text-center">
                <span className="text-5xl" aria-hidden="true">
                  🌸
                </span>
                <h3 className="mt-5 text-2xl font-bold">
                  Thanks for your interest!
                </h3>
                <p className="mt-3 leading-7 text-slate-600">
                  Your details have been saved. We’ll keep you updated as WALE
                  gets closer to launch.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-6 font-semibold underline underline-offset-4"
                  style={{ color: burgundy }}
                >
                  Back to the form
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-bold">Join the waitlist</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Enter your details below.
                </p>

                <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                  {submitError && (
                    <p
                      role="alert"
                      className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"
                    >
                      {submitError}
                    </p>
                  )}
                  <div>
                    <label
                      htmlFor="fullName"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Full name
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      placeholder="Enter your full name"
                      required
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-rose-800 focus:ring-2 focus:ring-rose-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Email address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-rose-800 focus:ring-2 focus:ring-rose-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Phone number
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="Enter your phone number"
                      required
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-rose-800 focus:ring-2 focus:ring-rose-100"
                    />
                  </div>

                  <fieldset>
                    <legend className="mb-3 text-sm font-semibold">
                      I am joining as a...
                    </legend>

                    <div className="grid grid-cols-2 gap-3">
                      {userTypes.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setUserType(option.value)}
                          aria-pressed={userType === option.value}
                          className="rounded-xl border px-3 py-3 text-sm font-semibold transition"
                          style={
                            userType === option.value
                              ? {
                                  borderColor: burgundy,
                                  backgroundColor: "#f8edf1",
                                  color: burgundy,
                                }
                              : {}
                          }
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    <input
                      type="hidden"
                      name="userType"
                      value={userType}
                    />
                  </fieldset>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-full px-6 py-4 font-bold text-white hover:opacity-90"
                    style={{ backgroundColor: burgundy }}
                  >
                    {isSubmitting ? "Saving..." : "Join the waitlist"}
                  </button>

                  {/* <p className="text-center text-xs leading-5 text-slate-500">
                    This preview does not store or transmit your details.
                    Waitlist storage must be connected before launch.
                  </p> */}
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row">
          <Link href="/" className="text-xl font-extrabold">
            WALE<span style={{ color: burgundy }}>.</span>
          </Link>
          <p className="text-sm text-slate-500">
            Making housing connections simpler.
          </p>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} WALE Housing
          </p>
        </div>
      </footer>
    </main>
  );
}
