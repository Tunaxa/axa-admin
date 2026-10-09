import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * A whole profile.
 *
 * `PUT` replaces, so anything left out is cleared — the client loads the
 * profile before saving it, the same contract the daily report form works to.
 */
export class UpsertDevProfileDto {
  /** Technologies, free text. Normalised and de-duplicated by the service. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  stack?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  ownershipArea?: string | null;

  @IsOptional()
  @Matches(/^@?[A-Za-z0-9._-]{1,80}$/, {
    message: 'slackHandle must be a handle, optionally starting with @',
  })
  slackHandle?: string | null;

  @IsOptional()
  @Matches(/^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/, {
    message: 'githubHandle must be a GitHub username',
  })
  githubHandle?: string | null;

  @IsOptional()
  @Matches(/^\+?[0-9 ().-]{6,32}$/, {
    message: 'phone must be digits, optionally with + ( ) . - and spaces',
  })
  phone?: string | null;
}
