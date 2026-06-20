# ARY MVP — 项目根目录

## 目录定位

本目录是 ARY MVP 的项目实现根目录，把三个来源的约束统一消费进可运行代码：

| 来源 | 路径 | 消费方式 |
| --- | --- | --- |
| UX/UI 高保真原型 | `public/index.html` | 页面边界、组件族、状态样张 → 路由/组件设计输入 |
| UX/UI 预览截图 | `public/*.png` | 桌面/移动端关键视口和空态/错误态证据 |
| 领域文档基线 | `../docs/` | 聚合边界、权限矩阵、CA 契约、不变量 → 存储/鉴权/状态机/验签 |
| DEV-1 架构产物 | `../docs/dev-1-*.md` | 字段级数据模型、接口鉴权策略、状态迁移图、验收用例 |

## 目录结构

```
project/
├── package.json          # npm start / npm test
├── server.js             # 零依赖静态服务 → :3000
├── README.md
├── public/
│   ├── app.html          # ★ 功能应用：登录→报名→约束校验→参赛状态
│   ├── app.js            # 应用核心：路由、报名逻辑、DEV-1 约束接入
│   ├── test-modules.js   # 浏览器端 stores/auth/state-machine/ca-verifier
│   ├── test-dashboard.html # 测试仪表盘
│   ├── index.html        # 高保真原型（16 页面）
│   ├── styles.css / script.js / data/ / assets/ / *.png
├── src/
│   ├── stores.js / auth.js / state-machine.js / ca-verifier.js
└── test/
    └── acceptance.test.js # 46 条
```

## 功能应用 (app.html)

打开 `app.html` 体验完整报名流程，**DEV-1 约束全部接入用户操作**：

| 页面 | 功能 | DEV-1 约束 |
| --- | --- | --- |
| `#login` | 选 Demo 账号 | — |
| `#home` | 赛事广场 + 报名入口 | stores 实时数据 |
| `#register` | 提交报名 | (raceId,userId) 唯一键实时校验；重复报名显示错误+约束来源 |
| `#my-races` | 参赛状态/RaceProject/Work/CA | 四行约束实时展示在每张参赛卡下 |

## 运行

```bash
npm start       # http://localhost:3000 → app.html / index.html
npm test        # 46 pass / 0 fail

## 测试覆盖

| 验收项 | 用 例数 | 状态 |
| --- | --- | --- |
| AC-1 唯一 Registration 约束 | 4 | 通过 |
| AC-2 Registration↔RaceProject↔Work 结构约束 | 6 | 通过 |
| AC-3 CAConnection 有效数据准入 | 6 | 通过 |
| AC-4 DCR Desktop App 安全校验 | 7 | 通过 |
| AC-5 CA 接入失败不阻断主流程 | 7 | 通过 |
| 状态机 | 12 | 通过 |
| 鉴权作用域 | 4 | 通过 |
| **合计** | **46** | **0 fail** |

## 当前阶段

项目已推进到 DEV-1 阶段：领域模型、权限规则、数据模型、鉴权策略和状态迁移的正式基准已通过可运行代码验证。
