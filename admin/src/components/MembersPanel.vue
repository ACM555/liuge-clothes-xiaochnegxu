<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { api, money } from "../api";
import type { Member } from "../types";

const member = ref<Member | null>(null);
const loading = ref(true);
const error = ref("");
const onlyWithBirthday = ref(false);

async function load() {
  loading.value = true;
  error.value = "";
  try {
    member.value = await api.member();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

const rows = computed(() => (member.value ? [member.value] : []));
</script>

<template>
  <section class="panel">
    <header class="panel-head">
      <div>
        <h2>会员管理</h2>
        <p class="muted">
          演示阶段仅有 1 位演示会员，无真实手机号与生日。返券 / 佣金余额为展示值，不可抵扣。
        </p>
      </div>
      <label class="inline">
        <input v-model="onlyWithBirthday" type="checkbox" disabled />
        按生日筛选（阶段 2 开放）
      </label>
    </header>

    <p v-if="error" class="alert">{{ error }}</p>
    <p v-if="loading" class="muted">正在加载会员…</p>
    <p v-else-if="!rows.length" class="muted">暂无会员数据。</p>

    <table v-else class="table">
      <thead>
        <tr>
          <th>会员</th>
          <th>手机号</th>
          <th>生日</th>
          <th>累计消费</th>
          <th>返券余额</th>
          <th>佣金余额</th>
          <th>收藏</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td>
            <strong>{{ row.name }}</strong>
            <div class="muted">{{ row.id }} · 推荐码 {{ row.referralCode }}</div>
          </td>
          <td>{{ row.phone }}</td>
          <td class="muted">未采集</td>
          <td>{{ money(row.totalSpent) }}</td>
          <td>{{ money(row.couponBalance) }}<div class="muted">演示值</div></td>
          <td>{{ money(row.commissionBalance) }}<div class="muted">演示值</div></td>
          <td>{{ row.favorites.length }} 件</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
