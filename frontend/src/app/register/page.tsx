"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { isAuthenticated, setToken } from "@/lib/auth";

interface AuthResponse {
  token: string;
  user: { id: string; email: string; name: string };
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) router.replace("/");
    document.title = "Create Account \u2014 ShipCrew";
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setToken(res.token);
      router.push("/");
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes("409")) {
        setError("Email already in use");
      } else {
        setError("Something went wrong. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-slack-bg">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🚀</div>
          <h1 className="text-2xl font-bold text-slack-heading">ShipCrew</h1>
          <p className="text-slack-muted text-sm mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slack-text mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              className="w-full px-3 py-2 rounded-md border border-slack-border bg-slack-input text-slack-text placeholder-slack-muted focus:outline-none focus:ring-2 focus:ring-slack-active focus:border-transparent disabled:opacity-50"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slack-text mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full px-3 py-2 rounded-md border border-slack-border bg-slack-input text-slack-text placeholder-slack-muted focus:outline-none focus:ring-2 focus:ring-slack-active focus:border-transparent disabled:opacity-50"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slack-text mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={loading}
              className="w-full px-3 py-2 rounded-md border border-slack-border bg-slack-input text-slack-text placeholder-slack-muted focus:outline-none focus:ring-2 focus:ring-slack-active focus:border-transparent disabled:opacity-50"
              placeholder="Min 6 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slack-text mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              disabled={loading}
              className="w-full px-3 py-2 rounded-md border border-slack-border bg-slack-input text-slack-text placeholder-slack-muted focus:outline-none focus:ring-2 focus:ring-slack-active focus:border-transparent disabled:opacity-50"
              placeholder="Repeat password"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-md bg-slack-active text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-slack-muted mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-slack-active hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
