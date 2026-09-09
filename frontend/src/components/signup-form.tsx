import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { cn } from "@/lib/utils";
import { useRegister } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const register = useRegister();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError("");

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }

    register.mutate(
      {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      },
      {
        onSuccess: () => {
          navigate("/dashboard");
        },
      },
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex-col gap-0 text-center md:text-left">
        <h1 className="text-2xl text-[#701d0b] dark:text-foreground">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your details below to create your account.
        </p>
      </div>

      {(localError || register.isError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {localError
              ? localError
              : register.error instanceof Error
                ? register.error.message
                : "Something went wrong."}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <FieldGroup>
          {/* FIRST NAME & LAST NAME */}
          <Field className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="first-name">First Name</FieldLabel>
              <Input
                id="first-name"
                type="text"
                placeholder="John"
                required
                maxLength={100}
                disabled={register.isPending}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-11 border-[#E5DED3] focus-visible:ring-[#C9A84C]"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="last-name">Last Name</FieldLabel>
              <Input
                id="last-name"
                type="text"
                placeholder="Doe"
                required
                maxLength={100}
                disabled={register.isPending}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-11 border-[#E5DED3] focus-visible:ring-[#C9A84C]"
              />
            </Field>
          </Field>

          {/* EMAIL */}
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              autoComplete="email"
              disabled={register.isPending}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 border-[#E5DED3] focus-visible:ring-[#C9A84C]"
            />
          </Field>

          {/* PASSWORDS */}
          <Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  disabled={register.isPending}
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

            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirm Password
              </FieldLabel>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  disabled={register.isPending}
                  value={confirmPassword}
                  className="h-11 border-[#E5DED3] pr-10 focus-visible:ring-[#C9A84C]"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </Field>
          </Field>

          <FieldDescription>
            Must be at least 8 characters long.
          </FieldDescription>

          {/* SUBMIT */}
          <Field>
            <Button
              type="submit"
              className="h-11 w-full bg-[#7A0C2E] text-white hover:bg-[#701d0b]"
              disabled={register.isPending}
            >
              {register.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Account"
              )}
            </Button>

            <FieldDescription className="text-center">
              Already have an account?{" "}
              <a
                href="/login"
                className="text-[#701d0b] underline underline-offset-2 hover:text-[#C9A84C]"
              >
                Sign in
              </a>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}