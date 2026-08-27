import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib";
import { toast } from "sonner";
import { LogOut, Package, Layers, ShoppingBag, Inbox, FileText, User, CreditCard, BarChart3, Plus, Trash2, Edit2, X, Image as ImageIcon } from "lucide-react";

const CUR = "₹";

const TABS = [
  { id: "stats", label: "Overview", icon: BarChart3 },
  { id: "products", label: "Products", icon: Package },
  { id: "inventory", label: "Inventory", icon: Layers },
  { id: "categories", label: "Categories", icon: Layers },
  { id: "images", label: "Images", icon: ImageIcon },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "inquiries", label: "Inquiries", icon: Inbox },
  { id: "content", label: "Site Content", icon: FileText },
  { id: "payment", label: "Payment Gateway", icon: CreditCard },
  { id: "profile", label: "Profile", icon: User },
];

export default function Admin() {
  const nav = useNavigate();
  const [tab, setTab] = useState("stats");
  const [user, setUser] = useState(null);
  useEffect(() => {
    api.get("/auth/me").then(r => setUser(r.data)).catch(() => nav("/admin/login"));
  }, [nav]);

  const logout = () => { localStorage.removeItem("rb_token"); localStorage.removeItem("rb_user"); nav("/admin/login"); };

  if (!user) return <div className="py-24 text-center text-brown-muted">Loading...</div>;

  return (
    <div className="min-h-screen bg-cream2">
      <div className="max-w-[1400px] mx-auto px-4 py-8 grid lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-3">
          <div className="card p-5 sticky top-24">
            <div className="text-xs uppercase tracking-widest text-brown-muted">Signed in as</div>
            <div className="font-serif text-lg text-brown mt-1">{user.name}</div>
            <div className="text-xs text-brown-light">{user.email}</div>
            <nav className="mt-6 space-y-1">
              {TABS.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)} data-testid={`admin-tab-${t.id}`}
                    className={"w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm " + (tab===t.id ? "bg-brown text-cream" : "text-brown hover:bg-brown/5")}>
                    <Icon size={16}/>{t.label}
                  </button>
                );
              })}
            </nav>
            <button onClick={logout} data-testid="admin-logout" className="mt-6 w-full flex items-center gap-2 text-sm text-brown-light hover:text-brown"><LogOut size={14}/> Sign out</button>
          </div>
        </aside>
        <main className="lg:col-span-9">
          {tab === "stats" && <StatsTab/>}
          {tab === "products" && <ProductsTab/>}
          {tab === "inventory" && <InventoryTab/>}
          {tab === "categories" && <CategoriesTab/>}
          {tab === "images" && <ImagesTab/>}
          {tab === "orders" && <OrdersTab/>}
          {tab === "inquiries" && <InquiriesTab/>}
          {tab === "content" && <ContentTab/>}
          {tab === "payment" && <PaymentTab/>}
          {tab === "profile" && <ProfileTab user={user} setUser={setUser}/>}
        </main>
      </div>
    </div>
  );
}

