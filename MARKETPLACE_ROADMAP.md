# Roadmap: Multi-Tenant Real Estate Marketplace

This document outlines the steps to transform the HomeFind application from a "Single Agency" site into a **Multi-Vendor Marketplace** where multiple "Property Masters" (Agencies) can list and manage their own diverse properties.

## Phase 1: Database Multi-Tenancy
Currently, everything is under one roof. We need to "silo" the data so Property Masters only see their own listings.

1.  **Add `Agency` Model**: Create a new table in `schema.prisma`.
    - Fields: `id`, `name`, `logoUrl`, `verifiedStatus`, `address`, `contactEmail`.
2.  **Link Users (Agents)**: Add `agencyId` to the `User` model.
    - This allows agents to be part of a specific "Property Master" team.
3.  **Link Properties**: Add `agencyId` to the `Property` model.
    - Ensures every property has a clear "Owner" (the Agency).

## Phase 2: Role & Permission Scoping
We need to redefine who can see and do what in the Admin Dashboard.

1.  **New Role: `AGENCY_ADMIN`**:
    - This role has full control over THEIR agency's listings and agents, but cannot see other agencies.
2.  **Dashboard Filtering**:
    - Modify API routes (e.g., `/api/admin/listings`) to automatically filter by `agencyId` based on the logged-in user's session.
3.  **Global `SUPER_ADMIN`**:
    - Keeps the ability to see and manage all agencies across the entire platform.

## Phase 3: Marketplace Frontend Features
The public website should showcase the diversity of your Property Masters.

1.  **Agency Profiles**: A new "Agencies" directory page showing all the Property Masters.
2.  **Listing Branding**: Update the property detail page to show:
    - "Listed by: [Agency Name]"
    - Agency's logo and direct contact button.
3.  **Search by Agency**: Allow users to filter the main property grid by specific companies.

## Phase 4: Monetization & Verification
1.  **Verified Badges**: Allow you (the platform owner) to mark high-quality Property Masters with a "Verified" badge.
2.  **Listing Packages**: Implement a system where Property Masters buy credits or subscriptions to list properties.

---

### How to Implement Phase 1
When you are ready, we will:
1. Update `prisma/schema.prisma` with the new `Agency` model.
2. Run `npx prisma db push` to update your Supabase database.
3. Update `src/lib/auth.ts` to include the `agencyId` in the session.
