# ARY MVP — 完整会话记录
简略记录，详细jsonl也在目录下
> 会话 ID：9cdc7e1a-cf11-4976-99cc-8993a769decb
> 日期：2026-06-15 ~ 2026-06-20
> 仓库：`race3/ary-grs-003-yunf161`
> 总轮次：约 200+ 轮

---

## 一、仓库探索与阅读顺序（06-15）

### 用户请求
"读取一下race3目录下的文件，告诉我这个目录下现在有什么，需要我做什么"
"梳理一下我的阅读顺序"
"需要我做什么在这个阶段"

### Agent 操作
读取 `README.md`、`STATUS.md`、`PLAN.md`。
判定仓库为文档与高保真原型仓，尚未进入应用代码实现阶段。
初始化 `record.md`。

### 结论
当前建议：评审 UX-1 高保真原型 + 复审 PRD-TEMP-1 文档一致性。
推荐阅读顺序：STATUS → PLAN → PRD → 整改任务书 → IA → UX 任务书 → 设计原型 → 领域/权限/QA/OPS。

---

## 二、PRD-TEMP-1 三轮复审与术语统一（06-20 上午）

### 用户请求
"开始复审并修复" → "开始第二轮复审" → "继续彻底统一" → "继续进行"

### 第一轮复审
全文搜索旧口径残留。发现 `docs/ary-domain-analysis.v0.3.md` 存在旧事件命名。
**修复**：
- `RaceProjectBound` → `RaceProjectGenerated`
- `RaceCAConnectionSetLocked` → `CAConnectionAcceptanceWindowUpdated`
同步 `STATUS.md`：PRD-TEMP-1 从"待复审"推进为"复审中"。

### 第二轮复审
发现 `Review Flag / Review Readiness` 命名顺序不一致；原型有 `still eligible` 等资格误读文案。
**修复**：
- 统一 `ary-mvp.prd.md` 风险提示命名为 `Review Flag`
- `ary-domain-analysis.v0.3.md` 中 `Review Readiness Check` → `Review Flag Check`
- 更新 `design-prototype/index.html`、`script.js` 指挥席文案

### 第三轮收口
最终统一：`Review Flag` / `Review Flag Check`。
清除 `Review Readiness`、`EligibilitySignal`、`ComplianceFlag` 等待定表述。
判断：剩余问题不属于口径冲突，转入后续 Race Rules / DEV-5 细化。

---

## 三、PRD-1 正式交付件形成（06-20）

### 用户请求
"现在形成可交付物品" "prd-1在哪里" "这些交付物没有形成啊"

### Agent 操作
形成 `docs/prd-temp-1-baseline-delivery.md` + `docs/prd-1-delivery.md`。
同步 `README.md`、`ary.plan.md`、`STATUS.md`、`PLAN.md`。
PRD-1 从"进行中"推进为"完成"，M1 里程碑达成。

---

## 四、防伪防篡改安全机制（06-20）

### 用户请求
"防伪、防篡改：必须设计采用安全机制，保障比赛中CA上报的消息，来自真实CA，未被伪造、篡改。"
"同步到所有文档"

### 设计决策
- DCR Desktop App 作为唯一受信转发端
- 8 步验签管道：appInstance → deviceKey → bodyHash → signature → timestamp → nonce → sequence
- 真实性状态：`verified`、`verification_failed`、`quarantined`
- 失败消息只进入隔离审计，不进入 Projection / Evidence / Report

### 同步 12 份文档
`ary-mvp.prd.md`、`ary-domain-analysis.v0.3.md`、`ary-mvp.ia.md`、`ary-permission-matrix.md`、`ary-qa-plan.md`、`ary-release-ops-plan.md`、`ary-ca-integration-spec.md`、`registration-ca-rules-alignment.taskbook.md`、`prd-temp-1-baseline-delivery.md`、`prd-1-delivery.md`、`ary.plan.md`、`docs/README.md`、`STATUS.md`

### CA 契约样例
- §5.5：成功消息 JSON（appInstanceId / deviceKeyId / nonce / signature / bodyHash）
- §5.6：失败消息 JSON（验签失败 / nonce_replayed / body_hash_mismatch）

---

## 五、UX-1 高保真原型评审与补齐（06-20）

