import contextlib
import datetime
import difflib
import json
import re
import sqlite3
import time
from pathlib import Path

VALID_MEMORY_CATEGORIES = {
    "约定与羁绊",
    "情绪与心事",
    "目标与计划",
    "偏好与习惯",
    "重要经历",
    "特意叮嘱",
    "其他",
}

# 中文口语高频虚词：仅用于查询时降噪，避免“今天/觉得/什么”触发无关回忆
QUERY_STOPWORDS = {
    "今天", "明天", "昨天", "刚才", "现在", "以后", "以前", "时候", "时间",
    "一个", "一下", "一点", "一些", "这个", "那个", "这些", "那些", "这里", "那里",
    "什么", "怎么", "怎样", "为什么", "为啥", "哪里", "哪个", "多少", "有没有",
    "觉得", "感觉", "以为", "知道", "明白", "理解", "好像", "似乎", "应该", "可能",
    "其实", "但是", "不过", "因为", "所以", "如果", "虽然", "然后", "而且", "或者",
    "就是", "不是", "没有", "可以", "能够", "已经", "正在", "一直", "还是", "也是",
    "真的", "确实", "非常", "特别", "比较", "有点", "有些", "太棒", "还好", "没事",
    "东西", "事情", "问题", "意思", "地方", "样子", "办法", "情况",
    "你好", "您好", "早安", "晚安", "中午", "晚上", "早上", "哈哈", "哈哈哈",
    "好的", "好吧", "嗯嗯", "谢谢", "感谢", "抱歉", "对不起", "辛苦", "加油",
    "我们", "你们", "他们", "自己", "对方", "大家", "别人", "帮我", "帮忙",
    "看看", "聊聊", "说说", "问问", "记得", "记住", "忘记", "忘了",
}

_CJK_RUN_RE = re.compile(r"[\u4e00-\u9fff]+")
_ASCII_WORD_RE = re.compile(r"[a-z0-9]{2,}")
_CJK_PARTICLE_SPLIT_RE = re.compile(r"[的了吗呢吧啊呀哦嘛哇]+")


def now_cst_date() -> str:
    t = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=8)
    return t.strftime("%Y-%m-%d")


def normalize_mem_text(s: str) -> str:
    return re.sub(r"[\s，。！？、,.!?;；:：\"'“”‘’（）()【】\[\]#-]+", "", s.lower())


def tokenize_for_index(text: str) -> str:
    """轻量中文 2-gram/3-gram + 英文词切分，让 SQLite FTS5 原生支持中文检索"""
    if not text:
        return ""
    low = text.lower()
    tokens: list[str] = []

    for w in _ASCII_WORD_RE.findall(low):
        tokens.append(w)

    for run in _CJK_RUN_RE.findall(low):
        for seg in _CJK_PARTICLE_SPLIT_RE.split(run):
            n = len(seg)
            if n == 0:
                continue
            if n == 1:
                tokens.append(seg)
                continue
            for i in range(n - 1):
                tokens.append(seg[i : i + 2])
            if 3 <= n <= 4:
                tokens.append(seg)
            elif n > 4:
                for i in range(n - 2):
                    tokens.append(seg[i : i + 3])

    return " ".join(tokens)


def extract_query_tokens(text: str, extra_stopwords: set[str] | None = None) -> list[str]:
    """从用户输入提取去噪后的核心检索词（过滤虚词与双方称呼，防止普通闲聊误召回）"""
    if not text:
        return []
    stop = QUERY_STOPWORDS | (extra_stopwords or set())
    low = text.lower()
    raw_tokens: list[str] = []

    for w in _ASCII_WORD_RE.findall(low):
        if w not in stop:
            raw_tokens.append(w)

    for run in _CJK_RUN_RE.findall(low):
        for seg in _CJK_PARTICLE_SPLIT_RE.split(run):
            n = len(seg)
            if n < 2:
                continue
            if n <= 4 and seg not in stop:
                raw_tokens.append(seg)
            for i in range(n - 1):
                bg = seg[i : i + 2]
                if bg not in stop:
                    raw_tokens.append(bg)

    seen: set[str] = set()
    unique: list[str] = []
    for tok in raw_tokens:
        if tok not in seen:
            seen.add(tok)
            unique.append(tok)
    return unique[:16]


