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
CORS_ORIGINS = [origin.strip() for origin in os.environ.get("CORS_ORIGINS", "*").split(",") if origin.strip()]

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
    allow_origins=CORS_ORIGINS,
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
    referral_code: str = ""

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
    story: str = ""

class ReviewIn(BaseModel):
    product_slug: str
    rating: int = Field(5, ge=1, le=5)
    title: str = ""
    body: str
    image_url: str = ""

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
    gift_card_code: str = ""

class GiftCardPurchaseReq(BaseModel):
    amount: float = Field(gt=0)
    purchaser_name: str
    purchaser_email: EmailStr
    recipient_name: str
    recipient_email: EmailStr
    personal_message: str = ""
    origin_url: str

class BulkOrderReq(BaseModel):
    company_name: str
    contact_name: str
    email: EmailStr
    phone: str = ""
    gst_number: str = ""
    billing_address: str = ""
    delivery_date: str = ""
    quantity: int = Field(gt=0)
    product_preference: str = ""
    budget: str = ""
    notes: str = ""

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
    my_code = uid[:8].upper()
    referred_by = None
    if req.referral_code:
        ref = await db.users.find_one({"referral_code": req.referral_code.upper()})
        if ref: referred_by = ref["id"]
    await db.users.insert_one({
        "id": uid, "email": req.email.lower(),
        "password_hash": hash_password(req.password),
        "name": req.name, "phone": req.phone, "address": req.address,
        "role": "customer", "created_at": now_iso(),
        "referral_code": my_code, "referred_by": referred_by,
        "referrals_completed": 0,
    })
    token = create_token(uid, req.email.lower())
    return {"access_token": token, "token_type": "bearer",
            "user": {"id": uid, "email": req.email.lower(), "name": req.name,
                     "phone": req.phone, "address": req.address, "role": "customer",
                     "referral_code": my_code}}

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
    q = {"is_active": True, "stock": {"$gt": 0}}
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
    return await db.categories.find({}, {"_id": 0}).sort("name", 1).to_list(200)

@api.get("/categories/{slug}")
async def get_category(slug: str):
    c = await db.categories.find_one({"slug": slug}, {"_id": 0})
    if not c: raise HTTPException(404, "Not found")
    products = await db.products.find({"category": slug, "is_active": True}, {"_id": 0}).to_list(200)
    return {"category": c, "products": products}

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

# --- Reviews ---
@api.get("/reviews/featured")
async def featured_reviews():
    reviews = await db.reviews.find(
        {"status": "approved", "rating": {"$gte": 4}}, {"_id": 0}
    ).sort([("rating", -1), ("created_at", -1)]).limit(12).to_list(12)
    return reviews

