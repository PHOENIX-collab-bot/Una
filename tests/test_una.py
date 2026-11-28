import asyncio
import importlib.util
import os
import pathlib
import sys
import tempfile
import types
import unittest

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from memory_rag import MemoryRAGStore


def _install_bot_stubs():
    """为离线 CI/本地单元测试提供轻量级依赖桩（无需真实网络或外部 SDK）"""
    stubs = {}

    botpy_mod = types.ModuleType("botpy")

    class DummyClient:
        def __init__(self, *args, **kwargs):
            pass

    botpy_mod.Client = DummyClient
    botpy_mod.Intents = lambda **kwargs: kwargs
    stubs["botpy"] = botpy_mod

    msg_mod = types.ModuleType("botpy.message")

    class FakeAuthor:
        __slots__ = ("user_openid",)

        def __init__(self, uid):
            self.user_openid = uid

    class FakeC2CMessage:
        """刻意使用 __slots__ 严格还原真实 qq-botpy 行为，防止属性注入回归"""

        __slots__ = ("_api", "id", "content", "attachments", "author")

        class _Attachments:
            __slots__ = ("content_type", "filename", "url")

            def __init__(self, data):
                self.content_type = data.get("content_type")
                self.filename = data.get("filename")
                self.url = data.get("url")

        def __init__(self, api, event_id, data):
            self._api = api
            self.id = data.get("id", "m1")
            self.content = data.get("content", "")
            self.author = FakeAuthor(data.get("author", {}).get("user_openid", "u_test"))
            self.attachments = [self._Attachments(a) for a in data.get("attachments", [])]

    msg_mod.C2CMessage = FakeC2CMessage
    stubs["botpy.message"] = msg_mod

    httpx_mod = types.ModuleType("httpx")

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

    httpx_mod.AsyncClient = FakeAsyncClient
    stubs["httpx"] = httpx_mod

    dotenv_mod = types.ModuleType("dotenv")
    dotenv_mod.load_dotenv = lambda: None
    stubs["dotenv"] = dotenv_mod

    openai_mod = types.ModuleType("openai")
    openai_mod.AsyncOpenAI = lambda **kwargs: object()
    stubs["openai"] = openai_mod

    return stubs


def _load_bot_namespace(data_dir: pathlib.Path) -> dict:
    saved_env = {}
    env_keys = (
        "LLM_BASE_URL",
        "LLM_MODEL",
        "ASR_API_URL",
        "ASR_API_KEY",
        "BOT_NAME",
        "USER_NICKNAME",
        "CHECK_INTERVAL_MIN",
        "API_MAX_CALLS_PER_MIN",
        "API_MAX_CALLS_PER_DAY",
        "DATA_DIR",
    )
    for k in env_keys:
        saved_env[k] = os.environ.pop(k, None)
    os.environ["DATA_DIR"] = str(data_dir)

    stubs = _install_bot_stubs()
    saved_mods = {k: sys.modules.get(k) for k in stubs}
    sys.modules.update(stubs)

    try:
        src = (REPO_ROOT / "bot.py").read_text(encoding="utf-8")
        ns: dict = {"__name__": "bot_test_module", "__file__": str(REPO_ROOT / "bot.py")}
        exec(compile(src, str(REPO_ROOT / "bot.py"), "exec"), ns)
        ns["_FakeC2CMessage"] = stubs["botpy.message"].C2CMessage
        return ns
    finally:
        for k, prev in saved_mods.items():
            if prev is None:
                sys.modules.pop(k, None)
            else:
                sys.modules[k] = prev
        for k, prev in saved_env.items():
            if prev is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = prev


