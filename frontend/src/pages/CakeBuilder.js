import React, { useState, useEffect } from "react";
import { api, getUser, fmt } from "../lib";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";

const FLAVOURS = [
  { name: "Vanilla Bean", color: "#F5E6D3" },
  { name: "Chocolate Truffle", color: "#4A2C20" },
  { name: "Red Velvet", color: "#B85450" },
  { name: "Pistachio Rose", color: "#B7C9A5" },
  { name: "Salted Caramel", color: "#D4A574" },
  { name: "Lemon Blueberry", color: "#E8E4B0" },
];
const SIZES = [
  { name: "500g (4-6 people)", value: "500g", price: 900 },
  { name: "1kg (8-10 people)", value: "1kg", price: 1600 },
  { name: "1.5kg (12-15 people)", value: "1.5kg", price: 2200 },
  { name: "2kg (18-22 people)", value: "2kg", price: 2900 },
];
const COLOURS = [
  { name: "Blush Pink", hex: "#E8B4B8" },
  { name: "Rustic Brown", hex: "#4A3022" },
  { name: "Warm Cream", hex: "#F9F6F0" },
  { name: "Deep Chocolate", hex: "#2C1810" },
  { name: "Gold Accent", hex: "#D4AF37" },
  { name: "Sage Green", hex: "#B7C9A5" },
];