@api.get("/products/{slug}/reviews")
async def list_reviews(slug: str):
    reviews = await db.reviews.find({"product_slug": slug, "status": "approved"}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return reviews

@api.post("/products/{slug}/reviews")
async def create_review(slug: str, r: ReviewIn, user=Depends(get_current_user)):
    prod = await db.products.find_one({"slug": slug})
    if not prod: raise HTTPException(404, "Product not found")
    doc = {"id": str(uuid.uuid4()), "product_slug": slug, "product_name": prod["name"],
           "user_id": user["id"], "user_name": user.get("name", "Customer"),
           "rating": r.rating, "title": r.title, "body": r.body, "image_url": r.image_url,
           "status": "approved", "created_at": now_iso()}
    await db.reviews.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/admin/reviews")
async def admin_list_reviews(user=Depends(get_current_admin)):
    return await db.reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.put("/admin/reviews/{rid}")
async def moderate_review(rid: str, data: dict, user=Depends(get_current_admin)):
    await db.reviews.update_one({"id": rid}, {"$set": {"status": data.get("status", "approved")}})
    return {"success": True}

@api.delete("/admin/reviews/{rid}")
async def delete_review(rid: str, user=Depends(get_current_admin)):
    await db.reviews.delete_one({"id": rid})
    return {"success": True}

# --- Loyalty ---
LOYALTY_PUNCHES_REQUIRED = 10

async def add_loyalty_punch(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user: return
    punches = user.get("punches", 0) + 1
    rewards = user.get("available_rewards", 0)
    if punches >= LOYALTY_PUNCHES_REQUIRED:
        rewards += 1
        punches = 0
    await db.users.update_one({"id": user_id}, {"$set": {"punches": punches, "available_rewards": rewards}})

REFERRALS_REQUIRED = 3

async def process_referral(buyer_user_id: str):
    """When a referred buyer completes a paid order, credit the referrer."""
    buyer = await db.users.find_one({"id": buyer_user_id})
    if not buyer or not buyer.get("referred_by"): return
    # Only credit on the buyer's FIRST paid order (prevent farming)
    paid_count = await db.orders.count_documents({"user_id": buyer_user_id, "payment_status": "paid"})
    if paid_count > 1: return
    referrer_id = buyer["referred_by"]
    referrer = await db.users.find_one({"id": referrer_id})
    if not referrer: return
    count = referrer.get("referrals_completed", 0) + 1
    rewards = referrer.get("available_rewards", 0)
    if count >= REFERRALS_REQUIRED:
        rewards += 1
        count = 0
        asyncio.create_task(send_whatsapp_text(
            f"🎁 Referral milestone!\n{referrer.get('name','Someone')} unlocked a free bake by inviting {REFERRALS_REQUIRED} friends."))
    await db.users.update_one({"id": referrer_id}, {"$set": {"referrals_completed": count, "available_rewards": rewards}})

@api.get("/referrals")
async def get_referrals(user=Depends(get_current_user)):
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    code = u.get("referral_code")
    if not code:
        # backfill for older users
        code = user["id"][:8].upper()
        await db.users.update_one({"id": user["id"]}, {"$set": {"referral_code": code}})
    return {"referral_code": code, "completed": u.get("referrals_completed", 0),
            "goal": REFERRALS_REQUIRED,
            "share_message": f"Try Rustic Bakes by Daily Cravings and use my code {code} for a warm welcome! Order at {os.environ.get('SITE_URL','')}?ref={code}"}

@api.get("/loyalty")
async def get_loyalty(user=Depends(get_current_user)):
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return {"punches": u.get("punches", 0), "available_rewards": u.get("available_rewards", 0),
            "goal": LOYALTY_PUNCHES_REQUIRED}

# --- Gift Cards ---
def gen_gift_code():
    import secrets
    return "GIFT-" + secrets.token_hex(4).upper()

@api.post("/gift-cards/purchase")
async def purchase_gift_card(req: GiftCardPurchaseReq):
    gc_id = str(uuid.uuid4())
    code = gen_gift_code()
    doc = {"id": gc_id, "code": code, "amount": float(req.amount), "balance": float(req.amount),
           "purchaser_name": req.purchaser_name, "purchaser_email": req.purchaser_email,
           "recipient_name": req.recipient_name, "recipient_email": req.recipient_email,
           "personal_message": req.personal_message, "status": "pending",
           "created_at": now_iso()}
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
        sc = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=f"{req.origin_url}/api/webhook/stripe")
        sess = await sc.create_checkout_session(CheckoutSessionRequest(
            amount=float(req.amount), currency="inr",
            success_url=f"{req.origin_url}/gift-cards/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{req.origin_url}/gift-cards",
            metadata={"gift_card_id": gc_id, "type": "gift_card"},
        ))
        doc["session_id"] = sess.session_id
        await db.gift_cards.insert_one(doc)
        return {"checkout_url": sess.url, "session_id": sess.session_id}
    except Exception as e:
        logger.error(f"Gift card checkout err: {e}")
        raise HTTPException(500, "Payment init failed")

async def deliver_gift_card(gc: dict):
    """Called after Stripe confirms gift-card payment."""
    try:
        html = f"""<div style='font-family:Georgia,serif;background:#F9F6F0;padding:32px;color:#4A3022'>
          <div style='max-width:600px;margin:auto;background:#fff;border-radius:16px;padding:32px'>
            <h1 style='font-family:Georgia,serif'>You've been gifted a Rustic Bakes treat</h1>
            <p>Hi {gc['recipient_name']}, {gc['purchaser_name']} sent you a gift card worth <strong>&#8377;{gc['amount']:.2f}</strong>.</p>
            {'<p style="background:#F3EFE6;padding:16px;border-radius:8px;font-style:italic">'+gc['personal_message']+'</p>' if gc.get('personal_message') else ''}
            <p>Use this code at checkout:</p>
            <div style='background:#4A3022;color:#F9F6F0;padding:16px;text-align:center;border-radius:12px;font-family:monospace;font-size:20px;letter-spacing:2px'>{gc['code']}</div>
            <p style='color:#7A5A4A;font-size:13px;margin-top:24px'>Redeem anytime · Baked with love</p>
          </div></div>"""
        if RESEND_API_KEY and not RESEND_API_KEY.startswith("re_placeholder"):
            await asyncio.to_thread(resend.Emails.send, {"from": SENDER_EMAIL, "to": [gc["recipient_email"]],
                "subject": f"You've been gifted a Rustic Bakes treat from {gc['purchaser_name']}", "html": html})
    except Exception as e:
        logger.error(f"Gift card email failed: {e}")

@api.get("/gift-cards/status/{session_id}")
async def gift_card_status(session_id: str):
    gc = await db.gift_cards.find_one({"session_id": session_id}, {"_id": 0})
    if not gc: raise HTTPException(404, "Not found")
    if gc["status"] == "pending":
        try:
            from emergentintegrations.payments.stripe.checkout import StripeCheckout
            sc = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
            s = await sc.get_checkout_status(session_id)
            if s.payment_status == "paid":
                await db.gift_cards.update_one({"session_id": session_id, "status": "pending"},
                    {"$set": {"status": "active", "activated_at": now_iso()}})
                gc["status"] = "active"
                asyncio.create_task(deliver_gift_card(gc))
        except Exception as e:
            logger.error(f"GC status err: {e}")
    return {"status": gc["status"], "code": gc["code"] if gc["status"] == "active" else None,
            "amount": gc["amount"], "recipient_email": gc["recipient_email"]}

@api.get("/gift-cards/check/{code}")
async def check_gift_card(code: str):
    gc = await db.gift_cards.find_one({"code": code.upper(), "status": "active"}, {"_id": 0, "purchaser_email": 0, "recipient_email": 0})
    if not gc: return {"valid": False}
    return {"valid": True, "balance": gc.get("balance", 0), "code": gc["code"]}

@api.get("/admin/gift-cards")
async def list_gift_cards(user=Depends(get_current_admin)):
    return await db.gift_cards.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

# --- Bulk Orders (Corporate RFQ) ---
@api.post("/bulk-orders")
async def create_bulk_order(req: BulkOrderReq):
    doc = req.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["status"] = "new"
    doc["created_at"] = now_iso()
    await db.bulk_orders.insert_one(doc)
    summary = (f"🏢 Bulk order enquiry — {doc['company_name']}\n"
               f"Contact: {doc['contact_name']} ({doc['email']}, {doc['phone']})\n"
               f"Quantity: {doc['quantity']} · Delivery: {doc['delivery_date']}\n"
               f"Preference: {doc.get('product_preference','—')}\n"
               f"Budget: {doc.get('budget','—')} · GST: {doc.get('gst_number','—')}")
    asyncio.create_task(send_whatsapp_text(summary))
    return {"success": True, "id": doc["id"]}

@api.get("/admin/bulk-orders")
async def list_bulk_orders(user=Depends(get_current_admin)):
    return await db.bulk_orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(300)

@api.put("/admin/bulk-orders/{bid}")
async def update_bulk_order(bid: str, data: dict, user=Depends(get_current_admin)):
    await db.bulk_orders.update_one({"id": bid}, {"$set": {"status": data.get("status", "new")}})
    return {"success": True}

# --- Wishlist ---
@api.get("/wishlist")
async def get_wishlist(user=Depends(get_current_user)):
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    ids = u.get("wishlist", []) if u else []
    if not ids: return []
    products = await db.products.find({"id": {"$in": ids}, "is_active": True}, {"_id": 0}).to_list(100)
    return products

@api.post("/wishlist/{product_id}")
async def toggle_wishlist(product_id: str, user=Depends(get_current_user)):
    u = await db.users.find_one({"id": user["id"]})
    wl = u.get("wishlist", []) if u else []
    if product_id in wl:
        wl.remove(product_id)
        action = "removed"
    else:
        wl.append(product_id)
        action = "added"
    await db.users.update_one({"id": user["id"]}, {"$set": {"wishlist": wl}})
    return {"action": action, "wishlist": wl}

# --- Delivery Zones ---
@api.get("/delivery/check/{pincode}")
async def check_delivery(pincode: str):
    zone = await db.delivery_zones.find_one({"pincode": pincode}, {"_id": 0})
    if not zone:
        # Check prefix match (first 3 digits)
        zone = await db.delivery_zones.find_one({"pincode": pincode[:3] + "xxx"}, {"_id": 0})
    if zone:
        return {"servable": True, "area": zone["area"], "delivery_window": zone["delivery_window"],
                "fee": zone.get("fee", 0)}
    return {"servable": False, "message": "Sorry, we don't deliver to this pincode yet. Contact us for special arrangements."}

@api.get("/admin/delivery-zones")
async def list_zones(user=Depends(get_current_admin)):
    return await db.delivery_zones.find({}, {"_id": 0}).sort("pincode", 1).to_list(500)

@api.post("/admin/delivery-zones")
async def create_zone(data: dict, user=Depends(get_current_admin)):
    if not data.get("pincode") or not data.get("area"):
        raise HTTPException(400, "Pincode and area required")
    doc = {"id": str(uuid.uuid4()), "pincode": str(data["pincode"]), "area": data["area"],
           "delivery_window": data.get("delivery_window", "Same day"),
           "fee": float(data.get("fee", 0)), "created_at": now_iso()}
    await db.delivery_zones.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.delete("/admin/delivery-zones/{zid}")
async def delete_zone(zid: str, user=Depends(get_current_admin)):
    await db.delivery_zones.delete_one({"id": zid})
    return {"success": True}

# --- Custom Cake Requests ---
@api.post("/custom-cake")
async def create_custom_cake(data: dict, request: Request):
    user = await get_optional_user(request)
    doc = {"id": str(uuid.uuid4()),
           "flavour": data.get("flavour", ""), "size": data.get("size", ""),
           "colour": data.get("colour", ""), "layers": data.get("layers", 1),
           "message_on_cake": data.get("message_on_cake", ""),
           "customer_name": data.get("customer_name", ""),
           "customer_email": data.get("customer_email", ""),
           "customer_phone": data.get("customer_phone", ""),
           "notes": data.get("notes", ""),
           "estimated_price": float(data.get("estimated_price", 1200)),
           "needed_by": data.get("needed_by", ""),
           "status": "new",
           "user_id": user["id"] if user else None,
           "created_at": now_iso()}
    await db.custom_cake_requests.insert_one(doc)
    # notify owner
    summary = (f"🎂 New custom-cake request\n"
               f"Flavour: {doc['flavour']}\nSize: {doc['size']}\nLayers: {doc['layers']}\n"
               f"Colour: {doc['colour']}\nMessage: {doc['message_on_cake']}\n"
               f"Customer: {doc['customer_name']} · {doc['customer_email']}\n"
               f"Needed by: {doc['needed_by']}\nEstimated: ₹{doc['estimated_price']:.2f}")
    asyncio.create_task(send_whatsapp_text(summary))
    return {"success": True, "id": doc["id"]}

@api.get("/admin/custom-cakes")
async def list_custom_cakes(user=Depends(get_current_admin)):
    return await db.custom_cake_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)

