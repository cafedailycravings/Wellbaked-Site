import React, { useEffect, useState } from "react";
import { api } from "../lib";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

export default function Contact() {
  const [contact, setContact] = useState({});
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  useEffect(() => { api.get("/content/contact").then(r => setContact(r.data.value || {})); }, []);

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

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="wheat-line mb-4 max-w-xs"><span>Say hello</span></div>
      <h1 className="font-serif text-5xl text-brown">Let's bake something together</h1>
      <p className="text-brown-light mt-4 max-w-2xl">Custom orders, corporate gifting, weddings, or just a hello — we read every message and reply within 24 hours.</p>

      <div className="grid lg:grid-cols-12 gap-12 mt-12">
        <form onSubmit={submit} className="lg:col-span-7 card p-8 space-y-4" data-testid="contact-form">
          <div className="grid md:grid-cols-2 gap-4">
            <input required className="field" placeholder="Your name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} data-testid="contact-name"/>
            <input required type="email" className="field" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} data-testid="contact-email"/>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <input className="field" placeholder="Phone (optional)" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} data-testid="contact-phone"/>
            <input className="field" placeholder="Subject" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} data-testid="contact-subject"/>
          </div>
          <textarea required rows={6} className="field" placeholder="Tell us what you'd like to order or ask about..." value={form.message} onChange={e=>setForm({...form,message:e.target.value})} data-testid="contact-message"/>
          <button className="btn-primary" disabled={sending} data-testid="contact-submit">{sending ? "Sending..." : "Send message"}</button>
        </form>

        <div className="lg:col-span-5 space-y-4">
          {[[Mail,"Email",contact.email||"orders@cafedailycravings.com"],
            [Phone,"Phone",contact.phone||"+1 (555) 234-5678"],
            [MapPin,"Visit",contact.address||"12 Miller's Lane, Willow Creek"],
            [Clock,"Hours",contact.hours||"Tue - Sun · 7am to 6pm"]].map(([Icon,t,v],i)=>(
            <div key={i} className="card p-5 flex items-start gap-4">
              <div className="p-3 bg-cream2 rounded-full"><Icon size={18} className="text-brown"/></div>
              <div>
                <div className="text-xs uppercase tracking-widest text-brown-muted">{t}</div>
                <div className="font-serif text-lg text-brown mt-1" data-testid={`contact-info-${t.toLowerCase()}`}>{v}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