export default function CakeBuilder() {
  const nav = useNavigate();
  const [user] = useState(getUser());
  const [step, setStep] = useState(1);
  const [flavour, setFlavour] = useState(FLAVOURS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [colour, setColour] = useState(COLOURS[0]);
  const [layers, setLayers] = useState(2);
  const [messageOnCake, setMessageOnCake] = useState("");
  const [customer, setCustomer] = useState({ customer_name: "", customer_email: "", customer_phone: "", needed_by: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      api.get("/auth/me").then(r => {
        setCustomer(c => ({ ...c, customer_name: r.data.name || "", customer_email: r.data.email || "", customer_phone: r.data.phone || "" }));
      }).catch(()=>{});
    }
  }, [user]);

  const price = Math.round(size.price + (layers - 1) * 250 + (flavour.name === "Pistachio Rose" ? 200 : 0));

  const submit = async () => {
    if (!customer.customer_name || !customer.customer_email) { toast.error("Please add your name and email"); return; }
    setSubmitting(true);
    try {
      await api.post("/custom-cake", {
        flavour: flavour.name, size: size.value, colour: colour.name,
        layers, message_on_cake: messageOnCake,
        estimated_price: price, ...customer,
      });
      toast.success("Request sent! We'll be in touch within 4 hours.");
      nav("/");
    } catch { toast.error("Failed to send request"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="wheat-line mb-3 max-w-xs"><span>Cake Builder</span></div>
      <h1 className="font-serif text-5xl text-brown flex items-center gap-3">Design your dream cake <Sparkles className="text-gold" size={28}/></h1>
          <p className="text-brown-light mt-3 max-w-2xl">Pick every detail — from flavour to the message on top. Every cake is 100% eggless and baked fresh with 48-hour notice.</p>

      <div className="grid lg:grid-cols-12 gap-10 mt-10">
        {/* Live preview */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 self-start">
          <div className="card p-8 relative overflow-hidden" style={{ backgroundColor: colour.hex }}>
            <div className="text-center relative" data-testid="cake-preview">
              {/* Stacked layers */}
              <div className="mx-auto" style={{ width: "220px" }}>
                {Array.from({ length: layers }).map((_, i) => {
                  const w = 220 - i * 30;
                  const h = 45;
                  return (
                    <div key={i} className="mx-auto rounded-lg shadow-medium relative"
                      style={{
                        width: `${w}px`, height: `${h}px`,
                        backgroundColor: flavour.color,
                        marginBottom: "4px",
                        borderTop: `3px solid ${colour.hex}88`,
                      }}>
                      {/* Drip effect on top layer */}
                      {i === 0 && (
                        <div className="absolute -bottom-2 left-0 right-0 flex justify-around pointer-events-none">
                          {Array.from({ length: 6 }).map((_, j) => (
                            <div key={j} style={{ width: "6px", height: `${8 + (j%3)*3}px`, backgroundColor: colour.hex, borderRadius: "0 0 6px 6px" }}/>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {messageOnCake && (
                <div className="mt-6 font-script text-2xl px-4" style={{ color: colour.hex === "#F9F6F0" ? "#4A3022" : "#F9F6F0" }}>
                  "{messageOnCake}"
                </div>
              )}
            </div>
            <div className="mt-8 pt-6 border-t border-white/20 text-center" style={{ color: colour.hex === "#F9F6F0" ? "#4A3022" : "#F9F6F0" }}>
              <div className="text-xs uppercase tracking-widest opacity-70">Your custom cake</div>
              <div className="font-serif text-2xl mt-1">{flavour.name} · {size.value} · {layers} layer{layers>1?"s":""}</div>
              <div className="font-serif text-4xl mt-3">₹{price}</div>
              <div className="text-xs opacity-70 mt-1">Estimate · final quote confirmed by our baker</div>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="lg:col-span-7 space-y-6">
          {/* Flavour */}
          <div className="card p-6">
            <div className="text-xs uppercase tracking-widest text-brown-muted mb-3">Step 1 · Flavour</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {FLAVOURS.map(f => (
                <button key={f.name} onClick={() => setFlavour(f)} data-testid={`flavour-${f.name.replace(/ /g,'-').toLowerCase()}`}
                  className={"p-4 rounded-xl border-2 text-left transition-colors " + (flavour.name === f.name ? "border-brown bg-brown/5" : "border-brown/10 hover:border-brown/30")}>
                  <div className="w-8 h-8 rounded-full mb-2" style={{ backgroundColor: f.color, boxShadow: "inset 0 0 0 1px rgba(74,48,34,.15)" }}/>
                  <div className="font-serif text-brown">{f.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div className="card p-6">
            <div className="text-xs uppercase tracking-widest text-brown-muted mb-3">Step 2 · Size</div>
            <div className="grid sm:grid-cols-2 gap-3">
              {SIZES.map(s => (
                <button key={s.value} onClick={() => setSize(s)} data-testid={`size-${s.value}`}
                  className={"p-4 rounded-xl border-2 text-left transition-colors " + (size.value === s.value ? "border-brown bg-brown/5" : "border-brown/10 hover:border-brown/30")}>
                  <div className="font-serif text-lg text-brown">{s.value}</div>
                  <div className="text-xs text-brown-light">{s.name.split(" (")[1]?.replace(")","")}</div>
                  <div className="text-sm text-brown-muted mt-1">from {fmt(s.price)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Layers */}
          <div className="card p-6">
            <div className="text-xs uppercase tracking-widest text-brown-muted mb-3">Step 3 · Layers ({layers})</div>
            <input type="range" min={1} max={5} value={layers} onChange={e=>setLayers(parseInt(e.target.value))}
              className="w-full accent-brown" data-testid="layers-slider"/>
            <div className="flex justify-between text-xs text-brown-muted mt-1"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
          </div>

          {/* Colour */}
          <div className="card p-6">
            <div className="text-xs uppercase tracking-widest text-brown-muted mb-3">Step 4 · Frosting colour</div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {COLOURS.map(c => (
                <button key={c.name} onClick={() => setColour(c)} title={c.name} data-testid={`colour-${c.name.replace(/ /g,'-').toLowerCase()}`}
                  className={"aspect-square rounded-xl border-2 relative " + (colour.name === c.name ? "border-brown scale-110" : "border-brown/10 hover:border-brown/30")}
                  style={{ backgroundColor: c.hex, transition: "transform .2s ease-out" }}>
                  <span className="sr-only">{c.name}</span>
                </button>
              ))}
            </div>
            <div className="text-xs text-brown-light mt-2 text-center">{colour.name}</div>
          </div>

          {/* Message */}
          <div className="card p-6">
            <div className="text-xs uppercase tracking-widest text-brown-muted mb-3">Step 5 · Message on cake</div>
            <input className="field" placeholder="e.g. Happy Birthday, Meera!" maxLength={40} value={messageOnCake} onChange={e=>setMessageOnCake(e.target.value)} data-testid="cake-message"/>
            <div className="text-xs text-brown-muted mt-1">Optional · up to 40 characters</div>
          </div>

          {/* Contact + submit */}
          <div className="card p-6">
            <div className="text-xs uppercase tracking-widest text-brown-muted mb-3">Step 6 · Your details</div>
            <div className="grid md:grid-cols-2 gap-3">
              <input className="field" placeholder="Your name" value={customer.customer_name} onChange={e=>setCustomer({...customer, customer_name: e.target.value})} data-testid="cust-name"/>
              <input className="field" type="email" placeholder="Email" value={customer.customer_email} onChange={e=>setCustomer({...customer, customer_email: e.target.value})} data-testid="cust-email"/>
              <input className="field" placeholder="Phone" value={customer.customer_phone} onChange={e=>setCustomer({...customer, customer_phone: e.target.value})}/>
              <input className="field" type="date" placeholder="Needed by" value={customer.needed_by} onChange={e=>setCustomer({...customer, needed_by: e.target.value})}/>
            </div>
            <textarea rows={2} className="field mt-3" placeholder="Any extra requests? (allergies, decorations, delivery time)" value={customer.notes} onChange={e=>setCustomer({...customer, notes: e.target.value})}/>
            <button className="btn-primary mt-4 w-full justify-center" disabled={submitting} onClick={submit} data-testid="submit-cake-btn">
              {submitting ? "Sending..." : `Send request · Est. ${fmt(price)}`} <ArrowRight size={18}/>
            </button>
            <p className="text-xs text-brown-muted mt-2 text-center">Not a payment yet. We'll confirm the final quote & delivery within 4 hours.</p>
          </div>

          {!user && <div className="text-sm text-brown-light">
            <Link to="/login?redirect=/customize" className="underline">Sign in</Link> to save your details for next time.
          </div>}
        </div>
      </div>
    </div>
  );
}
