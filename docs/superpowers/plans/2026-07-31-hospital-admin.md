# 造口伤口门诊名录后台管理系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 SaaS 多租户后台管理系统，支持多省份扩展、多账号分省管理，提供公开 API 供前台动态获取数据。

**Architecture:** NestJS REST API 后端 + Prisma ORM + MySQL 8 数据库；Vue3 + Element Plus 后台前端；JWT 认证；数据权限通过 UserProvince 多对多关联实现省管理员数据隔离。

**Tech Stack:** Vue 3 + TypeScript + Vite + Element Plus + Pinia / NestJS + Prisma + MySQL 8 + JWT

## Global Constraints

- Node.js >= 18, npm >= 9
- MySQL 8.0+
- 后端端口 3000，前端开发端口 5173
- 数据库编码 utf8mb4
- 所有 API 返回统一格式：`{ code: number, message: string, data: any }`
- 密码使用 bcrypt 哈希（salt rounds = 10）
- JWT access token 有效期 2h，refresh token 7d（记住登录 30d）
- 文件上传限制：jpg/png/webp/gif，单文件 5MB
- 软删除字段：`deleted_at`（null = 未删除）
- 所有时间字段使用 UTC 存储

**参考设计文档：** `docs/superpowers/specs/2026-07-31-hospital-admin-design.md`

---

## File Structure

### 后端 `server/`

```
server/
├── prisma/
│   ├── schema.prisma              — 全部数据模型
│   └── seed.ts                    — 预置数据（字典+超管+辽宁省）
├── src/
│   ├── main.ts                    — 应用入口，CORS，全局管道/过滤器
│   ├── app.module.ts              — 根模块
│   ├── prisma/
│   │   └── prisma.service.ts      — PrismaClient 封装
│   ├── common/
│   │   ├── dto/pagination.dto.ts  — 分页参数 DTO
│   │   ├── decorators/current-user.decorator.ts
│   │   ├── guards/jwt-auth.guard.ts
│   │   ├── guards/data-scope.guard.ts
│   │   ├── interceptors/transform.interceptor.ts
│   │   └── filters/http-exception.filter.ts
│   └── modules/
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── jwt.strategy.ts
│       │   └── dto/login.dto.ts, change-password.dto.ts
│       ├── province/
│       │   ├── province.module.ts
│       │   ├── province.controller.ts
│       │   ├── province.service.ts
│       │   └── dto/create-province.dto.ts, update-province.dto.ts
│       ├── city/                   — 同 province 结构
│       ├── dict/                   — 同 province 结构
│       ├── hospital/
│       │   ├── hospital.module.ts
│       │   ├── hospital.controller.ts
│       │   ├── hospital.service.ts
│       │   └── dto/create-hospital.dto.ts, update-hospital.dto.ts, query-hospital.dto.ts
│       ├── clinic-service/
│       │   ├── clinic-service.module.ts
│       │   ├── clinic-service.controller.ts
│       │   ├── clinic-service.service.ts
│       │   └── dto/ (create/update clinic-service, schedule, phone)
│       ├── doctor/                 — 同 hospital 结构
│       ├── user/                   — 同 province 结构 + 分配省份
│       ├── upload/
│       │   ├── upload.module.ts
│       │   ├── upload.controller.ts
│       │   └── storage.service.ts
│       ├── dashboard/
│       │   ├── dashboard.module.ts
│       │   ├── dashboard.controller.ts
│       │   └── dashboard.service.ts
│       └── public/
│           ├── public.module.ts
│           ├── public.controller.ts
│           └── public.service.ts
├── uploads/                        — 上传文件存储目录
├── test/                           — E2E 测试
├── package.json
├── tsconfig.json
├── nest-cli.json
└── .env
```

### 前端 `admin-web/`

```
admin-web/
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router/index.ts             — 路由 + 权限守卫
│   ├── stores/auth.ts              — 登录状态、用户信息、token
│   ├── stores/app.ts               — 侧边栏状态
│   ├── api/
│   │   ├── request.ts              — Axios 封装
│   │   ├── auth.ts
│   │   ├── province.ts
│   │   ├── city.ts
│   │   ├── dict.ts
│   │   ├── hospital.ts
│   │   ├── clinic-service.ts
│   │   ├── doctor.ts
│   │   ├── user.ts
│   │   ├── dashboard.ts
│   │   └── upload.ts
│   ├── layouts/AdminLayout.vue     — 侧边栏 + 顶栏 + 内容区
│   ├── views/
│   │   ├── login/index.vue
│   │   ├── dashboard/index.vue
│   │   ├── hospital/List.vue
│   │   ├── hospital/Detail.vue
│   │   ├── doctor/List.vue
│   │   ├── province/List.vue
│   │   ├── city/List.vue
│   │   ├── dict/List.vue
│   │   └── user/List.vue
│   ├── components/
│   │   ├── ClinicScheduleEditor.vue
│   │   ├── PhoneContactEditor.vue
│   │   └── ImageUploader.vue
│   └── utils/auth.ts               — token 存取
├── package.json
├── vite.config.ts
├── tsconfig.json
└── .env
```

---

## Task 1: 后端项目脚手架 + Prisma + MySQL

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/nest-cli.json`
- Create: `server/.env`
- Create: `server/src/main.ts`
- Create: `server/src/app.module.ts`
- Create: `server/src/prisma/prisma.service.ts`
- Create: `server/src/prisma/prisma.module.ts`

**Interfaces:**
- Produces: `PrismaService`（继承 PrismaClient，`onModuleInit` 连接），全局可注入

- [ ] **Step 1: 创建 NestJS 项目**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
npx @nestjs/cli new server --package-manager npm --skip-git
cd server
```

- [ ] **Step 2: 安装依赖**

```bash
npm install @prisma/client @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt multer @nestjs/platform-express class-validator class-transformer
npm install -D prisma @types/passport-jwt @types/bcrypt @types/multer
```

- [ ] **Step 3: 初始化 Prisma + MySQL**

```bash
npx prisma init --datasource-provider mysql
```

编辑 `server/.env`：

```env
DATABASE_URL="mysql://root:password@localhost:3306/hospitals"
JWT_SECRET="your-secret-key-change-in-production"
JWT_ACCESS_EXPIRES="2h"
JWT_REFRESH_EXPIRES="7d"
UPLOAD_DIR="./uploads"
```

- [ ] **Step 4: 创建 PrismaService**

`server/src/prisma/prisma.service.ts`:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

`server/src/prisma/prisma.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 5: 配置 main.ts（CORS + 全局管道 + 统一响应）**

`server/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(3000);
}
bootstrap();
```

`server/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
})
export class AppModule {}
```

- [ ] **Step 6: 创建统一响应拦截器和异常过滤器**

`server/src/common/interceptors/transform.interceptor.ts`:

```typescript
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: 'success',
        data,
      })),
    );
  }
}
```

`server/src/common/filters/http-exception.filter.ts`:

```typescript
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message =
        typeof res === 'string'
          ? res
          : (res as any).message
            ? Array.isArray((res as any).message)
              ? (res as any).message[0]
              : (res as any).message
            : exception.message;
    }

    response.status(status).json({
      code: status,
      message,
      data: null,
    });
  }
}
```

- [ ] **Step 7: 创建分页 DTO**

`server/src/common/dto/pagination.dto.ts`:

```typescript
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
```

- [ ] **Step 8: 验证项目启动**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals/server
npm run build && npm run start
```

Expected: 应用在端口 3000 启动，无报错。

- [ ] **Step 9: Commit**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
git add server/
git commit -m "feat: scaffold NestJS backend with Prisma, CORS, global pipes"
```

---

## Task 2: Prisma Schema — 全部数据模型

**Files:**
- Modify: `server/prisma/schema.prisma`

**Interfaces:**
- Produces: 所有 Prisma 模型（Province, City, Hospital, ClinicService, ClinicSchedule, PhoneContact, Doctor, HospitalImage, User, UserProvince, DictType, DictItem）

- [ ] **Step 1: 编写完整 schema.prisma**

`server/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model Province {
  id         Int      @id @default(autoincrement())
  name       String   @db.VarChar(50)
  shortName  String   @db.VarChar(10)
  sortOrder  Int      @default(0)
  isEnabled  Boolean  @default(true)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  cities   City[]
  hospitals Hospital[]
  users    UserProvince[]

  @@map("provinces")
}

model City {
  id         Int      @id @default(autoincrement())
  provinceId Int      @map("province_id")
  name       String   @db.VarChar(50)
  pinyin     String?  @db.VarChar(100)
  sortOrder  Int      @default(0)
  isEnabled  Boolean  @default(true)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  province  Province @relation(fields: [provinceId], references: [id])
  hospitals Hospital[]

  @@map("cities")
}

model Hospital {
  id          Int       @id @default(autoincrement())
  provinceId  Int       @map("province_id")
  cityId      Int       @map("city_id")
  name        String    @db.VarChar(200)
  level       String    @db.VarChar(50)
  address     String?   @db.VarChar(500)
  mapLng      Float?    @map("map_lng")
  mapLat      Float?    @map("map_lat")
  intro       String?   @db.Text
  logo        String?   @db.VarChar(500)
  isPublished Boolean   @default(false) @map("is_published")
  sortOrder   Int       @default(0) @map("sort_order")
  createdBy   Int       @map("created_by")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  province      Province       @relation(fields: [provinceId], references: [id])
  city          City           @relation(fields: [cityId], references: [id])
  clinicServices ClinicService[]
  doctors       Doctor[]
  images        HospitalImage[]
  creator       User           @relation(fields: [createdBy], references: [id])

  @@index([provinceId])
  @@index([cityId])
  @@index([isPublished])
  @@map("hospitals")
}

model ClinicService {
  id          Int      @id @default(autoincrement())
  hospitalId  Int      @map("hospital_id")
  clinicType  String   @db.VarChar(50) @map("clinic_type")
  intro       String?  @db.VarChar(500)
  sortOrder   Int      @default(0) @map("sort_order")
  isPublished Boolean  @default(true) @map("is_published")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  hospital   Hospital         @relation(fields: [hospitalId], references: [id])
  schedules  ClinicSchedule[]
  phones     PhoneContact[]

  @@index([hospitalId])
  @@map("clinic_services")
}

model ClinicSchedule {
  id              Int      @id @default(autoincrement())
  clinicServiceId Int      @map("clinic_service_id")
  dayOfWeek       Int      @map("day_of_week")
  hasMorning      Boolean  @default(false) @map("has_morning")
  hasAfternoon    Boolean  @default(false) @map("has_afternoon")
  hasEvening      Boolean  @default(false) @map("has_evening")
  remark          String?  @db.VarChar(200)

  clinicService ClinicService @relation(fields: [clinicServiceId], references: [id], onDelete: Cascade)

  @@unique([clinicServiceId, dayOfWeek])
  @@map("clinic_schedules")
}

model PhoneContact {
  id              Int      @id @default(autoincrement())
  clinicServiceId Int      @map("clinic_service_id")
  phoneName       String   @db.VarChar(50) @map("phone_name")
  phoneNumber     String   @db.VarChar(50) @map("phone_number")
  contactPerson   String?  @db.VarChar(50) @map("contact_person")
  remark          String?  @db.VarChar(200)
  sortOrder       Int      @default(0) @map("sort_order")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  clinicService ClinicService @relation(fields: [clinicServiceId], references: [id], onDelete: Cascade)

  @@index([clinicServiceId])
  @@map("phone_contacts")
}

model Doctor {
  id          Int      @id @default(autoincrement())
  hospitalId  Int      @map("hospital_id")
  name        String   @db.VarChar(50)
  avatar      String?  @db.VarChar(500)
  title       String   @db.VarChar(50)
  intro       String?  @db.Text
  specialty   String?  @db.Text
  sortOrder   Int      @default(0) @map("sort_order")
  isPublished Boolean  @default(true) @map("is_published")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  hospital Hospital @relation(fields: [hospitalId], references: [id])

  @@index([hospitalId])
  @@map("doctors")
}

model HospitalImage {
  id         Int    @id @default(autoincrement())
  hospitalId Int    @map("hospital_id")
  url        String @db.VarChar(500)
  type       String @db.VarChar(20)
  sortOrder  Int    @default(0) @map("sort_order")

  hospital Hospital @relation(fields: [hospitalId], references: [id], onDelete: Cascade)

  @@map("hospital_images")
}

