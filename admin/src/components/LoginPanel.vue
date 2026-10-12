<script setup lang="ts">
import { reactive, ref } from "vue";
import { api, setToken } from "../api";
import type { Merchant } from "../api";

const emit = defineEmits<{ success: [merchant: Merchant] }>();

const mode = ref<"binding" | "password">("binding");
const form = reactive({ code: "", username: "", password: "" });
const busy = ref(false);
const error = ref("");

async function submit() {
  busy.value = true;
  error.value = "";
  try {
    const result =
      mode.value === "binding"
        ? await api.loginWithBindingCode(form.code.trim())
        : await api.loginWithPassword(form.username.trim(), form.password);
    setToken(result.token);
    emit("success", result.merchant);
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="login-wrap">
    <form class="login-card" @submit.prevent="submit">
      <div class="login-brand">
        <span class="brand-mark">刘</span>
        <div>
          <strong>刘哥服装 · 商家登录</strong>
          <div class="muted">演示阶段 · 不与真实账号关联</div>
        </div>
      </div>

      <div class="login-tabs">
        <button type="button" :class="{ active: mode === 'binding' }" @click="mode = 'binding'">
          微信绑定码
        </button>
        <button type="button" :class="{ active: mode === 'password' }" @click="mode = 'password'">
          账号密码
        </button>
      </div>

      <template v-if="mode === 'binding'">
        <p class="muted">
          店主在服务端设定一次性绑定码，只告知商家本人。演示阶段绑定码在启动
          <code>node demo-server/server.js</code> 时打印在控制台。
        </p>
        <label>
          一次性绑定码
          <input v-model="form.code" placeholder="例如 A1B2C3D4" autocomplete="off" />
        </label>
      </template>

      <template v-else>
        <label>
          商家账号
          <input v-model="form.username" placeholder="账号" autocomplete="username" />
        </label>
        <label>
          登录密码
          <input v-model="form.password" type="password" placeholder="密码" autocomplete="current-password" />
        </label>
      </template>

      <p v-if="error" class="alert">{{ error }}</p>

      <button class="primary login-submit" type="submit" :disabled="busy">
        {{ busy ? "验证中…" : "登录" }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(900px 500px at 12% -10%, #f7e6d8 0%, transparent 60%),
    radial-gradient(700px 500px at 100% 0%, #efe0cf 0%, transparent 55%),
    var(--paper);
}

.login-card {
  width: min(420px, 100%);
  padding: 32px;
  border-radius: 18px;
  background: var(--card);
  border: 1px solid var(--line);
  box-shadow: 0 24px 60px rgba(58, 47, 38, 0.14);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.login-tabs {
  display: flex;
  gap: 8px;
  padding: 4px;
  border-radius: 10px;
  background: #f4ece2;
}

.login-tabs button {
  flex: 1;
  padding: 9px 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #6d655b;
}

.login-tabs button.active {
  background: var(--card);
  color: var(--accent);
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(58, 47, 38, 0.08);
}

.login-submit {
  margin-top: 6px;
  padding: 12px 0;
}

code {
  padding: 1px 6px;
  border-radius: 6px;
  background: #f2e7db;
  font-size: 12px;
}
</style>
