const api = require("../../utils/api");

const STATUS_TEXT = {
  pending_delivery: "待配送",
  delivered: "已配送",
  pending_pickup: "待到店自提",
  picked_up: "已自提",
  refunded: "已退款"
};

const NEXT_ACTIONS = {
  pending_delivery: [
    { label: "标记已配送", status: "delivered" },
    { label: "退款", status: "refunded" }
  ],
  pending_pickup: [
    { label: "标记已自提", status: "picked_up" },
    { label: "退款", status: "refunded" }
  ],
  delivered: [{ label: "退款", status: "refunded" }],
  picked_up: [{ label: "退款", status: "refunded" }],
  refunded: []
};

Page({
  data: {
    checking: true,
    merchant: null,
    tab: "orders",
    orders: [],
    products: [],
    stats: null,
    loading: false,
    error: "",
    money: api.money
  },

  onShow() {
    // 角色守卫：每次进入都向服务端确认身份，不只看本地是否有令牌。
    if (!api.getToken()) {
      this.toLogin();
      return;
    }
    api
      .me()
      .then((res) => {
        if (!res.merchant) return this.toLogin();
        this.setData({ checking: false, merchant: res.merchant });
        return this.load();
      })
      .catch((err) => {
        this.setData({ checking: false, error: err.message });
        this.toLogin();
      });
  },

  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh());
  },

  toLogin() {
    wx.redirectTo({ url: "/pages/merchant-login/merchant-login" });
  },

  load() {
    this.setData({ loading: true, error: "" });
    return Promise.all([api.getOrders(), api.getProductsForAdmin(), api.stats()])
      .then(([orders, products, stats]) => {
        this.setData({
          loading: false,
          orders: orders.map((order) => Object.assign({}, order, {
            statusText: STATUS_TEXT[order.status] || order.status,
            actions: NEXT_ACTIONS[order.status] || [],
            totalText: api.money(order.total),
            fulfillmentText: order.fulfillment === "delivery" ? "配送到家" : "到店自提",
            timeText: (order.createdAt || "").replace("T", " ").slice(0, 16)
          })),
          products: products.map((product) => Object.assign({}, product, {
            priceText: api.money(product.price),
            stockText: product.skus.map((sku) => `${sku.color}/${sku.size} ${sku.stock}`).join(" · ")
          })),
          stats
        });
      })
      .catch((err) => {
        this.setData({ loading: false, error: err.message });
        api.showError(err);
      });
  },

  switchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
  },

  act(e) {
    const { id, status } = e.currentTarget.dataset;
    if (status === "refunded") {
      wx.showModal({
        title: "确认退款",
        content: "退款为演示操作，会把该订单标记为已退款并回补库存。",
        success: (res) => {
          if (res.confirm) this.applyStatus(id, status);
        }
      });
      return;
    }
    this.applyStatus(id, status);
  },

  applyStatus(id, status) {
    api
      .setOrderStatus(id, status)
      .then(() => {
        wx.showToast({ title: "已更新", icon: "success" });
        return this.load();
      })
      .catch(api.showError);
  },

  toggleProduct(e) {
    const id = e.currentTarget.dataset.id;
    const product = this.data.products.find((item) => item.id === id);
    if (!product) return;
    api
      .saveProduct(Object.assign({}, product, { active: !product.active, priceText: undefined, stockText: undefined }), id)
      .then(() => {
        wx.showToast({ title: product.active ? "已下架" : "已上架", icon: "success" });
        return this.load();
      })
      .catch(api.showError);
  },

  logout() {
    api
      .logout()
      .catch(() => {})
      .then(() => {
        api.clearAuth();
        this.toLogin();
      });
  }
});
