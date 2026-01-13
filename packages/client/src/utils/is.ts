/**
 * check if the current environment is browser
 * @returns {boolean}
 */
export function isBrowser() {
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    return false;
  }
  return true;
}
