# AGENTS.md — AI Coding Agent 协作与一键部署指引

本文件专为打开本仓库的 AI Agent（如 Antigravity、Cursor、Claude Code、Codex、Windsurf 等）提供项目上下文，帮助你安全、高效地协助新手完成定制与部署。

## 1. 项目概览
**Una** 是一个专为低配 Linux VPS（2 核 1G 内存即可流畅运行，常驻 ~65MB）设计的 7×24 在线 QQ 官方专属私聊机器人（C2C Only），核心技术栈：
- **通信协议**：`qq-botpy`（腾讯 QQ 官方 WebSocket 长连接，无需域名/公网回调端口）。
- **主程序**：`bot.py`（独立个体意识双模式人格、多模态看图、QQ 语音解析 + DeepSeek 官方 ASR + `pilk` SILK 解码、联网搜索与网页/GitHub 精读、3 小时 RSS 羊毛巡逻 + QQ 邮箱推送、消息去重与防空转熔断 `ApiSafetyGuard`）。
- **长期记忆引擎**：`memory_rag.py`（基于 Python 标准库 `sqlite3` + FTS5 中文 2-gram 分词的零依赖混合 RAG，无容量上限，常驻 12 条 + 自动联想最多 6 条 + `recall_memory` 主动回忆 + 22 轮后台漏记补录）。
- **测试套件**：`tests/test_una.py`（纯标准库 `unittest`，无需真实 Key 即可离线运行）。

## 2. 协助小白部署时的标准工作流
当用户让你帮忙部署 Una 时，请按以下顺序引导，**不要一次性甩出十几个问题**：
1. **确认部署方式**：
   - **裸机 Linux VPS（推荐）**：在目标服务器克隆仓库后执行 `sudo bash install.sh`。
   - **Docker Compose**：复制 `.env.example` 为 `.env` 后执行 `docker compose up -d`。
2. **分步收集并检查必填凭证**（提醒用户不要把真实密钥提交到 Git）：
   - QQ 开放平台（`q.qq.com`）：`QQ_APPID`、`QQ_SECRET`，并提醒在后台配置服务器 **IP 白名单** 与 **WebSocket 单聊（C2C）事件订阅**。
   - 大模型 API（默认 DeepSeek 官方）：`LLM_BASE_URL`、`LLM_API_KEY`、`LLM_MODEL=deepseek-flash`（同时支持看图并自动复用该 Key 调用 `/v1/tools/asr` 听语音）。
   - 个性化称呼：`BOT_NAME`（默认 `Una`）、`USER_NICKNAME`（用户专属称呼）、可选 `EXTRA_PERSONA`。
   - 可选增强：`TAVILY_API_KEY`（联网搜索与网页正文提取）、`SMTP_USER` / `SMTP_PASS`（QQ 邮箱 16 位授权码用于接收带链接的羊毛简报）。
3. **上线验证清单**：
   - 检查日志中出现 `[READY] ... 记忆引擎：SQLite FTS5 | 语音：DeepSeek ASR/...`。
   - 引导用户在手机 QQ 私聊发送：1 条文字、1 张图片（看 `[VISION]`）、1 条语音（看 `[VOICE:DeepSeekASR]`）、1 句重要约定 + `/记忆`（看 `[CORE MEMORY]`）。

## 3. 代码修改与安全红线
- **严禁提交隐私与密钥**：绝对不要将 `.env`、API Key、QQ AppSecret、邮箱授权码、服务器公网 IP 或 `data/memories.db` 写入仓库或 Git 提交。
- **保持 `__slots__` 兼容**：`qq-botpy` 的 `C2CMessage` 使用 `__slots__`，切勿直接给其实例新增未声明属性（请沿用 `RAW_ATTACHMENTS_CACHE` 模式）。
- **保持 DeepSeek DSML 防泄漏**：多轮工具调用必须持续传入 `tools=BOT_TOOLS`，并保留 `strip_dsml` 与无工具兜底汇总。
- **修改后必跑离线测试**：
  ```bash
  python -m unittest discover -s tests -v
  ```