def clean_tags(tags) -> list[str]:
    if isinstance(tags, str):
        parts = re.split(r"[,，、;；\s]+", tags)
    elif isinstance(tags, list):
        parts = [str(x) for x in tags]
    else:
        return []
    out: list[str] = []
    seen: set[str] = set()
    for p in parts:
        t = p.strip().lstrip("#")[:20]
        if t and t.lower() not in seen:
            seen.add(t.lower())
            out.append(t)
    return out[:8]


class MemoryRAGStore:
    """基于 Python 内置 SQLite + FTS5 的轻量级个人长期记忆 RAG 存储与检索引擎"""

    def __init__(self, db_path: Path, bot_name: str = "Una", user_nickname: str = "418"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.bot_name = bot_name
        self.user_nickname = user_nickname
        self.extra_stopwords = {
            bot_name.lower(),
            user_nickname.lower(),
            "una",
        }
        self.fts_enabled = False
        self._init_db()

    @contextlib.contextmanager
    def _connect(self):
        conn = sqlite3.connect(self.db_path, timeout=15)
        conn.row_factory = sqlite3.Row
        try:
            with conn:
                yield conn
        finally:
            conn.close()

    def _init_db(self):
        with self._connect() as conn:
            conn.execute("PRAGMA journal_mode=WAL;")
            conn.execute("PRAGMA synchronous=NORMAL;")
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS memories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    content TEXT NOT NULL,
                    importance INTEGER NOT NULL DEFAULT 3,
                    category TEXT NOT NULL DEFAULT '其他',
                    feeling TEXT NOT NULL DEFAULT '',
                    tags TEXT NOT NULL DEFAULT '[]',
                    source TEXT NOT NULL DEFAULT 'autonomous',
                    pinned INTEGER NOT NULL DEFAULT 0,
                    created_date TEXT NOT NULL DEFAULT '',
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    last_recalled_at INTEGER NOT NULL DEFAULT 0,
                    recall_count INTEGER NOT NULL DEFAULT 0,
                    embedding BLOB DEFAULT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_memories_user_rank
                ON memories(user_id, pinned DESC, importance DESC, updated_at DESC)
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS meta (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
                """
            )
            try:
                conn.execute(
                    """
                    CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
                        memory_id UNINDEXED,
                        user_id UNINDEXED,
                        content_tok,
                        tags_tok,
                        feeling_tok,
                        category_tok,
                        tokenize='unicode61'
                    )
                    """
                )
                self.fts_enabled = True
            except sqlite3.OperationalError as e:
                print(f"[MEMORY RAG WARN] SQLite FTS5 不可用，已切换纯 Python 检索兜底：{e}")
                self.fts_enabled = False

    def _row_to_dict(self, row: sqlite3.Row) -> dict:
        try:
            tags = json.loads(row["tags"] or "[]")
            if not isinstance(tags, list):
                tags = []
        except Exception:
            tags = []
        return {
            "id": int(row["id"]),
            "user_id": row["user_id"],
            "content": row["content"],
            "importance": int(row["importance"]),
            "category": row["category"],
            "feeling": row["feeling"] or "",
            "tags": tags,
            "source": row["source"] or "autonomous",
            "pinned": bool(row["pinned"]),
            "date": row["created_date"] or "",
            "created_at": int(row["created_at"]),
            "updated_at": int(row["updated_at"]),
            "last_recalled_at": int(row["last_recalled_at"]),
            "recall_count": int(row["recall_count"]),
        }

    def _sync_fts(
        self,
        conn: sqlite3.Connection,
        mem_id: int,
        user_id: str,
        content: str,
        tags: list[str],
        feeling: str,
        category: str,
    ):
        if not self.fts_enabled:
            return
        conn.execute("DELETE FROM memories_fts WHERE memory_id = ?", (mem_id,))
        conn.execute(
            """
            INSERT INTO memories_fts(memory_id, user_id, content_tok, tags_tok, feeling_tok, category_tok)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                mem_id,
                user_id,
                tokenize_for_index(content),
                tokenize_for_index(" ".join(tags)),
                tokenize_for_index(feeling),
                tokenize_for_index(category),
            ),
        )

    def migrate_from_legacy_json(self, memory_store: dict) -> int:
        """首次启动时无损迁移旧 memory.json 中的 core_memories 与 notes 到 SQLite"""
        with self._connect() as conn:
            done = conn.execute("SELECT value FROM meta WHERE key = 'migrated_legacy_v1'").fetchone()
            if done:
                return 0

        imported = 0
        legacy_core = memory_store.get("core_memories", {}) or {}
        for uid, items in legacy_core.items():
            if not isinstance(items, list):
                continue
            for item in items:
                if not isinstance(item, dict) or not item.get("content"):
                    continue
                res = self.save_memory(
                    user_id=uid,
                    content=item.get("content", ""),
                    importance=int(item.get("importance", 3)),
                    category=item.get("category", "其他"),
                    feeling=item.get("feeling", ""),
                    tags=item.get("tags") or [],
                    source="migrated",
                    pinned=False,
                    created_date=item.get("date") or now_cst_date(),
                    custom_ts=int(item.get("ts") or time.time()),
                )
                if res["status"] in ("saved", "updated"):
                    imported += 1

        legacy_notes = memory_store.get("notes", {}) or {}
        for uid, notes in legacy_notes.items():
            if not isinstance(notes, list):
                continue
            for note in notes:
                note_str = str(note or "").strip()
                if not note_str:
                    continue
                res = self.save_memory(
                    user_id=uid,
                    content=note_str,
                    importance=5,
                    category="特意叮嘱",
                    feeling=f"{self.user_nickname}特意叮嘱{self.bot_name}牢记的事。",
                    tags=extract_query_tokens(note_str, self.extra_stopwords)[:5],
                    source="pinned_note",
                    pinned=True,
                )
                if res["status"] in ("saved", "updated"):
                    imported += 1

        with self._connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO meta(key, value) VALUES ('migrated_legacy_v1', ?)",
                (str(int(time.time())),),
            )
        if imported > 0:
            print(f"[MEMORY MIGRATE] 已将旧 memory.json 中 {imported} 条记忆无损迁移至 SQLite 记忆库")
        return imported

    def save_memory(
        self,
        user_id: str,
        content: str,
        importance: int = 3,
        category: str = "其他",
        feeling: str = "",
        tags=None,
        source: str = "autonomous",
        pinned: bool = False,
        created_date: str | None = None,
        custom_ts: int | None = None,
    ) -> dict:
        content = " ".join(str(content or "").split()).strip()[:180]
        feeling = " ".join(str(feeling or "").split()).strip()[:140]
        category = str(category or "其他").strip()
        if category not in VALID_MEMORY_CATEGORIES:
            category = "其他"
        tag_list = clean_tags(tags)
        if not tag_list and content:
            tag_list = extract_query_tokens(content, self.extra_stopwords)[:5]

        try:
            imp = int(importance)
        except Exception:
            imp = 3
        imp = max(1, min(5, imp))

        if not content:
            return {"status": "empty", "id": None, "importance": imp}

        if imp < 3 and not pinned:
            return {"status": "skipped", "id": None, "importance": imp, "content": content}

        now_ts = int(custom_ts or time.time())
        date_str = created_date or now_cst_date()
        norm_new = normalize_mem_text(content)

        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id, content, importance, feeling, tags, pinned FROM memories WHERE user_id = ? ORDER BY updated_at DESC LIMIT 300",
                (user_id,),
            ).fetchall()

            matched_row = None
            for r in rows:
                norm_old = normalize_mem_text(r["content"])
                if not norm_old:
                    continue
                shorter = min(len(norm_new), len(norm_old))
                is_substr = shorter >= 10 and (norm_new in norm_old or norm_old in norm_new)
                sim = difflib.SequenceMatcher(None, norm_new, norm_old).ratio()
                if is_substr or sim >= 0.82:
                    matched_row = r
                    break

            if matched_row is not None:
                mem_id = int(matched_row["id"])
                merged_imp = max(int(matched_row["importance"]), imp)
                merged_pin = 1 if (matched_row["pinned"] or pinned) else 0
                old_tags = []
                try:
                    old_tags = json.loads(matched_row["tags"] or "[]")
                except Exception:
                    old_tags = []
                merged_tags = clean_tags(old_tags + tag_list)
                merged_feeling = feeling or (matched_row["feeling"] or "")
                conn.execute(
                    """
                    UPDATE memories
                    SET content = ?, importance = ?, category = ?, feeling = ?, tags = ?,
                        pinned = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        content,
                        merged_imp,
                        category,
                        merged_feeling,
                        json.dumps(merged_tags, ensure_ascii=False),
                        merged_pin,
                        now_ts,
                        mem_id,
                    ),
                )
                self._sync_fts(conn, mem_id, user_id, content, merged_tags, merged_feeling, category)
                return {
                    "status": "updated",
                    "id": mem_id,
                    "importance": merged_imp,
                    "category": category,
                    "content": content,
                    "feeling": merged_feeling,
                    "tags": merged_tags,
                    "pinned": bool(merged_pin),
                }

            cur = conn.execute(
                """
                INSERT INTO memories(
                    user_id, content, importance, category, feeling, tags,
                    source, pinned, created_date, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    content,
                    imp,
                    category,
                    feeling,
                    json.dumps(tag_list, ensure_ascii=False),
                    source,
                    1 if pinned else 0,
                    date_str,
                    now_ts,
                    now_ts,
                ),
            )
            mem_id = int(cur.lastrowid)
            self._sync_fts(conn, mem_id, user_id, content, tag_list, feeling, category)
            return {
                "status": "saved",
                "id": mem_id,
                "importance": imp,
                "category": category,
                "content": content,
                "feeling": feeling,
                "tags": tag_list,
                "pinned": bool(pinned),
            }

    def count_memories(self, user_id: str) -> int:
        with self._connect() as conn:
            row = conn.execute("SELECT COUNT(*) AS c FROM memories WHERE user_id = ?", (user_id,)).fetchone()
            return int(row["c"]) if row else 0

    def get_resident_memories(self, user_id: str, limit: int = 12) -> list[dict]:
        """获取常驻脑海的记忆：已加锁（上限 16 条）+ 最高星级最新记忆补足至 limit 条"""
        with self._connect() as conn:
            pinned_rows = conn.execute(
                """
                SELECT * FROM memories
                WHERE user_id = ? AND pinned = 1
                ORDER BY importance DESC, updated_at DESC
                LIMIT 16
                """,
                (user_id,),
            ).fetchall()
            resident = [self._row_to_dict(r) for r in pinned_rows]
            remain = max(0, limit - len(resident))
            if remain > 0:
                other_rows = conn.execute(
                    """
                    SELECT * FROM memories
                    WHERE user_id = ? AND pinned = 0
                    ORDER BY importance DESC, updated_at DESC
                    LIMIT ?
                    """,
                    (user_id, remain),
                ).fetchall()
                resident.extend(self._row_to_dict(r) for r in other_rows)
            return resident

    def get_recent_memories(self, user_id: str, limit: int = 8) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM memories WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?",
                (user_id, limit),
            ).fetchall()
            return [self._row_to_dict(r) for r in rows]

    def _score_candidate(
        self,
        item: dict,
        query_lower: str,
        q_tokens: list[str],
        bm25_rel: float,
        now_ts: int,
    ) -> tuple[float, int, int]:
        hay_content = tokenize_for_index(item["content"])
        hay_tags = tokenize_for_index(" ".join(item["tags"]))
        hay_cat = tokenize_for_index(item["category"])
        hay_feel = tokenize_for_index(item["feeling"])
        combined = f"{hay_content} {hay_tags} {hay_cat} {hay_feel}"

        matched_tokens = sum(1 for t in q_tokens if t in combined)
        tag_exact_hits = sum(
            1
            for tag in item["tags"]
            if len(tag) >= 2 and (tag.lower() in query_lower or any(t == tag.lower() for t in q_tokens))
        )
        age_days = max(0.0, (now_ts - item["updated_at"]) / 86400.0)
        recency_bonus = 0.25 / (1.0 + age_days / 30.0)
        score = (
            bm25_rel * (1.0 + 0.15 * item["importance"])
            + 1.8 * tag_exact_hits
            + 0.35 * min(matched_tokens, 6)
            + recency_bonus
        )
        return score, matched_tokens, tag_exact_hits

    def search_memories(
        self,
        user_id: str,
        query: str,
        limit: int = 6,
        exclude_ids: set[int] | None = None,
        category: str = "",
        strict_gate: bool = True,
        touch_recall: bool = False,
    ) -> list[dict]:
        """轻量混合 RAG 检索（FTS5 BM25 + 标签精确命中 + 星级与时效加权）"""
        exclude_ids = exclude_ids or set()
        query = (query or "").strip()
        query_lower = query.lower()
        category = (category or "").strip()
        if category and category not in VALID_MEMORY_CATEGORIES:
            category = ""

        q_tokens = extract_query_tokens(query, self.extra_stopwords)

        # 如果只指定了分类、没给关键词（例如 Una 主动查“约定与羁绊”），直接按该分类返回
        if not q_tokens:
            if category and not strict_gate:
                with self._connect() as conn:
                    rows = conn.execute(
                        """
                        SELECT * FROM memories
                        WHERE user_id = ? AND category = ?
                        ORDER BY pinned DESC, importance DESC, updated_at DESC
                        LIMIT ?
                        """,
                        (user_id, category, limit),
                    ).fetchall()
                results = [self._row_to_dict(r) for r in rows if int(r["id"]) not in exclude_ids]
                if touch_recall and results:
                    self._touch_recalled([m["id"] for m in results])
                return results
            return []

        now_ts = int(time.time())
        candidates: list[tuple[dict, float]] = []

        with self._connect() as conn:
            if self.fts_enabled:
                safe_terms = [re.sub(r"[^a-z0-9\u4e00-\u9fff]", "", t) for t in q_tokens]
                safe_terms = [t for t in safe_terms if t]
                if safe_terms:
                    match_expr = " OR ".join(f'"{t}"' for t in safe_terms)
                    sql = """
                        SELECT m.*, bm25(memories_fts, 0.0, 0.0, 1.0, 2.2, 0.5, 0.8) AS rank_val
                        FROM memories_fts
                        JOIN memories m ON m.id = memories_fts.memory_id
                        WHERE memories_fts MATCH ? AND m.user_id = ?
                    """
                    params: list = [match_expr, user_id]
                    if category:
                        sql += " AND m.category = ?"
                        params.append(category)
                    sql += " ORDER BY rank_val LIMIT 30"
                    try:
                        rows = conn.execute(sql, params).fetchall()
                        for r in rows:
                            item = self._row_to_dict(r)
                            if item["id"] in exclude_ids:
                                continue
                            # SQLite bm25 值越小（越负）越相关，取反转为正数
                            bm25_rel = max(0.1, -float(r["rank_val"] or 0.0))
                            candidates.append((item, bm25_rel))
                    except sqlite3.OperationalError as e:
                        print(f"[MEMORY RAG WARN] FTS 查询降级：{e}")

            # 纯 Python 兜底（当 FTS 不可用或需要补查子串/标签直命时）
            if not candidates:
                sql = "SELECT * FROM memories WHERE user_id = ?"
                params = [user_id]
                if category:
                    sql += " AND category = ?"
                    params.append(category)
                sql += " ORDER BY updated_at DESC LIMIT 500"
                for r in conn.execute(sql, params).fetchall():
                    item = self._row_to_dict(r)
                    if item["id"] in exclude_ids:
                        continue
                    raw_hay = f"{item['content']} {' '.join(item['tags'])} {item['feeling']} {item['category']}".lower()
                    hits = sum(1 for t in q_tokens if t in raw_hay)
                    if hits > 0:
                        candidates.append((item, float(hits) * 1.1))

        scored: list[dict] = []
        for item, bm25_rel in candidates:
            score, matched_tokens, tag_exact_hits = self._score_candidate(
                item, query_lower, q_tokens, bm25_rel, now_ts
            )
            if strict_gate:
                # 严格防误触门槛：必须命中标签、或命中至少 2 个有效词元、或精准命中内容中的专有词
                raw_core = f"{item['content']} {' '.join(item['tags'])}".lower()
                has_direct_content_hit = (
                    matched_tokens == 1
                    and bm25_rel >= 0.45
                    and any(len(t) >= 2 and t in raw_core for t in q_tokens)
                )
                if not (tag_exact_hits >= 1 or matched_tokens >= 2 or has_direct_content_hit):
                    continue
            item["score"] = round(score, 2)
            scored.append(item)

        scored.sort(key=lambda m: (m["score"], m["importance"], m["updated_at"]), reverse=True)
        top = scored[:limit]
        if touch_recall and top:
            self._touch_recalled([m["id"] for m in top])
        return top

    def _touch_recalled(self, mem_ids: list[int]):
        now_ts = int(time.time())
        with self._connect() as conn:
            conn.executemany(
                "UPDATE memories SET last_recalled_at = ?, recall_count = recall_count + 1 WHERE id = ?",
                [(now_ts, mid) for mid in mem_ids],
            )

    def toggle_pin(self, user_id: str, mem_id: int) -> dict | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM memories WHERE id = ? AND user_id = ?",
                (mem_id, user_id),
            ).fetchone()
            if not row:
                return None
            new_pin = 0 if row["pinned"] else 1
            conn.execute(
                "UPDATE memories SET pinned = ?, updated_at = ? WHERE id = ?",
                (new_pin, int(time.time()), mem_id),
            )
            item = self._row_to_dict(row)
            item["pinned"] = bool(new_pin)
            return item

    def delete_memory(self, user_id: str, mem_id: int) -> dict | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM memories WHERE id = ? AND user_id = ?",
                (mem_id, user_id),
            ).fetchone()
            if not row:
                return None
            item = self._row_to_dict(row)
            conn.execute("DELETE FROM memories WHERE id = ? AND user_id = ?", (mem_id, user_id))
            if self.fts_enabled:
                conn.execute("DELETE FROM memories_fts WHERE memory_id = ?", (mem_id,))
            return item

    def format_items_for_prompt(self, items: list[dict]) -> str:
        lines = []
        for m in items:
            stars = "★" * max(3, min(5, m["importance"]))
            pin_mark = "[永存]" if m["pinned"] else ""
            line = f"- [#{m['id']}][{stars}]{pin_mark}[{m['category']}][{m['date']}] {m['content']}"
            if m["feeling"]:
                line += f"（{self.bot_name}当时的心声：{m['feeling']}）"
            lines.append(line)
        return "\n".join(lines)
