# Prestige Properties — Handover Documentation

## Project Overview

A full-stack, production-ready real estate web application built on a 100% free-tier infrastructure stack.

**Live URL:** Configure in `.env` → `NEXT_PUBLIC_SITE_URL`
**Admin Dashboard:** `<site-url>/admin`
**Tech Stack:** Next.js 14, TypeScript, Prisma, Supabase (PostgreSQL), Cloudinary, Tailwind CSS

---

## 1. Free-Tier Infrastructure

| Service | Purpose | Limits | Dashboard |
|---|---|---|---|
| **Vercel** | Hosting + API Routes | 100GB bandwidth/mo | vercel.com |
| **Supabase** | PostgreSQL database | 500MB storage | supabase.com |
| **Cloudinary** | Image CDN & storage | 25GB storage | cloudinary.com |
| **Upstash Redis** | Rate limiting | 10,000 cmds/day | upstash.com |
| **Resend** | Transactional email | 3,000 emails/mo | resend.com |
| **Cloudflare Turnstile** | Bot/spam protection | Unlimited | cloudflare.com |
| **GitHub Actions** | CI/CD | 2,000 mins/mo | github.com |
| **UptimeRobot** | Uptime monitoring | 50 monitors | uptimerobot.com |

**Estimated annual cost:** ~$10–15 (domain registration only)

---

## 2. Local Development Setup

### Prerequisites
- Node.js 20+
- npm or pnpm
- Git

### Steps

```bash
# 1. Clone repository
git clone https://github.com/your-org/prestige-properties.git
cd prestige-properties

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials (see Section 3)

# 4. Generate Prisma client
npx prisma generate

# 5. Run database migrations
npx prisma migrate dev

# 6. Seed initial data
npm run db:seed

# 7. Start development server
npm run dev
```

Open http://localhost:3000 for the site and http://localhost:3000/admin for the admin.

**Initial login credentials (CHANGE IMMEDIATELY):**
- Super Admin: `admin@prestigeproperties.com` / `Admin@123!`
- Agent: `agent@prestigeproperties.com` / `Agent@123!`

---

## 3. Environment Variables Reference

| Variable | Purpose | Where to Get |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Production URL | Your domain |
| `NEXTAUTH_URL` | Auth callback URL | Same as site URL |
| `NEXTAUTH_SECRET` | JWT signing secret | `openssl rand -base64 32` |
| `DATABASE_URL` | Supabase pooled connection | Supabase → Settings → Database |
| `DIRECT_URL` | Supabase direct connection | Supabase → Settings → Database |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary account | Cloudinary → Dashboard |
| `CLOUDINARY_API_KEY` | Cloudinary API | Cloudinary → Dashboard |
| `CLOUDINARY_API_SECRET` | Cloudinary API | Cloudinary → Dashboard |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Unsigned upload preset | Cloudinary → Settings → Upload |
| `EMAIL_HOST` | SMTP host | `smtp.resend.com` |
| `EMAIL_USER` | SMTP username | `resend` |
| `EMAIL_PASS` | SMTP password / API key | Resend → API Keys |
| `EMAIL_FROM` | From address | Your verified domain |
| `ADMIN_EMAIL` | Inquiry notification recipient | Your email |
| `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY` | Form protection | Cloudflare → Turnstile |
| `CLOUDFLARE_TURNSTILE_SECRET` | Server-side verification | Cloudflare → Turnstile |
| `UPSTASH_REDIS_REST_URL` | Rate limiting | Upstash → Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting auth | Upstash → Redis |
| `NEXT_PUBLIC_GA4_ID` | Analytics | Google Analytics |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | WhatsApp button | Your number (digits only) |

---

## 4. Admin Dashboard Guide

### Creating a Property Listing

1. Go to **Admin → Listings → New Listing**
2. Complete the 7-step wizard:
   - **Step 1:** Title, listing type (Sale/Rent), category, status
   - **Step 2:** Full address + drag pin on map for coordinates
   - **Step 3:** Price, bedrooms, bathrooms, size details
   - **Step 4:** Select amenities from the grid
   - **Step 5:** Write description in the rich text editor
   - **Step 6:** Upload and order images; add video URL
   - **Step 7:** SEO fields, assign agent, publish
3. Set Status to **Published** to make it live, or **Draft** to save without publishing.
4. Progress is auto-saved every 30 seconds.

### Managing Inquiries

1. Go to **Admin → Inquiries**
2. Filter by status tab (New, In Progress, etc.)
3. Click any inquiry to open the detail view
4. From detail view you can:
   - **Reply** — compose and send an email reply
   - **Add Note** — private internal note (not sent to client)
   - **Change Status** — move through the workflow
   - **Assign Agent** — assign to a team member

### Managing Media

1. Go to **Admin → Media Library** to view all uploaded images
2. Within a listing, drag-and-drop images to reorder them
3. The first image (or the one marked "featured") becomes the listing thumbnail
4. Images are auto-compressed and watermarked via Cloudinary

---

