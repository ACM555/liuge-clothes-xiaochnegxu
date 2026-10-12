<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api, setToken } from "./api";
import type { Merchant } from "./api";
import LoginPanel from "./components/LoginPanel.vue";
import OrdersPanel from "./components/OrdersPanel.vue";
import ProductsPanel from "./components/ProductsPanel.vue";
import MembersPanel from "./components/MembersPanel.vue";
import StatsPanel from "./components/StatsPanel.vue";

const tabs = [
  { key: "products", label: "商品管理", component: ProductsPanel },
  { key: "orders", label: "订单管理", component: OrdersPanel },
  { key: "members", label: "会员管理", component: MembersPanel },
  { key: "stats", label: "数据统计", component: StatsPanel }
];

const active = ref("products");
const online = ref(false);
const merchant = ref<Merchant | null>(null);
const checking = ref(true);

onMounted(async () => {
  // 先用已保存的令牌验证一次；无效则回到登录页。
  try {
    const session = await api.me();
    merchant.value = session.merchant;
  } catch {
    merchant.value = null;
  } finally {
    checking.value = false;
  }
  try {
    await api.health();
    online.value = true;
  } catch {
    online.value = false;
  }
});

function onLoggedIn(value: Merchant) {
  merchant.value = value;
}

async function logout() {
  try {
    await api.logout();
  } finally {
    setToken("");
    merchant.value = null;
    active.value = "products";
  }
}
</script>

<template>
  <div v-if="checking" class="boot">正在校验登录状态…</div>

  <LoginPanel v-else-if="!merchant" @success="onLoggedIn" />

  <div v-else class="admin">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">刘</span>
        <div>
          <strong>刘哥服装</strong>
          <div class="muted">商家后台 · 演示</div>
        </div>
      </div>
      <nav>
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="{ active: active === tab.key }"
          @click="active = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>
      <div class="sidebar-foot">
        <div>
          <span class="dot" :class="{ on: online }" />
          {{ online ? "已连接模拟 API" : "未连接模拟 API" }}
        </div>
        <div class="who">{{ merchant.name }} · {{ merchant.openidBound ? "已绑微信" : "密码登录" }}</div>
        <button class="logout" @click="logout">退出登录</button>
      </div>
    </aside>

    <main class="content">
      <div class="top-note">
        演示环境 · 数据为内存假数据，服务重启即重置；不接真实支付、不采集真实顾客信息。
      </div>
      <component :is="tabs.find((t) => t.key === active)!.component" />
    </main>
  </div>
</template>
