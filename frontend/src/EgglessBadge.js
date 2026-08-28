import React from "react";
import { Wheat } from "lucide-react";

export function EgglessBadge({ className = "", small = false }) {
  return (
    <div className={"inline-flex items-center gap-1 rounded-full bg-cream/95 backdrop-blur shadow-medium border border-blush-dark/25 " +
                    (small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]") + " " + className}
         style={{ animation: "eggless-float 3.6s ease-in-out infinite" }}
         data-testid="eggless-badge">
      <Wheat size={small ? 10 : 12} className="text-blush-dark"/>
      <span className="font-semibold tracking-widest uppercase text-brown">100% Eggless</span>
      <style>{`@keyframes eggless-float {
        0%,100% { transform: translateY(0); }
        50%     { transform: translateY(-1.5px); }
      }`}</style>
    </div>
  );
}
