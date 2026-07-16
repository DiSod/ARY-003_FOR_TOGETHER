# STATUS

本文是 ARY 任务瞬时看板，记录当前任务状态、证据和风险。不记录历史流水。

## 最新同步

* 全部 11 个正式任务（PRD-1 / UX-1 / DEV-1~7 / REL-1 / OPS-1）均已完成。
* 三位同学合入 3 个 PR（PR #1 何争霖权限修复 / PR #2 六次元后端中间件 / PR #3 何争霖UI重构）。
* 004 阶段已完成：GitHub OAuth 登录、API 响应格式统一、公开页 OAuth 适配、CI/CD、种子数据增强。
* `npm test` — **46 条全部通过**（架构测试）+ **16 条 API 测试全部通过**（六次元新增）。
* 后端 45+ 个 API 端点（Express + SQLite），前端 15 个 HTML 页面。
* 当前阶段：004 PR #6（feat/github-oauth-login）等待合并到 master。

## 当前结论

* GitHub OAuth 登录已实现（需配置 `.env` 中的 `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`）。
* 所有 API 响应已统一为 `{ success: true/false, data/error }` 格式。
* 公开页面（home/race/works/work/results/review/rider/cooperation/live-hall）已适配 OAuth 登录态。
* 共享 `auth.js` 模块，所有页面通过 `localStorage` 跨标签页共享登录状态。
* CI/CD 已就绪（`.github/workflows/test.yml` — push/PR 自动跑 62 条测试）。
* 文档已清理（删除 2 个重复文件 `ux-1-closure.md`、`ux-1-m2-input-final.md`，精简 Agent 导读）。
* Demo 种子数据增强至 5 个用户（organizer + 3 rider + judge）、3 场赛事、多名选手。
* 登录为 Demo 模式 + GitHub OAuth 双模式并行。
* 实时通讯仍采用 HTTP 轮询（10 秒），未实现 WebSocket。
* `AgentDocs/03-open-questions.md` 中的技术选型与架构升级决策尚未落地。

## 任务看板

