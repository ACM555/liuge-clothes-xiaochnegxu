// 演示阶段的商家鉴权：内存会话、scrypt 密码哈希、一次性绑定码、登录限流与审计。
// 真实阶段改为 CloudBase 云函数 + 微信 openid，本模块仅用于本地联调。
const crypto = require("node:crypto");

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 小时
const MAX_ATTEMPTS = 8;
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const derived = crypto.scryptSync(password, parts[1], 64).toString("hex");
  const a = Buffer.from(parts[2], "hex");
  const b = Buffer.from(derived, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a), "utf8");
  const bufB = Buffer.from(String(b), "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function createAuth(options) {
  const opts = options || {};
  const sessions = new Map();
  const attempts = new Map();
  const audit = [];

  // 绑定码不写死在仓库：未配置时随机生成并在启动时打印，仅本次运行有效。
  const bindingCode = opts.bindingCode || crypto.randomBytes(4).toString("hex").toUpperCase();
  const password = opts.password || crypto.randomBytes(6).toString("base64url");
  const merchant = {
    id: "merchant-owner",
    name: opts.name || "店主",
    role: "merchant",
    username: opts.username || "admin",
    passwordHash: hashPassword(password),
    openid: null
  };

  function note(action, detail) {
    audit.unshift({ at: new Date().toISOString(), action, detail: detail || "" });
    if (audit.length > 200) audit.pop();
  }

  function issueToken(merchantId, label) {
    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, {
      merchantId,
      label: label || "",
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS
    });
    return token;
  }

  function checkRateLimit(key) {
    const now = Date.now();
    const record = attempts.get(key);
    if (!record || now - record.firstAt > ATTEMPT_WINDOW_MS) {
      attempts.set(key, { count: 0, firstAt: now });
      return true;
    }
    return record.count < MAX_ATTEMPTS;
  }

  function recordFailure(key) {
    const record = attempts.get(key) || { count: 0, firstAt: Date.now() };
    record.count += 1;
    attempts.set(key, record);
  }

  return {
    bindingCodeHint() {
      return { bindingCode, password };
    },

    auditLog: () => audit,

    loginWithBindingCode(code, clientKey, label) {
      const key = `bind:${clientKey}`;
      if (!checkRateLimit(key)) {
        const err = new Error("尝试过于频繁，请稍后再试");
        err.status = 429;
        throw err;
      }
      if (!safeEqual(code, bindingCode)) {
        recordFailure(key);
        note("bind.failed", `来源 ${clientKey}`);
        const err = new Error("绑定码不正确");
        err.status = 401;
        throw err;
      }
      attempts.delete(key);
      merchant.openid = `demo-openid-${crypto.randomBytes(4).toString("hex")}`;
      note("bind.success", `商家 ${merchant.name} 已绑定微信身份（演示）`);
      return { token: issueToken(merchant.id, label), merchant: publicMerchant() };
    },

    loginWithPassword(username, pass, clientKey, label) {
      const key = `pwd:${clientKey}`;
      if (!checkRateLimit(key)) {
        const err = new Error("尝试过于频繁，请稍后再试");
        err.status = 429;
        throw err;
      }
      const usernameOk = safeEqual(String(username || ""), merchant.username);
      const passwordOk = verifyPassword(String(pass || ""), merchant.passwordHash);
      if (!usernameOk || !passwordOk) {
        recordFailure(key);
        note("login.failed", `账号 ${username || "空"} 来自 ${clientKey}`);
        const err = new Error("账号或密码不正确");
        err.status = 401;
        throw err;
      }
      attempts.delete(key);
      note("login.success", `商家 ${merchant.name} 账号密码登录（演示）`);
      return { token: issueToken(merchant.id, label), merchant: publicMerchant() };
    },

    verify(token) {
      if (!token) return null;
      const session = sessions.get(token);
      if (!session) return null;
      if (session.expiresAt < Date.now()) {
        sessions.delete(token);
        return null;
      }
      return publicMerchant();
    },

    logout(token) {
      if (sessions.delete(token)) note("logout", "商家会话已结束");
      return { ok: true };
    }
  };

  function publicMerchant() {
    return {
      id: merchant.id,
      name: merchant.name,
      role: merchant.role,
      username: merchant.username,
      openidBound: Boolean(merchant.openid)
    };
  }
}

module.exports = { createAuth };