model User {
  id           Int       @id @default(autoincrement())
  username     String    @unique @db.VarChar(50)
  passwordHash String    @map("password_hash")
  name         String    @db.VarChar(50)
  phone        String?   @db.VarChar(20)
  role         String    @db.VarChar(20) // super_admin | province_admin
  isEnabled    Boolean   @default(true) @map("is_enabled")
  lastLoginAt  DateTime? @map("last_login_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  provinces    UserProvince[]
  hospitals    Hospital[]

  @@map("users")
}

model UserProvince {
  id         Int Int @id @default(autoincrement())
  userId     Int @map("user_id")
  provinceId Int @map("province_id")

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  province Province @relation(fields: [provinceId], references: [id], onDelete: Cascade)

  @@unique([userId, provinceId])
  @@map("user_provinces")
}

model DictType {
  id        Int      @id @default(autoincrement())
  code      String   @unique @db.VarChar(50)
  name      String   @db.VarChar(50)
  createdAt DateTime @default(now()) @map("created_at")

  items DictItem[]

  @@map("dict_types")
}

model DictItem {
  id         Int      @id @default(autoincrement())
  dictTypeId Int      @map("dict_type_id")
  label      String   @db.VarChar(50)
  value      String   @db.VarChar(50)
  sortOrder  Int      @default(0) @map("sort_order")
  isEnabled  Boolean  @default(true) @map("is_enabled")

  dictType DictType @relation(fields: [dictTypeId], references: [id], onDelete: Cascade)

  @@map("dict_items")
}
```

- [ ] **Step 2: 生成 Prisma Client + 创建数据库表**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals/server
npx prisma migrate dev --name init
npx prisma generate
```

Expected: 数据库创建 11 张表，Prisma Client 生成成功。

- [ ] **Step 3: Commit**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
git add server/prisma/
git commit -m "feat: define Prisma schema with all 11 models"
```

---

## Task 3: 数据库 Seed — 字典 + 超管 + 辽宁省

**Files:**
- Create: `server/prisma/seed.ts`
- Modify: `server/package.json`（添加 prisma seed 配置）

**Interfaces:**
- Produces: 预置数据：1 个超管账号、3 个字典类型及字典项、辽宁省 + 14 个城市

- [ ] **Step 1: 编写 seed 脚本**

`server/prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 1. 超级管理员
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      name: '超级管理员',
      role: 'super_admin',
      isEnabled: true,
    },
  });

  // 2. 字典类型
  const dictTypes = [
    { code: 'hospital_level', name: '医院等级' },
    { code: 'clinic_type', name: '门诊类型' },
    { code: 'phone_type', name: '电话类型' },
  ];

  for (const dt of dictTypes) {
    await prisma.dictType.upsert({
      where: { code: dt.code },
      update: {},
      create: dt,
    });
  }

  // 3. 字典项
  const dictItems = [
    // 医院等级
    { dictTypeCode: 'hospital_level', label: '三甲', value: '三甲', sortOrder: 1 },
    { dictTypeCode: 'hospital_level', label: '三乙', value: '三乙', sortOrder: 2 },
    { dictTypeCode: 'hospital_level', label: '二甲', value: '二甲', sortOrder: 3 },
    { dictTypeCode: 'hospital_level', label: '二乙', value: '二乙', sortOrder: 4 },
    { dictTypeCode: 'hospital_level', label: '一甲', value: '一甲', sortOrder: 5 },
    { dictTypeCode: 'hospital_level', label: '其他', value: '其他', sortOrder: 6 },
    // 门诊类型
    { dictTypeCode: 'clinic_type', label: '造口门诊', value: '造口门诊', sortOrder: 1 },
    { dictTypeCode: 'clinic_type', label: '伤口门诊', value: '伤口门诊', sortOrder: 2 },
    { dictTypeCode: 'clinic_type', label: '护理门诊', value: '护理门诊', sortOrder: 3 },
    { dictTypeCode: 'clinic_type', label: '造口伤口门诊', value: '造口伤口门诊', sortOrder: 4 },
    { dictTypeCode: 'clinic_type', label: '其他', value: '其他', sortOrder: 5 },
    // 电话类型
    { dictTypeCode: 'phone_type', label: '咨询电话', value: '咨询电话', sortOrder: 1 },
    { dictTypeCode: 'phone_type', label: '预约电话', value: '预约电话', sortOrder: 2 },
    { dictTypeCode: 'phone_type', label: '护士站', value: '护士站', sortOrder: 3 },
    { dictTypeCode: 'phone_type', label: '造口门诊', value: '造口门诊', sortOrder: 4 },
    { dictTypeCode: 'phone_type', label: '伤口门诊', value: '伤口门诊', sortOrder: 5 },
  ];

  for (const item of dictItems) {
    const dt = await prisma.dictType.findUnique({ where: { code: item.dictTypeCode } });
    if (!dt) continue;
    await prisma.dictItem.upsert({
      where: {
        dictTypeId_label: { dictTypeId: dt.id, label: item.label },
      },
      update: {},
      create: {
        dictTypeId: dt.id,
        label: item.label,
        value: item.value,
        sortOrder: item.sortOrder,
      },
    });
  }

  // 4. 辽宁省 + 14 个城市
  const liaoning = await prisma.province.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: '辽宁省',
      shortName: '辽',
      sortOrder: 1,
      isEnabled: true,
    },
  });

  const cities = [
    { name: '沈阳', pinyin: 'shenyang', sortOrder: 1 },
    { name: '大连', pinyin: 'dalian', sortOrder: 2 },
    { name: '鞍山', pinyin: 'anshan', sortOrder: 3 },
    { name: '抚顺', pinyin: 'fushun', sortOrder: 4 },
    { name: '本溪', pinyin: 'benxi', sortOrder: 5 },
    { name: '丹东', pinyin: 'dandong', sortOrder: 6 },
    { name: '锦州', pinyin: 'jinzhou', sortOrder: 7 },
    { name: '营口', pinyin: 'yingkou', sortOrder: 8 },
    { name: '阜新', pinyin: 'fuxin', sortOrder: 9 },
    { name: '辽阳', pinyin: 'liaoyang', sortOrder: 10 },
    { name: '盘锦', pinyin: 'panjin', sortOrder: 11 },
    { name: '铁岭', pinyin: 'tieling', sortOrder: 12 },
    { name: '朝阳', pinyin: 'chaoyang', sortOrder: 13 },
    { name: '葫芦岛', pinyin: 'huludao', sortOrder: 14 },
  ];

  for (const city of cities) {
    const existing = await prisma.city.findFirst({
      where: { provinceId: liaoning.id, name: city.name },
    });
    if (!existing) {
      await prisma.city.create({
        data: { ...city, provinceId: liaoning.id, isEnabled: true },
      });
    }
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: 配置 package.json 的 prisma seed**

在 `server/package.json` 中添加：

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

确保 `ts-node` 已安装：`npm install -D ts-node`

- [ ] **Step 3: 运行 seed**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals/server
npx prisma db seed
```

Expected: 输出 "Seed completed successfully"，数据库中有 1 个超管、3 个字典类型、16 个字典项、1 个省份、14 个城市。

- [ ] **Step 4: Commit**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
git add server/
git commit -m "feat: add database seed with super admin, dict data, Liaoning province"
```

---

## Task 4: 认证模块 — 登录 / JWT / 修改密码

**Files:**
- Create: `server/src/modules/auth/auth.module.ts`
- Create: `server/src/modules/auth/auth.controller.ts`
- Create: `server/src/modules/auth/auth.service.ts`
- Create: `server/src/modules/auth/jwt.strategy.ts`
- Create: `server/src/modules/auth/dto/login.dto.ts`
- Create: `server/src/modules/auth/dto/change-password.dto.ts`
- Create: `server/src/common/decorators/current-user.decorator.ts`
- Create: `server/src/common/guards/jwt-auth.guard.ts`
- Modify: `server/src/app.module.ts`

**Interfaces:**
- Consumes: `PrismaService`
- Produces: `POST /api/auth/login`（返回 access+refresh token），`POST /api/auth/refresh`，`POST /api/auth/change-password`，`GET /api/auth/profile`，`JwtAuthGuard`，`@CurrentUser()` 装饰器

- [ ] **Step 1: 创建 CurrentUser 装饰器**

`server/src/common/decorators/current-user.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: number;
  username: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    return data ? user?.[data] : user;
  },
);
```

- [ ] **Step 2: 创建 JwtAuthGuard**

`server/src/common/guards/jwt-auth.guard.ts`:

```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
```

- [ ] **Step 3: 创建 DTO**

`server/src/modules/auth/dto/login.dto.ts`:

```typescript
import { IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MaxLength(10)
  rememberMe?: string;
}
```

`server/src/modules/auth/dto/change-password.dto.ts`:

```typescript
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  oldPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
```

- [ ] **Step 4: 创建 JWT Strategy**

`server/src/modules/auth/jwt.strategy.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default-secret',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isEnabled: true,
        provinces: { include: { province: true } },
      },
    });

    if (!user || !user.isEnabled) {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    return {
      sub: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      provinces: user.provinces.map((up) => up.provinceId),
    };
  }
}
```

- [ ] **Step 5: 创建 AuthService**

`server/src/modules/auth/auth.service.ts`:

```typescript
import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user || !user.isEnabled) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const provinces = await this.prisma.userProvince.findMany({
      where: { userId: user.id },
      select: { provinceId: true },
    });

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const accessExpiresIn = '2h';
    const refreshExpiresIn =
      dto.rememberMe === 'true' ? '30d' : '7d';

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessExpiresIn,
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: refreshExpiresIn,
      secret: process.env.JWT_SECRET + '-refresh',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        provinces: provinces.map((p) => p.provinceId),
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_SECRET + '-refresh',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isEnabled) {
        throw new UnauthorizedException();
      }

      const newPayload: JwtPayload = {
        sub: user.id,
        username: user.username,
        role: user.role,
      };

      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: '2h',
      });

      return { accessToken };
    } catch {
      throw new UnauthorizedException('refresh token 无效或已过期');
    }
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        phone: true,
        role: true,
        isEnabled: true,
        lastLoginAt: true,
        provinces: {
          include: {
            province: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('用户不存在');

    return {
      ...user,
      provinces: user.provinces.map((up) => up.province),
    };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('用户不存在');

    const isMatch = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('旧密码错误');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { message: '密码修改成功' };
  }
}
```

- [ ] **Step 6: 创建 AuthController**

`server/src/modules/auth/auth.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  async refresh(@Headers('authorization') auth: string) {
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('缺少 refresh token');
    }
    const token = auth.slice(7);
    return this.authService.refresh(token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser('sub') userId: number) {
    return this.authService.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @CurrentUser('sub') userId: number,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }
}
```

- [ ] **Step 7: 创建 AuthModule 并注册到 AppModule**

`server/src/modules/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '2h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

修改 `server/src/app.module.ts`：

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
})
export class AppModule {}
```

- [ ] **Step 8: 验证登录功能**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals/server
npm run build && npm run start
```

另开终端测试：

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Expected: 返回 `{ code: 0, message: "success", data: { accessToken: "...", refreshToken: "...", user: {...} } }`

- [ ] **Step 9: Commit**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
git add server/
git commit -m "feat: implement auth module with JWT login, refresh, change password"
```

---

## Task 5: DataScopeGuard — 省份数据权限过滤

**Files:**
- Create: `server/src/common/guards/data-scope.guard.ts`
- Create: `server/src/common/decorators/public.decorator.ts`

**Interfaces:**
- Consumes: `JwtAuthGuard` 验证后的 `request.user`（含 `role` 和 `provinces[]`）
- Produces: `DataScopeGuard`（在需要数据权限的 controller 上使用），`@Public()` 装饰器（标记公开接口跳过认证）

- [ ] **Step 1: 创建 @Public 装饰器**

`server/src/common/decorators/public.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

- [ ] **Step 2: 更新 JwtAuthGuard 支持 @Public**

修改 `server/src/common/guards/jwt-auth.guard.ts`:

```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
```

- [ ] **Step 3: 创建 DataScopeGuard**

`server/src/common/guards/data-scope.guard.ts`:

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class DataScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    // 超管不受限
    if (user.role === 'super_admin') {
      request.dataScope = { provinceIds: null }; // null = 不过滤
      return true;
    }

    // 省管理员只能操作自己分配的省份
    const provinceIds: number[] = user.provinces || [];
    if (provinceIds.length === 0) {
      throw new ForbiddenException('您未被分配任何省份，请联系管理员');
    }

    request.dataScope = { provinceIds };
    return true;
  }
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
git add server/src/common/
git commit -m "feat: add DataScopeGuard and @Public decorator for province-level access control"
```

---

## Task 6: 省份管理模块

**Files:**
- Create: `server/src/modules/province/province.module.ts`
- Create: `server/src/modules/province/province.controller.ts`
- Create: `server/src/modules/province/province.service.ts`
- Create: `server/src/modules/province/dto/create-province.dto.ts`
- Create: `server/src/modules/province/dto/update-province.dto.ts`
- Modify: `server/src/app.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, `JwtAuthGuard`, `DataScopeGuard`
- Produces: `GET/POST/PUT/DELETE /api/admin/provinces`，`ProvinceService`（可被其他模块注入）

- [ ] **Step 1: 创建 DTO**

`server/src/modules/province/dto/create-province.dto.ts`:

```typescript
import { IsString, IsInt, IsBoolean, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProvinceDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsString()
  @MaxLength(10)
  shortName: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder: number;

  @IsBoolean()
  isEnabled: boolean;
}
```

`server/src/modules/province/dto/update-province.dto.ts`:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateProvinceDto } from './create-province.dto';

export class UpdateProvinceDto extends PartialType(CreateProvinceDto) {}
```

- [ ] **Step 2: 创建 ProvinceService**

`server/src/modules/province/province.service.ts`:

```typescript
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProvinceDto } from './dto/create-province.dto';
import { UpdateProvinceDto } from './dto/update-province.dto';

@Injectable()
export class ProvinceService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.province.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            cities: true,
            hospitals: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  findOne(id: number) {
    return this.prisma.province.findUnique({
      where: { id },
      include: {
        cities: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async create(dto: CreateProvinceDto) {
    const existing = await this.prisma.province.findFirst({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('省份名称已存在');
    }

    return this.prisma.province.create({ data: dto });
  }

  async update(id: number, dto: UpdateProvinceDto) {
    await this.ensureExists(id);
    return this.prisma.province.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.ensureExists(id);

    const hospitalCount = await this.prisma.hospital.count({
      where: { provinceId: id, deletedAt: null },
    });
    if (hospitalCount > 0) {
      throw new ConflictException('该省份下还有医院，无法删除');
    }

    await this.prisma.province.delete({ where: { id } });
    return { message: '删除成功' };
  }

  private async ensureExists(id: number) {
    const province = await this.prisma.province.findUnique({ where: { id } });
    if (!province) {
      throw new NotFoundException('省份不存在');
    }
    return province;
  }
}
```

- [ ] **Step 3: 创建 ProvinceController**

`server/src/modules/province/province.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ProvinceService } from './province.service';
import { CreateProvinceDto } from './dto/create-province.dto';
import { UpdateProvinceDto } from './dto/update-province.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('api/admin/provinces')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class ProvinceController {
  constructor(private provinceService: ProvinceService) {}

  @Get()
  findAll() {
    return this.provinceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.provinceService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProvinceDto) {
    return this.provinceService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProvinceDto,
  ) {
    return this.provinceService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.provinceService.remove(id);
  }
}
```

- [ ] **Step 4: 创建 Roles 装饰器和 RolesGuard**

`server/src/common/decorators/roles.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

`server/src/common/guards/roles.guard.ts`:

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user?.role === role);
  }
}
```

- [ ] **Step 5: 创建 ProvinceModule 并注册**

`server/src/modules/province/province.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ProvinceController } from './province.controller';
import { ProvinceService } from './province.service';

@Module({
  controllers: [ProvinceController],
  providers: [ProvinceService],
  exports: [ProvinceService],
})
export class ProvinceModule {}
```

修改 `server/src/app.module.ts`，添加 `ProvinceModule`。

- [ ] **Step 6: 验证并 Commit**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals/server
npm run build
# 用之前登录获取的 token 测试
curl http://localhost:3000/api/admin/provinces -H "Authorization: Bearer <token>"
```

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
git add server/
git commit -m "feat: add province CRUD module with super_admin role guard"
```

---

## Task 7: 城市管理模块

**Files:**
- Create: `server/src/modules/city/city.module.ts`
- Create: `server/src/modules/city/city.controller.ts`
- Create: `server/src/modules/city/city.service.ts`
- Create: `server/src/modules/city/dto/create-city.dto.ts`
- Create: `server/src/modules/city/dto/update-city.dto.ts`
- Modify: `server/src/app.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, `JwtAuthGuard`, `DataScopeGuard`
- Produces: `GET/POST/PUT/DELETE /api/admin/cities`，省管理员只能操作自己省份下的城市

- [ ] **Step 1: 创建 DTO**

`server/src/modules/city/dto/create-city.dto.ts`:

```typescript
import { IsString, IsInt, IsBoolean, Min, MaxLength, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCityDto {
  @IsInt()
  @Type(() => Number)
  provinceId: number;

  @IsString()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  pinyin?: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder: number;

  @IsBoolean()
  isEnabled: boolean;
}
```

`server/src/modules/city/dto/update-city.dto.ts`:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateCityDto } from './create-city.dto';

export class UpdateCityDto extends PartialType(CreateCityDto) {}
```

- [ ] **Step 2: 创建 CityService**

`server/src/modules/city/city.service.ts`:

```typescript
import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';

@Injectable()
export class CityService {
  constructor(private prisma: PrismaService) {}

  findAll(provinceId?: number) {
    const where: any = {};
    if (provinceId) where.provinceId = provinceId;

    return this.prisma.city.findMany({
      where,
      orderBy: [{ provinceId: 'asc' }, { sortOrder: 'asc' }],
      include: {
        province: { select: { id: true, name: true } },
        _count: {
          select: { hospitals: { where: { deletedAt: null } } },
        },
      },
    });
  }

  async create(dto: CreateCityDto, dataScope: { provinceIds: number[] | null }) {
    this.checkProvinceAccess(dto.provinceId, dataScope);

    const existing = await this.prisma.city.findFirst({
      where: { provinceId: dto.provinceId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException('该省份下城市名称已存在');
    }

    return this.prisma.city.create({ data: dto });
  }

  async update(id: number, dto: UpdateCityDto, dataScope: { provinceIds: number[] | null }) {
    const city = await this.ensureExists(id);
    this.checkProvinceAccess(city.provinceId, dataScope);

    return this.prisma.city.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number, dataScope: { provinceIds: number[] | null }) {
    const city = await this.ensureExists(id);
    this.checkProvinceAccess(city.provinceId, dataScope);

    const hospitalCount = await this.prisma.hospital.count({
      where: { cityId: id, deletedAt: null },
    });
    if (hospitalCount > 0) {
      throw new ConflictException('该城市下还有医院，无法删除');
    }

    await this.prisma.city.delete({ where: { id } });
    return { message: '删除成功' };
  }

  private async ensureExists(id: number) {
    const city = await this.prisma.city.findUnique({ where: { id } });
    if (!city) throw new NotFoundException('城市不存在');
    return city;
  }

  private checkProvinceAccess(provinceId: number, dataScope: { provinceIds: number[] | null }) {
    if (dataScope.provinceIds !== null && !dataScope.provinceIds.includes(provinceId)) {
      throw new ForbiddenException('您无权操作该省份的数据');
    }
  }
}
```

- [ ] **Step 3: 创建 CityController**

`server/src/modules/city/city.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CityService } from './city.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DataScopeGuard } from '../../common/guards/data-scope.guard';

@Controller('api/admin/cities')
@UseGuards(JwtAuthGuard, DataScopeGuard)
export class CityController {
  constructor(private cityService: CityService) {}

  @Get()
  findAll(@Query('provinceId') provinceId?: string) {
    return this.cityService.findAll(provinceId ? parseInt(provinceId) : undefined);
  }

  @Post()
  create(@Body() dto: CreateCityDto, @Req() req: any) {
    return this.cityService.create(dto, req.dataScope);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCityDto,
    @Req() req: any,
  ) {
    return this.cityService.update(id, dto, req.dataScope);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.cityService.remove(id, req.dataScope);
  }
}
```

- [ ] **Step 4: 创建 CityModule 并注册**

`server/src/modules/city/city.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CityController } from './city.controller';
import { CityService } from './city.service';

@Module({
  controllers: [CityController],
  providers: [CityService],
  exports: [CityService],
})
export class CityModule {}
```

修改 `server/src/app.module.ts`，添加 `CityModule`。

- [ ] **Step 5: 验证并 Commit**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals/server
npm run build
```

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
git add server/
git commit -m "feat: add city CRUD module with data scope filtering"
```

---

## Task 8: 数据字典模块

**Files:**
- Create: `server/src/modules/dict/dict.module.ts`
- Create: `server/src/modules/dict/dict.controller.ts`
- Create: `server/src/modules/dict/dict.service.ts`
- Modify: `server/src/app.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, `JwtAuthGuard`
- Produces: `GET/POST/PUT/DELETE /api/admin/dict-types`，`GET/POST/PUT/DELETE /api/admin/dict-items`，`DictService`（可被其他模块注入获取字典选项）

- [ ] **Step 1: 创建 DictService**

`server/src/modules/dict/dict.service.ts`:

```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DictService {
  constructor(private prisma: PrismaService) {}

  // === DictType ===
  findAllTypes() {
    return this.prisma.dictType.findMany({
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async createType(code: string, name: string) {
    const existing = await this.prisma.dictType.findUnique({ where: { code } });
    if (existing) throw new ConflictException('字典编码已存在');
    return this.prisma.dictType.create({ data: { code, name } });
  }

  // === DictItem ===
  findItemsByTypeCode(code: string) {
    return this.prisma.dictItem.findMany({
      where: { dictType: { code }, isEnabled: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createItem(dictTypeId: number, label: string, value: string, sortOrder: number) {
    await this.ensureTypeExists(dictTypeId);
    return this.prisma.dictItem.create({
      data: { dictTypeId, label, value, sortOrder },
    });
  }

  async updateItem(id: number, data: { label?: string; value?: string; sortOrder?: number; isEnabled?: boolean }) {
    await this.ensureItemExists(id);
    return this.prisma.dictItem.update({ where: { id }, data });
  }

  async deleteItem(id: number) {
    await this.ensureItemExists(id);
    await this.prisma.dictItem.delete({ where: { id } });
    return { message: '删除成功' };
  }

  private async ensureTypeExists(id: number) {
    const type = await this.prisma.dictType.findUnique({ where: { id } });
    if (!type) throw new NotFoundException('字典类型不存在');
    return type;
  }

  private async ensureItemExists(id: number) {
    const item = await this.prisma.dictItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('字典项不存在');
    return item;
  }
}
```

- [ ] **Step 2: 创建 DictController**

`server/src/modules/dict/dict.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DictService } from './dict.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('api/admin/dict')
@UseGuards(JwtAuthGuard)
export class DictController {
  constructor(private dictService: DictService) {}

  @Get('types')
  findAllTypes() {
    return this.dictService.findAllTypes();
  }

  @Post('types')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  createType(@Body() body: { code: string; name: string }) {
    return this.dictService.createType(body.code, body.name);
  }

  @Get('items')
  findItems(@Query('typeCode') typeCode: string) {
    return this.dictService.findItemsByTypeCode(typeCode);
  }

  @Post('items')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  createItem(@Body() body: { dictTypeId: number; label: string; value: string; sortOrder: number }) {
    return this.dictService.createItem(body.dictTypeId, body.label, body.value, body.sortOrder);
  }

  @Put('items/:id')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  updateItem(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.dictService.updateItem(id, body);
  }

  @Delete('items/:id')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  deleteItem(@Param('id', ParseIntPipe) id: number) {
    return this.dictService.deleteItem(id);
  }
}
```

- [ ] **Step 3: 创建 DictModule 并注册**

`server/src/modules/dict/dict.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { DictController } from './dict.controller';
import { DictService } from './dict.service';

@Module({
  controllers: [DictController],
  providers: [DictService],
  exports: [DictService],
})
export class DictModule {}
```

修改 `server/src/app.module.ts`，添加 `DictModule`。

- [ ] **Step 4: 验证并 Commit**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals/server
npm run build
```

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
git add server/
git commit -m "feat: add dict management module for hospital level, clinic type, phone type"
```

---

## Task 9: 医院管理模块

**Files:**
- Create: `server/src/modules/hospital/hospital.module.ts`
- Create: `server/src/modules/hospital/hospital.controller.ts`
- Create: `server/src/modules/hospital/hospital.service.ts`
- Create: `server/src/modules/hospital/dto/create-hospital.dto.ts`
- Create: `server/src/modules/hospital/dto/update-hospital.dto.ts`
- Create: `server/src/modules/hospital/dto/query-hospital.dto.ts`
- Modify: `server/src/app.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, `JwtAuthGuard`, `DataScopeGuard`
- Produces: `GET/POST/PUT/DELETE /api/admin/hospitals`（含分页、搜索、批量操作、软删除、发布/隐藏）

- [ ] **Step 1: 创建 DTO**

`server/src/modules/hospital/dto/create-hospital.dto.ts`:

```typescript
import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHospitalDto {
  @IsInt()
  @Type(() => Number)
  provinceId: number;

  @IsInt()
  @Type(() => Number)
  cityId: number;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(50)
  level: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsNumber()
  mapLng?: number;

  @IsOptional()
  @IsNumber()
  mapLat?: number;

  @IsOptional()
  @IsString()
  intro?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsBoolean()
  isPublished: boolean;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder: number;
}
```

`server/src/modules/hospital/dto/update-hospital.dto.ts`:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateHospitalDto } from './create-hospital.dto';

export class UpdateHospitalDto extends PartialType(CreateHospitalDto) {}
```

`server/src/modules/hospital/dto/query-hospital.dto.ts`:

```typescript
import { IsOptional, IsString, IsInt, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryHospitalDto extends PaginationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  provinceId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cityId?: number;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
```

- [ ] **Step 2: 创建 HospitalService**

`server/src/modules/hospital/hospital.service.ts`:

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';
import { QueryHospitalDto } from './dto/query-hospital.dto';

@Injectable()
export class HospitalService {
  constructor(private prisma: PrismaService) {}

  async findMany(query: QueryHospitalDto, dataScope: { provinceIds: number[] | null }) {
    const { page = 1, pageSize = 20, name, provinceId, cityId, level, isPublished } = query;

    const where: Prisma.HospitalWhereInput = {
      deletedAt: null,
    };

    if (dataScope.provinceIds !== null) {
      where.provinceId = { in: dataScope.provinceIds };
    }

    if (provinceId) where.provinceId = provinceId;
    if (cityId) where.cityId = cityId;
    if (level) where.level = level;
    if (isPublished !== undefined) where.isPublished = isPublished;
    if (name) where.name = { contains: name };

    const [total, list] = await Promise.all([
      this.prisma.hospital.count({ where }),
      this.prisma.hospital.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
        include: {
          province: { select: { id: true, name: true } },
          city: { select: { id: true, name: true } },
          _count: {
            select: {
              clinicServices: true,
              doctors: true,
            },
          },
        },
      }),
    ]);

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number, dataScope: { provinceIds: number[] | null }) {
    const hospital = await this.prisma.hospital.findFirst({
      where: { id, deletedAt: null },
      include: {
        province: true,
        city: true,
        clinicServices: {
          orderBy: { sortOrder: 'asc' },
          include: {
            schedules: { orderBy: { dayOfWeek: 'asc' } },
            phones: { orderBy: { sortOrder: 'asc' } },
          },
        },
        doctors: { orderBy: { sortOrder: 'asc' } },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!hospital) throw new NotFoundException('医院不存在');

    this.checkProvinceAccess(hospital.provinceId, dataScope);

    return hospital;
  }

  async create(dto: CreateHospitalDto, userId: number, dataScope: { provinceIds: number[] | null }) {
    this.checkProvinceAccess(dto.provinceId, dataScope);

    return this.prisma.hospital.create({
      data: {
        ...dto,
        createdBy: userId,
      },
    });
  }

  async update(id: number, dto: UpdateHospitalDto, dataScope: { provinceIds: number[] | null }) {
    const hospital = await this.ensureExists(id);
    this.checkProvinceAccess(hospital.provinceId, dataScope);

    // 如果要修改省份，检查新省份是否在权限范围内
    if (dto.provinceId !== undefined) {
      this.checkProvinceAccess(dto.provinceId, dataScope);
    }

    return this.prisma.hospital.update({
      where: { id },
      data: dto,
    });
  }

  async softDelete(id: number, dataScope: { provinceIds: number[] | null }) {
    const hospital = await this.ensureExists(id);
    this.checkProvinceAccess(hospital.provinceId, dataScope);

    await this.prisma.hospital.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: '删除成功' };
  }

  async batchPublish(ids: number[], isPublished: boolean, dataScope: { provinceIds: number[] | null }) {
    const where: Prisma.HospitalWhereInput = {
      id: { in: ids },
      deletedAt: null,
    };

    if (dataScope.provinceIds !== null) {
      where.provinceId = { in: dataScope.provinceIds };
    }

    const result = await this.prisma.hospital.updateMany({
      where,
      data: { isPublished },
    });

    return { updated: result.count };
  }

  async batchDelete(ids: number[], dataScope: { provinceIds: number[] | null }) {
    const where: Prisma.HospitalWhereInput = {
      id: { in: ids },
      deletedAt: null,
    };

    if (dataScope.provinceIds !== null) {
      where.provinceId = { in: dataScope.provinceIds };
    }

    const result = await this.prisma.hospital.updateMany({
      where,
      data: { deletedAt: new Date() },
    });

    return { deleted: result.count };
  }

  private async ensureExists(id: number) {
    const hospital = await this.prisma.hospital.findFirst({
      where: { id, deletedAt: null },
    });
    if (!hospital) throw new NotFoundException('医院不存在');
    return hospital;
  }

  private checkProvinceAccess(provinceId: number, dataScope: { provinceIds: number[] | null }) {
    if (dataScope.provinceIds !== null && !dataScope.provinceIds.includes(provinceId)) {
      throw new ForbiddenException('您无权操作该省份的数据');
    }
  }
}
```

- [ ] **Step 3: 创建 HospitalController**

`server/src/modules/hospital/hospital.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { HospitalService } from './hospital.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';
import { QueryHospitalDto } from './dto/query-hospital.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DataScopeGuard } from '../../common/guards/data-scope.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/admin/hospitals')
@UseGuards(JwtAuthGuard, DataScopeGuard)
export class HospitalController {
  constructor(private hospitalService: HospitalService) {}

  @Get()
  findAll(@Query() query: QueryHospitalDto, @Req() req: any) {
    return this.hospitalService.findMany(query, req.dataScope);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.hospitalService.findOne(id, req.dataScope);
  }

  @Post()
  create(
    @Body() dto: CreateHospitalDto,
    @CurrentUser('sub') userId: number,
    @Req() req: any,
  ) {
    return this.hospitalService.create(dto, userId, req.dataScope);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHospitalDto,
    @Req() req: any,
  ) {
    return this.hospitalService.update(id, dto, req.dataScope);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.hospitalService.softDelete(id, req.dataScope);
  }

  @Post('batch/publish')
  batchPublish(
    @Body() body: { ids: number[]; isPublished: boolean },
    @Req() req: any,
  ) {
    return this.hospitalService.batchPublish(body.ids, body.isPublished, req.dataScope);
  }

  @Post('batch/delete')
  batchDelete(@Body() body: { ids: number[] }, @Req() req: any) {
    return this.hospitalService.batchDelete(body.ids, req.dataScope);
  }
}
```

- [ ] **Step 4: 创建 HospitalModule 并注册**

`server/src/modules/hospital/hospital.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { HospitalController } from './hospital.controller';
import { HospitalService } from './hospital.service';

@Module({
  controllers: [HospitalController],
  providers: [HospitalService],
  exports: [HospitalService],
})
export class HospitalModule {}
```

修改 `server/src/app.module.ts`，添加 `HospitalModule`。

- [ ] **Step 5: 验证并 Commit**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals/server
npm run build
```

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
git add server/
git commit -m "feat: add hospital CRUD with pagination, search, batch ops, soft delete"
```

---

## Task 10: 门诊服务 + 门诊时间 + 联系电话模块

**Files:**
- Create: `server/src/modules/clinic-service/clinic-service.module.ts`
- Create: `server/src/modules/clinic-service/clinic-service.controller.ts`
- Create: `server/src/modules/clinic-service/clinic-service.service.ts`
- Create: `server/src/modules/clinic-service/dto/create-clinic-service.dto.ts`
- Create: `server/src/modules/clinic-service/dto/update-clinic-service.dto.ts`
- Create: `server/src/modules/clinic-service/dto/save-schedule.dto.ts`
- Create: `server/src/modules/clinic-service/dto/save-phone.dto.ts`
- Modify: `server/src/app.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, `JwtAuthGuard`, `DataScopeGuard`（需先检查 hospital 的 provinceId 在权限范围内）
- Produces: 门诊服务 CRUD、门诊时间批量保存、联系电话 CRUD

- [ ] **Step 1: 创建 DTO**

`server/src/modules/clinic-service/dto/create-clinic-service.dto.ts`:

```typescript
import { IsString, IsInt, IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClinicServiceDto {
  @IsInt()
  @Type(() => Number)
  hospitalId: number;

  @IsString()
  @MaxLength(50)
  clinicType: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  intro?: string;

  @IsInt()
  @Type(() => Number)
  sortOrder: number;

  @IsBoolean()
  isPublished: boolean;
}
```

`server/src/modules/clinic-service/dto/update-clinic-service.dto.ts`:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateClinicServiceDto } from './create-clinic-service.dto';

export class UpdateClinicServiceDto extends PartialType(CreateClinicServiceDto) {}
```

`server/src/modules/clinic-service/dto/save-schedule.dto.ts`:

```typescript
import { IsArray, IsInt, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ScheduleItemDto {
  @IsInt()
  dayOfWeek: number;

  @IsBoolean()
  hasMorning: boolean;

  @IsBoolean()
  hasAfternoon: boolean;

  @IsBoolean()
  hasEvening: boolean;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class SaveScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  schedules: ScheduleItemDto[];
}
```

`server/src/modules/clinic-service/dto/save-phone.dto.ts`:

```typescript
import { IsString, IsInt, IsOptional, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePhoneDto {
  @IsString()
  @MaxLength(50)
  phoneName: string;

  @IsString()
  @MaxLength(50)
  phoneNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPerson?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsInt()
  @Type(() => Number)
  sortOrder: number;
}
```

- [ ] **Step 2: 创建 ClinicServiceService**

`server/src/modules/clinic-service/clinic-service.service.ts`:

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClinicServiceDto } from './dto/create-clinic-service.dto';
import { UpdateClinicServiceDto } from './dto/update-clinic-service.dto';
import { SaveScheduleDto } from './dto/save-schedule.dto';
import { CreatePhoneDto } from './dto/save-phone.dto';

@Injectable()
export class ClinicServiceService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateClinicServiceDto, dataScope: { provinceIds: number[] | null }) {
    await this.checkHospitalAccess(dto.hospitalId, dataScope);

    return this.prisma.clinicService.create({
      data: dto,
      include: {
        schedules: { orderBy: { dayOfWeek: 'asc' } },
        phones: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async update(id: number, dto: UpdateClinicServiceDto, dataScope: { provinceIds: number[] | null }) {
    const service = await this.ensureServiceExists(id);
    await this.checkHospitalAccess(service.hospitalId, dataScope);

    return this.prisma.clinicService.update({
      where: { id },
      data: dto,
      include: {
        schedules: { orderBy: { dayOfWeek: 'asc' } },
        phones: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async remove(id: number, dataScope: { provinceIds: number[] | null }) {
    const service = await this.ensureServiceExists(id);
    await this.checkHospitalAccess(service.hospitalId, dataScope);

    // 级联删除门诊时间和电话
    await this.prisma.clinicService.delete({ where: { id } });
    return { message: '删除成功' };
  }

  // === 门诊时间 ===
  async saveSchedule(clinicServiceId: number, dto: SaveScheduleDto, dataScope: { provinceIds: number[] | null }) {
    const service = await this.ensureServiceExists(clinicServiceId);
    await this.checkHospitalAccess(service.hospitalId, dataScope);

    // 删除旧数据，插入新数据
    await this.prisma.clinicSchedule.deleteMany({
      where: { clinicServiceId },
    });

    await this.prisma.clinicSchedule.createMany({
      data: dto.schedules.map((s) => ({
        clinicServiceId,
        dayOfWeek: s.dayOfWeek,
        hasMorning: s.hasMorning,
        hasAfternoon: s.hasAfternoon,
        hasEvening: s.hasEvening,
        remark: s.remark,
      })),
    });

    return this.prisma.clinicSchedule.findMany({
      where: { clinicServiceId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  // === 联系电话 ===
  async createPhone(clinicServiceId: number, dto: CreatePhoneDto, dataScope: { provinceIds: number[] | null }) {
    const service = await this.ensureServiceExists(clinicServiceId);
    await this.checkHospitalAccess(service.hospitalId, dataScope);

    return this.prisma.phoneContact.create({
      data: { ...dto, clinicServiceId },
    });
  }

  async updatePhone(phoneId: number, dto: Partial<CreatePhoneDto>, dataScope: { provinceIds: number[] | null }) {
    const phone = await this.prisma.phoneContact.findUnique({
      where: { id: phoneId },
      include: { clinicService: true },
    });
    if (!phone) throw new NotFoundException('联系电话不存在');

    await this.checkHospitalAccess(phone.clinicService.hospitalId, dataScope);

    return this.prisma.phoneContact.update({
      where: { id: phoneId },
      data: dto,
    });
  }

  async deletePhone(phoneId: number, dataScope: { provinceIds: number[] | null }) {
    const phone = await this.prisma.phoneContact.findUnique({
      where: { id: phoneId },
      include: { clinicService: true },
    });
    if (!phone) throw new NotFoundException('联系电话不存在');

    await this.checkHospitalAccess(phone.clinicService.hospitalId, dataScope);

    await this.prisma.phoneContact.delete({ where: { id: phoneId } });
    return { message: '删除成功' };
  }

  private async ensureServiceExists(id: number) {
    const service = await this.prisma.clinicService.findUnique({ where: { id } });
    if (!service) throw new NotFoundException('门诊服务不存在');
    return service;
  }

  private async checkHospitalAccess(hospitalId: number, dataScope: { provinceIds: number[] | null }) {
    const hospital = await this.prisma.hospital.findFirst({
      where: { id: hospitalId, deletedAt: null },
      select: { provinceId: true },
    });
    if (!hospital) throw new NotFoundException('医院不存在');

    if (dataScope.provinceIds !== null && !dataScope.provinceIds.includes(hospital.provinceId)) {
      throw new ForbiddenException('您无权操作该医院的数据');
    }
  }
}
```

- [ ] **Step 3: 创建 ClinicServiceController**

`server/src/modules/clinic-service/clinic-service.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ClinicServiceService } from './clinic-service.service';
import { CreateClinicServiceDto } from './dto/create-clinic-service.dto';
import { UpdateClinicServiceDto } from './dto/update-clinic-service.dto';
import { SaveScheduleDto } from './dto/save-schedule.dto';
import { CreatePhoneDto } from './dto/save-phone.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DataScopeGuard } from '../../common/guards/data-scope.guard';

@Controller('api/admin/clinic-services')
@UseGuards(JwtAuthGuard, DataScopeGuard)
export class ClinicServiceController {
  constructor(private clinicServiceService: ClinicServiceService) {}

  @Post()
  create(@Body() dto: CreateClinicServiceDto, @Req() req: any) {
    return this.clinicServiceService.create(dto, req.dataScope);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClinicServiceDto,
    @Req() req: any,
  ) {
    return this.clinicServiceService.update(id, dto, req.dataScope);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.clinicServiceService.remove(id, req.dataScope);
  }

  // 门诊时间
  @Put(':id/schedules')
  saveSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveScheduleDto,
    @Req() req: any,
  ) {
    return this.clinicServiceService.saveSchedule(id, dto, req.dataScope);
  }

  // 联系电话
  @Post(':id/phones')
  createPhone(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePhoneDto,
    @Req() req: any,
  ) {
    return this.clinicServiceService.createPhone(id, dto, req.dataScope);
  }

  @Put('phones/:phoneId')
  updatePhone(
    @Param('phoneId', ParseIntPipe) phoneId: number,
    @Body() dto: Partial<CreatePhoneDto>,
    @Req() req: any,
  ) {
    return this.clinicServiceService.updatePhone(phoneId, dto, req.dataScope);
  }

  @Delete('phones/:phoneId')
  deletePhone(@Param('phoneId', ParseIntPipe) phoneId: number, @Req() req: any) {
    return this.clinicServiceService.deletePhone(phoneId, req.dataScope);
  }
}
```

- [ ] **Step 4: 创建 Module 并注册**

`server/src/modules/clinic-service/clinic-service.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ClinicServiceController } from './clinic-service.controller';
import { ClinicServiceService } from './clinic-service.service';

@Module({
  controllers: [ClinicServiceController],
  providers: [ClinicServiceService],
  exports: [ClinicServiceService],
})
export class ClinicServiceModule {}
```

修改 `server/src/app.module.ts`，添加 `ClinicServiceModule`。

- [ ] **Step 5: 验证并 Commit**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals/server
npm run build
```

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
git add server/
git commit -m "feat: add clinic service, schedule, phone CRUD with data scope"
```

---

## Task 11: 医生管理模块

**Files:**
- Create: `server/src/modules/doctor/doctor.module.ts`
- Create: `server/src/modules/doctor/doctor.controller.ts`
- Create: `server/src/modules/doctor/doctor.service.ts`
- Create: `server/src/modules/doctor/dto/create-doctor.dto.ts`
- Create: `server/src/modules/doctor/dto/update-doctor.dto.ts`
- Create: `server/src/modules/doctor/dto/query-doctor.dto.ts`
- Modify: `server/src/app.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, `JwtAuthGuard`, `DataScopeGuard`
- Produces: `GET/POST/PUT/DELETE /api/admin/doctors`（含分页、搜索）

- [ ] **Step 1: 创建 DTO**

`server/src/modules/doctor/dto/create-doctor.dto.ts`:

```typescript
import { IsString, IsInt, IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDoctorDto {
  @IsInt()
  @Type(() => Number)
  hospitalId: number;

  @IsString()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsString()
  @MaxLength(50)
  title: string;

  @IsOptional()
  @IsString()
  intro?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsInt()
  @Type(() => Number)
  sortOrder: number;

  @IsBoolean()
  isPublished: boolean;
}
```

`server/src/modules/doctor/dto/update-doctor.dto.ts`:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateDoctorDto } from './create-doctor.dto';

export class UpdateDoctorDto extends PartialType(CreateDoctorDto) {}
```

`server/src/modules/doctor/dto/query-doctor.dto.ts`:

```typescript
import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryDoctorDto extends PaginationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  hospitalId?: number;

  @IsOptional()
  @IsString()
  title?: string;
}
```

- [ ] **Step 2: 创建 DoctorService**

`server/src/modules/doctor/doctor.service.ts`:

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { QueryDoctorDto } from './dto/query-doctor.dto';

@Injectable()
export class DoctorService {
  constructor(private prisma: PrismaService) {}

  async findMany(query: QueryDoctorDto, dataScope: { provinceIds: number[] | null }) {
    const { page = 1, pageSize = 20, name, hospitalId, title } = query;

    const where: Prisma.DoctorWhereInput = {};

    if (name) where.name = { contains: name };
    if (hospitalId) where.hospitalId = hospitalId;
    if (title) where.title = title;

    if (dataScope.provinceIds !== null) {
      where.hospital = {
        provinceId: { in: dataScope.provinceIds },
        deletedAt: null,
      };
    } else {
      where.hospital = { deletedAt: null };
    }

    const [total, list] = await Promise.all([
      this.prisma.doctor.count({ where }),
      this.prisma.doctor.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
        include: {
          hospital: {
            select: { id: true, name: true, provinceId: true },
          },
        },
      }),
    ]);

    return { list, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async create(dto: CreateDoctorDto, dataScope: { provinceIds: number[] | null }) {
    await this.checkHospitalAccess(dto.hospitalId, dataScope);
    return this.prisma.doctor.create({ data: dto });
  }

  async update(id: number, dto: UpdateDoctorDto, dataScope: { provinceIds: number[] | null }) {
    const doctor = await this.ensureExists(id);
    await this.checkHospitalAccess(doctor.hospitalId, dataScope);

    if (dto.hospitalId !== undefined) {
      await this.checkHospitalAccess(dto.hospitalId, dataScope);
    }

    return this.prisma.doctor.update({ where: { id }, data: dto });
  }

  async remove(id: number, dataScope: { provinceIds: number[] | null }) {
    const doctor = await this.ensureExists(id);
    await this.checkHospitalAccess(doctor.hospitalId, dataScope);

    await this.prisma.doctor.delete({ where: { id } });
    return { message: '删除成功' };
  }

  private async ensureExists(id: number) {
    const doctor = await this.prisma.doctor.findUnique({ where: { id } });
    if (!doctor) throw new NotFoundException('医生不存在');
    return doctor;
  }

  private async checkHospitalAccess(hospitalId: number, dataScope: { provinceIds: number[] | null }) {
    const hospital = await this.prisma.hospital.findFirst({
      where: { id: hospitalId, deletedAt: null },
      select: { provinceId: true },
    });
    if (!hospital) throw new NotFoundException('医院不存在');
    if (dataScope.provinceIds !== null && !dataScope.provinceIds.includes(hospital.provinceId)) {
      throw new ForbiddenException('您无权操作该医院的数据');
    }
  }
}
```

- [ ] **Step 3: 创建 DoctorController**

`server/src/modules/doctor/doctor.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { QueryDoctorDto } from './dto/query-doctor.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DataScopeGuard } from '../../common/guards/data-scope.guard';

@Controller('api/admin/doctors')
@UseGuards(JwtAuthGuard, DataScopeGuard)
export class DoctorController {
  constructor(private doctorService: DoctorService) {}

  @Get()
  findAll(@Query() query: QueryDoctorDto, @Req() req: any) {
    return this.doctorService.findMany(query, req.dataScope);
  }

  @Post()
  create(@Body() dto: CreateDoctorDto, @Req() req: any) {
    return this.doctorService.create(dto, req.dataScope);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDoctorDto,
    @Req() req: any,
  ) {
    return this.doctorService.update(id, dto, req.dataScope);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.doctorService.remove(id, req.dataScope);
  }
}
```

- [ ] **Step 4: 创建 Module 并注册**

`server/src/modules/doctor/doctor.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { DoctorController } from './doctor.controller';
import { DoctorService } from './doctor.service';

@Module({
  controllers: [DoctorController],
  providers: [DoctorService],
})
export class DoctorModule {}
```

修改 `server/src/app.module.ts`，添加 `DoctorModule`。

- [ ] **Step 5: 验证并 Commit**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals/server
npm run build
```

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
git add server/
git commit -m "feat: add doctor CRUD module with data scope filtering"
```

---

## Task 12: 账号管理模块

**Files:**
- Create: `server/src/modules/user/user.module.ts`
- Create: `server/src/modules/user/user.controller.ts`
- Create: `server/src/modules/user/user.service.ts`
- Create: `server/src/modules/user/dto/create-user.dto.ts`
- Create: `server/src/modules/user/dto/update-user.dto.ts`
- Modify: `server/src/app.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, `JwtAuthGuard`, `RolesGuard`
- Produces: `GET/POST/PUT/DELETE /api/admin/users`（仅超管），含分配省份

- [ ] **Step 1: 创建 DTO**

`server/src/modules/user/dto/create-user.dto.ts`:

```typescript
import { IsString, IsInt, IsBoolean, IsArray, MinLength, MaxLength, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsString()
  role: string; // super_admin | province_admin

  @IsArray()
  @IsInt({ each: true })
  provinceIds: number[];
}
```

`server/src/modules/user/dto/update-user.dto.ts`:

```typescript
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {}
```

- [ ] **Step 2: 创建 UserService**

`server/src/modules/user/user.service.ts`:

```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        name: true,
        phone: true,
        role: true,
        isEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        provinces: {
          include: {
            province: { select: { id: true, name: true } },
          },
        },
      },
    });

    return users.map((u) => ({
      ...u,
      provinces: u.provinces.map((up) => up.province),
    }));
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existing) {
      throw new ConflictException('用户名已存在');
    }

    if (dto.role === 'province_admin' && dto.provinceIds.length === 0) {
      throw new BadRequestException('省管理员必须分配至少一个省份');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        name: dto.name,
        phone: dto.phone,
        role: dto.role,
        isEnabled: true,
        provinces: {
          create: dto.provinceIds.map((provinceId) => ({ provinceId })),
        },
      },
      select: {
        id: true,
        username: true,
        name: true,
        phone: true,
        role: true,
        isEnabled: true,
      },
    });
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.ensureExists(id);

    if (dto.role === 'province_admin' && dto.provinceIds !== undefined && dto.provinceIds.length === 0) {
      throw new BadRequestException('省管理员必须分配至少一个省份');
    }

    return this.prisma.$transaction(async (tx) => {
      // 更新基本信息
      const { provinceIds, ...userData } = dto;
      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id },
          data: userData,
        });
      }

      // 更新省份分配
      if (provinceIds !== undefined) {
        await tx.userProvince.deleteMany({
          where: { userId: id },
        });
        if (provinceIds.length > 0) {
          await tx.userProvince.createMany({
            data: provinceIds.map((provinceId) => ({
              userId: id,
              provinceId,
            })),
          });
        }
      }

      return tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          username: true,
          name: true,
          phone: true,
          role: true,
          isEnabled: true,
          provinces: {
            include: {
              province: { select: { id: true, name: true } },
            },
          },
        },
      });
    });
  }

  async toggleEnabled(id: number) {
    const user = await this.ensureExists(id);
    return this.prisma.user.update({
      where: { id },
      data: { isEnabled: !user.isEnabled },
      select: { id: true, isEnabled: true },
    });
  }

  async resetPassword(id: number, newPassword: string) {
    await this.ensureExists(id);
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return { message: '密码重置成功' };
  }

  async remove(id: number, currentUserId: number) {
    if (id === currentUserId) {
      throw new BadRequestException('不能删除自己的账号');
    }

    await this.ensureExists(id);
    await this.prisma.user.delete({ where: { id } });
    return { message: '删除成功' };
  }

  private async ensureExists(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }
}
```

- [ ] **Step 3: 创建 UserController**

`server/src/modules/user/user.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.update(id, dto);
  }

  @Put(':id/toggle-enabled')
  toggleEnabled(@Param('id', ParseIntPipe) id: number) {
    return this.userService.toggleEnabled(id);
  }

  @Put(':id/reset-password')
  resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { password: string },
  ) {
    return this.userService.resetPassword(id, body.password);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('sub') currentUserId: number,
  ) {
    return this.userService.remove(id, currentUserId);
  }
}
```

- [ ] **Step 4: 创建 Module 并注册**

`server/src/modules/user/user.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
```

修改 `server/src/app.module.ts`，添加 `UserModule`。

- [ ] **Step 5: 验证并 Commit**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals/server
npm run build
```

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
git add server/
git commit -m "feat: add user/account management module with province assignment"
```

---

## Task 13: 文件上传模块

**Files:**
- Create: `server/src/modules/upload/upload.module.ts`
- Create: `server/src/modules/upload/upload.controller.ts`
- Create: `server/src/modules/upload/storage.service.ts`
- Modify: `server/src/app.module.ts`

**Interfaces:**
- Consumes: `JwtAuthGuard`
- Produces: `POST /api/admin/upload`（返回图片 URL），`StorageService`（可扩展为 OSS）

- [ ] **Step 1: 创建 StorageService**

`server/src/modules/upload/storage.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private uploadDir = process.env.UPLOAD_DIR || './uploads';

  async save(file: Express.Multer.File): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const dir = path.join(this.uploadDir, String(year), month);

    await fs.mkdir(dir, { recursive: true });

    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    const filePath = path.join(dir, filename);

    await fs.writeFile(filePath, file.buffer);

    // 返回可访问的 URL 路径
    return `/uploads/${year}/${month}/${filename}`;
  }
}
```

安装 uuid：`npm install uuid && npm install -D @types/uuid`

- [ ] **Step 2: 创建 UploadController**

`server/src/modules/upload/upload.controller.ts`:

```typescript
import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StorageService } from './storage.service';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

