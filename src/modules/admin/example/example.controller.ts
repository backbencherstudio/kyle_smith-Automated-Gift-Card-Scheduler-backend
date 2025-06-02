import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ExampleService } from './example.service';
import { CreateExampleDto } from './dto/create-example.dto';
import { UpdateExampleDto } from './dto/update-example.dto';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';

@Controller('example')
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  @Post('create-payment-session')
  async createPaymentSession() {
    const payment = await StripePayment.createPaymentIntent({
      amount: 100,
      currency: 'usd',
      customer_id: 'cus_SI3wrN5ukKzzFx',
    });
    return payment;
  }

  @Post()
  async createCustomer(@Body('email') email: string) {
    const customer = await StripePayment.createCustomer({
      user_id: '1',
      name: 'John Doe',
      email: email,
    });
    return customer;
  }

  @Post('create-connected-account')
  async createConnectedAccount(@Body('email') email: string) {
    return StripePayment.createConnectedAccount(email);
  }

  @Post('create-onboarding-account-link')
  async createOnboardingAccountLink(@Body('account_id') accountId: string) {
    return StripePayment.createOnboardingAccountLink(accountId);
  }

  @Post('create-payout')
  async createPayout(
    @Body('account_id') accountId: string,
    @Body('amount') amount: number,
    @Body('currency') currency: string,
  ) {
    return StripePayment.createPayout(accountId, amount, currency);
  }

  @Post('bank-account')
  async addBankAccount(
    @Body('customerId') customerId: string,
    @Body('bankAccountToken') bankAccountToken: string,
  ) {
    const token = await StripePayment.createToken();

    return StripePayment.createBankAccount(customerId, token.id);
  }

  @Post('verify-bank-account')
  async verifyBankAccount(
    @Body('customerId') customerId: string,
    @Body('bankAccountId') bankAccountId: string,
    @Body('amounts') amounts: [number, number],
  ) {
    return StripePayment.verifyBankAccount(customerId, bankAccountId, amounts);
  }

  // attach payment method
  @Post('attach-payment-method')
  async attachPaymentMethod(
    @Body('customer_id') customerId: string,
    @Body('payment_method_id') paymentMethodId: string,
  ) {
    if (!paymentMethodId) {
      throw new Error('PaymentMethod ID is required');
    }
    await StripePayment.attachCustomerPaymentMethodId({
      customer_id: customerId,
      payment_method_id: paymentMethodId,
    });
    // set default payment method
    await StripePayment.setCustomerDefaultPaymentMethodId({
      customer_id: customerId,
      payment_method_id: paymentMethodId,
    });
  }

  @Post('payment-intent')
  async createPaymentIntent(
    @Body('customerId') customerId: string,
    @Body('amount') amount: number,
  ) {
    return await StripePayment.createACHPaymentIntent(customerId, amount);
  }
}
