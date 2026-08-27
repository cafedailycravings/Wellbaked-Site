import React from "react";
import { Zap } from "lucide-react";

export function SameDayBadge({ className = "" }) {
  return (
    <div className={"inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold text-brown-dark text-[11px] uppercase tracking-widest font-semibold shadow-medium " + className}
         style={{ animation: "pulse-gold 2.4s ease-in-out infinite" }}>
      <Zap size={12} className="fill-brown-dark"/> Ready in 1 hour
      <style>{`@keyframes pulse-gold {
        0%,100% { box-shadow: 0 4px 16px rgba(212,175,55,.35); transform: translateY(0); }
        50%     { box-shadow: 0 6px 24px rgba(212,175,55,.65); transform: translateY(-1px); }
      }`}</style>
    </div>
  );
}
