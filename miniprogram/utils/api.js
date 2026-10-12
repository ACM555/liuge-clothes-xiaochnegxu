const { API_BASE } = require("../config");

function request(path, options) {
  const opts = options || {};
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE}${path}`,
      method: opts.method || "GET",
      data: opts.data,
      header: { "Content-Type": "application/json" },
      timeout: 8000,
      success(res) {
        const body = res.data;
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error((body && body.error) || `请求失败（${res.statusCode}）`));
        }
      },
      fail() {
        reject(new Error("无法连接本地模拟 API，请确认已运行 node demo-server/server.js"));
      }
    });
  });
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
  getProduct: (id) => request(`/api/products/${id}`),
  getOrders: () => request("/api/orders"),
  createOrder: (payload) => request("/api/orders", { method: "POST", data: payload }),
  getMember: () => request("/api/member"),
  toggleFavorite: (productId) =>
    request("/api/favorites/toggle", { method: "POST", data: { productId } }),
  getPreviewNotes: () => request("/api/preview-notes"),
  createPreviewNote: (payload) =>
    request("/api/preview-notes", { method: "POST", data: payload })
};
