const api = require("../../utils/api");

Page({
  data: {
    loading: true,
    error: "",
    previews: [],
    notes: [],
    form: { productId: "", contact: "", skuHint: "" },
    money: api.money
  },

  onLoad() {
    this.loadAll();
  },

  onShow() {
    if (!this.data.loading) this.loadAll();
  },

  onPullDownRefresh() {
    this.loadAll().then(() => wx.stopPullDownRefresh());
  },

  loadAll() {
    this.setData({ loading: true, error: "" });
    return Promise.all([api.getProducts(), api.getPreviewNotes()])
      .then(([products, notes]) => {
        const previews = products.filter((item) => item.active && item.preview);
        this.setData({
          loading: false,
          previews,
          notes,
          "form.productId": previews.length ? previews[0].id : ""
        });
      })
      .catch((err) => {
        this.setData({ loading: false, error: err.message });
        api.showError(err);
      });
  },

  choose(e) {
    this.setData({ "form.productId": e.currentTarget.dataset.id });
  },

  onContact(e) {
    this.setData({ "form.contact": e.detail.value });
  },

  onHint(e) {
    this.setData({ "form.skuHint": e.detail.value });
  },

  submit() {
    const { productId, contact, skuHint } = this.data.form;
    if (!productId) {
      wx.showToast({ title: "请选择要预定的新款", icon: "none" });
      return;
    }
    if (!contact.trim()) {
      wx.showToast({ title: "请填写联系方式", icon: "none" });
      return;
    }
    api
      .createPreviewNote({ productId, contact: contact.trim(), skuHint: skuHint.trim() })
      .then(() => {
        this.setData({ "form.contact": "", "form.skuHint": "" });
        wx.showToast({ title: "已登记预定意向", icon: "success" });
        return api.getPreviewNotes();
      })
      .then((notes) => this.setData({ notes }))
      .catch(api.showError);
  }
});
