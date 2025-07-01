import {
  Controller,
  Get,
  Param,
  Query,
  Delete,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UserManagementService } from './user-management.service';
import { UserStatusUpdateDto } from './dto/user-status-update.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';

@Controller('admin/user-management')
@UseGuards(JwtAuthGuard)
@Roles(Role.ADMIN)
export class UserManagementController {
  constructor(private readonly userManagementService: UserManagementService) {}

  @Get()
  async listUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('query') query?: string,
    @Query('onlyWithData') onlyWithData?: string,
  ) {
    return this.userManagementService.listUsers(
      Number(page),
      Number(limit),
      query,
      onlyWithData === 'true',
    );
  }

  @Get(':userId')
  async getUserGiftHistory(@Param('userId') userId: string) {
    return this.userManagementService.getUserGiftHistory(userId);
  }

  @Delete(':userId')
  async deleteUser(@Param('userId') userId: string) {
    return this.userManagementService.deleteUser(userId);
  }

  @Patch(':userId/status')
  async updateUserStatus(
    @Param('userId') userId: string,
    @Body() dto: UserStatusUpdateDto,
  ) {
    return this.userManagementService.updateUserStatus(userId, dto.isActive);
  }
}