class TestMemoryRAGStore(unittest.TestCase):
    def test_fts5_rag_migration_recall_and_cleanup(self):
        with tempfile.TemporaryDirectory() as td:
            db_path = pathlib.Path(td) / "memories.db"
            rag = MemoryRAGStore(db_path, bot_name="Una", user_nickname="测试用户")
            self.assertTrue(rag.fts_enabled)

            legacy = {
                "core_memories": {
                    "u1": [
                        {
                            "content": "约定今年一起完成独立开源项目",
                            "importance": 5,
                            "category": "约定与羁绊",
                            "feeling": "Una 很期待那一天的到来",
                            "date": "2026-11-26",
                            "ts": 1700000000,
                        }
                    ]
                },
                "notes": {"u1": ["喜欢喝冰美式"]},
            }
            self.assertEqual(rag.migrate_from_legacy_json(legacy), 2)
            self.assertEqual(rag.migrate_from_legacy_json(legacy), 0)

            r_hok = rag.save_memory(
                "u1",
                "计划年底去北海道看雪",
                importance=3,
                category="目标与计划",
                feeling="想一起看雪",
                tags=["旅行", "日本", "滑雪", "度假"],
                custom_ts=1700000100,
            )
            r_cat = rag.save_memory(
                "u1",
                "家里养了一只橘猫叫年糕",
                importance=3,
                category="偏好与习惯",
                feeling="年糕一定很粘人",
                tags=["宠物", "猫咪", "橘猫"],
                custom_ts=1700000101,
            )

            # 插入 14 条语义互不相同的高星记忆，使北海道与橘猫滑出常驻前 12 名
            high_topics = [
                "今年要完成独立开发产品正式上线",
                "承诺每周至少早睡三次绝不熬夜",
                "最看重真诚和彼此信任的长期关系",
                "去年夏天独自克服了重大项目难关",
                "一直梦想拥有安静舒适的个人工作室",
                "习惯在深夜听钢琴曲整理一天思绪",
                "坚持每天睡前写技术复盘笔记",
                "希望明年带家人去海边悠闲休假",
                "对极简美学桌面布置有强烈偏爱",
                "早餐喜欢喝热拿铁配现烤牛角包",
                "正在系统深入研究分布式存储引擎",
                "曾约定遇到情绪低谷绝不独自硬扛",
                "对复古机械表和胶片摄影非常着迷",
                "周末喜欢去独立书店安静读半天书",
            ]
            for i, tp in enumerate(high_topics):
                rag.save_memory(
                    "u1",
                    tp,
                    importance=5,
                    category="重要经历",
                    feeling=f"心声{i}",
                    custom_ts=1700001000 + i,
                )

            self.assertEqual(rag.count_memories("u1"), 18)
            resident_ids = {m["id"] for m in rag.get_resident_memories("u1", limit=12)}
            self.assertNotIn(r_hok["id"], resident_ids)
            self.assertNotIn(r_cat["id"], resident_ids)

            # 跨词标签联想：未提“北海道”，仅提“旅行”也能召回
            hits_trip = rag.search_memories(
                "u1", "冬天好想出去旅行散心呀", limit=6, exclude_ids=resident_ids, strict_gate=True
            )
            self.assertTrue(any(m["id"] == r_hok["id"] for m in hits_trip))

            # 带语气助词的 2 字中文名词召回（“橘猫呢”）
            hits_cat = rag.search_memories(
                "u1", "橘猫呢最近乖不乖", limit=6, exclude_ids=resident_ids, strict_gate=True
            )
            self.assertTrue(any(m["id"] == r_cat["id"] for m in hits_cat))

            # 寒暄降噪：普通问候不应误召回
            for casual in ("早安 Una", "今天有点困", "哈哈好的谢谢"):
                self.assertEqual(
                    len(rag.search_memories("u1", casual, limit=6, exclude_ids=resident_ids, strict_gate=True)),
                    0,
                )

            # 去重合并 tags + 锁死 + 删除清理 FTS
            rag.save_memory("u1", "计划年底去北海道看雪！", importance=4, category="目标与计划", feeling="更新", tags=["温泉"])
            self.assertEqual(rag.count_memories("u1"), 18)
            self.assertTrue(rag.toggle_pin("u1", r_hok["id"])["pinned"])
            self.assertIsNotNone(rag.delete_memory("u1", r_cat["id"]))
            self.assertEqual(rag.count_memories("u1"), 17)
            self.assertFalse(any(m["id"] == r_cat["id"] for m in rag.search_memories("u1", "橘猫", strict_gate=False)))


