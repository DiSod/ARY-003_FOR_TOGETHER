# DEV-1 字段级数据模型草案

版本：v0.1
文档类型：Data Model Draft
状态：执行中
任务编号：DEV-1
上游基线：dev-1-architecture-baseline.md
领域基线：ary-domain-analysis.v0.3.md
CA 契约：ary-ca-integration-spec.md

---

# 1. 文档目的

本文基于 `dev-1-architecture-baseline.md` 中已冻结的聚合边界和存储边界，为每个存储单元展开字段级定义。本文仍然不是数据库 DDL 或最终 schema，而是把字段的类型、必填性、唯一键方向和关联键方向先落下来，方便后续直接进入接口设计和技术选型。

本文覆盖：
- 写模型存储（10 个主存储单元）
- 接入与审计存储（3 个存储单元）
- 读取模型存储（10 个页面读取方向）
- 全局唯一键方向与跨表关联方向

---

# 2. 本文当前未展开的内容

以下内容属于 DEV-1 后续细化，不在本文展开：

- 具体索引策略和复合索引定义
- 最终 DDL 与数据库方言
- 接口字段级 schema
- Projection / Read Model 的刷新链路与重建策略
- 审计操作流程图

---

# 3. 通用约定

## 3.1 命名

- 主键统一为 `<entity>Id`，值域使用 UUID v7。
- 时间戳字段统一为 ISO 8601 字符串，精确到毫秒。
- 枚举字段统一为小写 snake_case 字符串。
- 外键字段命名遵循 `<referencedEntity>Id`。

## 3.2 必填标记

| 标记 | 含义 |
| --- | --- |
| ✓ | 创建时必填，不允许为空 |
| ✗ | 可选字段，允许为空 |
| 自动 | 由系统在特定生命周期节点生成，不可由调用方手动写入 |
| 条件必填 | 在特定 reportType / status / 场景下必填 |

## 3.3 审计字段

所有写模型存储均应包含：
- `createdAt`
- `updatedAt`
- `version`（乐观锁版本号）

以下不再逐表重复列出。

---

# 4. 写模型存储

## 4.1 `races` — Race

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `raceId` | UUID | ✓ | 主键 |
| `slug` | string | ✓ | 公开 URL 标识，全局唯一 |
| `title` | string | ✓ | 赛事标题 |
| `challengeBrief` | string | ✓ | 赛题摘要 |
| `status` | enum | ✓ | draft / published / registration / running / submitting / judging / completed / archived |
| `timeWindows` | object | ✓ | `{ registrationStart, registrationEnd, raceStart, raceEnd, submissionDeadline, judgingStart, judgingEnd }` |
| `rules` | string | ✗ | 参赛规则，Markdown 或纯文本 |
| `submissionRequirements` | string | ✗ | 提交字段和格式要求 |
| `awardSettings` | array | ✗ | `[{ awardName, description }]` |
| `organizerUserIds` | array | ✓ | 拥有 managed race 权限的 userId 集合 |
| `createdByUserId` | UUID | ✓ | 创建者 userId |
| `visibility` | enum | ✓ | public / hidden / internal |
| `createdAt` | datetime | 自动 | 创建时间 |
| `updatedAt` | datetime | 自动 | 最后更新时间 |
| `version` | int | 自动 | 乐观锁版本 |

唯一键方向：
- `slug` 全局唯一
- `raceId` 主键唯一

## 4.2 `users` — User

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `userId` | UUID | ✓ | 主键 |
| `githubAccountId` | string | ✓ | GitHub 账号 ID，全局唯一 |
| `slug` | string | ✓ | 公开 URL 标识，全局唯一 |
| `displayName` | string | ✓ | 显示名称 |
| `profile` | object | ✗ | `{ bio, avatarUrl, contact, affiliations }` |
| `roles` | array | ✓ | 角色集合，枚举值：rider / judge / organizer / admin |
| `profileCompletionStatus` | enum | ✓ | incomplete / complete |
| `status` | enum | ✓ | active / suspended |
| `createdAt` | datetime | 自动 | 首次登录时间 |
| `updatedAt` | datetime | 自动 | 最后更新时间 |
| `version` | int | 自动 | 乐观锁版本 |

