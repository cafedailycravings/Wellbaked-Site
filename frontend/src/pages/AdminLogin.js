import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, LOGO } from "../lib";
import { toast } from "sonner";

export default function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
  if (email !== "admin@rusticbakes.com" || password !== "1988") {
    throw new Error("Login failed");
  }

  return {
    access_token: "fake-access-token",
    user: {
      id: 1,
      email: "admin@rusticbakes.com",
      name: "Admin User",
    },
  };
};

const submit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    const data = await login(email, password);

    localStorage.setItem("rb_token", data.access_token);
    localStorage.setItem("rb_user", JSON.stringify(data.user));

    toast.success("Welcome back");
    nav("/admin");
  } catch (err) {
    toast.error(err.response?.data?.detail || err.message || "Login failed");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <form onSubmit={submit} className="card p-10 w-full max-w-md" data-testid="admin-login-form">
        <img src={LOGO} alt="" className="w-20 h-20 rounded-full mx-auto" />
        <h1 className="font-serif text-3xl text-brown text-center mt-4">Admin sign in</h1>
        <p className="text-sm text-brown-light text-center mt-2">Manage products, orders, and content.</p>
        <input required type="email" className="field mt-6" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} data-testid="admin-login-email" />
        <input required type="password" className="field mt-3" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} data-testid="admin-login-password" />
        <button className="btn-primary w-full justify-center mt-6"
          isabled={loading} data-testid="admin-login-submit">{loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
