# DEV-1 验收用例

版本：v0.1
文档类型：Acceptance Test Cases
状态：执行中
任务编号：DEV-1
任务定义入口：ary.plan.md § DEV-1
覆盖产物：dev-1-architecture-baseline.md、dev-1-data-model-draft.md、dev-1-auth-policy.md、dev-1-state-transitions.md

---

# 1. 文档目的

本文把 `ary.plan.md` 中 DEV-1 的五条验收项拆成可逐条执行的测试场景。每条用例包含：

- 对应验收项
- 前置条件
- 测试步骤
- 预期结果
- 当前产物中的落点（防止验收时还需要回翻全文）

本文的用例在 DEMO 阶段可用 mock 数据执行；在 DEV-2 ~ DEV-5 完成后可替换为端到端自动化脚本。

---

# 2. 验收用例

## AC-1：一个 User 对同一 Race 最多一个 Registration

### 对应验收项

> 一个 User 对同一 Race 最多一个 Registration。

### 当前产物落点

| 产物 | 落点 |
| --- | --- |
| `dev-1-architecture-baseline.md` | §3.3 Registration 聚合硬约束 |
| `dev-1-data-model-draft.md` | §4.3 `registrations` 唯一键 `(raceId, userId)` |
| `dev-1-auth-policy.md` | §3.2 Registration.submit 附加校验 |

### AC-1.1：首次报名正常通过

| 步骤 | 内容 |
| --- | --- |
| 前置 | Race.status = `registration`；User A 拥有 rider role；User A 对该 Race 无 Registration |
| 操作 | User A 执行 `Registration.submit` |
| 预期 | 创建成功；`registrations` 表新增一行，`status = submitted`；`(raceId, userId)` 唯一键无冲突 |

### AC-1.2：重复报名被拒绝

| 步骤 | 内容 |
| --- | --- |
| 前置 | User A 已有 `(raceId=R1, userId=UA)` 的 Registration，status = `approved` |
| 操作 | User A 再次对 R1 执行 `Registration.submit` |
| 预期 | 返回 409 Conflict 或业务错误码；原因：`(raceId, userId)` 唯一键冲突；`registrations` 表行数不变 |

### AC-1.3：不同 User 对同一 Race 各自报名成功

| 步骤 | 内容 |
| --- | --- |
| 前置 | Race.status = `registration`；User A、User B 均拥有 rider role |
| 操作 | User A submit → User B submit |
| 预期 | 两条 Registration 均创建成功；`(raceId=R1, userId=UA)` 和 `(raceId=R1, userId=UB)` 共存 |

### AC-1.4：同一 User 对不同 Race 各自报名成功

| 步骤 | 内容 |
| --- | --- |
| 前置 | Race R1、R2 均处于 `registration`；User A 拥有 rider role |
| 操作 | User A 依次对 R1、R2 执行 submit |
| 预期 | 两条 Registration 均创建成功；`(raceId=R1, userId=UA)` 和 `(raceId=R2, userId=UA)` 共存 |

---

## AC-2：Registration ↔ RaceProject ↔ Work 结构约束

### 对应验收项

> 一个 Registration 最多一个 RaceProject 和一个主 Work；Registration approved 后由 ARY 幂等生成 RaceProject；一个 RaceProject 可在参赛过程中登记多个 CAConnection。

### 当前产物落点

| 产物 | 落点 |
| --- | --- |
| `dev-1-architecture-baseline.md` | §3.3 Registration 聚合、§3.4 RaceProject 聚合硬约束 |
| `dev-1-data-model-draft.md` | §4.3 `registrations`、§4.4 `race_projects`（`registrationId` 唯一）、§4.5 `ca_connections`、§4.7 `works`（`registrationId` 唯一） |
| `dev-1-state-transitions.md` | §3 Registration 生命周期（`submitted → approved` 连带创建 RaceProject）、§4 RaceProject 生命周期 |
| `dev-1-auth-policy.md` | §3.3 RaceProject 附加校验 |

### AC-2.1：Registration approved 后自动生成 RaceProject