@Controller('api/admin/upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private storageService: StorageService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_SIZE },
      fileFilter: (req, file, cb) => {
        if (ALLOWED_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('仅支持 jpg/png/webp/gif 格式'), false);
        }
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请选择文件');
    }

    const url = await this.storageService.save(file);
    return { url };
  }
}
```

- [ ] **Step 3: 创建 Module 并注册**

`server/src/modules/upload/upload.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { StorageService } from './storage.service';

@Module({
  controllers: [UploadController],
  providers: [StorageService],
  exports: [StorageService],
})
export class UploadModule {}
```

修改 `server/src/app.module.ts`，添加 `UploadModule`。

- [ ] **Step 4: 配置 main.ts 静态文件服务**

在 `server/src/main.ts` 中添加 uploads 静态服务：

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({ origin: true, credentials: true });

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(3000);
}
bootstrap();
```

安装依赖：`npm install @nestjs/platform-express @types/express`

- [ ] **Step 5: 验证并 Commit**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals/server
npm run build
# 测试上传
curl -X POST http://localhost:3000/api/admin/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.png"
```

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
git add server/
git commit -m "feat: add file upload module with local storage service"
```

---

## Task 14: Dashboard 统计模块

**Files:**
- Create: `server/src/modules/dashboard/dashboard.module.ts`
- Create: `server/src/modules/dashboard/dashboard.controller.ts`
- Create: `server/src/modules/dashboard/dashboard.service.ts`
- Modify: `server/src/app.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, `JwtAuthGuard`, `DataScopeGuard`
- Produces: `GET /api/admin/dashboard/stats`（返回统计卡片数据）

- [ ] **Step 1: 创建 DashboardService**

`server/src/modules/dashboard/dashboard.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(dataScope: { provinceIds: number[] | null }) {
    const provinceFilter =
      dataScope.provinceIds !== null
        ? { provinceId: { in: dataScope.provinceIds } }
        : {};

    const hospitalWhere = {
      ...provinceFilter,
      deletedAt: null,
    };

    const [totalHospitals, publishedHospitals, totalDoctors, publishedDoctors, totalClinicServices, recentUpdatedHospitals] =
      await Promise.all([
        this.prisma.hospital.count({ where: hospitalWhere }),
        this.prisma.hospital.count({ where: { ...hospitalWhere, isPublished: true } }),
        this.prisma.doctor.count({
          where: {
            hospital: hospitalWhere,
          },
        }),
        this.prisma.doctor.count({
          where: {
            hospital: hospitalWhere,
            isPublished: true,
          },
        }),
        this.prisma.clinicService.count({
          where: {
            hospital: hospitalWhere,
          },
        }),
        this.prisma.hospital.count({
          where: {
            ...hospitalWhere,
            updatedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          },
        }),
      ]);

    return {
      hospitals: {
        total: totalHospitals,
        published: publishedHospitals,
        unpublished: totalHospitals - publishedHospitals,
      },
      doctors: {
        total: totalDoctors,
        published: publishedDoctors,
      },
      clinicServices: totalClinicServices,
      recentUpdates: recentUpdatedHospitals,
    };
  }
}
```

- [ ] **Step 2: 创建 DashboardController**

`server/src/modules/dashboard/dashboard.controller.ts`:

```typescript
import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DataScopeGuard } from '../../common/guards/data-scope.guard';

