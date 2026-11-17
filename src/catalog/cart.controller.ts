import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ZodPipe } from '../common/zod';
import { cartValidateSchema, type CartValidateDto } from './catalog.schemas';
import { CartService } from './cart.service';

@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Post('validate')
  @HttpCode(200)
  validate(@Body(new ZodPipe(cartValidateSchema)) dto: CartValidateDto) {
    return this.cart.validate(dto.items);
  }
}
