import React, { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { api, getUser } from "./lib";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// simple in-memory + storage cache of wishlist ids
const WL_KEY = "rb_wishlist_ids";
export const getWishlistIds = () => { try { return JSON.parse(localStorage.getItem(WL_KEY)) || []; } catch { return []; } };
export const setWishlistIds = (ids) => { localStorage.setItem(WL_KEY, JSON.stringify(ids)); window.dispatchEvent(new Event("wishlist-updated")); };

export async function refreshWishlist() {
  if (!getUser()) { setWishlistIds([]); return []; }
  try {
    const { data } = await api.get("/wishlist");
    const ids = data.map(p => p.id);
    setWishlistIds(ids);
    return ids;
  } catch { return []; }
}

export function WishlistHeart({ productId, size = 20, className = "" }) {
  const [ids, setIds] = useState(getWishlistIds());
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  useEffect(() => {
    const upd = () => setIds(getWishlistIds());
    window.addEventListener("wishlist-updated", upd);
    return () => window.removeEventListener("wishlist-updated", upd);
  }, []);
  const active = ids.includes(productId);
  const toggle = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!getUser()) { nav("/login?redirect=" + window.location.pathname); return; }
    setBusy(true);
    try {
      const { data } = await api.post(`/wishlist/${productId}`);
      setWishlistIds(data.wishlist);
      toast.success(data.action === "added" ? "Saved to wishlist" : "Removed from wishlist");
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };
  return (
    <button onClick={toggle} disabled={busy} className={"p-2 rounded-full bg-cream/90 backdrop-blur shadow-medium " + className}
      aria-label={active ? "Remove from wishlist" : "Save to wishlist"}
      data-testid={`wishlist-${productId}`}>
      <Heart size={size} className={active ? "fill-blush-dark text-blush-dark" : "text-brown"}/>
    </button>
  );
}
