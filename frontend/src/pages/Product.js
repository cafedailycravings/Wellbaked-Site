import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, addToCart, fmt } from "../lib";
import { toast } from "sonner";
import { ArrowLeft, Clock, Minus, Plus } from "lucide-react";

export default function Product() {
  const { slug } = useParams();
  const [p, setP] = useState(null);
  const [qty, setQty] = useState(1);
  useEffect(() => { api.get(`/products/${slug}`).then(r => setP(r.data)).catch(()=>setP(false)); }, [slug]);
  if (p === false) return <div className="max-w-4xl mx-auto py-24 px-6 text-center text-brown"><h1 className="font-serif text-3xl">Not found</h1><Link to="/shop" className="btn-primary mt-6">Back to shop</Link></div>;
  if (!p) return <div className="py-24 text-center text-brown-muted">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <Link to="/shop" className="text-brown-light hover:text-brown text-sm inline-flex items-center gap-2 mb-6"><ArrowLeft size={16}/> Back to shop</Link>
      <div className="grid lg:grid-cols-2 gap-12 items-start">
        <img src={p.image} alt={p.name} className="w-full h-[520px] object-cover rounded-3xl shadow-large" data-testid="product-image"/>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-brown-muted">{p.category}</div>
          <h1 className="font-serif text-5xl text-brown mt-2" data-testid="product-name">{p.name}</h1>
          <div className="font-serif text-3xl text-brown mt-4" data-testid="product-price">{fmt(p.price)}</div>
          <p className="mt-6 text-brown-light leading-relaxed">{p.description}</p>
          <div className="mt-6 flex items-center gap-4 text-sm text-brown-light"><Clock size={16}/> Lead time: {p.lead_time_hours}h · Ready for pickup or delivery</div>
          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center border border-brown/20 rounded-full">
              <button onClick={() => setQty(Math.max(1, qty-1))} className="p-3" data-testid="qty-dec"><Minus size={14}/></button>
              <span className="w-10 text-center" data-testid="qty-val">{qty}</span>
              <button onClick={() => setQty(qty+1)} className="p-3" data-testid="qty-inc"><Plus size={14}/></button>
            </div>
            <button className="btn-primary" onClick={() => { addToCart(p, qty); toast.success(`${qty} × ${p.name} added`); }} data-testid="add-to-cart-btn" disabled={p.stock===0}>
              {p.stock === 0 ? "Sold out" : "Add to cart"}
            </button>
          </div>
          {p.stock > 0 && p.stock <= 5 && <div className="mt-4 text-sm text-blush-dark">Only {p.stock} left today.</div>}
        </div>
      </div>
    </div>
  );
}
