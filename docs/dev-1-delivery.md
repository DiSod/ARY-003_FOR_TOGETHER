# DEV-1 交付记录

版本：v0.1
文档类型：Task Delivery
状态：执行中
任务编号：DEV-1
交付日期：2026-06-20
任务定义入口：ary.plan.md
上游输入：dev-1-architecture-baseline.md、ary-domain-analysis.v0.3.md、ary-permission-matrix.md、m2-input-final-checklist.md

---

# 1. 当前交付目标

本文用于记录 DEV-1 当前阶段已经落下的正式产物、验收覆盖情况、未完成项和下一入口。

本轮目标不是进入代码实现，而是先把 DEV-1 最依赖的三类文档产物落地：

* 聚合边界。
* 接口鉴权规则。
* 存储 / 读模型边界。

---

# 2. 当前可审查产物

| 产物 | 用途 |
| --- | --- |
| `dev-1-architecture-baseline.md` | DEV-1 架构基线，覆盖聚合边界、存储边界和接口鉴权规则 |
| `dev-1-data-model-draft.md` | DEV-1 字段级数据模型草案，覆盖 13 个写模型/审计存储单元和 10 个读模型方向 |
| `dev-1-auth-policy.md` | DEV-1 接口鉴权策略表，覆盖 14 个资源的动作级鉴权规则和五类作用域判定逻辑 |
| `dev-1-state-transitions.md` | DEV-1 核心链路状态迁移图，覆盖 6 条核心链路的合法迁移和禁止迁移 |
| `dev-1-acceptance-tests.md` | DEV-1 验收用例，按 5 条验收项拆分为 30 条可逐条执行的测试场景 |
| `../project/` | DEV-1 正式项目根目录：`src/`（stores/auth/state-machine/ca-verifier）+ `test/`（46 条验收用例）|
| `ary-domain-analysis.v0.3.md` | 领域基线输入 |
| `ary-permission-matrix.md` | 资源动作级权限与作用域输入 |
| `m2-input-final-checklist.md` | 页面、状态、读模型和视口证据输入 |

---

# 3. 验收覆盖情况

当前对 `ary.plan.md` 中 DEV-1 验收用例的覆盖情况如下：

| 验收项 | 当前结果 | 说明 |
| --- | --- | --- |
| 一个 User 对同一 Race 最多一个 Registration | 已覆盖 | 已在 Registration 聚合约束和唯一键方向中明确 |
| 一个 Registration 最多一个 RaceProject 和一个主 Work | 已覆盖 | 已在 Registration、RaceProject、Work 三个聚合的边界中明确 |
| Registration approved 后由 ARY 幂等生成 RaceProject；一个 RaceProject 可在参赛过程中登记多个 CAConnection | 已覆盖 | 已在 RaceProject 聚合职责中明确 |
| 只有已登记、已握手、归属正确且未禁用的 CAConnection 数据可以进入 Projection、Evidence 或 Report 输入 | 已覆盖 | 已在 CAConnection 存储边界与鉴权附加规则中明确 |
| 只有通过 DCR Desktop App 设备身份校验、消息签名校验和防重放校验的实时消息可以进入 Projection、Evidence 或 Report 输入 | 已覆盖 | 已在接入与审计存储边界中明确 |
| RaceProject 聚合 CA 接入 failed / not_configured 不阻断提交、评审和 Award，但应生成评审前风险提示 | 已覆盖 | 已在 RaceProject 聚合约束中明确 |

当前判断：DEV-1 的六类核心产物已形成，且 30 条验收用例（展开为 46 条测试）均已通过项目根目录 `project/` 下的可运行代码验证（`node --test`，46 pass / 0 fail）。下一批细化应围绕读模型刷新策略和审计操作流程图展开。

---

# 4. 当前未完成项

以下事项属于 DEV-1 的下一批细化内容：

| 项目 | 当前判断 |
| --- | --- |
| 读模型刷新链路 | 尚未明确各 Projection / Read Model 的刷新触发与重建策略 |
| 审计与异常恢复 | 尚未把 quarantine audit 和 report regenerate 展开成操作流程图 |

---

# 5. 下一入口

建议 DEV-1 下一步按以下顺序推进：

1. 为 Projection / Read Model 补刷新触发和重建策略定义。
2. 将 quarantine audit 处置流程和 report regenerate 流程展开为操作流程图。
3. 在进入 DEV-2 前冻结写模型存储的主键和关联键方向。

当前结论：DEV-1 已启动，且已经形成可供后续细化继续消费的正式架构基线。