唯一键方向：
- `githubAccountId` 全局唯一
- `slug` 全局唯一
- `userId` 主键唯一

规则：
- MVP 不引入独立 `RoleAssignment` 实体；`roles[]` 直接在 User 聚合内维护。
- `status = suspended` 时所有非 public 权限自动失效。
- Admin 通过 `roles[]` 包含 `admin` 来判定，不另建 admin 标识字段。

## 4.3 `registrations` — Registration

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `registrationId` | UUID | ✓ | 主键 |
| `raceId` | UUID | ✓ | 所属 Race |
| `userId` | UUID | ✓ | 报名 User |
| `status` | enum | ✓ | submitted / approved / rejected / withdrawn |
| `submittedAt` | datetime | 自动 | 提交报名时间 |
| `approvedAt` | datetime | ✗ | 审批通过时间 |
| `approvedByUserId` | UUID | ✗ | 审批人 userId |
| `rejectedAt` | datetime | ✗ | 拒绝时间 |
| `rejectedReason` | string | ✗ | 拒绝原因 |
| `withdrawnAt` | datetime | ✗ | 退赛时间 |
| `reviewFlags` | array | ✗ | `[{ flagType, reason, createdAt, resolved }]` |
| `createdAt` | datetime | 自动 | 创建时间 |
| `updatedAt` | datetime | 自动 | 最后更新时间 |
| `version` | int | 自动 | 乐观锁版本 |

唯一键方向：
- `registrationId` 主键唯一
- `(raceId, userId)` 组合唯一 —— 一个 User 对同一 Race 最多一个 Registration

关联键方向：
- `raceId` → `races.raceId`
- `userId` → `users.userId`
- `approvedByUserId` → `users.userId`

规则：
- CA 接入状态不得驱动 `status` 自动进入 `withdrawn`。
- `reviewFlags[]` 中的 flagType 枚举：`no_ca_data`、`ca_unconfigured`、`ca_failed`、`empty_work`、`missing_material`、`suspected_violation`。

## 4.4 `race_projects` — RaceProject

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `raceProjectId` | UUID | ✓ | 主键 |
| `registrationId` | UUID | ✓ | 所属 Registration |
| `raceId` | UUID | ✓ | 所属 Race（冗余，便于查询） |
| `userId` | UUID | ✓ | 参赛 User（冗余，便于查询） |
| `repoUrl` | string | ✗ | GitHub 仓库地址，仅作为代码材料入口 |
| `aggregateIngestionStatus` | enum | ✓ | not_configured / connected / active / failed |
| `connectionHealth` | enum | ✓ | no_signal / ok / partial_failed / all_failed |
| `authenticitySummary` | object | ✗ | `{ verifiedCount, verificationFailedCount, quarantinedCount, lastVerifiedAt }` |
| `reviewFlags` | array | ✗ | 聚合层面的风险提示 |
| `currentPrimaryWorkId` | UUID | ✗ | 当前主 Work 引用 |
| `createdAt` | datetime | 自动 | RaceProject 生成时间 |
| `updatedAt` | datetime | 自动 | 最后更新时间 |
| `version` | int | 自动 | 乐观锁版本 |

唯一键方向：
- `raceProjectId` 主键唯一
- `registrationId` 唯一 —— 一个 Registration 最多一个 RaceProject

关联键方向：
- `registrationId` → `registrations.registrationId`
- `raceId` → `races.raceId`
- `userId` → `users.userId`
- `currentPrimaryWorkId` → `works.workId`

规则：
- Registration approved 后由系统幂等创建。
- `aggregateIngestionStatus` 由下属 CAConnection 状态聚合计算，不直接由调用方写入。
- `connectionHealth` 与 `aggregateIngestionStatus` 共同表达接入健康度，failed 不触发 Registration 退赛。

