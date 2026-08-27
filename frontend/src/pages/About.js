import React, { useEffect, useState } from "react";
import { api, LOGO } from "../lib";
import { Heart, Wheat, Clock, Sparkles } from "lucide-react";

export default function About() {
  const [about, setAbout] = useState({});
  useEffect(() => { api.get("/content/about").then(r => setAbout(r.data.value || {})); }, []);
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="wheat-line mb-4 max-w-xs"><span>Our Story</span></div>
      <h1 className="font-serif text-5xl sm:text-6xl text-brown leading-tight">{about.heading || "A small bakery with a big heart."}</h1>
      <div className="grid lg:grid-cols-12 gap-12 mt-12 items-start">
        <div className="lg:col-span-7 space-y-6 text-brown-light text-lg leading-relaxed">
          <p>{about.body}</p>
          <p>We started in a home kitchen, with one mother's sourdough starter passed down from her mother. Every loaf we bake today still uses that same living culture — a small, stubborn reminder that some things are worth keeping slow.</p>
          <p>Our team is small. Our ovens are hot by 4am. And every cake, cookie, and croissant that leaves our counter has been touched by hands that care.</p>
        </div>
        <div className="lg:col-span-5">
          <img src={about.image || "https://images.unsplash.com/photo-1536782896453-61d09f3aaf3e?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"} alt="Bakery" className="rounded-3xl w-full h-[520px] object-cover shadow-large"/>
        </div>
      </div>

      <div className="mt-24 grid md:grid-cols-4 gap-6">
        {[[Wheat,"Heirloom flours","Sourced from small mills we know by name."],
          [Clock,"Slow ferment","48+ hours of patience in every loaf."],
          [Heart,"Small batch","Nothing mass-made. Nothing rushed."],
          [Sparkles,"Real ingredients","Butter, eggs, sugar. Never a shortcut."]].map(([Icon,t,d],i)=>(
          <div key={i} className="card p-6">
            <Icon className="text-blush-dark" size={22}/>
            <h3 className="font-serif text-xl text-brown mt-4">{t}</h3>
            <p className="text-sm text-brown-light mt-2">{d}</p>
          </div>
        ))}
      </div>

      <div className="mt-24 text-center">
        <img src={LOGO} alt="Rustic Bakes seal" className="w-32 h-32 rounded-full mx-auto shadow-medium bg-cream"/>
        <div className="font-script text-3xl text-blush-dark mt-6">Baked with love.</div>
      </div>
    </div>
  );
}
