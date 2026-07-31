# 造口伤口门诊名录后台管理系统 — 设计文档

> 日期：2026-07-31
> 状态：待审阅

## 一、项目背景

现有前台页面 `http://104.225.156.147/hospitals.html` 展示辽宁省 14 个地市的造口伤口门诊信息，数据以静态 JS 文件 (`/js/hospital-data.js`) 存储，共 33 家医院。

前台数据结构：`城市 → 医院 → 门诊服务[] → {门诊类型, 出诊时间(文字), 联系电话[]}`。

本项目需构建 SaaS 多租户后台管理系统，支持多省份扩展、多账号分省管理，并提供公开 API 供前台动态获取数据。

## 二、系统角色

| 角色 | 权限范围 |
|------|----------|
| 超级管理员 (super_admin) | 查看所有省份数据；医院/医生/门诊/电话 CRUD；省份/城市管理；账号管理及省份分配；发布/隐藏 |
| 省管理员 (province_admin) | 仅查看和操作自己被分配省份的数据；医院/医生/门诊/电话 CRUD；发布/隐藏 |

数据权限通过 `UserProvince` 多对多关联表实现。省管理员登录后，所有查询自动按 `province_id` 过滤。一个省管理员可被分配多个省份。

## 三、技术架构

```
前台页面（公开 API 消费）          后台前端（Vue3 + Element Plus）
        │                                    │
        │ HTTP                                │ Axios + JWT
        ▼                                    ▼
              NestJS REST API（统一后端）
                        │
                   Prisma ORM
                        │
                     MySQL 8
```

### 技术栈

| 层 | 技术 |
|----|------|
| 后台前端 | Vue 3 + TypeScript + Vite + Element Plus + Pinia + Vue Router |
| 后端 | NestJS (Node.js) + TypeScript |
| ORM | Prisma |
| 数据库 | MySQL 8 |
| 认证 | JWT（access token + refresh token） |
| 文件存储 | 本地磁盘 + Nginx 静态服务（预留 Storage 抽象层，未来可切换 OSS） |
| 部署 | Nginx + PM2 + MySQL（单机部署） |

### API 分层

```
/api/auth/*           — 登录认证（需凭证）
/api/admin/*          — 后台管理接口（需 JWT + 权限）
/api/public/*         — 公开查询接口（无需登录，供前台调用）
```

## 四、数据模型

### 实体关系图

```
Province（省份）
  │
  ├── City（城市）
  │
  └── Hospital（医院）[软删除]
        │
        ├── ClinicService（门诊服务）
        │     │
        │     ├── ClinicSchedule（门诊时间，7行×3时段）
        │     │
        │     └── PhoneContact（联系电话）
        │
        ├── Doctor（医生）
        │
        └── HospitalImage（图片）

User（用户）
  └── UserProvince（用户-省份多对多）

DictType + DictItem（数据字典）
SystemSetting（系统设置，v2）
OperationLog（操作日志，v2）
```

### 字段定义

#### Province（省份）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (PK, auto) | 主键 |
| name | String | 省份名称（如"辽宁省"） |
| short_name | String | 简称（如"辽"） |
| sort_order | Int | 排序 |
| is_enabled | Boolean | 是否启用 |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

#### City（城市）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (PK, auto) | 主键 |
| province_id | Int (FK) | 所属省份 |
| name | String | 城市名称（如"沈阳"） |
| pinyin | String? | 拼音（用于生成 slug，如"shenyang"） |
| sort_order | Int | 排序 |
| is_enabled | Boolean | 是否启用 |
| created_at | DateTime | |
| updated_at | DateTime | |

#### Hospital（医院）[软删除]

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (PK, auto) | 主键 |
| province_id | Int (FK) | 所属省份 |
| city_id | Int (FK) | 所属城市 |
| name | String | 医院名称 |
| level | String | 医院等级（关联字典 hospital_level） |
| address | String? | 医院地址 |
| map_lng | Float? | 地图经度（v2 扩展） |
| map_lat | Float? | 地图纬度（v2 扩展） |
| intro | Text? | 简介 |
| logo | String? | Logo URL |
| is_published | Boolean | 是否发布（默认 false） |
| sort_order | Int | 排序 |
| created_by | Int (FK→User) | 创建人 |
| created_at | DateTime | |
| updated_at | DateTime | |
| deleted_at | DateTime? | 软删除标记（null=未删除） |

#### ClinicService（门诊服务）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (PK, auto) | 主键 |
| hospital_id | Int (FK) | 所属医院 |
| clinic_type | String | 门诊类型（关联字典 clinic_type：造口门诊/伤口门诊/护理门诊） |
| intro | String? | 门诊简介 |
| sort_order | Int | 排序 |
| is_published | Boolean | 是否发布 |
| created_at | DateTime | |
| updated_at | DateTime | |

