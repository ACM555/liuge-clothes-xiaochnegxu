const { API_BASE } = require("./config");

App({
  globalData: {
    apiBase: API_BASE
  },
  onLaunch() {
    // 第一阶段为纯演示：不调用微信登录、不获取手机号、不产生真实交易。
    console.info(`[demo] 顾客端已启动，模拟 API：${API_BASE}`);
  }
});
