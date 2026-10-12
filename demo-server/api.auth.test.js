const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DEMO_BINDING_CODE = "IT-BIND-CODE";
process.env.DEMO_MERCHANT_USER = "boss";
process.env.DEMO_MERCHANT_PASS = "boss-pass";

const { server } = require("./server");

let base;

test.before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

async function call(method, path, body, token) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, data: await res.json() };
}

test("merchant-only routes reject anonymous callers", async () => {
  const list = await call("GET", "/api/products?includeInactive=1");
  assert.equal(list.status, 200); // 顾客端可读商品

  const write = await call("POST", "/api/products", { name: "偷偷上架", category: "外套", price: 100 });
  assert.equal(write.status, 401);

  const stats = await call("GET", "/api/stats");
  assert.equal(stats.status, 401);
});

test("binding code login unlocks merchant routes, and 401 without token", async () => {
  const login = await call("POST", "/api/auth/binding-code", { code: "IT-BIND-CODE" });
  assert.equal(login.status, 200);
  const token = login.data.token;
  assert.ok(token);
  assert.equal(login.data.merchant.openidBound, true);

  const me = await call("GET", "/api/auth/me", undefined, token);
  assert.equal(me.data.merchant.role, "merchant");

  const created = await call(
    "POST",
    "/api/products",
    { name: "商家上架款", category: "外套", price: 88800, skus: [{ color: "黑", size: "M", stock: 2 }] },
    token
  );
  assert.equal(created.status, 200);

  const stats = await call("GET", "/api/stats", undefined, token);
  assert.equal(stats.status, 200);

  const wrong = await call("POST", "/api/products", { name: "x", category: "y", price: 1 }, "bad-token");
  assert.equal(wrong.status, 401);
});

test("password login works and a wrong password is rejected", async () => {
  const bad = await call("POST", "/api/auth/password", { username: "boss", password: "nope" });
  assert.equal(bad.status, 401);

  const ok = await call("POST", "/api/auth/password", { username: "boss", password: "boss-pass" });
  assert.equal(ok.status, 200);
  const token = ok.data.token;

  const status = await call("POST", "/api/orders/NOPE/status", { status: "delivered" }, token);
  assert.equal(status.status, 404); // 已通过鉴权，才轮到业务 404

  const audit = await call("GET", "/api/auth/audit", undefined, token);
  assert.equal(audit.status, 200);
  assert.ok(audit.data.some((item) => item.action === "login.success"));
});

test("logout invalidates the token server-side", async () => {
  const login = await call("POST", "/api/auth/binding-code", { code: "IT-BIND-CODE" });
  const token = login.data.token;
  assert.equal((await call("GET", "/api/auth/me", undefined, token)).data.merchant.id, "merchant-owner");
  await call("POST", "/api/auth/logout", {}, token);
  assert.equal((await call("GET", "/api/auth/me", undefined, token)).data.merchant, null);
  assert.equal((await call("GET", "/api/stats", undefined, token)).status, 401);
});
