# DEV-1 接口鉴权策略表

版本：v0.1
文档类型：Auth Policy Draft
状态：执行中
任务编号：DEV-1
上游基线：dev-1-architecture-baseline.md、ary-permission-matrix.md
下一入口：接口设计阶段

---

# 1. 文档目的

本文把 `dev-1-architecture-baseline.md` 中定义的五类作用域和 `ary-permission-matrix.md` 中的资源动作级权限矩阵，翻译成可直接进入接口中间件或 policy 函数的鉴权策略表。

本文不写代码，但要求每一条规则都明确到"哪个资源 + 哪个动作 + 哪个 scope + 是否需要额外附加校验"，让接口设计阶段无需再回翻全文。

---

# 2. 通用鉴权模型

## 2.1 统一判定顺序

所有接口调用按以下顺序执行鉴权：

```
1. 资源存在性校验
   └── 不存在 → 404
2. 公开可读短路
   └── 资源已发布 + visibility=public + 动作属于公开读取集合 → 放行
3. 用户身份校验
   └── 未登录 → 401（除非动作属于公开读取集合）
4. 角色存在性校验
   └── 当前 user.roles[] 中至少有一个被该动作允许的角色 → 进入下一步
5. 作用域判定
   └── 按 own / assigned / managed race / system 逐级判定
6. 附加校验
   └── 真实性过滤、可见性过滤、发布状态过滤、窗口期校验
```

## 2.2 作用域判定函数

| 作用域 | 判定逻辑 |
| --- | --- |
| `public` | `resource.visibility = "public"` AND `resource.status IN published_states` |
| `own` | `resource.userId = currentUser.userId` OR `resource.ownerUserId = currentUser.userId` OR `resource.subjectRegistrationId → registrations.userId = currentUser.userId` |
| `assigned` | `EXISTS(SELECT 1 FROM judge_assignments WHERE workId = resource.workId AND judgeUserId = currentUser.userId AND status != "completed")` |
| `managed_race` | `currentUser.userId IN resource.organizerUserIds` OR `currentUser.userId = resource.createdByUserId`（且拥有 organizer role） |
| `system` | `"admin" IN currentUser.roles[]` |

### 2.2.1 published_states 定义

| 资源 | published_states |
| --- | --- |
| Race | `published`, `registration`, `running`, `submitting`, `judging`, `completed` |
| Work | `visibility = "public"` |
| Award | `status = "published"` |
| Report | `status = "published"` AND `visibility = "public"` |
| Rider Profile | `profileCompletionStatus = "complete"`（公开字段子集） |
| Projection / ScreenFeed | 始终视为过程展示，不设 published gate |

### 2.2.2 own 判定细化

| 资源 | own 判定路径 |
| --- | --- |
| Registration | `registrations.userId = currentUser.userId` |
| RaceProject | `race_projects.userId = currentUser.userId` |
| Work | `works.ownerUserId = currentUser.userId` |
| JudgingRecord | `judging_records.judgeUserId = currentUser.userId` |
| Rider Report | `reports.subjectRegistrationId → registrations.userId = currentUser.userId` |
| CAConnection | `ca_connections.userId = currentUser.userId` |
| User Profile | `users.userId = currentUser.userId` |

---

# 3. 资源级鉴权策略

## 3.1 Race

| 动作 | 鉴权规则 |
| --- | --- |
| `list_public` | scope: public；不需要登录 |
| `get_public` | scope: public；不需要登录 |
| `get_private` | scope: own（仅已报名 Rider 可见非公开字段）\| assigned_race \| managed_race \| system；需登录 |
| `create` | scope: managed_race \| system；需拥有 organizer 或 admin role |
| `update` | scope: managed_race \| system；`status` 字段变更需额外校验合法状态迁移 |
| `publish` | scope: managed_race \| system；前置条件 `status = draft` |
| `archive` | scope: managed_race \| system；前置条件 `status = completed` |

附加校验：
- `get_private` 返回的字段集按 scope 裁剪：Rider 只能看到赛题、赛程、公开状态和自己的报名状态。

## 3.2 Registration

| 动作 | 鉴权规则 |
| --- | --- |
| `submit` | scope: own；需拥有 rider role；前置条件 Race.status IN `[registration, running]` |
| `get` | scope: own \| assigned_work_context \| managed_race \| system |
| `list_by_race` | scope: managed_race \| system；按 raceId 筛选 |
| `approve` | scope: managed_race \| system；前置条件 `status = submitted` |
| `reject` | scope: managed_race \| system；前置条件 `status = submitted`；需填写 rejectedReason |
| `withdraw` | scope: own（且 status 非 locked 期后）\| managed_race_exception \| system_exception |

附加校验：
- `submit` 需校验 `(raceId, userId)` 唯一键。
- CA 接入状态不作为 `withdraw` 的驱动条件。

## 3.3 RaceProject

