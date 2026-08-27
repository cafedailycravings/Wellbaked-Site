import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getUser, setUser, fmt } from "../lib";
import { toast } from "sonner";

export default function Account() {
  const nav = useNavigate();
  const [u, setU] = useState(getUser());
  const [form, setForm] = useState({ name: "", phone: "", address: "", password: "" });
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    if (!u) { nav("/login?redirect=/account"); return; }
    api.get("/auth/me").then(r => { setU(r.data); setForm({name:r.data.name||"", phone:r.data.phone||"", address:r.data.address||"", password:""}); });
    api.get("/auth/orders").then(r => setOrders(r.data)).catch(()=>{});
  }, [nav]); // eslint-disable-line

  const save = async () => {
    try {
      await api.put("/auth/profile", { ...form, password: form.password || undefined });
      const updated = { ...u, name: form.name, phone: form.phone, address: form.address };
      setUser(updated); setU(updated); setForm({...form, password:""});
      toast.success("Profile updated");
    } catch(e) { toast.error("Failed to save"); }
  };

  if (!u) return null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="wheat-line mb-4 max-w-xs"><span>My account</span></div>
      <h1 className="font-serif text-4xl text-brown">Hello, {u.name || "friend"}</h1>
      <div className="grid lg:grid-cols-2 gap-8 mt-10">
        <div className="card p-8">
          <h3 className="font-serif text-2xl text-brown mb-4">Your details</h3>
          <p className="text-sm text-brown-light mb-4">These will auto-fill at checkout.</p>
          <label className="text-xs text-brown-muted uppercase tracking-widest">Email</label>
          <input className="field mt-1 bg-cream2" value={u.email} disabled/>
          <label className="text-xs text-brown-muted uppercase tracking-widest mt-4 block">Name</label>
          <input className="field mt-1" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} data-testid="acct-name"/>
          <label className="text-xs text-brown-muted uppercase tracking-widest mt-4 block">Phone</label>
          <input className="field mt-1" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} data-testid="acct-phone"/>
          <label className="text-xs text-brown-muted uppercase tracking-widest mt-4 block">Delivery address</label>
          <textarea rows={2} className="field mt-1" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} data-testid="acct-address"/>
          <label className="text-xs text-brown-muted uppercase tracking-widest mt-4 block">New password (leave blank to keep)</label>
          <input type="password" className="field mt-1" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
          <button className="btn-primary mt-6" onClick={save} data-testid="acct-save">Save changes</button>
        </div>
        <div>
          <h3 className="font-serif text-2xl text-brown mb-4">Your orders</h3>
          <div className="space-y-3">
            {orders.length === 0 && <div className="card p-6 text-brown-muted">No orders yet.</div>}
            {orders.map(o => (
              <div key={o.id} className="card p-5">
                <div className="flex justify-between">
                  <div>
                    <div className="text-xs text-brown-muted">{new Date(o.created_at).toLocaleString()}</div>
                    <div className="font-serif text-lg text-brown mt-1">{fmt(o.total)}</div>
                  </div>
                  <div className={"text-xs px-3 py-1 rounded-full h-fit " + (o.payment_status==="paid"?"bg-blush/30 text-brown":"bg-cream2 text-brown-muted")}>{o.status}</div>
                </div>
                <div className="text-sm text-brown-light mt-2">{o.items?.map(i=>`${i.name} × ${i.quantity}`).join(", ")}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
