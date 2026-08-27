import React, { useState } from "react";
import { api, CONTACT, WA_LINK, IG_LINK, WA_QR, IG_QR } from "../lib";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Clock, Instagram, MessageCircle } from "lucide-react";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [mapsEmbed, setMapsEmbed] = useState("");
  React.useEffect(() => {
    api.get("/content/maps").then(r => {
      if (r.data.value?.embed_url) setMapsEmbed(r.data.value.embed_url);
    }).catch(()=>{});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post("/inquiries", form);
      toast.success("Thank you! We'll be in touch shortly.");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally { setSending(false); }
  };

  const mapsSrc = mapsEmbed || `https://www.google.com/maps?q=${encodeURIComponent(CONTACT.mapsQuery)}&output=embed`;

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="wheat-line mb-4 max-w-xs"><span>Say hello · 100% Eggless</span></div>
      <h1 className="font-serif text-5xl text-brown">Let's bake something together</h1>
      <p className="text-brown-light mt-4 max-w-2xl">Custom orders, corporate gifting, weddings, or just a hello — we read every message and reply within 24 hours.</p>

      {/* Quick actions */}
      <div className="mt-8 flex flex-wrap gap-3">
        <a href={WA_LINK} target="_blank" rel="noreferrer"
           className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#25D366] text-white font-medium shadow-medium hover:opacity-90 transition-opacity"
           data-testid="whatsapp-chat-btn">
          <MessageCircle size={18} className="fill-white"/> Chat on WhatsApp
        </a>
        <a href={IG_LINK} target="_blank" rel="noreferrer"
           className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-cream font-medium shadow-medium hover:opacity-90 transition-opacity"
           style={{ background: "linear-gradient(135deg, #833AB4 0%, #E1306C 50%, #FCAF45 100%)" }}
           data-testid="instagram-btn">
          <Instagram size={18}/> Follow @{CONTACT.instagramHandle}
        </a>
        {CONTACT.phones.map((p, i) => (
          <a key={i} href={`tel:${p.replace(/\s/g,'')}`} className="btn-ghost" data-testid={`call-${i}`}>
            <Phone size={14}/> {p}
          </a>
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-8 mt-12">
        {/* Contact form */}
        <form onSubmit={submit} className="lg:col-span-7 card p-8 space-y-4" data-testid="contact-form">
          <h3 className="font-serif text-2xl text-brown">Order inquiry / message</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <input required className="field" placeholder="Your name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} data-testid="contact-name"/>
            <input required type="email" className="field" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} data-testid="contact-email"/>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <input className="field" placeholder="Phone (optional)" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} data-testid="contact-phone"/>
            <input className="field" placeholder="Subject" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} data-testid="contact-subject"/>
          </div>
          <textarea required rows={6} className="field" placeholder="Tell us what you'd like to order or ask about..." value={form.message} onChange={e=>setForm({...form,message:e.target.value})} data-testid="contact-message"/>
          <p className="text-xs text-brown-muted">Submissions are sent to <strong>{CONTACT.email}</strong></p>
          <button className="btn-primary" disabled={sending} data-testid="contact-submit">{sending ? "Sending..." : "Send message"}</button>
        </form>

        {/* Info side */}
        <div className="lg:col-span-5 space-y-4">
          <div className="card p-5 flex items-start gap-4">
            <div className="p-3 bg-cream2 rounded-full"><Mail size={18} className="text-brown"/></div>
            <div>
              <div className="text-xs uppercase tracking-widest text-brown-muted">Email</div>
              <a href={`mailto:${CONTACT.email}`} className="font-serif text-lg text-brown mt-1 block break-all" data-testid="contact-info-email">{CONTACT.email}</a>
            </div>
          </div>
          <div className="card p-5 flex items-start gap-4">
            <div className="p-3 bg-cream2 rounded-full"><Phone size={18} className="text-brown"/></div>
            <div>
              <div className="text-xs uppercase tracking-widest text-brown-muted">Phone</div>
              {CONTACT.phones.map((p, i) => (
                <a key={i} href={`tel:${p.replace(/\s/g,'')}`} className="font-serif text-lg text-brown mt-1 block" data-testid={`contact-info-phone-${i}`}>{p}</a>
              ))}
            </div>
          </div>
          <div className="card p-5 flex items-start gap-4">
            <div className="p-3 bg-cream2 rounded-full"><MapPin size={18} className="text-brown"/></div>
            <div>
              <div className="text-xs uppercase tracking-widest text-brown-muted">Visit us</div>
              <div className="font-serif text-lg text-brown mt-1 leading-tight" data-testid="contact-info-address">
                {CONTACT.address.line1}<br/>{CONTACT.address.line2}<br/>{CONTACT.address.city}
              </div>
            </div>
          </div>
          <div className="card p-5 flex items-start gap-4">
            <div className="p-3 bg-cream2 rounded-full"><Clock size={18} className="text-brown"/></div>
            <div>
              <div className="text-xs uppercase tracking-widest text-brown-muted">Hours</div>
              <div className="font-serif text-lg text-brown mt-1" data-testid="contact-info-hours">{CONTACT.hours}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Google Maps */}
      <div className="mt-16">
        <div className="wheat-line mb-3 max-w-xs"><span>Find us</span></div>
        <h2 className="font-serif text-3xl text-brown mb-6">Come by for a fresh bake</h2>
        <div className="rounded-2xl overflow-hidden shadow-large card p-2">
          <iframe
            title="Rustic Bakes Zirakpur location"
            src={mapsSrc}
            width="100%" height="440"
            style={{ border: 0, borderRadius: "12px" }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            data-testid="google-maps"
          />
        </div>
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACT.mapsQuery)}`}
           target="_blank" rel="noreferrer" className="text-sm text-brown hover:text-brown-dark inline-flex items-center gap-1 mt-3">
          Open in Google Maps →
        </a>
      </div>

      {/* QR codes */}
      <div className="mt-16">
        <div className="wheat-line mb-3 max-w-xs"><span>Scan to connect</span></div>
        <h2 className="font-serif text-3xl text-brown mb-8">Follow along · order fast</h2>
        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl">
          <a href={WA_LINK} target="_blank" rel="noreferrer" className="card p-6 text-center hover:-translate-y-1 transition-transform" data-testid="whatsapp-qr-card">
            <img src={WA_QR} alt="WhatsApp QR" className="w-full max-w-[240px] mx-auto rounded-xl" data-testid="whatsapp-qr"/>
            <div className="mt-4 inline-flex items-center gap-2 text-brown font-serif text-xl"><MessageCircle size={20} className="text-[#25D366]"/> WhatsApp us</div>
            <div className="text-sm text-brown-light mt-1">Scan or tap · +91 82838 41930</div>
          </a>
          <a href={IG_LINK} target="_blank" rel="noreferrer" className="card p-6 text-center hover:-translate-y-1 transition-transform" data-testid="instagram-qr-card">
            <img src={IG_QR} alt="Instagram QR" className="w-full max-w-[240px] mx-auto rounded-xl" data-testid="instagram-qr"/>
            <div className="mt-4 inline-flex items-center gap-2 text-brown font-serif text-xl"><Instagram size={20} className="text-[#E1306C]"/> Instagram</div>
            <div className="text-sm text-brown-light mt-1">Scan or tap · @{CONTACT.instagramHandle}</div>
          </a>
        </div>
      </div>
    </div>
  );
}