### 用户请求
"开始这个任务" → 多次"依次执行" → "这些要求是否完全满足，审查一下"
"组件、空态、错误态、权限差异、数据依赖还没有形成完整标注产物。先做这个"
"按顺序做"

### 第一轮评审
形成 `docs/ux-1-review-round-1.md`。
缺口：Admin Console、Screen Console、Rider View、Judge View、Work Detail、真实性状态样张。

### 第二轮补齐
新增 5 个独立页面 + 真实性状态样张 + 6 张 1080P 截图。
形成 `docs/ux-1-review-round-2.md`。

### 标注矩阵
`docs/ux-1-annotation-matrix.md`：视口范围 / 17 个页面组件的核心组件、关键状态、空态、错误态、权限差异、数据依赖 / M2 输入判断。

### 空态/错误态与移动端
用户反馈："截图还不太行，没有呈现网页端的空态，移动端的也没有更新"
- 定位根因：State Samples 只支持整页首屏；桌面端标题层重叠
- 修复：按样张聚焦 hash 能力 + 独立桌面布局 + 窄屏适配
- 重新导出 12 张单态截图

---

## 六、UX-1 收口与 M2 输入清单（06-20）

### 用户请求
"基于这批新证据形成 UX-1 收口记录和 M2 输入最终清单" "刚才出现了执行错误，重试"

### 产物
- `docs/ux-1-closure-delivery.md`：正式任务交付记录
- `docs/m2-input-final-checklist.md`：Go/No-Go 判断
- DEV-1 从"暂缓" → "可启动"

---

## 七、DEV-1 架构基线启动（06-20）

### 用户请求
"开始做dev1，遵守planmd的要求"

### 产物
- `docs/dev-1-architecture-baseline.md`：聚合边界、存储边界、接口鉴权规则、验收约束映射
- `docs/dev-1-delivery.md`：交付记录

---

## 八、字段级数据模型草案（06-20）

### 用户请求
"基于 dev-1-architecture-baseline.md 继续补字段级数据模型草案。继续补充"

### 产物
`docs/dev-1-data-model-draft.md`：
- 13 个写模型 + 3 个审计存储 → 逐表字段/类型/必填/唯一键/关联键
- 10 个读模型方向
- 全局关联键矩阵 + 唯一键汇总

---

## 九、接口鉴权策略表 + 状态迁移图（06-20）

### 用户请求
"当前草案无明显漏洞，继续按照工作流推进，完善接口策略和状态迁移图"

### 产物
- `docs/dev-1-auth-policy.md`：14 资源动作级鉴权 + 5 类作用域 + 真实性附加规则 + middleware 映射
- `docs/dev-1-state-transitions.md`：6 链路合法/禁止迁移表 + 跨链路联动

---

## 十、验收用例构造（06-20）

### 用户请求
"现在要构造验收用例要求如下，请开始"

### 产物
`docs/dev-1-acceptance-tests.md`：30 条用例，AC-1~AC-5 每条标注 DEV-1 产物落点。

---

## 十一、可运行代码实现（06-20）

### 用户请求
"现在的验证还只有理论，请做可以满足当前验证需求的代码实现"

### 实现方案
纯 Node.js 零依赖实现（`packages/dev-1-impl/`）：

| 模块 | 行数 | 职责 |
|---|---|---|
| `stores.js` | ~140 | 14 个内存 Map + createStore 工厂 + 复合唯一键索引 |
| `auth.js` | ~100 | own/assigned/managed/admin gate + 真实性过滤 |
| `state-machine.js` | ~160 | 6 链路 canTransition + generateReviewFlags + computeConnectionHealth |
| `ca-verifier.js` | ~130 | 8 步验签管道 + 自动写入 ca_quarantine_audits |
| `business.js` | ~200 | 工厂函数 + submitRegistration / approveRegistration / submitWork / syncRaceProjectStatus |
| `acceptance.test.js` | ~500 | 46 条测试 |

### 发现并修复的 bug
1. **nonce 顺序**：sequence 检查在 nonce 之前 → 重放测试报错 → 调换
2. **auth userId**：store 存 `user.id` 但 auth 读 `user.userId` → 兼容
3. **合法消息 bodyHash 为空**：验签比对失败 → 实时计算 `simpleHash(normalizeBody)`
4. **RaceProject 状态不同步**：CA 登记后 aggregateIngestionStatus 不变 → 新增 `syncRaceProjectStatus()`

