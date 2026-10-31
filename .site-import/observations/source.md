# Website importer: repository source import

Repository: https://github.com/phuocnhtvietcasa-code/team-records-hub-96
Commit: 052d3c7
Live reference redirects to https://vietcasa-sale-kpi.vercel.app/auth. Imported repository code directly instead of capturing the GitHub repository webpage.

| Route | Viewport | Control | Expected and observed source result | Status | Evidence |
|---|---|---|---|---|---|
| /auth | 1280x1800 | Initial | Sign-in, branding, email and password | pass | /tmp/browser/team-records/source_desktop.png |
| /auth | 1280x1800 | Registration | Create account email/password form | pass | /tmp/browser/team-records/source_signup.png |
| /auth | 1280x1800 | Forgot password | Email recovery form | pass | /tmp/browser/team-records/source_reset.png |
| /auth | 390x844 | Initial | Phone sign-in form and logo | pass | /tmp/browser/team-records/source_phone.png |
| Protected routes | Both | Navigation and records | Access requires source account; no credentials used | blocked | Repository source retained |

No hero media, nested menus, carousel or scroll motion occurs on the publicly accessible auth screen. Logo and favicon were copied from repository public assets. Existing production users and records are not part of source code.

## Preview results

- Desktop 1280x1800 and phone 390x844: sign-in, registration, recovery, password visibility and return-to-sign-in controls passed; wheel scrolling did not reveal missing content; no horizontal overflow or runtime errors.
- Matching screenshot evidence: `/tmp/browser/team-records/preview_desktop.png`, `preview_phone_scroll.png`, `preview_signup_desktop.png`, `preview_signup_phone.png`, `preview_reset_desktop.png`, `preview_reset_phone.png`.
- `/dashboard-doanh-so`, `/dashboard-cong-no`, `/phieu`, `/nhan-vien`, `/cai-dat`: signed-out access correctly returns to `/auth`.
- Database readback confirms five employees and 326 original sample sales records. Email/password sign-in is enabled; email confirmation remains enabled.
- All 44 repository tests passed; the latest harness build reports `build OK`.
- Signed-in dashboard navigation, record changes, role permissions and email delivery remain blocked/unverified because there are no accounts in this copy. No account was created that would claim the owner's first-Admin role.
- No static media fallbacks, normal-flow panel replacements or observed motion gaps were introduced. Protected source screens could not be visually compared without a source account.