| 步骤 | 内容 |
| --- | --- |
| 前置 | Registration R1 处于 `submitted`；无对应 RaceProject |
| 操作 | Organizer 执行 `Registration.approve` |
| 预期 | R1.status → `approved`；`race_projects` 新增一行，`registrationId = R1`，`aggregateIngestionStatus = not_configured`，`connectionHealth = no_signal`；`race_projects.registrationId` 唯一键成立 |

### AC-2.2：重复 approve 不会创建第二个 RaceProject（幂等）

| 步骤 | 内容 |
| --- | --- |
| 前置 | Registration R1 已 `approved`，已有 RaceProject RP1 |
| 操作 | 补偿任务或手动再次触发 `Registration.approve` 对应的 RaceProject 创建逻辑 |
| 预期 | `race_projects` 表行数不变；不因重复执行产生第二个 RaceProject；幂等逻辑基于 `registrationId` 唯一键 |

### AC-2.3：一个 Registration 最多一个主 Work

| 步骤 | 内容 |
| --- | --- |
| 前置 | Registration R1 已 approved，已有 Work W1（status=`draft`） |
| 操作 | Rider 尝试为同一 Registration 创建第二个 Work |
| 预期 | 返回业务错误；原因：`works.registrationId` 唯一键冲突；MVP 阶段一个 Registration 最多一个主 Work |

### AC-2.4：一个 RaceProject 可登记多个 CAConnection

| 步骤 | 内容 |
| --- | --- |
| 前置 | RaceProject RP1 存在且 Registration approved；参赛窗口开放 |
| 操作 | Rider 依次登记两个 CAConnection：CC1（connectorId=A, caProjectId=P1）、CC2（connectorId=B, caProjectId=P2） |
| 预期 | 两条 `ca_connections` 均创建成功；`(raceProjectId=RP1, connectorId=A, caProjectId=P1)` 和 `(raceProjectId=RP1, connectorId=B, caProjectId=P2)` 共存；RP1.aggregateIngestionStatus 随首个握手成功而更新 |

### AC-2.5：同一 RaceProject 下同 connector 同项目不可重复登记

| 步骤 | 内容 |
| --- | --- |
| 前置 | CAConnection CC1 已存在（connectorId=A, caProjectId=P1, raceProjectId=RP1） |
| 操作 | Rider 尝试再次登记（connectorId=A, caProjectId=P1, raceProjectId=RP1） |
| 预期 | 返回业务错误；原因：`(raceProjectId, connectorId, caProjectId)` 唯一键冲突 |

### AC-2.6：未 approved 的 Registration 不生成 RaceProject

| 步骤 | 内容 |
| --- | --- |
| 前置 | Registration R1 处于 `submitted` |
| 操作 | 不执行 approve，直接查询或尝试访问 R1 的 RaceProject |
| 预期 | `race_projects` 中不存在 `registrationId = R1` 的记录；Rider View 中不显示骑行工作区入口 |

---

## AC-3：CAConnection 有效数据准入

### 对应验收项

> 只有已登记、已握手、归属正确且未禁用的 CAConnection 后续数据可以进入 Projection、Evidence 或 Report 输入。

### 当前产物落点

| 产物 | 落点 |
| --- | --- |
| `dev-1-architecture-baseline.md` | §3.4 RaceProject 硬约束、§4.2 接入与审计存储约束、§5.4 真实性附加规则 |
| `dev-1-data-model-draft.md` | §4.5 `ca_connections`（`disabledAt`、`authenticityStatus`、`ingestionStatus`）、§5.1 `ca_message_receipts`、§5.3 `session_summaries` |
| `dev-1-state-transitions.md` | §4 RaceProject / CAConnection 生命周期 |
| `dev-1-auth-policy.md` | §3.4 CAConnection、§4 真实性附加规则 |

### AC-3.1：已登记 + 已握手 + 归属正确 + 未禁用 → 数据进入有效链路

| 步骤 | 内容 |
| --- | --- |
| 前置 | CAConnection CC1：`ingestionStatus=connected`，`authenticityStatus=verified`，`disabledAt=null`，`raceProjectId` 归属正确 |
| 操作 | CC1 产生一条有效 Session，ARY 收到 session data |
| 预期 | Session 写入 `sessions` → `session_summaries` 生成摘要 → 可进入 Evidence、Projection 和 Report 生成输入 |

