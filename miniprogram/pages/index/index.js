const api = require("../../utils/api");

Page({
  data: {
    loading: true,
    error: "",
    products: [],
    list: [],
    previews: [],
    categories: ["全部"],
    activeCategory: "全部",
    favoriteCount: 0,
    money: api.money
  },

  onLoad() {
    this.loadAll();
  },

  onShow() {
    if (!this.data.loading) this.refreshFavorites();
  },

  onPullDownRefresh() {
    this.loadAll().then(() => wx.stopPullDownRefresh());
  },

  loadAll() {
    this.setData({ loading: true, error: "" });
    return Promise.all([api.getProducts(), api.getMember()])
      .then(([products, member]) => {
        const favorites = member.favorites || [];
        const live = products.filter((item) => item.active && !item.preview);
        const categories = ["全部"].concat(
          Array.from(new Set(live.map((item) => item.category)))
        );
        this.setData({
          loading: false,
          products: live,
          previews: products.filter((item) => item.active && item.preview),
          categories,
          favoriteCount: favorites.length
        });
        this.applyFilter(live, categories.includes(this.data.activeCategory)
          ? this.data.activeCategory
          : "全部", favorites);
      })
      .catch((err) => {
        this.setData({ loading: false, error: err.message });
        api.showError(err);
      });
  },

  refreshFavorites() {
    api
      .getMember()
      .then((member) => this.applyFilter(this.data.products, this.data.activeCategory, member.favorites || []))
      .catch(() => {});
  },

  applyFilter(products, activeCategory, favorites) {
    const list = products
      .filter((item) => activeCategory === "全部" || item.category === activeCategory)
      .map((item) => Object.assign({}, item, { fav: favorites.indexOf(item.id) >= 0 }));
    this.setData({ activeCategory, list, favoriteCount: favorites.length });
  },

  selectCategory(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.category });
    this.refreshFavorites();
  },

  onToggleFavorite(e) {
    const id = e.currentTarget.dataset.id;
    api
      .toggleFavorite(id)
      .then((res) => this.applyFilter(this.data.products, this.data.activeCategory, res.favorites || []))
      .catch(api.showError);
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/product/product?id=${e.currentTarget.dataset.id}` });
  },

  goPreview() {
    wx.switchTab({ url: "/pages/preview/preview" });
  }
});