## 4.5 `ca_connections` — CAConnection

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `caConnectionId` | UUID | ✓ | 主键 |
| `raceProjectId` | UUID | ✓ | 所属 RaceProject |
| `registrationId` | UUID | ✓ | 所属 Registration（冗余） |
| `raceId` | UUID | ✓ | 所属 Race（冗余） |
| `userId` | UUID | ✓ | 所属 Rider（冗余） |
| `caType` | string | ✓ | CA 类型：codex / claude_code / other |
| `connectorId` | string | ✓ | connector 标识 |
| `connectorVersion` | string | ✓ | connector 版本 |
| `caProjectId` | string | ✗ | 外部 CA Project 标识 |
| `ingestionStatus` | enum | ✓ | not_configured / connected / active / failed |
| `authenticityStatus` | enum | ✓ | verified / verification_failed / quarantined |
| `authenticityReason` | string | ✗ | 真实性异常原因码 |
| `appInstanceId` | string | ✗ | DCR Desktop App 实例标识 |
| `deviceKeyId` | string | ✗ | 当前有效设备密钥标识 |
| `deviceKeyFingerprint` | string | ✗ | 当前设备公钥指纹 |
| `registeredAt` | datetime | ✗ | 登记时间 |
| `lastHandshakeAt` | datetime | ✗ | 最后握手时间 |
| `lastVerifiedAt` | datetime | ✗ | 最后真实性校验通过时间 |
| `disabledAt` | datetime | ✗ | 禁用时间 |
| `disabledReason` | string | ✗ | 禁用原因 |
| `createdAt` | datetime | 自动 | 创建时间 |
| `updatedAt` | datetime | 自动 | 最后更新时间 |
| `version` | int | 自动 | 乐观锁版本 |

唯一键方向：
- `caConnectionId` 主键唯一
- `(raceProjectId, connectorId, caProjectId)` 组合唯一 —— 同一 RaceProject 下同一 connector 的同一外部 CA Project 不重复登记

关联键方向：
- `raceProjectId` → `race_projects.raceProjectId`
- `registrationId` → `registrations.registrationId`

规则：
- `ingestionStatus = active` 的前提是 `authenticityStatus = verified`。
- `disabledAt` 非空时，该连接的所有数据不得进入 Projection、Evidence 或 Report 输入。
- 密钥轮换时，旧 `deviceKeyId` 必须设为已撤销，新 key 写入后 `lastHandshakeAt` 重置。
- Rider 可在参赛过程中新增 CAConnection，截止窗口由 Race Rules 另行定义。

## 4.6 `sessions` — Session

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `sessionId` | UUID | ✓ | 主键 |
| `caConnectionId` | UUID | ✓ | 所属 CAConnection |
| `raceProjectId` | UUID | ✓ | 所属 RaceProject（冗余） |
| `registrationId` | UUID | ✓ | 所属 Registration（冗余） |
| `caSessionId` | string | ✓ | 外部 CA 端的 session 标识 |
| `status` | enum | ✓ | started / active / completed / failed |
| `startedAt` | datetime | ✓ | 开始时间 |
| `completedAt` | datetime | ✗ | 完成时间 |
| `durationMs` | int | ✗ | 持续时间（毫秒） |
| `taskCount` | int | ✗ | 任务数 |
| `metrics` | object | ✗ | `{ tokenUsage, estimatedCost, completionRate }` |
| `createdAt` | datetime | 自动 | 创建时间 |
| `updatedAt` | datetime | 自动 | 最后更新时间 |
| `version` | int | 自动 | 乐观锁版本 |

唯一键方向：
- `sessionId` 主键唯一
- `(caConnectionId, caSessionId)` 组合唯一 —— 同一 CAConnection 下同一外部 session 不重复

关联键方向：
- `caConnectionId` → `ca_connections.caConnectionId`
- `raceProjectId` → `race_projects.raceProjectId`

规则：
- Session 是技术接入边界，不等同于业务侧 Session Summary。
- 只有 `ca_connections.authenticityStatus = verified` 且 `disabledAt` 为空的 CAConnection 产生的 Session 可进入后续摘要流程。
- 不满足条件的 Session 仍可记录，但关联的 Session Summary 不得进入 Evidence / Report 输入。

