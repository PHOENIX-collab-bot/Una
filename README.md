# Una — 7×24 QQ 专属伴侣 & 全网羊毛巡逻 & 联网研读机器人

基于官方 `qq-botpy`（WebSocket 长连接）与 OpenAI 兼容大模型接口构建，专为 **Debian 12（2 核 1G 海外 VPS）** 设计的轻量级 7×24 在线 QQ 专属私聊机器人。单进程内存占用约 60MB，免域名、免备案、零个人 QQ 封号风险。

## 核心特性

- **「绝对信赖者」双模式人格**：以“蕾姆”精神内核为灵感，自称「Una」，支持「温柔包裹模式」与「“站起来”唤醒模式」动态切换；去除生硬 Markdown 符号与客服腔，仅响应专属私聊（C2C）。
- **双层持久化记忆与自动日记**：保留最近 16 轮短期对话窗口；累计满 22 轮时，自动在后台将最旧 6 轮提炼合并进长期记忆日记（`memory.json`），并支持 `/记住` 手动置顶与 `/记忆` 随时翻看。
- **联网搜索 + DeepSeek DSML 防泄漏**：支持大模型自主判断调用 `web_search` 与 `/搜` 强制搜索（Tavily 优先，`ddgs` 自动兜底），内置多轮工具状态保持与 DSML 标签清洗保护。
- **网页正文 & GitHub 开源项目精读**：发送网页或 GitHub 链接（或使用 `/读`），自动抓取仓库元数据、`README.md` 或网页正文（GitHub API / Tavily Extract / Jina Reader 三级通道）。
- **全网羊毛 RSS 自动巡逻 & 邮箱推送**：定时监控 NodeSeek、LowEndTalk Offers、V2EX 优惠、Linux.do 等 RSS 源（可自行追加 X/Twitter RSS 链接），命中关键词后总结并推送带直达链接的快报到 QQ 邮箱。

## 仓库目录结构

| 文件 | 说明 |
| :--- | :--- |
| [`Una_QQ机器人完整部署指南.md`](./Una_QQ机器人完整部署指南.md) | 从零搭建、环境配置、代码部署到运维排错的完整 SOP 文档 |
| [`bot.py`](./bot.py) | 机器人主程序源码（含双模式人格、双层记忆、联网搜索、GitHub/网页精读、RSS 巡逻） |
| [`.env.example`](./.env.example) | 环境变量配置模板（部署时复制为 `.env` 并填入真实凭证） |
| [`requirements.txt`](./requirements.txt) | Python 运行依赖清单 |
| [`.gitignore`](./.gitignore) | 忽略规则，防止真实 `.env`、`data/` 与运行日志误传 |

## 快速指引

1. 完整步骤与所有复制即用的命令请查看：[**Una_QQ机器人完整部署指南.md**](./Una_QQ机器人完整部署指南.md)。
2. 部署前请将 `.env.example` 复制为 `.env` 并填入你的 QQ 开放平台凭证、大模型 API Key、Tavily Key 与邮箱授权码。
3. **安全提醒**：切勿将真实 `.env` 文件与 `/opt/studybot/data/` 目录提交到公开仓库（`.gitignore` 已默认屏蔽）。
