import { IsEnum, IsOptional, IsPositive } from 'class-validator';
import { OrderStatusList } from '../enum/order.enum';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

export class OrderPaginationDto {
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @IsEnum(OrderStatusList, {
    message: `Valid status are ${OrderStatusList}`,
  })
  @IsOptional()
  status: OrderStatus;
}
