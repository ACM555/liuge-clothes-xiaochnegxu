const api = require("../../utils/api");

const STATUS_TEXT = {
  pending_delivery: "待配送",
  delivered: "已配送",
  pending_pickup: "待到店自提",
  picked_up: "已自提",
  refunded: "已退款"
};

Page({
  data: {
    loading: true,
    error: "",
    orders: [],
    filter: "全部",
    tabs: ["全部", "进行中", "已完成", "已退款"],
    counts: { total: 0, active: 0, done: 0, refunded: 0 },
    money: api.money
  },

  onShow() {
    this.load();
  },

  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh());
  },

  load() {
    this.setData({ loading: true, error: "" });
    return api
      .getOrders()
      .then((orders) => {
        const decorated = orders.map((order) => Object.assign({}, order, {
          statusText: STATUS_TEXT[order.status] || order.status,
          fulfillmentText: order.fulfillment === "delivery" ? "门店配送到家" : "到店自提",
          totalText: api.money(order.total),
          unitText: api.money(order.unitPrice),
          refunded: order.status === "refunded",
          done: order.status === "delivered" || order.status === "picked_up",
          timeText: (order.createdAt || "").replace("T", " ").slice(0, 16)
        }));
        this.setData({
          loading: false,
          orders: decorated,
          counts: {
            total: decorated.length,
            active: decorated.filter((o) => !o.done && !o.refunded).length,
            done: decorated.filter((o) => o.done).length,
            refunded: decorated.filter((o) => o.refunded).length
          }
        });
      })
      .catch((err) => {
        this.setData({ loading: false, error: err.message });
        api.showError(err);
      });
  },

  setFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.filter });
  },

  goShopping() {
    wx.switchTab({ url: "/pages/index/index" });
  }
});
