import { IsString, IsNotEmpty, IsUUID, IsUrl } from 'class-validator';

export class OrderPaidDto {
  @IsString()
  @IsNotEmpty()
  stripePaymentId: string;

  @IsUUID()
  orderId: string;

  @IsUrl()
  receiptUrl: string;
}