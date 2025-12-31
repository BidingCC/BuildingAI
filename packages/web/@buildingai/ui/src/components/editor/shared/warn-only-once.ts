export function warnOnlyOnce(message: string) {
  if (process.env.NODE_ENV === "production") {
    return
  }
  let run = false
  return () => {
    if (!run) {
      console.warn(message)
    }
    run = true
  }
}
