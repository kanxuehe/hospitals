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

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (!user.isEnabled) {
      throw new UnauthorizedException('账号已被禁用，请联系管理员');
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
    const refreshExpiresIn = dto.rememberMe === 'true' ? '30d' : '7d';

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
            province: { select: { id: true, code: true, name: true } },
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
