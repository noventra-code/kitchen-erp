# Kitchen ERP - Change Log

## 2026-05-07 (Session)

### Multi-Tenant Rebuild & Fixes

**Commit 5a7083e** - CogProfile: Fetch role from database API instead of localStorage
- Backend: Add GET /api/my-role endpoint (uses tenantContext, returns req.userRole)
- CogProfile: Fetch role from /api/my-role when dropdown opens
- Remove localStorage logic for role in CogProfile
- Role now comes from database (memberships table) via API call

**Commit 6f38bb2** - CogProfile: Display user role under name based on current tenant membership
- Read memberships from localStorage to determine current role
- Display role as colored badge under user name in COG dropdown
- Show selected tenant name under user email for context
- Fix role display to use currentRole (from memberships) instead of deprecated user.role
- Update logout to clear new localStorage items (memberships, selectedTenantId)
- Add support for Editor role badge (green)

**Commit 6fe52e3** - Add CHANGELOG.md to track all changes and prevent regressions

**Commit 49b5cb1** - Fix: Resolve 'Tenant Context required' error
- ROOT CAUSE: Backend fixed-costs routes used obsolete getTenantDb() helper that reads tenant_id from JWT (no longer exists)
- FIX: Updated all fixed-costs routes to use tenantContext middleware (sets req.tenantDb)
- FIX: Frontend Login.jsx now processes memberships array, auto-selects tenant if only one membership
- FIX: TenantSelector.jsx rewritten - works for ALL users, not just admins
- FIX: App.jsx role checks updated to use memberships array instead of deprecated user.role
- DELETED: Obsolete getTenantDb() function from backend

**Commit 7e8b93f** - Rename MasterAdmin.jsx to SuperAdmin.jsx
- Fixed import error in App.jsx (expected SuperAdmin, found MasterAdmin)

**Commit 20adc92** - Fix api.js: handle undefined options.headers
- Changed spread to `...(options.headers || {})` to prevent runtime error

**Commit 7cfc036** - Fix apiFetch is not defined error
- Added missing `import apiFetch from '../api'` to 10 frontend components

**Commit d23cae0** - Multi-tenant rebuild: Registry-based factory model
- Replaced old tenant system with physical DB isolation (one DB per tenant)
- New schema: users (global), tenants (registry), memberships (junction table)
- JWT no longer contains tenant_id/role - uses X-Tenant-ID header
- Login returns memberships array instead of single tenant_id

---

## Key Patterns to Remember

1. NEVER access file system outside /root/.hermes/kitchen-erp without permission
2. Middleware is Express.js style (req, res, next) - NOT Next.js
3. PostgreSQL decimal fields need parseFloat() before JSON responses
4. DO NOT wipe database unless user explicitly says "can" or gives direct permission
5. Profile link in cog menu = visible to ALL logged-in users
6. After finding root cause of bug, IMPLEMENT FIX IMMEDIATELY (don't ask, just do it)
7. apiFetch is the standard fetch wrapper - import it in all pages that call API
8. CRITICAL USER RULE: Do NOT remove or delete any features without explicit user confirmation

## Development Methodology (Adopted 2026-05-07)

Using **superpowers methodology** (from obra/superpowers) as core mindset:

1. **BRAINSTRMING** - Refine ideas through questions, explore alternatives BEFORE coding
2. **WRITE PLANS** - Break work into bite-sized tasks (2-5 min each), exact file paths, verification steps
3. **TDD ALWAYS** - RED-GREEN-REFACTOR cycle (write failing test, watch it fail, write minimal code)
4. **SYSTEMATIC DEBUGGING** - 4-phase root cause (understand, find root cause, fix, verify)
5. **EVIDENCE OVER CLAIMS** - Verify before declaring success
6. **COMPLEXITY REDUCTION** - Simplicity as primary goal, YAGNI, DRY
7. **SUBAGENT-DRIVEN DEVELOPMENT** - Dispatch subagents per task with two-stage review

---

## Database State

- Main DB: kitchen_erp_main (registry)
- Tenants: Demo Kitchen, Test New Tenant (x2)
- Demo users: admin@example.com (SuperAdmin), superadmin@example.com (SuperAdmin), pizzasolutionsgroupllc@gmail.com (TenantAdmin)

---

## Working Commits (most recent first)

49b5cb1 - Fix: Resolve 'Tenant Context required' error on fixed-costs page
7e8b93f - Rename MasterAdmin.jsx to SuperAdmin.jsx to fix import error
20adc92 - Fix api.js: handle undefined options.headers gracefully
7cfc036 - Fix apiFetch is not defined error in multiple frontend components
d23cae0 - Multi-tenant rebuild: Registry-based factory model with physical DB isolation
