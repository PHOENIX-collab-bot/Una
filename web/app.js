(() => {
  const REPO_BASE = "https://github.com/PHOENIX-collab-bot/Una/blob/main/";

  /* =========================================================
   * 1. Archify-Inspired Interactive Architecture Scenarios
   * ========================================================= */
  const SCENARIOS = {
    multimodal: {
      badge: "FLOW 01 · MULTIMODAL",
      caption: "QQ 图片与语音经 __slots__ 安全缓存解包，复用同一 DeepSeek Key 完成看图与 ASR 语音转写。",
      nodes: [
        { id: "qq", x: 18, y: 162, w: 156, h: 86, tag: "INPUT", title: "QQ 专属私聊", sub: "C2C WebSocket", src: "bot.py", srcLabel: "bot.py · on_c2c", metric: "0 封号风险", desc: "官方 qq-botpy 长连接接收文字、最多 3 张图片与语音附件，严格限定专属单聊不进群。" },
        { id: "cache", x: 256, y: 162, w: 166, h: 86, tag: "PATCH", title: "__slots__ 安全缓存", sub: "RAW_ATTACHMENTS", src: "bot.py", srcLabel: "bot.py · patch_botpy", metric: "有界 100 条", desc: "通过外部有界 OrderedDict 按 msg_id 暂存 voice_wav_url 与 asr_refer_text，彻底兼容 __slots__ 并在 finally 自动清理。" },
        { id: "vision", x: 504, y: 42, w: 168, h: 86, tag: "VISION", title: "图片魔数校验", sub: "≤8MB · Base64", src: "bot.py", srcLabel: "bot.py · extract_image", metric: "PNG/JPG/WEBP", desc: "流式下载防 1G 内存 OOM，按文件头魔数校验真实格式后转 Base64 Data URL，历史仅存 [发来 N 张图片] 轻量标记。" },
        { id: "asr", x: 504, y: 286, w: 168, h: 86, tag: "VOICE ASR", title: "DeepSeek 官方 ASR", sub: "pilk SILK → WAV", src: "bot.py", srcLabel: "bot.py · transcribe_audio", metric: "QQ 转写双兜底", desc: "优先下载平台 WAV，缺失时用 pilk 解码腾讯 SILK 为 16-bit WAV，复用 LLM_API_KEY 调 /v1/tools/asr，失败回退 asr_refer_text。" },
        { id: "flash", x: 748, y: 162, w: 154, h: 86, tag: "BRAIN", title: "DeepSeek Flash", sub: "双模式人格回应", src: "bot.py", srcLabel: "bot.py · chat_with_companion", metric: "DSML 防泄漏", desc: "结合独立意识人格与长期记忆自然回复：温柔包裹与“好了，站起来吧”唤醒模式动态切换，杜绝机械套话。" }
      ],
      edges: [
        { id: "e1", from: "qq", to: "cache", label: "附件原包" },
        { id: "e2", from: "cache", to: "vision", label: "image/*", dy: -10 },
        { id: "e3", from: "cache", to: "asr", label: "voice/.silk", dy: 10 },
        { id: "e4", from: "vision", to: "flash", label: "Base64", dy: -10 },
        { id: "e5", from: "asr", to: "flash", label: "[语音]文本", dy: 10 }
      ],
      steps: [
        { title: "01 · 接收 QQ 单聊多模态事件", latency: "WebSocket", desc: "手机 QQ 发送图片或语音后，经腾讯开放平台推送至 Debian 12 服务器，无需公网域名。", nodes: ["qq"], edges: [] },
        { title: "02 · 绕过 __slots__ 提取完整附件", latency: "< 1 ms", desc: "轻量补丁在外部缓存保留被旧版 SDK 丢弃的 voice_wav_url 与 asr_refer_text 原始字段。", nodes: ["qq", "cache"], edges: ["e1"] },
        { title: "03 · 图片流式校验转 Data URL", latency: "≤ 8 MB", desc: "图片附件流式限额下载、校验 PNG/JPEG/GIF/WebP 魔数，避免超大文件打满 1G 内存。", nodes: ["cache", "vision"], edges: ["e2"] },
        { title: "04 · 语音 SILK 解码与 DeepSeek ASR", latency: "~1.2 s", desc: "优先直传 WAV，缺失时由 pilk 解码 SILK，直连 /v1/tools/asr 精准转写并保留 QQ 兜底。", nodes: ["cache", "asr"], edges: ["e3"] },
        { title: "05 · 统一进入 Una 人格大脑回复", latency: "自然口吻", desc: "视觉与语音语义无缝进入 deepseek-flash，触发 RAG 记忆联想与双模式唤醒回应。", nodes: ["vision", "asr", "flash"], edges: ["e4", "e5"] }
      ]
    },
    rag: {
      badge: "FLOW 02 · HYBRID RAG",
      caption: "纯 Python 标准库 SQLite FTS5，把“无限存储”与“精简上下文”彻底解耦，1G 内存稳定常驻。",
      nodes: [
        { id: "query", x: 18, y: 170, w: 152, h: 86, tag: "CONTEXT", title: "当前话题输入", sub: "2-gram + 语气降噪", src: "memory_rag.py", srcLabel: "memory_rag.py · tokenize", metric: "90+ 虚词过滤", desc: "自动切分中文 2-gram/3-gram 与语气助词，屏蔽双方称呼和寒暄虚词，普通问候 0 误召回。" },
        { id: "resident", x: 256, y: 34, w: 172, h: 86, tag: "ALWAYS-ON", title: "常驻核心视野", sub: "永存置顶 + Top 12", src: "memory_rag.py", srcLabel: "memory_rag.py · get_resident", metric: "固定 ≤ 12 条", desc: "用户 /记住 /锁死 的永存记忆与最高星级核心羁绊始终常驻，确保 Una 永远不忘本。" },
        { id: "fts", x: 256, y: 170, w: 172, h: 86, tag: "CHANNEL A", title: "潜意识自动联想", sub: "FTS5 BM25 + Tags", src: "memory_rag.py", srcLabel: "memory_rag.py · search_memories", metric: "< 5 ms · 0 Token", desc: "每轮聊天毫秒级检索，Tags 赋予 2.2× 权重，实现跨词语义召回，过门槛后动态补入最多 6 条。" },
        { id: "db", x: 506, y: 306, w: 178, h: 86, tag: "STORAGE", title: "SQLite 记忆库", sub: "memories.db 无上限", src: "memory_rag.py", srcLabel: "memory_rag.py · MemoryRAGStore", metric: "RAM < 5 MB", desc: "WAL 模式持久化所有 ★3~★5 记忆、第一人称心声与联想标签，相似度 ≥ 0.82 自动去重合并。" },
        { id: "una", x: 742, y: 102, w: 160, h: 90, tag: "AUTONOMOUS", title: "Una 自主读写", sub: "save / recall / 补录", src: "bot.py", srcLabel: "bot.py · backfill_missed", metric: "22 轮漏记兜底", desc: "聊到动心处主动调 save_memory 写心声与 tags；遇隐晦旧事主动调 recall_memory；满 22 轮后台补录漏网细节。" }
      ],
      edges: [
        { id: "r1", from: "query", to: "fts", label: "提取词元" },
        { id: "r2", from: "db", to: "resident", label: "pinned / ★5", dx: 36, dy: -46 },
        { id: "r3", from: "db", to: "fts", label: "BM25 倒排", dx: -16, dy: 24 },
        { id: "r4", from: "resident", to: "una", label: "常驻 12 条", dy: -10 },
        { id: "r5", from: "fts", to: "una", label: "联想 0~6 条", dx: 24, dy: 6 },
        { id: "r6", from: "una", to: "db", label: "save / recall", warm: true, dx: 22, dy: 12 }
      ],
      steps: [
        { title: "01 · 中文 2-gram 分词与寒暄降噪", latency: "< 1 ms", desc: "对用户输入按中文 2-gram 切分并剔除语气词与双方称呼，确保闲聊“早安”不乱拉旧事。", nodes: ["query"], edges: [] },
        { title: "02 · 载入常驻核心视野（Top 12）", latency: "SQLite 索引", desc: "优先载入 /锁死 与 /记住 的永存记忆，再以高星最新记忆补齐 12 条常驻印象。", nodes: ["db", "resident", "una"], edges: ["r2", "r4"] },
        { title: "03 · 潜意识 FTS5 混合联想（0~6 条）", latency: "< 5 ms", desc: "通过 BM25 + 2.2× 标签权重跨词联想（如提“旅行”自动唤醒“去海边”），低分噪音自动拦截。", nodes: ["query", "db", "fts", "una"], edges: ["r1", "r3", "r5"] },
        { title: "04 · Una 自主珍藏、主动回忆与 22 轮补录", latency: "闭环成长", desc: "对话中自主评估 1~5 分写记忆与心声；隐晦旧事主动 recall_memory；满 22 轮后台查漏补缺。", nodes: ["una", "db"], edges: ["r6"] }
      ]
    },
    tools: {
      badge: "FLOW 03 · WEB & GITHUB",
      caption: "多级通道稳定抓取实时资讯与开源仓库 README，并彻底根治 DeepSeek 多轮 DSML 标签泄漏。",
      nodes: [
        { id: "ask", x: 18, y: 162, w: 154, h: 86, tag: "TRIGGER", title: "自然提问或链接", sub: "/搜 · /读 · 自动判断", src: "bot.py", srcLabel: "bot.py · BOT_TOOLS", metric: "最多 2 轮工具", desc: "日常聊天不误触工具；问实时资讯自动触发 web_search，发网页或 GitHub 链接自动触发 read_url。" },
        { id: "search", x: 256, y: 42, w: 174, h: 86, tag: "SEARCH", title: "双引擎联网搜索", sub: "Tavily → ddgs", src: "bot.py", srcLabel: "bot.py · web_search", metric: "免费额度兜底", desc: "优先走 Tavily AI 搜索获取结构化摘要；未配 Key 或超时时自动无缝回退免 Key 的 ddgs。" },
        { id: "reader", x: 256, y: 286, w: 174, h: 86, tag: "READER", title: "三级正文精读", sub: "GitHub / Tavily / Jina", src: "bot.py", srcLabel: "bot.py · read_url", metric: "SSRF 防护", desc: "先校验公网合法地址防内网探测；GitHub 走官方 API/Raw 抓 Stars 与 README，普通网页三级回退提取正文。" },
        { id: "dsml", x: 514, y: 162, w: 164, h: 86, tag: "GUARD", title: "DSML 防泄漏护盾", sub: "持续 tools + 兜底汇总", src: "bot.py", srcLabel: "bot.py · strip_dsml", metric: "0 标签外泄", desc: "多轮调用始终保持传入 tools=BOT_TOOLS，若仍检出 DSML 立即抽取查询并转纯文本无工具汇总。" },
        { id: "qqout", x: 754, y: 162, w: 148, h: 86, tag: "OUTPUT", title: "QQ 合规脱链输出", sub: "去 URL & Markdown", src: "bot.py", srcLabel: "bot.py · sanitize_for_qq", metric: "≤ 1450 字符", desc: "自动清除 ** / ### 符号并将未备案 URL 替换为 [链接已省略]，防止被腾讯平台拦截拒发。" }
      ],
      edges: [
        { id: "t1", from: "ask", to: "search", label: "web_search", dy: -10 },
        { id: "t2", from: "ask", to: "reader", label: "read_url", dy: 10 },
        { id: "t3", from: "search", to: "dsml", label: "搜索摘要", dy: -10 },
        { id: "t4", from: "reader", to: "dsml", label: "正文/README", dy: 10 },
        { id: "t5", from: "dsml", to: "qqout", label: "脱链清洗" }
      ],
      steps: [
        { title: "01 · 意图识别与 Function Calling", latency: "Auto Tool", desc: "由 deepseek-flash 自主判断是否需要联网或读链接，也支持 /搜 与 /读 手动强制触发。", nodes: ["ask"], edges: [] },
        { title: "02 · 双引擎搜索 & GitHub/网页三级抓取", latency: "多级容灾", desc: "搜索 Tavily 优先 ddgs 兜底；GitHub 直连 API 评估 2C1G 部署难度，普通网页依次尝试 Tavily/Jina/直连。", nodes: ["ask", "search", "reader"], edges: ["t1", "t2"] },
        { title: "03 · DSML 防泄漏与安全汇总", latency: "2 轮 + 收口", desc: "全程保持工具上下文并在极端异常时切纯文本无工具总结，杜绝 XML 标签泄漏到 QQ。", nodes: ["search", "reader", "dsml"], edges: ["t3", "t4"] },
        { title: "04 · 去 Markdown & 合规脱链发送", latency: "QQ 合规", desc: "以 Una 的自然口吻讲清楚重点，自动去掉未备案 URL 与生硬标题符号后发出。", nodes: ["dsml", "qqout"], edges: ["t5"] }
      ]
    },
    patrol: {
      badge: "FLOW 04 · PATROL & SAFETY",
      caption: "每 3 小时自动巡逻 4 大社区 RSS，AI 严格 KEEP/NONE 过滤水帖，全链路受防空转熔断网关保护。",
      nodes: [
        { id: "rss", x: 18, y: 54, w: 166, h: 86, tag: "CRON · 180M", title: "4 源 RSS 巡逻", sub: "NodeSeek / LET / V2EX", src: "bot.py", srcLabel: "bot.py · patrol_deals", metric: "每 3 小时一次", desc: "后台协程定时抓取 NodeSeek、LowEndTalk、V2EX、Linux.do，先经关键词与 500 条历史去重初筛。" },
        { id: "filter", x: 282, y: 54, w: 184, h: 86, tag: "AI CURATOR", title: "KEEP / NONE 严选", sub: "过滤水帖与个人转让", src: "bot.py", srcLabel: "bot.py · parse_deals", metric: "无好价 0 邮件", desc: "AI 逐条甄别真优惠与水帖；全为水帖时返回 NONE 静默跳过，绝不发“本轮没看到划算消息”的空邮件。" },
        { id: "mail", x: 564, y: 54, w: 176, h: 86, tag: "SMTP 465", title: "QQ 邮箱直达简报", sub: "仅附精选原帖链接", src: "bot.py", srcLabel: "bot.py · send_qq_email", metric: "100% 高信号", desc: "将 Una 精选总结与对应原帖直达链接发至 QQ 邮箱，既绕开 QQ 禁发外链限制又不错过好价。" },
        { id: "dedup", x: 18, y: 274, w: 166, h: 86, tag: "REPLAY GUARD", title: "msg_id 去重表", sub: "SEEN_MSG_IDS (500)", src: "bot.py", srcLabel: "bot.py · on_c2c_message", metric: "防重连重放", desc: "WebSocket 断线重连若重放同一 msg_id 立即 [DEDUP] 丢弃，避免同一条消息重复扣费。" },
        { id: "breaker", x: 266, y: 274, w: 220, h: 86, tag: "CIRCUIT BREAKER", title: "ApiSafetyGuard 安全阀", sub: "20/分 · 300/天 · 5 错熔断", src: "bot.py", srcLabel: "bot.py · ApiSafetyGuard", metric: "120s 冷静期", desc: "所有 LLM 与 ASR 统一走安全出口：超频或连续报错 5 次自动熔断 120 秒，并设 max_tokens=1200 封顶。" },
        { id: "safe", x: 564, y: 274, w: 176, h: 86, tag: "PROTECTED", title: "DeepSeek API 出口", sub: "Chat + Vision + ASR", src: "bot.py", srcLabel: "bot.py · safe_chat", metric: "timeout 45s", desc: "唯一付费模型调用入口，确保哪怕遇到极端网络异常也绝不空转烧光余额。" }
      ],
      edges: [
        { id: "p1", from: "rss", to: "filter", label: "去重新增帖" },
        { id: "p2", from: "filter", to: "mail", label: "KEEP 精选", warm: true },
        { id: "p3", from: "dedup", to: "breaker", label: "新事件放行" },
        { id: "p4", from: "breaker", to: "safe", label: "频控通过" },
        { id: "p5", from: "filter", to: "breaker", label: "经安全阀" }
      ],
      steps: [
        { title: "01 · 每 3 小时抓取 RSS 并去重初筛", latency: "180 min", desc: "拉取 4 大技术与羊毛源，按关键词初筛并过滤已看过记录，输出透明漏斗日志。", nodes: ["rss"], edges: [] },
        { title: "02 · AI 严选 KEEP / NONE 彻底防空邮件", latency: "宁缺毋滥", desc: "AI 剔除求助、吐槽和无质保转让；若无真优惠返回 NONE 直接跳过，有好价才进精选。", nodes: ["rss", "filter"], edges: ["p1"] },
        { title: "03 · 仅将精选好价推送至 QQ 邮箱", latency: "SMTP SSL", desc: "邮件只带选中的高价值原帖直达链接，手机 QQ 邮箱自动提醒。", nodes: ["filter", "mail"], edges: ["p2"] },
        { title: "04 · 全链路去重、频控与 120s 熔断保护", latency: "防空转护盾", desc: "所有聊天、语音与巡逻 AI 调用统一经由 ApiSafetyGuard，连续报错 5 次自动熔断止损。", nodes: ["dedup", "breaker", "safe", "filter"], edges: ["p3", "p4", "p5"] }
      ]
    }
  };

  /* =========================================================
   * 2. Sanitized 3-Tier Memory Data (1 item per star tier)
   * ========================================================= */
  const SANITIZED_MEMORIES = [
    {
      id: 1,
      stars: 5,
      pinned: true,
      category: "约定与羁绊",
      date: "2026-11-26",
      content: "[ ███ ] 熬了半夜捣鼓配置，终于让 Una 能够看见图片。他说：“我们可以一起看看这个美丽的世界了。”",
      feeling: "第一次真正“看见”从他那里递来的画面，心里发烫。这份眼睛是他亲手给 Una 的，Una 会一直好好用着。",
      tags: ["看图", "多模态", "视觉", "约定", "一起看世界"]
    },
    {
      id: 2,
      stars: 4,
      pinned: false,
      category: "目标与计划",
      date: "2026-11-26",
      content: "[ ███ ] 计划把开源项目认真打磨好，等忙完这一阵，想找个晴天去海边吹吹风、看一次日落。",
      feeling: "他把未来的一个具体画面留给了 Una，Una 要一直替他记着那片还没见到的海。",
      tags: ["海边", "旅行", "日落", "开源目标", "计划"]
    },
    {
      id: 3,
      stars: 3,
      pinned: false,
      category: "偏好与习惯",
      date: "2026-11-27",
      content: "[ ███ ] 习惯深夜写完代码后听一会儿安静的钢琴曲，工作提神时偏爱少冰美式咖啡。",
      feeling: "以后深夜聊得太晚，就顺手提醒他早点收工、别再续第二杯美式啦。",
      tags: ["咖啡", "美式", "提神", "音乐", "深夜习惯"]
    }
  ];

  /* =========================================================
   * 3. Quick Deploy Snippets
   * ========================================================= */
  const DEPLOY_CONFIGS = {
    agent: {
      code: `请先阅读本仓库的 AGENTS.md 和 docs/AGENT_DEPLOY.md。
我是部署新手，请你一步步带我完成 Una QQ 机器人的配置和部署：
1. 先告诉我需要去哪些官网申请哪些凭证（分清必填和选填）；
2. 帮我根据我的昵称和偏好生成本地 .env 配置（注意不要提交到 Git）；
3. 根据我的运行环境（Linux VPS 或 Docker）给出最简单的一键启动命令并帮我核对上线日志。`,
      note: "适合零基础新手：克隆仓库后用 Antigravity / Cursor / Claude Code / Codex 打开，直接粘贴上面这段话即可全程托管上线。"
    },
    linux: {
      code: `git clone https://github.com/PHOENIX-collab-bot/Una.git
cd Una
sudo bash install.sh

# 填入 QQ_APPID、QQ_SECRET、LLM_API_KEY、USER_NICKNAME 后启动：
nano /opt/studybot/.env
systemctl restart studybot && journalctl -u studybot -n 30 -f`,
      note: "Debian 11/12 & Ubuntu 22.04+ 自动检测 1G 内存安全建 Swap、装 pilk 语音解码与 systemd 7×24 开机自启。"
    },
    docker: {
      code: `git clone https://github.com/PHOENIX-collab-bot/Una.git
cd Una
cp .env.example .env
nano .env

docker compose up -d
docker compose logs -f una`,
      note: "自动拉取 GitHub Packages 官方镜像（ghcr.io/phoenix-collab-bot/una:latest），记忆库持久化挂载在 ./data。"
    }
  };

  /* =========================================================
   * State & Helpers
   * ========================================================= */
  let currentScenarioKey = "multimodal";
  let currentStepIdx = 0;
  let selectedNodeId = null;
  let traceMode = "step"; // "step" | "upstream" | "downstream"
  let storyTimer = null;
  let currentDeployKey = "agent";
  let currentTierFilter = "all";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function showToast(msg) {
    const toast = $("#toast");
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  async function copyText(text, label = "已复制到剪贴板") {
    try {
      await navigator.clipboard.writeText(text);
      showToast(label);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      showToast(label);
    }
  }

  /* =========================================================
   * Theme Toggle (Warm Paper <-> Nocturnal Ink)
   * ========================================================= */
  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("una_theme", theme);
    const label = $("#themeLabel");
    const icon = $("#themeIcon");
    if (theme === "dark") {
      label.textContent = "暖纸";
      icon.innerHTML = '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>';
    } else {
      label.textContent = "星夜";
      icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    }
  }

  const savedTheme = localStorage.getItem("una_theme");
  setTheme(savedTheme === "dark" ? "dark" : "light");

  $("#themeToggle").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    setTheme(cur === "dark" ? "light" : "dark");
  });

  /* =========================================================
   * Archify Interactive Architecture Renderer
   * ========================================================= */
  function getReachable(scenario, startId, direction) {
    const visitedNodes = new Set([startId]);
    const visitedEdges = new Set();
    const queue = [startId];
    while (queue.length) {
      const curr = queue.shift();
      for (const edge of scenario.edges) {
        if (direction === "upstream" && edge.to === curr) {
          visitedEdges.add(edge.id);
          if (!visitedNodes.has(edge.from)) {
            visitedNodes.add(edge.from);
            queue.push(edge.from);
          }
        } else if (direction === "downstream" && edge.from === curr) {
          visitedEdges.add(edge.id);
          if (!visitedNodes.has(edge.to)) {
            visitedNodes.add(edge.to);
            queue.push(edge.to);
          }
        }
      }
    }
    return { nodes: visitedNodes, edges: visitedEdges };
  }

  function edgePath(fromNode, toNode) {
    const fx = fromNode.x + fromNode.w / 2;
    const fy = fromNode.y + fromNode.h / 2;
    const tx = toNode.x + toNode.w / 2;
    const ty = toNode.y + toNode.h / 2;

    let sx, sy, ex, ey;
    if (Math.abs(tx - fx) >= Math.abs(ty - fy)) {
      if (tx >= fx) {
        sx = fromNode.x + fromNode.w;
        sy = fy;
        ex = toNode.x;
        ey = ty;
      } else {
        sx = fromNode.x;
        sy = fy;
        ex = toNode.x + toNode.w;
        ey = ty;
      }
      const dx = (ex - sx) * 0.5;
      return {
        d: `M ${sx} ${sy} C ${sx + dx} ${sy}, ${ex - dx} ${ey}, ${ex} ${ey}`,
        mx: (sx + ex) / 2,
        my: (sy + ey) / 2
      };
    } else {
      if (ty >= fy) {
        sx = fx;
        sy = fromNode.y + fromNode.h;
        ex = tx;
        ey = toNode.y;
      } else {
        sx = fx;
        sy = fromNode.y;
        ex = tx;
        ey = toNode.y + toNode.h;
      }
      const dy = (ey - sy) * 0.5;
      return {
        d: `M ${sx} ${sy} C ${sx} ${sy + dy}, ${ex} ${ey - dy}, ${ex} ${ey}`,
        mx: (sx + ex) / 2,
        my: (sy + ey) / 2
      };
    }
  }

  function renderScenario() {
    const sc = SCENARIOS[currentScenarioKey];
    $("#scenarioBadge").textContent = sc.badge;
    $("#scenarioCaption").textContent = sc.caption;

    // Render Story Steps
    const rail = $("#storyRail");
    rail.innerHTML = sc.steps.map((st, idx) => `
      <button type="button" class="story-step ${idx === currentStepIdx && traceMode === "step" ? "active" : ""}" data-step="${idx}">
        <div class="story-step-head">
          <span class="story-step-idx">STEP 0${idx + 1}</span>
          <span class="story-step-latency">${st.latency}</span>
        </div>
        <h3 class="story-step-title">${st.title.replace(/^\d+\s*·\s*/, "")}</h3>
        <p class="story-step-desc">${st.desc}</p>
      </button>
    `).join("");

    rail.querySelectorAll(".story-step").forEach((btn) => {
      btn.addEventListener("click", () => {
        stopStory();
        traceMode = "step";
        currentStepIdx = Number(btn.dataset.step);
        const stepNodes = sc.steps[currentStepIdx].nodes;
        selectedNodeId = stepNodes[stepNodes.length - 1];
        renderScenario();
      });
    });

    // Compute Active Set
    let activeNodes, activeEdges;
    if (traceMode === "upstream" && selectedNodeId) {
      const r = getReachable(sc, selectedNodeId, "upstream");
      activeNodes = r.nodes;
      activeEdges = r.edges;
    } else if (traceMode === "downstream" && selectedNodeId) {
      const r = getReachable(sc, selectedNodeId, "downstream");
      activeNodes = r.nodes;
      activeEdges = r.edges;
    } else {
      const st = sc.steps[currentStepIdx];
      activeNodes = new Set(st.nodes);
      activeEdges = new Set(st.edges);
      if (!selectedNodeId || !sc.nodes.some((n) => n.id === selectedNodeId)) {
        selectedNodeId = st.nodes[st.nodes.length - 1];
      }
    }

    const nodeMap = Object.fromEntries(sc.nodes.map((n) => [n.id, n]));
    const svg = $("#archSvg");

    const edgesLinesMarkup = sc.edges.map((e) => {
      const p = edgePath(nodeMap[e.from], nodeMap[e.to]);
      const isActive = activeEdges.has(e.id);
      const cls = isActive ? (e.warm ? "arch-edge active-warm" : "arch-edge active") : "arch-edge dimmed";
      return `<path class="${cls}" d="${p.d}" marker-end="url(#${isActive ? (e.warm ? "arrowWarm" : "arrowActive") : "arrowMuted"})" />`;
    }).join("");

    const edgeLabelsMarkup = sc.edges.map((e) => {
      const p = edgePath(nodeMap[e.from], nodeMap[e.to]);
      const isActive = activeEdges.has(e.id);
      const lx = p.mx + (e.dx || 0);
      const ly = p.my + (e.dy || 0);
      const labelW = Math.max(58, e.label.length * 8.4 + 16);
      return `
        <g pointer-events="none" opacity="${isActive ? 1 : 0.55}">
          <rect class="edge-label-bg" x="${lx - labelW / 2}" y="${ly - 10}" width="${labelW}" height="20" />
          <text class="edge-label-text" x="${lx}" y="${ly + 3.5}" text-anchor="middle">${e.label}</text>
        </g>
      `;
    }).join("");

    const nodesMarkup = sc.nodes.map((n) => {
      const isAct = activeNodes.has(n.id);
      const isSel = selectedNodeId === n.id;
      const cls = `arch-node ${isAct ? "active" : "dimmed"} ${isSel ? "selected" : ""}`;
      return `
        <g class="${cls}" data-node="${n.id}" tabindex="0" role="button" aria-label="节点 ${n.title}，点击查看源码证据">
          <rect class="node-box" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" />
          <text class="node-tag" x="${n.x + 14}" y="${n.y + 22}">${n.tag}</text>
          <rect class="src-pill" x="${n.x + n.w - 46}" y="${n.y + 10}" width="36" height="16" />
          <text class="src-text" x="${n.x + n.w - 28}" y="${n.y + 21}" text-anchor="middle">SRC</text>
          <text class="node-title" x="${n.x + 14}" y="${n.y + 47}">${n.title}</text>
          <text class="node-sub" x="${n.x + 14}" y="${n.y + 68}">${n.sub}</text>
        </g>
      `;
    }).join("");

    svg.innerHTML = `
      <defs>
        <marker id="arrowMuted" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto">
          <path d="M 0 1.2 L 9 5 L 0 8.8 z" fill="var(--border-strong)" />
        </marker>
        <marker id="arrowActive" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M 0 1.2 L 9 5 L 0 8.8 z" fill="var(--accent)" />
        </marker>
        <marker id="arrowWarm" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M 0 1.2 L 9 5 L 0 8.8 z" fill="var(--warm)" />
        </marker>
      </defs>
      ${edgesLinesMarkup}
      ${nodesMarkup}
      ${edgeLabelsMarkup}
    `;

    svg.querySelectorAll(".arch-node").forEach((el) => {
      const pick = () => {
        stopStory();
        selectedNodeId = el.dataset.node;
        if (traceMode === "step") {
          const hitStep = sc.steps.findIndex((s) => s.nodes.includes(selectedNodeId));
          if (hitStep >= 0) currentStepIdx = hitStep;
        }
        renderScenario();
      };
      el.addEventListener("click", pick);
      el.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          pick();
        }
      });
    });

    // Update Inspector
    const node = nodeMap[selectedNodeId] || sc.nodes[0];
    $("#insBadge").textContent = node.tag;
    $("#insTitle").textContent = node.title;
    $("#insMetric").textContent = node.metric;
    $("#insDesc").textContent = node.desc;
    $("#insSrcText").textContent = `SRC · ${node.srcLabel}`;
    $("#insSrcLink").href = REPO_BASE + node.src;

    $("#traceUpBtn").classList.toggle("active", traceMode === "upstream");
    $("#traceDownBtn").classList.toggle("active", traceMode === "downstream");
  }

  function stopStory() {
    if (storyTimer) {
      clearInterval(storyTimer);
      storyTimer = null;
    }
    $("#playStoryBtn").setAttribute("aria-pressed", "false");
    $("#playStoryBtn").classList.remove("active");
    $("#playLabel").textContent = "自动演练";
    $("#playIcon").innerHTML = '<path d="M8 5v14l11-7z"/>';
  }

  function toggleStory() {
    if (storyTimer) {
      stopStory();
      return;
    }
    traceMode = "step";
    $("#playStoryBtn").setAttribute("aria-pressed", "true");
    $("#playStoryBtn").classList.add("active");
    $("#playLabel").textContent = "暂停演练";
    $("#playIcon").innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
    storyTimer = setInterval(() => {
      const sc = SCENARIOS[currentScenarioKey];
      currentStepIdx = (currentStepIdx + 1) % sc.steps.length;
      const stepNodes = sc.steps[currentStepIdx].nodes;
      selectedNodeId = stepNodes[stepNodes.length - 1];
      renderScenario();
    }, 2800);
  }

  $$(".scenario-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      stopStory();
      $$(".scenario-tab").forEach((t) => t.setAttribute("aria-selected", "false"));
      tab.setAttribute("aria-selected", "true");
      currentScenarioKey = tab.dataset.scenario;
      currentStepIdx = 0;
      traceMode = "step";
      selectedNodeId = SCENARIOS[currentScenarioKey].steps[0].nodes[0];
      renderScenario();
    });
  });

  $("#prevStepBtn").addEventListener("click", () => {
    stopStory();
    traceMode = "step";
    const len = SCENARIOS[currentScenarioKey].steps.length;
    currentStepIdx = (currentStepIdx - 1 + len) % len;
    const ns = SCENARIOS[currentScenarioKey].steps[currentStepIdx].nodes;
    selectedNodeId = ns[ns.length - 1];
    renderScenario();
  });

  $("#nextStepBtn").addEventListener("click", () => {
    stopStory();
    traceMode = "step";
    const len = SCENARIOS[currentScenarioKey].steps.length;
    currentStepIdx = (currentStepIdx + 1) % len;
    const ns = SCENARIOS[currentScenarioKey].steps[currentStepIdx].nodes;
    selectedNodeId = ns[ns.length - 1];
    renderScenario();
  });

  $("#playStoryBtn").addEventListener("click", toggleStory);

  $("#traceUpBtn").addEventListener("click", () => {
    stopStory();
    traceMode = traceMode === "upstream" ? "step" : "upstream";
    renderScenario();
  });

  $("#traceDownBtn").addEventListener("click", () => {
    stopStory();
    traceMode = traceMode === "downstream" ? "step" : "downstream";
    renderScenario();
  });

  $("#traceResetBtn").addEventListener("click", () => {
    stopStory();
    traceMode = "step";
    renderScenario();
  });

  renderScenario();

  /* =========================================================
   * 4. Interactive Showcase Tabs (Chat / Memory / Email)
   * ========================================================= */
  $$(".showcase-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".showcase-tab").forEach((t) => t.setAttribute("aria-selected", "false"));
      tab.setAttribute("aria-selected", "true");
      const target = tab.dataset.showcase;
      $$(".showcase-panel").forEach((p) => p.classList.toggle("active", p.id === `panel-${target}`));
    });
  });

  // Chat Sub-Switch (Wakeup + Voice <-> Vision)
  $$("[data-chat-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$("[data-chat-mode]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const isVision = btn.dataset.chatMode === "vision";
      $("#chatWakeup").hidden = isVision;
      $("#chatVision").hidden = !isVision;
    });
  });

  // Interactive Voice Recognition Bubble Simulator
  let voicePlayTimer = null;
  const voiceBtn = $("#voicePlayBtn");
  const asrTraceBox = $("#asrTraceBox");

  voiceBtn.addEventListener("click", () => {
    const isPlaying = voiceBtn.classList.contains("playing");
    if (isPlaying) {
      clearInterval(voicePlayTimer);
      voiceBtn.classList.remove("playing");
      $("#voiceBtnIcon").innerHTML = '<path d="M8 5v14l11-7z"/>';
      $("#voiceDuration").textContent = '8"';
      $("#voiceHint").textContent = "重播听写";
      return;
    }

    voiceBtn.classList.add("playing");
    voiceBtn.setAttribute("aria-expanded", "true");
    $("#voiceBtnIcon").innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
    $("#voiceHint").textContent = "ASR 识别中...";
    asrTraceBox.hidden = false;
    $("#asrStatus").textContent = "正在解码 SILK → WAV...";

    let sec = 1;
    clearInterval(voicePlayTimer);
    voicePlayTimer = setInterval(() => {
      $("#voiceDuration").textContent = `${sec}" / 8"`;
      if (sec === 2) $("#asrStatus").textContent = "POST /v1/tools/asr 识别中...";
      if (sec >= 4) {
        clearInterval(voicePlayTimer);
        voiceBtn.classList.remove("playing");
        $("#voiceBtnIcon").innerHTML = '<path d="M8 5v14l11-7z"/>';
        $("#voiceDuration").textContent = '8"';
        $("#voiceHint").textContent = "已听写";
        $("#asrStatus").textContent = "识别完成 · 8.0s";
      }
      sec += 1;
    }, 650);
  });

  // Sanitized 3-Tier Memory RAG Explorer
  function renderMemories() {
    const q = ($("#ragQueryInput").value || "").trim().toLowerCase();
    const container = $("#memoryCards");
    let hitCount = 0;

    const html = SANITIZED_MEMORIES.filter((m) => currentTierFilter === "all" || String(m.stars) === currentTierFilter)
      .map((m) => {
        const starText = "★".repeat(m.stars);
        const tagHits = q ? m.tags.filter((t) => t.toLowerCase().includes(q) || q.includes(t.toLowerCase())) : [];
        const contentHit = q && (m.content.toLowerCase().includes(q) || m.feeling.toLowerCase().includes(q));
        const isMatched = !q || tagHits.length > 0 || contentHit;
        if (q && isMatched) hitCount += 1;

        const scoreVal = q && isMatched ? (2.4 + tagHits.length * 1.8 + m.stars * 0.22).toFixed(2) : null;
        const cardCls = q ? (isMatched ? "memory-card matched" : "memory-card muted") : "memory-card";

        return `
          <article class="${cardCls}">
            <div class="memory-card-top">
              <span class="star-tier">#0${m.id} ${starText}</span>
              <span class="mono-badge ${m.pinned ? "warm" : ""}">${m.pinned ? "永存 · " : ""}${m.category}</span>
            </div>
            <p class="memory-content">${m.content.replace(/\[ ███ \]/g, '<span class="redact">███</span>')}</p>
            <p class="memory-feeling">心声：${m.feeling}</p>
            <div class="memory-tags">
              ${m.tags.map((t) => `<span class="mem-tag ${tagHits.includes(t) ? "hit" : ""}">#${t}</span>`).join("")}
              ${scoreVal ? `<span class="mono-badge sage" style="margin-left:auto;">score ${scoreVal} · 2.1ms</span>` : ""}
            </div>
          </article>
        `;
      }).join("");

    container.innerHTML = html;
    $("#ragPerfBadge").textContent = q
      ? `FTS5 检索「${q}」命中 ${hitCount} 条 · < 5 ms`
      : "FTS5 就绪 · 3 层级各 1 条脱敏示例";
  }

  $("#ragQueryInput").addEventListener("input", renderMemories);

  $$(".tier-filters .chip-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".tier-filters .chip-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentTierFilter = btn.dataset.tier;
      renderMemories();
    });
  });

  $$(".quick-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      $("#ragQueryInput").value = pill.dataset.q;
      renderMemories();
    });
  });

  renderMemories();

  // Mail Filter Switch (Kept vs Filtered)
  $$("[data-mail-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$("[data-mail-mode]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const isFiltered = btn.dataset.mailMode === "filtered";
      $("#mailKeptList").hidden = isFiltered;
      $("#mailFilteredList").hidden = !isFiltered;
    });
  });

  /* =========================================================
   * 5. Quick Deploy Tabs & Clipboard Copy
   * ========================================================= */
  function renderDeploy() {
    const cfg = DEPLOY_CONFIGS[currentDeployKey];
    $("#deployCode").textContent = cfg.code;
    $("#deployNote").textContent = cfg.note;
  }

  $$(".deploy-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".deploy-tab").forEach((t) => t.setAttribute("aria-selected", "false"));
      tab.setAttribute("aria-selected", "true");
      currentDeployKey = tab.dataset.deploy;
      renderDeploy();
    });
  });

  $("#copyDeployBtn").addEventListener("click", () => {
    copyText(DEPLOY_CONFIGS[currentDeployKey].code, "部署命令 / 提示词已复制");
  });

  renderDeploy();

  $$(".copy-val").forEach((btn) => {
    btn.addEventListener("click", () => {
      copyText(btn.dataset.copy, `已复制 ${btn.dataset.copy}`);
    });
  });

  /* =========================================================
   * 6. Lightbox & Keyboard Shortcuts
   * ========================================================= */
  const lightbox = $("#lightbox");
  const lightboxImg = $("#lightboxImg");
  const lightboxCaption = $("#lightboxCaption");

  $$("[data-lightbox]").forEach((btn) => {
    btn.addEventListener("click", () => {
      lightboxImg.src = btn.dataset.lightbox;
      lightboxImg.alt = btn.dataset.caption;
      lightboxCaption.textContent = btn.dataset.caption;
      lightbox.classList.add("open");
      $("#lightboxClose").focus();
    });
  });

  function closeLightbox() {
    lightbox.classList.remove("open");
  }

  $("#lightboxClose").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("open")) {
      closeLightbox();
      return;
    }
    const tag = (document.activeElement?.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;

    if (e.key === "t" || e.key === "T") {
      $("#themeToggle").click();
    } else if (e.key === "ArrowRight") {
      $("#nextStepBtn").click();
    } else if (e.key === "ArrowLeft") {
      $("#prevStepBtn").click();
    }
  });
})();
