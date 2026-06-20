# DEV-1 核心链路状态迁移图

版本：v0.1
文档类型：State Transition Diagram
状态：执行中
任务编号：DEV-1
上游基线：dev-1-architecture-baseline.md、dev-1-data-model-draft.md
下一入口：接口设计阶段、QA 测试用例

---

# 1. 文档目的

本文为 DEV-1 定义的 6 条核心链路展开枚举态之间的合法迁移规则。每条链路回答：

- 当前状态是什么。
- 哪些状态是可到达的下一个合法状态。
- 每次迁移的触发条件是什么。
- 哪些迁移被明确禁止。

本文不画 UML，直接用状态表 + 迁移规则表表达，方便接口实现和 QA 直接引用。

---

# 2. Race 生命周期

## 2.1 状态枚举

`draft` → `published` → `registration` → `running` → `submitting` → `judging` → `completed` → `archived`

## 2.2 迁移表

| 当前状态 | 可迁移到 | 触发条件 |
| --- | --- | --- |
| `draft` | `published` | Organizer 或 Admin 执行 publish；赛题、赛程、奖项配置已填写 |
| `draft` | `archived` | Organizer 或 Admin 直接归档未发布的 draft |
| `published` | `registration` | 到达 `timeWindows.registrationStart`；系统自动或 Organizer 手动触发 |
| `registration` | `running` | 到达 `timeWindows.raceStart`；系统自动触发 |
| `running` | `submitting` | 到达 `timeWindows.submissionDeadline` 前 N 小时 / 或 Organizer 手动提前进入提交期 |
| `submitting` | `judging` | 到达 `timeWindows.judgingStart` 且提交截止已过；系统自动或 Organizer 手动触发 |
| `judging` | `completed` | 所有 JudgingRecord submitted 且 Award published；Organizer 或 Admin 执行 complete |
| `completed` | `archived` | Organizer 或 Admin 执行 archive |

## 2.3 禁止迁移

| 禁止 | 原因 |
| --- | --- |
| 从 `completed` 回退到 `judging` | 赛后结果不可回退重评 |
| 从 `archived` 回退到任何活跃状态 | 归档态是终态 |
| 跳过 `published` 直接从 `draft` 进入 `registration` | 必须先发布才能报名 |
| `running` 期间跳过 `submitting` 直接进入 `judging` | 必须给选手提交窗口 |

## 2.4 阶段可并行说明

- `running` 与 `submitting` 之间允许短暂重叠（e.g. 比赛仍在进行但提交窗口已开放）。
- MVP 暂不要求 `registration` → `running` 之间严格时钟同步，允许 Organizer 手动推进。

---

# 3. Registration 生命周期

## 3.1 状态枚举

`submitted` → `approved` 或 `rejected`
`approved` → `withdrawn`
`rejected` → 终态
`withdrawn` → 终态

## 3.2 迁移表

| 当前状态 | 可迁移到 | 触发条件 |
| --- | --- | --- |
| `submitted` | `approved` | Organizer 或 Admin 执行 approve；Race 处于 registration / running |
| `submitted` | `rejected` | Organizer 或 Admin 执行 reject；需填写 rejectedReason |
| `approved` | `withdrawn` | Rider 主动退赛（在 locked 截止前）或 Organizer/Admin 例外退赛 |
| `rejected` | — | 终态，不可再迁移 |
| `withdrawn` | — | 终态，不可再迁移 |

## 3.3 禁止迁移

| 禁止 | 原因 |
| --- | --- |
| CA 接入状态驱动自动 `withdrawn` | CA failed 只生成风险提示，不改变报名资格 |
| `approved` → `submitted` 回退 | 审批结果不可撤销 / 回退 |
| `submitted` → `withdrawn` 直接跳过审批 | 必须先审批 |

## 3.4 关联事件

| 迁移 | 连带动作 |
| --- | --- |
| `submitted` → `approved` | 系统幂等创建 RaceProject |

---

# 4. RaceProject 生命周期

## 4.1 状态枚举

`aggregateIngestionStatus`：`not_configured` → `connected` → `active` → `failed`

## 4.2 迁移表

| 当前状态 | 可迁移到 | 触发条件 |
| --- | --- | --- |
| `not_configured` | `connected` | 首个 CAConnection 登记并握手成功 |
| `connected` | `active` | 至少一个 CAConnection 产生有效 Session（authenticityStatus = verified） |
| `connected` | `failed` | 全部 CAConnection 进入 `failed` 或被禁用 |
| `active` | `connected` | 活跃 CAConnection 全部断开但仍有至少一个 connected |
| `active` | `failed` | 全部 CAConnection 进入 `failed` 或被禁用 |
| `failed` | `connected` | RaceProject 下新增 CAConnection 并握手成功 |

## 4.3 `connectionHealth` 迁移

