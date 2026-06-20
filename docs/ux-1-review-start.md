# UX-1 评审启动记录

版本：v0.1
文档类型：Review Start Note
状态：完成
任务编号：UX-1
上游入口：`ary.plan.md`、`ux-hifi.taskbook.md`
原型入口：`../design-prototype/index.html`

---

# 1. 启动目的

本文用于正式启动 `UX-1 UX/UI 高保真原型与设计基线` 的本轮评审收口工作。

目标不是重新定义视觉方向，而是基于现有高保真原型，回答以下问题：

* 当前原型是否已覆盖 `docs/ary.plan.md` 对 UX-1 的关键体验面要求。
* 当前原型是否能支撑公众、Rider、Organizer、Judge、Admin、Screen Operator 的 P0 主路径走查。
* 当前页面状态、权限入口、真实性状态和风险提示表达，是否与 PRD、IA、领域、权限和 CA 契约基线一致。
* 哪些设计资产已经可以作为 `M2` 架构设计输入，哪些仍需补页、补状态或补说明。

---

# 2. 当前原型覆盖盘点

当前 `design-prototype/` 已覆盖以下 10 个高保真页面：

| 页面 | 当前作用 | 是否进入本轮评审重点 |
| --- | --- | --- |
| Race Gallery | 公开赛事入口与 Gallery-first 首屏 | 是 |
| Race Page | 单场 Race 上下文、状态和二级入口 | 是 |
| Live Hall | 实时赛事观看与过程 Projection | 是 |
| Works / Work Page | 公开作品列表、作品资产与证据入口 | 是 |
| Results | 最终赛果与榜单展示 | 是 |
| Review | 赛事复盘、评审总结与公开 Evidence | 是 |
| Rider Profile | Rider 能力沉淀与公开资产 | 是 |
| Cooperation | 报名、办赛、赞助与合作转化 | 次重点 |
| Race Console | Organizer / Rider / Judge / Admin 入口与工作台 | 是 |
| Screen Display | 现场展示输出 | 是 |

本轮评审默认基于现有样例数据和原型结构继续收口，不从零开始重做原型体系。

---

# 3. 评审维度

## 3.1 体验面覆盖

必须确认以下体验面都有对应高保真承载：

* Public Site
* Race Console
* Admin Console
* Screen Console
* Screen Display

若某体验面当前只在合并视图中被间接表达，应明确是否接受该方式进入 `M2`，还是需要后续拆页补齐。

## 3.2 P0 主路径覆盖

本轮重点走查以下主路径：

1. Public 进入首页，查看赛事，进入 Live Hall，再进入作品、赛果、复盘或 Rider 资产。
2. Rider 进入工作台，查看报名状态、CA 接入状态、骑行状态与作品提交入口。
3. Organizer 进入工作台，查看赛事状态、报名、风险提示、提交、评审、榜单与报告概览。
4. Judge 进入工作台，查看 Assigned Works、Evidence Summary 与评分入口。
5. Admin 进入账号与角色管理入口。
6. Screen Operator 进入 Screen Console，选择赛事、模式并打开 Screen Display。

## 3.3 设计护栏一致性

本轮必须重点核对以下护栏是否被误画反：

* 首页保持 Gallery-first，不退化成后台或导航目录页。
* Projection 只作为过程展示，不被画成最终事实源。
* 实时 CA 接入异常表达为证据缺口、来源异常或评审风险提示，而不是自动退赛。
* `verification_failed`、`quarantined` 等真实性状态不得在 Public 端暴露隔离审计细节。
* Rider 只能看到自己的真实性状态结果；Organizer / Admin 可见异常摘要；Screen Display 不承担内部审计展示。

---

# 4. 本轮输出要求

本轮 UX-1 启动后，应逐步形成以下输出：

| 输出 | 用途 |
| --- | --- |
| 页面级评审结论 | 记录哪些页面已通过、哪些需要整改 |
| `M2` 输入清单 | 标记可进入架构输入的页面、状态、组件和数据依赖 |
| 待补页面 / 待补状态清单 | 明确仍未满足 UX-1 验收的缺口 |
| 评审收口记录 | 为后续 `UX-1` 完成判断提供依据 |

---

# 5. 当前启动判断

当前判断如下：

1. `UX-1` 已经具备正式启动评审收口的基础，不再处于仅供讨论阶段。
2. 现有高保真原型已足够承载本轮复审，但仍需逐页确认是否满足 `docs/ary.plan.md` 中的体验面覆盖和 `M2` 输入要求。
3. 在 `UX-1` 未形成明确评审结论前，`DEV-1` 仍不应进入正式架构设计。

---

# 6. 下一入口

本轮从以下入口继续推进：

* `docs/ux-hifi.taskbook.md`
* `../design-prototype/index.html`
* `../design-prototype/README.md`
* `docs/ary-mvp.ia.md`
* `docs/ary-permission-matrix.md`