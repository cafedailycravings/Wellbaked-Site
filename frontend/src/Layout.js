import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, Menu, X, Mail, MapPin, Clock, Phone, User, LogIn } from "lucide-react";
import { LOGO, getCart, api, getUser, logout as doLogout } from "./lib";

export function Nav() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [user, setLocalUser] = useState(getUser());
  const loc = useLocation();
  useEffect(() => {
    const upd = () => setCount(getCart().reduce((s, x) => s + x.quantity, 0));
    const authUpd = () => setLocalUser(getUser());
    upd();
    window.addEventListener("cart-updated", upd);
    window.addEventListener("auth-updated", authUpd);
    return () => { window.removeEventListener("cart-updated", upd); window.removeEventListener("auth-updated", authUpd); };
  }, []);
  useEffect(() => setOpen(false), [loc.pathname]);

  const links = [
    { to: "/", label: "Home" },
    { to: "/shop", label: "Shop" },
    { to: "/about", label: "Our Story" },
    { to: "/contact", label: "Contact" },
  ];

  const isCustomer = user && user.role === "customer";

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-cream/80 border-b border-brown/10">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" data-testid="nav-home-link">
          <img src={LOGO} alt="Rustic Bakes" className="w-12 h-12 rounded-full object-cover ring-1 ring-brown/10" />
          <div className="hidden sm:block leading-tight">
            <div className="font-serif text-lg text-brown">Rustic Bakes</div>
            <div className="font-script text-blush-dark text-sm -mt-1">by Daily Cravings</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <Link key={l.to} to={l.to} data-testid={`nav-${l.label.toLowerCase().replace(/ /g,'-')}`}
              className={"text-sm tracking-wide " + (loc.pathname === l.to ? "text-brown font-semibold" : "text-brown-light hover:text-brown")}>{l.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {isCustomer ? (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/account" className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-brown/5 text-brown text-sm" data-testid="nav-account">
                <User size={16}/> {user.name?.split(" ")[0] || "Account"}
              </Link>
              <button onClick={() => { doLogout(); window.location.href="/"; }} className="text-xs text-brown-muted hover:text-brown">Sign out</button>
            </div>
          ) : (
            <Link to="/login" className="hidden md:inline-flex items-center gap-2 text-sm text-brown hover:text-brown-dark px-3 py-2" data-testid="nav-login">
              <LogIn size={16}/> Sign in
            </Link>
          )}
          <Link to="/cart" data-testid="nav-cart-link" className="relative p-2 rounded-full hover:bg-brown/5">
            <ShoppingBag size={20} className="text-brown" />
            {count > 0 && <span className="absolute -top-0.5 -right-0.5 bg-blush text-brown text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{count}</span>}
          </Link>
          <button className="md:hidden p-2" onClick={() => setOpen(!open)} data-testid="nav-menu-toggle">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-brown/10 bg-cream px-6 py-4 flex flex-col gap-3">
          {links.map(l => <Link key={l.to} to={l.to} className="text-brown py-2">{l.label}</Link>)}
          {isCustomer ? (
            <>
              <Link to="/account" className="text-brown py-2 flex items-center gap-2"><User size={16}/> Account</Link>
              <button onClick={() => { doLogout(); window.location.href="/"; }} className="text-brown-muted text-left py-2">Sign out</button>
            </>
          ) : (
            <Link to="/login" className="text-brown py-2 flex items-center gap-2"><LogIn size={16}/> Sign in</Link>
          )}
        </div>
      )}
    </header>
  );
}

export function Footer() {
  const [contact, setContact] = useState({});
  useEffect(() => { api.get("/content/contact").then(r => setContact(r.data.value || {})).catch(()=>{}); }, []);
  return (
    <footer className="mt-24 bg-brown text-cream">
      <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <img src={LOGO} alt="Rustic Bakes" className="w-12 h-12 rounded-full ring-1 ring-cream/30 bg-cream" />
            <div>
              <div className="font-serif text-xl">Rustic Bakes</div>
              <div className="font-script text-blush text-sm">by Daily Cravings</div>
            </div>
          </div>
          <p className="text-cream/70 text-sm leading-relaxed">Small-batch artisan bakery. Homemade goodness. Baked with love, every single morning.</p>
        </div>
        <div>
          <h4 className="text-xs tracking-[0.25em] text-blush mb-4">Shop</h4>
          <ul className="space-y-2 text-sm text-cream/80">
            <li><Link to="/shop?cat=breads">Artisan Breads</Link></li>
            <li><Link to="/shop?cat=cakes">Signature Cakes</Link></li>
            <li><Link to="/shop?cat=pastries">Fresh Pastries</Link></li>
            <li><Link to="/shop?cat=cookies">Cookies &amp; Bites</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs tracking-[0.25em] text-blush mb-4">Company</h4>
          <ul className="space-y-2 text-sm text-cream/80">
            <li><Link to="/about">Our Story</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/login">Customer login</Link></li>
            <li><Link to="/admin/login">Admin</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs tracking-[0.25em] text-blush mb-4">Visit</h4>
          <ul className="space-y-3 text-sm text-cream/80">
            <li className="flex items-start gap-2"><Mail size={14} className="mt-1"/><a href={`mailto:${contact.email || 'orders@cafedailycravings.com'}`} data-testid="footer-email">{contact.email || 'orders@cafedailycravings.com'}</a></li>
            {contact.phone && <li className="flex items-start gap-2"><Phone size={14} className="mt-1"/>{contact.phone}</li>}
            {contact.address && <li className="flex items-start gap-2"><MapPin size={14} className="mt-1"/>{contact.address}</li>}
            {contact.hours && <li className="flex items-start gap-2"><Clock size={14} className="mt-1"/>{contact.hours}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-cream/10 py-6 text-center text-xs text-cream/50">© {new Date().getFullYear()} Rustic Bakes by Daily Cravings · Baked with love</div>
    </footer>
  );
}
