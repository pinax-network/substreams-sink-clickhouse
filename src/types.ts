export type Awaitable<T> = T | Promise<T>;
export type Handler = (req: Request) => Awaitable<Response>;
