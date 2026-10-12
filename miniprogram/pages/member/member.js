const api = require("../../utils/api");
const { SHOW_MERCHANT_ENTRY } = require("../../config");

Page({
  data: {
    loading: true,
    error: "",
    showMerchantEntry: SHOW_MERCHANT_ENTRY,
    member: null,
    couponText: "¥0.00",
    commissionText: "¥0.00",
    spentText: "¥0.00",
    favoriteCount: 0,
    orderCount: 0
  },

  onShow() {
    this.load();
  },

  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh());
  },

  load() {
    this.setData({ loading: true, error: "" });
    return Promise.all([api.getMember(), api.getOrders()])
      .then(([member, orders]) => {
        this.setData({
          loading: false,
          member,
          couponText: api.money(member.couponBalance),
          commissionText: api.money(member.commissionBalance),
          spentText: api.money(member.totalSpent),
          favoriteCount: (member.favorites || []).length,
          orderCount: orders.length
        });
      })
      .catch((err) => {
        this.setData({ loading: false, error: err.message });
        api.showError(err);
      });
  },

  authorize() {
    wx.showModal({
      title: "演示阶段暂不授权",
      content: "正式阶段才会接入微信一键授权开卡与手机号绑定。当前为演示态，不会获取你的真实信息。",
      showCancel: false
    });
  },

  invite() {
    wx.showModal({
      title: "分销推荐为阶段 3 内容",
      content: "当前仅展示入口与演示态余额，尚未生成真实分享二维码、不结算真实佣金。",
      showCancel: false
    });
  },

  goOrders() {
    wx.switchTab({ url: "/pages/orders/orders" });
  },

  goMerchant() {
    const target = api.getToken()
      ? "/pages/merchant-admin/merchant-admin"
      : "/pages/merchant-login/merchant-login";
    wx.navigateTo({ url: target });
  }
});