### AC-3.2：未登记 CAConnection 的数据被拒收

| 步骤 | 内容 |
| --- | --- |
| 前置 | 某 connector 上报的 `caConnectionId` 在 `ca_connections` 中不存在 |
| 操作 | ARY 接收到该 connector 的 push 消息 |
| 预期 | 消息被拒收或进入 `ca_quarantine_audits`；不写入 `sessions`；不进入 `session_summaries`、Projection、Evidence 或 Report 输入 |

### AC-3.3：未握手的 CAConnection 数据被拒收

| 步骤 | 内容 |
| --- | --- |
| 前置 | CAConnection CC1 `ingestionStatus=not_configured`（已登记但从未握手） |
| 操作 | ARY 接收到 CC1 的 push 消息 |
| 预期 | 消息被拒收或进入隔离审计；不进入有效比赛事实链路 |

### AC-3.4：归属错误的 CAConnection 数据被拒收

| 步骤 | 内容 |
| --- | --- |
| 前置 | CAConnection CC1 属于 RaceProject RP1（Registration R1）；但 connector 上报的 `raceProjectId` 或 `registrationId` 与 CC1 实际归属不一致 |
| 操作 | ARY 接收到该消息 |
| 预期 | 归属校验失败 → 消息进入隔离审计；不进入有效链路 |

### AC-3.5：被禁用的 CAConnection 数据被拒收

| 步骤 | 内容 |
| --- | --- |
| 前置 | CAConnection CC1 原本 `connected` 且 `verified`，后因违规被 Organizer/Admin 设置为 `disabledAt=now` |
| 操作 | CC1 在被禁用后仍有 connector 尝试 push |
| 预期 | `disabledAt` 非空 → 消息被拒收；不进入 sessions 及后续链路；RaceProject.connectionHealth 重新计算 |

### AC-3.6：混合场景——部分有效、部分无效

| 步骤 | 内容 |
| --- | --- |
| 前置 | RaceProject RP1 下有 CC1（有效）和 CC2（disabled） |
| 操作 | CC1 和 CC2 各自产生数据 |
| 预期 | CC1 数据正常进入 Session → Summary → Evidence/Projection；CC2 数据被隔离；RP1.aggregateIngestionStatus 不受 CC2 单点污染 |

---

## AC-4：DCR Desktop App 安全校验

### 对应验收项

> 只有通过 DCR Desktop App 设备身份校验、消息签名校验和防重放校验的实时消息可以进入 Projection、Evidence 或 Report 输入。

### 当前产物落点

| 产物 | 落点 |
| --- | --- |
| `dev-1-architecture-baseline.md` | §4.2 接入与审计存储约束、§5.4 真实性附加规则 |
| `dev-1-data-model-draft.md` | §5.1 `ca_message_receipts`、§5.2 `ca_quarantine_audits` |
| `dev-1-auth-policy.md` | §4 真实性附加规则（authenticity_filter、quarantine_summary_filter、quarantine_detail_gate、raw_session_gate） |
| `ary-ca-integration-spec.md` | §2.1 DCR Desktop App 受信边界、§3.3 防伪防篡改防重放规则、§5.6 失败样例 |

### AC-4.1：全量校验通过 → 数据进入有效链路

| 步骤 | 内容 |
| --- | --- |
| 前置 | DCR Desktop App 已登记（`appInstanceId` 有效、`deviceKeyId` 未撤销）；消息携带正确签名、nonce、sequence、timestamp |
| 操作 | ARY 接收消息 → 验签通过 → nonce 不重复 → sequence 单调递增 → timestamp 在校验窗口内 |
| 预期 | `ca_message_receipts.verificationResult = passed`；消息可进入 Session → Session Summary → Evidence/Projection/Report 输入 |

### AC-4.2：签名不一致 → 进入隔离审计

| 步骤 | 内容 |
| --- | --- |
| 前置 | 消息体在传输中被篡改或签名计算错误 |
| 操作 | ARY 验签：`signature.bodyHash != hash(normalizedBody)` 或 `signature.value` 无法用已登记公钥验证 |
| 预期 | `ca_message_receipts.verificationResult = signature_mismatch` 或 `body_hash_mismatch`；消息写入 `ca_quarantine_audits`；不进入 Session、Projection、Evidence、Report |