@api.put("/admin/custom-cakes/{cid}")
async def update_custom_cake(cid: str, data: dict, user=Depends(get_current_admin)):
    await db.custom_cake_requests.update_one({"id": cid}, {"$set": {"status": data.get("status", "new")}})
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
async def send_sold_out_alert(product: dict):
    subject = f"Sold out: {product['name']}"
    body = f"'{product['name']}' just hit 0 stock and is now hidden from the shop. Restock and update inventory when ready."
    try:
        if RESEND_API_KEY and not RESEND_API_KEY.startswith("re_placeholder"):
            html = f"<div style='font-family:Georgia;color:#4A3022;padding:24px'><h2>🥐 {subject}</h2><p>{body}</p><p><a href='#' style='color:#B85450'>Update inventory</a></p></div>"
            await asyncio.to_thread(resend.Emails.send, {
                "from": SENDER_EMAIL, "to": [OWNER_EMAIL], "subject": subject, "html": html})
    except Exception as e:
        logger.error(f"Sold-out email failed: {e}")
    asyncio.create_task(send_whatsapp_text(f"⚠️ {subject}\n\n{body}"))

async def decrement_stock_and_alert(order_items: list):
    for it in order_items:
        pid = it.get("product_id")
        qty = it.get("quantity", 1)
        if not pid: continue
        # decrement atomically
        result = await db.products.find_one_and_update(
            {"id": pid, "stock": {"$gte": qty}},
            {"$inc": {"stock": -qty}},
            return_document=True,
        )
        if result and result.get("stock", 0) == 0:
            asyncio.create_task(send_sold_out_alert(result))

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
    gift_discount = 0.0
    gift_card_code = None
    if req.gift_card_code:
        gc = await db.gift_cards.find_one({"code": req.gift_card_code.upper(), "status": "active"})
        if gc and gc.get("balance", 0) > 0:
            gift_discount = min(gc["balance"], total)
            gift_card_code = gc["code"]
    final_total = max(0, round(total - gift_discount, 2))
    order_id = str(uuid.uuid4())
    user = await get_optional_user(request)
    order = {
        "id": order_id, "items": [i.model_dump() for i in req.items],
        "subtotal": total, "gift_discount": gift_discount, "gift_card_code": gift_card_code,
        "total": final_total, "currency": "inr",
        "customer_name": req.customer_name, "customer_email": req.customer_email,
        "customer_phone": req.customer_phone, "delivery_address": req.delivery_address,
        "notes": req.notes, "status": "pending", "payment_status": "pending",
        "user_id": user["id"] if user else None,
        "created_at": now_iso(), "updated_at": now_iso(),
    }

    # If the gift card covers the full order, no Stripe checkout needed
    if final_total <= 0:
        order["payment_status"] = "paid"
        order["status"] = "confirmed"
        order["session_id"] = f"giftcard-{order_id}"
        await db.orders.insert_one(order)
        # deduct gift card balance
        await db.gift_cards.update_one({"code": gift_card_code},
            {"$inc": {"balance": -gift_discount}})
        asyncio.create_task(send_order_confirmation(order))
        asyncio.create_task(decrement_stock_and_alert(order["items"]))
        if order.get("user_id"):
            await add_loyalty_punch(order["user_id"])
            await process_referral(order["user_id"])
        return {"checkout_url": f"{req.origin_url}/payment/success?session_id={order['session_id']}",
                "session_id": order["session_id"], "order_id": order_id, "free": True}

    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
        webhook_url = f"{req.origin_url}/api/webhook/stripe"
        sc = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        sess_req = CheckoutSessionRequest(
            amount=float(final_total), currency="inr",
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
            s = await sc.get_checkout_status(session_id)
            if s.payment_status == "paid":
                # Look up as order first
                order2 = await db.orders.find_one({"session_id": session_id, "payment_status": {"$ne":"paid"}})
                if order2:
                    await db.orders.update_one({"session_id": session_id, "payment_status": {"$ne": "paid"}},
                        {"$set": {"payment_status": "paid", "status": "confirmed", "updated_at": now_iso()}})
                    if order2.get("gift_card_code") and order2.get("gift_discount", 0) > 0:
                        await db.gift_cards.update_one({"code": order2["gift_card_code"]},
                            {"$inc": {"balance": -order2["gift_discount"]}})
                    order2["payment_status"] = "paid"
                    order2["status"] = "confirmed"
                    order = order2
                    asyncio.create_task(send_order_confirmation(order))
                    asyncio.create_task(decrement_stock_and_alert(order["items"]))
                    if order.get("user_id"):
                        await add_loyalty_punch(order["user_id"])
                        await process_referral(order["user_id"])
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
                asyncio.create_task(decrement_stock_and_alert(order["items"]))
                if order.get("user_id"):
                    await process_referral(order["user_id"])
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

@api.get("/admin/dashboard")
async def dashboard(user=Depends(get_current_admin)):
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    # revenue trend last 7 days
    trend = []
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).date()
        start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc).isoformat()
        end = (datetime(day.year, day.month, day.day, tzinfo=timezone.utc) + timedelta(days=1)).isoformat()
        docs = await db.orders.find(
            {"payment_status": "paid", "created_at": {"$gte": start, "$lt": end}},
            {"total": 1, "_id": 0}
        ).to_list(500)
        trend.append({"date": day.isoformat(), "revenue": round(sum(d.get("total", 0) for d in docs), 2),
                      "count": len(docs)})

    # best sellers — aggregate items across paid orders
    paid = await db.orders.find({"payment_status": "paid"}, {"items": 1, "_id": 0}).to_list(500)
    totals = {}
    for o in paid:
        for it in o.get("items", []):
            k = it.get("product_id") or it.get("name")
            if k not in totals:
                totals[k] = {"name": it["name"], "image": it.get("image", ""), "qty": 0, "revenue": 0.0}
            totals[k]["qty"] += it.get("quantity", 1)
            totals[k]["revenue"] += it.get("price", 0) * it.get("quantity", 1)
    best_sellers = sorted(totals.values(), key=lambda x: x["qty"], reverse=True)[:5]
    for b in best_sellers: b["revenue"] = round(b["revenue"], 2)

    # recent orders
    recent = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(6).to_list(6)

    # recent inquiries
    recent_inq = await db.inquiries.find({}, {"_id": 0}).sort("created_at", -1).limit(4).to_list(4)

    return {"revenue_trend": trend, "best_sellers": best_sellers,
            "recent_orders": recent, "recent_inquiries": recent_inq}

