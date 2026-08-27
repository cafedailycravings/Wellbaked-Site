from dotenv import load_dotenv
load_dotenv()

import os
import time
import asyncio
import logging
import uuid
import bcrypt
import jwt
import httpx
import resend
import stripe
import cloudinary
import cloudinary.utils
import cloudinary.uploader
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rustic_bakes")

# --- Config ---
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@rusticbakes.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
OWNER_EMAIL = os.environ.get("OWNER_EMAIL", "orders@cafedailycravings.com")
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "sk_test_emergent")
CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "")
META_WHATSAPP_TOKEN = os.environ.get("META_WHATSAPP_TOKEN", "")
META_WHATSAPP_PHONE_NUMBER_ID = os.environ.get("META_WHATSAPP_PHONE_NUMBER_ID", "")
META_GRAPH_VERSION = os.environ.get("META_GRAPH_VERSION", "v18.0")
OWNER_WHATSAPP_NUMBER = os.environ.get("OWNER_WHATSAPP_NUMBER", "")

resend.api_key = RESEND_API_KEY
stripe.api_key = STRIPE_API_KEY
if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
    cloudinary.config(cloud_name=CLOUDINARY_CLOUD_NAME, api_key=CLOUDINARY_API_KEY,
                      api_secret=CLOUDINARY_API_SECRET, secure=True)

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Rustic Bakes API")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Helpers ---
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False

def create_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

async def get_current_admin(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALGO])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user or user.get("role") != "admin":
            raise HTTPException(403, "Admin only")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALGO])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

async def get_optional_user(request: Request):
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

# --- Models ---
class LoginReq(BaseModel):
    email: EmailStr
    password: str

class RegisterReq(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str = ""
    address: str = ""

class ProductIn(BaseModel):
    name: str
    slug: str
    description: str = ""
    price: float
    category: str = ""
    image: str = ""
    stock: int = 0
    lead_time_hours: int = 24
    is_featured: bool = False
    is_active: bool = True

class CategoryIn(BaseModel):
    name: str
    slug: str
    description: str = ""
    image: str = ""

class InquiryIn(BaseModel):
    name: str
    email: EmailStr
    phone: str = ""
    subject: str = ""
    message: str

class CartItem(BaseModel):
    product_id: str
    name: str
    price: float
    quantity: int = Field(1, ge=1)
    image: str = ""

class CheckoutReq(BaseModel):
    items: List[CartItem]
    customer_name: str
    customer_email: EmailStr
    customer_phone: str = ""
    delivery_address: str = ""
    notes: str = ""
    origin_url: str

class SiteContentIn(BaseModel):
    key: str
    value: dict

# --- Auth Endpoints ---
@api.post("/auth/register")
async def register(req: RegisterReq):
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    uid = str(uuid.uuid4())
    await db.users.insert_one({
        "id": uid, "email": req.email.lower(),
        "password_hash": hash_password(req.password),
        "name": req.name, "phone": req.phone, "address": req.address,
        "role": "customer", "created_at": now_iso(),
    })
    token = create_token(uid, req.email.lower())
    return {"access_token": token, "token_type": "bearer",
            "user": {"id": uid, "email": req.email.lower(), "name": req.name,
                     "phone": req.phone, "address": req.address, "role": "customer"}}

@api.post("/auth/login")
async def login(req: LoginReq):
    user = await db.users.find_one({"email": req.email.lower()})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = create_token(user["id"], user["email"])
    return {"access_token": token, "token_type": "bearer",
            "user": {"id": user["id"], "email": user["email"], "name": user.get("name", ""),
                     "phone": user.get("phone", ""), "address": user.get("address", ""),
                     "role": user.get("role", "customer")}}

@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user

@api.put("/auth/profile")
async def update_profile(data: dict, user=Depends(get_current_user)):
    updates = {}
    for k in ("name", "phone", "address"):
        if k in data: updates[k] = data[k]
    if "password" in data and data["password"]:
        updates["password_hash"] = hash_password(data["password"])
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    return {"success": True}

@api.get("/auth/orders")
async def my_orders(user=Depends(get_current_user)):
    return await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)

# --- Products ---
@api.get("/products")
async def list_products(category: Optional[str] = None, featured: Optional[bool] = None):
    q = {"is_active": True}
    if category: q["category"] = category
    if featured is not None: q["is_featured"] = featured
    items = await db.products.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

