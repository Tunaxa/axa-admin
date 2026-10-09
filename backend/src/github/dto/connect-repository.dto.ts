import { Matches, MaxLength } from 'class-validator';

export class ConnectRepositoryDto {
  /**
   * `owner/name`, as GitHub reports it.
   *
   * Matched against a pattern rather than taken as free text: this value is
   * what a delivery is attributed by, so a typo would silently route another
   * repository's events nowhere at all.
   */
  @Matches(/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/, {
    message: 'fullName must look like owner/name',
  })
  @MaxLength(140)
  fullName!: string;
}