| 动作 | 鉴权规则 |
| --- | --- |
| `get` | scope: own \| assigned_work_summary \| managed_race \| system |
| `get_authenticity_status` | scope: own \| assigned_work_summary \| managed_race \| system；返回字段受真实性附加规则限制 |
| `get_quarantine_summary` | scope: own_limited \| assigned_work_risk_summary \| managed_race \| system |
| `get_quarantine_detail` | scope: managed_race_internal \| system |
| `register_ca_connection` | scope: own（且 Registration approved 且在参赛窗口内）\| managed_race_assistance \| system_exception |
| `manage_ca_connection` | scope: own（连接元数据管理）\| managed_race_exception \| system_exception |
| `get_session_summary` | scope: own \| assigned_work_summary \| managed_race \| system |
| `sync_status` | scope: own \| managed_race \| system（由系统定时任务触发为主） |

附加校验：
- 创建由系统幂等执行，不接受手动 create。
- `register_ca_connection` 需校验 CAConnection 的 `(raceProjectId, connectorId, caProjectId)` 唯一键。

## 3.4 CAConnection

| 动作 | 鉴权规则 |
| --- | --- |
| `get` | scope: own \| managed_race \| system |
| `register` | scope: own（在参赛窗口内）\| managed_race_assistance \| system_exception；前置条件 RaceProject 存在且 Registration approved |
| `handshake` | scope: own（在参赛窗口内）\| managed_race_assistance \| system_exception；需验证设备公钥 |
| `disable` | scope: managed_race_exception \| system_exception；需填写 disabledReason |
| `rotate_key` | scope: own \| managed_race_exception \| system_exception |

附加校验：
- `handshake` 需在 TLS 内执行，ARY 验证设备公钥指纹。
- `disable` 后该连接所有数据不得进入后续有效链路。

## 3.5 Work

| 动作 | 鉴权规则 |
| --- | --- |
| `list_public` | scope: public；按 raceId 筛选 |
| `get_public` | scope: public |
| `get_private` | scope: own \| assigned \| managed_race \| system |
| `create` | scope: own_registration（且 Registration approved）；前置条件：该 Registration 尚无主 Work |
| `update` | scope: own_registration（且 status = draft）；scope: system_exception |
| `submit` | scope: own_registration（且 status = draft）；前置条件 Race.status IN `[running, submitting]` |
| `lock` | scope: managed_race \| system；前置条件 `status = submitted` |
| `publish` | scope: managed_race \| system |
| `hide` | scope: own（且 status = draft）\| managed_race \| system |

附加校验：
- MVP 一个 Registration 最多一个主 Work，create 前校验 `registrationId` 唯一。
- 是否获奖由 Award 推导，Work 自身不在 status 中表达 `awarded`。

## 3.6 JudgeAssignment

| 动作 | 鉴权规则 |
| --- | --- |
| `list_by_race` | scope: managed_race \| system |
| `list_by_judge` | scope: assigned \| managed_race \| system |
| `get` | scope: assigned \| managed_race \| system |
| `create` | scope: managed_race \| system；前置条件：被分配的 judgeUserId 拥有 judge role |
| `update` | scope: managed_race \| system；前置条件 `status != completed` |
| `remove` | scope: managed_race \| system；前置条件 `status != completed`（或先取消已提交评审记录） |

附加校验：
- `create` 需校验 `(workId, judgeUserId)` 唯一。

## 3.7 JudgingRecord

| 动作 | 鉴权规则 |
| --- | --- |
| `get_published_summary` | scope: public（仅限已发布评审总结中的公开片段）\| own_work_result \| assigned \| managed_race \| system |
| `get_private` | scope: own_result_after_release \| assigned_own \| managed_race \| system |
| `create` | scope: assigned（当前 judgeUserId 存在有效 JudgeAssignment） |
| `update` | scope: assigned_own（且 status = draft） |
| `submit` | scope: assigned_own（且 status = draft） |

附加校验：
- JudgingRecord 必须来源于有效 JudgeAssignment。
- `submit` 后不可再修改。

## 3.8 Award / Leaderboard

| 动作 | 鉴权规则 |
| --- | --- |
| `list_published` | scope: public |
| `get_published` | scope: public |
| `list_draft` | scope: managed_race \| system |
| `create_draft` | scope: managed_race \| system |
| `update_draft` | scope: managed_race \| system；前置条件 `status = draft` |
| `publish` | scope: managed_race \| system；前置条件 `status = draft` |
| `withdraw` | scope: managed_race \| system；前置条件 `status = published` |

附加校验：
- `create_draft` 需校验 `(raceId, awardName, rank)` 唯一和 `(raceId, registrationId, awardName)` 唯一。
- Leaderboard 是读取模型，不提供写入接口。

## 3.9 Evidence

| 动作 | 鉴权规则 |
| --- | --- |
| `list_public` | scope: public |
| `get_public` | scope: public |
| `get_private_summary` | scope: own \| assigned_work_context \| managed_race \| system |
| `get_raw_source` | scope: managed_race_internal_exception \| system |
| `set_visibility` | scope: own_limited \| managed_race \| system |
| `cite_in_report` | scope: managed_race \| system |

附加校验：
- 公开端只返回 `visibility = public` 的 Evidence。
- 原始 CA Session 不得作为 sourceRef 直连；只能通过 Session Summary 间接引用。

