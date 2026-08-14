import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/admin/users')
@UseGuards(RolesGuard)
@Roles('super_admin')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.update(id, dto);
  }

  @Put(':id/toggle-enabled')
  toggleEnabled(@Param('id', ParseIntPipe) id: number) {
    return this.userService.toggleEnabled(id);
  }

  @Put(':id/reset-password')
  resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { password: string },
  ) {
    return this.userService.resetPassword(id, body.password);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('sub') currentUserId: number,
  ) {
    return this.userService.remove(id, currentUserId);
  }
}
