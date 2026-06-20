# ARY 文档索引

本文用于帮助 Agent 和开发者快速找到当前权威文档。根目录 `PLAN.md` 负责近期任务窗口，根目录 `STATUS.md` 负责任务瞬时看板。

当前文档基线中，实时 CA 消息真实性安全链路已经完成主文档同步，涉及产品、领域、IA、权限、QA、OPS 和 CA 契约七个入口；若要快速复核这条链路，建议按“`ary-mvp.prd.md` -> `ary-domain-analysis.v0.3.md` -> `ary-mvp.ia.md` -> `ary-permission-matrix.md` -> `ary-qa-plan.md` -> `ary-release-ops-plan.md` -> `ary-ca-integration-spec.md`”顺序阅读。

## 文档路由

| 文档 | 作用 |
| --- | --- |
| `ary-mvp.prd.md` | 产品目标、MVP 范围、角色路径、产品验收口径。 |
| `ary-domain-analysis.v0.3.md` | 领域概念、核心对象、关系、不变量，以及 CA 消息真实性状态等领域语义。 |
| `ary-mvp.ia.md` | 信息架构、页面层级、导航、页面状态和 URL 建议。 |
| `ary-permission-matrix.md` | 资源动作级权限、角色范围、接口鉴权输入与真实性校验可见性边界。 |
| `ary.plan.md` | 研发任务定义、工作域编号、任务产出、任务验收和 Demo 节奏。 |
| `ary-qa-plan.md` | 测试覆盖、回归要求和质量门。 |
| `ary-release-ops-plan.md` | 发布、监控、备份、值守和回滚要求。 |
| `ary-ca-integration-spec.md` | CA 接入契约草案，定义参赛过程中 CAConnection 登记与握手、多 CAConnection、DCR Desktop App 消息签名 / 验签 / 防重放、push / fetch 边界、骑行状态消息、Projection 输入和评审前风险提示。 |
| `ux-hifi.taskbook.md` | UX-1 高保真原型任务书，定义视觉为主、体验为先的原型工作方式。 |
| `ux-1-closure-delivery.md` | UX-1 正式收口记录，记录验收结论、未完成项和进入 `M2` 的判断。 |
| `m2-input-final-checklist.md` | `M2` 架构设计输入最终清单，收敛页面、状态、权限和读模型方向。 |
| `dev-1-architecture-baseline.md` | DEV-1 架构基线，收敛聚合边界、存储边界和接口鉴权规则。 |
| `dev-1-delivery.md` | DEV-1 当前交付记录，跟踪验收覆盖、未完成项和下一入口。 |
| `dev-1-data-model-draft.md` | DEV-1 字段级数据模型草案，覆盖写模型、审计存储、读模型的字段定义、唯一键和关联键。 |
| `dev-1-auth-policy.md` | DEV-1 接口鉴权策略表，覆盖 14 个资源的动作级鉴权规则和五类作用域判定逻辑。 |
| `dev-1-state-transitions.md` | DEV-1 核心链路状态迁移图，覆盖 6 条核心链路的合法迁移和禁止迁移。 |
| `dev-1-acceptance-tests.md` | DEV-1 验收用例，按 5 条验收项拆分为 30 条可逐条执行的测试场景。 |
| `../project/` | ARY MVP 项目根目录，整合 UX/UI 原型（`public/`）+ DEV-1 架构实现（`src/`）+ 验收测试（`test/`）。`npm start` 启动原型预览，`npm test` 跑全部 46 条验收用例。 |
| `registration-ca-rules-alignment.taskbook.md` | PRD-TEMP-1 临时任务书，承接报名、RaceProject 自动生成、CAConnection 动态接入和评审前风险提示的一致性整改。 |
| `prd-temp-1-baseline-delivery.md` | PRD-TEMP-1 复审交付件，确认整改已完成收口并建议并入 PRD-1 基线。 |
| `prd-1-delivery.md` | PRD-1 正式交付件，记录首轮基线产物、验收记录、未完成项、风险和后续判断。 |

## 阅读建议

* 产品或范围问题：先读 `ary-mvp.prd.md`。
* 查看 PRD-1 是否真的完成：读 `prd-1-delivery.md`。
* 报名、RaceProject、CA 参赛语义调整：先读 `prd-temp-1-baseline-delivery.md` 看复审结论，再读 `registration-ca-rules-alignment.taskbook.md` 看整改过程与细化事项。
* 架构、模型或权限问题：先读 `dev-1-architecture-baseline.md` 和 `dev-1-data-model-draft.md`，再回看 `ary-domain-analysis.v0.3.md` 和 `ary-permission-matrix.md`。
* 页面和体验问题：读 `ary-mvp.ia.md` 与 `ux-hifi.taskbook.md`，必要时参考 `../design-prototype/`；若要确认 UX-1 是否已完成，读 `ux-1-closure-delivery.md`。
* 准备进入架构设计：先读 `m2-input-final-checklist.md` 与 `dev-1-architecture-baseline.md`，再进入 `ary-domain-analysis.v0.3.md`、`ary-permission-matrix.md` 和 CA 契约细化。
* 项目推进问题：读 `ary.plan.md`，再看根目录 `PLAN.md`。
* 验收和上线问题：读 `ary-qa-plan.md` 与 `ary-release-ops-plan.md`。
* 复核实时 CA 消息防伪、防篡改链路：按 `ary-mvp.prd.md`、`ary-domain-analysis.v0.3.md`、`ary-mvp.ia.md`、`ary-permission-matrix.md`、`ary-qa-plan.md`、`ary-release-ops-plan.md`、`ary-ca-integration-spec.md` 顺序阅读。
