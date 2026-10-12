const api = require("../../utils/api");

Page({
  data: {
    mode: "binding",
    code: "",
    username: "",
    password: "",
    busy: false
  },

  setMode(e) {
    this.setData({ mode: e.currentTarget.dataset.mode });
  },

  onCode(e) {
    this.setData({ code: e.detail.value });
  },

  onUsername(e) {
    this.setData({ username: e.detail.value });
  },

  onPassword(e) {
    this.setData({ password: e.detail.value });
  },

  submit() {
    const { mode, code, username, password } = this.data;
    if (mode === "binding" && !code.trim()) {
      wx.showToast({ title: "请输入绑定码", icon: "none" });
      return;
    }
    if (mode === "password" && (!username.trim() || !password)) {
      wx.showToast({ title: "请输入账号和密码", icon: "none" });
      return;
    }
    this.setData({ busy: true });
    const task =
      mode === "binding"
        ? api.loginWithBindingCode(code.trim())
        : api.loginWithPassword(username.trim(), password);
    task
      .then((res) => {
        api.setAuth(res.token);
        wx.showToast({ title: "登录成功", icon: "success" });
        wx.redirectTo({ url: "/pages/merchant-admin/merchant-admin" });
      })
      .catch((err) => {
        this.setData({ busy: false });
        api.showError(err);
      });
  }
});
