# AppExchange Security Fixes — Pre-Submission Checklist

Last audited: Feb 28, 2026

---

## STATUS SUMMARY

| # | Category | File | Status |
|---|---|---|---|
| 1 | OAuth scope too broad | `org-sync/src/lib/salesforce/oauth.ts` | ❌ MUST FIX |
| 2 | Missing DB column (`status_message`) | `org-sync/supabase/migrations/` + worker | ❌ MUST FIX |
| 3 | Delete account uses wrong Supabase client | `org-sync/src/app/api/settings/delete-account/route.ts` | ❌ MUST FIX |
| 4 | Auth URL logged to console | `org-sync/src/app/api/salesforce/connect/route.ts` | ⚠️ WARN |
| 5 | `env` param not validated | `org-sync/src/app/api/salesforce/connect/route.ts` | ⚠️ WARN |
| 6 | Crypto key length not checked in main app | `org-sync/src/lib/salesforce/crypto.ts` | ⚠️ WARN |

---

## Fix 1 — OAuth Scope: `full` → Least Privilege

**File:** `org-sync/src/lib/salesforce/oauth.ts`  
**Line:** ~10

**Current (FAILS review):**
```ts
const OAUTH_SCOPES = ["full", "refresh_token", "offline_access"].join(" ");
```

**Fix:**
```ts
const OAUTH_SCOPES = ["api", "refresh_token", "offline_access"].join(" ");
```

**Why:** Salesforce security reviewers specifically check for `full` scope. It grants admin-level access to everything.  
`api` covers all REST/SOQL operations needed for sync. Nothing else is required.

---

## Fix 2 — Missing `status_message` Column on `connected_orgs`

**Files:**
- `org-sync/supabase/migrations/` — add new migration
- `org-sync-worker/src/salesforce.ts` — already writes to this column (line ~65)

**New migration to run in Supabase SQL Editor:**
```sql
alter table public.connected_orgs
  add column if not exists status_message text;
```

**Why:** The worker tries to write `status_message` when a token refresh fails (to flag a broken org in the UI), but the column doesn't exist in the schema. This causes a silent DB error and the org never gets marked as broken.

---

## Fix 3 — Delete Account Uses Wrong Supabase Client

**File:** `org-sync/src/app/api/settings/delete-account/route.ts`  
**Line:** ~31

**Current (FAILS silently):**
```ts
const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
// `supabase` here uses the anon key — admin.deleteUser requires service role
```

**Fix:** Import and use `createAdminClient()` (service role) for the delete step:
```ts
import { createAdminClient } from "@/lib/supabase/admin";
// ...
const adminClient = createAdminClient();
const { error: authError } = await adminClient.auth.admin.deleteUser(user.id);
```

**Why:** `auth.admin.deleteUser()` requires the service role key. With the anon key it silently fails — the customer record gets deleted from the DB but the Supabase auth user remains, leaving a ghost account.

---

## Fix 4 — Remove Auth URL Console Log

**File:** `org-sync/src/app/api/salesforce/connect/route.ts`  
**Line:** ~30

**Current:**
```ts
console.log("SF AUTH URL:", authUrl);
```

**Fix:** Delete this line entirely (or wrap in `if (process.env.NODE_ENV === "development")`).

**Why:** The auth URL contains the OAuth `state` param and `code_challenge`. Not tokens, but still sensitive OAuth data that shouldn't appear in production logs.

---

## Fix 5 — Validate `env` Query Param

**File:** `org-sync/src/app/api/salesforce/connect/route.ts`  
**Line:** ~19

**Current:**
```ts
const env = (searchParams.get("env") ?? "production") as SalesforceEnv;
```

**Fix:**
```ts
const rawEnv = searchParams.get("env") ?? "production";
if (!["production", "sandbox"].includes(rawEnv)) {
  return NextResponse.json({ error: "Invalid env parameter" }, { status: 400 });
}
const env = rawEnv as SalesforceEnv;
```

**Why:** Unvalidated input reaching `buildAuthUrl`. A reviewer will flag any route that passes unsanitized query params into logic without validation.

---

## Fix 6 — Add Crypto Key Length Validation in Main App

**File:** `org-sync/src/lib/salesforce/crypto.ts`

**Current (no validation):**
```ts
function getKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY!;
  return Buffer.from(hex, "hex");
}
```

**Fix (match what the worker already does):**
```ts
function getKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}
```

**Why:** The worker already validates this. Inconsistency between worker and main app is a potential misconfiguration risk. If the key is wrong length, `createCipheriv` throws a cryptic error instead of a clear one.

---

## What's Already Good (Don't Touch)

- ✅ AES-256-GCM token encryption at rest
- ✅ PKCE fully implemented on OAuth flow
- ✅ OAuth state param time-limited + user-bound (CSRF protection)
- ✅ Salesforce record field values never stored in DB (IDs only)
- ✅ Full tenant isolation via Supabase RLS on every table
- ✅ All portal API routes check auth before responding
- ✅ No hardcoded credentials anywhere

---

## How to Apply

All 6 fixes are small, isolated changes. Estimated time: ~30 minutes.  
Run Fix 2 (SQL migration) in Supabase Dashboard → SQL Editor before deploying code changes.
