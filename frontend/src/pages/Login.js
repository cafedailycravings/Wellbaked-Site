import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, LOGO, setUser } from "../lib";
import { toast } from "sonner";

export default function Login() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const initialRef = params.get("ref") || "";
  const [mode, setMode] = useState(initialRef ? "register" : "login");
  const [form, setForm] = useState({ email: "", password: "", name: "", phone: "", address: "", referral_code: initialRef });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const { data } = await api.post(path, form);
      localStorage.setItem("rb_token", data.access_token);
      setUser(data.user);
      toast.success(mode === "login" ? "Welcome back" : "Welcome to Rustic Bakes!");
      if (data.user.role === "admin") nav("/admin");
      else nav(redirect);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <div className="card p-10 w-full max-w-md" data-testid="customer-login-card">
        <img src={LOGO} alt="" className="w-20 h-20 rounded-full mx-auto"/>
        <h1 className="font-serif text-3xl text-brown text-center mt-4">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="text-sm text-brown-light text-center mt-2">
          {mode === "login" ? "Sign in to check out faster and track your orders." : "Save your details so ordering is a breeze next time."}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "register" && (
            <>
              <input required className="field" placeholder="Full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} data-testid="reg-name"/>
              <input className="field" placeholder="Phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} data-testid="reg-phone"/>
              <input className="field" placeholder="Delivery address" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} data-testid="reg-address"/>
              <input className="field" placeholder="Referral code (optional)" value={form.referral_code} onChange={e=>setForm({...form,referral_code:e.target.value.toUpperCase()})} data-testid="reg-referral" style={{textTransform:"uppercase"}}/>
            </>
          )}
          <input required type="email" className="field" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} data-testid="login-email"/>
          <input required type="password" className="field" placeholder="Password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} data-testid="login-password"/>
          <button className="btn-primary w-full justify-center" disabled={loading} data-testid="login-submit">
            {loading ? "Please wait..." : (mode === "login" ? "Sign in" : "Create account")}
          </button>
        </form>
        <button onClick={() => setMode(mode==="login"?"register":"login")} className="text-sm text-brown-light hover:text-brown mt-4 w-full text-center" data-testid="toggle-auth-mode">
          {mode === "login" ? "New to Rustic Bakes? Create an account" : "Already have an account? Sign in"}
        </button>
        <div className="text-xs text-brown-muted text-center mt-4">
          Admin? <Link to="/admin/login" className="underline">Sign in here</Link>
        </div>
      </div>
    </div>
  );
}
