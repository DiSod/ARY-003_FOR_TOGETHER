# UX-1 第一轮评审记录

版本：v0.1
文档类型：Review Note
状态：完成
任务编号：UX-1
上游入口：`ux-1-review-start.md`
原型入口：`../design-prototype/index.html`

---

# 1. 本轮范围

本轮按 `ux-1-review-start.md` 依次执行以下工作：

1. 先复审 Public 主路径页面。
2. 再复审 Race Console / Admin Console / Screen Console / Screen Display 覆盖情况。
3. 最后整理可进入 `M2` 的设计输入与待补缺口。

---

# 2. Public 主路径评审结论

本轮已复审以下 Public 页面：

* Race Gallery
* Race Page
* Live Hall
* Works
* Results
* Review
* Rider Profile
* Cooperation

当前判断：Public 主路径整体可走查，已基本满足 `UX-1` 第一轮高保真原型的公开传播与观看路径要求。

已通过点：

* Race Gallery 保持 Gallery-first，首屏主 CTA 能直接进入 Live Hall 或 Race Page。
* Race Page 以单场 Race 为中心，已具备赛题、赛程、Riders、Works、Results、Review 的上下文入口。
* Live Hall 已明确过程 Projection 的观看属性，并显式说明“过程榜单用于观看，不作为最终 Results”。
* Works、Results、Review、Rider Profile 已形成公开资产沉淀链路，基本符合 IA 对公开传播页的要求。
* Cooperation 页面已与报名、办赛、赞助三类转化动作对齐，没有把公开端退化成后台入口。

待补或待确认项：

* 当前截图资产与 `index.html` 结构不完全一致；评审时应以 `index.html` 和运行态为准，现有截图不能继续作为唯一验收证据。
* Public 主路径已覆盖 Works 列表，但本轮证据仍偏向列表页表达，Work Detail 的独立资产页表达还需要在后续评审中单独确认。
* Public 端尚未看到对真实性异常结果的最小展示规则样张；虽然不应暴露隔离审计细节，但可公开的状态摘要边界仍需后续补一版明确画法。

结论：Public 主路径可继续作为 `M2` 输入候选，但仍需补足截图证据更新和 Work Detail / 真实性状态摘要表达。

---

# 3. Console / Admin / Screen 评审结论

本轮已复审 `Race Console` 与 `Screen Display` 的现有原型表达。

当前发现的关键缺口如下：

## 3.1 Admin Console 尚未作为独立体验面成立

当前 `index.html` 中仅在 `Race Console` 侧栏出现 `Admin Console` 按钮，没有看到独立的 Admin 页面或可走查的用户列表、资料状态、`User.roles` 管理界面。

影响：

* 无法完成 `Admin` 角色的 P0 主路径走查。
* 尚不能证明 IA 中“Admin Console 独立于赛事执行”的体验面已经成立。

## 3.2 Screen Console 尚未作为独立控制面成立

当前 `index.html` 中 `Screen Console` 只以按钮形式存在，`page-screen` 实际表达的是 `Screen Display` 输出页，而不是 IA 中定义的 Race Selection、Display Mode、Theme / Calibration、Display Control 控制面。

影响：

* `Screen Operator` 的主路径目前无法完整走查。
* IA 中“Screen Console 是控制面，Screen Display 是输出面”的分层在原型里还未真正分离完成。

## 3.3 Rider / Judge / Admin 视图仍停留在单页入口态

当前 `Race Console` 页面主体只展示 `Organizer View` 视角；`Rider View`、`Judge View`、`Admin Console` 更像页签入口，而不是可独立评审的页面状态。

影响：

* `Rider` 无法完整走查“报名状态 → CA Setup → Riding Status → Work Submission → Review Result / Rider Report”。
* `Judge` 无法完整走查“Assigned Works → Evidence Summary → Reviewing”。
* `Admin` 无法走查“Users → Profile Completion → User.roles”。

结论：Console / Admin / Screen 当前只完成了 Organizer 工作台概念样张和 Screen Display 输出样张，尚未满足 `UX-1` 对五类体验面的完整覆盖要求。

---

# 4. M2 输入判断

## 4.1 可进入 M2 的设计输入

以下页面 / 设计资产可作为 `M2` 架构设计输入候选：

* Race Gallery：公开首页信息密度、首屏 CTA、Hero / Drawer / 资产入口层级。
* Race Page：单场 Race 上下文、二级入口结构和阶段信息区块。
* Live Hall：Projection 观看区、事件流、过程榜和实时指标布局。
* Works：公开作品列表、筛选工具条和作品卡信息密度。
* Results：最终赛果与过程榜分离的公开展示方式。
* Review：赛后复盘、公开评委摘录和高光案例卡布局。
* Rider Profile：公开能力资产、作品、标签和过程摘要布局。
* Organizer View：Race Console 的总览式指挥席布局、风险提示列表和关键信号卡。
* Screen Display：大屏输出画面主视觉、实时指标和模式切换占位。

这些输入当前足以反推：

* 前端公开路由与主要阅读模型。
* Race 上下文下的页面模块边界。
* Live Hall / Results / Review / Rider Profile 的读取模型差异。
* Organizer 总览工作台的信息分区与卡片密度。
* Screen Display 的输出信息结构。

## 4.2 暂不能进入 M2 的部分

以下体验面或状态当前仍不足以进入 `M2`：

* Admin Console 独立页面与状态。
* Screen Console 独立控制面与校准 / 输出控制状态。
* Rider View 独立页面与提交流程状态。
* Judge View 独立页面与 Evidence / Reviewing 状态。
* Work Detail 独立资产页。
* 真实性状态在 Rider / Organizer 侧的最小可见表达样张。
* 与 `index.html` 同步更新后的最新截图 / 演示证据。

---

# 5. 下一步建议

1. 先补齐 `Admin Console`、`Screen Console`、`Rider View`、`Judge View` 的独立高保真页面或独立可切换状态。
2. 单独补一页 `Work Detail`，把作品资产、公开 Evidence 摘要和回到 Race 的上下文入口画完整。
3. 补一组 Rider / Organizer 侧真实性状态样张，只展示 `verified`、`verification_failed`、`quarantined` 的最小结果，不暴露隔离审计细节。
4. 重新生成与当前 `index.html` 一致的截图或演示证据，避免旧截图继续干扰评审。

当前结论：`UX-1` 已完成第一轮公开端复审，但尚未完成全部体验面的验收，暂不能判定为完成。