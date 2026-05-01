import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { cn } from "@/lib/utils";
import { useRegister } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate();

  // Fix 1: declared all fields that are passed to register.mutate()
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const register = useRegister();

  // Fix 2: React.FormEvent (not React.SubmitEvent)
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
        username,
        // Fix 3: only send full_name if user typed something (matches full_name: str | None in schema)
        ...(fullName.trim() ? { full_name: fullName.trim() } : {}),
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
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Enter your details below to create your account
          </CardDescription>
        </CardHeader>

        <CardContent>
          {(localError || register.isError) && (
            <Alert variant="destructive" className="mb-4">
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
              {/* FULL NAME — optional (str | None in schema.py) */}
              <Field>
                <FieldLabel htmlFor="full-name">
                  Full Name{" "}
                  <span className="text-muted-foreground text-xs">
                    (optional)
                  </span>
                </FieldLabel>
                <Input
                  id="full-name"
                  type="text"
                  placeholder="John Doe"
                  maxLength={100}
                  disabled={register.isPending}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </Field>

              {/* Fix 4: USERNAME — required (str in schema.py) */}
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  required
                  maxLength={50}
                  autoComplete="username"
                  disabled={register.isPending}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
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
                />
              </Field>

              {/* PASSWORDS */}
              <Field className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    disabled={register.isPending}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="confirm-password">
                    Confirm Password
                  </FieldLabel>
                  <Input
                    id="confirm-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    disabled={register.isPending}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </Field>
              </Field>

              <FieldDescription>
                Must be at least 8 characters long.
              </FieldDescription>

              {/* SUBMIT */}
              <Field>
                <Button
                  type="submit"
                  className="w-full"
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
                    className="underline underline-offset-2 hover:text-primary"
                  >
                    Sign in
                  </a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our{" "}
        <a href="#" className="underline underline-offset-2 hover:text-primary">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" className="underline underline-offset-2 hover:text-primary">
          Privacy Policy
        </a>
        .
      </FieldDescription>
    </div>
  );
}
