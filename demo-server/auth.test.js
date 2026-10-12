const test = require("node:test");
const assert = require("node:assert/strict");
const { createAuth } = require("./auth");

test("one-time binding code issues a merchant session", () => {
  const auth = createAuth({ bindingCode: "TEST-CODE", password: "secret-pass" });
  const result = auth.loginWithBindingCode("TEST-CODE", "1.1.1.1", "微信-顾客端入口");
  assert.equal(result.merchant.role, "merchant");
  assert.equal(result.merchant.openidBound, true);
  assert.equal(auth.verify(result.token).role, "merchant");
});

test("a wrong binding code is rejected and counted as a failed attempt", () => {
  const auth = createAuth({ bindingCode: "TEST-CODE" });
  assert.throws(() => auth.loginWithBindingCode("WRONG", "2.2.2.2"), /绑定码不正确/);
  assert.equal(auth.verify("nope"), null);
});

test("repeated wrong attempts are rate limited", () => {
  const auth = createAuth({ bindingCode: "TEST-CODE" });
  for (let i = 0; i < 8; i += 1) {
    assert.throws(() => auth.loginWithBindingCode("WRONG", "3.3.3.3"), /绑定码不正确/);
  }
  assert.throws(() => auth.loginWithBindingCode("TEST-CODE", "3.3.3.3"), /频繁/);
  // 换一个来源不受影响
  auth.loginWithBindingCode("TEST-CODE", "4.4.4.4");
});

test("password login verifies a scrypt hash and never stores plaintext", () => {
  const auth = createAuth({ bindingCode: "CODE", username: "boss", password: "p@ssw0rd" });
  assert.throws(() => auth.loginWithPassword("boss", "wrong", "5.5.5.5"), /不正确/);
  const ok = auth.loginWithPassword("boss", "p@ssw0rd", "5.5.5.5");
  assert.equal(auth.verify(ok.token).role, "merchant");
  assert.equal(auth.verify(ok.token).openidBound, false); // 密码登录不代表已绑定微信
});

test("logout invalidates the session and audit log records events", () => {
  const auth = createAuth({ bindingCode: "CODE" });
  const { token } = auth.loginWithBindingCode("CODE", "6.6.6.6");
  auth.logout(token);
  assert.equal(auth.verify(token), null);
  const actions = auth.auditLog().map((item) => item.action);
  assert.ok(actions.includes("bind.success"));
  assert.ok(actions.includes("logout"));
});

test("sessions are independent between two auth instances", () => {
  const a = createAuth({ bindingCode: "CODE-A" });
  const b = createAuth({ bindingCode: "CODE-B" });
  const { token } = a.loginWithBindingCode("CODE-A", "7.7.7.7");
  assert.equal(b.verify(token), null);
});