@api.get("/products/{slug}")
async def get_product(slug: str):
    p = await db.products.find_one({"slug": slug}, {"_id": 0})
    if not p: raise HTTPException(404, "Not found")
    return p

@api.post("/admin/products")
async def create_product(p: ProductIn, user=Depends(get_current_admin)):
    doc = p.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    doc["updated_at"] = now_iso()
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/admin/products")
async def admin_list_products(user=Depends(get_current_admin)):
    items = await db.products.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items

@api.put("/admin/products/{pid}")
async def update_product(pid: str, p: ProductIn, user=Depends(get_current_admin)):
    doc = p.model_dump()
    doc["updated_at"] = now_iso()
    r = await db.products.update_one({"id": pid}, {"$set": doc})
    if r.matched_count == 0: raise HTTPException(404, "Not found")
    return {"success": True}

@api.delete("/admin/products/{pid}")
async def delete_product(pid: str, user=Depends(get_current_admin)):
    await db.products.delete_one({"id": pid})
    return {"success": True}

# --- Categories ---
@api.get("/categories")
async def list_categories():
    return await db.categories.find({}, {"_id": 0}).to_list(200)

@api.post("/admin/categories")
async def create_category(c: CategoryIn, user=Depends(get_current_admin)):
    doc = c.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    await db.categories.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/admin/categories/{cid}")
async def update_category(cid: str, c: CategoryIn, user=Depends(get_current_admin)):
    r = await db.categories.update_one({"id": cid}, {"$set": c.model_dump()})
    if r.matched_count == 0: raise HTTPException(404, "Not found")
    return {"success": True}

@api.delete("/admin/categories/{cid}")
async def delete_category(cid: str, user=Depends(get_current_admin)):
    await db.categories.delete_one({"id": cid})
    return {"success": True}

# --- Inquiries ---
@api.post("/inquiries")
async def create_inquiry(i: InquiryIn):
    doc = i.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    doc["status"] = "new"
    await db.inquiries.insert_one(doc)
    # send email + whatsapp (non-blocking)
    asyncio.create_task(send_inquiry_email(doc))
    asyncio.create_task(send_whatsapp_text(
        f"🍞 New inquiry — Rustic Bakes\n\n"
        f"Name: {doc['name']}\nEmail: {doc['email']}\nPhone: {doc.get('phone','—')}\n"
        f"Subject: {doc.get('subject','—')}\n\nMessage:\n{doc['message']}"
    ))
    return {"success": True, "id": doc["id"]}

@api.get("/admin/inquiries")
async def list_inquiries(user=Depends(get_current_admin)):
    return await db.inquiries.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.put("/admin/inquiries/{iid}")
async def update_inquiry(iid: str, data: dict, user=Depends(get_current_admin)):
    await db.inquiries.update_one({"id": iid}, {"$set": {"status": data.get("status", "new")}})
    return {"success": True}

@api.delete("/admin/inquiries/{iid}")
async def delete_inquiry(iid: str, user=Depends(get_current_admin)):
    await db.inquiries.delete_one({"id": iid})
    return {"success": True}

# --- Site Content (Homepage hero, About, Contact info) ---
@api.get("/content/{key}")
async def get_content(key: str):
    c = await db.site_content.find_one({"key": key}, {"_id": 0})
    return c or {"key": key, "value": {}}

@api.get("/admin/content")
async def list_content(user=Depends(get_current_admin)):
    return await db.site_content.find({}, {"_id": 0}).to_list(50)

@api.put("/admin/content")
async def upsert_content(c: SiteContentIn, user=Depends(get_current_admin)):
    await db.site_content.update_one({"key": c.key},
        {"$set": {"key": c.key, "value": c.value, "updated_at": now_iso()}},
        upsert=True)
    return {"success": True}

