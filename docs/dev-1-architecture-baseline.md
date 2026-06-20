# DEV-1 架构基线

版本：v0.1
文档类型：Architecture Baseline
状态：执行中
任务编号：DEV-1
任务定义入口：ary.plan.md
上游输入：ary-domain-analysis.v0.3.md、ary-permission-matrix.md、m2-input-final-checklist.md、ux-1-closure-delivery.md

---

# 1. 文档目的

本文把 DEV-1 当前阶段需要落下的正式架构输入收敛成一份可执行基线，覆盖三件事：

* 聚合边界和写模型归属。
* 存储边界与读模型 / Projection 归属。
* 将权限矩阵转成接口鉴权规则。

本文不展开 UI 实现、部署方案或完整字段级 API schema；目标是先把后续 DEV-2 到 DEV-7 都会依赖的核心架构约束固定下来。

字段级数据模型草案见同目录 `dev-1-data-model-draft.md`，本文只保留聚合边界与存储归属，不重复展开字段级定义。

---

# 2. DEV-1 当前结论

当前 DEV-1 采用以下基础判断：

1. Race、Registration、RaceProject、Work、JudgeAssignment、JudgingRecord、Award、Report 属于核心写模型聚合。
2. CAConnection 和 Session 不单独升级为顶层赛事聚合；它们归属于 RaceProject 接入边界，但会拥有独立存储和独立接入校验流程。
3. Projection、Leaderboard、Gallery、Screen Feed、Results 等页面对象都是读取模型，不作为最终事实源。
4. 权限判断必须落到接口层，且以 `public`、`own`、`assigned`、`managed race`、`system` 五类作用域为统一判定语言。
5. GitHub Repo 只能作为作品代码材料入口或 Evidence 外部引用，不能替代任何实时 CA 接入事实。

---

# 3. 聚合边界

## 3.1 Race 聚合

聚合职责：

* 承载赛事主身份、赛题、赛程、规则、奖项配置、公开状态和 organizer 范围。
* 决定 Race 生命周期：`draft`、`published`、`registration`、`running`、`submitting`、`judging`、`completed`、`archived`。
* 作为 Registration、Award、Announcement、Projection、Report 的主归属上下文。

聚合内核心字段方向：

* `raceId`
* `slug`
* `title`
* `challengeBrief`
* `status`
* `timeWindows`
* `rules`
* `submissionRequirements`
* `awardSettings`
* `organizerUserIds`
* `createdByUserId`
* `visibility`

不直接放入 Race 聚合的内容：

* Registration 明细
* Work 明细
* CA 原始消息
* JudgingRecord 明细

原因：这些对象写入频率、权限边界和生命周期都不同，直接内嵌会导致 Race 聚合过大。

## 3.2 User 聚合

聚合职责：

* 承载 GitHub 登录后形成的 ARY User 身份。
* 管理 `User.roles`、公开档案基础字段和个人资料完整度。
* 作为 Rider、Judge、Organizer、Admin 四类角色视图的统一身份来源。

聚合内核心字段方向：

* `userId`
* `githubAccountId`
* `slug`
* `displayName`
* `profile`
* `roles[]`
* `profileCompletionStatus`
* `status`

说明：MVP 不引入独立 `RoleAssignment` 实体，角色只作为 User 聚合内集合维护。

## 3.3 Registration 聚合

聚合职责：

* 记录 User 对某一 Race 的报名事实。
* 管理提交、审批、拒绝、退赛等报名生命周期。
* 作为 RaceProject 自动生成和主 Work 归属的上游事实。

聚合内核心字段方向：

* `registrationId`
* `raceId`
* `userId`
* `status`
* `submittedAt`
* `approvedAt`
* `approvedByUserId`
* `reviewFlags[]`

硬约束：

* 一个 User 对同一 Race 最多一个 Registration。
* CA 接入状态不得驱动 Registration 自动进入 `withdrawn`。

## 3.4 RaceProject 聚合

聚合职责：

* 承载 Registration 进入比赛后的骑行工作区事实。
* 聚合多个 CAConnection 的接入健康度、真实性状态结果和风险提示。
* 作为 Session Summary、Evidence、Projection 输入和 Report 输入的接入边界。

聚合内核心字段方向：

* `raceProjectId`
* `registrationId`
* `raceId`
* `userId`
* `repoUrl`
* `aggregateIngestionStatus`
* `authenticitySummary`
* `reviewFlags[]`
* `currentPrimaryWorkId`

RaceProject 下属对象：

* CAConnection
* Session
* Session Summary
* 隔离审计摘要

硬约束：

* Registration approved 后由系统幂等创建 RaceProject。
* 一个 Registration 最多一个 RaceProject。
* 一个 RaceProject 可在参赛过程中登记多个 CAConnection。
* 聚合状态 `failed` / `not_configured` 不阻断作品提交、评审和 Award，只生成评审前风险提示。

## 3.5 Work 聚合

聚合职责：

