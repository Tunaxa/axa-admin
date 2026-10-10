import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

import {
  CHECKOUT_MODES,
  type CheckoutMode,
} from '../../billing/dto/create-checkout-session.dto.js';

export class ApproveRequestDto {
  /**
   * The Stripe price to charge.
   *
   * Supplied on approval rather than on the request: what something costs is
   * the approver's decision, and letting the requester name their own price
   * is exactly the wrong way round.
   */
  @Matches(/^price_[A-Za-z0-9]+$/, {
    message: 'priceId must be a Stripe price id',
  })
  priceId!: string;

  @IsOptional()
  @IsIn(CHECKOUT_MODES)
  mode?: CheckoutMode;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
