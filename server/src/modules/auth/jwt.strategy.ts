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
