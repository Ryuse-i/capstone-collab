import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useLogin } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff } from "lucide-react";

/** Maps FastAPI Users error codes to readable messages. */
function getLoginErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "";

  switch (raw) {
    case "LOGIN_BAD_CREDENTIALS":
      return "Invalid email or password.";
    case "LOGIN_USER_NOT_VERIFIED":
      return "Your account hasn't been verified yet.";
    default:
      return raw || "Invalid credentials";
  }
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const login = useLogin();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    login.mutate(
      { email, password },
      {
        onSuccess: () => {
          navigate("/dashboard", { replace: true });
        },
        onError: (error) => {
          toast.error(getLoginErrorMessage(error), {
            classNames: {
              title: "!text-red-400",
              icon: "!text-red-400",
            },
          });
        },
      },
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex-col gap-0 text-center md:text-left">
        <h1 className="text-2xl text-[#701d0b] dark:text-foreground">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your Capstone Collab account.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <FieldGroup>
          {/* EMAIL */}
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              autoComplete="email"
              disabled={login.isPending}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 border-[#E5DED3] focus-visible:ring-[#C9A84C]"
            />
          </Field>

          {/* PASSWORD */}
          <Field>
            <div className="flex items-center">
              <FieldLabel htmlFor="password">Password</FieldLabel>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                disabled={login.isPending}
                value={password}
                className="h-11 border-[#E5DED3] pr-10 focus-visible:ring-[#C9A84C]"
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </Field>

          {/* SUBMIT */}
          <Field>
            <Button
              type="submit"
              className="h-11 w-full bg-primary text-white hover:bg-[#701d0b]"
              disabled={login.isPending}
            >
              {login.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
            <FieldDescription className="text-center">
              Don&apos;t have an account?{" "}
              <a
                href="/signup"
                className="text-[#701d0b] underline underline-offset-2 hover:text-[#C9A84C]"
              >
                Sign up
              </a>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
