const seedProducts = [
  {
    id: "linen-jacket",
    name: "亚麻轻旅西装",
    subtitle: "轻盈廓形 / 春秋常备",
    category: "外套",
    price: 42900,
    image: "/media/linen-jacket.svg",
    preview: false,
    active: true,
    skus: [
      { id: "linen-s", color: "燕麦", size: "S", stock: 5 },
      { id: "linen-m", color: "燕麦", size: "M", stock: 8 },
      { id: "linen-l", color: "燕麦", size: "L", stock: 4 }
    ]
  },
  {
    id: "cotton-dress",
    name: "棉质收腰连衣裙",
    subtitle: "温柔线条 / 自在出行",
    category: "连衣裙",
    price: 36900,
    image: "/media/cotton-dress.svg",
    preview: false,
    active: true,
    skus: [
      { id: "dress-s", color: "烟粉", size: "S", stock: 6 },
      { id: "dress-m", color: "烟粉", size: "M", stock: 7 },
      { id: "dress-l", color: "烟粉", size: "L", stock: 3 }
    ]
  },
  {
    id: "trench",
    name: "城市漫游风衣",
    subtitle: "即将到货 / 抢先看款",
    category: "外套",
    price: 59900,
    image: "/media/trench.svg",
    preview: true,
    active: true,
    skus: [
      { id: "trench-s", color: "卡其", size: "S", stock: 0 },
      { id: "trench-m", color: "卡其", size: "M", stock: 0 }
    ]
  }
];

function error(message, status) {
  const result = new Error(message);
  result.status = status || 400;
  return result;
}

function createStore() {
  const products = structuredClone(seedProducts);
  const orders = [];
  const favorites = new Set();
  const previewNotes = [];
  let nextNote = 1;
  const member = {
    id: "demo-member",
    name: "演示会员",
    phone: "未授权",
    couponBalance: 12800,
    commissionBalance: 3600,
    totalSpent: 0,
    referralCode: "DEMO2026"
  };
  let nextOrder = 1001;

  function listProducts(includeInactive) {
    return products.filter((product) => includeInactive || product.active);
  }

  function productById(id) {
    return products.find((product) => product.id === id);
  }

  function getProduct(id) {
    const product = productById(id);
    if (!product || !product.active) throw error("商品不存在或已下架", 404);
    return product;
  }

  function saveProduct(input, id) {
    const name = String(input.name || "").trim();
    const category = String(input.category || "").trim();
    const price = Number(input.price);
    if (!name || !category || !Number.isSafeInteger(price) || price < 1) {
      throw error("请填写商品名称、分类和正确售价");
    }
    if (!Array.isArray(input.skus) || !input.skus.length ||
        input.skus.some((sku) => !sku.color || !sku.size ||
          !Number.isSafeInteger(Number(sku.stock)) || Number(sku.stock) < 0)) {
      throw error("至少填写一个有效的颜色、尺码及库存");
    }
    const product = id ? productById(id) : null;
    if (id && !product) throw error("商品不存在", 404);
    const productId = id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const normalized = {
      id: productId,
      name,
      subtitle: String(input.subtitle || "").trim(),
      category,
      price,
      image: String(input.image || "/media/linen-jacket.svg"),
      preview: Boolean(input.preview),
      active: input.active !== false,
      skus: input.skus.map((sku, index) => ({
        id: String(sku.id || `${productId}-${index}`),
        color: String(sku.color).trim(),
        size: String(sku.size).trim(),
        stock: Number(sku.stock)
      }))
    };
    if (product) Object.assign(product, normalized);
    else products.unshift(normalized);
    return normalized;
  }

  function createOrder(input) {
    const product = getProduct(String(input.productId || ""));
    if (product.preview) throw error("新款未到货，暂不可下单");
    const sku = product.skus.find((item) => item.id === input.skuId);
    const quantity = Number(input.quantity);
    const fulfillment = input.fulfillment;
    if (!sku || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10) {
      throw error("请选择有效规格和数量");
    }
    if (sku.stock < quantity) throw error("该规格库存不足");
    if (fulfillment !== "delivery" && fulfillment !== "pickup") {
      throw error("请选择配送或到店自提");
    }
    const contact = String(input.contact || "").trim();
    const address = String(input.address || "").trim();
    if (!contact || (fulfillment === "delivery" && !address)) {
      throw error("请填写联系人及配送地址");
    }
    sku.stock -= quantity;
    const order = {
      id: `DEMO${nextOrder++}`,
      createdAt: new Date().toISOString(),
      customerId: member.id,
      productId: product.id,
      productName: product.name,
      image: product.image,
      skuId: sku.id,
      color: sku.color,
      size: sku.size,
      quantity,
      unitPrice: product.price,
      total: product.price * quantity,
      fulfillment,
      contact,
      address: fulfillment === "delivery" ? address : "",
      status: fulfillment === "delivery" ? "pending_delivery" : "pending_pickup",
      simulated: true
    };
    orders.unshift(order);
    return order;
  }

  // 新款预告仅登记意向，不锁库存、不产生订单与金额。
  function registerPreviewNote(input) {
    const product = getProduct(String(input.productId || ""));
    if (!product.preview) throw error("该商品不是新款预告");
    const contact = String(input.contact || "").trim();
    if (!contact) throw error("请填写联系方式");
    const note = {
      id: `NOTE${nextNote++}`,
      productId: product.id,
      productName: product.name,
      contact,
      skuHint: String(input.skuHint || "").trim(),
      createdAt: new Date().toISOString(),
      simulated: true
    };
    previewNotes.unshift(note);
    return note;
  }

  function setOrderStatus(id, status) {
    const order = orders.find((item) => item.id === id);
    if (!order) throw error("订单不存在", 404);
    const transitions = {
      pending_delivery: ["delivered", "refunded"],
      pending_pickup: ["picked_up", "refunded"],
      delivered: ["refunded"],
      picked_up: ["refunded"],
      refunded: []
    };
    if (!transitions[order.status].includes(status)) throw error("不能进行该状态变更");
    order.status = status;
    if (status === "refunded") {
      const product = productById(order.productId);
      const sku = product && product.skus.find((item) => item.id === order.skuId);
      if (sku) sku.stock += order.quantity;
    }
    return order;
  }

  return {
    listProducts,
    getProduct,
    saveProduct,
    createOrder,
    setOrderStatus,
    registerPreviewNote,
    listPreviewNotes: () => previewNotes,
    listOrders: () => orders,
    getMember: () => ({
      ...member,
      favorites: [...favorites],
      // These figures are illustrative; orders never credit or debit an account.
      ledger: [
        { type: "返券余额", amount: 12800, note: "演示数据 · 不可实际抵扣" },
        { type: "佣金余额", amount: 3600, note: "演示数据 · 不可实际抵扣" }
      ]
    }),
    toggleFavorite(id) {
      getProduct(id);
      if (favorites.has(id)) favorites.delete(id);
      else favorites.add(id);
      return [...favorites];
    }
  };
}

module.exports = { createStore };
