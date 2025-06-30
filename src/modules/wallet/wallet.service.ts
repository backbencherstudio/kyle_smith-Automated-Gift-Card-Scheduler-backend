import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StripePayment } from '../../common/lib/Payment/stripe/StripePayment';
import { AddCardDto } from './dto/add-card.dto';
import axios from 'axios';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async addCard(userId: string, dto: AddCardDto) {
    try {
      // Get user's Stripe customer ID
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { billing_id: true },
      });

      if (!user?.billing_id) {
        throw new BadRequestException('User has no Stripe customer account');
      }

      // 1. Create the PaymentMethod (without customer)
      const formData = new URLSearchParams();
      formData.append('type', 'card');
      formData.append('card[number]', dto.card_number);
      formData.append('card[exp_month]', dto.card_exp_month);
      formData.append('card[exp_year]', dto.card_exp_year);
      formData.append('card[cvc]', dto.card_cvc);
      formData.append('billing_details[name]', dto.billing_name);

      const response = await axios.post(
        'https://api.stripe.com/v1/payment_methods',
        formData.toString(),
        {
          headers: {
            Authorization: `Bearer ${process.env.STRIPE_PUBLIC_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      // 2. Attach the PaymentMethod to the customer
      const attachData = new URLSearchParams();
      attachData.append('customer', user.billing_id);

      await axios.post(
        `https://api.stripe.com/v1/payment_methods/${response.data.id}/attach`,
        attachData.toString(),
        {
          headers: {
            Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      // 3. Store card reference in database
      const savedCard = await this.prisma.userPaymentMethod.create({
        data: {
          user_id: userId,
          payment_method_id: response.data.id,
          stripe_customer_id: user.billing_id,
          is_default: false,
          is_active: true,
        },
      });

      return {
        success: true,
        message: 'Card added successfully',
        data: {
          payment_method_id: response.data.id,
          is_default: false,
          created_at: new Date(),
        },
      };
    } catch (error) {
      console.error(
        'Stripe error:',
        error.response?.data?.error || error.message,
      );

      if (error.response?.data?.error?.type === 'card_error') {
        throw new BadRequestException(
          error.response.data.error.message || 'Invalid card information',
        );
      }
      throw new BadRequestException('Failed to add card');
    }
  }

  async getCards(userId: string) {
    console.log('getCards', userId);
    try {
      // Get all active cards with basic info
      const userCards = await this.prisma.userPaymentMethod.findMany({
        where: {
          user_id: userId,
          is_active: true,
        },
        orderBy: [{ is_default: 'desc' }, { created_at: 'desc' }],
        select: {
          id: true,
          payment_method_id: true,
          is_default: true,
          is_active: true,
          created_at: true,
          updated_at: true,
        },
      });

      // console.log('Active cards for user:', userCards);

      // Get detailed info from Stripe for each card
      const cardsWithDetails = await Promise.all(
        userCards.map(async (card) => {
          try {
            const stripeCard = await StripePayment.getPaymentMethodById(
              card.payment_method_id,
            );

            return {
              id: card.id,
              payment_method_id: card.payment_method_id,
              is_default: card.is_default,
              is_active: card.is_active,
              created_at: card.created_at,
              updated_at: card.updated_at,
              card_details: {
                brand: stripeCard.card.brand,
                last4: stripeCard.card.last4,
                exp_month: stripeCard.card.exp_month,
                exp_year: stripeCard.card.exp_year,
                country: stripeCard.card.country,
                funding: stripeCard.card.funding,
              },
              billing_details: stripeCard.billing_details,
            };
          } catch (error) {
            console.error(`Error fetching details for card ${card.id}:`, error);
            // Return card without Stripe details if there's an error
            return {
              id: card.id,
              payment_method_id: card.payment_method_id,
              is_default: card.is_default,
              is_active: card.is_active,
              created_at: card.created_at,
              updated_at: card.updated_at,
              card_details: null,
              billing_details: null,
              error: 'Failed to fetch card details from Stripe',
            };
          }
        }),
      );

      return {
        success: true,
        data: cardsWithDetails,
        count: cardsWithDetails.length,
      };
    } catch (error) {
      console.error('Error in getCards:', error);
      throw new BadRequestException('Failed to fetch cards');
    }
  }

  async setDefaultCard(userId: string, cardId: string) {
    try {
      // Get card details
      const card = await this.prisma.userPaymentMethod.findFirst({
        where: {
          id: cardId,
          user_id: userId,
          is_active: true,
        },
      });

      if (!card) {
        throw new NotFoundException('Card not found');
      }

      // Set as default in Stripe
      await StripePayment.setCustomerDefaultPaymentMethodId({
        customer_id: card.stripe_customer_id,
        payment_method_id: card.payment_method_id,
      });

      // Update database - remove default from all cards
      await this.prisma.userPaymentMethod.updateMany({
        where: { user_id: userId },
        data: { is_default: false },
      });

      // Set new default card
      await this.prisma.userPaymentMethod.update({
        where: { id: cardId },
        data: { is_default: true },
      });

      return {
        success: true,
        message: 'Default card updated successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to set default card');
    }
  }

  async deleteCard(userId: string, cardId: string) {
    try {
      // Get card details
      const card = await this.prisma.userPaymentMethod.findFirst({
        where: {
          id: cardId,
          user_id: userId,
          is_active: true,
        },
      });

      if (!card) {
        throw new NotFoundException('Card not found');
      }

      // Check if payment method is attached before detaching
      const stripePaymentMethod = await StripePayment.getPaymentMethod(
        card.payment_method_id,
      );
      if (stripePaymentMethod.customer) {
        await StripePayment.detachPaymentMethod(card.payment_method_id);
      }

      // Hard delete from database
      await this.prisma.userPaymentMethod.delete({
        where: { id: cardId },
      });

      return {
        success: true,
        message: 'Card removed successfully',
      };
    } catch (error) {
      console.log('error', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to remove card');
    }
  }

  async getDefaultCard(userId: string) {
    try {
      const defaultCard = await this.prisma.userPaymentMethod.findFirst({
        where: {
          user_id: userId,
          is_default: true,
          is_active: true,
        },
        select: {
          id: true,
          payment_method_id: true,
          is_default: true,
          created_at: true,
        },
      });

      return {
        success: true,
        data: defaultCard,
      };
    } catch (error) {
      throw new BadRequestException('Failed to get default card');
    }
  }

  async validateCardOwnership(cardId: string, userId: string) {
    try {
      const card = await this.prisma.userPaymentMethod.findFirst({
        where: {
          id: cardId,
          user_id: userId,
          is_active: true,
        },
      });
      return !!card;
    } catch (error) {
      return false;
    }
  }
}
