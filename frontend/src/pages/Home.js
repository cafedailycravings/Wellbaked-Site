import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, addToCart, LOGO, fmt } from "../lib";
import { toast } from "sonner";
import { ArrowRight, Wheat, Heart, Clock, Award } from "lucide-react";

export default function Home() {
  const [hero, setHero] = useState({});
  const [about, setAbout] = useState({});
  const [featured, setFeatured] = useState([]);
  const [cats, setCats] = useState([]);
  useEffect(() => {
    api.get("/content/hero").then(r => setHero(r.data.value || {}));
    api.get("/content/about").then(r => setAbout(r.data.value || {}));
    api.get("/products?featured=true").then(r => setFeatured(r.data));
    api.get("/categories").then(r => setCats(r.data));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden grain">
        <div className="max-w-7xl mx-auto px-6 pt-14 pb-20 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 relative z-10 animate-fade-up">
            <div className="wheat-line mb-6"><Wheat size={14}/> Homemade Goodness</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[1.05] text-brown">
              {(hero.title || "Baked with Love,\nEvery Single Morning").split("\n").map((s,i)=>(<span key={i} className="block">{i===1 && <em className="font-script text-blush-dark not-italic">{s}</em>}{i!==1 && s}</span>))}
            </h1>
            <p className="mt-6 text-brown-light text-lg max-w-xl leading-relaxed">
              {hero.subtitle || "Small-batch artisan bakes crafted from heirloom flours, real butter, and slow time."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-primary" data-testid="hero-cta-shop">
                {hero.cta || "Shop Fresh Today"} <ArrowRight size={18}/>
              </Link>
              <Link to="/about" className="btn-ghost" data-testid="hero-cta-story">Our Story</Link>
            </div>
            <div className="mt-12 grid grid-cols-3 gap-6 max-w-md">
              {[["10+","Years baking"],["48h","Slow fermented"],["100%","Small batch"]].map(([n,l])=>(
                <div key={n}><div className="font-serif text-3xl text-brown">{n}</div><div className="text-xs uppercase tracking-widest text-brown-muted">{l}</div></div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-6 relative">
            <div className="relative">
              <img src={hero.image || "https://images.unsplash.com/photo-1632692166489-fd6568dee2e1?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600"}
                alt="Bakery" className="rounded-3xl w-full h-[500px] lg:h-[620px] object-cover shadow-large" />
              <img src={LOGO} alt="Rustic Bakes seal" className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full shadow-large bg-cream ring-4 ring-cream" />
              <div className="absolute -top-4 right-6 bg-cream rounded-full px-5 py-3 shadow-medium">
                <div className="flex items-center gap-2 text-brown text-sm"><Heart size={16} className="text-blush-dark fill-blush-dark"/> Baked with love</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value strip */}
      <section className="bg-cream2 border-y border-brown/10">
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-brown">
          {[[Wheat,"Heirloom flours"],[Clock,"48-hour ferment"],[Heart,"Family recipes"],[Award,"Zero shortcuts"]].map(([Icon,t],i)=>(
            <div key={i} className="flex items-center gap-3"><Icon size={20} className="text-blush-dark"/><span className="text-sm font-medium">{t}</span></div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="wheat-line mb-3 max-w-xs"><span>The Menu</span></div>
            <h2 className="font-serif text-4xl text-brown">Handcrafted daily</h2>
          </div>
          <Link to="/shop" className="text-brown hover:text-brown-dark text-sm font-medium hidden md:flex items-center gap-1" data-testid="cats-see-all">See all <ArrowRight size={16}/></Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 stagger">
          {cats.map(c => (
            <Link key={c.id} to={`/shop?cat=${c.slug}`} data-testid={`category-${c.slug}`} className="group relative overflow-hidden rounded-2xl h-64 block shadow-soft">
              <img src={c.image} alt={c.name} className="w-full h-full object-cover" style={{transition:"transform .6s ease-out"}} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.05)'} onMouseLeave={e=>e.currentTarget.style.transform=''}/>
              <div className="absolute inset-0 bg-gradient-to-t from-brown/85 via-brown/20 to-transparent"/>
              <div className="absolute bottom-0 left-0 p-6 text-cream">
                <div className="font-serif text-2xl">{c.name}</div>
                <div className="text-xs mt-1 text-cream/70">{c.description}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="bg-cream2 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="wheat-line mb-3 max-w-xs"><span>Fresh Today</span></div>
              <h2 className="font-serif text-4xl text-brown">Just out of the oven</h2>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 stagger">
            {featured.map(p => (
              <div key={p.id} className="card group" data-testid={`featured-product-${p.slug}`}>
                <Link to={`/product/${p.slug}`} className="block h-56 overflow-hidden">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" style={{transition:"transform .5s ease-out"}} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.06)'} onMouseLeave={e=>e.currentTarget.style.transform=''}/>
                </Link>
                <div className="p-5">
                  <div className="text-[11px] uppercase tracking-widest text-brown-muted mb-1">{p.category}</div>
                  <Link to={`/product/${p.slug}`} className="font-serif text-xl text-brown block leading-tight">{p.name}</Link>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="font-serif text-xl text-brown">{fmt(p.price)}</div>
                    <button onClick={() => { addToCart(p); toast.success(`${p.name} added to cart`); }}
                      className="text-xs uppercase tracking-widest text-brown hover:text-blush-dark" data-testid={`add-to-cart-${p.slug}`}>Add +</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About teaser */}
      <section className="max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-5">
          <img src={about.image || "https://images.unsplash.com/photo-1536782896453-61d09f3aaf3e?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"} alt="About" className="rounded-3xl w-full h-[520px] object-cover shadow-large"/>
        </div>
        <div className="lg:col-span-7 lg:pl-8">
          <div className="wheat-line mb-4 max-w-xs"><span>Our Story</span></div>
          <h2 className="font-serif text-4xl text-brown leading-tight">{about.heading || "A small bakery with a big heart."}</h2>
          <p className="mt-6 text-brown-light text-lg leading-relaxed">{about.body}</p>
          <Link to="/about" className="btn-primary mt-8">Read our story <ArrowRight size={18}/></Link>
        </div>
      </section>
    </div>
  );
}
