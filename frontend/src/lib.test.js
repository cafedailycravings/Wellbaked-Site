import { addToCart, cartTotal, getCart, updateQty } from "./lib";

describe("cart utilities", () => {
  beforeEach(() => localStorage.clear());

  test("ignores malformed persisted cart data", () => {
    localStorage.setItem("rb_cart_v1", "not-json");
    expect(getCart()).toEqual([]);
    expect(cartTotal()).toBe(0);
  });

  test("rejects invalid quantities and normalizes prices", () => {
    const product = { id: "cake-1", name: "Cake", price: "500" };
    addToCart(product, 0);
    addToCart(product, "invalid");
    expect(getCart()).toEqual([]);
    addToCart(product, 2);
    expect(getCart()[0].price).toBe(500);
    expect(getCart()[0].quantity).toBe(2);
  });

  test("keeps quantity at least one and ignores invalid updates", () => {
    addToCart({ id: "cake-1", name: "Cake", price: 500 });
    updateQty("cake-1", 0);
    expect(getCart()[0].quantity).toBe(1);
    updateQty("cake-1", "invalid");
    expect(getCart()[0].quantity).toBe(1);
  });

  test("excludes malformed line items from totals", () => {
    localStorage.setItem("rb_cart_v1", JSON.stringify([
      { product_id: "valid", price: 250, quantity: 2 },
      { product_id: "invalid", price: "unknown", quantity: 3 },
    ]));
    expect(cartTotal()).toBe(500);
  });
});
