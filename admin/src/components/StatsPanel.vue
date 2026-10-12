<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { api, money } from "../api";
import type { Stats } from "../types";

const stats = ref<Stats | null>(null);
const loading = ref(true);
const error = ref("");

async function load() {
  loading.value = true;
  error.value = "";
  try {
    stats.value = await api.stats();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

const statusRows = computed(() => {
  if (!stats.value) return [];
  return Object.entries(stats.value.orders.byStatus);
});
</script>

<template>
  <section class="panel">
    <header class="panel-head">
      <div>
        <h2>数据统计</h2>
        <p class="muted">基础数据来自模拟 API。分销统计为阶段 3 占位，当前恒为 0。</p>
      </div>
      <button class="ghost" @click="load">刷新</button>
    </header>

    <p v-if="error" class="alert">{{ error }}</p>
    <p v-if="loading" class="muted">正在加载统计…</p>

    <div v-else-if="stats" class="stat-grid">
      <div class="stat-card">
        <span class="muted">订单总数</span>
        <strong>{{ stats.orders.total }}</strong>
      </div>
      <div class="stat-card">
        <span class="muted">有效营收（模拟）</span>
        <strong>{{ money(stats.revenueCents) }}</strong>
      </div>
      <div class="stat-card">
        <span class="muted">已退款订单</span>
        <strong>{{ stats.orders.refunded }}</strong>
      </div>
      <div class="stat-card">
        <span class="muted">会员总数</span>
        <strong>{{ stats.members.total }}</strong>
      </div>
    </div>

    <template v-if="stats">
      <h3 class="sub-title">订单状态分布</h3>
      <table class="table">
        <thead>
          <tr><th>状态</th><th>数量</th></tr>
        </thead>
        <tbody>
          <tr v-for="[status, count] in statusRows" :key="status">
            <td>{{ status }}</td>
            <td>{{ count }}</td>
          </tr>
          <tr v-if="!statusRows.length"><td colspan="2" class="muted">暂无订单</td></tr>
        </tbody>
      </table>

      <h3 class="sub-title">分销成交统计</h3>
      <div class="stat-grid">
        <div class="stat-card">
          <span class="muted">线上分销</span>
          <strong>{{ stats.distribution.online.orders }} 笔</strong>
          <span class="muted">佣金 {{ money(stats.distribution.online.commissionCents) }}</span>
        </div>
        <div class="stat-card">
          <span class="muted">线下老带新</span>
          <strong>{{ stats.distribution.offline.orders }} 笔</strong>
          <span class="muted">佣金 {{ money(stats.distribution.offline.commissionCents) }}</span>
        </div>
      </div>
      <p class="muted">{{ stats.distribution.note }}</p>
    </template>
  </section>
</template>