#### ClinicSchedule（门诊时间）

每个 ClinicService 有 7 条记录（周一至周日）。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (PK, auto) | 主键 |
| clinic_service_id | Int (FK) | 所属门诊服务 |
| day_of_week | Int (1-7) | 星期几（1=周一, 7=周日） |
| has_morning | Boolean | 上午是否出诊 |
| has_afternoon | Boolean | 下午是否出诊 |
| has_evening | Boolean | 晚上是否出诊 |
| remark | String? | 备注（如"需预约""节假日除外"） |

唯一约束：(clinic_service_id, day_of_week)

#### PhoneContact（联系电话）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (PK, auto) | 主键 |
| clinic_service_id | Int (FK) | 所属门诊服务 |
| phone_name | String | 电话名称（咨询电话/预约电话/护士站/造口门诊/伤口门诊） |
| phone_number | String | 电话号码 |
| contact_person | String? | 联系人（兼容现有数据中的人名，如"庄长娟"） |
| remark | String? | 备注 |
| sort_order | Int | 排序 |
| created_at | DateTime | |
| updated_at | DateTime | |

#### Doctor（医生）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (PK, auto) | 主键 |
| hospital_id | Int (FK) | 所属医院 |
| name | String | 姓名 |
| avatar | String? | 头像 URL |
| title | String | 职称（主任医师/副主任医师/主管护师等） |
| intro | Text? | 简介 |
| specialty | Text? | 擅长 |
| sort_order | Int | 排序 |
| is_published | Boolean | 是否发布 |
| created_at | DateTime | |
| updated_at | DateTime | |

#### HospitalImage（图片）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (PK, auto) | 主键 |
| hospital_id | Int (FK) | 所属医院 |
| url | String | 图片 URL |
| type | String | 类型（logo/environment/other） |
| sort_order | Int | 排序 |

#### User（用户）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (PK, auto) | 主键 |
| username | String (unique) | 用户名 |
| password_hash | String | 密码哈希（bcrypt） |
| name | String | 姓名 |
| phone | String? | 手机号 |
| role | String | 角色（super_admin / province_admin） |
| is_enabled | Boolean | 是否启用 |
| last_login_at | DateTime? | 最后登录时间 |
| created_at | DateTime | |
| updated_at | DateTime | |

#### UserProvince（用户-省份关联）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (PK, auto) | 主键 |
| user_id | Int (FK) | 用户 ID |
| province_id | Int (FK) | 省份 ID |

唯一约束：(user_id, province_id)

#### DictType（字典类型）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (PK, auto) | 主键 |
| code | String (unique) | 字典编码（hospital_level / clinic_type / phone_type） |
| name | String | 字典名称 |
| created_at | DateTime | |

#### DictItem（字典项）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (PK, auto) | 主键 |
| dict_type_id | Int (FK) | 所属字典类型 |
| label | String | 显示文本（如"三甲"） |
| value | String | 存储值（如"三甲"） |
| sort_order | Int | 排序 |
| is_enabled | Boolean | 是否启用 |

#### 预置字典数据

**hospital_level**: 三甲, 三乙, 二甲, 二乙, 一甲, 其他

**clinic_type**: 造口门诊, 伤口门诊, 护理门诊, 造口伤口门诊, 其他

**phone_type**: 咨询电话, 预约电话, 护士站, 造口门诊, 伤口门诊

## 五、功能模块

### 1. 登录认证

- 用户名 + 密码登录
- JWT：access token（短期，2h）+ refresh token（长期，7d）
- 记住登录：延长 refresh token 有效期至 30d
- 修改密码：验证旧密码后设置新密码
- 退出登录：清除前端 token，后端可选将 token 加入黑名单
- 登录失败返回统一错误信息（不区分用户名错误/密码错误）

### 2. Dashboard（首页）

统计卡片（按当前用户权限过滤）：
- 医院总数 / 已发布数 / 未发布数
- 医生总数 / 已发布数
- 门诊服务总数
- 本月更新医院数

### 3. 医院管理

**列表页**：
- 列：医院名称 / 所属省份 / 所属城市 / 医院等级 / 门诊服务数 / 医生数 / 状态（发布/隐藏）/ 更新时间 / 操作
- 搜索：医院名称（模糊）、城市（下拉）、医院等级（下拉）、状态（下拉）
- 排序：支持按名称、更新时间排序
- 分页：默认每页 20 条
- 批量操作：批量发布、批量隐藏、批量删除（软删除）
- 单条操作：编辑、删除、查看详情、快速发布/隐藏切换

