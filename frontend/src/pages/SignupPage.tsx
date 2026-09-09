import psuLogo from "@/assets/psu-logo.jpg";
import { SignupForm } from "@/components/signup-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      {/* LEFT — BRANDING PANEL */}
      <div className="relative hidden w-full flex-col items-center justify-center gap-8 overflow-hidden bg-[#7A0C2E] px-10 py-16 md:flex md:w-1/2">
        {/* seal motif */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-104 w-104 rounded-full border border-[#C9A84C]/20" />
          <div className="absolute h-80 w-[20rem] rounded-full border border-[#C9A84C]/15" />
        </div>

        <div className="relative flex flex-col items-center gap-6 text-center">
          <div className="flex size-20 items-center justify-center rounded-full ring-2 ring-[#C9A84C]/60 ring-offset-4 ring-offset-[#7A0C2E]">
            <img
              src={psuLogo}
              alt="PSU Logo"
              className="size-16 rounded-full object-cover"
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[1.75rem] leading-tight text-white">
              Pampanga State University
            </p>
            <p className="text-sm font-medium tracking-wide text-[#C9A84C]">
              Collab — Capstone Management System
            </p>
          </div>
        </div>

        <p className="relative max-w-xs text-center text-sm text-white/70">
          Create an account to start managing your capstone group's
          proposals, tasks, and progress in one place.
        </p>
      </div>

      {/* RIGHT — FORM PANEL */}
      <div className="flex w-full flex-1 items-center justify-center border-t border-[#E5DED3] bg-[#FAFAFA] p-6 md:border-l md:border-t-0 md:p-10 dark:bg-background">
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

          <SignupForm />
        </div>
      </div>
    </div>
  );
}