* 承载作品资产本身，而不是提交动作日志。
* 管理草稿、提交、锁定、隐藏、公开等状态。
* 作为 Public Site、Judge View、Results、Review 的核心展示对象之一。

聚合内核心字段方向：

* `workId`
* `registrationId`
* `raceId`
* `ownerUserId`
* `status`
* `visibility`
* `title`
* `summary`
* `demoUrl`
* `videoUrl`

硬约束：

* MVP 阶段一个 Registration 最多一个主 Work。

## 3.6 JudgeAssignment 聚合

聚合职责：

* 记录哪个 Judge 被分配去评哪个 Work。
* 提供 JudgingRecord 的授权前提。

聚合内核心字段方向：

* `judgeAssignmentId`
* `raceId`
* `workId`
* `judgeUserId`
* `assignedByUserId`
* `status`

硬约束：

* 只有拥有 organizer 或 admin 权限的用户可以创建 / 调整分配。

## 3.7 JudgingRecord 聚合

聚合职责：

* 记录评委对已分配作品的评分与评语事实。
* 为 Award、Review、Report 提供评审事实输入。

聚合内核心字段方向：

* `judgingRecordId`
* `judgeAssignmentId`
* `workId`
* `judgeUserId`
* `score`
* `comments`
* `status`
* `submittedAt`

硬约束：

* JudgingRecord 必须来源于 JudgeAssignment。

## 3.8 Award 聚合

聚合职责：

* 承载获奖 Registration 及其奖项名次事实。
* 为 Leaderboard 读取模型提供稳定事实源。

聚合内核心字段方向：

* `awardId`
* `raceId`
* `registrationId`
* `workId?`
* `awardName`
* `rank`
* `status`
* `publishedAt`

说明：Leaderboard 是 Award 的读取模型，不反向成为 Award 的事实源。

## 3.9 Evidence 聚合

聚合职责：

* 承载用于解释能力、作品和过程的证据事实。
* 管理可见性与来源引用，不直接替代原始来源。

聚合内核心字段方向：

* `evidenceId`
* `registrationId`
* `raceId`
* `sourceType`
* `sourceRef`
* `visibility`
* `summary`
* `tags[]`

说明：Session Summary、Work、JudgingRecord、GitHub 代码材料都可以通过 `sourceRef` 成为 Evidence 来源。

## 3.10 Report 聚合

聚合职责：

* 承载 `rider_report`、`race_report`、`review_summary` 等赛后报告实体。
* 管理生成、编辑、审核、发布的状态流转。

聚合内核心字段方向：

* `reportId`
* `raceId`
* `reportType`
* `subjectRegistrationId?`
* `status`
* `visibility`
* `content`
* `generatedFrom`
* `publishedAt`

硬约束：

* `rider_report` 必须有关联的 `subjectRegistrationId`。
* `race_report` / `review_summary` 的 `subjectRegistrationId` 必须为空。

## 3.11 Projection / Read Model 边界

Projection 不是聚合，而是读取模型层：

* `race_progress_projection`
* `registration_status_projection`
* `cost_projection`
* `risk_projection`
* `submission_projection`
* `judging_projection`
* `current_leaderboard_projection`
* `screen_feed_projection`
* `leaderboard_read_model`
* `home_gallery_read_model`

关键约束：

* Projection 可重建，不作为最终事实源。
* Projection 失败不污染 Registration、Work、Award、Report 等核心事实。

---

# 4. 存储边界

## 4.1 写模型存储

| 存储边界 | 归属对象 | 说明 |
| --- | --- | --- |
| `races` | Race | 赛事主事实、赛题、赛程、规则、公开状态 |
| `users` | User | GitHub 身份映射、资料、roles |
| `registrations` | Registration | 报名事实、审批状态、评审前风险提示 |
| `race_projects` | RaceProject | 参赛工作区、聚合接入状态、真实性摘要 |
| `ca_connections` | CAConnection | 单连接登记、握手、公钥、设备身份、连接状态 |
| `sessions` | Session | 实时接入会话索引与技术接入边界 |
| `works` | Work | 作品资产主数据 |
| `judge_assignments` | JudgeAssignment | 评审分配事实 |
| `judging_records` | JudgingRecord | 评分和评语事实 |
| `awards` | Award | 获奖事实 |
| `evidences` | Evidence | 证据摘要与来源引用 |
| `reports` | Report | 报告与发布事实 |
| `announcements` | Announcement | 公告事实 |

## 4.2 接入与审计存储

| 存储边界 | 归属对象 | 说明 |
| --- | --- | --- |
| `ca_message_receipts` | 接入技术层 | 记录消息接收、timestamp、nonce、sequence 结果 |
| `ca_quarantine_audits` | 隔离审计 | 保存 `verification_failed` / `quarantined` 消息与处置状态 |
| `session_summaries` | 接入摘要层 | 从可接受 Session 生成的过程摘要 |

约束：

