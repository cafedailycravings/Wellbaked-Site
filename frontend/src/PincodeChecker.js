import React, { useState } from "react";
import { api } from "./lib";
import { MapPin, CheckCircle2, XCircle } from "lucide-react";

export function PincodeChecker({ onServable }) {
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const check = async () => {
    if (!/^\d{6}$/.test(pincode)) return;
    setChecking(true);
    try {
      const { data } = await api.get(`/delivery/check/${pincode}`);
      setResult(data);
      if (onServable) onServable(data);
    } catch { setResult({ servable: false, message: "Could not check right now" }); }
    finally { setChecking(false); }
  };
  return (
    <div className="card p-5" data-testid="pincode-checker">
      <div className="flex items-center gap-2 text-brown mb-2"><MapPin size={16}/> <span className="text-sm font-medium">Check delivery for your area</span></div>
      <div className="flex gap-2 mt-2">
        <input inputMode="numeric" maxLength={6} pattern="\d{6}" className="field text-base" placeholder="6-digit pincode"
               value={pincode} onChange={e=>setPincode(e.target.value.replace(/\D/g,""))} data-testid="pincode-input"/>
        <button className="btn-primary" disabled={pincode.length!==6 || checking} onClick={check} data-testid="pincode-check-btn">
          {checking ? "..." : "Check"}
        </button>
      </div>
      {result && (
        result.servable ? (
          <div className="mt-3 p-3 rounded-lg bg-blush/15 flex items-start gap-2" data-testid="pincode-servable">
            <CheckCircle2 size={18} className="text-blush-dark mt-0.5"/>
            <div>
              <div className="text-brown font-medium text-sm">We deliver to {result.area}</div>
              <div className="text-brown-light text-xs mt-1">{result.delivery_window} · Delivery fee ₹{result.fee}</div>
            </div>
          </div>
        ) : (
          <div className="mt-3 p-3 rounded-lg bg-brown/5 flex items-start gap-2" data-testid="pincode-unservable">
            <XCircle size={18} className="text-brown-light mt-0.5"/>
            <div className="text-sm text-brown-light">{result.message}</div>
          </div>
        )
      )}
    </div>
  );
}
