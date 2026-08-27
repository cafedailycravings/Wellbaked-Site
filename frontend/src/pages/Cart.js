import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCart, updateQty, removeFromCart, cartTotal, clearCart, fmt } from "../lib";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";

export default function Cart() {
  const [cart, setCart] = useState([]);
  const nav = useNavigate();
  const refresh = () => setCart(getCart());
  useEffect(() => { refresh(); window.addEventListener("cart-updated", refresh); return () => window.removeEventListener("cart-updated", refresh); }, []);

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <ShoppingBag className="mx-auto text-brown-muted" size={48}/>
        <h1 className="font-serif text-4xl text-brown mt-6">Your basket is empty</h1>
        <p className="text-brown-light mt-3">Pick out something fresh from today's bakes.</p>
        <Link to="/shop" className="btn-primary mt-8" data-testid="cart-empty-cta">Browse the shop</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl text-brown">Your basket</h1>
      <div className="grid lg:grid-cols-12 gap-8 mt-10">
        <div className="lg:col-span-8 space-y-4">
          {cart.map(it => (
            <div key={it.product_id} className="card p-4 flex gap-4 items-center" data-testid={`cart-item-${it.product_id}`}>
              <img src={it.image} alt={it.name} className="w-24 h-24 rounded-xl object-cover"/>
              <div className="flex-1">
                <div className="font-serif text-lg text-brown">{it.name}</div>
                <div className="text-brown-light text-sm mt-1">{fmt(it.price)} each</div>
              </div>
              <div className="flex items-center border border-brown/20 rounded-full">
                <button onClick={() => updateQty(it.product_id, it.quantity-1)} className="p-2" data-testid={`cart-dec-${it.product_id}`}><Minus size={14}/></button>
                <span className="w-8 text-center">{it.quantity}</span>
                <button onClick={() => updateQty(it.product_id, it.quantity+1)} className="p-2" data-testid={`cart-inc-${it.product_id}`}><Plus size={14}/></button>
              </div>
              <div className="w-24 text-right font-serif text-lg text-brown">{fmt(it.price*it.quantity)}</div>
              <button onClick={() => removeFromCart(it.product_id)} className="p-2 text-brown-muted hover:text-blush-dark" data-testid={`cart-remove-${it.product_id}`}><Trash2 size={16}/></button>
            </div>
          ))}
          <button onClick={clearCart} className="text-sm text-brown-muted hover:text-brown">Clear basket</button>
        </div>
        <div className="lg:col-span-4">
          <div className="card p-6 sticky top-24">
            <h3 className="font-serif text-xl text-brown">Summary</h3>
            <div className="mt-4 flex justify-between text-brown-light"><span>Subtotal</span><span>{fmt(cartTotal())}</span></div>
            <div className="mt-2 flex justify-between text-brown-light text-sm"><span>Delivery</span><span>Calculated at pickup</span></div>
            <div className="mt-4 pt-4 border-t border-brown/10 flex justify-between font-serif text-xl text-brown"><span>Total</span><span data-testid="cart-total">{fmt(cartTotal())}</span></div>
            <button className="btn-primary w-full mt-6 justify-center" onClick={() => nav("/checkout")} data-testid="cart-checkout-btn">Continue to checkout</button>
            <Link to="/shop" className="block text-center text-sm text-brown-light mt-4 hover:text-brown">Keep shopping</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