* 未通过设备身份校验、消息签名校验或防重放校验的实时消息只能进入 `ca_quarantine_audits`，不得进入 `session_summaries`、Projection、Evidence 或 Report 生成输入。

## 4.3 读取模型存储

| 存储边界 | 对应页面 / 场景 |
| --- | --- |
| `home_gallery_read_model` | Race Gallery |
| `race_page_read_model` | Race Page |
| `live_hall_read_model` | Live Hall |
| `works_read_model` | Works / Work Page |
| `results_read_model` | Results |
| `review_read_model` | Review |
| `rider_profile_read_model` | Rider Profile |
| `console_overview_read_model` | Organizer / Rider / Judge / Admin |
| `screen_feed_projection` | Screen Display |
| `leaderboard_read_model` | Results / Leaderboard |

---

# 5. 接口鉴权规则

## 5.1 统一判定顺序

所有接口按以下顺序判定：

1. 资源是否存在。
2. 资源是否处于公开可读状态。
3. 当前用户是否具备所需 role。
4. 当前用户是否满足 `own`、`assigned`、`managed race`、`system` 作用域。
5. 当前动作是否受真实性、可见性或发布状态额外限制。

## 5.2 作用域规则

| 作用域 | 判定方式 |
| --- | --- |
| `public` | 资源 `published` 且 `visibility = public` |
| `own` | 资源上的 `userId`、`ownerUserId` 或 `subjectRegistrationId` 等于当前用户 |
| `assigned` | 存在以当前 `judgeUserId` 为主体的 JudgeAssignment |
| `managed race` | 当前用户在 Race 的 `organizerUserIds` 内，或满足创建者 / 管理者关系 |
| `system` | 当前用户拥有 `admin` role |

## 5.3 资源到鉴权规则映射

| 资源 | 读规则 | 写规则 |
| --- | --- | --- |
| Race | public / own registered race / assigned race / managed race / system | organizer for managed race, admin for system |
| Registration | own / assigned work context / managed race / system | rider submit own, organizer approve managed race, admin exception |
| RaceProject | own / assigned work summary / managed race / system | system creates, rider manages own connection metadata in allowed window |
| CAConnection | own / managed race / system | rider own during acceptance window, organizer/admin exception |
| Work | public / own / assigned / managed race / system | rider own registration, organizer/admin lock/publish/hide |
| JudgeAssignment | assigned / managed race / system | organizer/admin |
| JudgingRecord | assigned own / managed race / system | assigned judge create/submit |
| Award | public published / managed race draft / system | organizer/admin |
| Evidence | public summary / own / assigned work summary / managed race / system | visibility by rider limited, cite/publish by organizer/admin |
| Report | public published / own rider report / assigned summary / managed race / system | organizer/admin generate/edit/publish |
| Projection | public via Live Hall / own summary / assigned context / managed race / system | organizer/admin rebuild/inspect |
| ScreenDisplay | public display / managed race / system | organizer/admin configure/switch/fallback |
| User | public profile / own profile / managed race user summary / system | own update profile, admin update roles |

## 5.4 真实性附加规则

必须额外执行以下鉴权 / 过滤：

* `view_authenticity_status` 只返回 `verified`、`verification_failed`、`quarantined` 及必要原因摘要。
* `view_quarantine_audit_summary` 可返回原因码、触发时间、影响连接和处置状态，但不得返回原始敏感消息内容。
* `view_quarantine_audit_detail` 只允许 Organizer / Admin 在内部异常处理上下文访问。
* Public 永远不能读取原始 CA Session 或隔离审计明细。

---

# 6. 验收约束映射

| DEV-1 验收项 | 本基线中的落点 |
| --- | --- |
| 一个 User 对同一 Race 最多一个 Registration | Registration 聚合约束 + `registrations` 唯一键方向 |
| 一个 Registration 最多一个 RaceProject 和一个主 Work | Registration / RaceProject / Work 聚合约束 |
| Registration approved 后由 ARY 幂等生成 RaceProject | RaceProject 聚合职责 |
| 一个 RaceProject 可在参赛过程中登记多个 CAConnection | RaceProject 下属对象和接入窗口规则 |
| 只有已登记、已握手、归属正确且未禁用的 CAConnection 数据可进入有效输入 | CAConnection 存储边界 + 真实性附加规则 |
| 只有通过 DCR Desktop App 设备身份校验、消息签名校验和防重放校验的消息可进入有效输入 | 接入与审计存储边界 |
| failed / not_configured 不阻断提交、评审和 Award，但应生成评审前风险提示 | RaceProject 聚合约束 + Review Flag 方向 |

---

# 7. 下一步建议

1. 以本文为边界，把 `managed race`、`own`、`assigned` 三类作用域转成具体接口中间件或 policy 函数。
2. 基于 `dev-1-data-model-draft.md` 继续形成接口草案和状态迁移图。
3. 在进入 DEV-2 到 DEV-5 前，优先冻结 Registration、RaceProject、CAConnection、Work、JudgingRecord、Award 的主键和关联键方向。
