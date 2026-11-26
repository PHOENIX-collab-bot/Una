#!/usr/bin/env bash
set -euo pipefail

# Una — 7x24 QQ 专属伴侣机器人 Linux 一键部署/升级脚本（Debian 11/12 & Ubuntu 22.04+）
# 用法：bash install.sh [安装目录，默认 /opt/studybot]

INSTALL_DIR="${1:-/opt/studybot}"
SERVICE_NAME="studybot"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=================================================="
echo "  Una QQ 专属伴侣机器人 — 一键部署 / 升级向导"
echo "  目标目录: ${INSTALL_DIR}"
echo "=================================================="

if [ "${EUID}" -ne 0 ]; then
  echo "[ERR] 请使用 root 权限运行（例如：sudo bash install.sh）"
  exit 1
fi

# 1. 低内存 VPS 自动检查 2G Swap（仅当总内存 < 1.5G 且尚未开启 Swap 时创建）
MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
SWAP_MB=$(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo)
if [ "${MEM_MB}" -lt 1500 ] && [ "${SWAP_MB}" -lt 512 ]; then
  echo "[1/5] 检测到物理内存仅 ${MEM_MB}MB 且未配置 Swap，正在安全创建 2G Swap..."
  if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "      2G Swap 已启用并加入开机自动挂载。"
  fi
else
  echo "[1/5] 内存与 Swap 状态正常（物理内存 ${MEM_MB}MB / Swap ${SWAP_MB}MB），跳过创建。"
fi

# 2. 安装 Python 3 虚拟环境基础工具
echo "[2/5] 检查并安装 python3-venv 与 python3-pip..."
if ! python3 -m venv --help >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y -qq python3-venv python3-pip
fi

# 3. 同步核心代码到安装目录
echo "[3/5] 同步 Una 程序文件到 ${INSTALL_DIR}..."
mkdir -p "${INSTALL_DIR}/data"
for f in bot.py memory_rag.py requirements.txt .env.example; do
  if [ -f "${SCRIPT_DIR}/${f}" ]; then
    cp "${SCRIPT_DIR}/${f}" "${INSTALL_DIR}/${f}"
  fi
done

if [ ! -f "${INSTALL_DIR}/.env" ] && [ -f "${INSTALL_DIR}/.env.example" ]; then
  cp "${INSTALL_DIR}/.env.example" "${INSTALL_DIR}/.env"
  chmod 600 "${INSTALL_DIR}/.env"
  NEED_ENV_EDIT=1
else
  NEED_ENV_EDIT=0
fi

# 4. 创建虚拟环境并安装依赖
echo "[4/5] 配置独立 Python 虚拟环境并安装依赖（含 pilk 语音解码）..."
if [ ! -d "${INSTALL_DIR}/venv" ]; then
  python3 -m venv "${INSTALL_DIR}/venv"
fi
"${INSTALL_DIR}/venv/bin/pip" install -q --upgrade pip
"${INSTALL_DIR}/venv/bin/pip" install -q -r "${INSTALL_DIR}/requirements.txt"

# 5. 注册 systemd 7x24 后台服务
echo "[5/5] 写入 systemd 服务 /etc/systemd/system/${SERVICE_NAME}.service..."
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=Una 24/7 QQ Companion, Hybrid RAG & Deals Bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${INSTALL_DIR}
ExecStart=${INSTALL_DIR}/venv/bin/python ${INSTALL_DIR}/bot.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}" >/dev/null

echo ""
echo "=================================================="
if [ "${NEED_ENV_EDIT}" -eq 1 ]; then
  echo "  安装完成！下一步仅需填写配置即可上线："
  echo "  1. 编辑配置：nano ${INSTALL_DIR}/.env"
  echo "     （必填：QQ_APPID、QQ_SECRET、LLM_API_KEY、USER_NICKNAME）"
  echo "  2. 启动服务：systemctl restart ${SERVICE_NAME}"
  echo "  3. 查看日志：journalctl -u ${SERVICE_NAME} -n 30 -f"
else
  echo "  检测到已有 .env，正在平滑重启服务..."
  systemctl restart "${SERVICE_NAME}"
  echo "  升级完成！运行以下命令查看实时日志："
  echo "  journalctl -u ${SERVICE_NAME} -n 30 -f"
fi
echo "=================================================="
