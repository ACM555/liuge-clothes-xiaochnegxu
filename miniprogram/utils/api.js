const { API_BASE } = require("../config");

function request(path, options) {
  const opts = options || {};
  const header = { "Content-Type": "application/json" };
  if (opts.auth) header.Authorization = `Bearer ${getToken()}`;
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE}${path}`,
      method: opts.method || "GET",
      data: opts.data,
      header,
      timeout: 8000,
      success(res) {
        const body = res.data;
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          if (res.statusCode === 401) clearAuth();
          reject(new Error((body && body.error) || `请求失败（${res.statusCode}）`));
        }
      },
      fail() {
        reject(new Error("无法连接本地模拟 API，请确认已运行 node demo-server/server.js"));
      }
    });
  });
}

const TOKEN_KEY = "merchantToken";

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || "";
}

function setAuth(token) {
  wx.setStorageSync(TOKEN_KEY, token);
}

function clearAuth() {
  wx.removeStorageSync(TOKEN_KEY);
}

function showError(err) {
  wx.showToast({ title: (err && err.message) || "操作失败", icon: "none" });
}

function money(cents) {
  return `¥${(Number(cents || 0) / 100).toFixed(2)}`;
}

module.exports = {
  request,
  showError,
  money,
  getProducts: () => request("/api/products"),
  getProductsForAdmin: () => request("/api/products?includeInactive=1"),
  getProduct: (id) => request(`/api/products/${id}`),
  getOrders: () => request("/api/orders"),
  createOrder: (payload) => request("/api/orders", { method: "POST", data: payload }),
  getMember: () => request("/api/member"),
  toggleFavorite: (productId) =>
    request("/api/favorites/toggle", { method: "POST", data: { productId } }),
  getPreviewNotes: () => request("/api/preview-notes"),
  createPreviewNote: (payload) =>
    request("/api/preview-notes", { method: "POST", data: payload }),

  // 商家鉴权与管理接口（全部要求服务端角色校验）
  loginWithBindingCode: (code) =>
    request("/api/auth/binding-code", { method: "POST", data: { code, label: "小程序商家入口" } }),
  loginWithPassword: (username, password) =>
    request("/api/auth/password", { method: "POST", data: { username, password } }),
  me: () => request("/api/auth/me", { auth: true }),
  logout: () => request("/api/auth/logout", { method: "POST", auth: true }),
  auditLog: () => request("/api/auth/audit", { auth: true }),
  saveProduct: (payload, id) =>
    request(id ? `/api/products/${id}` : "/api/products", {
      method: id ? "PUT" : "POST",
      auth: true,
      data: payload
    }),
  setOrderStatus: (id, status) =>
    request(`/api/orders/${id}/status`, { method: "POST", auth: true, data: { status } }),
  stats: () => request("/api/stats", { auth: true }),

  // 令牌存取
  getToken,
  setAuth,
  clearAuth
};
