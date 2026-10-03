# Account access and signup audit — 3 October 2026

The email form previously called only `signInWithPassword`. It could authenticate existing users but could not create an account. Google access was inside Settings, making it difficult for guests to discover.

## Implemented behavior

- Guests see Continue with Google and Use email above the journal. Phone restaurant detail views also expose Google access.
- A dedicated dialog separates Sign in and Create account. Signup calls `signUp`; sign-in retains `signInWithPassword`. Fields have explicit labels, password-manager autocomplete, Show/Hide password, and an eight-character signup minimum. Passwords are cleared on completion, mode changes, and dialog close; they are never saved as drafts.
- Requests show progress, prevent duplicate submissions, and provide inline errors with a 15-second response boundary. Confirmation instructions and resend support include a local one-minute cooldown and generic wording that avoids revealing whether an account exists.
- Email confirmation and Google callbacks use the current origin and the existing PKCE flow. Confirmation links should open in the browser where signup started. Callback failures appear in the access dialog, and auth error parameters are removed from the URL.
- Signed-in users without approval see Waiting for editing approval and Check approval. Authentication alone never grants editing. Existing approval queries, pending registration, and database policies remain authoritative.

The API choices follow the official [Supabase password-authentication guide](https://supabase.com/docs/guides/auth/passwords) and [JavaScript signup reference](https://supabase.com/docs/reference/javascript/auth-signup). These distinguish account creation from sign-in and describe confirmation-email behavior. Google brand colors are intentionally retained inside its recognizable sign-in icon; app surfaces retain the existing neutral palette.

## Read-only production verification

The public auth settings reported signup enabled, email confirmation required, and Google and email providers enabled. A read-only query confirmed the existing `on_auth_user_created_pending` trigger is enabled and `approved_users` has row security enabled. No auth configuration, database schema, permissions, or production records were changed. No migration is required.

## Validation and limits

The full desktop/mobile Chromium suite passed 187 cases with 11 intentional skips before the final mobile-detail and callback additions. After those additions, the focused auth suite passed 11 cases with one desktop skip, and the focused auth/mobile-route run passed 12 with two skips. All 122 unit/source checks and the production build passed. Fixtures mock remote authentication and approval responses; no test users or emails were created in production.

Coverage includes visible Google access, request parameters, signup confirmation, password visibility, duplicate submission protection, resend cooldown, inline errors, callback errors, focus restoration, and an immediate-session signup remaining view-only. A fixture with forged admin metadata still cannot edit; only a successful existing approval-table response enables editing. Narrow-phone light/dark accessibility checks reported no serious or critical axe findings. Final desktop and 390px phone screenshots are saved alongside this audit.

Actual SMTP delivery and real Google/email callback completion on a physical phone remain unverified. These require a real account flow after release; mocked tests cannot establish email deliverability. This change is local and has not been pushed or deployed.
