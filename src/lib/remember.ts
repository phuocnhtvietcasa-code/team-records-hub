// "Ghi nhớ đăng nhập": khi tắt, phiên bị đăng xuất sau khi đóng trình duyệt.
const NO_REMEMBER = "vc_no_remember";
const ALIVE = "vc_session_alive";
const EMAIL = "vc_saved_email";

export function setRemember(remember: boolean, email: string) {
  if (remember) {
    localStorage.removeItem(NO_REMEMBER);
    localStorage.setItem(EMAIL, email);
  } else {
    localStorage.setItem(NO_REMEMBER, "1");
    localStorage.removeItem(EMAIL);
  }
  sessionStorage.setItem(ALIVE, "1");
}

export function savedEmail(): string {
  return localStorage.getItem(EMAIL) ?? "";
}

/** True when the user chose not to be remembered and the browser was closed since. */
export function sessionExpiredByClose(): boolean {
  return localStorage.getItem(NO_REMEMBER) === "1" && sessionStorage.getItem(ALIVE) !== "1";
}
