# M2 输入最终清单

版本：v0.1
文档类型：Architecture Input Checklist
状态：有效 / 可进入 `DEV-1`
关联任务：`UX-1`
形成日期：2026-06-20
上游入口：`ux-1-closure-delivery.md`、`ux-1-annotation-matrix.md`、`ary.plan.md`

---

# 1. 文档目的

本文用于把 `UX-1` 已收口的高保真原型与标注产物，收敛成可直接进入 `DEV-1` 的 `M2` 架构设计输入清单。

本文回答的不是“页面是否好看”，而是：

* 哪些页面和状态已经足够稳定，可以反推路由、组件、读模型和接口边界。
* 哪些可见性和真实性护栏必须在架构设计时被保留。
* 哪些内容仍属于后续细化，而不应阻塞 `DEV-1` 启动。

---

# 2. 输入结论

当前 `M2` 输入结论如下：

1. Public、Console、Screen 三类体验面均已有稳定高保真承载。
2. 页面级组件、关键状态、权限差异、空态 / 错误态和数据依赖已具备显式产物。
3. 桌面端、移动端和大屏三类视口已有可审查证据。
4. `DEV-1` 可基于本文直接进入路由、组件、读模型和接口鉴权设计。

---

# 3. 页面与路由输入

以下页面可直接进入前端路由和页面壳层设计：

| 体验面 | 页面 / 视图 | 设计输入用途 |
| --- | --- | --- |
| Public | Race Gallery | 顶层公开入口、首页布局、Gallery-first 导航、Hero 与 Drawer 关系 |
| Public | Race Page | 单场赛事上下文页、阶段 CTA、公开二级导航 |
| Public | Live Hall | Projection 消费页、实时指标、过程榜与事件流布局 |
| Public | Works / Work Page | 作品列表、筛选、详情和 Evidence 摘要入口 |
| Public | Results / Review / Rider Profile / Cooperation | 资产沉淀页与转化页路由 |
| Console | Organizer View | 赛事执行工作台壳层、风险摘要、操作表格布局 |
| Console | Rider View | 报名、CA 状态、作品提交、结果查看的个人工作台 |
| Console | Judge View | 分配作品、Evidence 摘要、评审动作工作台 |
| Console | Admin Console | 用户资料、角色管理和审计摘要页 |
| Console | Screen Console | 大屏控制面与 Display Mode 切换页 |
| Screen | Screen Display | 只读输出面、远距可读布局 |
| State | State Samples | 单态样张路由与状态回归基线 |

路由护栏：

* Public 主导航不进入 Console / Screen。
* Screen Console 与 Screen Display 必须分路由、分职责。
* `State Samples` 允许作为设计回归和 QA 样张路由存在，但不等同于正式用户路径。

---

# 4. 组件边界输入

以下组件层级已经足够明确，可进入组件拆分设计：

| 组件层级 | 代表组件 |
| --- | --- |
| Public Shell | Public Header、Hero、Live Race Switcher、Drawer |
| Public Content | Race State Grid、Race Content Grid、Work Grid、Award Grid、Review Card、Portfolio Grid |
| Console Shell | Console Sidebar、Ops Grid、Ops Table、Summary Card |
| Screen Shell | Screen Top、Live Title、Projection Canvas、Metrics、Control Card |
| State Samples | State Sample Card、State Actions |

组件护栏：

* Projection 相关组件只消费投影读取模型，不承担事实写入语义。
* 真实性状态组件只暴露页面所需的最小结果，不暴露隔离审计细节。
* Screen 输出组件不复用 Console 控制组件的交互模式。

---

# 5. 状态与权限输入

以下状态和权限边界已可直接进入架构设计：

| 类别 | 已稳定输入 |
| --- | --- |
| Race 状态 | `registration`、`running`、`judging`、`completed`、`upcoming` |
| Console 风险状态 | `review flag`、`evidence gap`、`cost watch` |
| 真实性状态 | `verified`、`verification_failed`、`quarantined` |
| Results / Review 状态 | `published`、`shortlist`、`winner` |
| Screen 状态 | `live`、`fallback ready`、`on air` |

权限与可见性护栏：

* Public 只消费已公开 Race、Works、Results、Review、Rider Profile 和 Cooperation。
* Rider 只看 own registration、own CA 状态结果、own Work、own Rider Report。
* Judge 只看 assigned works、Evidence Summary 和最小真实性风险摘要。
* Organizer 看 managed race 维度的报名、接入、风险、作品、评审、榜单、报告概览。
* Admin 只做账号、资料状态和 `User.roles` 管理。
* `verification_failed`、`quarantined` 不对 Public 暴露隔离审计细节。

---

# 6. 读模型与数据依赖输入

以下读模型 / 实体依赖已足够进入接口和 BFF 设计：

* `Race`
* `Registration`
* `RaceProject`
* `CAConnection`
* `Work`
* `Evidence` 摘要
* `JudgingRecord` 摘要
* `Award`
* `review_summary`
* `rider_report`
* `leaderboard_read_model`
* `screen_feed_projection`
* `race_progress_projection`

输入要求：

* `sample-races.json` / `sample-races.js` 仅作为页面依赖方向证明，不直接下沉为生产 schema。
* `DEV-1` 需将以上页面依赖映射为正式读模型、接口和缓存边界。

---

# 7. 证据索引

当前 `M2` 输入依赖以下证据：

| 证据类型 | 入口 |
| --- | --- |
| 原型入口 | `../design-prototype/index.html` |
| 原型说明 | `../design-prototype/README.md` |
| 启动记录 | `ux-1-review-start.md` |
| 评审记录 | `ux-1-review-round-1.md`、`ux-1-review-round-2.md` |
| 标注矩阵 | `ux-1-annotation-matrix.md` |
| 桌面端关键截图 | `../design-prototype/*1080p.png` |
| 移动端关键截图 | `../design-prototype/ary-ux-review-mobile-*.png` |
| 单态样张截图 | `../design-prototype/ary-ux-review-state-*.png` |

---

# 8. 不阻塞 `DEV-1` 的后续细化项

以下内容仍建议后续细化，但不阻塞 `DEV-1` 启动：

* 更细的组件拆分和命名归一。
* 与正式接口契约对齐后的字段级依赖说明。
* 更完整的未发布态、空数据态和多步异常恢复态样张。
* 更完整的移动端响应式规范与断点策略。

---

# 9. Go / No-Go 判断

当前判断：Go。

理由如下：

1. `UX-1` 已完成任务级收口。
2. `M2` 所需的页面、状态、权限边界、视口证据和读模型方向已齐备。
3. 剩余事项属于 `DEV-1` 细化输入，不再是阻塞启动的前置缺口。
