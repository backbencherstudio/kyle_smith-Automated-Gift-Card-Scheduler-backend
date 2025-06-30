import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WalletService } from './wallet.service';
import { AddCardDto } from './dto/add-card.dto';
import { SetDefaultDto } from './dto/set-default.dto';
import { WalletCard } from './entities/wallet-card.entity';
import { Request } from 'express';

@ApiBearerAuth()
@ApiTags('Wallet')
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('cards')
  @ApiOperation({ summary: 'Add a new card to wallet' })
  @ApiResponse({
    status: 201,
    description: 'Card added successfully',
    type: WalletCard,
  })
  async addCard(@Body() dto: AddCardDto, @Req() req: Request) {
    try {
      const userId = req.user.userId;
      return await this.walletService.addCard(userId, dto.paymentMethodId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('cards')
  @ApiOperation({ summary: "Get user's saved cards" })
  @ApiResponse({
    status: 200,
    description: 'Cards retrieved successfully',
    type: [WalletCard],
  })
  async getCards(@Req() req: Request) {
    try {
      const userId = req.user.userId;
      return await this.walletService.getCards(userId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('cards/default')
  @ApiOperation({ summary: "Get user's default card" })
  @ApiResponse({
    status: 200,
    description: 'Default card retrieved successfully',
    type: WalletCard,
  })
  async getDefaultCard(@Req() req: Request) {
    try {
      const userId = req.user.userId;
      return await this.walletService.getDefaultCard(userId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Put('cards/:id/default')
  @ApiOperation({ summary: 'Set a card as default' })
  @ApiResponse({
    status: 200,
    description: 'Default card updated successfully',
  })
  async setDefaultCard(@Param('id') cardId: string, @Req() req: Request) {
    try {
      const userId = req.user.userId;

      // Validate card ownership
      const isOwner = await this.walletService.validateCardOwnership(
        cardId,
        userId,
      );
      if (!isOwner) {
        throw new BadRequestException('Card not found or access denied');
      }

      return await this.walletService.setDefaultCard(userId, cardId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete('cards/:id')
  @ApiOperation({ summary: 'Remove a card from wallet' })
  @ApiResponse({
    status: 200,
    description: 'Card removed successfully',
  })
  async deleteCard(@Param('id') cardId: string, @Req() req: Request) {
    try {
      const userId = req.user.userId;

      // Validate card ownership
      const isOwner = await this.walletService.validateCardOwnership(
        cardId,
        userId,
      );
      if (!isOwner) {
        throw new BadRequestException('Card not found or access denied');
      }

      return await this.walletService.deleteCard(userId, cardId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

}