function StatsTab() {
  const [s, setS] = useState({});
  useEffect(() => { api.get("/admin/stats").then(r => setS(r.data)); }, []);
  const tiles = [["Products", s.products, Package], ["Orders", s.orders, ShoppingBag], ["Paid", s.paid_orders, ShoppingBag],
    ["Revenue", CUR+(s.revenue||0), BarChart3], ["Inquiries", s.inquiries, Inbox], ["Low stock", s.low_stock, Layers]];
  return (
    <div>
      <h1 className="font-serif text-3xl text-brown mb-6">Overview</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map(([l,v,Icon])=>(
          <div key={l} className="card p-6" data-testid={`stat-${l.toLowerCase().replace(' ','-')}`}>
            <div className="flex items-center justify-between"><span className="text-xs uppercase tracking-widest text-brown-muted">{l}</span><Icon size={16} className="text-blush-dark"/></div>
            <div className="font-serif text-4xl text-brown mt-3">{v ?? "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductsTab() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null);
  const empty = { name:"", slug:"", description:"", price:0, category:"", image:"", stock:0, lead_time_hours:24, is_featured:false, is_active:true };
  const load = () => { api.get("/admin/products").then(r=>setItems(r.data)); api.get("/categories").then(r=>setCats(r.data)); };
  useEffect(load, []);

  const save = async () => {
    try {
      if (editing.id) await api.put(`/admin/products/${editing.id}`, editing);
      else await api.post("/admin/products", editing);
      toast.success("Saved"); setEditing(null); load();
    } catch(e){ toast.error(e.response?.data?.detail || "Save failed"); }
  };
  const del = async (id) => { if(!window.confirm("Delete?")) return; await api.delete(`/admin/products/${id}`); toast.success("Deleted"); load(); };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-serif text-3xl text-brown">Products</h1>
        <button className="btn-primary" onClick={()=>setEditing({...empty})} data-testid="add-product-btn"><Plus size={16}/> Add product</button>
      </div>
      <div className="grid gap-3">
        {items.map(p => (
          <div key={p.id} className="card p-4 flex items-center gap-4" data-testid={`product-row-${p.slug}`}>
            <img src={p.image} alt="" className="w-16 h-16 rounded-lg object-cover"/>
            <div className="flex-1"><div className="font-serif text-lg text-brown">{p.name}</div><div className="text-xs text-brown-muted">{p.category} · Stock: {p.stock}</div></div>
            <div className="font-serif text-brown">{CUR}{p.price}</div>
            <button onClick={()=>setEditing(p)} className="p-2 text-brown"><Edit2 size={16}/></button>
            <button onClick={()=>del(p.id)} className="p-2 text-blush-dark"><Trash2 size={16}/></button>
          </div>
        ))}
      </div>
      {editing && (
        <Modal onClose={()=>setEditing(null)} title={editing.id?"Edit product":"New product"}>
          <div className="grid grid-cols-2 gap-3">
            <input className="field" placeholder="Name" value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/>
            <input className="field" placeholder="Slug (url)" value={editing.slug} onChange={e=>setEditing({...editing,slug:e.target.value})}/>
            <select className="field" value={editing.category} onChange={e=>setEditing({...editing,category:e.target.value})}>
              <option value="">-- category --</option>
              {cats.map(c=><option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
            <input type="number" step="0.01" className="field" placeholder="Price" value={editing.price} onChange={e=>setEditing({...editing,price:parseFloat(e.target.value)||0})}/>
            <input type="number" className="field" placeholder="Stock" value={editing.stock} onChange={e=>setEditing({...editing,stock:parseInt(e.target.value)||0})}/>
            <input type="number" className="field" placeholder="Lead time (h)" value={editing.lead_time_hours} onChange={e=>setEditing({...editing,lead_time_hours:parseInt(e.target.value)||24})}/>
            <input className="field col-span-2" placeholder="Image URL" value={editing.image} onChange={e=>setEditing({...editing,image:e.target.value})}/>
            <textarea className="field col-span-2" rows={3} placeholder="Description" value={editing.description} onChange={e=>setEditing({...editing,description:e.target.value})}/>
            <label className="flex items-center gap-2 text-sm text-brown"><input type="checkbox" checked={editing.is_featured} onChange={e=>setEditing({...editing,is_featured:e.target.checked})}/> Featured</label>
            <label className="flex items-center gap-2 text-sm text-brown"><input type="checkbox" checked={editing.is_active} onChange={e=>setEditing({...editing,is_active:e.target.checked})}/> Active</label>
          </div>
          <button className="btn-primary mt-4" onClick={save} data-testid="save-product-btn">Save</button>
        </Modal>
      )}
    </div>
  );
}

function InventoryTab() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/admin/products").then(r => setItems(r.data)); }, []);
  const update = async (p, stock) => {
    await api.put(`/admin/products/${p.id}`, { ...p, stock });
    setItems(items.map(x => x.id === p.id ? {...x, stock} : x));
  };
  return (
    <div>
      <h1 className="font-serif text-3xl text-brown mb-6">Inventory</h1>
      <div className="card p-4">
        <table className="w-full text-sm">
          <thead><tr className="text-brown-muted text-xs uppercase tracking-widest text-left"><th className="p-3">Product</th><th>Category</th><th>Price</th><th>Stock</th><th></th></tr></thead>
          <tbody>{items.map(p => (
            <tr key={p.id} className="border-t border-brown/10">
              <td className="p-3 text-brown">{p.name}</td>
              <td>{p.category}</td>
              <td>{CUR}{p.price}</td>
              <td><input type="number" defaultValue={p.stock} className="field w-24 py-1" onBlur={e=>update(p, parseInt(e.target.value)||0)} data-testid={`inv-stock-${p.slug}`}/></td>
              <td>{p.stock<=5 && <span className="text-blush-dark text-xs">Low</span>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function CategoriesTab() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = () => api.get("/categories").then(r=>setItems(r.data));
  useEffect(() => { load(); }, []);
  const save = async () => {
    try {
      if (editing.id) await api.put(`/admin/categories/${editing.id}`, editing);
      else await api.post("/admin/categories", editing);
      toast.success("Saved"); setEditing(null); load();
    } catch (e){ toast.error("Failed"); }
  };
  return (
    <div>
      <div className="flex justify-between mb-6"><h1 className="font-serif text-3xl text-brown">Categories</h1><button className="btn-primary" onClick={()=>setEditing({name:"",slug:"",description:"",image:""})}><Plus size={16}/> Add</button></div>
      <div className="grid gap-3">{items.map(c=>(
        <div key={c.id} className="card p-4 flex items-center gap-4">
          <img src={c.image} alt="" className="w-14 h-14 rounded-lg object-cover"/>
          <div className="flex-1"><div className="font-serif text-brown">{c.name}</div><div className="text-xs text-brown-muted">/{c.slug}</div></div>
          <button onClick={()=>setEditing(c)} className="p-2"><Edit2 size={16}/></button>
          <button onClick={async()=>{await api.delete(`/admin/categories/${c.id}`); load();}} className="p-2 text-blush-dark"><Trash2 size={16}/></button>
        </div>
      ))}</div>
      {editing && <Modal onClose={()=>setEditing(null)} title="Category">
        <input className="field mb-2" placeholder="Name" value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/>
        <input className="field mb-2" placeholder="Slug" value={editing.slug} onChange={e=>setEditing({...editing,slug:e.target.value})}/>
        <input className="field mb-2" placeholder="Image URL" value={editing.image} onChange={e=>setEditing({...editing,image:e.target.value})}/>
        <textarea className="field mb-2" placeholder="Description" value={editing.description} onChange={e=>setEditing({...editing,description:e.target.value})}/>
        <button className="btn-primary" onClick={save}>Save</button>
      </Modal>}
    </div>
  );
}

function ImagesTab() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ url: "", name: "", tag: "" });
  const [uploading, setUploading] = useState(false);
  const [cloudinaryReady, setCloudinaryReady] = useState(false);
  const load = () => api.get("/admin/media").then(r => setItems(r.data));
  useEffect(() => {
    load();
    api.get("/admin/cloudinary/status").then(r => setCloudinaryReady(r.data.configured)).catch(()=>{});
  }, []);
  const add = async (payload) => {
    try { await api.post("/admin/media", payload); load(); toast.success("Image saved"); }
    catch { toast.error("Failed"); }
  };
  const addUrl = async () => {
    if (!form.url) return toast.error("URL required");
    await add(form);
    setForm({url:"",name:"",tag:""});
  };
  const uploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!cloudinaryReady) { toast.error("Cloudinary not configured. Ask admin to add API keys in .env"); return; }
    setUploading(true);
    try {
      const { data: sig } = await api.get("/admin/cloudinary/signature");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", sig.api_key);
      fd.append("timestamp", sig.timestamp);
      fd.append("signature", sig.signature);
      fd.append("folder", sig.folder);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`, { method: "POST", body: fd });
      const uploaded = await res.json();
      if (uploaded.error) throw new Error(uploaded.error.message);
      await add({ url: uploaded.secure_url, public_id: uploaded.public_id,
                  name: file.name.replace(/\.[^.]+$/,''), tag: "upload" });
    } catch(err) { toast.error(err.message || "Upload failed"); }
    finally { setUploading(false); e.target.value = ""; }
  };
  const del = async (id) => { await api.delete(`/admin/media/${id}`); load(); };
  const copy = (url) => { navigator.clipboard.writeText(url); toast.success("URL copied"); };
  return (
    <div>
      <h1 className="font-serif text-3xl text-brown mb-2">Image Library</h1>
      <p className="text-sm text-brown-light mb-4">Upload from device or paste image URLs. Copy any URL into product/category/content fields.</p>

      {!cloudinaryReady && (
        <div className="card p-4 mb-4 border-l-4 border-blush-dark text-sm text-brown">
          <strong>Cloudinary not configured.</strong> Add <code>CLOUDINARY_CLOUD_NAME</code>, <code>CLOUDINARY_API_KEY</code>, <code>CLOUDINARY_API_SECRET</code> to <code>/app/backend/.env</code> to enable file uploads. You can still add images by URL below.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <h3 className="font-serif text-lg text-brown mb-3">Upload from device</h3>
          <label className={"btn-primary cursor-pointer inline-flex " + (uploading || !cloudinaryReady ? "opacity-50 pointer-events-none" : "")}>
            <input type="file" accept="image/*" className="hidden" onChange={uploadFile} data-testid="media-file-input"/>
            {uploading ? "Uploading..." : "Choose photo"}
          </label>
          <div className="text-xs text-brown-muted mt-2">JPG, PNG, WEBP · auto-optimized via Cloudinary</div>
        </div>
        <div className="card p-5">
          <h3 className="font-serif text-lg text-brown mb-3">Add by URL</h3>
          <input className="field mb-2" placeholder="https://..." value={form.url} onChange={e=>setForm({...form,url:e.target.value})} data-testid="media-url"/>
          <div className="grid grid-cols-2 gap-2">
            <input className="field" placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} data-testid="media-name"/>
            <input className="field" placeholder="Tag" value={form.tag} onChange={e=>setForm({...form,tag:e.target.value})} data-testid="media-tag"/>
          </div>
          <button className="btn-primary mt-3" onClick={addUrl} data-testid="media-add"><Plus size={16}/> Add URL</button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map(m => (
          <div key={m.id} className="card overflow-hidden group" data-testid={`media-${m.id}`}>
            <div className="h-40 bg-cream2 overflow-hidden"><img src={m.url} alt={m.name} className="w-full h-full object-cover"/></div>
            <div className="p-3">
              <div className="font-medium text-brown text-sm truncate">{m.name}</div>
              {m.tag && <div className="text-xs text-brown-muted mt-1">{m.tag}</div>}
              <div className="flex justify-between mt-2">
                <button onClick={() => copy(m.url)} className="text-xs text-brown hover:text-brown-dark underline">Copy URL</button>
                <button onClick={() => del(m.id)} className="text-blush-dark"><Trash2 size={14}/></button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="col-span-full text-center text-brown-muted py-10">No images yet. Upload or add your first one above.</div>}
      </div>
    </div>
  );
}

function OrdersTab() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/admin/orders").then(r => setItems(r.data)); }, []);
  const update = async (o, status) => {
    await api.put(`/admin/orders/${o.id}`, { status });
    setItems(items.map(x => x.id === o.id ? { ...x, status } : x));
    toast.success("Order updated");
  };
  return (
    <div>
      <h1 className="font-serif text-3xl text-brown mb-6">Orders</h1>
      <div className="grid gap-3">{items.map(o=>(
        <div key={o.id} className="card p-5" data-testid={`order-row-${o.id}`}>
          <div className="flex justify-between items-start">
            <div>
              <div className="font-serif text-lg text-brown">{o.customer_name}</div>
              <div className="text-xs text-brown-muted">{o.customer_email} · {new Date(o.created_at).toLocaleString()}</div>
            </div>
            <div className="text-right"><div className="font-serif text-xl text-brown">{CUR}{o.total}</div>
            <div className={"text-xs mt-1 " + (o.payment_status==="paid"?"text-green-700":"text-brown-muted")}>{o.payment_status}</div></div>
          </div>
          <div className="mt-3 text-sm text-brown-light">{o.items?.map(i=>`${i.name} × ${i.quantity}`).join(", ")}</div>
          <div className="mt-3 flex items-center gap-2">
            <select value={o.status||"pending"} onChange={e=>update(o,e.target.value)} className="field py-1 w-auto text-sm">
              {["pending","confirmed","baking","ready","delivered","cancelled"].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      ))}{items.length===0 && <div className="text-brown-muted text-center py-10">No orders yet</div>}</div>
    </div>
  );
}

function InquiriesTab() {
  const [items, setItems] = useState([]);
  const load = () => api.get("/admin/inquiries").then(r=>setItems(r.data));
  useEffect(load, []);
  return (
    <div>
      <h1 className="font-serif text-3xl text-brown mb-6">Inquiries</h1>
      <div className="grid gap-3">{items.map(i=>(
        <div key={i.id} className="card p-5">
          <div className="flex justify-between"><div><div className="font-serif text-brown text-lg">{i.name}</div><div className="text-xs text-brown-muted">{i.email} · {i.phone}</div></div>
          <select value={i.status} onChange={async e=>{await api.put(`/admin/inquiries/${i.id}`,{status:e.target.value}); load();}} className="field py-1 w-auto text-sm">
            <option value="new">New</option><option value="responded">Responded</option><option value="closed">Closed</option>
          </select></div>
          {i.subject && <div className="text-brown mt-2 font-medium">{i.subject}</div>}
          <div className="mt-2 text-brown-light text-sm whitespace-pre-wrap">{i.message}</div>
        </div>
      ))}{items.length===0 && <div className="text-brown-muted text-center py-10">No inquiries yet</div>}</div>
    </div>
  );
}

function ContentTab() {
  const [hero, setHero] = useState({title:"",subtitle:"",cta:"",image:""});
  const [about, setAbout] = useState({heading:"",body:"",image:""});
  const [contact, setContact] = useState({email:"",phone:"",address:"",hours:""});
  useEffect(() => {
    api.get("/content/hero").then(r=>r.data.value && setHero(r.data.value));
    api.get("/content/about").then(r=>r.data.value && setAbout(r.data.value));
    api.get("/content/contact").then(r=>r.data.value && setContact(r.data.value));
  }, []);
  const save = async (key, value) => { await api.put("/admin/content", { key, value }); toast.success(`${key} saved`); };
  return (
    <div className="space-y-8">
      <h1 className="font-serif text-3xl text-brown">Site Content</h1>
      <div className="card p-6">
        <h3 className="font-serif text-xl text-brown mb-4">Homepage Hero</h3>
        <textarea rows={2} className="field mb-2" placeholder="Title" value={hero.title} onChange={e=>setHero({...hero,title:e.target.value})}/>
        <textarea rows={2} className="field mb-2" placeholder="Subtitle" value={hero.subtitle} onChange={e=>setHero({...hero,subtitle:e.target.value})}/>
        <input className="field mb-2" placeholder="CTA text" value={hero.cta} onChange={e=>setHero({...hero,cta:e.target.value})}/>
        <input className="field mb-2" placeholder="Image URL" value={hero.image} onChange={e=>setHero({...hero,image:e.target.value})}/>
        <button className="btn-primary" onClick={()=>save("hero",hero)} data-testid="save-hero">Save hero</button>
      </div>
      <div className="card p-6">
        <h3 className="font-serif text-xl text-brown mb-4">About</h3>
        <input className="field mb-2" placeholder="Heading" value={about.heading} onChange={e=>setAbout({...about,heading:e.target.value})}/>
        <textarea rows={5} className="field mb-2" placeholder="Body" value={about.body} onChange={e=>setAbout({...about,body:e.target.value})}/>
        <input className="field mb-2" placeholder="Image URL" value={about.image} onChange={e=>setAbout({...about,image:e.target.value})}/>
        <button className="btn-primary" onClick={()=>save("about",about)}>Save about</button>
      </div>
      <div className="card p-6">
        <h3 className="font-serif text-xl text-brown mb-4">Contact Info</h3>
        <div className="grid grid-cols-2 gap-2">
          <input className="field" placeholder="Email" value={contact.email} onChange={e=>setContact({...contact,email:e.target.value})}/>
          <input className="field" placeholder="Phone" value={contact.phone} onChange={e=>setContact({...contact,phone:e.target.value})}/>
          <input className="field" placeholder="Address" value={contact.address} onChange={e=>setContact({...contact,address:e.target.value})}/>
          <input className="field" placeholder="Hours" value={contact.hours} onChange={e=>setContact({...contact,hours:e.target.value})}/>
        </div>
        <button className="btn-primary mt-4" onClick={()=>save("contact",contact)}>Save contact</button>
      </div>
    </div>
  );
}

function PaymentTab() {
  const [s, setS] = useState({provider:"stripe", mode:"test", publishable_key:"", currency:"usd"});
  useEffect(() => { api.get("/admin/payment-settings").then(r=>r.data.value && setS(r.data.value)); }, []);
  return (
    <div>
      <h1 className="font-serif text-3xl text-brown mb-6">Payment Gateway</h1>
      <div className="card p-6 space-y-3">
        <div className="text-sm text-brown-light">Currently using: <strong>Stripe</strong> (shared test key) · Currency: <strong>INR (₹)</strong>. Test with card <code>4242 4242 4242 4242</code>, any future date, any CVC.</div>
        <div className="grid grid-cols-2 gap-3">
          <select className="field" value={s.provider} onChange={e=>setS({...s,provider:e.target.value})}><option value="stripe">Stripe</option></select>
          <select className="field" value={s.mode} onChange={e=>setS({...s,mode:e.target.value})}><option value="test">Test</option><option value="live">Live</option></select>
          <input className="field" placeholder="Publishable key" value={s.publishable_key} onChange={e=>setS({...s,publishable_key:e.target.value})}/>
          <input className="field" placeholder="Currency" value={s.currency} onChange={e=>setS({...s,currency:e.target.value})}/>
        </div>
        <button className="btn-primary" onClick={async()=>{await api.put("/admin/payment-settings",s); toast.success("Saved");}}>Save</button>
        <p className="text-xs text-brown-muted mt-4">Note: To use your own Stripe account, update <code>STRIPE_API_KEY</code> in the backend .env file with your <code>sk_test_...</code> or <code>sk_live_...</code> key.</p>
      </div>
    </div>
  );
}

function ProfileTab({ user, setUser }) {
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState("");
  const save = async () => {
    await api.put("/auth/profile", { name, password: password || undefined });
    setUser({...user, name}); setPassword("");
    toast.success("Profile updated");
  };
  return (
    <div>
      <h1 className="font-serif text-3xl text-brown mb-6">Profile</h1>
      <div className="card p-6 max-w-lg">
        <label className="text-xs text-brown-muted uppercase tracking-widest">Email</label>
        <input className="field mt-1 bg-cream2" value={user.email} disabled/>
        <label className="text-xs text-brown-muted uppercase tracking-widest mt-4 block">Name</label>
        <input className="field mt-1" value={name} onChange={e=>setName(e.target.value)}/>
        <label className="text-xs text-brown-muted uppercase tracking-widest mt-4 block">New password (leave blank to keep)</label>
        <input type="password" className="field mt-1" value={password} onChange={e=>setPassword(e.target.value)}/>
        <button className="btn-primary mt-6" onClick={save} data-testid="save-profile">Save changes</button>
      </div>
    </div>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 bg-brown/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-cream rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4"><h3 className="font-serif text-xl text-brown">{title}</h3><button onClick={onClose}><X size={20}/></button></div>
        {children}
      </div>
    </div>
  );
}