### 测试结果：46 pass / 0 fail

---

## 十二、项目整合与原型接入（06-20）

### 用户请求
"基于 design-prototype 的资源和文档约束，建立项目文件夹"
"当前项目不兼容之前的资源，比如 logo、index.html 等，需要把这些接入"

### 产物

```
project/
├── server.js                  # 零依赖静态服务 → :3000
├── public/
│   ├── app-core.js            # 运行时核心 (window.ARY_CORE)
│   ├── test-modules.js        # 测试外挂（薄层）
│   ├── app.html + app.js      # 功能应用
│   ├── test-dashboard.html    # 测试仪表盘
│   └── index.html + *.png     # 高保真原型（从 design-prototype/ 迁入）
├── src/
│   ├── stores.js / auth.js / state-machine.js / ca-verifier.js / business.js
└── test/
    └── acceptance.test.js     # 46 条全绿
```

### 文件职责分离
```
app-core.js       → 运行时核心 (ARY_CORE)          — 可独立用于生产
test-modules.js   → 测试外挂 (ARY_CORE.testShims)  — 仅身份伪造/消息伪造/密钥注入
app.js            → UI 层                          — 从 ARY_CORE 取核心模块
```

---

## 十三、功能应用 UI 开发（06-20）

### 用户请求
"现在这个交互界面只做到报名，没有兼容所有的 dev1 逻辑"
多次排查："RaceProject 唯一的验证不通过" "CA 接入的判定逻辑是不是有问题"

### 最终 7 个面板

| 页面 | 功能 | 验收项 |
|---|---|---|
| 登录 `#login` | Demo 身份选择 | — |
| 首页 `#home` | 赛事广场 + 报名入口 | — |
| 报名 `#register` | 提交报名 + 模拟审核 + RaceProject 自动生成 | AC-1, AC-2 |
| 我的参赛 `#my-races` | 约束校验 + Pipeline 管道可视化 + Work/Session/Evidence 操作 | AC-1~AC-5 |
| CA 接入 `#ca-connect` | CA 登记/禁用/恢复 + 唯一键冲突反馈 | AC-3 |
| CA 验签 `#ca-verify` | 6 种消息类型逐条测试 + 验签管道 + 隔离审计计数 | AC-4 |
| 管理控制台 `#admin-console` | 审核报名 + 颁发 Award + CA 管道状态监控 | AC-5 |

### Pipeline 管道可视化
```
CA:connected → Sessions:2 → Summaries:1 → Evidence:1 → Projection/Report
```
每步颜色：灰色=空 / 绿色=有数据。

---

## 十四、代码清理与最终验证（06-20）

### 用户请求
"清理重复的代码"
"这个 test-module 不应该承担最终应用的功能，只能承担临时的身份伪造，消息伪造等功能"
"现在再跑一遍静态测试并核查是否满足验收条件"

### 清理结果
- `approveRegistration`（~50 行）：app.js 副本删除，改用 `business.approveRegistration`
- `syncRaceProjectStatus`（~12 行）：同上
- `submitRegistration`（~10 行）：手写 insert 改用 `business.submitRegistration()`
- `seedDemoData`（~20 行）：手写全字段改用 `factory.user()` / `factory.race()`
- `sendTestMsg`：内联实现移入 `testShims.sendTestMsg()`

### 最终审查

| 验收项 | 静态 | 交互 | 判定 |
|---|---|---|---|
| AC-1 唯一 Registration | 4/4 ✅ | 重复报名→红框报唯一键 | ✅ |
| AC-2 RaceProject/Work/CA 结构 | 6/6 ✅ | approve→RP 幂等；多 CA 登记 | ✅ |
| AC-3 CA 数据准入 | 6/6 ✅ | 登记/禁用；验签过滤 | ✅ |
| AC-4 DCR 验签+隔离审计 | 7/7 ✅ | 6 种消息逐条测试 | ✅ |
| AC-5 CA 失败不阻断 | 7/7 ✅ | 创建/提交/Award 不阻断；风险动态写入 | ✅ |

**46/46 静态零失败。DEV-1 五条验收项全部满足。**

---

## 运行方式

```bash
cd project
npm test        # 46 pass / 0 fail
npm start       # http://localhost:3000 → app.html
```
