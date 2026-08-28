import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Toaster } from "sonner";
import { Nav, Footer } from "./Layout";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Product from "./pages/Product";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import AdminLogin from "./pages/AdminLogin";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Account from "./pages/Account";
import CategoryPage from "./pages/CategoryPage";
import CakeBuilder from "./pages/CakeBuilder";
import Gifting from "./pages/Gifting";

function SiteShell({ children }) {
  return (<><Nav/>{children}<Footer/></>);
}

function NotFound() {
  return (
    <SiteShell>
      <main className="max-w-4xl mx-auto px-6 py-28 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-blush-dark">Page not found</p>
        <h1 className="font-serif text-5xl text-brown mt-4">That bake has gone missing.</h1>
        <p className="text-brown-light mt-5">The page you requested does not exist or has moved.</p>
        <Link to="/shop" className="btn-primary inline-block mt-8">Browse all bakes</Link>
      </main>
    </SiteShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton/>
      <Routes>
        <Route path="/" element={<SiteShell><Home/></SiteShell>}/>
        <Route path="/shop" element={<SiteShell><Shop/></SiteShell>}/>
        <Route path="/category/:slug" element={<SiteShell><CategoryPage/></SiteShell>}/>
        <Route path="/customize" element={<SiteShell><CakeBuilder/></SiteShell>}/>
        <Route path="/gifting" element={<SiteShell><Gifting/></SiteShell>}/>
        <Route path="/product/:slug" element={<SiteShell><Product/></SiteShell>}/>
        <Route path="/about" element={<SiteShell><About/></SiteShell>}/>
        <Route path="/contact" element={<SiteShell><Contact/></SiteShell>}/>
        <Route path="/cart" element={<SiteShell><Cart/></SiteShell>}/>
        <Route path="/checkout" element={<SiteShell><Checkout/></SiteShell>}/>
        <Route path="/payment/success" element={<SiteShell><PaymentSuccess/></SiteShell>}/>
        <Route path="/login" element={<SiteShell><Login/></SiteShell>}/>
        <Route path="/account" element={<SiteShell><Account/></SiteShell>}/>
        <Route path="/admin/login" element={<SiteShell><AdminLogin/></SiteShell>}/>
        <Route path="/admin" element={<Admin/>}/>
        <Route path="*" element={<NotFound/>}/>
      </Routes>
    </BrowserRouter>
  );
}
