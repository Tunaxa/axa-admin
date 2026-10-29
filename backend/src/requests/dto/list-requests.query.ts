import { AccountRequestStatus, AppKey } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

/** Filters for `GET /requests`. */
export class ListRequestsQuery {
  @IsOptional()
  @IsEnum(AccountRequestStatus)
  status?: AccountRequestStatus;

  @IsOptional()
  @IsEnum(AppKey)
  app?: AppKey;
}
