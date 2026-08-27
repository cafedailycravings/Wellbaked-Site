import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api, addToCart, fmt } from "../lib";
import { toast } from "sonner";
import { iconFor } from "../categoryIcons";
import { SameDayBadge } from "../SameDayBadge";
import { WishlistHeart } from "../Wishlist";

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const cat = params.get("cat") || "";
  useEffect(() => {
    const url = cat ? `/products?category=${cat}` : "/products";
    api.get(url).then(r => setProducts(r.data));
    api.get("/categories").then(r => setCats(r.data));
  }, [cat]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="wheat-line mb-3 max-w-xs"><span>Fresh Menu</span></div>
      <h1 className="font-serif text-5xl text-brown">Everything we bake</h1>
      <p className="text-brown-light mt-3 max-w-2xl">Slow-fermented breads, hand-decorated cakes, and everything sweet in between. Made in small batches, sold while it's warm.</p>

      <div className="mt-10 flex flex-wrap gap-2">
        <button onClick={() => setParams({})} data-testid="filter-all"
          className={"inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm border transition-colors " + (!cat ? "bg-brown text-cream border-brown" : "border-brown/20 text-brown hover:bg-brown/5")}>
          <span>All</span>
        </button>
        {cats.map(c => {
          const { Icon, tint } = iconFor(c.slug);
          const active = cat === c.slug;
          return (
            <button key={c.id} onClick={() => setParams({ cat: c.slug })} data-testid={`filter-${c.slug}`}
              className={"inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm border transition-colors " + (active ? "bg-brown text-cream border-brown" : "border-brown/20 text-brown hover:bg-brown/5")}>
              <Icon size={15} style={{ color: active ? "#F9F6F0" : tint }}/>
              <span>{c.name}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
        {products.map(p => (
          <div key={p.id} className="card relative" data-testid={`shop-product-${p.slug}`}>
            {p.category === "instant-delivery" && (
              <div className="absolute top-4 left-4 z-10"><SameDayBadge/></div>
            )}
            <div className="absolute top-4 right-4 z-10"><WishlistHeart productId={p.id}/></div>
            <Link to={`/product/${p.slug}`} className="block h-64 overflow-hidden">
              <img src={p.image} alt={p.name} className="w-full h-full object-cover"/>
            </Link>
            <div className="p-6">
              <div className="text-[11px] uppercase tracking-widest text-brown-muted mb-1">{p.category?.replace(/-/g," ")}</div>
              <Link to={`/product/${p.slug}`} className="font-serif text-2xl text-brown block">{p.name}</Link>
              <p className="text-brown-light text-sm mt-2 line-clamp-2">{p.description}</p>
              <div className="mt-5 flex items-center justify-between">
                <div className="font-serif text-2xl text-brown">{fmt(p.price)}</div>
                <button className="btn-primary text-sm" onClick={() => { addToCart(p); toast.success(`${p.name} added`); }} data-testid={`shop-add-${p.slug}`}>Add to cart</button>
              </div>
              {p.stock <= 3 && p.stock > 0 && <div className="mt-3 text-xs text-blush-dark">Only {p.stock} left today</div>}
              {p.stock === 0 && <div className="mt-3 text-xs text-brown-muted">Sold out — back tomorrow</div>}
            </div>
          </div>
        ))}
        {products.length === 0 && <div className="col-span-full text-center py-20 text-brown-muted">No bakes here yet — check back soon.</div>}
      </div>
    </div>
  );
}
