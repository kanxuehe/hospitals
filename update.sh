#!/bin/bash

# ============================================================
# 造口伤口门诊系统 - 更新部署脚本（发版用）
# 使用方式：bash update.sh [all|backend|frontend]
#   all      - 更新前后端（默认）
#   backend  - 仅更新后端
#   frontend - 仅更新前端
# 运行用户：ubuntu
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="/home/ubuntu/hospitals"
SERVER_DIR="$PROJECT_DIR/server"
ADMIN_DIR="$PROJECT_DIR/admin-web"
TARGET="${1:-all}"

info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
success() { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   造口伤口门诊系统 - 更新部署脚本 v1.1                 ║${NC}"
echo -e "${CYAN}║   更新目标: $TARGET                                      ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"

# ---------- 更新后端 ----------
update_backend() {
    echo ""
    echo -e "${CYAN}━━━━━━━━ 更新后端 ━━━━━━━━${NC}"

    info "拉取最新代码..."
    cd "$PROJECT_DIR"
    git pull
    success "代码拉取完成"

    info "进入后端目录..."
    cd "$SERVER_DIR"

    info "安装依赖..."
    npm install
    success "依赖安装完成"

    info "生成 Prisma Client..."
    npx prisma generate
    success "Prisma Client 生成完成"

    info "同步数据库结构..."
    npx prisma db push
    success "数据库结构同步完成"

    info "构建后端..."
    npm run build
    success "后端构建完成"

    info "验证构建产物..."
    if [ -f "dist/src/main.js" ]; then
        success "构建产物验证通过 (dist/src/main.js)"
    else
        error "构建产物未找到: dist/src/main.js"
        exit 1
    fi

    info "重载 PM2 服务..."
    pm2 reload hospitals-server
    success "后端服务已重载"

    info "验证后端 API..."
    sleep 2
    if curl -s http://localhost:3000/api/public/provinces | grep -q "辽宁"; then
        success "后端 API 响应正常"
    else
        warn "后端 API 响应异常，请检查: pm2 logs hospitals-server"
    fi
}

# ---------- 更新前端 ----------
update_frontend() {
    echo ""
    echo -e "${CYAN}━━━━━━━━ 更新前端 ━━━━━━━━${NC}"

    info "拉取最新代码..."
    cd "$PROJECT_DIR"
    git pull
    success "代码拉取完成"

    info "进入前端目录..."
    cd "$ADMIN_DIR"

    info "安装依赖..."
    npm install
    success "依赖安装完成"

    info "构建前端..."
    npm run build
    success "前端构建完成"

    info "验证构建产物..."
    if [ -f "dist/index.html" ]; then
        success "前端构建产物验证通过 (dist/index.html)"
    else
        error "前端构建产物未找到: dist/index.html"
        exit 1
    fi

    info "设置 Nginx 访问权限..."
    chmod o+x /home/ubuntu
    chmod o+x /home/ubuntu/hospitals
    chmod o+x /home/ubuntu/hospitals/admin-web
    chmod -R o+r /home/ubuntu/hospitals/admin-web/dist
    success "权限设置完成"

    info "验证前端页面..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost/admin/ | grep -q "200"; then
        success "前端页面访问正常 (HTTP 200)"
    else
        warn "前端页面访问异常，请检查 Nginx 配置或权限"
    fi
}

# ---------- 执行 ----------
case "$TARGET" in
    all)
        update_backend
        update_frontend
        ;;
    backend)
        update_backend
        ;;
    frontend)
        update_frontend
        ;;
    *)
        error "未知目标: $TARGET"
        echo "用法: bash update.sh [all|backend|frontend]"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ 更新完成！${NC}"
echo ""
