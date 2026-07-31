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
    { id: 'tieling', name: '铁岭' },
    { id: 'chaoyang', name: '朝阳' },
    { id: 'panjin', name: '盘锦' },
    { id: 'huludao', name: '葫芦岛' },
  ],
  hospitals: [
    // ===== 大连 =====
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
    {
      id: 2,
      cityId: 'dalian',
      name: '大连大学附属新华医院',
      services: [
        {
          clinic: '造口伤口门诊',
          schedule: '每周一至周五',
          contacts: [{ name: '吕雪', phone: '13940845569' }],
        },
      ],
    },
    {
      id: 3,
      cityId: 'dalian',
      name: '大连大学附属中山医院',
      services: [
        { clinic: '造口门诊', schedule: '每周一至周五', contacts: [] },
      ],
    },
    {
      id: 4,
      cityId: 'dalian',
      name: '大连市友谊医院',
      services: [{ clinic: '造口门诊', schedule: '每周一下午', contacts: [] }],
    },
    {
      id: 5,
      cityId: 'dalian',
      name: '大连医科大学附属第二医院',
      services: [
        {
          clinic: '造口伤口门诊',
          schedule: '周一至周日',
          contacts: [{ name: '于倩', phone: '17709877789' }],
        },
      ],
    },
    {
      id: 6,
      cityId: 'dalian',
      name: '大连市中心医院',
      services: [
        {
          clinic: '造口伤口门诊',
          schedule: '周一至周五全天，周六上午',
          contacts: [{ name: '姜秀琴', phone: '15509850692' }],
        },
      ],
    },
    {
      id: 7,
      cityId: 'dalian',
      name: '庄河市中心医院',
      services: [{ clinic: '造口门诊', schedule: '周一至周五', contacts: [] }],
    },
    {
      id: 8,
      cityId: 'dalian',
      name: '旅顺口区人民医院',
      services: [{ clinic: '造口门诊', schedule: '周一至周五', contacts: [] }],
    },

    // ===== 抚顺 =====
    {
      id: 9,
      cityId: 'fushun',
      name: '抚顺矿务局总医院',
      services: [
        {
          clinic: '造口门诊',
          schedule: '周一到周五全天',
          contacts: [{ name: '赵晶', phone: '15694138322' }],
        },
      ],
    },

    // ===== 本溪 =====
    {
      id: 10,
      cityId: 'benxi',
      name: '本溪市中心医院',
      services: [
        {
          clinic: '造口伤口门诊',
          schedule: '周一至周五全天',
          contacts: [{ name: '张琳', phone: '13841486711' }],
        },
      ],
    },

    // ===== 丹东 =====
    {
      id: 11,
      cityId: 'dandong',
      name: '丹东市中心医院',
      services: [
        {
          clinic: '造口伤口门诊',
          schedule: '周一至周五全天，周六周日上午',
          contacts: [{ name: '窦雪周', phone: '15841535240' }],
        },
      ],
    },
    {
      id: 12,
      cityId: 'dandong',
      name: '凤城市中心医院',
      services: [
        {
          clinic: '造口伤口门诊',
          schedule: '周一至周五全天',
          contacts: [{ name: '傅莉', phone: '18642507763' }],
        },
      ],
    },

    // ===== 鞍山 =====
    {
      id: 13,
      cityId: 'anshan',
      name: '鞍山市肿瘤医院',
      services: [
        {
          clinic: '造口门诊',
          schedule: '周一至周五全天',
          contacts: [{ name: '周林', phone: '18504126081' }],
        },
      ],
    },

    // ===== 辽阳 =====
    {
      id: 14,
      cityId: 'liaoyang',
      name: '辽阳市中心医院',
      services: [
        {
          clinic: '造口门诊',
          schedule: '周一至周五全天',
          contacts: [{ name: '吴雪垠', phone: '15140942575' }],
        },
      ],
    },

    // ===== 锦州 =====
    {
      id: 15,
      cityId: 'jinzhou',
      name: '锦州医科大学附属第一医院',
      services: [
        { clinic: '造口伤口门诊', schedule: '周一至周五', contacts: [] },
      ],
    },

    // ===== 葫芦岛 =====
    {
      id: 16,
      cityId: 'huludao',
      name: '葫芦岛市中心医院龙湾院区',
      services: [
        {
          clinic: '造口伤口门诊',
          schedule: '周一至周五',
          contacts: [{ name: '梁瀛', phone: '13372906182' }],
        },
      ],
    },
    {
      id: 17,
      cityId: 'huludao',
      name: '葫芦岛市中心医院连山院区',
      services: [
        { clinic: '造口伤口门诊', schedule: '周五下午半天', contacts: [] },
      ],
    },
    {
      id: 18,
      cityId: 'huludao',
      name: '绥中县医院',
      services: [
        {
          clinic: '造口伤口门诊',
          schedule: '周一至周五全天',
          contacts: [{ name: '闵祥娟', phone: '1804293718' }],
        },
      ],
    },

    // ===== 盘锦 =====
    {
      id: 19,
      cityId: 'panjin',
      name: '盘锦市中心医院',
      services: [
        { clinic: '造口伤口门诊', schedule: '周一至周五上午', contacts: [] },
      ],
    },
    {
      id: 20,
      cityId: 'panjin',
      name: '盘锦辽油宝石花医院',
      services: [
        {
          clinic: '胃肠外科造口伤口门诊',
          schedule: '周一至周五',
          contacts: [{ name: '咨询电话', phone: '0427-7650714' }],
        },
      ],
    },

    // ===== 营口 =====
    {
      id: 21,
      cityId: 'yingkou',
      name: '营口市中心医院',
      services: [
        { clinic: '造口伤口门诊', schedule: '周一至周五', contacts: [] },
      ],
    },
    // ===== 阜新 =====
    {
      id: 22,
      cityId: 'fuxin',
      name: '阜新市中心医院',
      services: [
        {
          clinic: '造口门诊',
          schedule: '周一至周五',
          contacts: [{ name: '贾立华', phone: '13470305575' }],
        },
      ],
    },
    {
      id: 23,
      cityId: 'fuxin',
      name: '辽宁省健康产业集团阜新矿总医院',
      services: [
        {
          clinic: '造口门诊',
          schedule: '周一至周五',
          contacts: [{ name: '周玲玲', phone: '17541800310' }],
        },
      ],
    },

    // ===== 朝阳 =====
    {
      id: 24,
      cityId: 'chaoyang',
      name: '朝阳市中心医院',
      services: [
        {
          clinic: '',
          schedule: '周一到周五全天',
          contacts: [
            { name: '郭秀荣', phone: '18040159175' },
            { name: '宁雪娇', phone: '18040159122' },
          ],
        },
      ],
    },

    // ===== 沈阳 =====
    {
      id: 25,
      cityId: 'shenyang',
      name: '中国医科大学附属第一医院',
      services: [
        { clinic: '造口伤口门诊', schedule: '周一至周五上午', contacts: [] },
      ],
    },
    {
      id: 26,
      cityId: 'shenyang',
      name: '辽宁省人民医院',
      services: [
        {
          clinic: '造口门诊',
          schedule: '每周一、三、五下午',
          contacts: [{ name: '林老师', phone: '17702487899' }],
        },
      ],
    },
    {
      id: 27,
      cityId: 'shenyang',
      name: '辽宁省肛肠医院（辽宁中医药大学附属第三医院）',
      services: [
        {
          clinic: '造口门诊',
          schedule: '每周五下午',
          contacts: [{ name: '沈老师', phone: '13998318090' }],
        },
      ],
    },
    {
      id: 28,
      cityId: 'shenyang',
      name: '辽宁省肿瘤医院',
      services: [
        {
          clinic: '造口门诊',
          schedule: '周一到周五',
          contacts: [{ name: '陈媛媛', phone: '13940439369' }],
        },
      ],
    },
    {
      id: 29,
      cityId: 'shenyang',
      name: '沈阳医学院附属中心医院',
      services: [
        {
          clinic: '',
          schedule: '周一到周五全天',
          contacts: [{ name: '张凤坤', phone: '18002479070' }],
        },
      ],
    },
    {
      id: 30,
      cityId: 'shenyang',
      name: '北部战区总医院（原陆军总院）',
      services: [
        {
          clinic: '造口伤口门诊（普外科）',
          schedule: '周一至周五下午1:30',
          contacts: [{ name: '李剑茹', phone: '13591651935' }],
        },
        {
          clinic: '造口伤口门诊（泌尿外科）',
          schedule: '周三下午1:30',
          contacts: [{ name: '姜雨杉', phone: '13936035129' }],
        },
      ],
    },
    {
      id: 31,
      cityId: 'shenyang',
      name: '中国医科大学附属第四医院',
      services: [
        {
          clinic: '造口伤口门诊',
          schedule: '周一至周五下午1:30',
          contacts: [{ name: '宋岩', phone: '18900912725' }],
        },
      ],
    },
    {
      id: 32,
      cityId: 'shenyang',
      name: '中国医科大学附属盛京医院',
      services: [
        {
          clinic: '造口门诊（肠造口）',
          schedule: '周一、周五',
          contacts: [{ name: '韩丽', phone: '' }],
        },
        {
          clinic: '造口门诊（泌尿造口）',
          schedule: '周一、二、五',
          contacts: [{ name: '李新新', phone: '' }],
        },
      ],
    },
    {
      id: 33,
      cityId: 'shenyang',
      name: '东北国际医院浑南院区',
      services: [
        {
          clinic: '伤口造口中心',
          schedule: '周一至周日全天',
          contacts: [{ name: '李洪瑶', phone: '13591405666' }],
        },
      ],
    },
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
  沈阳: 'shenyang',
  大连: 'dalian',
  鞍山: 'anshan',
  抚顺: 'fushun',
  本溪: 'benxi',
  丹东: 'dandong',
  锦州: 'jinzhou',
  营口: 'yingkou',
  阜新: 'fuxin',
  辽阳: 'liaoyang',
  盘锦: 'panjin',
  铁岭: 'tieling',
  朝阳: 'chaoyang',
  葫芦岛: 'huludao',
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
