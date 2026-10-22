# Security & data fixes (Day 1 + Week 1)

This file lists what changed, why, and what you need to do when you deploy it.

## Before you deploy (one-time steps)

1. `pip install -r requirements.txt` (a new package, `argon2-cffi`, was added).
2. If any user has `otp_enabled = 1`, set the `SMTP_*` values in `.env` (see `.env.example`).
   In production, OTP login is **refused** until SMTP is configured, because the code is no longer shown on screen.
   In development the code is printed in the server console only.
3. Run these two clean-up statements once on your existing database:
   ```sql
   -- agents whose login was deleted by the old bug (check they have no listings first)
   SELECT agent_id, name FROM agent WHERE user_id IS NULL;
   DELETE FROM agent WHERE user_id IS NULL;

   -- demo / test accounts with publicly known passwords: delete them (or change their passwords) before going live
   SELECT user_id, email FROM users WHERE email LIKE '%@homefind.com' OR user_id LIKE 'TEST\_%';
   ```
   In production the server prints a WARNING at start-up while any of these accounts still exist.
4. Docker: run with volumes so photos and ID documents survive redeploys:
   `docker run -v homefind_uploads:/app/static/uploads -v homefind_private:/app/private_uploads --env-file .env -p 8000:8000 homefind-api`
5. Existing passwords keep working. Each user's password is upgraded from SHA-256 to Argon2 automatically at their next login.

## What was fixed

| ID | Problem | Fix | Where |
|----|---------|-----|-------|
| C1 | Inquiry text could run as script in the admin's browser | Every value from the server is escaped (`esc()` in new `static/esc.js`); buttons use `data-*` attributes instead of inline JavaScript strings; security headers + Content-Security-Policy added | all pages listed below, `main.py` |
| C2 | OTP was returned in the login response (MFA bypass) | Code is e-mailed (SMTP), never returned; `secrets` for generation; 5-minute expiry; 5 attempts; new token issued after success; production without SMTP fails closed | `main.py`, `login.html` |
| C3 | Unsalted SHA-256 passwords; demo accounts shipped in the image | Argon2id hashing with automatic upgrade at login; password rules (min 8 chars, common passwords refused); seed/test files no longer copied into the Docker image; production start-up warning if demo accounts exist | `main.py`, `Dockerfile`, `requirements.txt` |
| C4 | Any file type could be uploaded as a listing "image" | Only JPEG/PNG/WebP, max 5 MB, type decided from the file's own bytes (client name/type ignored) | `main.py`, `admin_listings.html` |
| C5 | Passwords older than 90 days locked users out | New `POST /api/change_password` and `change_password.html`; uses the same lockout rules as login; signs the user out everywhere after a change | `main.py`, `static/change_password.html` |
| D1 | Duplicate properties in listings (17 rows for 10 properties) | One property = one row (primary unit + one image) on the home page, properties page, detail page and tenant portal | `main.py` |
| D2 | Views never counted; one audit row per page view | `views` increases on each public view of a Published property; audit-per-view removed; unpublished properties return 404 to the public (admin can still preview) | `main.py`, `property.html` |
| D3 | Contact-form messages were lost | Saved as general inquiries (no property) so they appear in the admin inbox | `main.py` |
| D4 | Saving the edit form overwrote every unit | Only the property's primary unit is updated; other units untouched | `main.py` |
| D5 | Replacing a photo wiped the gallery; deleted files stayed on disk | Only the old featured image is replaced; files are deleted when no longer used by any property; Docker volumes | `main.py`, `Dockerfile` |
| D6 | Deleting an agent left an orphan agent row | Agent and login deleted together in one transaction | `main.py` |
| D7 | Admin-created listings went to the first owner in the table | Owner drop-down on the form (required); owner can be changed on edit | `main.py`, `admin_listings.html` |
| D8 | No input validation; database errors shown to users | Validation on listings, agents, inquiries, contact form, inquiry status; generic error messages (details only in the server log) | `main.py` |

Bonus fixes made while editing the same code:
- Lockout counter now resets when a lock expires (one typo no longer re-locks the account).
- Home page "featured" filter works (`is_featured` is now returned by the API).
- An OTP request that carried an already-logged-in token used to crash with a server error.
- Inquiry form phone number is stored when supplied; unknown inquiry/agent/property ids now return 404 instead of "success".

## Behaviour changes to be aware of

- Creating a listing now requires choosing an owner.
- Photos: JPEG, PNG or WebP only, 5 MB maximum.
- The admin edit form edits the property's *primary* unit (a unit called `MAIN`, otherwise the cheapest). A multi-unit editor is not part of this release.
- Content-Security-Policy only allows this site's own scripts, styles and connections (images may come from any https site). If you later add external fonts, analytics or CDN scripts, extend `CSP` in `main.py`.
- Some code excerpts in `README.md` (login / OTP sections) describe the previous version of the code.

## Not included (Month 1 items)

Rate limiting, connection pooling, shared session store, database indexes, verification-approval workflow, dependency upgrades (`python-multipart`, `cryptography`, `pymysql`, `python-dotenv`, `fastapi`), currency column, moving the login token out of `localStorage`.
