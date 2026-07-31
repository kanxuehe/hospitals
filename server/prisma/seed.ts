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
    const existing = await prisma.dictItem.findFirst({
      where: { dictTypeId: dt.id, label: item.label },
    });
    if (!existing) {
      await prisma.dictItem.create({
        data: {
          dictTypeId: dt.id,
          label: item.label,
          value: item.value,
          sortOrder: item.sortOrder,
        },
      });
    }
  }

  // 4. 辽宁省 + 14 个城市（行政区划编码参考 GB/T 2260）
  const liaoning = await prisma.province.upsert({
    where: { id: 1 },
    update: { code: '210000' },
    create: {
      code: '210000',
      name: '辽宁省',
      shortName: '辽',
      sortOrder: 1,
      isEnabled: true,
    },
  });

  const cities = [
    { code: '210100', name: '沈阳', sortOrder: 1 },
    { code: '210200', name: '大连', sortOrder: 2 },
    { code: '210300', name: '鞍山', sortOrder: 3 },
    { code: '210400', name: '抚顺', sortOrder: 4 },
    { code: '210500', name: '本溪', sortOrder: 5 },
    { code: '210600', name: '丹东', sortOrder: 6 },
    { code: '210700', name: '锦州', sortOrder: 7 },
    { code: '210800', name: '营口', sortOrder: 8 },
    { code: '210900', name: '阜新', sortOrder: 9 },
    { code: '211000', name: '辽阳', sortOrder: 10 },
    { code: '211100', name: '盘锦', sortOrder: 11 },
    { code: '211200', name: '铁岭', sortOrder: 12 },
    { code: '211300', name: '朝阳', sortOrder: 13 },
    { code: '211400', name: '葫芦岛', sortOrder: 14 },
  ];

  for (const city of cities) {
    const existing = await prisma.city.findFirst({
      where: { provinceId: liaoning.id, name: city.name },
    });
    if (!existing) {
      await prisma.city.create({
        data: { ...city, provinceId: liaoning.id, isEnabled: true },
      });
    } else {
      await prisma.city.update({
        where: { id: existing.id },
        data: { code: city.code },
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
