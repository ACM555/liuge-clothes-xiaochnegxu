const api = require("../../utils/api");

Page({
  data: {
    loading: true,
    error: "",
    product: null,
    skuId: "",
    quantity: 1,
    fulfillment: "delivery",
    contact: "",
    address: "",
    submitting: false,
    totalText: api.money(0),
    money: api.money
  },

  onLoad(query) {
    this.productId = query.id;
    api
      .getProduct(query.id)
      .then((product) => {
        const available = product.skus.filter((sku) => sku.stock > 0);
        this.setData({
          loading: false,
          product,
          skuId: available.length ? available[0].id : "",
          totalText: api.money(product.price * this.data.quantity)
        });
      })
      .catch((err) => {
        this.setData({ loading: false, error: err.message });
        api.showError(err);
      });
  },

  selectedSku() {
    const { product, skuId } = this.data;
    return (product && product.skus.find((sku) => sku.id === skuId)) || null;
  },

  syncTotal() {
    const { product, quantity } = this.data;
    if (!product) return;
    this.setData({ totalText: api.money(product.price * quantity) });
  },

  selectSku(e) {
    const sku = this.data.product.skus.find((item) => item.id === e.currentTarget.dataset.id);
    if (sku.stock < 1) {
      wx.showToast({ title: "该规格暂时缺货", icon: "none" });
      return;
    }
    this.setData({ skuId: sku.id });
    this.syncTotal();
  },

  step(e) {
    const delta = Number(e.currentTarget.dataset.delta);
    const sku = this.selectedSku();
    const max = sku ? Math.min(sku.stock, 10) : 1;
    const next = Math.max(1, Math.min(max, this.data.quantity + delta));
    this.setData({ quantity: next });
    this.syncTotal();
  },

  selectFulfillment(e) {
    this.setData({ fulfillment: e.currentTarget.dataset.mode });
  },

  onContact(e) {
    this.setData({ contact: e.detail.value });
  },

  onAddress(e) {
    this.setData({ address: e.detail.value });
  },

  submit() {
    const { product, skuId, quantity, fulfillment, contact, address } = this.data;
    if (!skuId) {
      wx.showToast({ title: "请选择有货的规格", icon: "none" });
      return;
    }
    if (!contact.trim()) {
      wx.showToast({ title: "请填写联系人", icon: "none" });
      return;
    }
    if (fulfillment === "delivery" && !address.trim()) {
      wx.showToast({ title: "请填写配送地址", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    api
      .createOrder({
        productId: product.id,
        skuId,
        quantity,
        fulfillment,
        contact: contact.trim(),
        address: address.trim()
      })
      .then(() => {
        this.setData({ submitting: false, quantity: 1, address: "", contact: "" });
        this.syncTotal();
        wx.showModal({
          title: "模拟下单成功",
          content: "这是演示订单，未发生真实支付。可在订单中心查看，并由商家后台流转状态。",
          showCancel: false,
          confirmText: "去订单中心",
          success: (res) => {
            if (res.confirm) wx.switchTab({ url: "/pages/orders/orders" });
          }
        });
      })
      .catch((err) => {
        this.setData({ submitting: false });
        api.showError(err);
      });
  }
});