### AC-4.3：nonce 重放 → 进入隔离审计

| 步骤 | 内容 |
| --- | --- |
| 前置 | 先前已有一条 `nonce=N1` 的消息成功接收 |
| 操作 | 攻击者或故障重传同一条 nonce 的消息 |
| 预期 | `ca_message_receipts.verificationResult = nonce_replayed`；消息写入 `ca_quarantine_audits`；不进入有效链路 |

### AC-4.4：sequence 回退 → 进入隔离审计

| 步骤 | 内容 |
| --- | --- |
| 前置 | CAConnection CC1 上次接收的 sequence=10 |
| 操作 | 接收到 sequence=8 的消息 |
| 预期 | `verificationResult = sequence_regression`；进入隔离审计 |

### AC-4.5：deviceKeyId 已撤销 → 进入隔离审计

| 步骤 | 内容 |
| --- | --- |
| 前置 | CAConnection CC1 执行了密钥轮换，旧 `deviceKeyId=K1` 已被标记为撤销 |
| 操作 | 使用 K1 签名的消息到达 |
| 预期 | `verificationResult = key_revoked`；进入隔离审计 |

### AC-4.6：appInstanceId 未知 → 进入隔离审计

| 步骤 | 内容 |
| --- | --- |
| 前置 | 消息携带的 `appInstanceId` 在 `ca_connections` 中无匹配记录 |
| 操作 | ARY 接收消息 |
| 预期 | `verificationResult = app_instance_unknown`；进入隔离审计；不建立新 Session |

### AC-4.7：校验失败消息的审计可见性

| 步骤 | 内容 |
| --- | --- |
| 前置 | AC-4.2 ~ AC-4.6 中的失败消息已进入 `ca_quarantine_audits` |
| 操作 | Public 用户查询隔离审计 → Rider（非 own）查询 → Judge 查询 assigned 范围外 → Organizer（managed race）查询 → Admin 查询 |
| 预期 | Public: 403/空；Rider（非 own）: 只返回 own 的 `quarantine_summary`；Judge: 只返回 assigned work 的 risk summary；Organizer: 返回 managed race 范围的 `quarantine_summary`，可查 `quarantine_detail`；Admin: 可查全部 |

---

## AC-5：CA 接入失败不阻断业务主流程

### 对应验收项

> RaceProject 聚合 CA 接入 failed / not_configured 不阻断提交、评审和 Award 流程，但应生成评审前风险提示。

### 当前产物落点

| 产物 | 落点 |
| --- | --- |
| `dev-1-architecture-baseline.md` | §3.4 RaceProject 硬约束 |
| `dev-1-data-model-draft.md` | §4.4 `race_projects`（`aggregateIngestionStatus`、`connectionHealth`、`reviewFlags[]`）、§4.3 `registrations.reviewFlags[]` |
| `dev-1-state-transitions.md` | §4 RaceProject 禁止迁移（failed 不触发 Registration withdrawn）、§3 Registration 禁止迁移 |
| `dev-1-auth-policy.md` | §3.3 RaceProject、§3.5 Work、§3.8 Award |

### AC-5.1：not_configured 时仍可提交 Work

| 步骤 | 内容 |
| --- | --- |
| 前置 | RaceProject RP1 `aggregateIngestionStatus = not_configured`，`connectionHealth = no_signal`；Race.status = `running`；Registration approved |
| 操作 | Rider 创建 Work → 填写标题/摘要 → submit |
| 预期 | Work 创建成功；`works.status = submitted`；不因 CA 未配置而被阻断；`registrations.reviewFlags[]` 中出现 `flagType = ca_unconfigured` 的记录 |

### AC-5.2：全部 CAConnection failed 时仍可提交 Work

| 步骤 | 内容 |
| --- | --- |
| 前置 | RP1 下所有 CAConnection 均 `ingestionStatus = failed` 或 `disabledAt` 非空；RP1.aggregateIngestionStatus = `failed`，connectionHealth = `all_failed` |
| 操作 | Rider 提交 Work |
| 预期 | Work 提交成功；`registrations.reviewFlags[]` 中出现 `flagType = ca_failed`；不触发 Registration `withdrawn` |