**医院详情/编辑页**（Tab 式布局）：
- Tab 1 基本信息：名称、省份、城市、等级、地址、坐标、简介、Logo、排序、发布状态
- Tab 2 门诊服务：门诊服务列表，每个服务可展开编辑门诊时间网格 + 联系电话列表
- Tab 3 医生列表：该医院的医生列表，支持新增/编辑/删除/排序
- Tab 4 图片管理：上传/删除/排序图片

### 4. 门诊服务管理（嵌入医院详情）

- 门诊服务列表（每个服务一张卡片）
- 新增门诊服务：选择门诊类型（字典）、填写简介
- 编辑门诊时间：7 行 × 3 时段（上午/下午/晚上）勾选网格 + 备注栏
- 管理联系电话：新增/编辑/删除电话，每条含电话名称、号码、联系人、备注、排序

### 5. 医生管理

- 独立列表页：医生姓名 / 所属医院 / 职称 / 是否发布 / 更新时间 / 操作
- 搜索：医生姓名、所属医院、职称
- CRUD + 排序 + 发布状态切换
- 也可在医院详情页内管理

### 6. 省份管理

- 列表：名称 / 简称 / 排序 / 是否启用 / 操作
- CRUD + 启用/禁用
- 禁用省份后：该省数据不在公开 API 返回，省管理员无法查看

### 7. 城市管理

- 列表：省份筛选 → 城市列表（名称 / 拼音 / 排序 / 是否启用 / 操作）
- 级联：选择省份后显示该省城市
- CRUD + 启用/禁用

### 8. 账号管理（仅超级管理员）

- 列表：用户名 / 姓名 / 手机号 / 角色 / 分配省份 / 状态 / 最后登录 / 操作
- 新增账号：用户名、密码、姓名、手机号、角色、分配省份（多选）
- 编辑账号：修改信息、重新分配省份
- 禁用/启用账号
- 重置密码（生成随机密码或设固定初始密码）
- 删除账号（软删除或硬删除，超级管理员不可删除自己）

### 9. 数据字典管理

- 字典类型列表 + 字典项列表
- 管理医院等级、门诊类型、电话类型的选项
- 新增/编辑/禁用字典项
- 字典项被引用时不可删除，只可禁用

### 10. 公开 API（供前台调用）

