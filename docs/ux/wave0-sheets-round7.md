# Round 7 sheets: Sign in and Account (2026-10-19, draft)
Grounded in: `frontend/src/lib/auth.ts` (email and password, sign up, sign out, change password with re-check of the old one; Google and Apple buttons only when configured), `app/login/page.tsx` (email, password with show toggle, bot check, Terms and Privacy line), `app/account/page.tsx` (change password and sign out only), `/api/me/profile` (a member edits their own bio, 1000 characters, audited), `/api/me/claim` (code to link a record). Password reset has no flow in the code; sending reset emails needs a mail sender and the project has no domain (Supabase's built-in mail only reaches team addresses).
Rules applied: flat paper, 2 px ink underline fields, accent underline links, one primary button (ink, hard accent shadow) at the foot in the thumb zone, 44 px targets, 16 px field text (no iOS zoom), back link top-left, errors in text next to the field.

## S1 Sign in
+------------------------------------+
| < Back                             |
| Sign in                            |
| Email                              |
| [__________________________]       |
| Password                  Show     |
| [__________________________]       |
| Forgot your password?              |
| (bot check, shown only when needed)|
| Error text, one line, under field  |
|                                    |
| [ Sign in                    > ]   |
| No account? Create one             |
| (Continue with Google / Apple      |
|  only when configured)             |
+------------------------------------+
## S2 Create an account
Same fields; password hint "8 or more characters"; line: "By creating an account you agree to the Terms and Privacy notice" (links); [Create account >]; "Have an account? Sign in". After success: lands on Me, "Link your record" state, and the letter (first sign-in only).
## S3 Forgot password (three states)
 a. Enter email -> [Send reset link >]
 b. "Check your email. The link works for one hour." (same text whether or not the email exists, so nobody can probe for accounts) [Back to sign in]
 c. From the email link: New password, Repeat password, Show -> [Set password >] -> signed in, lands on Me.
 Needs a mail sender (no domain yet). Mockup draws all three; real sending waits for it.

## S4 Profile and account: two layouts
Option A, one scrolling page, sections stacked
 Profile: name (from your record, read only), bio (editable, 1000 character counter) [Save bio]
 Email (read only)
 Password: [Change password]
 Linked record: Abhiram . 065-01
 [Sign out]
Option B, list of rows, one job per screen (recommended: same pattern as Me, fewer fields per screen)
+------------------------------------+
| < Me                               |
| Profile and account                |
| Profile            Abhiram       > |  name, bio
| Email              a@b.c         > |  read only
| Password                         > |  change
| Linked record      065-01        > |  code, or "Link a record"
| Sign out                         > |
+------------------------------------+
 B1 Profile: name (from the record, read only, "Ask an admin to change it"), bio field with counter, [Save bio >] at the foot.
 B2 Password: current, new (8 or more), show toggles, [Change password >]; error "The current password is wrong."
 B3 Linked record: shows name and code; "Not you? Ask an admin." (unlinking is an admin job); if none: code field and [Link record >].
 Sign out: confirm sheet, then Home.

## Needs your call
1. Account layout A or B? (I recommend B.)
2. Delete account (the right to erase under DPDP): add a row "Delete account" with a confirm sheet, or leave it for later? The code has no delete route today.
3. Profile photo: keep the round initial only (no upload built), or add photo upload later?
4. Display name: it comes from the linked record and members cannot edit it (so nobody impersonates another reader). Right?
5. Sign-in providers: show Google and Apple buttons in the mockup (hidden in the live demo until configured), or leave them out?

## Revision 1 (2026-10-19): password show/hide everywhere
Founder: "the password should have that hide/unhide option". Every password field (sign in, sign up, reset, change, delete confirmation) gets a text toggle at the right of the field, "Show" / "Hide", 44 px, pressed state announced to screen readers. Research behind the other open points: `docs/ux/research-proton-account.md`.

# Revision 2 (2026-10-19): decisions folded in
Flat paper, underlined fields, one ink primary button at the foot, 44 px targets, Show / Hide on every password field.

S1 Sign in: email; password + Show; [ ] Keep me signed in (consent: "Only on a device that only you use"); Forgot your password?; error line; [Sign in >]; Create one. If 2FA is on: step 2 "Enter the 6-digit code" [Verify >], "Use a backup code".
S2 Create account: email; password + Show (8+); standalone notice (DPDP): what we keep (email and password for sign-in; your name and books come from club records; bio, wishlist and picks only if you add them), why (to run the club site, nothing else), your rights (see, correct, update, erase, withdraw consent, nominate someone), contact brokebibliophilesbangalore@gmail.com, answers within 90 days; [ ] I agree; [Create account >].
S2b Recovery phrase (shown once): 12 numbered words, [Copy] [Download], [ ] I have saved it somewhere safe, [Continue >]. "If you forget your password these 12 words are the only way to reset it yourself. We cannot show them again."
S3 Forgot password: a) email + the 12 words -> New password + Show -> [Set password >] -> a NEW phrase is shown once (a used phrase stops working). b) "Lost the 12 words? Ask an admin for a reset code": email + code -> New password -> new phrase.
S4 Profile and account (rows, grouped):
 Sign-in and security: Email (read only) / Password / Recovery phrase / Two-factor authentication
 Your record: Profile (name read only, bio 1000) / Linked record
 Your data: Download my data / Privacy and requests / Delete account
 Sign out
 Password: current, new + Show, [Change password >]
 Recovery phrase: created date; [Make a new phrase] needs the password; warns the old one stops working
 Two-factor: off -> [Turn on]: scan QR (or type key), enter 6-digit code, then 10 backup codes shown once; on -> [Turn off] needs password and a code
 Download my data: [Prepare my file >] -> your sign-in email, bio, entries, wishlist, picks, linked record; Ready -> [Download]
 Privacy and requests: your rights in plain words, the club email, 90 days, link to the Privacy notice
 Delete account (Proton's flow): reason (list) -> warning "Permanent. We cannot recover it." -> [ ] Yes, I want to permanently delete this account -> password (+ 2FA code) -> [Delete account >] -> signed out confirmation
Admin: Members tool gets "Issue reset code" (one-time, hashed, expiry, same pattern as claim codes).
Build notes: Supabase Auth has no recovery-phrase feature, so the phrase would be our own table (hashed, rate-limited, replaced after use) with the server setting the new password. Supabase MFA (TOTP) is believed to exist; not re-checked this session.
