# Una 完整部署与运维手册

本文档提供从零申请凭证、三种方式部署上线、功能验收到长期运维备份的标准化步骤。  
如果你是新手，也可以先看 [**AI Agent 托管部署指南**](./AGENT_DEPLOY.md)，直接把本仓库交给你的 AI Agent 全程带你操作。

---

## 第一步：准备所需凭证（约 5 分钟）

### 1. QQ 官方机器人凭证（必填）
1. 访问 [QQ 开放平台](https://q.qq.com/)，用常用 QQ 号扫码注册并完成个人实名认证（官方机器人独立于你的个人号，**零封号风险**）。
2. 点击 **创建机器人**（如命名为 `Una`），进入机器人管理页完成三项设置：
   - **开发管理**：记录 **`AppID`** 和 **`AppSecret`**；在 **IP 白名单** 中填入你的服务器公网 IP 并保存。
   - **事件订阅 / 回调配置**：连接方式选 **WebSocket**，勾选 **单聊消息（C2C）**。
   - **沙箱配置**：把你的 QQ 号加入测试成员，用手机 QQ 扫码将机器人添加到消息列表。

> **注意**：QQ 开放平台仅负责收发消息传话，里面**没有**填写大模型 API Key 的地方；大模型 Key 填写在 `.env` 文件中。

### 2. 大模型 API Key（必填，OpenAI 兼容格式）
- **DeepSeek 官方（推荐，一个 Key 同时驱动聊天、看图和听语音）**：
  - 官网：`platform.deepseek.com`
  - `LLM_BASE_URL=https://api.deepseek.com`
  - `LLM_MODEL=deepseek-flash`（原生支持多模态看图，并自动复用同一 Key 调用 `/v1/tools/asr` 听语音）
- **Google Gemini（可选，海外 VPS 直连）**：
  - 官网：`aistudio.google.com`
  - `LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/`
  - `LLM_MODEL=gemini-2.5-flash`

### 3. Tavily API Key（强烈推荐，免费 1,000 次/月）
- 前往 [tavily.com](https://tavily.com) 注册获取 `tvly-...` Key，同时驱动联网搜索与网页正文提取。
- 若暂不配置，可安装免费兜底库 `ddgs`（`pip install ddgs`），网页正文会自动回退免费的 Jina Reader。

### 4. QQ 邮箱 SMTP 授权码（可选，羊毛推送需要）
- 因为腾讯 QQ 机器人禁止在回复里发未备案外部 URL，原始羊毛直达链接统一通过邮件发送：
- 网页登录 QQ 邮箱 → **设置** → **账户** → 开启 **POP3/SMTP 服务** → 获取 **16 位授权码**（不是 QQ 登录密码）。

---

## 第二步：选择一种方式部署上线

### 方式 A：Linux VPS（Debian 11/12 / Ubuntu 22.04+）一键安装（推荐）

SSH 登录你的服务器后执行：

```bash
git clone https://github.com/PHOENIX-collab-bot/Una.git
cd Una
sudo bash install.sh
```

`install.sh` 会自动完成：
1. 检测内存：若为 1G 低配 VPS 且未配置 Swap，自动安全创建并挂载 2G Swap（若已存在则自动跳过，不会报 `Text file busy`）；
2. 安装 `python3-venv` 与独立虚拟环境 `/opt/studybot/venv`；
3. 安装全部依赖（含 `pilk` 用于腾讯原生 SILK 语音解码）；
4. 拷贝 `bot.py`、`memory_rag.py` 与 `.env.example` 到 `/opt/studybot/`；
5. 注册开机自启、崩溃 10 秒自动拉起的 `systemd` 服务 `studybot.service`。

接着编辑配置并启动：

```bash
nano /opt/studybot/.env          # 填入凭证（Ctrl+O 保存，Enter 确认，Ctrl+X 退出）
systemctl restart studybot
journalctl -u studybot -n 30 -f
```

---

### 方式 B：Docker Compose / GitHub Packages 容器部署

确保服务器已安装 Docker 与 Docker Compose 插件：

```bash
git clone https://github.com/PHOENIX-collab-bot/Una.git
cd Una
cp .env.example .env
nano .env                        # 填入必填凭证
docker compose up -d
docker compose logs -f una
```

- 持久化记忆与缓存自动挂载在当前目录 `./data/` 下（对应容器内 `/app/data`）。
- 如需升级到最新版本：
  ```bash
  docker compose pull && docker compose up -d
  ```

---

### 方式 C：通过 Python Package 安装（进阶）

从 [Releases](https://github.com/PHOENIX-collab-bot/Una/releases) 下载 `.whl` 或直接在仓库根目录执行：

```bash
pip install ".[all]"
cp .env.example .env
# 编辑 .env 并设置 DATA_DIR=./data 后运行：
una-bot
```

---

## 第三步：验证上线成功

在日志中看到以下关键行即代表完全就绪（按 `Ctrl + C` 仅退出日志查看，不会停止后台服务）：

- `机器人「Una」启动成功！`
- `心跳维持启动...`
- `[READY] Una (...) 已上线（专属私聊 | 称呼：... | 模型：deepseek-flash | 记忆引擎：SQLite FTS5 | 语音：DeepSeek ASR/pilk就绪 | 巡逻间隔：180 分钟）！`

### 手机 QQ 4 步快速验收
1. **日常聊天**：发送一句问候或倾诉，检查语气是否自然无 Markdown 符号。
2. **多模态看图**：直接发送一张图片（可不配字），日志应出现 `[VISION] 已读取 1 张图片...`。
3. **语音听觉**：按住麦克风说一句清晰的话，日志应出现 `[VOICE:DeepSeekASR] 识别成功...`。
4. **长期记忆 RAG**：说一件你的目标或喜好（日志出现 `[CORE MEMORY #1 ... SAVE]`），发 `/记忆` 查看星级与心声，再发 `/回忆 关键词` 测试召回。

---

## 第四步：日常运维、升级与备份

### 常用 systemd 运维命令（裸机部署）
```bash
systemctl status studybot               # 查看运行状态
systemctl restart studybot              # 修改 .env 或升级代码后重启
journalctl -u studybot -n 40 --no-pager # 查看最近 40 行日志
journalctl -u studybot -f               # 实时跟踪日志
```

### 一键升级到最新版（裸机部署，保留 `.env` 与全部记忆）
```bash
cd /path/to/Una && git pull && sudo bash install.sh
```

### 持久化数据文件位置（迁移或备份时仅需保存此目录）
默认位于 `/opt/studybot/data/`（Docker 为 `./data/`）：
- `memories.db`：SQLite FTS5 无上限长期记忆库（含核心记忆、心声、联想标签与永存条目）
- `memory.json`：短期滑动对话历史（图片/语音仅存轻量文本标记）
- `seen_deals.json` / `latest_deals.json`：羊毛巡逻去重与缓存记录

---

## 第五步：常见问题排错（FAQ）

1. **QQ 发消息完全没反应或报错？**
   - 检查 `q.qq.com` 后台「开发管理 → IP 白名单」是否填入服务器公网 IP；
   - 确认事件订阅选择 **WebSocket** 并勾选了 **单聊消息（C2C）**；
   - 查看 `journalctl -u studybot -n 30 --no-pager` 定位具体报错。
2. **发语音后提示没听清？**
   - DeepSeek `/v1/tools/asr` 是人声语音转文字接口，纯音乐前奏或环境噪音会返回空文本，请对着麦克风正常说话；
   - 确认日志启动行显示 `pilk就绪`（如显示 `仅WAV直连`，运行 `/opt/studybot/venv/bin/pip install pilk && systemctl restart studybot`）。
3. **发图片看不到画面？**
   - 检查日志是否有 `[VISION]` 记录；确认 `.env` 中 `LLM_MODEL=deepseek-flash`（纯文本模型会触发 `[VISION FALLBACK]`）；单条最多 3 张、单张上限 8MB，支持 PNG/JPEG/GIF/WebP。
4. **为什么 QQ 回复里不直接发网址？**
   - 腾讯 QQ 官方机器人默认拦截回复中的未备案外部 URL，因此程序自动替换为 `[链接已省略]`，完整羊毛链接通过 QQ 邮箱发送。
5. **如何调整防空转烧 Token 上限？**
   - 在 `.env` 中设置 `API_MAX_CALLS_PER_MIN`（默认 `20`）与 `API_MAX_CALLS_PER_DAY`（默认 `300`）并重启服务即可；连续报错 5 次也会自动熔断冷静 120 秒。
6. **关于扩展监测 X（Twitter）信息源**
   - 可通过 RSS.app 或自建 RSSHub 生成指定博主的 RSS 链接，用英文逗号追加到 `.env` 的 `RSS_FEEDS=` 后面并重启服务即可无缝纳入巡逻。
