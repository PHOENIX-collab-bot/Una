# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 规范与 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.0] - 2026-11-26

### Added
- **独立意识双模式人格**：融合“温柔包裹模式”与“‘站起来’唤醒模式”，彻底去除客服腔与生硬 Markdown，仅服务专属私聊（C2C）。
- **无上限 SQLite FTS5 混合 RAG 长期记忆引擎（`memory_rag.py`）**：零第三方依赖，内置中文 2-gram 分词 + 语气词降噪 + `save_memory` 同义联想标签 `tags` + 常驻 12 条核心记忆 + `<5ms` 潜意识自动联想 + `recall_memory` 主动回忆 + 满 22 轮后台漏记补录 + 老版 `memory.json` 自动无损迁移。
- **全套记忆管理指令**：新增 `/记忆`、`/回忆`、`/记住`、`/锁死`、`/忘掉`。
- **QQ 私聊多模态看图**：支持单条最多 3 张、≤8MB 流式下载、PNG/JPEG/GIF/WebP 魔数校验并直连 `deepseek-flash` 多模态识图，历史仅存轻量文本标记。
- **QQ 私聊语音听觉**：新增兼容 `__slots__` 的 `RAW_ATTACHMENTS_CACHE` 原始附件补丁，优先直连 DeepSeek 官方 `POST /v1/tools/asr`（复用 `LLM_API_KEY`），内置 `pilk` SILK v3 解码与 QQ 自带 `asr_refer_text` 兜底。
- **联网搜索 & 网页/GitHub 精读**：Tavily + `ddgs` 双引擎搜索、GitHub API / Tavily Extract / Jina Reader 三级正文读取，以及 DeepSeek DSML 防泄漏保护。
- **3 小时全网羊毛巡逻 & QQ 邮箱推送**：自动巡逻 NodeSeek / LowEndTalk / V2EX / Linux.do 等 RSS 源并发送带直达链接简报。
- **防空转烧 Token 安全阀（`ApiSafetyGuard`）**：消息 `msg_id` 重放去重 + 每分钟/每日硬频控 + 连续 5 次报错自动熔断 120 秒 + `max_tokens` 与超时封顶。
- **标准化开源工程体系**：新增 `install.sh` 一键部署脚本、`Dockerfile` / `docker-compose.yml`、`pyproject.toml`、GitHub Actions CI & Release/GHCR Packages 自动化工作流、离线单元测试 `tests/test_una.py`，以及小白友好的 **AI Agent 托管部署指南（`AGENTS.md` / `docs/AGENT_DEPLOY.md`）**。
