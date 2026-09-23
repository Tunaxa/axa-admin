/**
 * Replaces Mongo's `_id` with the `id` virtual when a document is serialised.
 *
 * Its own file rather than living on one of the two schemas, which import each
 * other — a cycle that typechecks and then hands you `undefined` at the moment
 * the decorators run.
 */
export function stripMongoId(
  _doc: unknown,
  ret: Record<string, unknown>,
): Record<string, unknown> {
  delete ret._id;

  return ret;
}