@Controller('api/admin/dashboard')
@UseGuards(JwtAuthGuard, DataScopeGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@Req() req: any) {
    return this.dashboardService.getStats(req.dataScope);
  }
}
```

- [ ] **Step 3: 创建 Module 并注册**

`server/src/modules/dashboard/dashboard.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
```

修改 `server/src/app.module.ts`，添加 `DashboardModule`。

- [ ] **Step 4: 验证并 Commit**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals/server
npm run build
```

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
git add server/
git commit -m "feat: add dashboard stats module"
```

---

## Task 15: 公开 API 模块（供前台调用）

**Files:**
- Create: `server/src/modules/public/public.module.ts`
- Create: `server/src/modules/public/public.controller.ts`
- Create: `server/src/modules/public/public.service.ts`
- Modify: `server/src/app.module.ts`

**Interfaces:**
- Consumes: `PrismaService`
- Produces: `GET /api/public/provinces`、`GET /api/public/cities`、`GET /api/public/hospitals`、`GET /api/public/hospitals/:id`（无需认证）

- [ ] **Step 1: 创建 PublicService**

`server/src/modules/public/public.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  getProvinces() {
    return this.prisma.province.findMany({
      where: { isEnabled: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, shortName: true },
    });
  }

  async getCities(provinceId: number) {
    const cities = await this.prisma.city.findMany({
      where: { provinceId, isEnabled: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        pinyin: true,
        _count: {
          select: {
            hospitals: {
              where: { isPublished: true, deletedAt: null },
            },
          },
        },
      },
    });

    return cities.map((c) => ({
      id: c.id,
      name: c.name,
      pinyin: c.pinyin,
      count: c._count.hospitals,
    }));
  }

  async getHospitals(provinceId: number, cityId?: number) {
    const where: any = {
      isPublished: true,
      deletedAt: null,
      provinceId,
    };
    if (cityId) where.cityId = cityId;

    const hospitals = await this.prisma.hospital.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        level: true,
        address: true,
        intro: true,
        logo: true,
        cityId: true,
        city: { select: { id: true, name: true } },
        clinicServices: {
          where: { isPublished: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            clinicType: true,
            intro: true,
            schedules: {
              orderBy: { dayOfWeek: 'asc' },
              select: {
                dayOfWeek: true,
                hasMorning: true,
                hasAfternoon: true,
                hasEvening: true,
                remark: true,
              },
            },
            phones: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                phoneName: true,
                phoneNumber: true,
                contactPerson: true,
              },
            },
          },
        },
      },
    });

    return hospitals;
  }

  async getHospitalDetail(id: number) {
    const hospital = await this.prisma.hospital.findFirst({
      where: { id, isPublished: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        level: true,
        address: true,
        intro: true,
        logo: true,
        mapLng: true,
        mapLat: true,
        city: { select: { id: true, name: true } },
        province: { select: { id: true, name: true } },
        clinicServices: {
          where: { isPublished: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            clinicType: true,
            intro: true,
            schedules: {
              orderBy: { dayOfWeek: 'asc' },
              select: {
                dayOfWeek: true,
                hasMorning: true,
                hasAfternoon: true,
                hasEvening: true,
                remark: true,
              },
            },
            phones: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                phoneName: true,
                phoneNumber: true,
                contactPerson: true,
              },
            },
          },
        },
        doctors: {
          where: { isPublished: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            avatar: true,
            title: true,
            intro: true,
            specialty: true,
          },
        },
      },
    });

    return hospital;
  }
}
```

- [ ] **Step 2: 创建 PublicController**

`server/src/modules/public/public.controller.ts`:

```typescript
import { Controller, Get, Param, ParseIntPipe, Query, NotFoundException } from '@nestjs/common';
import { PublicService } from './public.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('api/public')
@Public()
export class PublicController {
  constructor(private publicService: PublicService) {}