### AC-5.3：CA 接入异常时仍可进入评审

| 步骤 | 内容 |
| --- | --- |
| 前置 | RP1 为 `failed` 或 `not_configured`；Work 已 submitted + locked；Race 进入 `judging` |
| 操作 | Organizer 为 Judge 分配该 Work → Judge 创建 JudgingRecord → 评分 → submit |
| 预期 | JudgeAssignment 和 JudgingRecord 均正常创建和提交；评审流程不因 CA 状态而阻断 |

### AC-5.4：CA 接入异常时仍可颁发 Award

| 步骤 | 内容 |
| --- | --- |
| 前置 | RP1 为 `failed`；Registration R1 的 Work 已提交、已评审、JudgingRecord 已 submitted |
| 操作 | Organizer 创建 Award draft（registrationId=R1, awardName=Best Effort, rank=1）→ publish |
| 预期 | Award 创建并发布成功；Award 授予不因 CA 状态受阻 |

### AC-5.5：风险提示生成验证

| 步骤 | 内容 |
| --- | --- |
| 前置 | RP1.aggregateIngestionStatus = `not_configured`，connectionHealth = `no_signal` |
| 操作 | 系统触发 Review Flag Check |
| 预期 | `registrations.reviewFlags[]` 新增 `{ flagType: "ca_unconfigured", reason: "RaceProject 下无已登记 CAConnection", createdAt, resolved: false }`；Organizer View 中该 Registration 出现"证据缺口"风险标记 |

### AC-5.6：部分 CAConnection 正常时风险提示降级

| 步骤 | 内容 |
| --- | --- |
| 前置 | RP1 下 CC1 为 `active + verified`，CC2 为 `failed`；RP1.aggregateIngestionStatus = `active`，connectionHealth = `partial_failed` |
| 操作 | 触发 Review Flag Check |
| 预期 | `registrations.reviewFlags[]` 出现 `flagType = ca_failed`（仅针对 CC2），但不出现 `ca_unconfigured`；Organizer View 中显示 risk summary 而非完全阻断 |

### AC-5.7：CA 接入状态不得驱动 Registration 进入 withdrawn

| 步骤 | 内容 |
| --- | --- |
| 前置 | RP1.aggregateIngestionStatus = `failed` |
| 操作 | 系统定时任务或 CA 状态聚合流程运行 |
| 预期 | Registration.status 保持 `approved`，不变为 `withdrawn`；状态迁移日志中不出现 `Registration.status: approved → withdrawn` 的自动触发记录 |

---

# 3. 用例覆盖矩阵

| AC | 用例数 | 覆盖的 DEV-1 产物 |
| --- | --- | --- |
| AC-1 | 4 | architecture-baseline、data-model-draft、auth-policy |
| AC-2 | 6 | architecture-baseline、data-model-draft、state-transitions、auth-policy |
| AC-3 | 6 | architecture-baseline、data-model-draft、state-transitions、auth-policy |
| AC-4 | 7 | architecture-baseline、data-model-draft、auth-policy、ca-integration-spec |
| AC-5 | 7 | architecture-baseline、data-model-draft、state-transitions、auth-policy |
| **合计** | **30** | **全部五份 DEV-1 产物** |

---

# 4. 执行建议

| 阶段 | 可执行用例 | 执行方式 |
| --- | --- | --- |
| DEV-1 文档验收 | 全部 30 条 | 逐条对照文档人工走查 |
| DEV-2 ~ DEV-4 后 | AC-1、AC-2、AC-5（部分） | mock 数据 + 接口测试 |
| DEV-5 后 | AC-3、AC-4、AC-5（全部） | 端到端自动化 + CA 模拟器 |

---

# 5. 下一入口

本文完成后，DEV-1 的验收用例已从"概念覆盖"推进为"可逐条执行的测试场景"。下一步：

1. 将本文接入 DEV-1 交付记录和 QA Plan 的测试用例索引。
2. 在读模型刷新策略和审计操作流程图完成后，为 AC-3 / AC-4 的隔离审计侧补足操作级用例。