# --- Orders / Stripe ---
async def send_order_confirmation(order: dict):
    try:
        items_html = "".join(
            f"<tr><td style='padding:8px;border-bottom:1px solid #eee'>{it['name']} x {it['quantity']}</td>"
            f"<td style='padding:8px;border-bottom:1px solid #eee;text-align:right'>&#8377;{it['price'] * it['quantity']:.2f}</td></tr>"
            for it in order["items"])
        html = f"""
        <div style='font-family:Georgia,serif;background:#F9F6F0;padding:32px;color:#4A3022'>
          <div style='max-width:600px;margin:auto;background:#fff;border-radius:16px;padding:32px'>
            <h1 style='font-family:Georgia,serif;color:#4A3022'>Rustic Bakes by Daily Cravings</h1>
            <p>Hi {order['customer_name']},</p>
            <p>Thank you for your order! We're preparing it with love.</p>
            <table style='width:100%;border-collapse:collapse;margin-top:16px'>{items_html}
              <tr><td style='padding:12px;font-weight:bold'>Total</td>
                  <td style='padding:12px;font-weight:bold;text-align:right'>&#8377;{order['total']:.2f}</td></tr>
            </table>
            <p style='margin-top:24px'>Order ID: <strong>{order['id']}</strong></p>
            <p style='color:#7A5A4A;font-size:13px;margin-top:32px'>Baked with love &middot; Homemade goodness</p>
          </div>
        </div>"""
        if RESEND_API_KEY and not RESEND_API_KEY.startswith("re_placeholder"):
            await asyncio.to_thread(resend.Emails.send, {
                "from": SENDER_EMAIL, "to": [order["customer_email"]],
                "subject": f"Your Rustic Bakes order #{order['id'][:8]}", "html": html})
            await asyncio.to_thread(resend.Emails.send, {
                "from": SENDER_EMAIL, "to": [OWNER_EMAIL],
                "subject": f"New order #{order['id'][:8]} from {order['customer_name']}", "html": html})
    except Exception as e:
        logger.error(f"Email send failed: {e}")

async def send_inquiry_email(inq: dict):
    try:
        html = f"""<div style='font-family:Georgia,serif;background:#F9F6F0;padding:24px;color:#4A3022'>
          <div style='max-width:600px;margin:auto;background:#fff;border-radius:16px;padding:24px'>
            <h2>New Inquiry - Rustic Bakes</h2>
            <p><strong>Name:</strong> {inq['name']}</p>
            <p><strong>Email:</strong> {inq['email']}</p>
            <p><strong>Phone:</strong> {inq.get('phone','')}</p>
            <p><strong>Subject:</strong> {inq.get('subject','')}</p>
            <p><strong>Message:</strong><br/>{inq['message']}</p>
          </div></div>"""
        if RESEND_API_KEY and not RESEND_API_KEY.startswith("re_placeholder"):
            await asyncio.to_thread(resend.Emails.send, {
                "from": SENDER_EMAIL, "to": [OWNER_EMAIL],
                "subject": f"New inquiry from {inq['name']}", "html": html})
    except Exception as e:
        logger.error(f"Inquiry email failed: {e}")

@api.post("/payments/checkout")
async def create_checkout(req: CheckoutReq, request: Request):
    if not req.items:
        raise HTTPException(400, "Cart is empty")
    total = round(sum(i.price * i.quantity for i in req.items), 2)
    order_id = str(uuid.uuid4())
    user = await get_optional_user(request)
    order = {
        "id": order_id, "items": [i.model_dump() for i in req.items],
        "total": total, "currency": "inr",
        "customer_name": req.customer_name, "customer_email": req.customer_email,
        "customer_phone": req.customer_phone, "delivery_address": req.delivery_address,
        "notes": req.notes, "status": "pending", "payment_status": "pending",
        "user_id": user["id"] if user else None,
        "created_at": now_iso(), "updated_at": now_iso(),
    }

    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
        webhook_url = f"{req.origin_url}/api/webhook/stripe"
        sc = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        sess_req = CheckoutSessionRequest(
            amount=float(total), currency="inr",
            success_url=f"{req.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{req.origin_url}/cart",
            metadata={"order_id": order_id, "customer_email": req.customer_email},
        )
        session = await sc.create_checkout_session(sess_req)
        order["session_id"] = session.session_id
        await db.orders.insert_one(order)
        return {"checkout_url": session.url, "session_id": session.session_id, "order_id": order_id}
    except Exception as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(500, f"Payment initialization failed: {str(e)}")