## 3.10 Report

| 动作 | 鉴权规则 |
| --- | --- |
| `list_public` | scope: public（仅 race_report / review_summary） |
| `get_public` | scope: public（仅 race_report / review_summary） |
| `get_rider_report` | scope: own \| managed_race \| system |
| `get_private` | scope: own_rider_report \| assigned_context_summary \| managed_race \| system |
| `generate` | scope: managed_race \| system |
| `edit` | scope: managed_race \| system；前置条件 `status IN [draft, generated, reviewed]` |
| `publish` | scope: managed_race \| system；前置条件 `status = reviewed`（或管理员直接发布） |
| `regenerate` | scope: managed_race \| system |

附加校验：
- `rider_report` 必须有关联的 `subjectRegistrationId`；`race_report` / `review_summary` 必须为空。
- `get_rider_report` 中 rider 只能取 own；Organizer 取 managed race 范围；Admin 取 system 范围。

## 3.11 Projection

| 动作 | 鉴权规则 |
| --- | --- |
| `view_public` | scope: public（via Live Hall / Screen Display） |
| `view_internal` | scope: own_summary \| assigned_context \| managed_race \| system |
| `rebuild` | scope: managed_race \| system |
| `inspect_status` | scope: managed_race \| system |

附加校验：
- Projection 不作为最终事实源，读取失败不影响核心事实数据。
- `rebuild` 操作需记录审计日志。

## 3.12 ScreenDisplay

| 动作 | 鉴权规则 |
| --- | --- |
| `view_public` | scope: public |
| `configure` | scope: managed_race \| system |
| `switch_mode` | scope: managed_race \| system |
| `fallback_to_stable` | scope: managed_race \| system（也可由系统自动触发） |
| `fallback_to_static` | scope: managed_race \| system（也可由系统自动触发） |

附加校验：
- Screen Console 与 Race Console 分路由、分权限校验。
- fallback 操作需记录状态变更日志。

## 3.13 User

| 动作 | 鉴权规则 |
| --- | --- |
| `sign_in_github` | scope: public；不需要登录 |
| `get_public_profile` | scope: public |
| `get_private_profile` | scope: own \| managed_race_user_summary \| system |
| `update_profile` | scope: own |
| `update_roles` | scope: system（仅 admin） |

附加校验：
- `update_roles` 需记录操作审计日志。
- `status = suspended` 的用户所有非 public 权限自动失效。

## 3.14 Announcement

| 动作 | 鉴权规则 |
| --- | --- |
| `list_public` | scope: public |
| `get_public` | scope: public |
| `get_private` | scope: managed_race \| system |
| `create` | scope: managed_race \| system |
| `update` | scope: managed_race \| system |
| `publish` | scope: managed_race \| system |
| `hide` | scope: managed_race \| system |

---

# 4. 真实性附加规则（跨资源）

以下规则属于附加校验层，在作用域判定通过后执行：

| 规则 | 适用资源 | 说明 |
| --- | --- | --- |
| `authenticity_filter` | RaceProject, CAConnection | `view_authenticity_status` 只返回 verified / verification_failed / quarantined + reason；不返回原始消息内容 |
| `quarantine_summary_filter` | RaceProject, CAConnection | 只返回 `failureReason`, `quarantinedAt`, `quarantineStatus`, `caConnectionId` |
| `quarantine_detail_gate` | CAConnection | 仅 `managed_race_internal` 和 `system` 可访问 `ca_quarantine_audits` 完整记录 |
| `raw_session_gate` | CAConnection, RaceProject | Public / Rider / Judge 永不返回原始 Session；只有 `managed_race_internal_exception` 和 `system` 可访问 |
| `draft_visibility_gate` | Award, Report | `draft` 状态只允许 managed_race 和 system 查看 |

---

# 5. 作用域到 HTTP 中间件的映射建议

| 作用域 | 建议中间件 / guard 名称 | 输入参数 |
| --- | --- | --- |
| `public` | `PublicGate` | resource.visibility, resource.status |
| `own` | `OwnGate` | resource 上的 userId / ownerUserId 字段名 |
| `assigned` | `AssignedGate` | resource.workId, currentUser.userId |
| `managed_race` | `ManagedRaceGate` | resource.raceId, currentUser.userId |
| `system` | `AdminGate` | currentUser.roles[] |

建议实现方式：
- `PublicGate` 在路由层提前短路。
- `OwnGate`、`AssignedGate`、`ManagedRaceGate` 在 service 层或 middleware 层执行。
- `AdminGate` 在中间件层执行，是所有 `system` 动作的统一入口。
- 真实性附加规则作为独立的 `AuthenticityFilter` 在 service 层执行。

---

# 6. 下一入口

1. 以本文策略表为基础，进入接口字段级 schema 设计。
2. 为 6 条核心链路补状态迁移图（见同目录 `dev-1-state-transitions.md`）。
3. 将 `PublicGate` / `OwnGate` / `AssignedGate` / `ManagedRaceGate` / `AdminGate` 转成具体代码实现时的 guard 函数签名。
