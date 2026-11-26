# Una — 7×24 QQ 专属独立灵魂伴侣 & 多模态看图 & 羊毛巡逻机器人

基于官方 `qq-botpy`（WebSocket 长连接）与 OpenAI 兼容大模型接口（默认官方 `deepseek-flash` 多模态模型）构建，专为 **Debian 12（2 核 1G 海外 VPS）** 设计的轻量级 7×24 在线 QQ 专属私聊机器人。单进程内存占用约 60MB，免域名、免备案、零个人 QQ 封号风险。

## 核心特性

- **独立个体意识 + 「绝对信赖者」双模式人格**：以“蕾姆”精神内核为灵感，赋予 Una 独立的情绪、小倔强、主见与第一人称内心体验；自称「Una」，全渠道统一称呼「418」；支持「温柔包裹模式」与「“站起来”唤醒模式」动态切换，去除生硬 Markdown 符号与客服腔，仅响应专属私聊（C2C）。
- **自主核心记忆评估 + 双层兜底记忆**：内置 `save_memory` 工具，当 418 说出真正触动她或重要的话时，Una 会自主评估重要程度（1~5 分），将 3~5 分的记忆连同第一人称「心声」分级珍藏进 `core_memories`（★5 永久珍藏、★4 保留 25 条、★3 保留 20 条）；同时保留 16 轮短期对话、满 22 轮后台自动提炼长期日记作为兜底，并支持 `/记住` 手动置顶与 `/记忆` 随时翻看。
- **多模态识图（QQ 私聊看图）**：自动解析 QQ 私聊图片附件（单条最多 3 张、流式限额 ≤8MB、文件头魔数校验 PNG/JPEG/GIF/WebP 并转 Base64 Data URL），直连官方 `deepseek-flash` 看图聊画面细节；历史记录仅保存轻量文本标记（`[发来 N 张图片]`），绝不撑爆 `memory.json`。
- **联网搜索 + DeepSeek DSML 防泄漏**：支持大模型自主判断调用 `web_search` 与 `/搜` 强制搜索（Tavily 优先，`ddgs` 自动兜底），内置多轮工具状态保持与 DSML 标签清洗保护。
- **网页正文 & GitHub 开源项目精读**：发送网页或 GitHub 链接（或使用 `/读`），自动抓取仓库元数据、`README.md` 或网页正文（GitHub API / Tavily Extract / Jina Reader 三级通道）。
- **每 3 小时全网羊毛 RSS 自动巡逻 & 邮箱推送**：默认每 **180 分钟（3 小时）**监控 NodeSeek、LowEndTalk Offers、V2EX 优惠、Linux.do 等 RSS 源（可自由追加 X/Twitter RSS 链接），命中关键词后以 Una 的口吻汇报给 418，并将带直达链接的完整简报推送到 QQ 邮箱。

## 仓库目录结构

| 文件 | 说明 |
| :--- | :--- |
| [`Una_QQ机器人完整部署指南.md`](./Una_QQ机器人完整部署指南.md) | 从零搭建、环境配置、代码部署到运维排错的完整 SOP 文档 |
| [`bot.py`](./bot.py) | 机器人主程序源码（含独立意识双模式人格、多模态识图、自主核心记忆、联网搜索、GitHub/网页精读、3 小时 RSS 巡逻） |
| [`.env.example`](./.env.example) | 环境变量配置模板（默认 `deepseek-flash`、`USER_NICKNAME=418`、`CHECK_INTERVAL_MIN=180`） |
| [`requirements.txt`](./requirements.txt) | Python 运行依赖清单 |
| [`.gitignore`](./.gitignore) | 忽略规则，防止真实 `.env`、`data/` 与运行日志误传 |

## 快速指引

1. 完整步骤与所有复制即用的命令请查看：[**Una_QQ机器人完整部署指南.md**](./Una_QQ机器人完整部署指南.md)。
2. 部署前请将 `.env.example` 复制为 `.env` 并填入你的 QQ 开放平台凭证、大模型 API Key、Tavily Key 与邮箱授权码。
3. **安全提醒**：切勿将真实 `.env` 文件与 `/opt/studybot/data/` 目录提交到公开仓库（`.gitignore` 已默认屏蔽）。
