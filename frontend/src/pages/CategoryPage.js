import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, addToCart, fmt } from "../lib";
import { toast } from "sonner";
import { iconFor } from "../categoryIcons";
import { SameDayBadge } from "../SameDayBadge";
import { EgglessBadge } from "../EgglessBadge";
import { ArrowLeft } from "lucide-react";

export default function CategoryPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  useEffect(() => { api.get(`/categories/${slug}`).then(r => setData(r.data)).catch(()=>setData(false)); }, [slug]);
  if (data === false) return <div className="max-w-4xl mx-auto py-24 px-6 text-center text-brown"><h1 className="font-serif text-3xl">Category not found</h1><Link to="/shop" className="btn-primary mt-6">All bakes</Link></div>;
  if (!data) return <div className="py-24 text-center text-brown-muted">Loading...</div>;

  const { category: c, products } = data;
  const { Icon, tint } = iconFor(c.slug);

  return (
    <div>
      <section className="relative overflow-hidden grain bg-cream2">
        <div className="max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <Link to="/shop" className="inline-flex items-center gap-2 text-brown-light hover:text-brown text-sm mb-6"><ArrowLeft size={16}/> All bakes</Link>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full bg-cream flex items-center justify-center shadow-medium">
                <Icon size={26} style={{ color: tint }}/>
              </div>
              <div className="wheat-line max-w-xs"><span>100% Eggless · Premium</span></div>
            </div>
            <h1 className="font-serif text-5xl lg:text-6xl text-brown leading-tight">{c.name}</h1>
            <p className="mt-5 text-brown-light text-lg leading-relaxed max-w-xl">{c.description}</p>
            {c.story && <p className="mt-4 text-brown-light leading-relaxed max-w-xl">{c.story}</p>}
            <div className="mt-8 flex items-center gap-6 text-sm">
              <div><div className="font-serif text-3xl text-brown">{products.length}</div><div className="text-xs uppercase tracking-widest text-brown-muted">Bakes in this range</div></div>
            </div>
          </div>
          <div className="lg:col-span-6">
            <img src={c.image} alt={c.name} className="w-full h-[500px] object-cover rounded-3xl shadow-large"/>
          </div>
        </div>
      </section>

      {/* Lookbook grid — mixed sizes */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="wheat-line mb-4 max-w-xs"><span>Lookbook</span></div>
        <h2 className="font-serif text-3xl text-brown mb-8">Every bake in this collection</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
          {products.map((p, i) => (
            <div key={p.id} className={"card relative " + (i === 0 ? "sm:col-span-2 lg:col-span-1 lg:row-span-2" : "")}
                 data-testid={`cat-product-${p.slug}`}>
              {p.category === "instant-delivery" ? (
                <>
                  <div className="absolute top-4 left-4 z-10"><SameDayBadge/></div>
                  <div className="absolute top-14 left-4 z-10"><EgglessBadge/></div>
                </>
              ) : (
                <div className="absolute top-4 left-4 z-10"><EgglessBadge/></div>
              )}
              <Link to={`/product/${p.slug}`} className={"block overflow-hidden " + (i === 0 ? "h-96" : "h-56")}>
                <img src={p.image} alt={p.name} className="w-full h-full object-cover"/>
              </Link>
              <div className="p-6">
                <Link to={`/product/${p.slug}`} className="font-serif text-2xl text-brown block">{p.name}</Link>
                <p className="text-brown-light text-sm mt-2 line-clamp-2">{p.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="font-serif text-2xl text-brown">{fmt(p.price)}</div>
                  <button className="btn-primary text-sm" onClick={() => { addToCart(p); toast.success(`${p.name} added`); }}>Add to cart</button>
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && <div className="col-span-full text-center text-brown-muted py-16">Nothing here yet. Check back soon.</div>}
        </div>
      </section>
    </div>
  );
}
