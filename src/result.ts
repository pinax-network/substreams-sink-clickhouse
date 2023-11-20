export type Result<T = undefined, E = Error> = OkResult<T> | ErrResult<E>;

type OkResult<P = undefined> = undefined extends P
  ? { success: true }
  : { success: true; payload: P };
type ErrResult<E = Error> = { success: false; error: E };

export function Ok<
  P extends string | number | object | undefined = undefined,
  R = P extends undefined ? OkResult : OkResult<P>
>(payload?: P): R {
  if (payload !== undefined) {
    return { success: true, payload } as R;
  }
  return { success: true } as R;
}

export function Err<E = Error>(error: E): ErrResult<E> {
  return { success: false, error };
}