## 4.7 `works` — Work

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `workId` | UUID | ✓ | 主键 |
| `registrationId` | UUID | ✓ | 所属 Registration |
| `raceId` | UUID | ✓ | 所属 Race（冗余） |
| `ownerUserId` | UUID | ✓ | 作者 userId |
| `title` | string | ✓ | 作品标题 |
| `summary` | string | ✗ | 作品摘要 |
| `description` | string | ✗ | 作品详细描述，Markdown |
| `demoUrl` | string | ✗ | Demo 地址 |
| `videoUrl` | string | ✗ | 演示视频地址 |
| `repoUrl` | string | ✗ | 关联 GitHub 仓库地址 |
| `status` | enum | ✓ | draft / submitted / locked / hidden |
| `visibility` | enum | ✓ | public / hidden / internal |
| `submittedAt` | datetime | ✗ | 提交时间 |
| `lockedAt` | datetime | ✗ | 锁定时间 |
| `createdAt` | datetime | 自动 | 创建时间 |
| `updatedAt` | datetime | 自动 | 最后更新时间 |
| `version` | int | 自动 | 乐观锁版本 |

唯一键方向：
- `workId` 主键唯一
- `registrationId` 唯一 —— MVP 阶段一个 Registration 最多一个主 Work

关联键方向：
- `registrationId` → `registrations.registrationId`
- `raceId` → `races.raceId`
- `ownerUserId` → `users.userId`

规则：
- 是否获奖由 Award 推导，不在 `status` 中增加 `awarded` 状态。
- `status = locked` 后 Rider 不可再编辑内容字段。
- `visibility = public` 且 Race 处于 completed 后，Work 可被 Public 访问。

## 4.8 `judge_assignments` — JudgeAssignment

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `judgeAssignmentId` | UUID | ✓ | 主键 |
| `raceId` | UUID | ✓ | 所属 Race |
| `workId` | UUID | ✓ | 被分配的作品 |
| `judgeUserId` | UUID | ✓ | 评委 userId |
| `assignedByUserId` | UUID | ✓ | 分配人 userId |
| `status` | enum | ✓ | assigned / in_progress / completed |
| `assignedAt` | datetime | 自动 | 分配时间 |
| `completedAt` | datetime | ✗ | 完成时间 |
| `createdAt` | datetime | 自动 | 创建时间 |
| `updatedAt` | datetime | 自动 | 最后更新时间 |
| `version` | int | 自动 | 乐观锁版本 |

唯一键方向：
- `judgeAssignmentId` 主键唯一
- `(workId, judgeUserId)` 组合唯一 —— 同一评委对同一作品最多一条分配记录

关联键方向：
- `raceId` → `races.raceId`
- `workId` → `works.workId`
- `judgeUserId` → `users.userId`
- `assignedByUserId` → `users.userId`

规则：
- 只有 `users.roles[]` 包含 `organizer` 或 `admin` 的用户可以执行 create / update / remove。
- `status = completed` 后不可再修改分配关系，只能由 organizer/admin 删除后重新分配。

## 4.9 `judging_records` — JudgingRecord

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `judgingRecordId` | UUID | ✓ | 主键 |
| `judgeAssignmentId` | UUID | ✓ | 来源分配记录 |
| `workId` | UUID | ✓ | 被评作品（冗余） |
| `judgeUserId` | UUID | ✓ | 评委 userId（冗余） |
| `scoreResult` | object | ✗ | `{ completeness, productUnderstanding, technicalImplementation }` 各维度 1-10 |
| `scoreRiding` | object | ✗ | `{ decomposition, collaboration, correction, costControl }` 各维度 1-10 |
| `comments` | string | ✗ | 评语，Markdown |
| `status` | enum | ✓ | draft / submitted |
| `submittedAt` | datetime | ✗ | 提交时间 |
| `createdAt` | datetime | 自动 | 创建时间 |
| `updatedAt` | datetime | 自动 | 最后更新时间 |
| `version` | int | 自动 | 乐观锁版本 |

唯一键方向：
- `judgingRecordId` 主键唯一
- `judgeAssignmentId` 唯一 —— 每条 JudgeAssignment 最多一条 JudgingRecord

