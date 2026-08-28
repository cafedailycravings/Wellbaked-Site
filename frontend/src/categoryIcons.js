import { Cake, Cookie, IceCream, Coffee, Briefcase, Cherry, Sparkles, Zap, PartyPopper, Flame, Heart } from "lucide-react";

// map category slug → icon + tint (based on brand palette)
export const CATEGORY_META = {
  "all-cakes":         { Icon: Cake,         tint: "#E8B4B8" },
  "bento-cakes":       { Icon: Heart,        tint: "#D89DA3" },
  "cheese-cake":       { Icon: PartyPopper,  tint: "#D4AF37" },
  "cheese-cake-slice": { Icon: Cherry,       tint: "#B85450" },
  "corporate-offer":   { Icon: Briefcase,    tint: "#7A5A4A" },
  "cup-cakes":         { Icon: IceCream,     tint: "#E8B4B8" },
  "customize-cake":    { Icon: Sparkles,     tint: "#D4AF37" },
  "donuts":            { Icon: Cookie,       tint: "#C77B58" },
  "dry-cakes":         { Icon: Coffee,       tint: "#7A5A4A" },
  "instant-delivery":  { Icon: Zap,          tint: "#D4AF37" },
  "premium-cakes":     { Icon: Flame,        tint: "#B85450" },
};

export const iconFor = (slug) => CATEGORY_META[slug] || { Icon: Cake, tint: "#7A5A4A" };
