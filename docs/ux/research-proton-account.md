# Research: Proton account policies as a reference for BBB Sign in and Account (2026-10-19)
Method: web search over Proton support pages, Proton legal pages, and India's DPDP sources. Evidence is from search excerpts of those pages, not full-page reads. Proton's own sign-up page was not seen (only its sign-in page).

## Sourced (Proton)
- Sign-in page: "Email or username", "Password", checkbox "Keep me signed in" (hint "Recommended on trusted devices. Why?"), button Sign in, "New to Proton? Create account", "Trouble signing in?", Terms and Privacy policy links at the foot. (account.proton.me)
- Change password: Settings, Account and password, pencil. Re-enter current password to "Authenticate" first; then New password and Confirm password; a "Generate password" button; minimum 8 characters, 12+ recommended; eye icon to view the password; advice to type, not paste. (proton.me/support/how-to-change-your-password)
- Recovery has two stages because Proton data is end-to-end encrypted: account recovery (email, SMS, 12-word recovery phrase, device-based) resets the password; data recovery (phrase, file, device backup) restores the encrypted data. Email and SMS recovery alone do not restore data. (proton.me/support/set-account-recovery-methods, /email-sms-recovery, /recover-encrypted-messages-files)
- 2FA: authenticator app and security keys; a 2FA recovery code can be requested through a saved recovery method. (support pages)
- Sessions: you can log out all other sessions; sessions expire after 60 days of inactivity. (proton.me/support/log-out-all-other-sessions)
- Delete account: Settings, Account and password, Delete account; give a reason; warning; tick "Yes, I want to permanently delete this account and all its data"; re-enter password (and a 2FA code). No recovery afterwards; usernames are never recycled. (proton.me/support/delete-account)
- Inactive accounts: free accounts inactive for 12 months may be deleted; reminders 30, 15 and 7 days before. (Terms, inactive accounts page)
- Privacy policy: users can "access, edit, delete, or export" their data through the Account interface; recovery email is used only for notices, security and reset links. (proton.me/legal/privacy)

## Sourced (India DPDP)
- DPDP Rules, 2025 notified in November 2025 (PIB says 14 Nov; DSCI says 13 Nov); 18-month phased compliance. Rights: access, correct, update, erase, grievance, nominate; requests answered within 90 days; a standalone, plain-language consent notice stating the purpose; withdrawing consent as easy as giving it; publish how to make a rights request and a contact for queries; breach notices in plain language; verifiable parent consent for children.
- Rule 8(2) as summarised by a compliance note: 48 hours' notice before erasure of data held beyond the retention period, for the classes of fiduciary named in the Third Schedule.

## Inference
- 18 months from mid-November 2025 puts full obligations around mid-May 2027, after the 2026-11-04 launch. Whether BBB is a covered Data Fiduciary class under the Third Schedule was not checked.
- Proton's two-stage recovery exists because of end-to-end encryption. BBB data is not end-to-end encrypted, so a single reset step is enough.
- Supabase Auth can sign out other sessions (`signOut({ scope: 'others' })`); not re-checked this session.

## Gaps in our S1 to S4 sheets
1. Show/hide: required on every password field (sign in, sign up, reset, change). S2 and S3 did not say so.
2. Confirm field: Proton uses New plus Confirm on change; with a show toggle the confirm field is optional.
3. Keep me signed in: Proton asks; we have a provisional rule (admin 24 hours, members 30 days) and no checkbox.
4. Re-enter the password before sensitive actions (our change password already does; delete must too).
5. No delete-account row and no data export row (Proton and DPDP both give these).
6. No published rights-request and grievance contact line (DPDP Rule 14).
7. Sign-up consent: DPDP wants a standalone notice of purposes, not only "agree to Terms".
8. No "sign out of other devices".
