import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { Types } from 'mongoose';

/**
 * Rejects a path parameter that is not a MongoDB id.
 *
 * Without it, `/docs/pages/nonsense` reaches Mongoose and comes back as a cast
 * error and a `500`, when it is plainly a bad request. The relational modules
 * use `ParseUUIDPipe` for the same reason.
 */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException('Not a valid page id');
    }

    return value;
  }
}
