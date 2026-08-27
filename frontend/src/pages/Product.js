import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, addToCart, fmt, getUser } from "../lib";
import { toast } from "sonner";
import { ArrowLeft, Clock, Minus, Plus, Star, ImagePlus } from "lucide-react";

function StarRow({ value = 5, size = 16, onSet }) {
  return (
    <div className="inline-flex gap-1">
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={size}
          onClick={onSet ? () => onSet(n) : undefined}
          className={(onSet ? "cursor-pointer " : "") + (n <= value ? "fill-gold text-gold" : "text-brown-muted")}/>
      ))}
    </div>
  );
}

export default function Product() {
  const { slug } = useParams();
  const [p, setP] = useState(null);
  const [qty, setQty] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [user, setLocalUser] = useState(getUser());
  const [form, setForm] = useState({ rating: 5, title: "", body: "", image_url: "" });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadReviews = () => api.get(`/products/${slug}/reviews`).then(r => setReviews(r.data));

  useEffect(() => {
    api.get(`/products/${slug}`).then(r => setP(r.data)).catch(()=>setP(false));
    loadReviews();
  }, [slug]); // eslint-disable-line

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data: sig } = await api.get("/admin/cloudinary/signature").catch(()=>({data:null}));
      if (!sig) { toast.error("Photo uploads coming soon — post your review without a photo for now."); setUploading(false); return; }
      const fd = new FormData();
      fd.append("file", file); fd.append("api_key", sig.api_key);
      fd.append("timestamp", sig.timestamp); fd.append("signature", sig.signature);
      fd.append("folder", sig.folder);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`, { method: "POST", body: fd });
      const up = await res.json();
      if (up.secure_url) { setForm({...form, image_url: up.secure_url}); toast.success("Photo attached"); }
      else toast.error("Upload failed");
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/products/${slug}/reviews`, { product_slug: slug, ...form });
      toast.success("Thanks for sharing!");
      setForm({ rating: 5, title: "", body: "", image_url: "" });
      loadReviews();
    } catch(err) { toast.error(err.response?.data?.detail || "Failed to post"); }
    finally { setSubmitting(false); }
  };

  if (p === false) return <div className="max-w-4xl mx-auto py-24 px-6 text-center text-brown"><h1 className="font-serif text-3xl">Not found</h1><Link to="/shop" className="btn-primary mt-6">Back to shop</Link></div>;
  if (!p) return <div className="py-24 text-center text-brown-muted">Loading...</div>;

  const avg = reviews.length ? (reviews.reduce((s,r)=>s+r.rating,0) / reviews.length) : 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <Link to="/shop" className="text-brown-light hover:text-brown text-sm inline-flex items-center gap-2 mb-6"><ArrowLeft size={16}/> Back to shop</Link>
      <div className="grid lg:grid-cols-2 gap-12 items-start">
        <img src={p.image} alt={p.name} className="w-full h-[520px] object-cover rounded-3xl shadow-large" data-testid="product-image"/>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-brown-muted">{p.category?.replace(/-/g," ")}</div>
          <h1 className="font-serif text-5xl text-brown mt-2" data-testid="product-name">{p.name}</h1>
          {reviews.length > 0 && (
            <div className="mt-3 flex items-center gap-3"><StarRow value={Math.round(avg)}/>
              <span className="text-sm text-brown-light">{avg.toFixed(1)} · {reviews.length} review{reviews.length!==1?"s":""}</span></div>
          )}
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

      {/* Reviews section */}
      <section className="mt-24 border-t border-brown/10 pt-12">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="wheat-line mb-3 max-w-xs"><span>Customer love</span></div>
            <h2 className="font-serif text-3xl text-brown">What buyers are saying</h2>
          </div>
          {reviews.length > 0 && <div className="text-brown-light text-sm">{avg.toFixed(1)} average from {reviews.length} review{reviews.length!==1?"s":""}</div>}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {reviews.map(r => (
            <div key={r.id} className="card p-6" data-testid={`review-${r.id}`}>
              <div className="flex items-start justify-between">
                <div>
                  <StarRow value={r.rating}/>
                  {r.title && <div className="font-serif text-xl text-brown mt-2">{r.title}</div>}
                </div>
                <div className="text-xs text-brown-muted">{new Date(r.created_at).toLocaleDateString()}</div>
              </div>
              <p className="text-brown-light mt-3 leading-relaxed">{r.body}</p>
              {r.image_url && <img src={r.image_url} alt="review" className="w-full h-48 object-cover rounded-xl mt-4"/>}
              <div className="text-sm text-brown mt-4 font-medium">— {r.user_name}</div>
            </div>
          ))}
          {reviews.length === 0 && <div className="md:col-span-2 text-center text-brown-muted py-8">Be the first to review this bake.</div>}
        </div>

        {/* Review form */}
        <div className="mt-12 card p-8 max-w-2xl">
          <h3 className="font-serif text-2xl text-brown">Share your experience</h3>
          {!user ? (
            <div className="mt-4 text-brown-light">
              <Link to={`/login?redirect=/product/${slug}`} className="btn-primary" data-testid="review-login-btn">Sign in to leave a review</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-4 space-y-4" data-testid="review-form">
              <div className="flex items-center gap-3">
                <span className="text-sm text-brown">Your rating:</span>
                <StarRow value={form.rating} size={22} onSet={n=>setForm({...form,rating:n})}/>
              </div>
              <input className="field" placeholder="Title (optional)" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} data-testid="review-title"/>
              <textarea required rows={4} className="field" placeholder="How was your bake?" value={form.body} onChange={e=>setForm({...form,body:e.target.value})} data-testid="review-body"/>
              <div className="flex items-center gap-3 flex-wrap">
                <label className={"btn-ghost cursor-pointer " + (uploading ? "opacity-50 pointer-events-none" : "")}>
                  <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} data-testid="review-photo-input"/>
                  <ImagePlus size={16}/> {uploading ? "Uploading..." : (form.image_url ? "Change photo" : "Add a photo")}
                </label>
                {form.image_url && <img src={form.image_url} alt="preview" className="w-16 h-16 rounded-lg object-cover"/>}
                <button className="btn-primary ml-auto" disabled={submitting} data-testid="review-submit">{submitting ? "Posting..." : "Post review"}</button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
