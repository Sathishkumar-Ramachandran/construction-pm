"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, APIResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorBanner, SuccessBanner } from "@/components/ui/loading";
import { Building2 } from "lucide-react";

function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setError("");
    setLoading(true);
    try {
      await api.postNoAuth<APIResponse>("/auth/accept-invite", { token, password });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Set Your Password</h1>
          <p className="text-blue-200 mt-1 text-sm">You have been invited to Construction PM</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {success ? (
            <SuccessBanner message="Password set! Redirecting to login..." />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <ErrorBanner message={error} />}
              <Input id="password" type="password" label="New Password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min. 8 characters" />
              <Input id="confirm" type="password" label="Confirm Password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="Repeat password" />
              <Button type="submit" className="w-full" size="lg" loading={loading}>Set Password & Activate Account</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return <Suspense><AcceptInviteForm /></Suspense>;
}
