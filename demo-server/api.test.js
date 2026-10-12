const test = require("node:test");
const assert = require("node:assert/strict");
const { server } = require("./server");

let base;

test.before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

async function call(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  return { status: res.status, data };
}

test("health endpoint marks the service as simulated", async () => {
  const { status, data } = await call("GET", "/api/health");
  assert.equal(status, 200);
  assert.equal(data.simulated, true);
});

test("server computes order total and ignores any client-supplied price", async () => {
  const { status, data } = await call("POST", "/api/orders", {
    productId: "linen-jacket",
    skuId: "linen-m",
    quantity: 1,
    fulfillment: "pickup",
    contact: "测试顾客",
    total: 1,
    price: 1
  });
  assert.equal(status, 200);
  assert.equal(data.order.total, 42900);
  const member = await call("GET", "/api/member");
  assert.equal(member.data.couponBalance, 12800);
  assert.equal(member.data.commissionBalance, 3600);
});

test("preview product is rejected for normal ordering", async () => {
  const { status, data } = await call("POST", "/api/orders", {
    productId: "trench",
    skuId: "trench-s",
    quantity: 1,
    fulfillment: "pickup",
    contact: "测试顾客"
  });
  assert.equal(status, 400);
  assert.match(data.error, /未到货/);
});

test("order status follows legal transitions and refund restores stock", async () => {
  const before = (await call("GET", "/api/products/cotton-dress")).data.skus[0].stock;
  const created = await call("POST", "/api/orders", {
    productId: "cotton-dress",
    skuId: "dress-s",
    quantity: 1,
    fulfillment: "delivery",
    contact: "测试顾客",
    address: "演示路 1 号"
  });
  const id = created.data.order.id;
  assert.equal((await call("GET", "/api/products/cotton-dress")).data.skus[0].stock, before - 1);

  const illegal = await call("POST", `/api/orders/${id}/status`, { status: "picked_up" });
  assert.equal(illegal.status, 400);

  const delivered = await call("POST", `/api/orders/${id}/status`, { status: "delivered" });
  assert.equal(delivered.data.order.status, "delivered");

  const refunded = await call("POST", `/api/orders/${id}/status`, { status: "refunded" });
  assert.equal(refunded.data.order.status, "refunded");
  assert.equal((await call("GET", "/api/products/cotton-dress")).data.skus[0].stock, before);
});

test("preview notes register intent without touching stock", async () => {
  const note = await call("POST", "/api/preview-notes", {
    productId: "trench",
    contact: "测试顾客",
    skuHint: "卡其 / M"
  });
  assert.equal(note.status, 200);
  assert.equal(note.data.note.productId, "trench");
  assert.equal((await call("GET", "/api/products/trench")).data.skus[0].stock, 0);
});

test("statistics are labelled simulated and reconcile with orders", async () => {
  const stats = (await call("GET", "/api/stats")).data;
  const orders = (await call("GET", "/api/orders")).data;
  assert.equal(stats.simulated, true);
  assert.equal(stats.orders.total, orders.length);
  const expected = orders
    .filter((order) => order.status !== "refunded")
    .reduce((sum, order) => sum + order.total, 0);
  assert.equal(stats.revenueCents, expected);
});
