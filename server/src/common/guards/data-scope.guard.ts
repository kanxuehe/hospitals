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
