import { HttpStatus, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { NATS_SERVICE } from 'src/config/services';
import { firstValueFrom } from 'rxjs';
import { Product } from 'src/common/interfaces/product';
import { OrderWithProducts } from './interfaces/order-with-products.interface';
import { OrderPaidDto } from './dto/order-paid.dto';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  constructor(
    @Inject(NATS_SERVICE)
    private readonly client: ClientProxy,
  ) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async create(createOrderDto: CreateOrderDto) {
    try {
      const productIds = createOrderDto.items.map((item) => item.productId);
      const products: Product[] = await this.getProductsByIds(productIds);

      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const price = products.find(
          (product) => product.id === orderItem.productId,
        ).price;

        return acc + price * orderItem.quantity;
      }, 0);

      const totalItems = createOrderDto.items.reduce(
        (acc, item) => item.quantity + acc,
        0,
      );

      const order = await this.order.create({
        data: {
          totalAmount,
          totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map((item) => {
                const price = products.find(
                  (product) => product.id === item.productId,
                ).price;

                return {
                  ...item,
                  price,
                };
              }),
            },
          },
        },
        include: {
          OrderItem: {
            select: {
              productId: true,
              quantity: true,
              price: true,
            },
          },
        },
      });

      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem) => ({
          ...orderItem,
          productName: products.find(
            (product) => product.id === orderItem.productId,
          ).name,
        })),
      };
    } catch {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Check logs because some things were bad',
      });
    }
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const { status, page, limit } = orderPaginationDto;

    const totalPages = await this.order.count({
      where: { status },
    });

    return {
      data: await this.order.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: { status },
      }),
      meta: {
        total: totalPages,
        page,
        lastPage: Math.ceil(totalPages / limit),
      },
    };
  }

  async findOne(id: string) {
    const order = await this.order.findFirst({
      where: { id },
      include: {
        OrderItem: {
          select: {
            productId: true,
            quantity: true,
            price: true,
          },
        },
      },
    });

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order with id: ${id} not found`,
      });
    }

    const productIds = order.OrderItem.map((item) => item.productId);
    const products: Product[] = await this.getProductsByIds(productIds);

    return {
      ...order,
      OrderItem: order.OrderItem.map((orderItem) => ({
        ...orderItem,
        productName: products.find(
          (product) => product.id === orderItem.productId,
        ).name,
      })),
    };
  }

  async changeStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto;

    const order = await this.findOne(id);
    if (order.status === status) {
      return order;
    }

    return this.order.update({
      where: { id },
      data: { status },
    });
  }

  private async getProductsByIds(ids: number[]) {
    const products: Product[] = await firstValueFrom(
      this.client.send({ cmd: 'validate_products' }, ids),
    );
    return products;
  }

  async createPaymentSession(order: OrderWithProducts){
    const paymentSession = await firstValueFrom(
      this.client.send('create.payment.session', {
        orderId: order.id,
        currency: "usd",
        items: order.OrderItem.map(({productId, ...restItem}) => restItem)
      })
    )

    return paymentSession;
  }

  async orderPaid(orderPaidDto: OrderPaidDto){
    await this.order.update({
      where: { id: orderPaidDto.orderId },
      data: {
        status: "PAID",
        paid: true,
        paidAt: new Date(),
        stripeChargeId: orderPaidDto.stripePaymentId,
        OrderReceipt: {
          create: {
            receiptUrl: orderPaidDto.receiptUrl
          }
        }
      }
    })
  }
}
