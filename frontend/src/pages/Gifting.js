import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fmt } from "../lib";
import { toast } from "sonner";
import { Gift, Heart, Briefcase, Cake as CakeIcon, PartyPopper, ArrowRight, Sparkles } from "lucide-react";

const OCCASIONS = [
  { id: "birthday", label: "Birthdays", icon: PartyPopper, tint: "#E8B4B8",
    story: "Candles, laughter, and something sweet." },
  { id: "wedding", label: "Weddings", icon: Heart, tint: "#D89DA3",
    story: "Two families, one delicious moment." },
  { id: "corporate", label: "Corporate", icon: Briefcase, tint: "#7A5A4A",
    story: "Say thank-you to a whole office." },
  { id: "festivals", label: "Festivals", icon: Sparkles, tint: "#D4AF37",
    story: "Diwali, Rakhi, Christmas — we've got the sweet part covered." },
  { id: "just-because", label: "Just Because", icon: CakeIcon, tint: "#B85450",
    story: "The best kind of gift — no occasion needed." },
];

export default function Gifting() {
  const [featured, setFeatured] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "Gifting inquiry", message: "" });
  const [occasion, setOccasion] = useState("birthday");
  const [sending, setSending] = useState(false);

  useEffect(() => { api.get("/products?featured=true").then(r => setFeatured(r.data.slice(0, 6))); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post("/inquiries", { ...form, subject: `${form.subject} · ${occasion}` });
      toast.success("Thank you! We'll be in touch within 4 hours.");
      setForm({ name: "", email: "", phone: "", subject: "Gifting inquiry", message: "" });
    } catch { toast.error("Something went wrong."); }
    finally { setSending(false); }
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden grain bg-cream2">
        <div className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <div className="wheat-line mb-4 max-w-xs"><span>Gifting</span></div>
            <h1 className="font-serif text-5xl lg:text-6xl text-brown leading-tight">
              Gifts that arrive<br/>
              <em className="font-script text-blush-dark not-italic">warm, wrapped, and unforgettable.</em>
            </h1>
            <p className="mt-5 text-brown-light text-lg leading-relaxed max-w-xl">
              From bespoke 100% eggless cakes to premium corporate hampers, we bake, pack, and hand-deliver every gift with a handwritten note.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#request" className="btn-primary" data-testid="gifting-cta">Plan a gift <ArrowRight size={18}/></a>
              <Link to="/customize" className="btn-ghost">Customise a cake</Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm">
              <div><div className="font-serif text-3xl text-brown">4h</div><div className="text-xs uppercase tracking-widest text-brown-muted">Reply time</div></div>
              <div><div className="font-serif text-3xl text-brown">50+</div><div className="text-xs uppercase tracking-widest text-brown-muted">Corporate clients</div></div>
              <div><div className="font-serif text-3xl text-brown">100%</div><div className="text-xs uppercase tracking-widest text-brown-muted">Hand-delivered</div></div>
            </div>
          </div>
          <div className="lg:col-span-6">
            <img src="https://images.unsplash.com/photo-1486427944299-d1955d23e34d?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
                 alt="Gift box" className="w-full h-[540px] object-cover rounded-3xl shadow-large"/>
          </div>
        </div>
      </section>

      {/* Occasions */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="wheat-line mb-4 max-w-xs"><span>Every occasion</span></div>
        <h2 className="font-serif text-4xl text-brown">What are we celebrating?</h2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-5 gap-4 stagger">
          {OCCASIONS.map(o => {
            const active = occasion === o.id;
            const Icon = o.icon;
            return (
              <button key={o.id} onClick={() => setOccasion(o.id)} data-testid={`occ-${o.id}`}
                className={"card p-6 text-left transition-transform " + (active ? "ring-2 ring-brown -translate-y-1" : "hover:-translate-y-1")}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                     style={{ backgroundColor: o.tint + "33" }}>
                  <Icon size={22} style={{ color: o.tint }}/>
                </div>
                <div className="font-serif text-xl text-brown">{o.label}</div>
                <div className="text-xs text-brown-light mt-1">{o.story}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Featured hampers */}
      <section className="bg-cream2 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <div className="wheat-line mb-3 max-w-xs"><span>Ready-to-gift</span></div>
              <h2 className="font-serif text-4xl text-brown">Signature gift boxes</h2>
            </div>
            <Link to="/shop" className="btn-ghost">Browse all bakes <ArrowRight size={14}/></Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
            {featured.map(p => (
              <Link key={p.id} to={`/product/${p.slug}`} className="card block group" data-testid={`gift-featured-${p.slug}`}>
                <div className="h-56 overflow-hidden">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover"/>
                </div>
                <div className="p-5">
                  <div className="text-[11px] uppercase tracking-widest text-brown-muted mb-1">{p.category?.replace(/-/g," ")}</div>
                  <div className="font-serif text-xl text-brown">{p.name}</div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="font-serif text-xl text-brown">{fmt(p.price)}</div>
                    <div className="text-xs uppercase tracking-widest text-blush-dark">Gift this →</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="wheat-line mb-4 max-w-xs"><span>How it works</span></div>
        <h2 className="font-serif text-4xl text-brown mb-10">Three steps to a smile</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[["01","Tell us","Pick an occasion, budget, and delivery date. We reply within 4 hours."],
            ["02","We bake","Small-batch, always fresh, always packed with love and a handwritten note."],
            ["03","Delivered warm","We hand-deliver in Delhi NCR, Bangalore, and Mumbai. Nation-wide couriers on request."]].map(([n,t,d])=>(
            <div key={n} className="card p-8">
              <div className="font-serif text-5xl text-blush-dark">{n}</div>
              <h3 className="font-serif text-xl text-brown mt-4">{t}</h3>
              <p className="text-brown-light text-sm mt-2">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Request form */}
      <section id="request" className="max-w-3xl mx-auto px-6 py-16 scroll-mt-24">
        <div className="wheat-line mb-3 max-w-xs"><span>Get a quote</span></div>
        <h2 className="font-serif text-4xl text-brown">Plan your perfect gift</h2>
        <p className="text-brown-light mt-3">Tell us a little about the moment and we'll come back with 2-3 curated options within 4 hours.</p>
        <form onSubmit={submit} className="mt-8 card p-8 space-y-4" data-testid="gifting-form">
          <div className="text-xs uppercase tracking-widest text-brown-muted">Occasion</div>
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.map(o => (
              <button key={o.id} type="button" onClick={()=>setOccasion(o.id)}
                className={"px-4 py-2 rounded-full text-sm border " + (occasion === o.id ? "bg-brown text-cream border-brown" : "border-brown/20 text-brown")}>
                {o.label}
              </button>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4 pt-2">
            <input required className="field" placeholder="Your name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} data-testid="gift-name"/>
            <input required type="email" className="field" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} data-testid="gift-email"/>
          </div>
          <input className="field" placeholder="Phone (optional)" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} data-testid="gift-phone"/>
          <textarea required rows={5} className="field" placeholder="Tell us about the gift — recipient, budget, delivery date, dietary needs..." value={form.message} onChange={e=>setForm({...form,message:e.target.value})} data-testid="gift-message"/>
          <button className="btn-primary w-full justify-center" disabled={sending} data-testid="gift-submit">
            <Gift size={18}/> {sending ? "Sending..." : "Send gifting request"}
          </button>
        </form>
      </section>
    </div>
  );
}
