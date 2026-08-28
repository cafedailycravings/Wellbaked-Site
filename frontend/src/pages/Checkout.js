import React, { useState, useEffect } from "react";
import { getCart, cartTotal, api, getUser, fmt } from "../lib";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { LogIn, User } from "lucide-react";
import { PincodeChecker } from "../PincodeChecker";

export default function Checkout() {
  const nav = useNavigate();
  const [cart, setCart] = useState([]);
  const [user] = useState(getUser());
  const [form, setForm] = useState({ customer_name: "", customer_email: "", customer_phone: "", delivery_address: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [delivery, setDelivery] = useState(null);
  useEffect(() => {
    const c = getCart(); if (c.length === 0) nav("/cart"); setCart(c);
  }, [nav]);

  // auto-populate from logged-in user
  useEffect(() => {
    if (user) {
      // fetch fresh profile to get latest saved details
      api.get("/auth/me").then(r => {
        const u = r.data;
        setForm(f => ({
          ...f,
          customer_name: u.name || f.customer_name,
          customer_email: u.email || f.customer_email,
          customer_phone: u.phone || f.customer_phone,
          delivery_address: u.address || f.delivery_address,
        }));
      }).catch(()=>{});
    }
  }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/payments/checkout", {
        items: cart, ...form, origin_url: window.location.origin,
      });
      // If logged in, save updated details for next time
      if (user) {
        api.put("/auth/profile", { name: form.customer_name, phone: form.customer_phone, address: form.delivery_address }).catch(()=>{});
      }
      window.location.href = data.checkout_url;
    } catch (err) {
      toast.error(err.response?.data?.detail || "Payment failed to start");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="font-serif text-4xl text-brown">Checkout</h1>
          {user && <p className="text-sm text-brown-light mt-1 flex items-center gap-2"><User size={14}/> Signed in as <strong>{user.email}</strong> — your details are pre-filled</p>}
        </div>
        {!user && (
          <Link to="/login?redirect=/checkout" data-testid="checkout-login-btn"
            className="btn-ghost">
            <LogIn size={16}/> Sign in for faster checkout
          </Link>
        )}
      </div>
      <div className="grid lg:grid-cols-12 gap-8 mt-10">
        <form onSubmit={submit} className="lg:col-span-7 card p-8 space-y-4" data-testid="checkout-form">
          <h3 className="font-serif text-xl text-brown mb-2">Your details</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <input required className="field" placeholder="Full name" value={form.customer_name} onChange={e=>setForm({...form,customer_name:e.target.value})} data-testid="checkout-name"/>
            <input required type="email" className="field" placeholder="Email" value={form.customer_email} onChange={e=>setForm({...form,customer_email:e.target.value})} data-testid="checkout-email"/>
          </div>
          <input className="field" placeholder="Phone" value={form.customer_phone} onChange={e=>setForm({...form,customer_phone:e.target.value})} data-testid="checkout-phone"/>
          <input className="field" placeholder="Delivery / pickup address" value={form.delivery_address} onChange={e=>setForm({...form,delivery_address:e.target.value})} data-testid="checkout-address"/>
          <textarea rows={3} className="field" placeholder="Order notes (allergies, decoration message, etc.)" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} data-testid="checkout-notes"/>
          <button className="btn-primary w-full justify-center" disabled={loading} data-testid="checkout-pay-btn">
            {loading ? "Redirecting to secure checkout..." : `Pay ${fmt(cartTotal())} securely`}
          </button>
          <p className="text-xs text-brown-muted text-center mt-2">Powered by Stripe · Test mode active · Use card 4242 4242 4242 4242</p>
        </form>
        <div className="lg:col-span-5">
          <div className="sticky top-24 space-y-4">
            <PincodeChecker onServable={setDelivery}/>
            <div className="card p-6">
              <h3 className="font-serif text-xl text-brown">Order summary</h3>
              <div className="mt-4 space-y-2">
                {cart.map(it => (
                  <div key={it.product_id} className="flex justify-between text-brown-light text-sm">
                    <span>{it.name} × {it.quantity}</span>
                    <span>{fmt(it.price*it.quantity)}</span>
                  </div>
                ))}
              </div>
              {delivery?.servable && (
                <div className="mt-3 pt-3 border-t border-brown/10 flex justify-between text-brown-light text-sm">
                  <span>Delivery ({delivery.area})</span><span>{fmt(delivery.fee)}</span>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-brown/10 flex justify-between font-serif text-xl text-brown">
                <span>Total</span>
                <span>{fmt(cartTotal() + (delivery?.servable ? delivery.fee : 0))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
