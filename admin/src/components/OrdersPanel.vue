<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { api, money, NEXT_ACTIONS, STATUS_TEXT } from "../api";
import type { Order } from "../types";

const orders = ref<Order[]>([]);
const loading = ref(true);
const error = ref("");
const filter = ref("全部");

const tabs = ["全部", "进行中", "已完成", "已退款"];

async function load() {
  loading.value = true;
  error.value = "";
  try {
    orders.value = await api.orders();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

const visible = computed(() => {
  const list = orders.value;
  if (filter.value === "进行中") {
    return list.filter((o) => o.status !== "delivered" && o.status !== "picked_up" && o.status !== "refunded");
  }
  if (filter.value === "已完成") {
    return list.filter((o) => o.status === "delivered" || o.status === "picked_up");
  }
  if (filter.value === "已退款") return list.filter((o) => o.status === "refunded");
  return list;
});

async function act(order: Order, status: string) {
  error.value = "";
  try {
    await api.setOrderStatus(order.id, status);
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  }
}

function statusText(status: string) {
  return STATUS_TEXT[status] || status;
}
</script>

<template>
  <section class="panel">
    <header class="panel-head">
      <div>
        <h2>订单管理</h2>
        <p class="muted">查看全部线上订单并按合法路径流转状态；退款演示会回补库存。</p>
      </div>
      <button class="ghost" @click="load">刷新</button>
    </header>

    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab"
        :class="{ active: filter === tab }"
        @click="filter = tab"
      >
        {{ tab }}
      </button>
    </div>

    <p v-if="error" class="alert">{{ error }}</p>
    <p v-if="loading" class="muted">正在加载订单…</p>
    <p v-else-if="!visible.length" class="muted">当前筛选下没有订单。</p>

    <table v-else class="table">
      <thead>
        <tr>
          <th>订单号</th>
          <th>商品</th>
          <th>规格</th>
          <th>金额</th>
          <th>取货方式</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="order in visible" :key="order.id">
          <td>
            <strong>{{ order.id }}</strong>
            <div class="muted">{{ order.createdAt.replace("T", " ").slice(0, 16) }}</div>
          </td>
          <td>
            <div class="media">
              <img :src="order.image" :alt="order.productName" />
              <div>
                <strong>{{ order.productName }}</strong>
                <div class="muted">× {{ order.quantity }}</div>
              </div>
            </div>
          </td>
          <td>{{ order.color }} / {{ order.size }}</td>
          <td>{{ money(order.total) }}</td>
          <td>
            {{ order.fulfillment === "delivery" ? "配送到家" : "到店自提" }}
            <div class="muted">{{ order.contact }}</div>
            <div v-if="order.address" class="muted">{{ order.address }}</div>
          </td>
          <td>
            <span class="badge" :class="{ on: order.status !== 'refunded' }">
              {{ statusText(order.status) }}
            </span>
          </td>
          <td class="actions">
            <button
              v-for="action in NEXT_ACTIONS[order.status]"
              :key="action.status"
              :class="action.status === 'refunded' ? 'danger' : ''"
              @click="act(order, action.status)"
            >
              {{ action.label }}
            </button>
            <span v-if="!NEXT_ACTIONS[order.status].length" class="muted">已完结</span>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
