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
            province: { select: { id: true, name: true, code: true } },
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

    if (dto.role === 'province_admin' && dto.provinceCodes.length === 0) {
      throw new BadRequestException('省管理员必须分配至少一个省份');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const provinces =
      dto.provinceCodes.length > 0
        ? await this.prisma.province.findMany({
            where: { code: { in: dto.provinceCodes } },
          })
        : [];

    return this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        name: dto.name,
        phone: dto.phone,
        role: dto.role,
        isEnabled: true,
        provinces: {
          create: provinces.map((p) => ({ provinceId: p.id })),
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

    if (
      dto.role === 'province_admin' &&
      dto.provinceCodes !== undefined &&
      dto.provinceCodes.length === 0
    ) {
      throw new BadRequestException('省管理员必须分配至少一个省份');
    }

    return this.prisma.$transaction(async (tx) => {
      // 更新基本信息
      const { provinceCodes, ...userData } = dto;
      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id },
          data: userData,
        });
      }

      // 更新省份分配
      if (provinceCodes !== undefined) {
        await tx.userProvince.deleteMany({
          where: { userId: id },
        });
        if (provinceCodes.length > 0) {
          const provinces = await tx.province.findMany({
            where: { code: { in: provinceCodes } },
          });
          await tx.userProvince.createMany({
            data: provinces.map((p) => ({
              userId: id,
              provinceId: p.id,
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
              province: { select: { id: true, name: true, code: true } },
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
