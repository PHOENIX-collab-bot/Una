# Una 技术架构与核心机制解析

本文档面向开发者与希望深度定制 Una 的用户，详细说明记忆 RAG、多模态视觉/语音流水线与防空转熔断的设计原理。

---

## 1. 零依赖混合 RAG 长期记忆引擎（`memory_rag.py`）

为了在 **2 核 1G 内存 VPS** 上实现“聊几年都不丢记忆，同时单次对话上下文不膨胀”，Una 将“硬盘存储容量”与“单轮对话读取窗口”彻底解耦：

```mermaid
flowchart TB
    subgraph WritePath["写入通道（统一落盘 memories.db）"]
        W1["Una 自主调用 save_memory<br/>评 3~5 分 + 第一人称心声 + 3~6 个同义 Tags"]
        W2["用户手动 /记住 内容<br/>直接置顶 pinned=1, ★5"]
        W3["满 22 轮后台漏记补录器<br/>异步扫描最旧 6 轮补录 3~4 分遗漏事实"]
        W4["首次启动自动迁移<br/>无损导入旧 memory.json"]
    end

    W1 & W2 & W3 & W4 --> Dedup["智能去重与 Tags 合并<br/>(SequenceMatcher ≥ 0.82 原地更新)"]
    Dedup --> SQLite[("SQLite WAL 表 memories<br/>+ FTS5 虚拟表 memories_fts")]

    subgraph ReadPath["双通道读取（每轮总注入 ≤ 18 条）"]
        R1["常驻视野（Top 12）<br/>所有永存 pinned + 最高星级最新记忆"]
        R2["通道 A：潜意识自动联想（<5ms）<br/>中文 2-gram + 语气词降噪 + BM25/Tags 混合打分"]
        R3["通道 B：Una 主动回忆工具 recall_memory<br/>跨词/按分类翻查全库"]
    end

    SQLite --> R1 & R2 & R3
    R1 & R2 & R3 --> LLM["注入 System Prompt / Tool Result"]
```

### 关键工程细节
- **为什么不用本地 Embedding / 向量库？** 本地运行 `bge-m3` 等模型会占用 600MB~1.5GB 内存，在 1G VPS 上极易 OOM；而 Python 标准库内置的 `sqlite3`（FTS5）内存增量 < 5MB，查询耗时 < 5ms。
- **如何解决 SQLite 原生不懂中文分词 + 同义词联想？**
  1. **轻量中文 2-gram / 3-gram 分词 + 语气助词切分**：自动按 `的了吗呢吧啊呀哦嘛哇` 切分，避免产生无效碎片词元，同时剔除 90+ 中文口语虚词及双方称呼。
  2. **AI 自主生成同义触发词 `tags`**：Una 存记忆时顺手写 3~6 个关联场景词（如记“年底去北海道看雪”附带 `["旅行","日本","滑雪","度假"]`），FTS5 为 `tags_tok` 赋予 **2.2× 权重**，实现跨词语义联想。
  3. **防误触门槛（`strict_gate`）**：普通问候（如“早安”“哈哈”）直接返回 0 条，避免无关旧事强行插入导致出戏。
- **句柄安全**：所有数据库连接通过 `@contextlib.contextmanager` 在事务完成后立即 `close()`，杜绝长时间运行下的文件描述符泄漏。

---

## 2. 多模态输入管道（看图片 + 听语音）

```mermaid
flowchart LR
    Msg["QQ C2C 事件到来"] --> Patch["__slots__ 兼容补丁<br/>外部有界缓存 RAW_ATTACHMENTS_CACHE"]
    Patch --> Branch{"附件类型分发"}

    Branch -->|"图片 (image/*)"| ImgDL["流式下载 ≤8MB (最多 3 张)"]
    ImgDL --> Mime["魔数校验 PNG/JPEG/GIF/WebP<br/>转 Base64 Data URL"]
    Mime --> Vision["deepseek-flash 多模态视觉输入<br/>(历史仅存 [发来 N 张图片])"]

    Branch -->|"语音 (voice / .silk)"| AudioDL["优先下载 QQ 预转 voice_wav_url<br/>缺失时下载原 SILK → pilk 解码 16-bit WAV"]
    AudioDL --> ASR["DeepSeek 官方 ASR<br/>POST /v1/tools/asr (复用同一 Key)"]
    ASR -->|"异常时自动兜底"| QQFallback["QQ 平台自带 asr_refer_text"]
    ASR & QQFallback --> Chat["以 [语音] 语境融入自然对话 & RAG"]
```

### 关键避坑点
- **`qq-botpy` `__slots__` 兼容**：腾讯官方 SDK 的 `C2CMessage` 使用 `__slots__`，直接给实例赋值新属性会抛出 `AttributeError`。Una 通过模块级有界 `OrderedDict`（上限 100 条，并在 `finally` 中按 `msg_id` 即时清理）安全提取原始 JSON 中的 `voice_wav_url` 与 `asr_refer_text`。
- **DeepSeek DSML 防泄漏**：多轮工具调用时（最多 2 轮工具 + 1 轮最终收口），每轮均持续传入 `tools=BOT_TOOLS`；若模型仍偶发输出 `<｜DSML｜ calls>` 标签，`[DSML GUARD]` 会自动清洗并切换无工具纯文本通道重新汇总。

---

## 3. 防空转烧 Token 安全阀（`ApiSafetyGuard`）

```mermaid
flowchart TD
    Event["收到 QQ C2C 消息"] --> Dedup{"msg_id 是否已在<br/>SEEN_MSG_IDS (500条)?"}
    Dedup -->|"是（WebSocket 重连重放）"| Skip["[DEDUP] 直接忽略（0 消耗）"]
    Dedup -->|"否"| Guard{"ApiSafetyGuard 检查"}
    Guard -->|"处于 120s 熔断期<br/>或超 20次/分 或 300次/天"| Block["拦截请求并温柔提示用户"]
    Guard -->|"放行"| Call["safe_chat_completion / ASR<br/>(强制 max_tokens=1200, timeout=45s)"]
    Call -->|"成功"| Reset["consecutive_errors = 0"]
    Call -->|"报错"| ErrCnt{"连续报错 ≥ 5 次?"}
    ErrCnt -->|"是"| Open["[CIRCUIT OPEN]<br/>开启 120 秒熔断冷静期"]
    ErrCnt -->|"否"| Wait["累计计数并降级回复"]
```
