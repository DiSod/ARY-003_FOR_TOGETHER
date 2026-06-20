# ARY 项目全局架构与详细设计方案

## 1. 系统总体架构鸟瞰

ARY 项目整体采用 **前后端分离架构**，核心目标是支持高并发的公众浏览（Gallery/Live Hall）与高频的 CA 数据上报（Ingestion），同时保证后台操作（Console）的数据一致性与权限隔离。

系统整体切分为以下几个逻辑层：
1. **前端展现层 (Frontend)**：承担 Public Site, Race Console, Admin Console, Screen Console 的展示。
2. **应用网关与鉴权层 (API Gateway & Auth)**：处理 GitHub OAuth 登录授权、统一的 Role RBAC 拦截、以及 DCR App 的安全验签。
3. **业务逻辑层 (Core Services)**：
   - **赛事域 (Race Service)**：管理赛事生命周期、报名审核。
   - **作业域 (Work & Judge Service)**：管理代码提交、评委分配与打分记录。
4. **数据接入与计算层 (Riding Intelligence)**：
   - **Ingestion Service**：负责高频接收 DCR 上报的 Riding 信号。
   - **Projection Engine**：异步重算引擎，将零散的事件（Event Stream）投影为易读的视图数据（如当前进度、消耗 Tokens 摘要），供 Live Hall 和大屏极速读取。
5. **数据存储层 (Storage)**：关系型主库 + 缓存/只读视图库。

## 2. 核心业务流设计方案

### 2.1 账户与角色权限模型 (Auth & RBAC)
* **鉴权方式**：全站基于 GitHub OAuth 登录，首次登录后在 ARY 创建 User 记录并引导补全个人资料。
* **权限管控**：不引入复杂的权限表，直接采用基于 `User.roles` 的 RBAC 模型。
  - 公众端接口开放读取（部分数据受限）。
  - Console 端所有接口强制校验 JWT/Session，并基于资源归属判断（例如：只有赛事的 Organizer 才能审核该赛事的报名）。

### 2.2 赛事报名与工作区开辟
1. 主办方发布赛事。
2. 选手提交 Registration。
3. Organizer 审核通过 (Approved) 后，系统**幂等生成**一个 `RaceProject`，作为选手本场比赛的工作沙盒。

### 2.3 CA 数据安全接入与 DCR 对接 (增补核心)
由于 CA 的原始日志关系到骑行能力评审的公平性，我们必须引入安全体系：
1. **密钥分发**：选手在 Race Console 为自己的 RaceProject 添加 CAConnection，后端生成对应的专属密钥 (`AppSecret`) 展现在前端。
2. **本地签名**：选手将密钥填入老师提供的 DCR Desktop App。DCR App 在抓取 CA 日志后，自动附带本地机器时间戳 (`timestamp`)，并利用密钥执行 HMAC-SHA256 等算法生成签名 (`security.dcrSignature`)。
3. **网关验签**：ARY 的 Ingestion Service 接收请求，拦截器首先验证时间戳是否过期（防重放），再提取数据库中的密钥重复计算签名。验签失败的数据包直接丢弃，拦截恶意伪造的成绩。

### 2.4 Live Hall 与大屏的实时展示 (CQRS 思想)
* 如果 Live Hall 和大屏每次刷新都去统计海量的原始 CA 信号日志，数据库会很快宕机。
* **Projection 方案**：采用类似 CQRS（命令查询职责分离）的思路。
  - DCR 上报的消息落盘后，触发 Projection Worker，将该选手的最新进度、最近风险事件更新到一张专门为“读”优化的宽表（或 Redis）中。
  - 前端的 Live Hall 和 Screen Console 仅轮询/监听这张极轻量的读取模型，保障了观赛体验的极致流畅。

### 2.5 评审与赛果归档
* 评委 (Judge) 在打分时，查阅的不仅是提交的最终代码链接，更是 Projection 引擎总结出的“骑行摘要”和“风险红旗”。
* 评审结束后，系统聚合生成最终的 `leaderboard_read_model`，在 Results 页面发布。

## 3. 技术选型建议 (待讨论落地)

* **前端框架**：推荐 React (Next.js) 或 Vue (Nuxt 3)。有利于后续 SEO 以及复杂的 Gallery 交互动画管理，且与高保真原型无缝衔接。
* **后端语言与框架**：推荐 Node.js (NestJS) 或 Java (Spring Boot)。考虑到“大屏与 Live Hall”需要高频拉取或推送数据，Node.js 在处理高并发的事件流投影上有天生优势。
* **数据库**：PostgreSQL。对复杂关系（报名、评审关联）支持好，且能利用 JSONB 字段灵活存储不同 CA 上报的异构日志。
* **缓存/实时层**：Redis。用于存放防重放的校验 Nonce、高频刷新的 Live Hall 投影数据缓存。
