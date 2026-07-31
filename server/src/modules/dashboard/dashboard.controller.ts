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
