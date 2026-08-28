"""Backend API tests for Rustic Bakes by Daily Cravings."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
pytestmark = pytest.mark.skipif(
    not BASE_URL,
    reason="Set REACT_APP_BACKEND_URL to run backend integration tests",
)
BASE_URL = BASE_URL or "http://127.0.0.1:8001"

API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@rusticbakes.com"
ADMIN_PASSWORD = "RusticBakes@2026"


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "admin"
    return data["access_token"]


@pytest.fixture(scope="session")
def customer_creds():
    return {
        "email": f"TEST_user_{uuid.uuid4().hex[:8]}@example.com",
        "password": "TestPass123!",
        "name": "TEST User",
        "phone": "9999999999",
        "address": "TEST Address",
    }


@pytest.fixture(scope="session")
def customer_token(session, customer_creds):
    r = session.post(f"{API}/auth/register", json=customer_creds)
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "customer"
    return data["access_token"]


def admin_hdr(t): return {"Authorization": f"Bearer {t}", "Content-Type": "application/json"}


# ---------------- Products ----------------
class TestProducts:
    def test_list_products_has_6(self, session):
        r = session.get(f"{API}/products")
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 6, f"expected >=6 seeded products, got {len(items)}"
        for p in items:
            assert 300 <= p["price"] <= 1500 or p["price"] in (180.0, 180), f"price out of range: {p['price']}"

    def test_products_featured_filter(self, session):
        r = session.get(f"{API}/products", params={"featured": "true"})
        assert r.status_code == 200
        items = r.json()
        assert all(p["is_featured"] for p in items)
        assert len(items) >= 1

    def test_products_category_filter(self, session):
        r = session.get(f"{API}/products", params={"category": "breads"})
        assert r.status_code == 200
        items = r.json()
        assert all(p["category"] == "breads" for p in items)
        assert len(items) >= 1

    def test_product_by_slug(self, session):
        r = session.get(f"{API}/products/country-sourdough-loaf")
        assert r.status_code == 200
        assert r.json()["slug"] == "country-sourdough-loaf"

    def test_product_unknown_slug_404(self, session):
        r = session.get(f"{API}/products/rustic-craving")
        assert r.status_code == 404


# ---------------- Categories ----------------
class TestCategories:
    def test_list_categories(self, session):
        r = session.get(f"{API}/categories")
        assert r.status_code == 200
        cats = r.json()
        slugs = {c["slug"] for c in cats}
        assert {"breads", "cakes", "pastries", "cookies"}.issubset(slugs)


# ---------------- Content ----------------
class TestContent:
    @pytest.mark.parametrize("key", ["hero", "about", "contact"])
    def test_content_keys(self, session, key):
        r = session.get(f"{API}/content/{key}")
        assert r.status_code == 200
        data = r.json()
        assert data.get("key") == key
        assert isinstance(data.get("value"), dict) and data["value"]


# ---------------- Auth ----------------
class TestAuth:
    def test_register_and_duplicate(self, session):
        email = f"TEST_dup_{uuid.uuid4().hex[:6]}@example.com"
        payload = {"email": email, "password": "Pass1234!", "name": "Dup"}
        r1 = session.post(f"{API}/auth/register", json=payload)
        assert r1.status_code == 200
        assert r1.json()["user"]["role"] == "customer"
        r2 = session.post(f"{API}/auth/register", json=payload)
        assert r2.status_code == 400

    def test_admin_login(self, admin_token):
        assert isinstance(admin_token, str) and len(admin_token) > 20

    def test_customer_login(self, session, customer_creds, customer_token):
        r = session.post(f"{API}/auth/login", json={"email": customer_creds["email"], "password": customer_creds["password"]})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "customer"

    def test_me_customer(self, session, customer_token, customer_creds):
        r = session.get(f"{API}/auth/me", headers=admin_hdr(customer_token))
        assert r.status_code == 200
        assert r.json()["email"] == customer_creds["email"].lower()

    def test_me_admin(self, session, admin_token):
        r = session.get(f"{API}/auth/me", headers=admin_hdr(admin_token))
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_profile_update_and_password_change(self, session, customer_creds):
        # separate user so we don't invalidate the shared customer_token
        email = f"TEST_prof_{uuid.uuid4().hex[:6]}@example.com"
        reg = session.post(f"{API}/auth/register", json={"email": email, "password": "Pass1234!", "name": "P"})
        tok = reg.json()["access_token"]
        r = session.put(f"{API}/auth/profile",
                        headers=admin_hdr(tok),
                        json={"name": "New Name", "phone": "111", "address": "New Addr"})
        assert r.status_code == 200
        me = session.get(f"{API}/auth/me", headers=admin_hdr(tok)).json()
        assert me["name"] == "New Name" and me["phone"] == "111" and me["address"] == "New Addr"
        # password change
        r2 = session.put(f"{API}/auth/profile", headers=admin_hdr(tok), json={"password": "NewPass456!"})
        assert r2.status_code == 200
        lr = session.post(f"{API}/auth/login", json={"email": email, "password": "NewPass456!"})
        assert lr.status_code == 200

    def test_my_orders_empty(self, session, customer_token):
        r = session.get(f"{API}/auth/orders", headers=admin_hdr(customer_token))
        assert r.status_code == 200
        assert r.json() == []


# ---------------- Inquiries ----------------
class TestInquiries:
    def test_create_inquiry(self, session):
        r = session.post(f"{API}/inquiries", json={
            "name": "TEST Inq", "email": "test_inq@example.com",
            "phone": "123", "subject": "Hello", "message": "Test message"})
        assert r.status_code == 200
        assert r.json()["success"] is True

    def test_admin_inquiries_requires_admin(self, session, customer_token):
        # no token
        r = session.get(f"{API}/admin/inquiries")
        assert r.status_code == 401
        # customer token
        r2 = session.get(f"{API}/admin/inquiries", headers=admin_hdr(customer_token))
        assert r2.status_code == 403

    def test_admin_inquiries_ok(self, session, admin_token):
        r = session.get(f"{API}/admin/inquiries", headers=admin_hdr(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------------- Admin CRUD ----------------
class TestAdminCRUD:
    def test_stats(self, session, admin_token):
        r = session.get(f"{API}/admin/stats", headers=admin_hdr(admin_token))
        assert r.status_code == 200
        d = r.json()
        for k in ("products", "orders", "paid_orders", "revenue", "inquiries", "low_stock"):
            assert k in d

    def test_products_crud(self, session, admin_token):
        slug = f"test-prod-{uuid.uuid4().hex[:6]}"
        payload = {"name": "TEST Prod", "slug": slug, "price": 999.0,
                   "category": "breads", "stock": 5, "is_featured": False}
        r = session.post(f"{API}/admin/products", headers=admin_hdr(admin_token), json=payload)
        assert r.status_code == 200
        pid = r.json()["id"]
        # GET via public slug
        gp = session.get(f"{API}/products/{slug}")
        assert gp.status_code == 200 and gp.json()["price"] == 999.0
        # PUT
        payload["price"] = 1234.0
        u = session.put(f"{API}/admin/products/{pid}", headers=admin_hdr(admin_token), json=payload)
        assert u.status_code == 200
        gp2 = session.get(f"{API}/products/{slug}").json()
        assert gp2["price"] == 1234.0
        # DELETE
        d = session.delete(f"{API}/admin/products/{pid}", headers=admin_hdr(admin_token))
        assert d.status_code == 200
        assert session.get(f"{API}/products/{slug}").status_code == 404

    def test_categories_crud(self, session, admin_token):
        slug = f"test-cat-{uuid.uuid4().hex[:6]}"
        r = session.post(f"{API}/admin/categories", headers=admin_hdr(admin_token),
                         json={"name": "TEST Cat", "slug": slug})
        assert r.status_code == 200
        cid = r.json()["id"]
        u = session.put(f"{API}/admin/categories/{cid}", headers=admin_hdr(admin_token),
                        json={"name": "TEST Cat 2", "slug": slug})
        assert u.status_code == 200
        d = session.delete(f"{API}/admin/categories/{cid}", headers=admin_hdr(admin_token))
        assert d.status_code == 200

    def test_media_crud(self, session, admin_token):
        r = session.post(f"{API}/admin/media", headers=admin_hdr(admin_token),
                         json={"url": "https://example.com/x.jpg", "name": "TEST img"})
        assert r.status_code == 200
        mid = r.json()["id"]
        lst = session.get(f"{API}/admin/media", headers=admin_hdr(admin_token))
        assert lst.status_code == 200 and any(m["id"] == mid for m in lst.json())
        d = session.delete(f"{API}/admin/media/{mid}", headers=admin_hdr(admin_token))
        assert d.status_code == 200

    def test_content_upsert(self, session, admin_token):
        r = session.put(f"{API}/admin/content", headers=admin_hdr(admin_token),
                        json={"key": "hero", "value": {"title": "TEST Hero", "subtitle": "s", "cta": "c", "image": "i"}})
        assert r.status_code == 200
        g = session.get(f"{API}/content/hero").json()
        assert g["value"]["title"] == "TEST Hero"

    def test_orders_admin(self, session, admin_token):
        r = session.get(f"{API}/admin/orders", headers=admin_hdr(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_payment_settings(self, session, admin_token):
        r = session.get(f"{API}/admin/payment-settings", headers=admin_hdr(admin_token))
        assert r.status_code == 200
        v = r.json().get("value") or r.json()
        # currency should be inr
        currency = v.get("currency") if isinstance(v, dict) else None
        assert currency == "inr"
        u = session.put(f"{API}/admin/payment-settings", headers=admin_hdr(admin_token),
                        json={"provider": "stripe", "mode": "test", "publishable_key": "pk_test", "currency": "inr"})
        assert u.status_code == 200


# ---------------- Auth guards ----------------
class TestAuthGuards:
    @pytest.mark.parametrize("path", [
        "/admin/stats", "/admin/orders", "/admin/products",
        "/admin/inquiries", "/admin/media", "/admin/payment-settings",
    ])
    def test_no_token_401(self, session, path):
        r = session.get(f"{API}{path}")
        assert r.status_code == 401

    @pytest.mark.parametrize("path", [
        "/admin/stats", "/admin/orders", "/admin/products",
        "/admin/inquiries", "/admin/media", "/admin/payment-settings",
    ])
    def test_customer_token_403(self, session, customer_token, path):
        r = session.get(f"{API}{path}", headers=admin_hdr(customer_token))
        assert r.status_code == 403


# ---------------- Payments ----------------
class TestPayments:
    def test_checkout_empty_cart_400(self, session):
        r = session.post(f"{API}/payments/checkout", json={
            "items": [], "customer_name": "T", "customer_email": "t@t.com",
            "origin_url": BASE_URL})
        assert r.status_code == 400

    def test_checkout_creates_session(self, session, customer_token):
        r = session.post(f"{API}/payments/checkout",
                         headers=admin_hdr(customer_token),
                         json={
            "items": [{"product_id": "p1", "name": "Sourdough", "price": 320.0, "quantity": 2}],
            "customer_name": "TEST Buyer", "customer_email": "buyer@example.com",
            "customer_phone": "111", "delivery_address": "Addr", "notes": "",
            "origin_url": BASE_URL})
        assert r.status_code == 200, r.text
        d = r.json()
        assert "checkout_url" in d and "session_id" in d and "order_id" in d
        assert d["checkout_url"].startswith("http")
        # status polling
        st = session.get(f"{API}/payments/status/{d['session_id']}")
        assert st.status_code == 200
        sd = st.json()
        assert sd["order_id"] == d["order_id"]
        assert sd["payment_status"] in ("pending", "paid", "unpaid", "open", None)
        # verify order tied to user via /auth/orders
        my = session.get(f"{API}/auth/orders", headers=admin_hdr(customer_token)).json()
        assert any(o["id"] == d["order_id"] for o in my)
        # confirm currency inr in stored order (admin lookup)
