import React, { useEffect, useState } from "react";
import { api, LOGO, IG_LINK, CONTACT } from "../lib";
import { Heart, Wheat, Clock, Sparkles, Instagram, ArrowRight } from "lucide-react";

// Instagram reel embed - works with any reel URL of form https://www.instagram.com/reel/{CODE}/
function ReelEmbed({ url }) {
  const clean = url.replace(/\?.*$/, "").replace(/\/$/, "");
  return (
    <div className="rounded-2xl overflow-hidden shadow-medium bg-cream2 aspect-[9/16] max-h-[560px]">
      <iframe
        src={`${clean}/embed`}
        title="Instagram reel"
        className="w-full h-full"
        frameBorder="0"
        scrolling="no"
        allowFullScreen
        allow="encrypted-media"
      />
    </div>
  );
}

export default function About() {
  const [about, setAbout] = useState({});
  const [reels, setReels] = useState([]);
  useEffect(() => {
    api.get("/content/about").then(r => setAbout(r.data.value || {})).catch(() => {});
    api.get("/content/reels").then(r => {
      if (r.data.value?.urls) setReels(r.data.value.urls.filter(Boolean).slice(0, 3));
    }).catch(()=>{});
  }, []);
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="wheat-line mb-4 max-w-xs"><span>Our Story · 100% Eggless</span></div>
      <h1 className="font-serif text-5xl sm:text-6xl text-brown leading-tight">{about.heading || "A small bakery with a big heart."}</h1>
      <div className="grid lg:grid-cols-12 gap-12 mt-12 items-start">
        <div className="lg:col-span-7 space-y-6 text-brown-light text-lg leading-relaxed">
          <p>{about.body}</p>
          <p>Our team is small. Our ovens are hot by 4am. And every cake, cookie, and pastry that leaves our counter has been touched by hands that care — and is 100% eggless, always.</p>
        </div>
        <div className="lg:col-span-5">
          <img src={about.image || "https://images.unsplash.com/photo-1536782896453-61d09f3aaf3e?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"} alt="Bakery" className="rounded-3xl w-full h-[520px] object-cover shadow-large"/>
        </div>
      </div>

      <div className="mt-24 grid md:grid-cols-4 gap-6">
        {[[Wheat,"Heirloom flours","Sourced from small mills we know by name."],
          [Clock,"Slow ferment","48+ hours of patience in every bake."],
          [Heart,"100% Eggless","Every cake, cookie and loaf — no exceptions."],
          [Sparkles,"Premium ingredients","Real butter, single-origin chocolate, always."]].map(([Icon,t,d],i)=>(
          <div key={i} className="card p-6">
            <Icon className="text-blush-dark" size={22}/>
            <h3 className="font-serif text-xl text-brown mt-4">{t}</h3>
            <p className="text-sm text-brown-light mt-2">{d}</p>
          </div>
        ))}
      </div>

      {/* Instagram Reels */}
      {reels.length > 0 && (
        <section className="mt-24" data-testid="about-reels">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <div className="wheat-line mb-3 max-w-xs"><span>Behind the scenes</span></div>
              <h2 className="font-serif text-4xl text-brown flex items-center gap-3">
                <Instagram size={28} className="text-blush-dark"/> Straight from the oven
              </h2>
            </div>
            <a href={IG_LINK} target="_blank" rel="noreferrer" className="btn-ghost text-sm">
              Follow @{CONTACT.instagramHandle} <ArrowRight size={14}/>
            </a>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {reels.map((url, i) => (
              <div key={i} data-testid={`reel-${i}`}><ReelEmbed url={url}/></div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-24 text-center">
        <img src={LOGO} alt="Rustic Bakes seal" className="w-32 h-32 rounded-full mx-auto shadow-medium bg-cream"/>
        <div className="font-script text-3xl text-blush-dark mt-6">Baked with love.</div>
      </div>
    </div>
  );
}
