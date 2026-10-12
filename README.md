# 刘哥服装小程序

服装类微信小程序 + 商家 Web 管理后台。需求唯一原文见 `PRD.md`，实施与验收路线见 `开发计划.md`。

> 当前处于**阶段 1：可演示的双端闭环**。全部为本地假数据与模拟订单，**零真实支付、零真实顾客信息**。演示余额不可实际抵扣，服务重启即重置。

## 目录结构

| 路径 | 说明 |
| --- | --- |
| `PRD.md` | 需求唯一原文，不改写 |
| `开发计划.md` | 阶段划分、范围、测试门槛 |
| `implementation-notes.md` | 决策、已知缺口、每阶段记录 |
| `demo-server/` | 第一阶段本机模拟 API（Node.js，无第三方依赖） |
| `miniprogram/` | 顾客端原生微信小程序 |
| `admin/` | 商家端 Web 管理后台（Vue 3 + Vite + TypeScript） |

## 环境要求

- Node.js 20 及以上（开发机实测 v24）
- 微信开发者工具（联调小程序时使用）

## 运行方式

启动模拟 API（默认 `http://127.0.0.1:3000`，仅监听本机）：

```bash
node demo-server/server.js
```

启动时控制台会打印**本次商家绑定码**与**账号密码**（不写死在仓库，每次运行随机；可用环境变量 `DEMO_BINDING_CODE` / `DEMO_MERCHANT_USER` / `DEMO_MERCHANT_PASS` 固定）。

启动商家后台（开发模式，默认 `http://127.0.0.1:5173`）：

```bash
cd admin
npm install
npm run dev
```

后台和「我的」页里的**商家管理入口**都需要先登录：用绑定码（推荐，等同绑定店主微信）或账号密码。顾客看款下单不需要登录。

联调小程序：用微信开发者工具导入 `miniprogram/` 目录，在「详情 → 本地设置」勾选**不校验合法域名**，因为本地 API 为 `http://127.0.0.1:3000`。

## 测试

```bash
node --test demo-server/store.test.js   # 业务规则单元测试
node --test demo-server/auth.test.js    # 鉴权（绑定码 / 密码 / 限流 / 审计）
node --test demo-server/api.test.js     # 接口契约测试
node --test demo-server/api.auth.test.js # 接口鉴权测试
cd admin && npm run build               # 后台类型检查与构建
```

## 协作流程

- `main` 保持可运行；功能开发走 `feature/<阶段>-<任务>` 分支并提交 Pull Request。
- 合并前必须通过上述测试与构建。
- 回滚使用 `git revert`，不强制推送覆盖历史。
- 密钥、环境变量、真实顾客数据一律不入库（见 `.gitignore`）。
