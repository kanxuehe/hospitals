# 医院数据管理系统 - 后端服务

基于 NestJS + Prisma + MySQL 的后端 API 服务。

## 环境要求

- Node.js >= 20
- MySQL >= 5.7（本地默认 `localhost:3306`）

## 环境变量配置

复制或创建 `server/.env`，配置数据库连接：

```
DATABASE_URL="mysql://root:@localhost:3306/hospitals"
JWT_SECRET="your-secret-key-change-in-production"
JWT_ACCESS_EXPIRES="2h"
JWT_REFRESH_EXPIRES="7d"
UPLOAD_DIR="./uploads"
```

## 项目安装

```bash
$ npm install
```

## 启动服务

```bash
# 开发模式（监听文件变更，自动重启）
$ npm run start:dev

# 普通模式
$ npm run start

# 生产模式（需先构建）
$ npm run build
$ npm run start:prod
```

服务默认监听 `http://localhost:3000`。

## 数据库操作（Prisma）

### 初始化/迁移

```bash
# 根据 schema.prisma 生成迁移文件并应用到数据库
$ npx prisma migrate dev --name init

# 应用已有的迁移（生产环境部署用）
$ npx prisma migrate deploy

# 跳过迁移文件，直接把 schema 同步到数据库（开发用）
$ npx prisma db push

# 生成/更新 Prisma Client
$ npx prisma generate
```

### 初始化种子数据

```bash
# 创建超级管理员（admin / admin123）、字典数据、辽宁省及 14 个城市
$ npx prisma db seed
# 或
$ npx ts-node prisma/seed.ts
```

### 迁移业务数据

```bash
# 将静态 JS 数据迁移到 MySQL（示例占位数据，需先执行 seed）
$ npx ts-node prisma/migrate-data.ts
```

### 可视化查看数据

```bash
# 启动 Prisma Studio，浏览器访问 http://localhost:5555
$ npx prisma studio
```

### 常用 Prisma CLI 速查

| 命令 | 说明 |
| --- | --- |
| `npx prisma migrate dev` | 开发环境：生成并应用迁移 |
| `npx prisma migrate deploy` | 生产环境：应用已有迁移 |
| `npx prisma db push` | 直接同步 schema（不生成迁移文件） |
| `npx prisma generate` | 重新生成 Prisma Client |
| `npx prisma db seed` | 执行种子脚本（seed.ts） |
| `npx prisma studio` | 启动数据库可视化工具 |
| `npx prisma validate` | 校验 schema.prisma 语法 |
| `npx prisma format` | 格式化 schema.prisma |

> Prisma 模型定义见 `prisma/schema.prisma`，迁移历史见 `prisma/migrations/`。

## 其他常用命令

```bash
# 构建
$ npm run build

# 代码检查与格式化
$ npm run lint
$ npm run format

# 测试
$ npm run test        # 单元测试
$ npm run test:e2e    # 端到端测试
$ npm run test:cov    # 测试覆盖率
```
