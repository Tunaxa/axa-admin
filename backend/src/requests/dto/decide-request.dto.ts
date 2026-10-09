import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DecideRequestDto {
  /**
   * Required, not optional.
   *
   * A rejection or a request for more detail becomes an email somebody has to
   * act on, and "no" with no reason attached is not something anybody can act
   * on.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  note!: string;
}
