import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api, clearCart } from "../lib";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sid = params.get("session_id");
  const [state, setState] = useState({ status: "checking", order: null });
  useEffect(() => {
    if (!sid) { setState({ status: "error", order: null }); return; }
    let tries = 0, iv;
    const poll = async () => {
      tries++;
      try {
        const { data } = await api.get(`/payments/status/${sid}`);
        if (data.payment_status === "paid") {
          clearCart();
          setState({ status: "paid", order: data });
          clearInterval(iv);
        } else if (tries >= 15) { setState({ status: "timeout", order: data }); clearInterval(iv); }
      } catch { if (tries >= 15) { setState({ status: "error", order: null }); clearInterval(iv); } }
    };
    poll(); iv = setInterval(poll, 2000);
    return () => clearInterval(iv);
  }, [sid]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-24 text-center">
      {state.status === "checking" && (<><Loader2 className="animate-spin mx-auto text-brown" size={48}/><h1 className="font-serif text-3xl text-brown mt-6">Confirming payment...</h1></>)}
      {state.status === "paid" && (<>
        <CheckCircle2 className="mx-auto text-blush-dark" size={64}/>
        <h1 className="font-serif text-4xl text-brown mt-6" data-testid="payment-success-heading">Order placed!</h1>
        <p className="text-brown-light mt-4">A confirmation is on its way to your inbox. We'll begin baking your order shortly.</p>
        <p className="text-sm text-brown-muted mt-2">Order ID: <code>{state.order?.order_id}</code></p>
        <Link to="/shop" className="btn-primary mt-8">Keep shopping</Link>
      </>)}
      {(state.status === "timeout" || state.status === "error") && (<>
        <h1 className="font-serif text-3xl text-brown">We're still confirming your payment...</h1>
        <p className="text-brown-light mt-4">Please check back in a moment or contact us if the issue persists.</p>
        <Link to="/" className="btn-primary mt-8">Back home</Link>
      </>)}
    </div>
  );
}
