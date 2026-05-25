declare module "vitest" {
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void): void;
  export const expect: {
    <T>(actual: T): {
      not: {
        toBe(expected: T): void;
      };
      toBe(expected: T): void;
      toEqual(expected: unknown): void;
    };
  };
}
