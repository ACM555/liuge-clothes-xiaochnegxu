const test = require("node:test");
const assert = require("node:assert/strict");
const { createStore } = require("./store");

test("catalog shows live products and a separate preview", () => {
  const store = createStore();
  assert.equal(store.listProducts(false).length, 3);
  assert.equal(store.listProducts(false).filter((item) => item.preview).length, 1);
  assert.throws(() => store.createOrder({
    productId: "trench", skuId: "trench-s", quantity: 1,
    fulfillment: "pickup", contact: "测试顾客"
  }), /未到货/);
});

test("order reduces one SKU only, then admin status is shared", () => {
  const store = createStore();
  const order = store.createOrder({
    productId: "linen-jacket", skuId: "linen-m", quantity: 2,
    fulfillment: "delivery", contact: "测试顾客", address: "演示路 1 号"
  });
  assert.equal(order.total, 85800);
  assert.equal(store.getProduct("linen-jacket").skus[1].stock, 6);
  assert.equal(store.getProduct("linen-jacket").skus[0].stock, 5);
  assert.equal(store.setOrderStatus(order.id, "delivered").status, "delivered");
  assert.equal(store.listOrders()[0].status, "delivered");
  assert.throws(() => store.setOrderStatus(order.id, "picked_up"), /不能/);
  store.setOrderStatus(order.id, "refunded");
  assert.equal(store.getProduct("linen-jacket").skus[1].stock, 8);
  assert.throws(() => store.setOrderStatus(order.id, "refunded"), /不能/);
});

test("invalid orders do not consume inventory or change demo balances", () => {
  const store = createStore();
  const initialStock = store.getProduct("cotton-dress").skus[0].stock;
  assert.throws(() => store.createOrder({
    productId: "cotton-dress", skuId: "dress-s", quantity: 8,
    fulfillment: "pickup", contact: "测试顾客"
  }), /库存不足/);
  assert.throws(() => store.createOrder({
    productId: "cotton-dress", skuId: "dress-s", quantity: 1,
    fulfillment: "delivery", contact: "测试顾客"
  }), /地址/);
  assert.equal(store.getProduct("cotton-dress").skus[0].stock, initialStock);
  store.createOrder({
    productId: "cotton-dress", skuId: "dress-s", quantity: 1,
    fulfillment: "pickup", contact: "测试顾客"
  });
  assert.equal(store.getMember().couponBalance, 12800);
  assert.equal(store.getMember().commissionBalance, 3600);
});

test("admin changes product are visible through the same catalog", () => {
  const store = createStore();
  store.saveProduct({
    ...store.getProduct("linen-jacket"),
    name: "新标题",
    active: false
  }, "linen-jacket");
  assert.equal(store.listProducts(false).some((item) => item.id === "linen-jacket"), false);
  assert.equal(store.listProducts(true).find((item) => item.id === "linen-jacket").name, "新标题");
});

test("preview product only accepts intent notes, never orders", () => {
  const store = createStore();
  assert.throws(() => store.registerPreviewNote({
    productId: "linen-jacket", contact: "测试顾客"
  }), /不是新款预告/);
  assert.throws(() => store.registerPreviewNote({
    productId: "trench", contact: ""
  }), /联系方式/);
  const note = store.registerPreviewNote({
    productId: "trench", contact: "测试顾客", skuHint: "卡其 / M"
  });
  assert.equal(note.productId, "trench");
  assert.equal(store.listPreviewNotes().length, 1);
  assert.equal(store.getProduct("trench").skus[0].stock, 0);
});