## 5. Database Schema Summary

Key tables and their purpose:

| Table | Purpose |
|---|---|
| `User` | Admin accounts and agents |
| `Property` | All property listings |
| `PropertyMedia` | Images and documents linked to listings |
| `Amenity` | Master list of amenities |
| `PropertyAmenity` | Many-to-many: listings ↔ amenities |
| `Inquiry` | All form submissions from the site |
| `InquiryNote` | Private internal notes on inquiries |
| `InquiryReply` | Email replies sent from the admin |
| `BlogPost` | CMS blog/news articles |
| `TeamMember` | About page team section |
| `Testimonial` | Homepage testimonials |
| `FAQ` | Services page FAQ items |
| `Subscriber` | Newsletter subscribers |
| `AuditLog` | Full activity log of all admin actions |
| `SiteSettings` | Site-wide config (name, contact, social links) |
| `Session` | Active admin login sessions |

### Running Migrations

```bash
# Development — creates a migration file
npx prisma migrate dev --name your-change-description

# Production — applies pending migrations (runs in CI/CD automatically)
npx prisma migrate deploy

# Reset database (⚠️ DESTROYS ALL DATA — dev only)
npx prisma migrate reset
```

---

## 6. API Endpoints Reference

### Public Endpoints (No Auth)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/properties` | List properties with filter/sort/pagination |
| `GET` | `/api/properties/[slug]` | Get single property by slug |
| `GET` | `/api/locations` | Autocomplete location suggestions |
| `POST` | `/api/inquiries` | Submit property/contact inquiry |
| `POST` | `/api/contact` | Submit general contact form |
| `POST` | `/api/newsletter` | Subscribe to newsletter |

### Admin Endpoints (Auth Required)

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `GET/POST` | `/api/admin/listings` | Admin+ | List/create listings |
| `GET/PATCH/DELETE` | `/api/admin/listings/[id]` | Admin+ | Read/update/delete listing |
| `POST` | `/api/admin/listings/[id]/duplicate` | Admin+ | Duplicate listing |
| `GET/PATCH` | `/api/admin/inquiries` | Admin+ | List/bulk update inquiries |
| `GET/PATCH` | `/api/admin/inquiries/[id]` | Admin+ | View/update single inquiry |
| `POST` | `/api/admin/inquiries/[id]/reply` | Admin+ | Send email reply to inquiry |
| `GET/POST` | `/api/admin/settings` | Super Admin | Get/update site settings |
| `GET` | `/api/admin/users` | Super Admin | List admin users |

---

## 7. Deployment

### Initial Deploy to Vercel

1. Push code to GitHub
2. Go to vercel.com → New Project → Import from GitHub
3. Set all environment variables from Section 3
4. Deploy — Vercel auto-detects Next.js and configures everything

### Automatic Deploys

- **Every push to `main`** → deploys to production automatically
- **Every PR** → deploys to a unique preview URL for review

### Custom Domain

1. In Vercel → Domains → Add Domain
2. In your DNS provider (Cloudflare recommended), add the Vercel DNS records
3. Vercel auto-provisions a free SSL certificate

---

## 8. Backup & Recovery

### Database Backups

Supabase automatically creates daily backups (7-day retention on free tier).

**Manual backup:**
```bash
pg_dump "postgresql://postgres:[password]@[host]:5432/postgres" > backup-$(date +%Y%m%d).sql
```

**Restore from backup:**
```bash
psql "postgresql://postgres:[password]@[host]:5432/postgres" < backup-file.sql
```

### Disaster Recovery Steps

1. Create new Supabase project
2. Copy new `DATABASE_URL` and `DIRECT_URL`
3. Run `npx prisma migrate deploy`
4. Restore from latest SQL backup
5. Update environment variables in Vercel
6. Trigger redeploy in Vercel

**Estimated Recovery Time: < 2 hours**

---

## 9. Monthly Maintenance Checklist

- [ ] Check Vercel Analytics for performance regressions
- [ ] Run `npm audit` and update vulnerable packages
- [ ] Review Supabase storage usage (free limit: 500MB)
- [ ] Review Cloudinary storage/bandwidth usage (free: 25GB each)
- [ ] Check UptimeRobot for any downtime events
- [ ] Review inquiry inbox — close stale inquiries
- [ ] Purge soft-deleted listings older than 30 days:
  ```sql
  DELETE FROM "Property" WHERE "deletedAt" < NOW() - INTERVAL '30 days';
  ```
- [ ] Review Google Analytics for traffic trends
- [ ] Test backup restore procedure (quarterly)

---

## 10. Security Notes

- All passwords are bcrypt-hashed (12 rounds)
- JWT tokens expire after 8 hours
- Accounts lock after 5 failed login attempts (30 min lockout)
- All public forms protected by Cloudflare Turnstile + honeypot
- API rate limiting via Upstash Redis
- User-generated HTML sanitized with DOMPurify before storage/render
- All secrets in environment variables — never in code

**⚠️ IMPORTANT: Change the default seed passwords immediately after first login!**
