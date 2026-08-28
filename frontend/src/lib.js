import axios from "axios";
const backendUrl = process.env.REACT_APP_BACKEND_URL || (typeof window !== "undefined" ? window.location.origin : "");
export const API = `${backendUrl.replace(/\/$/, "")}/api`;
export const LOGO = "https://customer-assets-jai6qajn.emergentagent.net/wingman/70dcfcf6-1bde-41dd-b282-3d91c3c762ac/attachments/76ccfecc4afd4543b38c6d7279c66a8a_Logo.jpeg";
export const CURRENCY = "₹";
export const fmt = (n) => `${CURRENCY}${Number(n||0).toFixed(2)}`;

// Contact info
export const CONTACT = {
  phones: ["+91 82838 41930", "+91 82849 90433"],
  phoneRaw: ["918283841930", "918284990433"],
  whatsapp: "918283841930",
  email: "cafedailycravings@gmail.com",
  instagramHandle: "cafedailycravings",
  address: {
    line1: "SCO 89B, Upper Ground, SBP City of Dreams",
    line2: "Opposite Trishla City, High Ground Road",
    city: "Zirakpur - 140603, Punjab",
  },
  hours: "11:00 AM - 2:00 AM · All days",
  mapsQuery: "SCO 89B SBP City of Dreams Zirakpur Punjab 140603",
};
export const WA_LINK = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent("Hi Rustic Bakes! I'd like to place an order — could you help me?")}`;
export const IG_LINK = `https://instagram.com/${CONTACT.instagramHandle}`;
export const WA_QR = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&color=4A3022&bgcolor=F9F6F0&data=${encodeURIComponent(WA_LINK)}`;
export const IG_QR = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&color=4A3022&bgcolor=F9F6F0&data=${encodeURIComponent(IG_LINK)}`;

export const api = axios.create({ baseURL: API });
api.interceptors.request.use((c) => {
  const t = localStorage.getItem("rb_token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

export const getUser = () => { try { return JSON.parse(localStorage.getItem("rb_user")); } catch { return null; } };
export const setUser = (u) => { localStorage.setItem("rb_user", JSON.stringify(u)); window.dispatchEvent(new Event("auth-updated")); };
export const logout = () => { localStorage.removeItem("rb_token"); localStorage.removeItem("rb_user"); window.dispatchEvent(new Event("auth-updated")); };

// --- Cart utilities (localStorage) ---
const CART_KEY = "rb_cart_v1";
export const getCart = () => {
  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(cart) ? cart : [];
  } catch { return []; }
};
export const saveCart = (c) => { localStorage.setItem(CART_KEY, JSON.stringify(c)); window.dispatchEvent(new Event("cart-updated")); };
export const addToCart = (p, qty = 1) => {
  const amount = Number(qty);
  if (!p?.id || !Number.isFinite(amount) || amount <= 0) return;
  const cart = getCart();
  const i = cart.findIndex(x => x.product_id === p.id);
  if (i >= 0) cart[i].quantity = Math.max(1, Number(cart[i].quantity) || 0) + amount;
  else cart.push({ product_id: p.id, name: p.name, price: Number(p.price) || 0, quantity: amount, image: p.image });
  saveCart(cart);
};
export const removeFromCart = (pid) => saveCart(getCart().filter(x => x.product_id !== pid));
export const updateQty = (pid, qty) => {
  const amount = Number(qty);
  if (!Number.isFinite(amount)) return;
  const c = getCart().map(x => x.product_id === pid ? { ...x, quantity: Math.max(1, amount) } : x);
  saveCart(c);
};
export const clearCart = () => saveCart([]);
export const cartTotal = () => getCart().reduce((s, x) => {
  const price = Number(x.price);
  const quantity = Number(x.quantity);
  return s + (Number.isFinite(price) && Number.isFinite(quantity) ? price * quantity : 0);
}, 0);
