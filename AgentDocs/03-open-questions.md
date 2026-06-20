# 项目全局核心讨论议题 (Open Questions)

针对 ARY 项目接下来的全量开发任务，除了要解决前述的 DCR 安全对接，团队必须在近期开会敲定整个项目的技术路线与业务细节。请各组负责人就以下四个维度进行决策：

## 第一部分：全局技术选型与基础设施 (Tech Stack & DevOps)

1. **前后端基础框架选型**：
   - 前端我们用 React + Vite，还是直接上 Next.js？（由于我们的高保真原型有大量复杂的交互动画和状态，组件化管理非常重要）。
   - 后端使用 Node.js (NestJS、Koa 等) 还是 Java (Spring Boot)？Node.js 在处理高频的 CA 日志和实时 Live Hall 推送时有优势，而 Spring Boot 适合严谨的评审和赛事状态流转。
2. **数据库与 ORM 选型**：
   - 考虑到报名关系、评委打分、奖项关联是典型的关系型数据，而 CA 上报的日志格式可能经常变，我们是否统一使用 PostgreSQL，并在日志等灵活字段利用 JSONB 存储？需要引入 Prisma/TypeORM 吗？
3. **大屏与 Live Hall 的实时通讯**：
   - 前端大屏是采用定期 HTTP Polling（轮询），还是搭建 WebSocket 长链接？（WebSocket 观赛体验好，但在部署时需要考虑代理断开重连和心跳包）。

## 第二部分：外部依赖与 DCR 对接（需要向老师/助教核实）

1. **DCR 验签算法细节**：老师提供的 DCR App 在本地是用什么具体的加密算法生成签名的？是 HMAC-SHA256 还是 RSA？它是针对整个 HTTP Body 算 hash，还是只取特定的几个字段拼接？
2. **数据通讯协议**：DCR 是通过简单的 HTTP POST 还是其他协议与我们的服务端连接？服务端返回什么样的 HTTP Status Code（如 200/403）能被 DCR 正常处理并反馈给选手？

## 第三部分：产品交互与 UX 落地 (Frontend & UI)

1. **高保真原型向代码的转换路径**：
   - 目前 `design-prototype` 文件夹下有静态的 HTML/CSS。前端同学是打算直接在这个基础上套 Vue/React 组件（可能面临样式冲突和工程化困难），还是基于这些设计稿，在现代脚手架中从零还原？
2. **DCR 密钥展现逻辑**：在 Rider View 生成 CA 密钥后，是像 GitHub 的 Personal Access Token 一样“离开页面后永远不再显示（只显示一次）”，还是允许选手随时查看并重置？
3. **验签失败在裁判视角的展示**：在 Judge View 中，对于存在“尝试篡改记录”被网关拦截的选手，我们是在其成绩页上打一个显眼的红标，还是单设一个风险审计 (Risk Audit) 选项卡供评委核实？

## 第四部分：项目排期与分工 (Project Management)

1. **模块认领**：
   - 谁负责赛事的基础 CRUD（创建、报名审核）？
   - 谁负责挑战性最大的“CA Ingestion 与实时 Projection 计算引擎”？
   - 谁负责公开展板（Gallery / Live Hall）的前端动效开发？
2. **联调计划**：何时完成前后端的 Mock API 对接？何时组织系统全链路的 Staging 压测？（必须保证赛事当天大屏和 Live Hall 稳定展现）。