@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str):
    order = await db.orders.find_one({"session_id": session_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    if order.get("payment_status") != "paid":
        try:
            from emergentintegrations.payments.stripe.checkout import StripeCheckout
            sc = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
            status_resp = await sc.get_checkout_status(session_id)
            if status_resp.payment_status == "paid" and order.get("payment_status") != "paid":
                await db.orders.update_one(
                    {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                    {"$set": {"payment_status": "paid", "status": "confirmed", "updated_at": now_iso()}})
                order["payment_status"] = "paid"
                order["status"] = "confirmed"
                asyncio.create_task(send_order_confirmation(order))
                items_txt = ", ".join(f"{it['name']} x {it['quantity']}" for it in order["items"])
                asyncio.create_task(send_whatsapp_text(
                    f"🎉 New paid order — Rustic Bakes\n\n"
                    f"Order #{order['id'][:8]}\n"
                    f"Customer: {order['customer_name']}\n"
                    f"Total: ₹{order['total']:.2f}\n"
                    f"Phone: {order.get('customer_phone','—')}\n"
                    f"Items: {items_txt}"
                ))
        except Exception as e:
            logger.error(f"Status check failed: {e}")
    return {"session_id": session_id, "payment_status": order.get("payment_status"),
            "status": order.get("status"), "order_id": order.get("id"), "total": order.get("total")}

@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        body = await request.body()
        sig = request.headers.get("Stripe-Signature", "")
        sc = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        result = await sc.handle_webhook(body, sig)
        if result.payment_status == "paid":
            order = await db.orders.find_one({"session_id": result.session_id})
            if order and order.get("payment_status") != "paid":
                await db.orders.update_one({"session_id": result.session_id},
                    {"$set": {"payment_status": "paid", "status": "confirmed", "updated_at": now_iso()}})
                asyncio.create_task(send_order_confirmation(order))
                items_txt = ", ".join(f"{it['name']} x {it['quantity']}" for it in order["items"])
                asyncio.create_task(send_whatsapp_text(
                    f"🎉 New paid order — Rustic Bakes\n\n"
                    f"Order #{order['id'][:8]}\nCustomer: {order['customer_name']}\n"
                    f"Total: ₹{order['total']:.2f}\nItems: {items_txt}"
                ))
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook err: {e}")
        return {"status": "error"}

@api.get("/admin/orders")
async def list_orders(user=Depends(get_current_admin)):
    return await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.put("/admin/orders/{oid}")
async def update_order(oid: str, data: dict, user=Depends(get_current_admin)):
    await db.orders.update_one({"id": oid}, {"$set": {"status": data.get("status"), "updated_at": now_iso()}})
    return {"success": True}

# --- Payment gateway settings ---
@api.get("/admin/payment-settings")
async def get_pay_settings(user=Depends(get_current_admin)):
    s = await db.settings.find_one({"key": "payment"}, {"_id": 0})
    return s or {"key": "payment", "value": {"provider": "stripe", "mode": "test",
                                              "publishable_key": "", "currency": "inr"}}

@api.put("/admin/payment-settings")
async def set_pay_settings(data: dict, user=Depends(get_current_admin)):
    await db.settings.update_one({"key": "payment"},
        {"$set": {"key": "payment", "value": data, "updated_at": now_iso()}}, upsert=True)
    return {"success": True}

# --- WhatsApp (Meta Cloud API) ---
def whatsapp_configured() -> bool:
    return bool(META_WHATSAPP_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID and OWNER_WHATSAPP_NUMBER)

async def send_whatsapp_text(body: str, to: str = None):
    if not whatsapp_configured():
        logger.info(f"[WhatsApp skipped - not configured] {body[:80]}")
        return
    target = to or OWNER_WHATSAPP_NUMBER
    url = f"https://graph.facebook.com/{META_GRAPH_VERSION}/{META_WHATSAPP_PHONE_NUMBER_ID}/messages"
    payload = {"messaging_product": "whatsapp", "recipient_type": "individual",
               "to": target.replace("+", ""), "type": "text",
               "text": {"preview_url": False, "body": body[:4096]}}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(url, headers={"Authorization": f"Bearer {META_WHATSAPP_TOKEN}"}, json=payload)
            if r.status_code >= 400:
                logger.error(f"WhatsApp send failed {r.status_code}: {r.text[:200]}")
            else:
                logger.info(f"WhatsApp sent to {target}")
    except Exception as e:
        logger.exception(f"WhatsApp error: {e}")

# --- Cloudinary ---
@api.get("/admin/cloudinary/signature")
async def cloudinary_signature(user=Depends(get_current_admin)):
    if not (CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_SECRET):
        raise HTTPException(400, "Cloudinary is not configured. Add CLOUDINARY_* env vars.")
    timestamp = int(time.time())
    folder = "rustic-bakes"
    params = {"timestamp": timestamp, "folder": folder}
    signature = cloudinary.utils.api_sign_request(params, CLOUDINARY_API_SECRET)
    return {"signature": signature, "timestamp": timestamp, "cloud_name": CLOUDINARY_CLOUD_NAME,
            "api_key": CLOUDINARY_API_KEY, "folder": folder}

@api.get("/admin/cloudinary/status")
async def cloudinary_status(user=Depends(get_current_admin)):
    return {"configured": bool(CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET),
            "cloud_name": CLOUDINARY_CLOUD_NAME}

# --- Media / Images library ---
@api.get("/admin/media")
async def list_media(user=Depends(get_current_admin)):
    return await db.media.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.post("/admin/media")
async def add_media(data: dict, user=Depends(get_current_admin)):
    if not data.get("url"):
        raise HTTPException(400, "URL required")
    doc = {"id": str(uuid.uuid4()), "url": data["url"], "name": data.get("name", "Untitled"),
           "tag": data.get("tag", ""), "public_id": data.get("public_id", ""),
           "created_at": now_iso()}
    await db.media.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.delete("/admin/media/{mid}")
async def delete_media(mid: str, user=Depends(get_current_admin)):
    m = await db.media.find_one({"id": mid}, {"_id": 0})
    if m and m.get("public_id") and CLOUDINARY_CLOUD_NAME:
        try:
            await asyncio.to_thread(cloudinary.uploader.destroy, m["public_id"], invalidate=True)
        except Exception as e:
            logger.error(f"Cloudinary destroy failed: {e}")
    await db.media.delete_one({"id": mid})
    return {"success": True}

# --- Stats ---
@api.get("/admin/stats")
async def stats(user=Depends(get_current_admin)):
    total_products = await db.products.count_documents({})
    total_orders = await db.orders.count_documents({})
    paid_orders = await db.orders.count_documents({"payment_status": "paid"})
    total_inquiries = await db.inquiries.count_documents({})
    low_stock = await db.products.count_documents({"stock": {"$lte": 5}})
    revenue_docs = await db.orders.find({"payment_status": "paid"}, {"total": 1, "_id": 0}).to_list(1000)
    revenue = round(sum(o.get("total", 0) for o in revenue_docs), 2)
    return {"products": total_products, "orders": total_orders, "paid_orders": paid_orders,
            "inquiries": total_inquiries, "low_stock": low_stock, "revenue": revenue}

app.include_router(api)

# --- Startup: seed admin + sample data ---
@app.on_event("startup")
async def startup():
    # indexes
    await db.users.create_index("email", unique=True)
    await db.products.create_index("slug", unique=True)
    await db.categories.create_index("slug", unique=True)
    await db.orders.create_index("id", unique=True)

    # seed admin
    existing = await db.users.find_one({"email": ADMIN_EMAIL.lower()})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": ADMIN_EMAIL.lower(),
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Rustic Bakes Admin", "role": "admin",
            "created_at": now_iso(),
        })
        logger.info("Admin user seeded")
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one({"email": ADMIN_EMAIL.lower()},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}})
        logger.info("Admin password updated from env")

    # seed categories + products if none
    if await db.categories.count_documents({}) == 0:
        cats = [
            {"name": "Artisan Breads", "slug": "breads", "description": "Slow-fermented sourdoughs and rustic loaves.",
             "image": "https://images.unsplash.com/photo-1586765501019-cbe3973ef8fa?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"},
            {"name": "Signature Cakes", "slug": "cakes", "description": "Handcrafted layered cakes for every celebration.",
             "image": "https://images.pexels.com/photos/2144112/pexels-photo-2144112.jpeg?auto=compress&cs=tinysrgb&w=800"},
            {"name": "Fresh Pastries", "slug": "pastries", "description": "Butter-laminated croissants and Danish delights.",
             "image": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"},
            {"name": "Cookies & Bites", "slug": "cookies", "description": "Chewy, crunchy, and everything in between.",
             "image": "https://images.unsplash.com/photo-1557310717-d6bea9f36682?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"},
        ]
        for c in cats:
            c["id"] = str(uuid.uuid4())
            c["created_at"] = now_iso()
        await db.categories.insert_many(cats)

    if await db.products.count_documents({}) == 0:
        prods = [
            {"name": "Country Sourdough Loaf", "slug": "country-sourdough-loaf", "category": "breads",
             "description": "48-hour naturally leavened sourdough with a crackling crust and open crumb.",
             "price": 320.00, "stock": 12, "lead_time_hours": 24, "is_featured": True,
             "image": "https://images.unsplash.com/photo-1586765501019-cbe3973ef8fa?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"},
            {"name": "Vanilla Bean Celebration Cake", "slug": "vanilla-bean-cake", "category": "cakes",
             "description": "Three layers of vanilla sponge, Madagascar bean buttercream, edible florals.",
             "price": 1450.00, "stock": 4, "lead_time_hours": 48, "is_featured": True,
             "image": "https://images.pexels.com/photos/2144112/pexels-photo-2144112.jpeg?auto=compress&cs=tinysrgb&w=800"},
            {"name": "Butter Croissant", "slug": "butter-croissant", "category": "pastries",
             "description": "27 layers of French butter, laminated by hand, baked to golden perfection.",
             "price": 180.00, "stock": 30, "lead_time_hours": 12, "is_featured": True,
             "image": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"},
            {"name": "Brown Butter Chocolate Chip", "slug": "brown-butter-choc-chip", "category": "cookies",
             "description": "Nutty brown butter, dark chocolate chunks, flaky sea salt. Sold in a box of 6.",
             "price": 420.00, "stock": 20, "lead_time_hours": 12, "is_featured": True,
             "image": "https://images.unsplash.com/photo-1557310717-d6bea9f36682?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"},
            {"name": "Seeded Multigrain", "slug": "seeded-multigrain", "category": "breads",
             "description": "Wholegrain flour, sunflower, flax, and sesame. Wholesome and hearty.",
             "price": 340.00, "stock": 8, "lead_time_hours": 24, "is_featured": False,
             "image": "https://images.unsplash.com/photo-1509440159596-0249088772ff?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"},
            {"name": "Chocolate Ganache Tart", "slug": "chocolate-ganache-tart", "category": "pastries",
             "description": "Dark chocolate ganache in a shortcrust pastry shell. Rich, dense, unforgettable.",
             "price": 650.00, "stock": 6, "lead_time_hours": 24, "is_featured": False,
             "image": "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"},
        ]
        for p in prods:
            p["id"] = str(uuid.uuid4())
            p["is_active"] = True
            p["created_at"] = now_iso()
            p["updated_at"] = now_iso()
        await db.products.insert_many(prods)

    # default site content
    default_content = {
        "hero": {"title": "Baked with Love,\nEvery Single Morning",
                 "subtitle": "Small-batch artisan bakes crafted from heirloom flours, real butter, and slow time.",
                 "cta": "Shop Fresh Today",
                 "image": "https://images.unsplash.com/photo-1632692166489-fd6568dee2e1?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600"},
        "about": {"heading": "Our Story",
                  "body": "Rustic Bakes by Daily Cravings began in a tiny home kitchen with one sourdough starter, a wooden spoon, and a stubborn belief that real bread takes time. Ten years later, we still measure our success not by scale, but by the quiet joy of a warm loaf handed across the counter.",
                  "image": "https://images.unsplash.com/photo-1536782896453-61d09f3aaf3e?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"},
        "contact": {"email": OWNER_EMAIL, "phone": "+1 (555) 234-5678",
                    "address": "12 Miller's Lane, Willow Creek", "hours": "Tue - Sun · 7am to 6pm"}
    }
    for k, v in default_content.items():
        if not await db.site_content.find_one({"key": k}):
            await db.site_content.insert_one({"key": k, "value": v, "updated_at": now_iso()})

@app.get("/")
async def root():
    return {"service": "Rustic Bakes API", "status": "ok"}
