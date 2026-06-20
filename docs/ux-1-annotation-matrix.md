# UX-1 标注矩阵

版本：v0.1
文档类型：Annotation Matrix
状态：已完成 / 可作为 `M2` 输入附件
任务编号：UX-1
上游入口：`ary.plan.md`、`ux-1-review-round-2.md`
原型入口：`../design-prototype/index.html`

---

# 1. 文档目的

本文用于把 `UX-1` 当前原型中的关键页面，整理成可审查的标注产物，补齐以下交付要求：

* 核心组件
* 页面状态
* 空态
* 错误态
* 权限差异
* 数据依赖

本文不替代领域模型、权限矩阵、接口契约或数据库设计；它只负责把高保真原型当前已经承载或应补齐的页面级设计输入显式列出，便于后续 `M2` 架构输入判断。

---

# 2. 视口范围

| 视口 | 当前状态 | 说明 |
| --- | --- | --- |
| Desktop 1920 x 1080 | 已有主证据 | 当前大部分高保真页面和新增截图以 1080P 为主。 |
| Mobile | 已有当前版本关键证据 | 已生成 `430 x 932` 的 Home、Rider View、State Samples、Screen Display 截图，并对关键页面做了可读性抽查。 |
| Screen Display | 已有独立输出面 | 作为大屏展示视口存在，不等同于管理端页面缩放。 |

---

# 3. 页面级标注矩阵

## 3.1 Public Site

| 页面 | 核心组件 | 关键状态 | 空态 / 错误态 | 权限差异 | 数据依赖 |
| --- | --- | --- | --- | --- | --- |
| Race Gallery | Public Header、Hero、Live Race Switcher、Drawer、Featured Work、Featured Rider | featured race、live race switch、open registration、latest results | 空态待补：无 live race / 无 featured work；错误态待补：赛事数据加载失败 | Public 只见公开赛事与合作入口；未登录态只显示 Login | `races`、`raceGroups`、`works`、`riders`、`liveProjections` |
| Race Page | Race Hero、Race State Grid、Race Content Grid、右侧导航 | registration / running / submitting / judging / completed 的阶段入口 | 空态待补：无已公开 results / review；错误态待补：赛事未发布或上下文缺失 | Public 只见当前 Race 的公开模块，未发布 Results / Review 不应进入公开导航 | `races`、Race status、赛程信息、Rider/Work 计数 |
| Live Hall | Live Header、Projection Canvas、Metrics、Event Stream、Process Leaderboard | running、risk signals、cost watch、submit left | 空态待补：无 projection / 无 event stream；错误态待补：Projection fallback / 数据延迟 | Public 只见观看信息，不见内部隔离审计与原始 Session | `liveProjections`、`races.live`、事件流、过程榜 |
| Works | Filter Toolbar、Work Grid、Asset Matrix | featured、submitted、awarded、judging | 空态待补：无公开作品；错误态待补：作品详情不可访问 | Public 只见公开作品，不见私有 Work 或未发布稿 | `works`、所属 `races`、可公开状态 |
| Work Page | Module Title、Asset Card、Evidence Summary、返回 Race 上下文 | public demo、public evidence、award badge、review excerpt | 空态待补：无 demo / 无 public evidence；错误态待补：作品已隐藏或未公开 | Public 只见公开 Evidence 摘要，不见私有源和原始 Session | `works`、作者信息、公开 `Evidence` 摘要、所属 `Race` |
| Results | Module Title、Award Grid、Winning Works Aside | published results、winner、shortlist、review published | 空态待补：results 未发布；错误态待补：award draft 不可公开 | Public 只见已发布 Award / leaderboard / report | `Award`、`leaderboard_read_model`、`review_summary` |
| Review | Quote Card、Review Card Grid、Judge Comments、Featured Cases | published review、featured cases、judge comments、next race | 空态待补：review 未发布；错误态待补：review source 缺失 | Public 只见已发布 review_summary 与公开 Evidence | `review_summary`、`Award`、公开 `Evidence` |
| Rider Profile | Profile Card、Portfolio Grid、Skill Tags | featured work、completion、skill tags、public feedback | 空态待补：无公开作品 / 无获奖记录；错误态待补：profile 未公开 | Public 只见公开作品、公开能力摘要，不见内部评审或原始 Session | `riders`、公开 `works`、公开 `Evidence` 摘要、获奖信息 |
| Cooperation | Cooperation Grid、报名 / 办赛 / 赞助 CTA | registration open、sponsor、launch race | 空态待补：无开放赛事；错误态待补：报名入口关闭 | Public 只见公开转化入口 | 报名中 `races`、合作说明 |

## 3.2 Console / Workspace

