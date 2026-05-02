# Storage Setup (Fix "Bucket not found")

If you see **"Bucket not found"** when using `/storage/signed-url` or accessing upload URLs, the storage buckets have not been created in your Supabase project.

## Quick Fix

1. Open **[Supabase Dashboard](https://supabase.com/dashboard)** → your project
2. Go to **SQL Editor** → **New query**
3. Copy the contents of `storage-setup.sql` and paste
4. Click **Run**

## Verify

1. Go to **Storage** in the Supabase Dashboard
2. You should see: `generated-images`, `product-references`, `campaign-thumbnails`

## Upload Flow (Important)

The `publicUrl` returned by the API points to the file **after** you upload it:

1. **POST** `/storage/signed-url` → get `signedUrl` and `publicUrl`
2. **PUT** the file to `signedUrl` (binary body, `Content-Type: image/png`)
3. Only then will `publicUrl` work when you navigate to it

If you open `publicUrl` before step 2, you'll get 404 because the file doesn't exist yet.

## Alternative: Create Buckets via Dashboard

If the SQL fails (e.g. schema differences):

1. **Storage** → **New bucket**
2. Create: `generated-images` (public), `product-references` (private), `campaign-thumbnails` (public)
3. RLS policies from `storage-setup.sql` may still need to be run for access control
