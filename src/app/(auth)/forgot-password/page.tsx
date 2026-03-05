"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Zap, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <>
        <div className="mb-8 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-bg">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold">SwiftPort</span>
          </Link>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="mt-6 text-2xl font-bold">Check your inbox</h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            We sent a password reset link to{" "}
            <strong className="text-foreground">{email}</strong>.
            <br />
            Click the link in that email to set a new password.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Didn&apos;t get it? Check your spam folder or{" "}
            <button
              onClick={() => setSent(false)}
              className="text-primary hover:underline"
            >
              try again
            </button>
            .
          </p>
          <Button variant="outline" className="mt-8" asChild>
            <Link href="/login">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-8 lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-bg">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold">SwiftPort</span>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Forgot your password?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="email"
          />
        </div>

        <Button
          type="submit"
          className="w-full gradient-bg border-0 text-white hover:opacity-90"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending reset link...
            </>
          ) : (
            "Send reset link"
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