| 页面 | 核心组件 | 关键状态 | 空态 / 错误态 | 权限差异 | 数据依赖 |
| --- | --- | --- | --- | --- | --- |
| Organizer View | Console Sidebar、Ops Grid、Ops Table、Race Context | running、evidence gap、review flag、draft report | 空态待补：无报名 / 无作品 / 无风险；错误态待补：CA status 拉取失败 | 仅 `organizer` / `admin` 可见 managed race 级信息；可见风险摘要 | `Race`、`Registration`、`RaceProject`、`CA status`、`Work`、`Report` |
| Rider View | Rider Sidebar、Ops Grid、Ops Table、Submission CTA | approved registration、verified、verification_failed、quarantined、work draft、report waiting | 空态待补：尚未报名 / 尚未接入 CA / 尚未创建作品；错误态待补：连接校验失败后的页面级提示 | 仅 `rider` 本人可见 own registration / own authenticity result | `Registration`、`RaceProject`、`CAConnection`、`view_authenticity_status`、`Work`、`rider_report` |
| Judge View | Judge Sidebar、Assigned Works、Evidence Summary、Review Action | assigned、risk flags、review draft、submitted reviews | 空态待补：暂无分配作品；错误态待补：Evidence 摘要缺失 / 作品不可评 | 仅 `judge` 看到 assigned context；只能见最小真实性风险摘要 | `JudgeAssignment`、`Work`、`Evidence` 摘要、`JudgingRecord`、risk summary |
| Admin Console | Account Sidebar、Users Summary、Profile Completion、Role Change Summary | users synced、profiles pending、role change、audit | 空态待补：无待处理 role 变更；错误态待补：角色更新失败 | 仅 `admin` 可见 `User.roles` 管理与系统级审计摘要 | `User`、资料状态、角色维护记录、audit summary |
| Screen Console | Screen Sidebar、Race Selection、Display Mode、Calibration、Output Control | selected race、mode switch、fallback ready、output on air | 空态待补：无可选赛事 / 无输出设备；错误态待补：Projection unavailable / output disconnected | 仅 `organizer` / `admin` / `screen operator` 可见控制面 | `Race`、`screen_feed_projection`、Display Mode、fallback state |

## 3.3 Screen Display

| 页面 | 核心组件 | 关键状态 | 空态 / 错误态 | 权限差异 | 数据依赖 |
| --- | --- | --- | --- | --- | --- |
| Screen Display | Screen Top、Live Title、Projection Canvas、Metrics、Preview Notes | live、leaderboard、works、announcement 的输出占位 | 空态待补：无可播放 feed；错误态待补：fallback 到静态公告 / 稳定 projection | 面向展示，不承载内部权限操作与审计细节 | `screen_feed_projection`、`Race`、Display Mode、fallback source |

---

# 4. 状态标注清单

## 4.1 已在原型中明确表达的关键状态

* Race 状态：`registration`、`running`、`judging`、`completed`、`upcoming`
* Console 风险状态：`review flag`、`evidence gap`、`cost watch`
* 真实性状态：`verified`、`verification_failed`、`quarantined`
* Results / Review 状态：`published`、`shortlist`、`winner`
* Screen 状态：`live`、`fallback ready`、`on air`

## 4.2 尚未形成完整样张的状态

* Report 未发布 / Results 未发布 / Review 未发布的独立样张
* CA 接入完全缺失时的独立 Rider / Organizer 页面样张
* Mobile 视口下更完整的二级页导航切换与多卡片连续滚动证据

这些状态当前应视为 `M2` 前仍需补充或在架构阶段继续细化的输入缺口。

---

# 5. 权限差异标注规则

为避免高保真误导实现，当前原型采用以下页面级权限差异原则：

* Public 只消费已公开 Race、Works、Results、Review、Rider Profile 和 Cooperation。
* Rider 只看 own registration、own CA 状态结果、own Work、own Rider Report。
* Judge 只看 assigned works、Evidence Summary、评分动作和最小真实性风险摘要。
* Organizer 看 managed race 维度的报名、接入、风险、作品、评审、榜单、报告概览。
* Admin 只做账号、资料状态和 `User.roles` 管理，不承担赛事执行工作台。
* Screen Console 是控制面；Screen Display 是输出面；两者不可混画。
* `verification_failed`、`quarantined` 只展示必要异常摘要，不暴露隔离审计细节给 Public 或无权限角色。

---

# 6. 数据依赖标注规则

当前原型的数据依赖以高保真可走查为目标，主要来自以下读取模型或样例实体：

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

当前 `design-prototype/data/sample-races.json` 与 `sample-races.js` 主要承载高保真页面展示，不等同于生产 schema。进入 `M2` 时，应将这里的页面依赖映射到正式读模型、接口和组件边界。

---

# 7. M2 输入判断

## 7.1 可直接作为 M2 输入的标注

* 页面级核心组件清单
* 公开端、Console、Screen 三类体验面的关键状态
* 最小权限差异原则
* 真实性状态的可见性边界
* 页面到读取模型的依赖映射方向

## 7.2 进入 M2 前仍建议补充的标注

* 更细的组件拆分，例如 Header、Drawer、Toolbar、State Card、Evidence Card、Risk Summary Card
* 与正式接口契约对齐后的字段级依赖说明

当前结论：本文已经补齐 `UX-1` 对“组件、页面状态、空态、错误态、权限差异和数据依赖”的显式标注产物；其中空态 / 错误态已通过 `State Samples` 页面集中表达，移动端关键视口证据也已同步到当前版本。本文现作为 `UX-1` 收口后的 `M2` 输入附件继续使用。