无需认证，CORS 开放。

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/public/provinces` | GET | 获取已启用省份列表 |
| `/api/public/cities?province_id=` | GET | 获取某省已启用城市列表及医院数量 |
| `/api/public/hospitals?province_id=&city_id=` | GET | 获取已发布医院列表（含门诊服务、时间、电话） |
| `/api/public/hospitals/:id` | GET | 获取单个医院详情 |

返回数据结构与当前前台 `hospitalData` 结构对齐，便于前台最小改造。

## 六、数据权限实现

### 查询过滤

所有 `/api/admin/*` 接口经过 `DataScopeGuard`：
- super_admin：不加过滤条件
- province_admin：自动注入 `WHERE province_id IN (用户分配的省份列表)`

### 操作校验

所有写操作（新增/编辑/删除）经过权限校验：
- 省管理员操作医院/医生时，校验目标记录的 `province_id` 是否在其分配范围内
- 超出范围返回 403

### 前端路由守卫

- 登录后根据角色动态生成菜单
- province_admin 不显示"账号管理"菜单
- 省份/城市选择器自动过滤为用户可管理的省份

## 七、文件上传

- 上传接口：`POST /api/admin/upload`（需认证）
- 存储路径：`/uploads/yyyy/mm/uuid-filename.ext`
- Nginx 配置 `/uploads/` 静态服务
- 返回完整 URL 供前端使用
- Storage 抽象层：`StorageService` 接口，v1 实现 `LocalStorageProvider`，未来可加 `OssStorageProvider`
- 限制：图片格式（jpg/png/webp）、单文件 5MB

## 八、前台改造

现有前台 `hospitals.html` 当前从 `/js/hospital-data.js` 加载静态数据。改造为：

1. 页面顶部增加省份选择器（默认辽宁）
2. 数据加载改为 `fetch('/api/public/hospitals?province_id=X')`
3. 返回数据结构兼容现有渲染逻辑（`cities` + `hospitals` 两个数组）
4. 门诊时间展示：从布尔网格渲染为"周一 上午√ 下午√"格式
5. 联系电话展示：按门诊服务分组展示

## 九、菜单结构

```
登录
├── Dashboard（首页统计）
├── 医院管理
│   ├── 医院列表
│   └── 医生管理
├── 基础数据
│   ├── 省份管理
│   ├── 城市管理
│   └── 数据字典
└── 系统管理
    └── 账号管理（仅超管）
```

## 十、项目结构

### 后端 (NestJS)

```
server/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── guards/          (JwtAuthGuard, DataScopeGuard)
│   │   ├── decorators/      (CurrentUser, Roles)
│   │   ├── interceptors/    (TransformInterceptor)
│   │   ├── filters/         (HttpExceptionFilter)
│   │   └── pipes/           (ValidationPipe)
│   ├── modules/
│   │   ├── auth/            (登录、JWT、修改密码)
│   │   ├── user/            (账号管理)
│   │   ├── province/        (省份管理)
│   │   ├── city/            (城市管理)
│   │   ├── hospital/        (医院管理)
│   │   ├── clinic-service/  (门诊服务+时间+电话)
│   │   ├── doctor/          (医生管理)
│   │   ├── dict/            (数据字典)
│   │   ├── upload/          (文件上传)
│   │   ├── dashboard/       (首页统计)
│   │   └── public/          (公开 API)
│   └── prisma/
│       └── prisma.service.ts
├── uploads/                 (上传文件存储)
├── package.json
└── .env
```

### 前端 (Vue3)

```
admin-web/
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router/
│   │   └── index.ts         (路由 + 权限守卫)
│   ├── stores/
│   │   ├── auth.ts          (登录状态、用户信息)
│   │   └── app.ts           (侧边栏折叠等)
│   ├── api/
│   │   ├── request.ts       (Axios 封装、拦截器)
│   │   ├── auth.ts
│   │   ├── hospital.ts
│   │   ├── doctor.ts
│   │   └── ...
│   ├── layouts/
│   │   └── AdminLayout.vue  (侧边栏 + 顶栏 + 内容区)
│   ├── views/
│   │   ├── login/
│   │   ├── dashboard/
│   │   ├── hospital/
│   │   │   ├── List.vue
│   │   │   └── Detail.vue   (Tab 式医院详情)
│   │   ├── doctor/
│   │   ├── province/
│   │   ├── city/
│   │   ├── dict/
│   │   └── user/
│   ├── components/
│   │   ├── ClinicScheduleEditor.vue  (门诊时间网格编辑器)
│   │   ├── PhoneContactEditor.vue    (联系电话编辑器)
│   │   └── ImageUploader.vue         (图片上传组件)
│   └── utils/
│       └── auth.ts          (token 管理)
├── package.json
├── vite.config.ts
└── .env
```

## 十一、响应式设计

后台管理界面需同时支持电脑和手机访问：
- 电脑：侧边栏 + 内容区左右布局，表格完整展示
- 手机：侧边栏抽屉式（默认收起），表格简化展示，操作按钮折叠为下拉菜单
- Element Plus 的 `el-table` 在手机端切换为卡片列表模式
- 表单弹窗在手机端全屏展示

## 十二、部署方案

单台服务器：

```
Nginx (80/443)
  ├── /api/*         → 反向代理到 NestJS (localhost:3000)
  ├── /uploads/*     → 静态文件服务
  ├── /admin/*       → 后台前端静态文件
  └── /              → 前台页面静态文件

PM2 管理 NestJS 进程
MySQL 8 独立运行
```

环境变量（.env）：
```
DATABASE_URL=mysql://user:pass@localhost:3306/hospitals
JWT_SECRET=xxx
JWT_ACCESS_EXPIRES=2h
JWT_REFRESH_EXPIRES=7d
UPLOAD_DIR=/uploads
```

## 十三、v2 扩展功能（本次不做，预留接口）

- Excel 导入/导出（医院、医生批量）
- 操作日志/审计日志
- 登录安全策略（验证码、失败锁定）
- 系统设置（网站名称、Logo、备案号、公告）
- 地图选点 + 附近医院搜索
- Redis 缓存公开 API
- 文件存储切换 OSS

## 十四、数据迁移

首次部署需将现有前台静态数据迁移到数据库：

1. 从 `/js/hospital-data.js` 提取 33 家医院数据
2. 创建辽宁省 + 14 个城市记录
3. 逐条导入医院、门诊服务、门诊时间、联系电话
4. 门诊时间：现有 `schedule` 字段为文字描述（如"周一至周五"），需人工解析为 7×3 布尔网格
5. 联系电话：现有 `contacts[].name` 中既有人名也有电话名，导入时人名存入 `contact_person`，`phone_name` 默认设为"咨询电话"

迁移脚本：`prisma/seed-migration.ts`，可重复执行（幂等）。
