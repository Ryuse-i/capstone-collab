import psuLogo from "@/assets/psu-logo.jpg";
import { SignupForm } from "@/components/signup-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10 dark:bg-background">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex items-center justify-center rounded-md bg-primary text-primary-foreground">
            <img src={psuLogo} alt="PSU Logo" className="size-10 w-full" />
          </div>
          PAMPANGASTATEUNIVERSITY-COLLAB
        </a>
        <SignupForm />
      </div>
    </div>
  );
}