# --- Sales Report (PDF) ---
from fastapi.responses import Response

@api.get("/admin/reports/sales")
async def sales_report(year: int, month: int, user=Depends(get_current_admin)):
    from datetime import datetime, timedelta, timezone
    from fpdf import FPDF
    from io import BytesIO
    from calendar import monthrange
    if month < 1 or month > 12: raise HTTPException(400, "Invalid month")
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    last_day = monthrange(year, month)[1]
    end = datetime(year, month, last_day, 23, 59, 59, tzinfo=timezone.utc)
    orders = await db.orders.find(
        {"payment_status": "paid",
         "created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}},
        {"_id": 0}
    ).sort("created_at", 1).to_list(2000)

    total_revenue = round(sum(o.get("total", 0) for o in orders), 2)
    total_orders = len(orders)
    avg_order = round(total_revenue / total_orders, 2) if total_orders else 0

    # aggregate items
    item_totals = {}
    for o in orders:
        for it in o.get("items", []):
            k = it["name"]
            if k not in item_totals: item_totals[k] = {"qty": 0, "revenue": 0.0}
            item_totals[k]["qty"] += it.get("quantity", 1)
            item_totals[k]["revenue"] += it.get("price", 0) * it.get("quantity", 1)
    top_items = sorted(item_totals.items(), key=lambda x: x[1]["revenue"], reverse=True)

    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    # Colors (RGB from design)
    BROWN = (74, 48, 34); BLUSH = (216, 157, 163); MUTED = (166, 138, 122)

    # Header
    pdf.set_fill_color(74, 48, 34)
    pdf.rect(0, 0, 210, 40, style="F")
    pdf.set_text_color(249, 246, 240)
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_xy(15, 12)
    pdf.cell(180, 8, "Rustic Bakes by Daily Cravings", ln=1)
    pdf.set_font("Helvetica", "I", 11)
    pdf.set_xy(15, 22)
    pdf.cell(180, 6, "Monthly Sales Report", ln=1)
    month_name = start.strftime("%B %Y")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_xy(15, 30)
    pdf.cell(180, 5, month_name, ln=1)

    # Summary tiles
    pdf.set_y(55)
    pdf.set_text_color(*BROWN)
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 8, "Summary", ln=1)
    pdf.ln(2)

    def tile(x, y, label, value):
        pdf.set_fill_color(243, 239, 230)
        pdf.rect(x, y, 55, 22, style="F")
        pdf.set_xy(x + 3, y + 3)
        pdf.set_text_color(*MUTED)
        pdf.set_font("Helvetica", "", 8)
        pdf.cell(50, 4, label.upper(), ln=0)
        pdf.set_xy(x + 3, y + 10)
        pdf.set_text_color(*BROWN)
        pdf.set_font("Helvetica", "B", 14)
        pdf.cell(50, 6, value, ln=0)

    y = pdf.get_y()
    tile(15, y, "Total Revenue", f"Rs. {total_revenue:,.2f}")
    tile(77, y, "Paid Orders", f"{total_orders}")
    tile(139, y, "Avg Order", f"Rs. {avg_order:,.2f}")
    pdf.set_y(y + 30)

    # Top items table
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(*BROWN)
    pdf.cell(0, 8, "Best-selling items", ln=1)
    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_fill_color(74, 48, 34)
    pdf.set_text_color(249, 246, 240)
    pdf.cell(90, 8, "Product", border=0, fill=True)
    pdf.cell(30, 8, "Qty", border=0, fill=True, align="R")
    pdf.cell(40, 8, "Revenue", border=0, fill=True, align="R", ln=1)
    pdf.set_text_color(*BROWN)
    pdf.set_font("Helvetica", "", 10)
    for i, (name, agg) in enumerate(top_items[:15]):
        if i % 2 == 0:
            pdf.set_fill_color(249, 246, 240)
            fill = True
        else:
            fill = False
        pdf.cell(90, 7, name[:55], fill=fill)
        pdf.cell(30, 7, str(agg["qty"]), align="R", fill=fill)
        pdf.cell(40, 7, f"Rs. {agg['revenue']:,.2f}", align="R", fill=fill, ln=1)

    if not top_items:
        pdf.set_font("Helvetica", "I", 10)
        pdf.set_text_color(*MUTED)
        pdf.cell(0, 8, "No paid orders in this period.", ln=1)

    # Orders list
    pdf.ln(6)
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(*BROWN)
    pdf.cell(0, 8, "Order log", ln=1)
    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(74, 48, 34)
    pdf.set_text_color(249, 246, 240)
    pdf.cell(35, 7, "Date", fill=True)
    pdf.cell(30, 7, "Order #", fill=True)
    pdf.cell(50, 7, "Customer", fill=True)
    pdf.cell(45, 7, "Email", fill=True)
    pdf.cell(30, 7, "Total", fill=True, align="R", ln=1)
    pdf.set_text_color(*BROWN)
    pdf.set_font("Helvetica", "", 9)
    for i, o in enumerate(orders):
        fill = i % 2 == 0
        if fill: pdf.set_fill_color(249, 246, 240)
        dt = o.get("created_at", "")[:10]
        pdf.cell(35, 6, dt, fill=fill)
        pdf.cell(30, 6, o["id"][:8], fill=fill)
        pdf.cell(50, 6, (o.get("customer_name") or "")[:28], fill=fill)
        pdf.cell(45, 6, (o.get("customer_email") or "")[:25], fill=fill)
        pdf.cell(30, 6, f"Rs. {o.get('total',0):,.2f}", align="R", fill=fill, ln=1)

    # Footer
    pdf.set_y(-20)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(*MUTED)
    pdf.cell(0, 5, f"Generated {datetime.now(timezone.utc).strftime('%d %b %Y %H:%M UTC')} - Rustic Bakes by Daily Cravings", ln=1, align="C")

    buf = BytesIO()
    pdf_bytes = pdf.output(dest="S")
    if isinstance(pdf_bytes, str): pdf_bytes = pdf_bytes.encode("latin-1")
    buf.write(bytes(pdf_bytes))
    buf.seek(0)
    filename = f"rustic-bakes-sales-{year}-{month:02d}.pdf"
    return Response(content=buf.read(), media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})

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
        img = lambda u: f"https://images.unsplash.com/{u}?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"
        cats = [
            {"name": "All Cakes", "slug": "all-cakes", "description": "Every celebration cake we bake.",
             "image": "https://images.pexels.com/photos/2144112/pexels-photo-2144112.jpeg?auto=compress&cs=tinysrgb&w=800"},
            {"name": "Bento Cakes", "slug": "bento-cakes", "description": "Petite handheld cakes for two.",
             "image": img("photo-1621303837174-89787a7d4729")},
            {"name": "Cheese Cake", "slug": "cheese-cake", "description": "Classic baked and no-bake cheesecakes.",
             "image": img("photo-1533134242443-d4fd215305ad")},
            {"name": "Cheese Cake Slice", "slug": "cheese-cake-slice", "description": "Grab-and-go slices of pure joy.",
             "image": img("photo-1524351199678-941a58a3df50")},
            {"name": "Corporate Offer", "slug": "corporate-offer", "description": "Bulk gifting for offices and events.",
             "image": img("photo-1486427944299-d1955d23e34d")},
            {"name": "Cup Cakes", "slug": "cup-cakes", "description": "Little frosted delights in every flavour.",
             "image": img("photo-1587668178277-295251f900ce")},
            {"name": "Customize Cake", "slug": "customize-cake", "description": "Made-to-order for your special day.",
             "image": img("photo-1535254973040-607b474cb50d")},
            {"name": "Donuts", "slug": "donuts", "description": "Soft, glazed rings of happiness.",
             "image": img("photo-1551024506-0bccd828d307")},
            {"name": "Dry Cakes", "slug": "dry-cakes", "description": "Tea-time loaves and pound cakes.",
             "image": img("photo-1509440159596-0249088772ff")},
            {"name": "Instant Delivery", "slug": "instant-delivery", "description": "Ready in an hour · same-day pickup.",
             "image": img("photo-1558961363-fa8fdf82db35")},
            {"name": "Premium Cakes", "slug": "premium-cakes", "description": "Our signature showstoppers.",
             "image": img("photo-1578985545062-69928b1d9587")},
        ]
        for c in cats:
            c["id"] = str(uuid.uuid4())
            c["created_at"] = now_iso()
        await db.categories.insert_many(cats)

    if await db.products.count_documents({}) == 0:
        prods = [
            {"name": "Classic New York Cheesecake", "slug": "ny-cheesecake", "category": "cheese-cake",
             "description": "Rich, dense baked cheesecake with a buttery biscuit base and vanilla bean speckles.",
             "price": 950.00, "stock": 8, "lead_time_hours": 24, "is_featured": True,
             "image": "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"},
            {"name": "Blueberry Cheesecake Slice", "slug": "blueberry-cheesecake-slice", "category": "cheese-cake-slice",
             "description": "A single slice of creamy cheesecake topped with wild-blueberry compote.",
             "price": 220.00, "stock": 20, "lead_time_hours": 6, "is_featured": True,
             "image": "https://images.unsplash.com/photo-1524351199678-941a58a3df50?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"},
            {"name": "Chocolate Truffle Bento", "slug": "chocolate-bento", "category": "bento-cakes",
             "description": "Palm-sized chocolate truffle bento, hand-decorated. Perfect for a moment of joy.",
             "price": 550.00, "stock": 12, "lead_time_hours": 12, "is_featured": True,
             "image": "https://images.unsplash.com/photo-1621303837174-89787a7d4729?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"},
            {"name": "Vanilla Bean Cupcake (Box of 6)", "slug": "vanilla-cupcake-6", "category": "cup-cakes",
             "description": "Six fluffy vanilla-bean cupcakes topped with Swiss meringue buttercream.",
             "price": 480.00, "stock": 15, "lead_time_hours": 12, "is_featured": False,
             "image": "https://images.unsplash.com/photo-1587668178277-295251f900ce?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"},
            {"name": "Marble Tea-Time Loaf", "slug": "marble-loaf", "category": "dry-cakes",
             "description": "A gentle vanilla-and-chocolate marbled loaf. Ideal with an afternoon cup of chai.",
             "price": 380.00, "stock": 10, "lead_time_hours": 12, "is_featured": False,
             "image": "https://images.unsplash.com/photo-1509440159596-0249088772ff?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"},
            {"name": "Glazed Sugar Donut (Box of 6)", "slug": "sugar-donut-6", "category": "donuts",
             "description": "Pillow-soft donuts with a delicate sugar glaze.",
             "price": 320.00, "stock": 18, "lead_time_hours": 8, "is_featured": True,
             "image": "https://images.unsplash.com/photo-1551024506-0bccd828d307?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"},
            {"name": "Red Velvet Premium Cake", "slug": "red-velvet-premium", "category": "premium-cakes",
             "description": "Three layers of scarlet sponge, cream-cheese frosting, hand-piped rosettes.",
             "price": 1650.00, "stock": 4, "lead_time_hours": 48, "is_featured": True,
             "image": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"},
            {"name": "Corporate Gifting Box (12 pcs)", "slug": "corporate-box-12", "category": "corporate-offer",
             "description": "Assorted bakes in a branded box. Add your company card for an extra touch.",
             "price": 2400.00, "stock": 6, "lead_time_hours": 48, "is_featured": False,
             "image": "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"},
            {"name": "Same-Day Chocolate Delight", "slug": "instant-choco-delight", "category": "instant-delivery",
             "description": "Ready in 60 minutes. Dense chocolate ganache cake for last-minute celebrations.",
             "price": 890.00, "stock": 5, "lead_time_hours": 1, "is_featured": True,
             "image": "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"},
            {"name": "Design Your Own Cake", "slug": "customize-your-cake", "category": "customize-cake",
             "description": "Start from ₹1,200 · pick flavour, size, colours and message. 48-hour lead time.",
             "price": 1200.00, "stock": 50, "lead_time_hours": 48, "is_featured": False,
             "image": "https://images.unsplash.com/photo-1535254973040-607b474cb50d?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"},
            {"name": "Rainbow Celebration Cake", "slug": "rainbow-celebration", "category": "all-cakes",
             "description": "Six coloured sponge layers, vanilla buttercream, a childhood favourite.",
             "price": 1350.00, "stock": 5, "lead_time_hours": 48, "is_featured": False,
             "image": "https://images.pexels.com/photos/2144112/pexels-photo-2144112.jpeg?auto=compress&cs=tinysrgb&w=800"},
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

    # seed delivery zones (India example - major metro pincodes)
    if await db.delivery_zones.count_documents({}) == 0:
        zones = [
            {"pincode": "110001", "area": "Central Delhi", "delivery_window": "Same day · 2-4 hrs", "fee": 80},
            {"pincode": "110020", "area": "South Delhi", "delivery_window": "Same day · 2-4 hrs", "fee": 80},
            {"pincode": "122001", "area": "Gurgaon", "delivery_window": "Same day · 3-5 hrs", "fee": 120},
            {"pincode": "201301", "area": "Noida", "delivery_window": "Same day · 3-5 hrs", "fee": 120},
            {"pincode": "400001", "area": "South Mumbai", "delivery_window": "Same day · 3-6 hrs", "fee": 150},
            {"pincode": "560001", "area": "Central Bangalore", "delivery_window": "Same day · 2-4 hrs", "fee": 100},
            {"pincode": "110xxx", "area": "Delhi NCR (general)", "delivery_window": "Next day", "fee": 150},
        ]
        for z in zones:
            z["id"] = str(uuid.uuid4())
            z["created_at"] = now_iso()
        await db.delivery_zones.insert_many(zones)

@app.get("/")
async def root():
    return {"service": "Rustic Bakes API", "status": "ok"}
