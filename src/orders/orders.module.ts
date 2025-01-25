import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { envs } from 'src/config/envs';
import { PRODUCTS_MS } from 'src/config/services';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  imports: [
    ClientsModule.register([
      {
        name: PRODUCTS_MS,
        transport: Transport.TCP,
        options: {
          host: envs.services.products.host,
          port: envs.services.products.port,
        },
      },
    ]),
  ],
})
export class OrdersModule {}