| 场景 | connectionHealth |
| --- | --- |
| `not_configured` | `no_signal` |
| `connected`（至少一个） | `ok` |
| 部分 failed，仍有 connected/active | `partial_failed` |
| 全部 failed | `all_failed` |

## 4.4 禁止迁移

| 禁止 | 原因 |
| --- | --- |
| `failed` 触发 Registration `withdrawn` | CA 接入状态与报名资格解耦 |
| `aggregateIngestionStatus` 由调用方直接写入 | 状态由 CAConnection 聚合计算 |

---

# 5. Work 生命周期

## 5.1 状态枚举

`draft` → `submitted` → `locked`
`draft` → `hidden`
`locked` → `hidden`（由 Organizer/Admin 操作）

## 5.2 迁移表

| 当前状态 | 可迁移到 | 触发条件 |
| --- | --- | --- |
| `draft` | `submitted` | Rider 执行 submit；Race.status IN `[running, submitting]` |
| `draft` | `hidden` | Rider（own）或 Organizer/Admin 执行 hide |
| `submitted` | `locked` | Organizer 或 Admin 执行 lock；通常与提交截止联动 |
| `locked` | `hidden` | Organizer 或 Admin 执行 hide |

## 5.3 禁止迁移

| 禁止 | 原因 |
| --- | --- |
| `locked` → `draft` 回退 | 作品锁定后不可再编辑 |
| `submitted` → `draft` 回退 | 提交后不可撤回到草稿 |
| WorkStatus 中设置 `awarded` | 获奖由 Award 推导 |

## 5.4 可见性

| visibility | 含义 |
| --- | --- |
| `public` | 公开，Public 可读 |
| `hidden` | 仅 own / assigned / managed race / system 可读 |
| `internal` | 仅 managed race / system 可读 |

---

# 6. JudgingRecord 生命周期

## 6.1 状态枚举

`draft` → `submitted`

## 6.2 迁移表

| 当前状态 | 可迁移到 | 触发条件 |
| --- | --- | --- |
| `draft` | `submitted` | Judge 执行 submit；JudgeAssignment 有效且 status IN `[assigned, in_progress]` |

## 6.3 禁止迁移

| 禁止 | 原因 |
| --- | --- |
| `submitted` → `draft` 回退 | 已提交评审不可回退编辑 |
| 无 JudgeAssignment 时 create | 评审记录必须来源于分配事实 |

## 6.4 JudgeAssignment 联动

| JudgeAssignment.status | JudgingRecord 允许动作 |
| --- | --- |
| `assigned` | create draft, update draft |
| `in_progress` | update draft, submit |
| `completed` | 不可再创建或修改 JudgingRecord |

---

# 7. Award 生命周期

## 7.1 状态枚举

`draft` → `published`
`published` → `withdrawn`

## 7.2 迁移表

| 当前状态 | 可迁移到 | 触发条件 |
| --- | --- | --- |
| `draft` | `published` | Organizer 或 Admin 执行 publish |
| `published` | `withdrawn` | Organizer 或 Admin 执行 withdraw（仅限发布错误等例外场景） |

## 7.3 禁止迁移

| 禁止 | 原因 |
| --- | --- |
| `draft` 被 Public 读取 | 发布前只允许 managed_race 和 system 查看 |
| `published` → `draft` 回退 | 已发布赛果不可撤回草稿 |

---

# 8. 跨链路联动规则

| 联动 | 说明 |
| --- | --- |
| Race `completed` → Work 可进入公开展示 | Work `submitted` + `locked` + `visibility = public` 后随 Race completed 进入 Results |
| Award `published` → Leaderboard 可刷新 | Leaderboard 是读取模型，Award publish 后触发重建 |
| Registration `approved` → RaceProject 生成 | 系统幂等创建，不等待手动操作 |
| JudgingRecord 全部 `submitted` → Race 可进入 `completed` | 前提是 Award 已 publish |
| CAConnection `disabled` → RaceProject `connectionHealth` 重新计算 | 禁用连接从有效连接池移除 |

---

# 9. 状态迁移图执行约束

1. 所有状态迁移必须记录审计日志：`{ entityType, entityId, from, to, triggeredBy, triggeredAt }`。
2. 迁移条件中涉及 Race 时间窗口的判断，允许 Organizer / Admin 在例外场景下手动推进。
3. `version` 字段（乐观锁）在每次状态迁移时必须递增，防止并发覆盖。
4. 系统自动触发的迁移（如 Race `registration` → `running`）必须通过幂等定时任务执行。

---

# 10. 下一入口

1. 以本文状态枚举和迁移规则为基础，进入接口字段级 schema 和 QA 测试用例设计。
2. 对 Report、Evidence、CAConnection 三条辅链路按需补充状态迁移图。
3. 在 DEV-2 ~ DEV-5 实现阶段，将本文迁移规则映射为具体服务层状态机校验代码。
