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
