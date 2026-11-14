# Google account sign-in

`DownloadAccountForm` provides Google OAuth alongside email/password. Supabase manages the OAuth exchange and session; Google client secrets do not belong in Vite variables or application code. No Gmail/Drive scopes or offline access are requested.

The click opens a blank popup synchronously, removes its opener, requests a Supabase OAuth URL with `skipBrowserRedirect: true` and navigates only to the configured HTTPS Supabase host's `/auth/v1/authorize` endpoint. The return URL is the current origin's `/account`. The originating tool tab retains its generated document in memory. Supabase's normal persisted-session/broadcast events resume the account/download flow when Google sign-in succeeds. Blocked popups can use the existing email flow; OAuth denial displays a safe generic message.

## Provider setup and verification

On 2026-11-14, the public Supabase Auth settings confirmed Google enabled, and starting the production OAuth flow returned HTTP 302 to accounts.google.com with a configured client ID and callback `https://tvgatwhydoseekkosgkb.supabase.co/auth/v1/callback`. No user signed in, account was created or provider setting changed during this check.

The authenticated Supabase dashboard was unavailable in the agent browser, so the Google Cloud consent configuration and Supabase redirect allowlist were not inspected. Confirm these in the dashboard before rollout:

- Google Cloud OAuth client: Web application; callback above in Authorized redirect URIs.
- Supabase Authentication / URL Configuration: production Site URL `https://orbitboard.in`, redirect `https://orbitboard.in/account`.
- For the current PR preview, explicitly allow `https://workorbit-git-feat-pdf-credi-c4bbb1-appdealradar-4261s-projects.vercel.app/account`. Use that stable branch alias for sign-in testing, rather than adding a new immutable deployment URL for each build. Preserve existing approved redirect URLs.
- Consent screen: basic identity scopes only, appropriate audience/test users and production publishing status. Verify a real user signs in and reaches the expected account origin. Check both standalone account and in-tool PDF dialog; verify the generated document remains available in its original tab.

Official guide: https://supabase.com/docs/guides/auth/social-sign-in/auth-google