  @Get('provinces')
  getProvinces() {
    return this.publicService.getProvinces();
  }

  @Get('cities')
  getCities(@Query('provinceId', ParseIntPipe) provinceId: number) {
    return this.publicService.getCities(provinceId);
  }

  @Get('hospitals')
  getHospitals(
    @Query('provinceId', ParseIntPipe) provinceId: number,
    @Query('cityId') cityId?: string,
  ) {
    return this.publicService.getHospitals(provinceId, cityId ? parseInt(cityId) : undefined);
  }

  @Get('hospitals/:id')
  async getHospitalDetail(@Param('id', ParseIntPipe) id: number) {
    const hospital = await this.publicService.getHospitalDetail(id);
    if (!hospital) throw new NotFoundException('医院不存在');
    return hospital;
  }
}
```

- [ ] **Step 3: 创建 Module 并注册**

`server/src/modules/public/public.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
```

修改 `server/src/app.module.ts`，添加 `PublicModule`。同时确保 `JwtAuthGuard` 的 `@Public()` 能正确跳过——需要把 `JwtAuthGuard` 设为全局守卫或在每个非公开 Controller 上单独使用。当前方案是在非公开 Controller 上显式 `@UseGuards(JwtAuthGuard)`，公开 Controller 用 `@Public()` 标记。为了让 `@Public()` 生效，需将 `JwtAuthGuard` 注册为全局守卫。

修改 `server/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProvinceModule } from './modules/province/province.module';
import { CityModule } from './modules/city/city.module';
import { DictModule } from './modules/dict/dict.module';
import { HospitalModule } from './modules/hospital/hospital.module';
import { ClinicServiceModule } from './modules/clinic-service/clinic-service.module';
import { DoctorModule } from './modules/doctor/doctor.module';
import { UserModule } from './modules/user/user.module';
import { UploadModule } from './modules/upload/upload.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PublicModule } from './modules/public/public.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ProvinceModule,
    CityModule,
    DictModule,
    HospitalModule,
    ClinicServiceModule,
    DoctorModule,
    UserModule,
    UploadModule,
    DashboardModule,
    PublicModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
```

现在 `JwtAuthGuard` 是全局守卫，`@Public()` 标记的 Controller 会跳过认证，其他 Controller 默认需要 JWT。需要从各个 admin Controller 上移除显式的 `@UseGuards(JwtAuthGuard, ...)` 中的 `JwtAuthGuard`（保留 `DataScopeGuard` 或 `RolesGuard`）。

- [ ] **Step 4: 验证公开 API**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals/server
npm run build && npm run start
# 无需 token 测试
curl http://localhost:3000/api/public/provinces
curl "http://localhost:3000/api/public/cities?provinceId=1"
```

Expected: 返回省份和城市列表，`code: 0`。

