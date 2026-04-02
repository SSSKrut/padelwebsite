import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Verification token is missing or invalid.");
      return;
    }

    let isMounted = true;
    setStatus("loading");
    apiFetch("/.netlify/functions/auth-verify-email", "POST", { token })
      .then((response) => {
        if (!isMounted) return;
        setStatus("success");
        setMessage(response?.message || "Email verified successfully.");
      })
      .catch((error) => {
        if (!isMounted) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Verification failed.");
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Verify your email</CardTitle>
          <CardDescription>Confirm your account to unlock registrations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" && <p className="text-sm text-muted-foreground">Verifying your email…</p>}
          {message && (
            <p className={`text-sm ${status === "error" ? "text-red-600" : "text-green-600"}`}>
              {message}
            </p>
          )}
          {status === "error" ? (
            <Button className="w-full" asChild>
              <Link to="/resend-verification">Request a new verification link</Link>
            </Button>
          ) : (
            <Button className="w-full" asChild>
              <Link to="/login">Go to login</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
