# 造口伤口门诊系统

前后端分离架构：Vue 3 后台管理 + NestJS API 服务 + MySQL 数据库 + Nginx 反向代理。

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | Vue 3 + Vite + Element Plus + Pinia | 后台管理 SPA，base 路径 `/admin/` |
| 后端 | NestJS + Prisma + MySQL + JWT | API 服务，端口 3000 |
| 数据库 | MySQL 8.0 | 数据库名 `hospitals` |
| 反向代理 | Nginx | 静态托管 + API 代理 |

## 项目结构

```
hospitals/
├── admin-web/              # 前端管理后台
│   ├── src/
│   │   ├── api/            # Axios 请求封装 (baseURL: /api)
│   │   ├── views/          # 页面组件
│   │   ├── layouts/        # 布局组件 (AdminLayout.vue)
│   │   ├── composables/    # useIsMobile 等组合式函数
│   │   └── styles/         # 全局样式 (reset.css 含移动端响应式)
│   ├── vite.config.ts      # base: '/admin/'
│   └── package.json
├── server/                 # 后端 API 服务
│   ├── src/
│   │   ├── modules/        # 业务模块 (auth/hospital/doctor/...)
│   │   ├── common/         # 公共守卫/拦截器/过滤器
│   │   └── prisma/         # Prisma 服务封装
│   ├── prisma/
│   │   ├── schema.prisma   # 数据库模型定义
│   │   └── seed.ts         # 初始数据脚本
│   ├── public/
│   │   └── index.html      # 公开访问页面（造口伤口门诊名录）
│   ├── .env                # 环境变量配置
│   └── package.json
├── deploy.sh               # 自动部署脚本（首次部署）
├── update.sh               # 更新脚本（发版更新）
└── README.md
```

## 部署关键信息

### 服务器路径

| 内容 | 路径 |
|------|------|
| 项目根目录 | `/home/ubuntu/hospitals` |
| 后端目录 | `/home/ubuntu/hospitals/server` |
| 前端目录 | `/home/ubuntu/hospitals/admin-web` |
| 后端构建产物 | `/home/ubuntu/hospitals/server/dist/src/main.js` |
| 前端构建产物 | `/home/ubuntu/hospitals/admin-web/dist/` |
| 公开页面 | `/home/ubuntu/hospitals/server/public/index.html` |
| 上传文件目录 | `/home/ubuntu/hospitals/server/uploads/` |
| PM2 配置文件 | `/home/ubuntu/hospitals/server/ecosystem.config.js` |
| 后端环境变量 | `/home/ubuntu/hospitals/server/.env` |

### Nginx 配置

- **配置文件位置**: `/etc/nginx/sites-available/hospitals`
- **启用软链接**: `/etc/nginx/sites-enabled/hospitals`

**路由规则:**

| 路径 | 目标 | 说明 |
|------|------|------|
| `/` | `proxy_pass → :3000` | 公开页面，由后端 NestJS 托管 `index.html` |
| `/admin/` | `alias → admin-web/dist/` | 后台管理前端 SPA |
| `/api/` | `proxy_pass → :3000` | API 接口代理 |
| `/uploads/` | `proxy_pass → :3000` | 上传文件代理 |

### PM2 进程管理

| 项目 | 值 |
|------|-----|
| 进程名 | `hospitals-server` |
| 启动文件 | `dist/src/main.js` |
| 运行端口 | `3000` |
| 日志目录 | `/var/log/hospitals/` |

**常用命令:**

```bash
pm2 status                         # 查看进程状态
pm2 logs hospitals-server          # 查看实时日志
pm2 restart hospitals-server       # 重启服务
pm2 reload hospitals-server        # 零停机重载
pm2 monit                          # 监控面板
```

### 数据库

| 项目 | 值 |
|------|-----|
| 数据库名 | `hospitals` |
| 用户名 | `hospitals_user` |
| 连接地址 | `localhost:3306` |
| 连接串格式 | `mysql://hospitals_user:密码@localhost:3306/hospitals` |

### 管理员账号

| 项目 | 值 |
|------|-----|
| 用户名 | `admin` |
| 初始密码 | `admin123`（部署后请立即修改） |

## 部署方式

### 首次部署

```bash
bash deploy.sh
```

脚本会自动完成：安装依赖 → 建库 → 后端构建 → 前端构建 → 配置 Nginx → 启动 PM2。

### 更新发版

```bash
bash update.sh           # 更新前后端
bash update.sh backend   # 仅更新后端
bash update.sh frontend  # 仅更新前端
```

### 手动更新后端

```bash
cd /home/ubuntu/hospitals/server
git pull
npm install
npx prisma generate
npx prisma db push
npm run build
pm2 reload hospitals-server
```

### 手动更新前端

```bash
cd /home/ubuntu/hospitals/admin-web
git pull
npm install
npm run build
chmod -R o+r dist
```

## 本地开发

### 后端

```bash
cd server
npm install
cp .env.example .env    # 配置数据库连接
npx prisma generate
npx prisma db push
npx prisma db seed
npm run start:dev        # http://localhost:3000
```

### 前端

```bash
cd admin-web
npm install
npm run dev             # http://localhost:5173/admin/
```

前端开发模式下 `/api` 和 `/uploads` 会自动代理到 `http://localhost:3000`（见 `vite.config.ts`）。
