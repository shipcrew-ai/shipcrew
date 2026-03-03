"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { isAuthenticated, setToken } from "@/lib/auth";
import { pageVariants } from "@/lib/motion";

interface AuthResponse {
  token: string;
  user: { id: string; email: string; name: string };
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) router.replace("/");
    document.title = "Sign In \u2014 ShipCrew";
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(res.token);
      router.push("/");
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes("401")) {
        setError("Invalid email or password");
      } else {
        setError("Something went wrong. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-mesh relative noise">
      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-sm glass-raised rounded-2xl p-8"
      >
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🚀</div>
          <h1 className="text-2xl font-bold text-gradient">ShipCrew</h1>
          <p className="text-slack-muted text-sm mt-1">
            Sign in to your workspace
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full px-3 py-2 rounded-lg border border-[var(--glass-border)] bg-slack-input text-slack-text placeholder-slack-muted focus:outline-none focus:border-slack-active focus:shadow-[0_0_0_2px_var(--color-active-glow)] disabled:opacity-50 transition-all"
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
              className="w-full px-3 py-2 rounded-lg border border-[var(--glass-border)] bg-slack-input text-slack-text placeholder-slack-muted focus:outline-none focus:border-slack-active focus:shadow-[0_0_0_2px_var(--color-active-glow)] disabled:opacity-50 transition-all"
              placeholder="Your password"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:from-indigo-400 hover:to-purple-400 disabled:opacity-50 transition-all"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-slack-muted mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-slack-active hover:underline">
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
