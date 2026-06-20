# UX-1 M2 输入最终清单

版本：v0.1
文档类型：Final Input Checklist
状态：完成
来源任务：UX-1
上游入口：`ux-1-closure.md`、`ux-1-annotation-matrix.md`

---

# 1. 文档目的

本文用于把 `UX-1` 当前已经收口的高保真设计输入，整理成可被 `M2` 架构设计直接消费的最终清单。

本文不重复做页面评审，而是回答一个更直接的问题：

哪些界面、状态、权限边界和数据依赖，已经足够稳定，可以进入组件边界、读取模型、接口与权限设计。

---

# 2. 可直接进入 M2 的输入

## 2.1 页面与体验面边界

以下体验面已经稳定，可直接作为架构边界输入：

* Public Site：Race Gallery、Race Page、Live Hall、Works、Work Page、Results、Review、Rider Profile、Cooperation。
* Workspace / Console：Organizer View、Rider View、Judge View、Admin Console、Screen Console。
* Display：Screen Display。
* State Samples：空态、错误态、fallback 与权限感知异常摘要样张。

架构含义：这些体验面可以作为路由、页面容器、模块分区和权限入口的第一层边界。

## 2.2 组件族输入

以下组件族已经具备足够稳定的页面重复性，可进入 `M2` 组件边界讨论：

* Public Header / Workspace Entry
* Hero / Module Title / Section Kicker
* State Card / Metrics Card / Risk Summary Card
* Drawer / Filter Toolbar / CTA Row
* Work Card / Award Card / Review Card / Profile Card
* Ops Grid / Ops Table / Console Sidebar
* Screen Output / Screen Control
* State Sample Card

架构含义：这些组件族可作为 Design Token、UI Primitive 和页面组合组件的切分起点。

## 2.3 状态模型输入

以下页面级状态已可直接进入读取模型和接口设计：

* Race 状态：`registration`、`running`、`judging`、`completed`、`upcoming`
* Results / Review 状态：`published`、`shortlist`、`winner`
* Console 风险状态：`review flag`、`evidence gap`、`cost watch`
* Screen 状态：`live`、`fallback ready`、`on air`
* 真实性状态：`verified`、`verification_failed`、`quarantined`

架构含义：这些状态可以进入枚举、读取模型字段、状态标签组件和鉴权显示规则设计。

## 2.4 权限与可见性输入

以下权限边界已足够稳定：

* Public 只看已公开 Race、Works、Results、Review、Rider Profile、Cooperation。
* Rider 只看 own registration、own CA status、own work、own rider report。
* Judge 只看 assigned works、evidence summary 和最小真实性风险摘要。
* Organizer 看 managed race 维度的报名、接入、风险、作品、评审、榜单和报告概览。
* Admin 只做账号、资料状态和 `User.roles` 管理。
* Screen Console 与 Screen Display 分离，控制面与输出面不可混画。

架构含义：这些边界可直接进入路由守卫、资源动作权限、读取模型裁剪和字段脱敏规则设计。

## 2.5 数据依赖输入

以下页面依赖对象已可直接作为 `M2` 读取模型映射起点：

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

架构含义：这些对象可直接进入 API contract 拆分、查询模型定义和页面数据装配边界设计。

---

# 3. 必须继承到 M2 的强约束

以下不是可选建议，而是必须在 `M2` 中保持不回退的界面和领域约束：

* 首页保持 Gallery-first，不回退成后台入口页。
* Race 是公开端和工作台的核心上下文。
* Results 与过程 Projection 分离，不混淆事实结果与过程显示。
* 原始 CA Session 默认不公开。
* 实时 CA 接入是证据链输入和评审参考，不是参赛资格硬门禁。
* `verification_failed`、`quarantined` 只显示必要异常摘要，不向无权限角色暴露隔离审计细节。
* Screen Console 是控制面；Screen Display 是输出面；两者不可混画。

---

# 4. 现成证据清单

以下证据已可作为 `M2` 评审和架构输入的直接附件：

## 4.1 桌面端页面证据

* `../design-prototype/ary-design-prototype-data-home-1080p.png`
* `../design-prototype/ary-design-prototype-data-results-1080p.png`
* `../design-prototype/ary-ux-review-admin-1080p.png`
* `../design-prototype/ary-ux-review-screen-console-1080p.png`
* `../design-prototype/ary-ux-review-rider-view-1080p.png`
* `../design-prototype/ary-ux-review-judge-view-1080p.png`
* `../design-prototype/ary-ux-review-work-detail-1080p.png`

## 4.2 移动端关键视口证据

* `../design-prototype/ary-ux-review-mobile-home.png`
* `../design-prototype/ary-ux-review-mobile-rider-view.png`
* `../design-prototype/ary-ux-review-mobile-screen-display.png`

## 4.3 空态 / 错误态证据

* `../design-prototype/ary-ux-review-state-public-works-empty-1080p.png`
* `../design-prototype/ary-ux-review-state-public-works-empty-mobile.png`
* `../design-prototype/ary-ux-review-state-public-live-fallback-1080p.png`
* `../design-prototype/ary-ux-review-state-public-live-fallback-mobile.png`
* `../design-prototype/ary-ux-review-state-rider-ca-setup-empty-1080p.png`
* `../design-prototype/ary-ux-review-state-rider-ca-setup-empty-mobile.png`
* `../design-prototype/ary-ux-review-state-judge-authenticity-warning-1080p.png`
* `../design-prototype/ary-ux-review-state-judge-authenticity-warning-mobile.png`
* `../design-prototype/ary-ux-review-state-admin-role-queue-empty-1080p.png`
* `../design-prototype/ary-ux-review-state-admin-role-queue-empty-mobile.png`
* `../design-prototype/ary-ux-review-state-screen-output-error-1080p.png`
* `../design-prototype/ary-ux-review-state-screen-output-error-mobile.png`

---

# 5. M2 第一阶段建议消费顺序

建议按以下顺序消费 `UX-1` 输入：

1. 先按体验面划分页面容器、路由边界和权限入口。
2. 再按组件族拆分 UI Primitive、复合组件和页面模块。
3. 然后按页面状态与数据依赖，形成读取模型和接口契约草案。
4. 最后再把真实性状态、脱敏边界和 Screen 控制 / 输出分离，固化到鉴权和领域约束中。

---

# 6. 不纳入本轮 M2 输入的事项

以下事项不纳入本轮 `M2` 最终输入清单，避免过早把高保真扩成实现细节：

* 像素级动画参数
* Canvas 渲染实现细节
* 组件最终命名和目录结构
* 完整 API 字段级 schema
* 所有异常路径的最终交互文案

这些内容应在 `M2` 开始后，由架构、实现和 QA 再继续细化。

---

# 7. 最终结论

当前 `UX-1` 已为 `M2` 提供足够稳定的页面边界、组件族、状态模型、权限规则和数据依赖方向。

因此，`M2` 可以从“消费高保真输入”开始，而不需要继续等待新的页面补齐或新的截图证据。