关联键方向：
- `judgeAssignmentId` → `judge_assignments.judgeAssignmentId`
- `workId` → `works.workId`
- `judgeUserId` → `users.userId`

规则：
- JudgingRecord 必须来源于 JudgeAssignment。
- `status = draft` 时评委可编辑；`status = submitted` 后不可再修改。
- Score Rubric 当前只保留维度方向字段，完整评分规则后续细化。

## 4.10 `awards` — Award

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `awardId` | UUID | ✓ | 主键 |
| `raceId` | UUID | ✓ | 所属 Race |
| `registrationId` | UUID | ✓ | 获奖 Registration |
| `workId` | UUID | ✗ | 可选关联获奖 Work |
| `awardName` | string | ✓ | 奖项名称，如 Best Overall、Best UX |
| `rank` | int | ✓ | 名次，1 为最高 |
| `decisionReason` | string | ✗ | 决策说明或评审依据摘要 |
| `status` | enum | ✓ | draft / published / withdrawn |
| `publishedAt` | datetime | ✗ | 发布时间 |
| `createdAt` | datetime | 自动 | 创建时间 |
| `updatedAt` | datetime | 自动 | 最后更新时间 |
| `version` | int | 自动 | 乐观锁版本 |

唯一键方向：
- `awardId` 主键唯一
- `(raceId, awardName, rank)` 组合唯一 —— 同一 Race 同一奖项名称下名次不可重复
- `(raceId, registrationId, awardName)` 组合唯一 —— 同一 Registration 在同一 Race 的同一 awardName 下最多一个 Award

关联键方向：
- `raceId` → `races.raceId`
- `registrationId` → `registrations.registrationId`
- `workId` → `works.workId`

规则：
- 若 `raceId` 冗余存储，必须与 `registrations.raceId` 一致。
- `status = draft` 时只有 managed race Organizer 和 Admin 可查看。
- Leaderboard 是 Award 的读取模型，不反向写入 Award。

## 4.11 `evidences` — Evidence

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `evidenceId` | UUID | ✓ | 主键 |
| `registrationId` | UUID | ✓ | 归属 Registration |
| `raceId` | UUID | ✓ | 所属 Race（冗余） |
| `sourceType` | enum | ✓ | session_summary / work / judging_record / github_material / other |
| `sourceRef` | object | ✓ | `{ sourceId, sourceType, url?, commitSha?, prNumber? }` |
| `visibility` | enum | ✓ | public / rider_only / judge_internal / organizer_internal |
| `summary` | string | ✓ | 可公开或内部展示的证据摘要 |
| `tags` | array | ✗ | 标签集合，如 `[planning, verification, adaptation]` |
| `createdAt` | datetime | 自动 | 创建时间 |
| `updatedAt` | datetime | 自动 | 最后更新时间 |
| `version` | int | 自动 | 乐观锁版本 |

唯一键方向：
- `evidenceId` 主键唯一

关联键方向：
- `registrationId` → `registrations.registrationId`
- `raceId` → `races.raceId`

规则：
- 公开端只展示 `visibility = public` 的 Evidence 摘要。
- 原始 CA Session 不得直接作为 Evidence 的 sourceRef；只能通过 Session Summary 间接引用。
- GitHub 代码材料只能作为 `sourceType = github_material` 的外部引用，不替代实时 CA 接入事实。

## 4.12 `reports` — Report

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `reportId` | UUID | ✓ | 主键 |
| `raceId` | UUID | ✓ | 所属 Race |
| `reportType` | enum | ✓ | rider_report / race_report / review_summary |
| `subjectRegistrationId` | UUID | 条件必填 | `reportType = rider_report` 时必填；其余类型必须为空 |
| `title` | string | ✓ | 报告标题 |
| `content` | string | ✗ | 报告正文，Markdown |
| `generatedFrom` | object | ✗ | `{ sources[], generatedAt }` 记录生成输入来源 |
| `status` | enum | ✓ | draft / generated / reviewed / published |
| `visibility` | enum | ✓ | public / rider_only / organizer_internal |
| `publishedAt` | datetime | ✗ | 发布时间 |
| `createdAt` | datetime | 自动 | 创建时间 |
| `updatedAt` | datetime | 自动 | 最后更新时间 |
| `version` | int | 自动 | 乐观锁版本 |

