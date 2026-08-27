import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

function SiteShell({ children }) {
  return (<><Nav/>{children}<Footer/></>);
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton/>
      <Routes>
        <Route path="/" element={<SiteShell><Home/></SiteShell>}/>
        <Route path="/shop" element={<SiteShell><Shop/></SiteShell>}/>
        <Route path="/category/:slug" element={<SiteShell><CategoryPage/></SiteShell>}/>
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
      </Routes>
    </BrowserRouter>
  );
}
