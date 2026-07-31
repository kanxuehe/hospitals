/**
 * 数据迁移脚本：将静态 JS 数据迁移到 MySQL 数据库
 *
 * 用法:
 *   cd server && npx ts-node prisma/migrate-data.ts
 *
 * 前置条件:
 *   1. 已运行 prisma/seed.ts（创建超管、字典、辽宁省 + 14 个城市）
 *   2. 数据库连接正常（DATABASE_URL 环境变量配置正确）
 *
 * 注意：下方 hospitalData 为示例占位数据，实际迁移时需替换为
 *  http://104.225.156.147/js/hospital-data.js 中的完整 33 家医院数据。
 *
 * 幂等性：已导入的医院（同名同省）会被自动跳过，可安全重复执行。
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// 下方为示例占位数据，实际迁移时请替换为完整数据
// 数据来源: http://104.225.156.147/js/hospital-data.js
// ============================================================
const hospitalData = {
  cities: [
    { id: 'shenyang', name: '沈阳' },
    { id: 'dalian', name: '大连' },
    { id: 'anshan', name: '鞍山' },
    { id: 'fushun', name: '抚顺' },
    { id: 'benxi', name: '本溪' },
    { id: 'dandong', name: '丹东' },
    { id: 'jinzhou', name: '锦州' },
    { id: 'yingkou', name: '营口' },
    { id: 'fuxin', name: '阜新' },
    { id: 'liaoyang', name: '辽阳' },
    { id: 'panjin', name: '盘锦' },
    { id: 'tieling', name: '铁岭' },
    { id: 'chaoyang', name: '朝阳' },
    { id: 'huludao', name: '葫芦岛' },
  ],
  hospitals: [
    {
      id: 1,
      cityId: 'dalian',
      name: '大连医科大学附属第一医院',
      services: [
        {
          clinic: '护理门诊',
          schedule: '周一至周五',
          contacts: [{ name: '庄长娟', phone: '18098871877' }],
        },
      ],
    },
    // TODO: 替换为从 hospital-data.js 提取的完整 33 家医院数据
  ],
};

// ============================================================
// parseSchedule: 将 schedule 文字解析为 7x3 布尔网格
//   - dayOfWeek: 1(周一) ~ 7(周日)
//   - 列: [上午, 下午, 晚上]
// ============================================================
function parseSchedule(schedule: string): boolean[][] {
  const grid = Array.from({ length: 7 }, () => [false, false, false]);
  if (!schedule) return grid;

  // 全天 → 一周七天，上午+下午
  if (/全天/.test(schedule)) {
    for (let i = 0; i < 7; i++) {
      grid[i][0] = true;
      grid[i][1] = true;
    }
    return grid;
  }

  // 周一至周五 / 周一到周五 → 周一至周五上午+下午
  if (/周一.*周五|周一至周五|周一到周五/.test(schedule)) {
    for (let i = 0; i < 5; i++) {
      grid[i][0] = true;
      grid[i][1] = true;
    }
    return grid;
  }

  // 周一三五 / 一三五 → 周一、周三、周五上午
  if (/周一.*三.*五|一三五/.test(schedule)) {
    grid[0][0] = true;
    grid[2][0] = true;
    grid[4][0] = true;
    return grid;
  }

  // 上午（不含下午）
  if (/上午/.test(schedule) && !/下午/.test(schedule)) {
    for (let i = 0; i < 5; i++) {
      grid[i][0] = true;
    }
    return grid;
  }

  // 下午（不含上午）
  if (/下午/.test(schedule) && !/上午/.test(schedule)) {
    for (let i = 0; i < 5; i++) {
      grid[i][1] = true;
    }
    return grid;
  }

  // 上午+下午（散列）
  if (/上午/.test(schedule) && /下午/.test(schedule)) {
    for (let i = 0; i < 5; i++) {
      grid[i][0] = true;
      grid[i][1] = true;
    }
    return grid;
  }

  return grid;
}

// ============================================================
// 城市名 -> cityId 映射（通过拼音匹配，用于兼容旧数据）
// ============================================================
const cityPinyinMap: Record<string, string> = {
  '沈阳': 'shenyang',
  '大连': 'dalian',
  '鞍山': 'anshan',
  '抚顺': 'fushun',
  '本溪': 'benxi',
  '丹东': 'dandong',
  '锦州': 'jinzhou',
  '营口': 'yingkou',
  '阜新': 'fuxin',
  '辽阳': 'liaoyang',
  '盘锦': 'panjin',
  '铁岭': 'tieling',
  '朝阳': 'chaoyang',
  '葫芦岛': 'huludao',
};

async function main() {
  // 1. 查找辽宁省
  const province = await prisma.province.findFirst({
    where: { name: '辽宁省' },
  });
  if (!province) {
    console.error('辽宁省不存在，请先运行 seed: npx ts-node prisma/seed.ts');
    process.exit(1);
  }

  // 2. 构建 城市名 -> DB cityId 的映射
  const cities = await prisma.city.findMany({
    where: { provinceId: province.id },
  });
  const cityNameToId: Record<string, number> = {};
  for (const city of cities) {
    cityNameToId[city.name] = city.id;
  }

  // 3. 获取超管 ID
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!admin) {
    console.error('超管账号不存在，请先运行 seed: npx ts-node prisma/seed.ts');
    process.exit(1);
  }

  let imported = 0;
  let skipped = 0;

  for (const h of hospitalData.hospitals) {
    // 查找城市名（通过 cities 列表匹配 cityId -> name）
    const cityName = hospitalData.cities.find((c) => c.id === h.cityId)?.name;
    if (!cityName || !cityNameToId[cityName]) {
      console.log(`跳过 "${h.name}"：城市未找到 (cityId=${h.cityId})`);
      skipped++;
      continue;
    }

    // 幂等检查：同名同省未删除的医院视为已存在
    const existing = await prisma.hospital.findFirst({
      where: { name: h.name, provinceId: province.id, deletedAt: null },
    });
    if (existing) {
      console.log(`跳过 "${h.name}"：已存在`);
      skipped++;
      continue;
    }

    // 4. 创建医院
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

    // 5. 创建门诊服务
    for (const service of h.services) {
      const clinicService = await prisma.clinicService.create({
        data: {
          hospitalId: hospital.id,
          clinicType: service.clinic || '造口伤口门诊',
          isPublished: true,
          sortOrder: 0,
        },
      });

      // 6. 创建门诊时间（7 天）
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

      // 7. 创建联系电话
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
    console.log(`已导入: ${h.name}`);
  }

  console.log(`\n迁移完成: 导入 ${imported} 家医院, 跳过 ${skipped} 家`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
