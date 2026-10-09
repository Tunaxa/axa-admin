import { AppKey } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const CHECKOUT_MODES = ['subscription', 'payment'] as const;

export type CheckoutMode = (typeof CHECKOUT_MODES)[number];

export class CreateCheckoutSessionDto {
  /** The AXA application being paid for. */
  @IsEnum(AppKey)
  app!: AppKey;

  /** A price defined in the Stripe dashboard — never an amount sent from here. */
  @Matches(/^price_[A-Za-z0-9]+$/, {
    message: 'priceId must be a Stripe price id',
  })
  priceId!: string;

  @IsEmail()
  customerEmail!: string;

  /**
   * What this session is for — once the Requests module exists, the id of the
   * approved request.
   *
   * It becomes the session's `client_reference_id` and the idempotency key, so
   * approving the same thing twice returns the same session rather than
   * charging someone twice.
   */
  @IsString()
  @Matches(/^[A-Za-z0-9:_-]+$/, {
    message: 'referenceId must be url-safe: letters, digits, : _ -',
  })
  @MaxLength(100)
  referenceId!: string;

  /** A recurring plan by default; a one-off purchase has to say so. */
  @IsOptional()
  @IsIn(CHECKOUT_MODES)
  mode?: CheckoutMode;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  quantity?: number;
}