唯一键方向：
- `reportId` 主键唯一
- `(raceId, reportType, subjectRegistrationId)` 组合唯一 —— 同一 Race 下同一类型的报告，若按 Registration 区分则不可重复

关联键方向：
- `raceId` → `races.raceId`
- `subjectRegistrationId` → `registrations.registrationId`

规则：
- `rider_report` 必须有关联的 `subjectRegistrationId`。
- `race_report` / `review_summary` 的 `subjectRegistrationId` 必须为空。
- `visibility = public` 且 `status = published` 后 Public 可读。
- `reportType = rider_report` 默认只允许对应 Rider、managed race Organizer 和 Admin 查看。

## 4.13 `announcements` — Announcement

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `announcementId` | UUID | ✓ | 主键 |
| `raceId` | UUID | ✓ | 所属 Race |
| `title` | string | ✓ | 公告标题 |
| `content` | string | ✓ | 公告正文，Markdown |
| `status` | enum | ✓ | draft / published / hidden |
| `visibility` | enum | ✓ | public / internal |
| `publishedAt` | datetime | ✗ | 发布时间 |
| `createdByUserId` | UUID | ✓ | 创建者 userId |
| `createdAt` | datetime | 自动 | 创建时间 |
| `updatedAt` | datetime | 自动 | 最后更新时间 |
| `version` | int | 自动 | 乐观锁版本 |

唯一键方向：
- `announcementId` 主键唯一

关联键方向：
- `raceId` → `races.raceId`
- `createdByUserId` → `users.userId`

规则：
- 只有 managed race Organizer 和 Admin 可创建 / 编辑 / 发布 / 隐藏。

---

# 5. 接入与审计存储

## 5.1 `ca_message_receipts` — CA 消息接收记录

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `receiptId` | UUID | ✓ | 主键 |
| `caConnectionId` | UUID | ✓ | 所属 CAConnection |
| `messageId` | string | ✓ | connector 生成的消息 ID |
| `idempotencyKey` | string | ✓ | 幂等键 |
| `schemaVersion` | string | ✓ | 消息 schema 版本 |
| `timestamp` | datetime | ✓ | 消息时间戳 |
| `nonce` | string | ✓ | 防重放 nonce |
| `sequence` | int | ✓ | 消息序列号 |
| `signatureAlgorithm` | string | ✓ | 签名算法标识 |
| `signatureBodyHash` | string | ✓ | 消息体摘要 |
| `verificationResult` | enum | ✓ | passed / signature_mismatch / body_hash_mismatch / key_revoked / nonce_replayed / timestamp_out_of_range / sequence_regression / app_instance_unknown |
| `createdAt` | datetime | 自动 | 接收时间 |

唯一键方向：
- `receiptId` 主键唯一
- `idempotencyKey` 全局唯一
- `(caConnectionId, sequence)` 组合唯一 —— 同一连接下序列号不可重复

关联键方向：
- `caConnectionId` → `ca_connections.caConnectionId`

规则：
- 无论校验结果如何，消息到达后必须记录 receipt。
- `verificationResult != passed` 时，该消息不得进入 Session Summary、Projection、Evidence 或 Report 生成流程。

## 5.2 `ca_quarantine_audits` — 隔离审计

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `quarantineId` | UUID | ✓ | 主键 |
| `receiptId` | UUID | ✓ | 关联的消息接收记录 |
| `caConnectionId` | UUID | ✓ | 来源 CAConnection |
| `raceProjectId` | UUID | ✓ | 来源 RaceProject（冗余） |
| `registrationId` | UUID | ✓ | 来源 Registration（冗余） |
| `failureReason` | enum | ✓ | signature_mismatch / body_hash_mismatch / key_revoked / nonce_replayed / timestamp_out_of_range / sequence_regression / app_instance_unknown / connector_disabled |
| `quarantineStatus` | enum | ✓ | pending_review / acknowledged / dismissed / escalated |
| `quarantinedAt` | datetime | 自动 | 隔离时间 |
| `reviewedByUserId` | UUID | ✗ | 审核人 userId |
| `reviewedAt` | datetime | ✗ | 审核时间 |
| `dispositionNote` | string | ✗ | 处置备注 |
| `rawMessageMetadata` | object | ✗ | 原始消息元数据摘要（不含消息体原文） |
| `createdAt` | datetime | 自动 | 创建时间 |
| `updatedAt` | datetime | 自动 | 最后更新时间 |

