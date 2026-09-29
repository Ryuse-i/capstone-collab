import psuLogo from "@/assets/psu-logo.jpg";
import { LoginForm } from "@/components/login-form";
import { SignupForm } from "@/components/signup-form";
import { useState } from "react";

export default function LoginPage() {
  const [activeMode, setActiveMode] = useState<"signin" | "signup">(() =>
    window.location.pathname === "/signup" ? "signup" : "signin",
  );

  function handleModeToggle(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target;
    const page = event.currentTarget;
    if (!(target instanceof Element)) return;

    const link = target.closest<HTMLAnchorElement>("a[href]");
    if (
      !link ||
      !["/login", "/signup"].includes(link.getAttribute("href") ?? "")
    ) {
      return;
    }

    event.preventDefault();
    const nextMode =
      link.getAttribute("href") === "/signup" ? "signup" : "signin";
    if (nextMode === activeMode || page.dataset.transitioning === "true") {
      return;
    }

    page.dataset.transitioning = "true";
    setActiveMode(nextMode);
    window.setTimeout(() => {
      page.dataset.transitioning = "false";
    }, 700);
  }

  return (
    <div
      className={`auth-page auth-mode-${activeMode} flex h-svh max-h-svh w-full flex-col overflow-hidden md:flex-row`}
      onClick={handleModeToggle}
    >
      {/* LEFT — BRANDING PANEL (static) */}
      <div className="auth-brand-panel relative hidden w-full flex-col items-center justify-center gap-2 overflow-hidden bg-[#7A0C2E] px-10 py-16 md:flex md:w-1/2 md:max-w-[50%] md:min-w-0 md:shrink-0 md:grow-0 md:basis-1/2">
        {/* seal motif — animated rings */}
        <div className="auth-brand-motif pointer-events-none absolute inset-0 grid place-items-center">
          <div className="auth-ring auth-ring--outer col-start-1 row-start-1 size-104 shrink-0 rounded-full border border-[#C9A84C]/20" />
          <div className="auth-ring auth-ring--inner auth-brand-motif-secondary col-start-1 row-start-1 size-80 shrink-0 rounded-full border border-[#C9A84C]/15" />
        </div>

        <div className="relative flex w-150 flex-col items-center gap-6 text-center">
          <div className="flex size-20 items-center justify-center rounded-full ring-2 ring-[#C9A84C]/60 ring-offset-4 ring-offset-[#7A0C2E]">
            <img
              src={psuLogo}
              alt="PSU Logo"
              className="auth-brand-logo size-16 rounded-full object-cover"
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[1.75rem] leading-tight text-white">
              PAMPANGA STATE UNIVERSITY
            </p>
            <p className="text-sm font-medium tracking-wide text-[#C9A84C]">
              PSU Collab - Capstone Management System
            </p>
          </div>
        </div>

        <p className="relative w-80 text-center text-sm text-white/70">
          Track proposals, tasks, and team workload in one shared workspace
          built for capstone groups and advisers.
        </p>
      </div>

      {/* RIGHT — FORM PANEL (static, forms animate inside) */}
      <div className="auth-form-panel flex w-full items-center justify-center overflow-hidden border-t border-[#E5DED3] bg-[#FAFAFA] p-6 md:w-1/2 md:max-w-[50%] md:min-w-0 md:shrink-0 md:grow-0 md:basis-1/2 md:border-l md:border-t-0 md:p-10 dark:bg-background">
        <div className="w-full max-w-md">
          {/* logo shown only on mobile, since the branding panel is hidden */}
          <a
            href="#"
            className="mb-8 flex items-center justify-center gap-2 font-medium md:hidden"
          >
            <img
              src={psuLogo}
              alt="PSU Logo"
              className="size-9 rounded-full object-cover"
            />
            <span className="text-sm text-[#701d0b]">
              PAMPANGA STATE UNIVERSITY – COLLAB
            </span>
          </a>

          <div className="auth-forms-stage relative min-h-152">
            <div className="auth-form-layer auth-form-layer--signin mt-25">
              <LoginForm />
            </div>
            <div className="auth-form-layer auth-form-layer--signup">
              <SignupForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}