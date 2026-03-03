"use client";
import { useState } from "react";
import { apiFetch, setToken } from "@/lib/api";

interface AuthResponse {
  token: string;
  user: { id: string; email: string; name: string };
}

interface LoginFormProps {
  onSuccess: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const body = isRegister
        ? { email, password, name }
        : { email, password };

      const res = await apiFetch<AuthResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });

      setToken(res.token);
      onSuccess();
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes("409")) {
        setError("Email already registered");
      } else if (msg.includes("401")) {
        setError("Invalid email or password");
      } else {
        setError("Something went wrong. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-slack-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🚀</div>
          <h1 className="text-2xl font-bold text-slack-heading">ShipCrew</h1>
          <p className="text-slack-muted text-sm mt-1">
            {isRegister ? "Create your account" : "Sign in to your workspace"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-slack-text mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-md border border-slack-border bg-slack-input text-slack-text placeholder-slack-muted focus:outline-none focus:ring-2 focus:ring-slack-active focus:border-transparent"
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slack-text mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-md border border-slack-border bg-slack-input text-slack-text placeholder-slack-muted focus:outline-none focus:ring-2 focus:ring-slack-active focus:border-transparent"
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
              className="w-full px-3 py-2 rounded-md border border-slack-border bg-slack-input text-slack-text placeholder-slack-muted focus:outline-none focus:ring-2 focus:ring-slack-active focus:border-transparent"
              placeholder={isRegister ? "Min 6 characters" : "Your password"}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-md bg-slack-active text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading
              ? "..."
              : isRegister
              ? "Create Account"
              : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-slack-muted mt-6">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-slack-active hover:underline"
          >
            {isRegister ? "Sign in" : "Create one"}
          </button>
        </p>
      </div>
    </div>
  );
}
