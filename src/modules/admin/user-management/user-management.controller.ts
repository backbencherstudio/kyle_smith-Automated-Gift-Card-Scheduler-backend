import {
  Controller,
  Get,
  Param,
  Query,
  Delete,
  Patch,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UserManagementService } from './user-management.service';
import { UserStatusUpdateDto } from './dto/user-status-update.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
  
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
  @ApiOperation({ summary: 'Update user status' })
  @ApiResponse({ status: 200, description: 'User status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async updateUserStatus(
    @Param('userId') userId: string,
    @Req() req: any,
    @Body() dto: UserStatusUpdateDto,
  ) {
    const { userId: adminId } = req.user;
    console.log(adminId);
    return this.userManagementService.updateUserStatus(adminId, dto.isActive);
  }
}