唯一键方向：
- `quarantineId` 主键唯一
- `receiptId` 唯一 —— 每条失败 receipt 最多一条 quarantine 记录

关联键方向：
- `receiptId` → `ca_message_receipts.receiptId`
- `caConnectionId` → `ca_connections.caConnectionId`
- `raceProjectId` → `race_projects.raceProjectId`

规则：
- 只记录 `verificationResult != passed` 的消息。
- `view_quarantine_audit_summary` 可返回 `failureReason`、`quarantinedAt`、`quarantineStatus`、`caConnectionId`，不返回 `rawMessageMetadata`。
- `view_quarantine_audit_detail` 仅 Organizer / Admin 可访问，可返回 `rawMessageMetadata`。
- Public 永远不可访问此表任何记录。

## 5.3 `session_summaries` — Session 摘要

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `sessionSummaryId` | UUID | ✓ | 主键 |
| `sessionId` | UUID | ✓ | 来源 Session |
| `caConnectionId` | UUID | ✓ | 来源 CAConnection（冗余） |
| `raceProjectId` | UUID | ✓ | 来源 RaceProject（冗余） |
| `registrationId` | UUID | ✓ | 来源 Registration（冗余） |
| `summaryType` | enum | ✓ | auto_generated / manual_annotation |
| `content` | string | ✓ | 摘要正文，Markdown |
| `metrics` | object | ✗ | `{ taskCount, tokenUsage, estimatedCost, durationMs, completionRate }` |
| `capabilityTags` | array | ✗ | 能力标签 |
| `generatedAt` | datetime | 自动 | 生成时间 |
| `createdAt` | datetime | 自动 | 创建时间 |
| `updatedAt` | datetime | 自动 | 最后更新时间 |

唯一键方向：
- `sessionSummaryId` 主键唯一
- `sessionId` 唯一 —— 每个 Session 最多一条摘要

关联键方向：
- `sessionId` → `sessions.sessionId`
- `caConnectionId` → `ca_connections.caConnectionId`

规则：
- 只有 `ca_connections.authenticityStatus = verified` 的 CAConnection 产生的 Session 可进入自动摘要生成。
- `summaryType = manual_annotation` 仅用于赛后说明性补充，必须标记来源、时间和可信度，不得替代实时接入证据。
- MVP 不接受赛后手动上传 Session Summary 伪造实时 CA 证据。

---

# 6. 读取模型存储

以下读取模型的具体字段级定义留待接口设计阶段完善。当前只列出每个读取模型的主键方向、来源写模型和主要消费页面。

| 读取模型 | 主键方向 | 来源写模型 | 主要消费页面 |
| --- | --- | --- | --- |
| `home_gallery_read_model` | 按 `raceId` 组织，含 `featuredRaceId` | races, works, awards, registrations | Race Gallery |
| `race_page_read_model` | 按 `raceId` 组织 | races, registrations, works, awards | Race Page |
| `live_hall_read_model` | 按 `raceId` 组织，含事件流 | races, race_projects, session_summaries, projections | Live Hall |
| `works_read_model` | 按 `raceId` 组织，支持筛选排序 | works, registrations, users | Works / Work Page |
| `results_read_model` | 按 `raceId` 组织 | awards, works, registrations, reports | Results |
| `review_read_model` | 按 `raceId` 组织 | judging_records, judge_assignments, works, reports | Review |
| `rider_profile_read_model` | 按 `userId` 组织 | users, registrations, works, awards, evidences | Rider Profile |
| `console_overview_read_model` | 按 `raceId` 组织，含角色视图裁剪 | races, registrations, race_projects, works, judging_records | Organizer / Rider / Judge / Admin |
| `screen_feed_projection` | 按 `raceId` + `mode` 组织 | races, race_projects, session_summaries, projections | Screen Display |
| `leaderboard_read_model` | 按 `raceId` + `awardName` 组织 | awards, registrations, works | Results / Leaderboard |

