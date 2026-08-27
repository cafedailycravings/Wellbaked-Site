import axios from "axios";
export const API = process.env.REACT_APP_BACKEND_URL + "/api";
export const LOGO = "https://customer-assets-eiarnc6j.emergentagent.net/job_rustic-craving/artifacts/dvhgjjo3_Logo.jpeg";
export const CURRENCY = "₹";
export const fmt = (n) => `${CURRENCY}${Number(n||0).toFixed(2)}`;

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
export const getCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } };
export const saveCart = (c) => { localStorage.setItem(CART_KEY, JSON.stringify(c)); window.dispatchEvent(new Event("cart-updated")); };
export const addToCart = (p, qty = 1) => {
  const cart = getCart();
  const i = cart.findIndex(x => x.product_id === p.id);
  if (i >= 0) cart[i].quantity += qty;
  else cart.push({ product_id: p.id, name: p.name, price: p.price, quantity: qty, image: p.image });
  saveCart(cart);
};
export const removeFromCart = (pid) => saveCart(getCart().filter(x => x.product_id !== pid));
export const updateQty = (pid, qty) => {
  const c = getCart().map(x => x.product_id === pid ? { ...x, quantity: Math.max(1, qty) } : x);
  saveCart(c);
};
export const clearCart = () => saveCart([]);
export const cartTotal = () => getCart().reduce((s, x) => s + x.price * x.quantity, 0);
