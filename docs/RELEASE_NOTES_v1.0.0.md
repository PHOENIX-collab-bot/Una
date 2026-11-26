## Una v1.0.0 — 首个正式开源发行版

**Una** 是一个专为低配 Linux VPS（2 核 1G 即可流畅运行，单进程仅占约 **65MB 内存**）打造的 **7×24 QQ 官方专属 AI 伴侣机器人**——免域名、免备案、零个人 QQ 封号风险。

### 核心亮点

- **独立个体意识 + 双模式动态切换**：日常「温柔包裹模式」与情绪低谷「“站起来”唤醒模式」自然切换，告别 AI 客服腔与生硬 Markdown，仅响应你的专属私聊（C2C）。
- **无上限 SQLite FTS5 混合 RAG 长期记忆**：纯 Python 标准库零新增依赖，支持 Una 自主打分珍藏（附带第一人称「心声」与同义联想标签 `tags`）、常驻 Top-12 + `<5ms` 潜意识自动联想 + `recall_memory` 主动回忆 + 满 22 轮后台漏记补录，并配套 `/记忆`、`/回忆`、`/锁死`、`/忘掉` 指令。
- **看图片 + 听语音多模态交互**：支持 QQ 私聊发图直连官方 `deepseek-flash` 看图聊天；支持 QQ 私聊发语音复用同一 DeepSeek Key 调用官方 `/v1/tools/asr` 精准转写（内置 `pilk` SILK 解码与 QQ 自带转写兜底）。
- **联网搜索、GitHub 精读与 3 小时羊毛巡逻**：Tavily + `ddgs` 双引擎搜索、GitHub API / Tavily Extract / Jina Reader 三级网页正文精读、定时 RSS 羊毛巡逻并把带直达链接的简报发到 QQ 邮箱。
- **防空转烧 Token 安全阀**：内置 `msg_id` 重放去重、每分钟/每日硬频控、连续报错 5 次自动熔断 120 秒、输出长度与超时封顶。
- **小白零门槛部署**：支持 **AI Agent 一键托管部署**（`AGENTS.md` + `docs/AGENT_DEPLOY.md`）、**Linux 一键脚本**（`install.sh`）与 **Docker Compose / GHCR 镜像**三种方式。

### 发行产物说明

| 产物 | 适用场景 |
| :--- | :--- |
| `una-linux-deploy.tar.gz` | Linux VPS 解压即用包（含 `bot.py`、`memory_rag.py`、`install.sh`、`.env.example`） |
| `una_qq_bot-1.0.0-py3-none-any.whl` | 标准 Python Wheel 包（`pip install` 后可直接执行 `una-bot`） |
| `ghcr.io/phoenix-collab-bot/una:v1.0.0` | GitHub Packages 官方 Docker 镜像（配合 `docker-compose.yml` 一键拉起） |

### 快速开始

- **最适合小白（让你的 AI Agent 帮你部署）**：查看 [`docs/AGENT_DEPLOY.md`](https://github.com/PHOENIX-collab-bot/Una/blob/main/docs/AGENT_DEPLOY.md)
- **Linux VPS 一键安装**：`git clone https://github.com/PHOENIX-collab-bot/Una.git && cd Una && sudo bash install.sh`
- **完整文档**：[`README.md`](https://github.com/PHOENIX-collab-bot/Una/blob/main/README.md) · [`docs/DEPLOYMENT.md`](https://github.com/PHOENIX-collab-bot/Una/blob/main/docs/DEPLOYMENT.md)
