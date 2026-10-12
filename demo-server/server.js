// 第一阶段本机模拟 API：仅监听 127.0.0.1，内存假数据，重启即重置。
// 明确不使用任何真实支付、真实顾客信息或真实余额结算。
const http = require("node:http");
const { createStore } = require("./store");

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT || 3000);
const store = createStore();

const PLACEHOLDER_SVG = (label, hue) => `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="hsl(${hue} 28% 92%)"/><stop offset="1" stop-color="hsl(${hue} 22% 78%)"/>
  </linearGradient></defs>
  <rect width="600" height="800" fill="url(#g)"/>
  <text x="300" y="400" fill="hsl(${hue} 30% 32%)" font-family="sans-serif" font-size="44"
    text-anchor="middle" dominant-baseline="middle">${label}</text>
  <text x="300" y="460" fill="hsl(${hue} 20% 45%)" font-family="sans-serif" font-size="22"
    text-anchor="middle" dominant-baseline="middle">演示占位图 · 非真实商品素材</text>
</svg>`;

const MEDIA = {
  "linen-jacket.svg": PLACEHOLDER_SVG("亚麻轻旅西装", 28),
  "cotton-dress.svg": PLACEHOLDER_SVG("棉质收腰连衣裙", 340),
  "trench.svg": PLACEHOLDER_SVG("城市漫游风衣", 45)
};

function send(res, status, body, headers) {
  const payload = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": payload.length,
    "Cache-Control": "no-store",
    ...headers
  });
  res.end(payload);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 256 * 1024) {
        reject(Object.assign(new Error("请求体过大"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error("请求体不是合法 JSON"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function stats() {
  const orders = store.listOrders();
  const valid = orders.filter((order) => order.status !== "refunded");
  const sum = (list) => list.reduce((total, order) => total + order.total, 0);
  return {
    simulated: true,
    orders: {
      total: orders.length,
      refunded: orders.length - valid.length,
      byStatus: orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {})
    },
    revenueCents: sum(valid),
    members: { total: 1, note: "演示会员 1 位，非真实会员数据" },
    distribution: {
      online: { orders: 0, commissionCents: 0 },
      offline: { orders: 0, commissionCents: 0 },
      note: "分销为阶段 3 内容，此处仅占位"
    }
  };
}

const routes = [
  ["GET", /^\/api\/health$/, () => ({ ok: true, simulated: true, mode: "demo" })],
  ["GET", /^\/api\/products$/, (req) =>
    store.listProducts(new URL(req.url, "http://x").searchParams.get("includeInactive") === "1")],
  ["GET", /^\/api\/products\/([^/]+)$/, (req, m) => store.getProduct(decodeURIComponent(m[1]))],
  ["POST", /^\/api\/products$/, (req, m, body) => ({ product: store.saveProduct(body) })],
  ["PUT", /^\/api\/products\/([^/]+)$/, (req, m, body) =>
    ({ product: store.saveProduct(body, decodeURIComponent(m[1])) })],
  ["GET", /^\/api\/orders$/, () => store.listOrders()],
  ["POST", /^\/api\/orders$/, (req, m, body) => ({ order: store.createOrder(body) })],
  ["POST", /^\/api\/orders\/([^/]+)\/status$/, (req, m, body) =>
    ({ order: store.setOrderStatus(decodeURIComponent(m[1]), String(body.status || "")) })],
  ["GET", /^\/api\/member$/, () => store.getMember()],
  ["POST", /^\/api\/favorites\/toggle$/, (req, m, body) => ({ favorites: store.toggleFavorite(String(body.productId || "")) })],
  ["GET", /^\/api\/preview-notes$/, () => store.listPreviewNotes()],
  ["POST", /^\/api\/preview-notes$/, (req, m, body) => ({ note: store.registerPreviewNote(body) })],
  ["GET", /^\/api\/stats$/, () => stats()]
];

const server = http.createServer(async (req, res) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (req.method === "OPTIONS") {
    res.writeHead(204, cors);
    res.end();
    return;
  }

  const path = new URL(req.url, "http://x").pathname;

  const media = path.match(/^\/media\/([^/]+\.svg)$/);
  if (req.method === "GET" && media && MEDIA[media[1]]) {
    const svg = Buffer.from(MEDIA[media[1]]);
    res.writeHead(200, {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Length": svg.length,
      "Cache-Control": "no-store",
      ...cors
    });
    res.end(svg);
    return;
  }

  let pathMatched = false;
  for (const [method, pattern, handler] of routes) {
    const match = path.match(pattern);
    if (!match) continue;
    pathMatched = true;
    if (req.method !== method) continue;
    try {
      const body = method === "POST" || method === "PUT" ? await readJson(req) : {};
      send(res, 200, handler(req, match, body), cors);
    } catch (err) {
      send(res, err.status || 500, { error: err.message || "服务异常" }, cors);
    }
    return;
  }

  if (pathMatched) {
    send(res, 405, { error: "请求方法不被支持" }, cors);
    return;
  }

  send(res, 404, { error: "接口不存在" }, cors);
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`[demo] 模拟 API 已启动：http://${HOST}:${PORT}（内存假数据，重启重置）`);
    console.log("[demo] 仅供本地联调，不接真实支付与真实顾客信息");
  });
}

module.exports = { server, store };