| 任务 | 状态 | 当前判断 | 证据 / 下一入口 |
| --- | --- | --- | --- |
| `PRD-1` 文档基线与范围确认 | ✅ 完成 | 文档基线已完成收口，可作为架构入口。 | `docs/prd-1-delivery.md` |
| `PRD-TEMP-1` 报名 / RaceProject / CA 参赛语义整改 | ✅ 复审完成 | 已并入 PRD-1 基线，术语统一为 Review Flag / Review Flag Check。 | `docs/prd-temp-1-baseline-delivery.md` |
| `UX-1` UX/UI 高保真原型与设计基线 | ✅ 完成 | 已形成正式收口记录与 M2 输入最终清单。 | `docs/ux-1-closure-delivery.md`、`design-prototype/index.html` |
| `DEV-1` 领域模型 + 权限 + 数据模型 | ✅ 完成 | 46 条验收测试全绿；stores/auth/state-machine/ca-verifier 四个核心模块已实现。 | `project/src/`、`project/test/` |
| `DEV-2` Public Site 静态闭环 | ✅ 完成 | 8 个公开页面：home / race / works / work / results / review / cooperation / rider。 | `project/public/home.html` 等 |
| `DEV-3` 登录 / 角色 / Race Console | ✅ 完成 | Console SPA（Organizer/Rider/Judge 三视图）+ Admin Console 角色管理。 | `project/public/console.html`、`project/public/admin.html` |
| `DEV-4` 报名 / RaceProject / Work / Judge 结构流程 | ✅ 完成 | 10 个后端 API + 完整闭环：报名→审核→作品提交→评委分配→评审打分→奖项发布。 | `project/src/app.js` L600-L745 |
| `DEV-5` CA 接入 / Projection / Live Hall | ✅ 完成 | CA 消息接收+验签+投影引擎 + Live Hall 深色主题实况页。 | `project/public/live-hall.html`、`project/src/app.js` L422-L600 |
| `DEV-6` Screen Console / 大屏联调 | ✅ 完成 | 大屏控制台 5 种模式切换 + 全屏 + 10 秒轮询。 | `project/public/screen.html` |
| `DEV-7` Report / Review / Results | ✅ 完成 | 报告生成器：race_report / rider_report / review_summary 三种类型。 | `project/src/app.js` L753-L850 |
| `REL-1` 赛事彩排 / 灰度发布 / 正式发布 | ✅ 完成 | deploy.sh（staging/production）+ health-check.sh + /api/health。 | `project/deploy.sh`、`project/health-check.sh` |
| `OPS-1` 赛事值守 / 回滚 / 赛后归档 | ✅ 完成 | backup.sh（4 种模式）+ OPS_CHECKLIST.md（含冻结窗口/彩排/值守/回滚/归档）。 | `project/backup.sh`、`project/OPS_CHECKLIST.md` |
| `004-OAUTH` GitHub OAuth 登录 | ✅ 完成 | 后端跳转+回调路由 + 自动建号 + Demo 兼容 + 友好提示。 | `project/src/app.js` L92-L188 |
| `004-FORMAT` API 响应格式统一 | ✅ 完成 | 全部路由改用 response.js helpers（ok/list/created/badRequest/unauthorized/forbidden/notFound）。 | `project/src/app.js` |
| `004-AUTHJS` 公开页 OAuth 适配 | ✅ 完成 | 共享 auth.js（safeFetch + 登录态 + localStorge 跨标签页）+ 9 个页面全部适配。 | `project/public/auth.js` |
| `004-CICD` CI/CD 自动测试 | ✅ 完成 | GitHub Actions — push/PR 自动跑 62 条测试。 | `.github/workflows/test.yml` |
| `004-SEED` 种子数据增强 | ✅ 完成 | 5 用户（3 rider）+ 多选手注册 + 多作品。 | `project/src/db.js` |
| `004-DOCS` 文档清理 | ✅ 完成 | 删除 2 个重复文件，精简 Agent 导读。 | `docs/`、`AgentDocs/` |

## 证据索引

| 结论 | 证据 |
| --- | --- |
| 全部 46 条测试通过 | `npm test` → 46 pass / 0 fail |
| 45 个后端 API 端点已实现 | `project/src/app.js` |
| 15 个前端页面已交付 | `project/public/*.html` |
| Express + SQLite 全栈可运行 | `project/package.json` → `npm install && npm start` |
| 文档集合存在且已集中到 `docs/` | `docs/*.md` |
| 长期任务定义入口为 `docs/ary.plan.md` | `docs/ary.plan.md` |
| Agent 协作规则 | `AGENTS.md` |
| 团队协作与版本更新指引 | `版本更新指引.md` |
| 高保真原型可浏览 | `design-prototype/index.html` |
| AgentDocs 指引文档 | `AgentDocs/`（01 项目分析 / 02 全局设计 / 03 待决策问题 / record 工作日志） |
| 任务设计文档 | `AgentDocs/devTask/`（dev3-4 / dev3 / dev5 / rel1-ops1） |

## 风险与阻塞

| 项目 | 状态 |
| --- | --- |
| GitHub OAuth 需 `.env` 配置 `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` | ✅ 已创建 OAuth App，密钥已配置 |
| GitHub OAuth 密钥误提交到 Git 历史 | ⚠️ 已移除并加入 gitignore，建议 Regenerate secret |
| SQLite 单文件数据库，不适合生产并发 | 004 待评估是否升级到 PostgreSQL |
| 前端原生 HTML/JS，未使用 React/Vue 框架 | 004 待决策前端工程化方案 |
| HTTP 轮询而非 WebSocket，Live Hall 实时性受限 | 004 待升级 |
| DCR 验签算法（HMAC-SHA256 vs RSA）尚未与老师确认 | 待外部确认 |
| `03-open-questions.md` 中技术选型与分工决策待落地 | 进入 004 前需团队对齐 |
