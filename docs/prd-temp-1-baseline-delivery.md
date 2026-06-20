# PRD-TEMP-1 复审交付件

版本：v0.1
文档类型：Review Delivery
状态：可交付 / 建议并入 PRD-1 基线
任务编号：PRD-TEMP-1
交付日期：2026-06-20
上游入口：`registration-ca-rules-alignment.taskbook.md`
相关基线：`ary-mvp.prd.md`、`ary-domain-analysis.v0.3.md`、`ary-mvp.ia.md`、`ary-permission-matrix.md`、`ary-qa-plan.md`、`ary-release-ops-plan.md`、`ary-ca-integration-spec.md`

---

# 1. 交付目的

本文是 `PRD-TEMP-1` 的复审交付件，用于把“报名 / RaceProject / CA 参赛语义整改”从临时整改任务收口为可并入 `PRD-1` 的正式基线结论。

本文不重新定义 PRD，而是记录：

* 本轮复审确认了哪些正式口径。
* 哪些文档和原型已完成同步。
* 哪些事项已不再属于口径冲突，而应转入后续规则或开发细化。

---

# 2. 已确认基线

本轮复审后，ARY MVP 关于报名、RaceProject 和 CA 参赛语义的正式口径为：

1. Registration approved 后，由 ARY 幂等生成 RaceProject。
2. Rider 不手动绑定 RaceProject，而是进入已生成的参赛工作区。
3. Rider 可在参赛过程中为 RaceProject 新增一个或多个 CAConnection。
4. CA 数据是骑行过程证据、Projection 输入和评审参考，不是参赛资格硬门禁。
5. RaceProject 聚合接入 failed / not_configured 只表达接入健康度、证据缺口和异常提示，不自动触发退赛。
6. 未登记、未握手、归属错误或被禁用的 CA 数据不得进入 Projection、Evidence 或 Report 输入。
7. 比赛中的实时 CA 消息必须通过已登记的 DCR Desktop App 上报，并完成设备身份校验、消息签名校验和防重放校验。
8. 评审前风险提示统一命名为 Review Flag；对应检查流程统一命名为 Review Flag Check。
9. 空骑行、无 CA 数据、空作品、缺必填材料、疑似违规和接入异常应通过 Review Flag 提示 Organizer / Judge，而不是自动替代人工评审。

---

# 3. 已完成同步的交付物

本轮复审已确认下列产物与新口径一致：

| 产物 | 当前结论 |
| --- | --- |
| `ary-mvp.prd.md` | 已同步 RaceProject 自动生成、CA 非资格门禁、Review Flag 口径 |
| `ary-domain-analysis.v0.3.md` | 已同步 RaceProjectGenerated、CAConnectionAcceptanceWindowUpdated、Review Flag / Review Flag Check、CA 消息真实性状态 |
| `ary-mvp.ia.md` | 已同步 Rider View / Judge View 的证据缺口与风险提示表达 |
| `ary-permission-matrix.md` | 已同步 Rider 参赛过程中新增 CAConnection 的权限窗口与真实性校验可见性边界 |
| `ary-qa-plan.md` | 已同步 CA 失败不阻断提交评审、增加风险提示测试 |
| `ary-release-ops-plan.md` | 已同步 CA 失败从资格事故转为数据完整性 / 评审风险事件 |
| `ary-ca-integration-spec.md` | 已同步动态登记、握手、有效数据边界、DCR Desktop App 真实性校验和失败语义 |
| `design-prototype/` | 已清理资格门禁误导表达，采用证据缺口 / Review Flag 语义 |
| `PLAN.md` / `STATUS.md` | 已同步本任务的复审完成和并基线建议 |

---

# 4. 复审结论

本轮复审结论如下：

* `PRD-TEMP-1` 的核心语义冲突已清除。
* 主文档、计划文档、状态看板和高保真原型已完成一致性同步。
* 剩余问题已不再属于“是否采用该口径”的争议，而属于后续规则细化或开发实现边界定义。

因此，`PRD-TEMP-1` 可以作为 `PRD-1` 的已完成子任务并入正式基线。

---

# 5. 转入后续阶段的事项

以下事项保留，但不阻塞本轮并基线：

| 事项 | 应转入 |
| --- | --- |
| 空作品、缺必填材料是提交前阻断还是允许提交并打 Review Flag | 正式 Race Rules / PRD 细化 |
| CAConnection 新增窗口的最终边界是否固定为 running / submitting 且未进入 judging 前 | 正式 Race Rules / DEV-5 |
| 违规作品由系统提示、Organizer 标记还是评审前人工处理 | PRD / OPS / QA 联合细化 |
| 后续新增 Rider / Organizer / Judge 页面避免回归旧口径 | UX-1 后续页面工作流 |

---

# 6. 交付建议

建议按以下方式使用本文：

1. 将本文作为 `PRD-1` 的阶段性交付件归档。
2. 在后续 `DEV-1`、`DEV-5`、正式 Race Rules 设计中，把本文视为当前权威语义结论。
3. 后续若出现与本文冲突的新规则，应先更新 PRD 基线，再更新实现或原型。

---

# 7. 交付判定

当前判定：可交付。

交付完成标志：

* 临时整改任务已完成复审收口。
* 关键术语已统一。
* 主要权威文档与原型已完成同步。
* 后续遗留项已被重新分类为细化事项，而非基线冲突。