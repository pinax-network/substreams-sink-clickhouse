declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.html" {
  const content: string;
  export default content;
}

declare module "*.sql" {
  const content: string;
  export default content;
}

export type Result<T = null> =
  | ({ success: true } & (T extends null ? {} : { payload: T }))
  | { success: false; error: Error };
