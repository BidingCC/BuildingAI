export function invariant(
  cond?: boolean,
  message?: string,
  ...args: string[]
): asserts cond {
  if (cond) {
    return
  }

  throw new Error(
    "Internal Lexical error: invariant() is meant to be replaced at compile " +
      "time. There is no runtime version. Error: " +
      message
  )
}
