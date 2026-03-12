# Profile Page Enhancements - Setup Guide

## 🎉 What's New

The Profile page has been significantly enhanced with the following features:

### ✨ New Features

1. **Profile Completion Progress Bar**
   - Visual indicator showing how complete your profile is
   - Tracks: profile photo, display name, date of birth, bio, and favorite genres

2. **Display Name Field**
   - Add a personalized display name
   - Max 50 characters
   - Stored per user (or guest)

3. **Bio/About Section**
   - Add a personal bio (up to 500 characters)
   - Character counter included
   - Tell your cinematic story!

4. **Favorite Genres Selector**
   - Click to select/deselect your favorite genres
   - Visual badges with hover effects
   - 19 different genres to choose from

5. **Privacy Settings**
   - Public Profile toggle
   - Show/Hide Watchlist option
   - Show/Hide Statistics option
   - All settings stored locally

6. **Enhanced Date of Birth Validation**
   - Age must be between 13 and 120
   - Real-time validation with error messages
   - Max date set to today

7. **Improved Loading States**
   - Skeleton loaders for actor matches
   - Better visual feedback during data fetching

8. **Supabase Storage Integration for Profile Photos**
   - Authenticated users: photos stored in Supabase Storage
   - Guest users: photos stored as base64 in localStorage
   - 2MB file size limit
   - Prevents localStorage quota issues for authenticated users

---

## 🔧 Supabase Storage Setup

To enable profile photo uploads for authenticated users, you need to create a storage bucket in Supabase:

### Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New Bucket**
4. Configure the bucket:
   - **Name**: `profile-photos`
   - **Public bucket**: ✅ Yes (check this box)
   - **File size limit**: 2MB (optional)
   - **Allowed MIME types**: `image/*` (optional)

### Step 2: Set Storage Policies

Add these policies to the `profile-photos` bucket:

#### Policy 1: Allow Authenticated Users to Upload
```sql
-- Allow authenticated users to upload their own profile photos
CREATE POLICY "Users can upload their own profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 2: Allow Public Read Access
```sql
-- Allow anyone to view profile photos (public bucket)
CREATE POLICY "Public can view profile photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');
```

#### Policy 3: Allow Users to Update Their Photos
```sql
-- Allow users to update their own profile photos
CREATE POLICY "Users can update their own profile photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 4: Allow Users to Delete Their Photos
```sql
-- Allow users to delete their own profile photos
CREATE POLICY "Users can delete their own profile photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Alternative: Quick Setup via SQL Editor

Run this in your Supabase SQL Editor:

```sql
-- Create the bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies
CREATE POLICY "Users can upload their own profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Public can view profile photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can update their own profile photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own profile photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## 📝 Translation Keys Added

The following translation keys have been added to `src/locales/en.json`:

- `profile.profileCompletion`
- `profile.profileDetails`
- `profile.displayName`
- `profile.displayNamePlaceholder`
- `profile.dateOfBirth`
- `profile.currentAge`
- `profile.about`
- `profile.bio`
- `profile.bioPlaceholder`
- `profile.characters`
- `profile.favoriteGenres`
- `profile.privacySettings`
- `profile.publicProfile`
- `profile.publicProfileDesc`
- `profile.showWatchlist`
- `profile.showWatchlistDesc`
- `profile.showStats`
- `profile.showStatsDesc`

**Note:** If you're supporting multiple languages, don't forget to add these keys to other locale files (e.g., `es.json`, `fr.json`, etc.).

---

## 🎨 UI Components Used

The following shadcn/ui components are now used in the Profile page:

- ✅ `Badge` - for genre selection
- ✅ `Switch` - for privacy settings toggles
- ✅ `Progress` - for profile completion bar
- ✅ `Card`, `CardContent` - for section containers
- ✅ `Button` - for photo upload/remove
- ✅ `Input` - for text and date inputs
- ✅ `Label` - for form labels
- ✅ `Select` - for language selection

All these components are already installed in your project.

---

## 📦 Data Storage

All profile data is stored in `localStorage` with the key pattern:
```
cinetrekker_profile_{user_id or 'guest'}
```

### Stored Data Structure:
```typescript
{
  photo: string | null,           // URL or base64
  dob: string,                     // YYYY-MM-DD
  displayName: string,
  bio: string,
  favoriteGenres: number[],       // TMDB genre IDs
  settings: {
    publicProfile: boolean,
    showWatchlist: boolean,
    showStats: boolean,
    allowRecommendations: boolean
  }
}
```

---

## 🔐 Security Notes

1. **File Size Limit**: Profile photos are limited to 2MB to prevent abuse
2. **Age Validation**: Users must be at least 13 years old (COPPA compliance)
3. **Storage Separation**: Authenticated users use Supabase Storage, guests use localStorage
4. **Public Bucket**: Profile photos are publicly accessible (required for display)

---

## 🎯 Future Enhancements

Consider adding these features in the future:

- [ ] Social sharing of profile
- [ ] Profile themes/customization
- [ ] Achievement badges
- [ ] Profile URL slugs (username-based URLs)
- [ ] Export profile data
- [ ] Profile visibility controls (friends-only, etc.)
- [ ] Integration with TMDB account linking

---

## 🐛 Known Limitations

1. Guest users still use base64 storage (localStorage quota ~5MB)
2. No image cropping/resizing UI (users must upload pre-sized images)
3. Privacy settings are stored locally (not in Supabase database)

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify Supabase storage bucket is created and public
3. Ensure storage policies are configured correctly
4. Clear localStorage if you see stale data: `localStorage.clear()`
