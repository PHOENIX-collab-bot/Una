# Contributing to Una

欢迎任何形式的贡献（Issue、文档改进、人设/记忆调优或新功能 PR）！

## 开发环境快速搭建

```bash
git clone https://github.com/PHOENIX-collab-bot/Una.git
cd Una
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[all]"
cp .env.example .env
```

## 提交前检查清单

1. **运行离线单元测试**（无需真实 API Key）：
   ```bash
   python -m py_compile bot.py memory_rag.py tests/test_una.py
   python -m unittest discover -s tests -v
   ```
2. **脚本语法检查**（如修改了 `install.sh`）：
   ```bash
   bash -n install.sh
   ```
3. **敏感信息红线**：
   - 严禁提交 `.env`、真实 API Key、QQ `AppSecret`、QQ 邮箱授权码、服务器公网 IP 或 `data/memories.db`。
4. **工程约束**：
   - 保持轻量低内存定位（2 核 1G VPS 常驻内存控制在 100MB 以内，不引入重型本地模型或向量数据库）；
   - `qq-botpy` 的 `C2CMessage` 为 `__slots__` 类，请勿直接往消息对象新增属性；
   - 新增或修改任何外部付费模型调用时，务必统一走 `safe_chat_completion` / `api_guard` 安全网关。

## Commit 规范建议
采用 [Conventional Commits](https://www.conventionalcommits.org/)：
- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档与示意图更新
- `refactor:` 重构优化
- `test:` 单元测试补充
