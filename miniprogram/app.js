const { API_BASE, MERCHANT_AUTO_ENTER } = require("./config");

App({
  globalData: {
    apiBase: API_BASE
  },
  onLaunch() {
    // 第一阶段为纯演示：不调用微信登录、不获取手机号、不产生真实交易。
    console.info(`[demo] 顾客端已启动，模拟 API：${API_BASE}`);
  },

  onShow() {
    // 商家登录态自动进入商家管理页：仅在关闭顾客端入口后启用（见 config.js）。
    if (!MERCHANT_AUTO_ENTER) return;
    const token = wx.getStorageSync("merchantToken");
    if (!token) return;
    wx.reLaunch({ url: "/pages/merchant-admin/merchant-admin" });
  }
});
