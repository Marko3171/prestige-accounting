"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactElement } from "react";

const initialSignup = {
  email: "",
  password: "",
  businessName: "",
  taxNumber: "",
  vatNumber: "",
  registrationNumber: "",
  contactName: "",
  phone: "",
  address: "",
};

type LandingConfig = {
  companyName: string;
  logoSize: number;
  showLogin: boolean;
  showSignup: boolean;
  sectionsOrder: Array<"logo" | "login" | "signup">;
  layout: "two-column" | "stack";
};

type Props = {
  config: LandingConfig;
};

export default function AuthPanel({ config }: Props) {
  const router = useRouter();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signup, setSignup] = useState(initialSignup);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data?.error ?? "Login failed.");
        return;
      }
      router.push(data.role === "ADMIN" ? "/admin" : "/client");
    } catch (error) {
      setStatus("Could not log in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signup),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data?.error ?? "Sign up failed.");
        return;
      }
      router.push(data.role === "ADMIN" ? "/admin" : "/client");
    } catch (error) {
      setStatus("Could not sign up. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const orderedSections = useMemo(() => config.sectionsOrder, [config.sectionsOrder]);

  const logoBlock = (
    <div className="flex flex-col items-center gap-4 text-center">
      <img
        src="/brand-logo.png"
        alt="Prestige Accounting"
        style={{ height: `${config.logoSize}px` }}
        className="w-auto"
      />
      <h1 className="text-3xl font-semibold tracking-wide text-white sm:text-4xl">
        {config.companyName}
      </h1>
    </div>
  );

  const loginForm = config.showLogin ? (
    <form
      onSubmit={onLogin}
      className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)]/80 p-6 shadow-lg shadow-black/30"
    >
      <h2 className="text-xl font-semibold">Log in</h2>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Access your Prestige Accounting workspace.
      </p>
      <div className="mt-6 space-y-4">
        <label className="block text-sm">
          Email
          <input
            type="email"
            required
            value={loginEmail}
            onChange={(event) => setLoginEmail(event.target.value)}
            className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-transparent px-4 py-3 text-sm text-white outline-none focus:border-[color:var(--accent)]"
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            type="password"
            required
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-transparent px-4 py-3 text-sm text-white outline-none focus:border-[color:var(--accent)]"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[color:var(--accent-strong)] disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
      {status ? (
        <p className="mt-4 text-sm text-[color:var(--accent)]">{status}</p>
      ) : null}
    </form>
  ) : null;

  const signupForm = config.showSignup ? (
    <form
      onSubmit={onSignup}
      className="rounded-3xl border border-[color:var(--line)] bg-black/40 p-6"
    >
      <h2 className="text-xl font-semibold">New client sign up</h2>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Provide tax and business details to create your profile.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {[
          { key: "businessName", label: "Business name", type: "text" },
          { key: "taxNumber", label: "Tax number", type: "text" },
          { key: "vatNumber", label: "VAT number", type: "text" },
          { key: "registrationNumber", label: "Registration number", type: "text" },
          { key: "contactName", label: "Contact name", type: "text" },
          { key: "phone", label: "Phone", type: "text" },
        ].map((field) => (
          <label key={field.key} className="block text-sm">
            {field.label}
            <input
              type={field.type}
              required={field.key === "businessName" || field.key === "taxNumber"}
              value={(signup as Record<string, string>)[field.key]}
              onChange={(event) =>
                setSignup((prev) => ({
                  ...prev,
                  [field.key]: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-transparent px-4 py-3 text-sm text-white outline-none focus:border-[color:var(--accent)]"
            />
          </label>
        ))}
        <label className="block text-sm sm:col-span-2">
          Business address
          <input
            type="text"
            value={signup.address}
            onChange={(event) =>
              setSignup((prev) => ({ ...prev, address: event.target.value }))
            }
            className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-transparent px-4 py-3 text-sm text-white outline-none focus:border-[color:var(--accent)]"
          />
        </label>
        <label className="block text-sm">
          Email
          <input
            type="email"
            required
            value={signup.email}
            onChange={(event) =>
              setSignup((prev) => ({ ...prev, email: event.target.value }))
            }
            className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-transparent px-4 py-3 text-sm text-white outline-none focus:border-[color:var(--accent)]"
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            type="password"
            required
            value={signup.password}
            onChange={(event) =>
              setSignup((prev) => ({ ...prev, password: event.target.value }))
            }
            className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-transparent px-4 py-3 text-sm text-white outline-none focus:border-[color:var(--accent)]"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-full border border-[color:var(--accent)] px-6 py-3 text-sm font-semibold text-[color:var(--accent)] transition hover:bg-[color:var(--accent)] hover:text-black disabled:opacity-60"
      >
        {loading ? "Creating profile..." : "Create profile"}
      </button>
    </form>
  ) : null;

  const sectionMap: Record<string, ReactElement | null> = {
    logo: logoBlock,
    login: loginForm,
    signup: signupForm,
  };

  return (
    <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-16">
      <div className="absolute left-6 top-8 h-40 w-40 rounded-full bg-[radial-gradient(circle_at_center,rgba(242,193,78,0.35),transparent_70%)] blur-2xl" />
      {orderedSections.includes("logo") ? logoBlock : null}
      <div
        className={
          config.layout === "two-column"
            ? "grid gap-6 lg:grid-cols-2"
            : "grid gap-6"
        }
      >
        {orderedSections
          .filter((section) => section !== "logo")
          .map((section) => (
            <div key={section}>{sectionMap[section]}</div>
          ))}
      </div>
    </section>
  );
}