class TestBotCoreAndSafety(unittest.TestCase):
    def test_defaults_multimodal_slots_voice_and_circuit_breaker(self):
        with tempfile.TemporaryDirectory() as td:
            ns = _load_bot_namespace(pathlib.Path(td) / "botdata")

            self.assertEqual(ns["LLM_BASE_URL"], "https://api.deepseek.com")
            self.assertEqual(ns["LLM_MODEL"], "deepseek-flash")
            self.assertEqual(ns["ASR_API_URL"], "https://api.deepseek.com/v1/tools/asr")
            self.assertEqual(ns["CHECK_INTERVAL_MIN"], 180)
            self.assertEqual(len(ns["BOT_TOOLS"]), 4)

            # 图片与音频魔数识别
            self.assertEqual(ns["detect_image_mime"](b"\x89PNG\r\n\x1a\nxxxx"), "image/png")
            self.assertEqual(ns["detect_image_mime"](b"\xff\xd8\xff\xe0xxxx"), "image/jpeg")
            self.assertEqual(ns["detect_asr_audio_format"](b"RIFF\x24\x00\x00\x00WAVEfmt "), ("voice.wav", "audio/wav"))
            self.assertEqual(ns["detect_asr_audio_format"](b"OggS\x00\x02xxxx"), ("voice.ogg", "audio/ogg"))
            self.assertTrue(ns["is_silk_audio"](b"\x02#!SILK_V3xxxx"))

            # DSML & URL 清洗
            cleaned = ns["sanitize_for_qq"]("**标题** <｜DSML｜ calls>x</｜DSML｜ calls> https://example.com")
            self.assertNotIn("DSML", cleaned)
            self.assertNotIn("https://", cleaned)
            self.assertNotIn("**", cleaned)

            # 严格 __slots__ 语音消息 + 重放去重 + ASR 失败回退 QQ asr_refer_text
            FakeC2CMessage = ns["_FakeC2CMessage"]

            class FakeAPI:
                def __init__(self):
                    self.sent = []

                async def post_c2c_message(self, **kwargs):
                    self.sent.append(kwargs)

            api = FakeAPI()
            msg = FakeC2CMessage(
                api,
                "evt1",
                {
                    "id": "msg_001",
                    "content": "",
                    "author": {"user_openid": "u_demo"},
                    "attachments": [
                        {
                            "content_type": "voice",
                            "filename": "v.silk",
                            "url": "https://cdn.example.com/v.silk",
                            "voice_wav_url": "https://cdn.example.com/v.wav",
                            "asr_refer_text": "QQ兜底文本",
                        }
                    ],
                },
            )
            atts = ns["get_message_attachments"](msg)
            self.assertEqual(atts[0]["voice_wav_url"], "https://cdn.example.com/v.wav")

            async def run_async_checks():
                async def fake_dl(client, url, max_bytes):
                    return b"RIFF\x24\x00\x00\x00WAVEfmt 1234"

                async def fake_asr_err(client, audio_bytes, fn, mime):
                    raise RuntimeError("asr timeout")

                captured = {}

                async def fake_chat(uid, text, image_data_urls=None, is_voice=False):
                    captured.update({"uid": uid, "text": text, "is_voice": is_voice})
                    return "Una 听清啦！"

                ns["_stream_download_bytes"] = fake_dl
                ns["transcribe_audio_deepseek"] = fake_asr_err
                ns["chat_with_companion"] = fake_chat

                bot_client = ns["CompanionBotClient"]()
                await bot_client.on_c2c_message_create(msg)
                self.assertEqual(len(api.sent), 1)
                self.assertTrue(captured["is_voice"])
                self.assertEqual(captured["text"], "QQ兜底文本")
                self.assertNotIn("msg_001", ns["RAW_ATTACHMENTS_CACHE"])

                # 同一 msg_id 重放必须去重跳过
                await bot_client.on_c2c_message_create(msg)
                self.assertEqual(len(api.sent), 1)

                # 指令烟雾测试
                r_note = await bot_client.handle_message("u_demo", "/记住 喜欢喝拿铁")
                self.assertIn("永久加锁", r_note)
                r_mem = await bot_client.handle_message("u_demo", "/记忆")
                self.assertIn("喜欢喝拿铁", r_mem)
                r_rec = await bot_client.handle_message("u_demo", "/回忆 拿铁")
                self.assertIn("喜欢喝拿铁", r_rec)

            asyncio.run(run_async_checks())

            # 熔断与频控检查
            guard = ns["ApiSafetyGuard"]()
            for i in range(5):
                ok, _ = guard.check_allowed("LLM")
                self.assertTrue(ok)
                guard.record_error(RuntimeError(f"err {i}"))
            ok_after, reason = guard.check_allowed("LLM")
            self.assertFalse(ok_after)
            self.assertIn("熔断保护", reason)

            # 羊毛筛选防空邮件逻辑检查（NONE / 负面语义不发邮件，KEEP 仅保留精选）
            sample_deals = [
                {"source": "v2ex", "title": "求推荐免费 API", "link": "https://a.test/1", "desc": "水帖"},
                {"source": "nodeseek", "title": "黑五 5 折 VPS", "link": "https://a.test/2", "desc": "年付 $10"},
                {"source": "linux.do", "title": "官方送 $50 Token 额度", "link": "https://a.test/3", "desc": "限时活动"},
            ]
            has1, _, sel1 = ns["parse_deals_selection"]("NONE", sample_deals)
            self.assertFalse(has1)
            self.assertEqual(sel1, [])

            has2, _, sel2 = ns["parse_deals_selection"]("这一轮暂时没看到特别划算的消息呢", sample_deals)
            self.assertFalse(has2)
            self.assertEqual(sel2, [])

            has3, body3, sel3 = ns["parse_deals_selection"]("KEEP: 2, 3\n这两条挺划算的，VPS 年付只要 10 刀。", sample_deals)
            self.assertTrue(has3)
            self.assertEqual([d["title"] for d in sel3], ["黑五 5 折 VPS", "官方送 $50 Token 额度"])
            self.assertNotIn("KEEP:", body3)

            # 人格规则检查：严禁机械煽情收尾 + 忠于原著“好了，站起来吧”
            sys_prompt = ns["build_companion_system_prompt"]("u_demo")
            self.assertIn("严禁机械煽情收尾", sys_prompt)
            self.assertIn("好了，站起来吧", sys_prompt)
            self.assertNotIn("靠在Una身边喘口气", sys_prompt)

    def test_hardening_atomic_json_env_reset_and_patrol_retry(self):
        with tempfile.TemporaryDirectory() as td:
            data_dir = pathlib.Path(td) / "hardened"
            ns = _load_bot_namespace(data_dir)

            # Direct _env_int test with empty / invalid / missing env vars
            os.environ["TEST_ENV_EMPTY"] = ""
            os.environ["TEST_ENV_BAD"] = "abc"
            try:
                self.assertEqual(ns["_env_int"]("TEST_ENV_EMPTY", 180, 10), 180)
                self.assertEqual(ns["_env_int"]("TEST_ENV_BAD", 20, 5), 20)
                self.assertEqual(ns["_env_int"]("TEST_ENV_MISSING", 300, 50), 300)
            finally:
                os.environ.pop("TEST_ENV_EMPTY", None)
                os.environ.pop("TEST_ENV_BAD", None)

            # Atomic save_json: valid content and zero *.tmp residue
            target_json = data_dir / "nested" / "sample.json"
            ns["save_json"](target_json, {"ok": True, "items": ["Una"]})
            self.assertEqual(ns["load_json"](target_json, {}), {"ok": True, "items": ["Una"]})
            self.assertEqual(list(target_json.parent.glob("*.tmp")), [])

            # /清空 and /重置 both clear short-term history while preserving SQLite memories
            ns["memory_rag"].save_memory("u_clear", "喜欢喝冰美式", importance=5, category="偏好与习惯", feeling="记住啦")
            ns["save_turn"]("u_clear", "hi", "hello")
            self.assertEqual(len(ns["memory_store"]["history"]["u_clear"]), 2)

            bot_client = ns["CompanionBotClient"]()

            async def run_clear_and_patrol():
                await bot_client.handle_message("u_clear", "/清空")
                self.assertNotIn("u_clear", ns["memory_store"]["history"])
                self.assertEqual(ns["memory_rag"].count_memories("u_clear"), 1)

                ns["save_turn"]("u_clear", "hi2", "hello2")
                await bot_client.handle_message("u_clear", "/重置")
                self.assertNotIn("u_clear", ns["memory_store"]["history"])
                self.assertEqual(ns["memory_rag"].count_memories("u_clear"), 1)

                # patrol_deals: AI failure must NOT persist seen_deals.json
                deal_link = "https://example.test/deal-black-friday"
                ns["DEAL_KEYWORDS"] = ["vps"]

                async def fake_feeds():
                    return [{"source": "test", "title": "Black Friday VPS", "link": deal_link, "desc": "cheap vps"}]

                async def fake_sum_err(deals):
                    raise RuntimeError("boom")

                ns["fetch_all_feeds"] = fake_feeds
                ns["summarize_deals_with_persona"] = fake_sum_err
                with self.assertRaises(RuntimeError):
                    await ns["patrol_deals"]()
                self.assertFalse(ns["SEEN_FILE"].exists())

                async def fake_sum_ok(deals):
                    return False, "全是水帖", []

                ns["summarize_deals_with_persona"] = fake_sum_ok
                _, cnt = await ns["patrol_deals"]()
                self.assertEqual(cnt, 0)
                self.assertTrue(ns["SEEN_FILE"].exists())
                self.assertIn(deal_link, ns["load_json"](ns["SEEN_FILE"], []))

            asyncio.run(run_clear_and_patrol())


if __name__ == "__main__":
    unittest.main()