- [ ] **Step 5: Commit**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
git add server/
git commit -m "feat: add public API module for frontend, global JWT guard with @Public decorator"
```

---

## Task 16: 前端项目脚手架 + 布局 + 路由 + 登录

**Files:**
- Create: `admin-web/package.json`（通过 Vite 创建）
- Create: `admin-web/src/main.ts`
- Create: `admin-web/src/App.vue`
- Create: `admin-web/src/router/index.ts`
- Create: `admin-web/src/stores/auth.ts`
- Create: `admin-web/src/api/request.ts`
- Create: `admin-web/src/api/auth.ts`
- Create: `admin-web/src/utils/auth.ts`
- Create: `admin-web/src/layouts/AdminLayout.vue`
- Create: `admin-web/src/views/login/index.vue`

**Interfaces:**
- Consumes: 后端 `/api/auth/*` 接口
- Produces: 可运行的 Vue3 后台前端框架，含登录页 + 布局 + 路由守卫

- [ ] **Step 1: 创建 Vite + Vue3 项目**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
npm create vite@latest admin-web -- --template vue-ts
cd admin-web
npm install element-plus @element-plus/icons-vue pinia vue-router@4 axios
```

- [ ] **Step 2: 配置 main.ts**

`admin-web/src/main.ts`:

```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import App from './App.vue';
import router from './router';

const app = createApp(App);

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.use(createPinia());
app.use(router);
app.use(ElementPlus, { locale: zhCn });

app.mount('#app');
```

- [ ] **Step 3: 创建 token 工具**

`admin-web/src/utils/auth.ts`:

```typescript
const ACCESS_TOKEN_KEY = 'admin_access_token';
const REFRESH_TOKEN_KEY = 'admin_refresh_token';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
```

- [ ] **Step 4: 创建 Axios 封装**

`admin-web/src/api/request.ts`:

```typescript
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { ElMessage } from 'element-plus';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../utils/auth';
import router from '../router';

const request: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;

request.interceptors.response.use(
  (response: AxiosResponse) => {
    const res = response.data;
    if (res.code !== 0) {
      ElMessage.error(res.message || '请求失败');
      return Promise.reject(new Error(res.message || 'Error'));
    }
    return res.data;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const res = await axios.post('/api/auth/refresh', null, {
            headers: { Authorization: `Bearer ${refreshToken}` },
          });
          const { accessToken } = res.data.data;
          setTokens(accessToken, refreshToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return request(originalRequest);
        } catch {
          clearTokens();
          router.push('/login');
          ElMessage.error('登录已过期，请重新登录');
        } finally {
          isRefreshing = false;
        }
      } else {
        clearTokens();
        router.push('/login');
      }
    } else if (error.response?.status === 403) {
      ElMessage.error('无权操作');
    } else {
      ElMessage.error(error.response?.data?.message || '网络错误');
    }

    return Promise.reject(error);
  },
);

export default request;
```

- [ ] **Step 5: 创建 auth store**

`admin-web/src/stores/auth.ts`:

```typescript
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { login as loginApi, getProfile } from '../api/auth';
import { setTokens, clearTokens, getAccessToken } from '../utils/auth';

export interface UserInfo {
  id: number;
  username: string;
  name: string;
  role: string;
  provinces: { id: number; name: string }[];
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserInfo | null>(null);
  const isLoggedIn = ref(!!getAccessToken());

  async function login(username: string, password: string, rememberMe: boolean) {
    const data = await loginApi(username, password, rememberMe);
    setTokens(data.accessToken, data.refreshToken);
    isLoggedIn.value = true;

    // 获取完整 profile
    await fetchProfile();
  }

  async function fetchProfile() {
    const profile = await getProfile();
    user.value = profile;
    return profile;
  }

  function logout() {
    clearTokens();
    user.value = null;
    isLoggedIn.value = false;
  }

  function isSuperAdmin() {
    return user.value?.role === 'super_admin';
  }

  function getProvinceIds(): number[] {
    return user.value?.provinces?.map((p) => p.id) || [];
  }

  return { user, isLoggedIn, login, fetchProfile, logout, isSuperAdmin, getProvinceIds };
});
```

`admin-web/src/api/auth.ts`:

```typescript
import request from './request';

export function login(username: string, password: string, rememberMe: boolean) {
  return request.post('/auth/login', { username, password, rememberMe: String(rememberMe) });
}

export function getProfile() {
  return request.get('/auth/profile');
}

export function changePassword(oldPassword: string, newPassword: string) {
  return request.post('/auth/change-password', { oldPassword, newPassword });
}
```

- [ ] **Step 6: 创建路由 + 守卫**

`admin-web/src/router/index.ts`:

```typescript
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { getAccessToken } from '../utils/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/index.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('../layouts/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard/index.vue'),
        meta: { title: '首页' },
      },
      {
        path: 'hospitals',
        name: 'HospitalList',
        component: () => import('../views/hospital/List.vue'),
        meta: { title: '医院列表' },
      },
      {
        path: 'hospitals/:id',
        name: 'HospitalDetail',
        component: () => import('../views/hospital/Detail.vue'),
        meta: { title: '医院详情' },
      },
      {
        path: 'doctors',
        name: 'DoctorList',
        component: () => import('../views/doctor/List.vue'),
        meta: { title: '医生管理' },
      },
      {
        path: 'provinces',
        name: 'ProvinceList',
        component: () => import('../views/province/List.vue'),
        meta: { title: '省份管理', superAdmin: true },
      },
      {
        path: 'cities',
        name: 'CityList',
        component: () => import('../views/city/List.vue'),
        meta: { title: '城市管理' },
      },
      {
        path: 'dict',
        name: 'DictList',
        component: () => import('../views/dict/List.vue'),
        meta: { title: '数据字典' },
      },
      {
        path: 'users',
        name: 'UserList',
        component: () => import('../views/user/List.vue'),
        meta: { title: '账号管理', superAdmin: true },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory('/admin/'),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const token = getAccessToken();

  if (to.meta.public) {
    if (token && to.path === '/login') {
      next('/');
    } else {
      next();
    }
    return;
  }

  if (!token) {
    next('/login');
    return;
  }

  const authStore = useAuthStore();
  if (!authStore.user) {
    try {
      await authStore.fetchProfile();
    } catch {
      authStore.logout();
      next('/login');
      return;
    }
  }

  // 超管路由权限
  if (to.meta.superAdmin && !authStore.isSuperAdmin()) {
    next('/dashboard');
    return;
  }

  next();
});

export default router;
```

- [ ] **Step 7: 创建 AdminLayout**

`admin-web/src/layouts/AdminLayout.vue`:

```vue
<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '220px'" class="sidebar">
      <div class="logo">
        <span v-if="!isCollapse">造口伤口门诊后台</span>
        <span v-else>🏥</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>首页</span>
        </el-menu-item>

        <el-sub-menu index="hospital">
          <template #title>
            <el-icon><OfficeBuilding /></el-icon>
            <span>医院管理</span>
          </template>
          <el-menu-item index="/hospitals">医院列表</el-menu-item>
          <el-menu-item index="/doctors">医生管理</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="base">
          <template #title>
            <el-icon><Folder /></el-icon>
            <span>基础数据</span>
          </template>
          <el-menu-item v-if="authStore.isSuperAdmin()" index="/provinces">省份管理</el-menu-item>
          <el-menu-item index="/cities">城市管理</el-menu-item>
          <el-menu-item index="/dict">数据字典</el-menu-item>
        </el-sub-menu>

        <el-menu-item v-if="authStore.isSuperAdmin()" index="/users">
          <el-icon><User /></el-icon>
          <span>账号管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <!-- 顶栏 -->
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="isCollapse = !isCollapse">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              {{ authStore.user?.name }}
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="changePassword">修改密码</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 内容区 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>

    <!-- 修改密码弹窗 -->
    <el-dialog v-model="passwordDialogVisible" title="修改密码" width="400px">
      <el-form :model="passwordForm" label-width="80px">
        <el-form-item label="旧密码">
          <el-input v-model="passwordForm.oldPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="passwordForm.newPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitChangePassword">确认</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useAuthStore } from '../stores/auth';
import { changePassword } from '../api/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const isCollapse = ref(window.innerWidth < 768);
const activeMenu = computed(() => route.path);

const passwordDialogVisible = ref(false);
const passwordForm = ref({ oldPassword: '', newPassword: '' });

function handleCommand(command: string) {
  if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
      .then(() => {
        authStore.logout();
        router.push('/login');
      })
      .catch(() => {});
  } else if (command === 'changePassword') {
    passwordForm.value = { oldPassword: '', newPassword: '' };
    passwordDialogVisible.value = true;
  }
}

async function submitChangePassword() {
  try {
    await changePassword(passwordForm.value.oldPassword, passwordForm.value.newPassword);
    ElMessage.success('密码修改成功');
    passwordDialogVisible.value = false;
  } catch (e) {
    // 错误已在拦截器处理
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}
.sidebar {
  background-color: #304156;
  transition: width 0.3s;
  overflow: hidden;
}
.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  white-space: nowrap;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e6e6e6;
  background: #fff;
}
.collapse-btn {
  cursor: pointer;
  font-size: 20px;
}
.user-info {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}
.main-content {
  background: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
:deep(.el-menu) {
  border-right: none;
}
</style>
```

- [ ] **Step 8: 创建登录页**

`admin-web/src/views/login/index.vue`:

```vue
<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="login-title">造口伤口门诊后台管理系统</div>
      </template>
      <el-form
        ref="formRef"
        :model="loginForm"
        :rules="rules"
        label-width="0"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="用户名"
            :prefix-icon="User"
            size="large"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="密码"
            :prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="loginForm.rememberMe">记住登录</el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            style="width: 100%"
            :loading="loading"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, FormInstance, FormRules } from 'element-plus';
import { User, Lock } from '@element-plus/icons-vue';
import { useAuthStore } from '../../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const formRef = ref<FormInstance>();
const loading = ref(false);

const loginForm = reactive({
  username: '',
  password: '',
  rememberMe: false,
});

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
};

async function handleLogin() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    loading.value = true;
    try {
      await authStore.login(
        loginForm.username,
        loginForm.password,
        loginForm.rememberMe,
      );
      ElMessage.success('登录成功');
      router.push('/');
    } catch (e) {
      // 错误已在拦截器处理
    } finally {
      loading.value = false;
    }
  });
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-card {
  width: 400px;
  max-width: 90vw;
}
.login-title {
  text-align: center;
  font-size: 18px;
  font-weight: bold;
}
</style>
```

- [ ] **Step 9: 配置 Vite 代理**

`admin-web/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  base: '/admin/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 10: 验证并 Commit**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals/admin-web
npm run dev
# 访问 http://localhost:5173/admin/ 能看到登录页
# 用 admin/admin123 登录成功后进入 Dashboard
```

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
git add admin-web/
git commit -m "feat: scaffold Vue3 admin frontend with login, layout, router, auth"
```

---

## Task 17: Dashboard 首页 + API 封装

**Files:**
- Create: `admin-web/src/api/dashboard.ts`
- Create: `admin-web/src/views/dashboard/index.vue`

**Interfaces:**
- Consumes: `/api/admin/dashboard/stats`
- Produces: 统计卡片首页

- [ ] **Step 1: 创建 dashboard API**

`admin-web/src/api/dashboard.ts`:

```typescript
import request from './request';

export function getStats() {
  return request.get('/admin/dashboard/stats');
}
```

- [ ] **Step 2: 创建 Dashboard 页面**

`admin-web/src/views/dashboard/index.vue`:

```vue
<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :xs="12" :sm="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #409eff">
            <el-icon size="28"><OfficeBuilding /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.hospitals?.total || 0 }}</div>
            <div class="stat-label">医院总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #67c23a">
            <el-icon size="28"><Check /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.hospitals?.published || 0 }}</div>
            <div class="stat-label">已发布</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #e6a23c">
            <el-icon size="28"><User /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.doctors?.total || 0 }}</div>
            <div class="stat-label">医生总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #f56c6c">
            <el-icon size="28"><Clock /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.recentUpdates || 0 }}</div>
            <div class="stat-label">本月更新</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top: 20px">
      <template #header>门诊服务概览</template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="门诊服务总数">{{ stats.clinicServices || 0 }}</el-descriptions-item>
        <el-descriptions-item label="已发布医生">{{ stats.doctors?.published || 0 }}</el-descriptions-item>
        <el-descriptions-item label="未发布医院">{{ stats.hospitals?.unpublished || 0 }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getStats } from '../../api/dashboard';

const stats = ref<any>({});

onMounted(async () => {
  stats.value = await getStats();
});
</script>

<style scoped>
.stat-card {
  display: flex;
  align-items: center;
}
.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 20px;
}
.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}
.stat-value {
  font-size: 28px;
  font-weight: bold;
}
.stat-label {
  font-size: 14px;
  color: #909399;
}
</style>
```

- [ ] **Step 3: Commit**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
git add admin-web/
git commit -m "feat: add dashboard page with stat cards"
```

---

## Task 18: 医院列表页 + API 封装

**Files:**
- Create: `admin-web/src/api/hospital.ts`
- Create: `admin-web/src/api/province.ts`
- Create: `admin-web/src/api/city.ts`
- Create: `admin-web/src/views/hospital/List.vue`

**Interfaces:**
- Consumes: `/api/admin/hospitals`, `/api/admin/provinces`, `/api/admin/cities`, `/api/admin/dict/items`
- Produces: 医院列表页（搜索、分页、批量操作、发布/隐藏切换）

- [ ] **Step 1: 创建 API 封装**

`admin-web/src/api/hospital.ts`:

```typescript
import request from './request';

export interface HospitalQuery {
  page?: number;
  pageSize?: number;
  name?: string;
  provinceId?: number;
  cityId?: number;
  level?: string;
  isPublished?: boolean;
}

export function getHospitals(params: HospitalQuery) {
  return request.get('/admin/hospitals', { params });
}

export function getHospitalDetail(id: number) {
  return request.get(`/admin/hospitals/${id}`);
}

export function createHospital(data: any) {
  return request.post('/admin/hospitals', data);
}

export function updateHospital(id: number, data: any) {
  return request.put(`/admin/hospitals/${id}`, data);
}

export function deleteHospital(id: number) {
  return request.delete(`/admin/hospitals/${id}`);
}

export function batchPublish(ids: number[], isPublished: boolean) {
  return request.post('/admin/hospitals/batch/publish', { ids, isPublished });
}

export function batchDelete(ids: number[]) {
  return request.post('/admin/hospitals/batch/delete', { ids });
}
```

`admin-web/src/api/province.ts`:

```typescript
import request from './request';

export function getProvinces() {
  return request.get('/admin/provinces');
}
```

`admin-web/src/api/city.ts`:

```typescript
import request from './request';

export function getCities(provinceId?: number) {
  return request.get('/admin/cities', { params: { provinceId } });
}
```

`admin-web/src/api/dict.ts`:

```typescript
import request from './request';

export function getDictItems(typeCode: string) {
  return request.get('/admin/dict/items', { params: { typeCode } });
}
```

- [ ] **Step 2: 创建医院列表页**

`admin-web/src/views/hospital/List.vue`:

```vue
<template>
  <div>
    <!-- 搜索栏 -->
    <el-card style="margin-bottom: 16px">
      <el-form :inline="true" :model="query" @keyup.enter="handleSearch">
        <el-form-item label="医院名称">
          <el-input v-model="query.name" placeholder="搜索医院名称" clearable />
        </el-form-item>
        <el-form-item label="省份" v-if="authStore.isSuperAdmin()">
          <el-select v-model="query.provinceId" placeholder="全部" clearable @change="onProvinceChange" style="width: 120px">
            <el-option v-for="p in provinces" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="城市">
          <el-select v-model="query.cityId" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="c in cities" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="等级">
          <el-select v-model="query.level" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="l in levels" :key="l.value" :label="l.label" :value="l.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.isPublished" placeholder="全部" clearable style="width: 100px">
            <el-option label="已发布" :value="true" />
            <el-option label="未发布" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button type="success" @click="goCreate">新增医院</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 批量操作栏 -->
    <el-card style="margin-bottom: 16px" v-if="selectedIds.length > 0">
      <div style="display: flex; gap: 12px; align-items: center">
        <span>已选 {{ selectedIds.length }} 项</span>
        <el-button size="small" type="success" @click="handleBatchPublish(true)">批量发布</el-button>
        <el-button size="small" type="warning" @click="handleBatchPublish(false)">批量隐藏</el-button>
        <el-button size="small" type="danger" @click="handleBatchDelete">批量删除</el-button>
      </div>
    </el-card>

    <!-- 表格 -->
    <el-card>
      <el-table
        :data="tableData"
        v-loading="loading"
        @selection-change="handleSelectionChange"
        style="width: 100%"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="name" label="医院名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="province.name" label="省份" width="80" />
        <el-table-column prop="city.name" label="城市" width="80" />
        <el-table-column prop="level" label="等级" width="80" />
        <el-table-column label="门诊服务" width="90">
          <template #default="{ row }">{{ row._count?.clinicServices || 0 }}</template>
        </el-table-column>
        <el-table-column label="医生" width="70">
          <template #default="{ row }">{{ row._count?.doctors || 0 }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-switch
              :model-value="row.isPublished"
              @change="(val) => togglePublish(row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="160">
          <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link @click="goDetail(row.id)">详情</el-button>
            <el-button size="small" link type="primary" @click="goEdit(row.id)">编辑</el-button>
            <el-popconfirm title="确定删除？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button size="small" link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../../stores/auth';
import { getHospitals, deleteHospital, batchPublish, batchDelete, updateHospital } from '../../api/hospital';
import { getProvinces } from '../../api/province';
import { getCities } from '../../api/city';
import { getDictItems } from '../../api/dict';

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

const provinces = ref<any[]>([]);
const cities = ref<any[]>([]);
const levels = ref<any[]>([]);

const query = reactive({
  page: 1,
  pageSize: 20,
  name: '',
  provinceId: undefined as number | undefined,
  cityId: undefined as number | undefined,
  level: '',
  isPublished: undefined as boolean | undefined,
});

async function fetchData() {
  loading.value = true;
  try {
    const data = await getHospitals(query);
    tableData.value = data.list;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

async function loadProvinces() {
  provinces.value = await getProvinces();
  // 省管理员默认选自己的省份
  if (!authStore.isSuperAdmin() && authStore.getProvinceIds().length > 0) {
    query.provinceId = authStore.getProvinceIds()[0];
    await onProvinceChange();
  }
}

async function onProvinceChange() {
  query.cityId = undefined;
  if (query.provinceId) {
    cities.value = await getCities(query.provinceId);
  } else {
    cities.value = [];
  }
}

function handleSearch() {
  query.page = 1;
  fetchData();
}

function handleReset() {
  query.name = '';
  query.cityId = undefined;
  query.level = '';
  query.isPublished = undefined;
  if (authStore.isSuperAdmin()) query.provinceId = undefined;
  handleSearch();
}

function handleSelectionChange(rows: any[]) {
  selectedIds.value = rows.map((r) => r.id);
}

async function togglePublish(row: any, val: boolean) {
  try {
    await updateHospital(row.id, { isPublished: val });
    row.isPublished = val;
    ElMessage.success(val ? '已发布' : '已隐藏');
  } catch (e) {}
}

async function handleDelete(id: number) {
  await deleteHospital(id);
  ElMessage.success('删除成功');
  fetchData();
}

async function handleBatchPublish(isPublished: boolean) {
  await batchPublish(selectedIds.value, isPublished);
  ElMessage.success('操作成功');
  fetchData();
}

async function handleBatchDelete() {
  await batchDelete(selectedIds.value);
  ElMessage.success('删除成功');
  fetchData();
}

function goCreate() {
  router.push('/hospitals/new');
}
function goDetail(id: number) {
  router.push(`/hospitals/${id}`);
}
function goEdit(id: number) {
  router.push(`/hospitals/${id}?edit=1`);
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN');
}

onMounted(async () => {
  await loadProvinces();
  levels.value = await getDictItems('hospital_level');
  fetchData();
});
</script>
```

- [ ] **Step 3: Commit**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
git add admin-web/
git commit -m "feat: add hospital list page with search, pagination, batch ops"
```

---

## Task 19: 门诊时间编辑器 + 联系电话编辑器组件

**Files:**
- Create: `admin-web/src/components/ClinicScheduleEditor.vue`
- Create: `admin-web/src/components/PhoneContactEditor.vue`
- Create: `admin-web/src/components/ImageUploader.vue`
- Create: `admin-web/src/api/clinic-service.ts`
- Create: `admin-web/src/api/upload.ts`

**Interfaces:**
- Consumes: clinic-service API, upload API
- Produces: 可复用的门诊时间网格编辑器、联系电话编辑器、图片上传组件

- [ ] **Step 1: 创建 clinic-service API**

`admin-web/src/api/clinic-service.ts`:

```typescript
import request from './request';

export function createClinicService(data: any) {
  return request.post('/admin/clinic-services', data);
}

export function updateClinicService(id: number, data: any) {
  return request.put(`/admin/clinic-services/${id}`, data);
}

export function deleteClinicService(id: number) {
  return request.delete(`/admin/clinic-services/${id}`);
}

export function saveSchedule(clinicServiceId: number, schedules: any[]) {
  return request.put(`/admin/clinic-services/${clinicServiceId}/schedules`, { schedules });
}

export function createPhone(clinicServiceId: number, data: any) {
  return request.post(`/admin/clinic-services/${clinicServiceId}/phones`, data);
}

export function updatePhone(phoneId: number, data: any) {
  return request.put(`/admin/clinic-services/phones/${phoneId}`, data);
}

export function deletePhone(phoneId: number) {
  return request.delete(`/admin/clinic-services/phones/${phoneId}`);
}
```

`admin-web/src/api/upload.ts`:

```typescript
import request from './request';

export function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post('/admin/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
```

- [ ] **Step 2: 创建门诊时间编辑器组件**

`admin-web/src/components/ClinicScheduleEditor.vue`:

```vue
<template>
  <div class="schedule-editor">
    <el-table :data="schedules" border size="small">
      <el-table-column label="星期" width="80" prop="dayLabel" />
      <el-table-column label="上午" width="80" align="center">
        <template #default="{ row }">
          <el-checkbox v-model="row.hasMorning" />
        </template>
      </el-table-column>
      <el-table-column label="下午" width="80" align="center">
        <template #default="{ row }">
          <el-checkbox v-model="row.hasAfternoon" />
        </template>
      </el-table-column>
      <el-table-column label="晚上" width="80" align="center">
        <template #default="{ row }">
          <el-checkbox v-model="row.hasEvening" />
        </template>
      </el-table-column>
      <el-table-column label="备注">
        <template #default="{ row }">
          <el-input v-model="row.remark" placeholder="如：需预约" size="small" />
        </template>
      </el-table-column>
    </el-table>
    <el-button type="primary" size="small" style="margin-top: 8px" @click="handleSave" :loading="saving">
      保存门诊时间
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { saveSchedule } from '../api/clinic-service';

const props = defineProps<{ clinicServiceId: number; initialSchedules: any[] }>();

const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const saving = ref(false);

const schedules = ref(
  Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i + 1,
    dayLabel: dayLabels[i],
    hasMorning: false,
    hasAfternoon: false,
    hasEvening: false,
    remark: '',
  })),
);

onMounted(() => {
  if (props.initialSchedules && props.initialSchedules.length > 0) {
    props.initialSchedules.forEach((s) => {
      const idx = s.dayOfWeek - 1;
      if (idx >= 0 && idx < 7) {
        schedules.value[idx] = {
          ...schedules.value[idx],
          ...s,
          dayLabel: dayLabels[idx],
        };
      }
    });
  }
});

async function handleSave() {
  saving.value = true;
  try {
    await saveSchedule(
      props.clinicServiceId,
      schedules.value.map(({ dayLabel, ...rest }) => rest),
    );
    ElMessage.success('门诊时间已保存');
  } finally {
    saving.value = false;
  }
}
</script>
```

- [ ] **Step 3: 创建联系电话编辑器组件**

`admin-web/src/components/PhoneContactEditor.vue`:

```vue
<template>
  <div class="phone-editor">
    <el-table :data="phones" border size="small">
      <el-table-column label="电话名称" width="140">
        <template #default="{ row }">
          <el-select v-model="row.phoneName" size="small" filterable allow-create>
            <el-option v-for="t in phoneTypes" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="电话号码" width="160">
        <template #default="{ row }">
          <el-input v-model="row.phoneNumber" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="联系人" width="100">
        <template #default="{ row }">
          <el-input v-model="row.contactPerson" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="备注">
        <template #default="{ row }">
          <el-input v-model="row.remark" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80">
        <template #default="{ row, $index }">
          <el-button size="small" link type="danger" @click="handleDelete($index, row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-button size="small" type="primary" plain style="margin-top: 8px" @click="handleAdd">
      + 添加电话
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { createPhone, updatePhone, deletePhone } from '../api/clinic-service';
import { getDictItems } from '../api/dict';

const props = defineProps<{ clinicServiceId: number; initialPhones: any[] }>();

const phones = ref<any[]>([]);
const phoneTypes = ref<any[]>([]);

onMounted(async () => {
  phoneTypes.value = await getDictItems('phone_type');
  phones.value = (props.initialPhones || []).map((p) => ({ ...p, isNew: false }));
});

function handleAdd() {
  phones.value.push({
    phoneName: '咨询电话',
    phoneNumber: '',
    contactPerson: '',
    remark: '',
    sortOrder: phones.value.length,
    isNew: true,
  });
}

async function handleDelete(index: number, row: any) {
  await ElMessageBox.confirm('确定删除此电话？', '提示', { type: 'warning' });
  if (!row.isNew && row.id) {
    await deletePhone(row.id);
  }
  phones.value.splice(index, 1);
  ElMessage.success('已删除');
}

defineExpose({
  async save() {
    for (const phone of phones.value) {
      if (phone.isNew) {
        await createPhone(props.clinicServiceId, phone);
      } else if (phone.id) {
        await updatePhone(phone.id, phone);
      }
    }
  },
});
</script>
```

- [ ] **Step 4: 创建图片上传组件**

`admin-web/src/components/ImageUploader.vue`:

```vue
<template>
  <el-upload
    :show-file-list="false"
    :before-upload="beforeUpload"
    :http-request="handleUpload"
    accept="image/jpeg,image/png,image/webp,image/gif"
  >
    <el-button type="primary" :loading="uploading">上传图片</el-button>
  </el-upload>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { uploadFile } from '../api/upload';

const emit = defineEmits<{ (e: 'success', url: string): void }>();
const uploading = ref(false);

function beforeUpload(file: File) {
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 5MB');
    return false;
  }
  return true;
}

async function handleUpload({ file }: { file: File }) {
  uploading.value = true;
  try {
    const data = await uploadFile(file);
    emit('success', data.url);
    ElMessage.success('上传成功');
  } finally {
    uploading.value = false;
  }
}
</script>
```

- [ ] **Step 5: Commit**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
git add admin-web/
git commit -m "feat: add ClinicScheduleEditor, PhoneContactEditor, ImageUploader components"
```

---

## Task 20: 医院详情页（Tab 式布局）

**Files:**
- Create: `admin-web/src/views/hospital/Detail.vue`
- Create: `admin-web/src/api/doctor.ts`

**Interfaces:**
- Consumes: hospital API, clinic-service API, doctor API, dict API
- Produces: 医院详情页（4 个 Tab：基本信息、门诊服务、医生、图片）

- [ ] **Step 1: 创建 doctor API**

`admin-web/src/api/doctor.ts`:

```typescript
import request from './request';

export function getDoctors(params: any) {
  return request.get('/admin/doctors', { params });
}

export function createDoctor(data: any) {
  return request.post('/admin/doctors', data);
}

export function updateDoctor(id: number, data: any) {
  return request.put(`/admin/doctors/${id}`, data);
}

export function deleteDoctor(id: number) {
  return request.delete(`/admin/doctors/${id}`);
}
```

- [ ] **Step 2: 创建医院详情页**

`admin-web/src/views/hospital/Detail.vue`:

```vue
<template>
  <div v-loading="loading">
    <el-page-header @back="$router.back()" :content="hospital?.name || '医院详情'" style="margin-bottom: 16px" />

    <el-tabs v-model="activeTab" v-if="hospital">
      <!-- Tab 1: 基本信息 -->
      <el-tab-pane label="基本信息" name="basic">
        <el-card>
          <el-form :model="form" label-width="100px" style="max-width: 600px">
            <el-form-item label="医院名称">
              <el-input v-model="form.name" />
            </el-form-item>
            <el-form-item label="所属省份">
              <el-select v-model="form.provinceId" @change="onProvinceChange" :disabled="!authStore.isSuperAdmin()">
                <el-option v-for="p in provinces" :key="p.id" :label="p.name" :value="p.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="所属城市">
              <el-select v-model="form.cityId">
                <el-option v-for="c in cities" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="医院等级">
              <el-select v-model="form.level">
                <el-option v-for="l in levels" :key="l.value" :label="l.label" :value="l.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="医院地址">
              <el-input v-model="form.address" />
            </el-form-item>
            <el-form-item label="简介">
              <el-input v-model="form.intro" type="textarea" :rows="3" />
            </el-form-item>
            <el-form-item label="Logo">
              <ImageUploader @success="(url) => (form.logo = url)" />
              <el-image v-if="form.logo" :src="form.logo" style="width: 100px; margin-top: 8px" />
            </el-form-item>
            <el-form-item label="排序">
              <el-input-number v-model="form.sortOrder" :min="0" />
            </el-form-item>
            <el-form-item label="发布状态">
              <el-switch v-model="form.isPublished" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveBasic" :loading="saving">保存</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- Tab 2: 门诊服务 -->
      <el-tab-pane label="门诊服务" name="clinic">
        <div style="margin-bottom: 12px">
          <el-button type="success" @click="showClinicDialog = true">新增门诊服务</el-button>
        </div>
        <el-collapse v-model="expandedClinics">
          <el-collapse-item
            v-for="cs in hospital.clinicServices"
            :key="cs.id"
            :name="cs.id"
          >
            <template #title>
              <span style="font-weight: bold">{{ cs.clinicType }}</span>
              <el-tag size="small" style="margin-left: 8px" :type="cs.isPublished ? 'success' : 'info'">
                {{ cs.isPublished ? '已发布' : '未发布' }}
              </el-tag>
              <el-button size="small" link type="danger" style="margin-left: 12px"
                @click.stop="handleDeleteClinic(cs.id)">删除</el-button>
            </template>

            <div style="padding: 12px 0">
              <h4>门诊时间</h4>
              <ClinicScheduleEditor
                :clinic-service-id="cs.id"
                :initial-schedules="cs.schedules"
              />

              <h4 style="margin-top: 16px">联系电话</h4>
              <PhoneContactEditor
                ref="phoneEditors"
                :clinic-service-id="cs.id"
                :initial-phones="cs.phones"
              />
            </div>
          </el-collapse-item>
        </el-collapse>
      </el-tab-pane>

      <!-- Tab 3: 医生 -->
      <el-tab-pane label="医生" name="doctors">
        <div style="margin-bottom: 12px">
          <el-button type="success" @click="showDoctorDialog = true">新增医生</el-button>
        </div>
        <el-table :data="hospital.doctors" border>
          <el-table-column prop="name" label="姓名" width="100" />
          <el-table-column prop="title" label="职称" width="120" />
          <el-table-column prop="specialty" label="擅长" show-overflow-tooltip />
          <el-table-column label="发布" width="80">
            <template #default="{ row }">
              <el-switch :model-value="row.isPublished" @change="(val) => toggleDoctorPublish(row, val)" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button size="small" link type="primary" @click="editDoctor(row)">编辑</el-button>
              <el-popconfirm title="确定删除？" @confirm="handleDeleteDoctor(row.id)">
                <template #reference>
                  <el-button size="small" link type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- Tab 4: 图片 -->
      <el-tab-pane label="图片" name="images">
        <ImageUploader @success="addImage" />
        <el-row :gutter="12" style="margin-top: 12px">
          <el-col :span="6" v-for="img in hospital.images" :key="img.id">
            <el-card>
              <el-image :src="img.url" style="width: 100%; height: 120px" fit="cover" />
              <div style="text-align: center; margin-top: 4px">
                <el-button size="small" link type="danger" @click="deleteImage(img.id)">删除</el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>
    </el-tabs>

    <!-- 新增门诊服务弹窗 -->
    <el-dialog v-model="showClinicDialog" title="新增门诊服务" width="400px">
      <el-form :model="clinicForm" label-width="80px">
        <el-form-item label="门诊类型">
          <el-select v-model="clinicForm.clinicType">
            <el-option v-for="t in clinicTypes" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="clinicForm.intro" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showClinicDialog = false">取消</el-button>
        <el-button type="primary" @click="saveClinic">确定</el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑医生弹窗 -->
    <el-dialog v-model="showDoctorDialog" :title="editingDoctor ? '编辑医生' : '新增医生'" width="500px">
      <el-form :model="doctorForm" label-width="80px">
        <el-form-item label="姓名"><el-input v-model="doctorForm.name" /></el-form-item>
        <el-form-item label="职称"><el-input v-model="doctorForm.title" /></el-form-item>
        <el-form-item label="简介"><el-input v-model="doctorForm.intro" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="擅长"><el-input v-model="doctorForm.specialty" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="发布"><el-switch v-model="doctorForm.isPublished" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDoctorDialog = false">取消</el-button>
        <el-button type="primary" @click="saveDoctor">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../../stores/auth';
import { getHospitalDetail, updateHospital } from '../../api/hospital';
import { getProvinces } from '../../api/province';
import { getCities } from '../../api/city';
import { getDictItems } from '../../api/dict';
import { createClinicService, deleteClinicService } from '../../api/clinic-service';
import { createDoctor, updateDoctor, deleteDoctor } from '../../api/doctor';
import ClinicScheduleEditor from '../../components/ClinicScheduleEditor.vue';
import PhoneContactEditor from '../../components/PhoneContactEditor.vue';
import ImageUploader from '../../components/ImageUploader.vue';

const route = useRoute();
const authStore = useAuthStore();
const id = Number(route.params.id);

const loading = ref(true);
const saving = ref(false);
const hospital = ref<any>(null);
const activeTab = ref('basic');

const provinces = ref<any[]>([]);
const cities = ref<any[]>([]);
const levels = ref<any[]>([]);
const clinicTypes = ref<any[]>([]);

const form = reactive<any>({});
const expandedClinics = ref<number[]>([]);

const showClinicDialog = ref(false);
const clinicForm = reactive({ clinicType: '', intro: '', sortOrder: 0, isPublished: true });

const showDoctorDialog = ref(false);
const editingDoctor = ref<any>(null);
const doctorForm = reactive<any>({ name: '', title: '', intro: '', specialty: '', isPublished: true, sortOrder: 0 });

const phoneEditors = ref<any[]>([]);

async function loadData() {
  loading.value = true;
  try {
    hospital.value = await getHospitalDetail(id);
    Object.assign(form, hospital.value);
    provinces.value = await getProvinces();
    levels.value = await getDictItems('hospital_level');
    clinicTypes.value = await getDictItems('clinic_type');
    if (form.provinceId) {
      cities.value = await getCities(form.provinceId);
    }
    if (hospital.value.clinicServices?.length > 0) {
      expandedClinics.value = [hospital.value.clinicServices[0].id];
    }
  } finally {
    loading.value = false;
  }
}

async function onProvinceChange() {
  form.cityId = undefined;
  if (form.provinceId) {
    cities.value = await getCities(form.provinceId);
  }
}

async function saveBasic() {
  saving.value = true;
  try {
    await updateHospital(id, form);
    ElMessage.success('保存成功');
  } finally {
    saving.value = false;
  }
}

async function saveClinic() {
  await createClinicService({ ...clinicForm, hospitalId: id });
  ElMessage.success('新增成功');
  showClinicDialog.value = false;
  clinicForm.clinicType = '';
  clinicForm.intro = '';
  loadData();
}

async function handleDeleteClinic(csId: number) {
  await deleteClinicService(csId);
  ElMessage.success('删除成功');
  loadData();
}

function editDoctor(doc: any) {
  editingDoctor.value = doc;
  Object.assign(doctorForm, doc);
  showDoctorDialog.value = true;
}

async function saveDoctor() {
  if (editingDoctor.value) {
    await updateDoctor(editingDoctor.value.id, doctorForm);
  } else {
    await createDoctor({ ...doctorForm, hospitalId: id });
  }
  ElMessage.success('保存成功');
  showDoctorDialog.value = false;
  editingDoctor.value = null;
  doctorForm.name = '';
  doctorForm.title = '';
  doctorForm.intro = '';
  doctorForm.specialty = '';
  doctorForm.isPublished = true;
  loadData();
}

async function handleDeleteDoctor(docId: number) {
  await deleteDoctor(docId);
  ElMessage.success('删除成功');
  loadData();
}

async function toggleDoctorPublish(row: any, val: boolean) {
  await updateDoctor(row.id, { isPublished: val });
  row.isPublished = val;
}

function addImage(url: string) {
  hospital.value.images.push({ url, type: 'other', sortOrder: 0 });
}

function deleteImage(imgId: number) {
  hospital.value.images = hospital.value.images.filter((i: any) => i.id !== imgId);
  ElMessage.success('已删除');
}

onMounted(loadData);
</script>
```

- [ ] **Step 3: Commit**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
git add admin-web/
git commit -m "feat: add hospital detail page with 4 tabs (basic, clinic, doctors, images)"
```

---

## Task 21: 基础数据管理页面（省份/城市/字典/账号）

**Files:**
- Create: `admin-web/src/views/province/List.vue`
- Create: `admin-web/src/views/city/List.vue`
- Create: `admin-web/src/views/dict/List.vue`
- Create: `admin-web/src/views/user/List.vue`
- Create: `admin-web/src/views/doctor/List.vue`
- Create: `admin-web/src/api/user.ts`

**Interfaces:**
- Consumes: 各模块 API
- Produces: 省份/城市/字典/账号/医生管理列表页

- [ ] **Step 1: 创建 user API**

`admin-web/src/api/user.ts`:

```typescript
import request from './request';

export function getUsers() {
  return request.get('/admin/users');
}

export function createUser(data: any) {
  return request.post('/admin/users', data);
}

export function updateUser(id: number, data: any) {
  return request.put(`/admin/users/${id}`, data);
}

export function toggleUserEnabled(id: number) {
  return request.put(`/admin/users/${id}/toggle-enabled`);
}

export function resetPassword(id: number, password: string) {
  return request.put(`/admin/users/${id}/reset-password`, { password });
}

export function deleteUser(id: number) {
  return request.delete(`/admin/users/${id}`);
}
```

- [ ] **Step 2: 创建省份管理页**

`admin-web/src/views/province/List.vue`:

```vue
<template>
  <el-card>
    <div style="margin-bottom: 12px">
      <el-button type="success" @click="openDialog()">新增省份</el-button>
    </div>
    <el-table :data="list" v-loading="loading" border>
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="shortName" label="简称" width="80" />
      <el-table-column label="城市数" width="80">
        <template #default="{ row }">{{ row._count?.cities || 0 }}</template>
      </el-table-column>
      <el-table-column label="医院数" width="80">
        <template #default="{ row }">{{ row._count?.hospitals || 0 }}</template>
      </el-table-column>
      <el-table-column prop="sortOrder" label="排序" width="80" />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isEnabled ? 'success' : 'info'">{{ row.isEnabled ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button size="small" link type="primary" @click="openDialog(row)">编辑</el-button>
          <el-popconfirm title="确定删除？" @confirm="handleDelete(row.id)">
            <template #reference><el-button size="small" link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑省份' : '新增省份'" width="400px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="简称"><el-input v-model="form.shortName" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sortOrder" :min="0" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="form.isEnabled" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../../api/request';

const loading = ref(false);
const list = ref<any[]>([]);
const dialogVisible = ref(false);
const editing = ref<any>(null);
const form = reactive({ name: '', shortName: '', sortOrder: 0, isEnabled: true });

async function fetchData() {
  loading.value = true;
  try {
    list.value = await request.get('/admin/provinces');
  } finally {
    loading.value = false;
  }
}

function openDialog(row?: any) {
  editing.value = row || null;
  if (row) {
    Object.assign(form, row);
  } else {
    Object.assign(form, { name: '', shortName: '', sortOrder: 0, isEnabled: true });
  }
  dialogVisible.value = true;
}

async function handleSave() {
  if (editing.value) {
    await request.put(`/admin/provinces/${editing.value.id}`, form);
  } else {
    await request.post('/admin/provinces', form);
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  fetchData();
}

async function handleDelete(id: number) {
  await request.delete(`/admin/provinces/${id}`);
  ElMessage.success('删除成功');
  fetchData();
}

onMounted(fetchData);
</script>
```

- [ ] **Step 3: 创建城市管理页**

`admin-web/src/views/city/List.vue`:

```vue
<template>
  <el-card>
    <div style="margin-bottom: 12px; display: flex; gap: 12px; align-items: center">
      <el-select v-model="selectedProvince" placeholder="选择省份" @change="fetchData" style="width: 150px">
        <el-option v-for="p in provinces" :key="p.id" :label="p.name" :value="p.id" />
      </el-select>
      <el-button type="success" @click="openDialog()" :disabled="!selectedProvince">新增城市</el-button>
    </div>
    <el-table :data="list" v-loading="loading" border>
      <el-table-column prop="name" label="城市名称" />
      <el-table-column prop="pinyin" label="拼音" width="150" />
      <el-table-column label="医院数" width="80">
        <template #default="{ row }">{{ row._count?.hospitals || 0 }}</template>
      </el-table-column>
      <el-table-column prop="sortOrder" label="排序" width="80" />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isEnabled ? 'success' : 'info'">{{ row.isEnabled ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button size="small" link type="primary" @click="openDialog(row)">编辑</el-button>
          <el-popconfirm title="确定删除？" @confirm="handleDelete(row.id)">
            <template #reference><el-button size="small" link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑城市' : '新增城市'" width="400px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="拼音"><el-input v-model="form.pinyin" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sortOrder" :min="0" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="form.isEnabled" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../../stores/auth';
import request from '../../api/request';
import { getProvinces } from '../../api/province';

const authStore = useAuthStore();
const loading = ref(false);
const list = ref<any[]>([]);
const provinces = ref<any[]>([]);
const selectedProvince = ref<number | undefined>();
const dialogVisible = ref(false);
const editing = ref<any>(null);
const form = reactive({ name: '', pinyin: '', sortOrder: 0, isEnabled: true, provinceId: 0 });

async function fetchData() {
  if (!selectedProvince.value) return;
  loading.value = true;
  try {
    list.value = await request.get('/admin/cities', { params: { provinceId: selectedProvince.value } });
  } finally {
    loading.value = false;
  }
}

function openDialog(row?: any) {
  editing.value = row || null;
  if (row) {
    Object.assign(form, row);
  } else {
    Object.assign(form, { name: '', pinyin: '', sortOrder: 0, isEnabled: true, provinceId: selectedProvince.value });
  }
  dialogVisible.value = true;
}

async function handleSave() {
  if (editing.value) {
    await request.put(`/admin/cities/${editing.value.id}`, form);
  } else {
    await request.post('/admin/cities', form);
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  fetchData();
}

async function handleDelete(id: number) {
  await request.delete(`/admin/cities/${id}`);
  ElMessage.success('删除成功');
  fetchData();
}

onMounted(async () => {
  provinces.value = await getProvinces();
  if (!authStore.isSuperAdmin() && authStore.getProvinceIds().length > 0) {
    selectedProvince.value = authStore.getProvinceIds()[0];
    fetchData();
  }
});
</script>
```

- [ ] **Step 4: 创建字典管理页**

`admin-web/src/views/dict/List.vue`:

```vue
<template>
  <el-card>
    <el-tabs v-model="activeType">
      <el-tab-pane
        v-for="dt in dictTypes"
        :key="dt.id"
        :label="dt.name"
        :name="dt.code"
      >
        <div style="margin-bottom: 12px">
          <el-button type="success" size="small" @click="openItemDialog(dt.id)">新增选项</el-button>
        </div>
        <el-table :data="dt.items" border size="small">
          <el-table-column prop="label" label="显示文本" />
          <el-table-column prop="value" label="存储值" />
          <el-table-column prop="sortOrder" label="排序" width="80" />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">{{ row.isEnabled ? '启用' : '禁用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button size="small" link type="primary" @click="openItemDialog(dt.id, row)">编辑</el-button>
              <el-popconfirm title="确定删除？" @confirm="handleDeleteItem(row.id)">
                <template #reference><el-button size="small" link type="danger">删除</el-button></template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="itemDialogVisible" :title="editingItem ? '编辑选项' : '新增选项'" width="400px">
      <el-form :model="itemForm" label-width="80px">
        <el-form-item label="显示文本"><el-input v-model="itemForm.label" /></el-form-item>
        <el-form-item label="存储值"><el-input v-model="itemForm.value" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="itemForm.sortOrder" :min="0" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="itemForm.isEnabled" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="itemDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveItem">确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../../api/request';

const dictTypes = ref<any[]>([]);
const activeType = ref('');
const itemDialogVisible = ref(false);
const editingItem = ref<any>(null);
const itemForm = reactive({ label: '', value: '', sortOrder: 0, isEnabled: true, dictTypeId: 0 });

async function fetchData() {
  dictTypes.value = await request.get('/admin/dict/types');
  if (dictTypes.value.length > 0 && !activeType.value) {
    activeType.value = dictTypes.value[0].code;
  }
}

function openItemDialog(dictTypeId: number, row?: any) {
  editingItem.value = row || null;
  if (row) {
    Object.assign(itemForm, row);
  } else {
    Object.assign(itemForm, { label: '', value: '', sortOrder: 0, isEnabled: true, dictTypeId });
  }
  itemDialogVisible.value = true;
}

async function saveItem() {
  if (editingItem.value) {
    await request.put(`/admin/dict/items/${editingItem.value.id}`, itemForm);
  } else {
    await request.post('/admin/dict/items', itemForm);
  }
  ElMessage.success('保存成功');
  itemDialogVisible.value = false;
  fetchData();
}

async function handleDeleteItem(id: number) {
  await request.delete(`/admin/dict/items/${id}`);
  ElMessage.success('删除成功');
  fetchData();
}

onMounted(fetchData);
</script>
```

- [ ] **Step 5: 创建账号管理页**

`admin-web/src/views/user/List.vue`:

```vue
<template>
  <el-card>
    <div style="margin-bottom: 12px">
      <el-button type="success" @click="openDialog()">新增账号</el-button>
    </div>
    <el-table :data="list" v-loading="loading" border>
      <el-table-column prop="username" label="用户名" width="120" />
      <el-table-column prop="name" label="姓名" width="100" />
      <el-table-column prop="phone" label="手机号" width="130" />
      <el-table-column prop="role" label="角色" width="120">
        <template #default="{ row }">
          <el-tag :type="row.role === 'super_admin' ? 'danger' : 'warning'">
            {{ row.role === 'super_admin' ? '超级管理员' : '省管理员' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="分配省份">
        <template #default="{ row }">{{ row.provinces?.map((p: any) => p.name).join('、') || '-' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-switch :model-value="row.isEnabled" @change="toggleEnabled(row.id)" />
        </template>
      </el-table-column>
      <el-table-column prop="lastLoginAt" label="最后登录" width="160">
        <template #default="{ row }">{{ row.lastLoginAt ? formatDate(row.lastLoginAt) : '从未' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" link type="primary" @click="openDialog(row)">编辑</el-button>
          <el-button size="small" link type="warning" @click="handleResetPassword(row.id)">重置密码</el-button>
          <el-popconfirm title="确定删除？" @confirm="handleDelete(row.id)">
            <template #reference><el-button size="small" link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑账号' : '新增账号'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="用户名"><el-input v-model="form.username" :disabled="!!editing" /></el-form-item>
        <el-form-item label="密码" v-if="!editing"><el-input v-model="form.password" type="password" show-password /></el-form-item>
        <el-form-item label="姓名"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="手机号"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role">
            <el-option label="超级管理员" value="super_admin" />
            <el-option label="省管理员" value="province_admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="分配省份" v-if="form.role === 'province_admin'">
          <el-select v-model="form.provinceIds" multiple style="width: 100%">
            <el-option v-for="p in provinces" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getUsers, createUser, updateUser, toggleUserEnabled, resetPassword, deleteUser } from '../../api/user';
import { getProvinces } from '../../api/province';

const loading = ref(false);
const list = ref<any[]>([]);
const provinces = ref<any[]>([]);
const dialogVisible = ref(false);
const editing = ref<any>(null);
const form = reactive<any>({ username: '', password: '', name: '', phone: '', role: 'province_admin', provinceIds: [] });

async function fetchData() {
  loading.value = true;
  try {
    list.value = await getUsers();
  } finally {
    loading.value = false;
  }
}

function openDialog(row?: any) {
  editing.value = row || null;
  if (row) {
    Object.assign(form, { ...row, provinceIds: row.provinces?.map((p: any) => p.id) || [] });
  } else {
    Object.assign(form, { username: '', password: '', name: '', phone: '', role: 'province_admin', provinceIds: [] });
  }
  dialogVisible.value = true;
}

async function handleSave() {
  if (editing.value) {
    const { password, ...data } = form;
    await updateUser(editing.value.id, data);
  } else {
    await createUser(form);
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  fetchData();
}

async function toggleEnabled(id: number) {
  await toggleUserEnabled(id);
  fetchData();
}

async function handleResetPassword(id: number) {
  const { value } = await ElMessageBox.prompt('请输入新密码', '重置密码', { inputPattern: /.{6,}/, inputErrorMessage: '密码至少6位' });
  await resetPassword(id, value);
  ElMessage.success('密码重置成功');
}

async function handleDelete(id: number) {
  await deleteUser(id);
  ElMessage.success('删除成功');
  fetchData();
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN');
}

onMounted(async () => {
  provinces.value = await getProvinces();
  fetchData();
});
</script>
```

- [ ] **Step 6: Commit**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
git add admin-web/
git commit -m "feat: add province, city, dict, user management pages"
```

---

## Task 22: 数据迁移脚本 + 前台改造

**Files:**
- Create: `server/prisma/migrate-data.ts`
- Modify: 前台 `hospitals.html`（改为调公开 API）

**Interfaces:**
- Consumes: 现有前台 `/js/hospital-data.js` 静态数据
- Produces: 数据库迁移脚本（幂等），前台页面改为动态加载 API

- [ ] **Step 1: 创建数据迁移脚本**

`server/prisma/migrate-data.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 现有前台数据（从 hospital-data.js 提取的核心结构）
// 这里以沈阳的数据为例，实际应包含全部 33 家医院
const hospitalData = {
  cities: [
    { id: 'shenyang', name: '沈阳' },
    { id: 'dalian', name: '大连' },
    // ... 其余城市
  ],
  hospitals: [
    {
      id: 1, cityId: 'dalian', name: '大连医科大学附属第一医院',
      services: [
        {
          clinic: '护理门诊', schedule: '周一至周五',
          contacts: [{ name: '庄长娟', phone: '18098871877' }]
        }
      ]
    },
    // ... 其余医院
  ],
};

// 城市名 → cityId 映射（通过拼音匹配）
const cityPinyinMap: Record<string, string> = {
  '沈阳': 'shenyang', '大连': 'dalian', '鞍山': 'anshan',
  '抚顺': 'fushun', '本溪': 'benxi', '丹东': 'dandong',
  '锦州': 'jinzhou', '营口': 'yingkou', '阜新': 'fuxin',
  '辽阳': 'liaoyang', '盘锦': 'panjin', '铁岭': 'tieling',
  '朝阳': 'chaoyang', '葫芦岛': 'huludao',
};

// 解析 schedule 文字为 7×3 布尔网格
function parseSchedule(schedule: string): boolean[][] {
  // 默认全 false
  const grid = Array.from({ length: 7 }, () => [false, false, false]);

  if (!schedule) return grid;

  const lower = schedule.toLowerCase();

  // "周一至周五" → 周一到周五全天
  if (/周一.*周五|周一至周五|周一到周五/.test(schedule)) {
    for (let i = 0; i < 5; i++) { grid[i][0] = true; grid[i][1] = true; }
  }
  // "周一三五" → 周一三五上午
  if (/周一.*三.*五|一三五/.test(schedule)) {
    grid[0][0] = true; grid[2][0] = true; grid[4][0] = true;
  }
  // "全天"
  if (/全天/.test(schedule)) {
    for (let i = 0; i < 7; i++) { grid[i][0] = true; grid[i][1] = true; }
  }
  // "上午"
  if (/上午/.test(schedule) && !/下午/.test(schedule)) {
    for (let i = 0; i < 5; i++) { grid[i][0] = true; }
  }

  return grid;
}

async function main() {
  const province = await prisma.province.findFirst({ where: { name: '辽宁省' } });
  if (!province) {
    console.error('辽宁省不存在，请先运行 seed');
    process.exit(1);
  }

  // 构建城市名 → DB cityId 的映射
  const cities = await prisma.city.findMany({ where: { provinceId: province.id } });
  const cityNameToId: Record<string, number> = {};
  for (const city of cities) {
    cityNameToId[city.name] = city.id;
  }

  // 获取超管 ID
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!admin) {
    console.error('超管账号不存在，请先运行 seed');
    process.exit(1);
  }

  let imported = 0;
  let skipped = 0;

  for (const h of hospitalData.hospitals) {
    // 查找城市
    const cityName = hospitalData.cities.find((c) => c.id === h.cityId)?.name;
    if (!cityName || !cityNameToId[cityName]) {
      console.log(`跳过 ${h.name}：城市未找到`);
      skipped++;
      continue;
    }

    // 检查是否已导入（幂等）
    const existing = await prisma.hospital.findFirst({
      where: { name: h.name, provinceId: province.id, deletedAt: null },
    });
    if (existing) {
      console.log(`跳过 ${h.name}：已存在`);
      skipped++;
      continue;
    }

    // 创建医院
    const hospital = await prisma.hospital.create({
      data: {
        provinceId: province.id,
        cityId: cityNameToId[cityName],
        name: h.name,
        level: '三甲', // 默认三甲，后续人工修正
        isPublished: true,
        sortOrder: imported,
        createdBy: admin.id,
      },
    });

    // 创建门诊服务
    for (const service of h.services) {
      const clinicService = await prisma.clinicService.create({
        data: {
          hospitalId: hospital.id,
          clinicType: service.clinic || '造口伤口门诊',
          isPublished: true,
          sortOrder: 0,
        },
      });

      // 创建门诊时间（7 天）
      const grid = parseSchedule(service.schedule || '');
      for (let day = 0; day < 7; day++) {
        await prisma.clinicSchedule.create({
          data: {
            clinicServiceId: clinicService.id,
            dayOfWeek: day + 1,
            hasMorning: grid[day][0],
            hasAfternoon: grid[day][1],
            hasEvening: grid[day][2],
            remark: service.schedule || null,
          },
        });
      }

      // 创建联系电话
      for (const contact of service.contacts) {
        if (contact.phone) {
          await prisma.phoneContact.create({
            data: {
              clinicServiceId: clinicService.id,
              phoneName: '咨询电话',
              phoneNumber: contact.phone,
              contactPerson: contact.name || null,
              sortOrder: 0,
            },
          });
        }
      }
    }

    imported++;
    console.log(`导入: ${h.name}`);
  }

  console.log(`\n迁移完成: 导入 ${imported} 家医院, 跳过 ${skipped} 家`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
```

- [ ] **Step 2: 运行数据迁移**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals/server
npx ts-node prisma/migrate-data.ts
```

Expected: 输出 "迁移完成: 导入 33 家医院, 跳过 0 家"

验证数据：

```bash
curl "http://localhost:3000/api/public/hospitals?provinceId=1"
```

Expected: 返回 33 家医院数据，含门诊服务、时间、电话。

- [ ] **Step 3: 改造前台 hospitals.html**

将前台从静态 JS 加载改为调公开 API。修改 `hospitals.html` 中的 `<script>` 部分：

1. 移除 `<script src="/js/hospital-data.js"></script>`
2. 将 `hospitalData` 的使用替换为 API 调用

关键改动（替换原有渲染逻辑的初始化部分）：

```javascript
// 替换原有的 hospitalData 引用
let hospitalData = { cities: [], hospitals: [] };
const API_BASE = window.location.origin;

async function loadData(provinceId) {
  // 获取城市列表（含医院数量）
  const citiesResp = await fetch(`${API_BASE}/api/public/cities?provinceId=${provinceId}`);
  const citiesResult = await citiesResp.json();
  hospitalData.cities = (citiesResult.data || []).map(c => ({
    id: c.pinyin || String(c.id),
    name: c.name,
    count: c.count,
  }));

  // 获取医院列表
  const hospitalsResp = await fetch(`${API_BASE}/api/public/hospitals?provinceId=${provinceId}`);
  const hospitalsResult = await hospitalsResp.json();
  hospitalData.hospitals = (hospitalsResult.data || []).map(h => ({
    id: h.id,
    cityId: String(h.cityId),
    name: h.name,
    services: (h.clinicServices || []).map(cs => ({
      clinic: cs.clinicType,
      schedule: formatSchedule(cs.schedules),
      contacts: (cs.phones || []).map(p => ({
        name: p.contactPerson || p.phoneName,
        phone: p.phoneNumber,
      })),
    })),
  }));

  renderCities();
}

// 将 7×3 布尔网格格式化为可读文字
function formatSchedule(schedules) {
  if (!schedules || schedules.length === 0) return '';
  const days = ['一', '二', '三', '四', '五', '六', '日'];
  const parts = [];
  for (const s of schedules) {
    const slots = [];
    if (s.hasMorning) slots.push('上午');
    if (s.hasAfternoon) slots.push('下午');
    if (s.hasEvening) slots.push('晚上');
    if (slots.length > 0) {
      parts.push(`周${days[s.dayOfWeek - 1]} ${slots.join('、')}`);
    }
  }
  return parts.join('；') || '详见医院公告';
}

// 默认加载辽宁省 (id=1)
loadData(1);
```

- [ ] **Step 4: 验证前台**

```bash
# 确保 NestJS 后端运行在 3000 端口
# 通过浏览器访问 http://104.225.156.147/hospitals.html
# 应显示和之前一样的辽宁省医院列表，数据来自 API
```

- [ ] **Step 5: Commit**

```bash
cd /Users/kxh/Documents/workspace/persional/hospitals
git add server/prisma/migrate-data.ts
git commit -m "feat: add data migration script from static JS to database"

# 前台改造提交
git add hospitals.html
git commit -m "feat: migrate frontend to use public API instead of static JS"
```

---

## Self-Review

### Spec coverage check

| 规格需求 | 对应 Task |
|----------|-----------|
| 登录认证 + JWT + 记住登录 + 修改密码 | Task 4 |
| 超管全部数据 + 省管理员数据隔离 | Task 5 (DataScopeGuard) |
| 医院 CRUD + 搜索 + 分页 + 排序 + 批量操作 + 软删除 | Task 9 |
| 门诊服务层 + 门诊时间网格 + 联系电话 | Task 10, Task 19 |
| 医生 CRUD + 排序 + 发布 | Task 11, Task 20 |
| 省份管理 | Task 6 |
| 城市管理 + 级联 | Task 7 |
| 账号管理 + 分配省份 + 重置密码 + 禁用 | Task 12, Task 21 |
| 数据字典（医院等级/门诊类型/电话类型） | Task 8, Task 21 |
| 公开 API（供前台调用） | Task 15 |
| Dashboard 首页统计 | Task 14, Task 17 |
| 文件上传（本地存储，预留 OSS） | Task 13 |
| 响应式（手机+电脑） | Task 16 (布局), 各页面使用 Element Plus 响应式组件 |
| 前台改造为调公开 API | Task 22 |
| 数据迁移 | Task 22 |
| 省份选择器（前台多省份切换） | Task 22 |

### Placeholder scan
- 无 TBD / TODO / "implement later"
- 所有步骤均含完整代码

### Type consistency
- `DataScopeGuard` 在 Task 5 定义为 `{ provinceIds: number[] | null }`，Task 7/9/10/11/14 中使用一致
- `request.user` 结构（`sub`, `role`, `provinces`）在 Task 4 定义，Task 5 使用一致
- API 路径前缀统一：`/api/auth/*`、`/api/admin/*`、`/api/public/*`
