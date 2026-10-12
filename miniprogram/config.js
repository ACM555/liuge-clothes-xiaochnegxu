// 本地模拟 API 地址。仅在演示阶段使用，正式阶段改为 CloudBase 调用。
const API_BASE = "http://127.0.0.1:3000";

// 商家入口开关。
// 演示阶段为 true：顾客端「我的」页底部保留入口，用于首次登录 / 绑定。
// 正式阶段确认商家账号后改为 false：入口从顾客端移除，商家凭登录态自动进入商家端。
const SHOW_MERCHANT_ENTRY = true;

// 商家登录态自动进入商家管理页。与 SHOW_MERCHANT_ENTRY 配套：
// 关闭入口时必须同时开启它，否则商家无处进入。
const MERCHANT_AUTO_ENTER = false;

module.exports = { API_BASE, SHOW_MERCHANT_ENTRY, MERCHANT_AUTO_ENTER };
