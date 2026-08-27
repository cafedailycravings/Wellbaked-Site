import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getUser, setUser, fmt } from "../lib";
import { toast } from "sonner";
import { Award, Cookie, Heart, Trash2, Gift, Copy, Share2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function Account() {
  const nav = useNavigate();
  const [u, setU] = useState(getUser());
  const [form, setForm] = useState({ name: "", phone: "", address: "", password: "" });
  const [orders, setOrders] = useState([]);
  const [loyalty, setLoyalty] = useState({ punches: 0, available_rewards: 0, goal: 10 });
  const [wishlist, setWishlist] = useState([]);
  const [refer, setRefer] = useState({ referral_code: "", completed: 0, goal: 3, share_message: "" });
  useEffect(() => {
    if (!u) { nav("/login?redirect=/account"); return; }
    api.get("/auth/me").then(r => { setU(r.data); setForm({name:r.data.name||"", phone:r.data.phone||"", address:r.data.address||"", password:""}); });
    api.get("/auth/orders").then(r => setOrders(r.data)).catch(()=>{});
    api.get("/loyalty").then(r => setLoyalty(r.data)).catch(()=>{});
    api.get("/wishlist").then(r => setWishlist(r.data)).catch(()=>{});
    api.get("/referrals").then(r => setRefer(r.data)).catch(()=>{});
  }, [nav]); // eslint-disable-line

  const shareLink = () => `${window.location.origin}/login?ref=${refer.referral_code}`;
  const copyLink = () => { navigator.clipboard.writeText(shareLink()); toast.success("Referral link copied"); };
  const shareNative = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Rustic Bakes by Daily Cravings", text: refer.share_message, url: shareLink() }); }
      catch {}
    } else { copyLink(); }
  };

  const removeFromWishlist = async (pid) => {
    await api.post(`/wishlist/${pid}`);
    setWishlist(wishlist.filter(p => p.id !== pid));
    window.dispatchEvent(new Event("wishlist-updated"));
  };

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
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="wheat-line mb-4 max-w-xs"><span>My account</span></div>
      <h1 className="font-serif text-4xl text-brown">Hello, {u.name || "friend"}</h1>

      {/* Loyalty card */}
      <div className="mt-8 card p-8 relative overflow-hidden" data-testid="loyalty-card"
           style={{ background: "linear-gradient(135deg, #4A3022 0%, #362217 100%)" }}>
        <div className="grain absolute inset-0 opacity-20"/>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-blush text-xs uppercase tracking-[0.25em]"><Award size={14}/> Rustic Rewards</div>
            <h2 className="font-serif text-3xl text-cream mt-2">Your baker's punch-card</h2>
            <p className="text-cream/70 text-sm mt-2 max-w-md">Buy {loyalty.goal} bakes and get one absolutely on the house. You're {loyalty.goal - loyalty.punches} bake{loyalty.goal - loyalty.punches !== 1 ? "s" : ""} away.</p>
            {loyalty.available_rewards > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 bg-gold text-brown-dark px-4 py-2 rounded-full text-sm font-semibold" data-testid="loyalty-reward">
                <Award size={16}/> {loyalty.available_rewards} free bake{loyalty.available_rewards !== 1 ? "s" : ""} unlocked — mention this at checkout
              </div>
            )}
          </div>
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: loyalty.goal }).map((_, i) => (
              <div key={i} className={"w-10 h-10 rounded-full flex items-center justify-center border-2 " + (i < loyalty.punches ? "bg-blush border-blush text-brown-dark" : "border-cream/30 text-cream/30")}>
                <Cookie size={16}/>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Referral card */}
      <div className="mt-6 card p-8 border-2 border-gold/40" data-testid="referral-card"
           style={{ background: "linear-gradient(135deg, #F9F6F0 0%, #F3EFE6 100%)" }}>
        <div className="flex flex-wrap justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-blush-dark text-xs uppercase tracking-[0.25em]"><Gift size={14}/> Invite friends</div>
            <h3 className="font-serif text-2xl text-brown mt-2">Share the goodness, earn free bakes</h3>
            <p className="text-brown-light text-sm mt-2 max-w-md">Invite {refer.goal} friends and get one free bake on us. You're at <strong>{refer.completed}/{refer.goal}</strong>.</p>
            <div className="mt-4 inline-flex items-center gap-2 bg-cream border border-brown/15 rounded-full px-4 py-2">
              <span className="text-xs uppercase tracking-widest text-brown-muted">Your code</span>
              <span className="font-serif text-lg text-brown tracking-wider" data-testid="ref-code">{refer.referral_code}</span>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-3">
            <div className="flex gap-2">
              {Array.from({length: refer.goal}).map((_,i)=>(
                <div key={i} className={"w-10 h-10 rounded-full flex items-center justify-center border-2 " + (i < refer.completed ? "bg-gold border-gold text-brown-dark" : "border-brown/20 text-brown-muted")}>
                  <Heart size={16}/>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={copyLink} className="btn-ghost text-sm" data-testid="ref-copy"><Copy size={14}/> Copy link</button>
              <button onClick={shareNative} className="btn-primary text-sm" data-testid="ref-share"><Share2 size={14}/> Share</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mt-8">
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

      {/* Wishlist */}
      <div className="mt-16">
        <div className="flex items-center gap-3 mb-4">
          <Heart size={20} className="text-blush-dark"/>
          <h3 className="font-serif text-2xl text-brown">Your wishlist</h3>
          <span className="text-xs text-brown-muted">{wishlist.length} saved</span>
        </div>
        {wishlist.length === 0 ? (
          <div className="card p-8 text-center text-brown-muted">Nothing saved yet. Tap the heart on any bake to save it here.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="wishlist-grid">
            {wishlist.map(p => (
              <div key={p.id} className="card p-4 flex gap-4 items-center" data-testid={`wl-item-${p.id}`}>
                <img src={p.image} alt={p.name} className="w-20 h-20 rounded-lg object-cover"/>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${p.slug}`} className="font-serif text-brown block truncate">{p.name}</Link>
                  <div className="text-sm text-brown-light">{fmt(p.price)}</div>
                </div>
                <button onClick={()=>removeFromWishlist(p.id)} className="p-2 text-brown-muted hover:text-blush-dark"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