规则：
- 读取模型可从写模型重建，不作为最终事实源。
- 读取模型刷新失败不影响写模型数据。
- `screen_feed_projection` 应区分 feed item 类型，避免将过程榜和最终榜混为同一事实。

---

# 7. 全局关联键汇总

| 关联键 | 来源表 | 目标表 | 关系 |
| --- | --- | --- | --- |
| `raceId` | registrations, race_projects, works, judge_assignments, awards, evidences, reports, announcements | races | 多对一 |
| `userId` | registrations, race_projects, works | users | 多对一 |
| `registrationId` | race_projects, works, awards, evidences, reports | registrations | 多对一 |
| `raceProjectId` | ca_connections, sessions, session_summaries | race_projects | 多对一 |
| `caConnectionId` | sessions, session_summaries, ca_message_receipts, ca_quarantine_audits | ca_connections | 多对一 |
| `workId` | judge_assignments, judging_records, awards | works | 多对一 |
| `judgeAssignmentId` | judging_records | judge_assignments | 一对一 |
| `judgeUserId` | judge_assignments, judging_records | users | 多对一 |
| `assignedByUserId` | judge_assignments | users | 多对一 |
| `approvedByUserId` | registrations | users | 多对一 |
| `createdByUserId` | races, announcements | users | 多对一 |
| `receiptId` | ca_quarantine_audits | ca_message_receipts | 一对一 |
| `sessionId` | session_summaries | sessions | 一对一 |

---

# 8. 全局唯一键方向汇总

| 存储 | 唯一键 | 约束说明 |
| --- | --- | --- |
| `races` | `slug` | 全局唯一 |
| `users` | `githubAccountId`、`slug` | 全局唯一 |
| `registrations` | `(raceId, userId)` | 一个 User 同一 Race 最多一条 |
| `race_projects` | `registrationId` | 一个 Registration 最多一个 RaceProject |
| `ca_connections` | `(raceProjectId, connectorId, caProjectId)` | 同一 RaceProject 下同 connector 同外部项目不重复 |
| `sessions` | `(caConnectionId, caSessionId)` | 同一连接下同外部 session 不重复 |
| `works` | `registrationId` | MVP 一个 Registration 最多一个主 Work |
| `judge_assignments` | `(workId, judgeUserId)` | 同一评委对同一作品最多一条分配 |
| `judging_records` | `judgeAssignmentId` | 每条分配最多一条评审记录 |
| `awards` | `(raceId, awardName, rank)`、`(raceId, registrationId, awardName)` | 名次不重复，同一参赛者同一奖项不重复 |
| `reports` | `(raceId, reportType, subjectRegistrationId)` | 同一类型报告按区分键不重复 |
| `ca_message_receipts` | `idempotencyKey`、`(caConnectionId, sequence)` | 幂等 + 序列单调 |
| `ca_quarantine_audits` | `receiptId` | 每条失败 receipt 最多一条隔离记录 |
| `session_summaries` | `sessionId` | 每个 Session 最多一条摘要 |

---

# 9. 当前未覆盖的字段级内容

以下内容属于 DEV-1 后续细化，本文不展开：

- 复合索引定义（如 `(raceId, status)`、`(userId, status)`）
- 各枚举值之间的合法状态迁移表
- 读取模型 `console_overview_read_model` 等按角色视图的裁剪规则
- Projection / Read Model 的字段级 schema
- `ca_message_receipts` 中 `rawMessageMetadata` 的精确结构

---

# 10. 下一步建议

1. 以本文的字段定义为基础，展开 `managed race`、`own`、`assigned` 三级作用域的接口鉴权策略表。
2. 为 `Race`、`Registration`、`RaceProject`、`Work`、`JudgingRecord`、`Award` 六条核心链路补状态迁移图。
3. 在进入 DEV-2 前冻结本文中写模型存储的主键和关联键方向。
