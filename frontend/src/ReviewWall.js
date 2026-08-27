import React, { useEffect, useState } from "react";
import { api } from "./lib";
import { Star, Quote } from "lucide-react";

export function ReviewWall() {
  const [reviews, setReviews] = useState([]);
  useEffect(() => { api.get("/reviews/featured").then(r => setReviews(r.data)); }, []);
  if (reviews.length === 0) return null;
  // duplicate list for infinite scroll effect
  const wall = [...reviews, ...reviews];
  return (
    <section className="py-24 overflow-hidden bg-cream border-y border-brown/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <div className="wheat-line mb-3 max-w-xs"><span>Customer love</span></div>
            <h2 className="font-serif text-4xl text-brown">Baked and loved</h2>
          </div>
          <div className="text-sm text-brown-light">Real words from real customers</div>
        </div>
      </div>
      <div className="relative">
        <div className="flex gap-6 animate-marquee whitespace-nowrap px-6">
          {wall.map((r, i) => (
            <div key={i} className="inline-block whitespace-normal card p-6 w-80 shrink-0" data-testid={`review-wall-${i}`}>
              <Quote size={18} className="text-blush-dark mb-3"/>
              <div className="inline-flex gap-0.5 mb-2">{[1,2,3,4,5].map(n=><Star key={n} size={14} className={n<=r.rating?"fill-gold text-gold":"text-brown-muted"}/>)}</div>
              {r.title && <div className="font-serif text-lg text-brown">{r.title}</div>}
              <p className="text-brown-light text-sm mt-2 line-clamp-4">{r.body}</p>
              <div className="text-xs text-brown mt-4 font-medium">— {r.user_name} · <span className="text-brown-muted">{r.product_name}</span></div>
            </div>
          ))}
        </div>
        <style>{`
          @keyframes marquee {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
          .animate-marquee { animation: marquee 40s linear infinite; }
          .animate-marquee:hover { animation-play-state: paused; }
        `}</style>
      </div>
    </section>
  );
}
