# Actor Matches Testing Guide

## Overview
The Actor Matches feature has been enhanced with comprehensive console logging to help diagnose data flow and identify why matches may or may not appear.

## How to Test

### 1. Open Your Profile
1. Navigate to your Profile page
2. Ensure you're logged in (required for data storage)
3. Open your browser's Developer Console (F12 on Windows/Linux, Cmd+Option+J on Mac)
4. Switch to the "Console" tab

### 2. Set Your Date of Birth
1. Scroll to the "Birthday" field in your Profile
2. Enter your date of birth (MM/DD/YYYY format)
3. The system will automatically trigger the Actor Matches query
4. **Check Console** - You should see emoji-prefixed log messages

### 3. Analyze the Console Output

When you set your birthday, you'll see several console messages:

#### Data Fetching Phase
```
🔍 Fetching popular people for birthday match...
📋 Fetched 60 people from 3 pages
✅ Got details for X people
🎂 Z people have birthday data
```

**What to look for:**
- ✅ If "Fetched 60 people" appears → API is working
- ✅ If "Got details for [high number]" appears → Most API calls succeeded
- ⚠️ If "people have birthday data" count is 0-5 → Data issue (unlikely from TMDB)

#### User Data Parsing Phase
```
👤 User birthday: 3/15, Age: 32
```

**What to look for:**
- ✅ Your birth month and day display correctly
- ✅ Your calculated age is correct
- ⚠️ If missing → User DOB wasn't parsed properly

#### Matching Phase (if matches exist)
```
🎯 Birthday match: Edward Norton (3/29)
🎯 Birthday match: Marlon Brando (4/3)
🎂 Found 2 birthday matches
```

**What to look for:**
- ✅ Actor names with their birthdays appear
- ✅ Final count matches the number of actors shown
- ⚠️ If "Found 0" appears but you see matches in UI → Display bug
- ⚠️ If "Found 0" appears and UI is empty → Matching algorithm issue

#### Error Logs
```
❌ Error fetching popular people: [error details]
```

**What to look for:**
- Network errors indicate API connectivity issues
- Usually can be resolved by refreshing or checking internet connection

## Expected Results

### Successful Flow
1. See "🔍 Fetching..." message when setting birthday
2. See "📋 Fetched 60 people" confirming data retrieval
3. See "✅ Got details for 55+" confirming API success
4. See "🎂 40+ people have birthday data" confirming data quality
5. See one or more "🎯 Birthday match:" messages
6. See "🎂 Found X birthday matches" with X > 0
7. See actor matches appear in the UI section

### If Matches Don't Appear
1. Check console for all the above messages
2. Note where the data flow stops:
   - **Stops at fetch** → API issue
   - **Stops at details** → Too many API failures
   - **Has data but found 0 matches** → No actors match your birthday
   - **Has matches but UI empty** → Display rendering issue

## Birthday Matching Logic

The system matches actors by:
- **Birthday Match**: Same month and day as user (e.g., both March 15)
- **Age Match**: Same age as user (days may differ)

Only actors with TMDB birthday data are included in the pool.

## Performance Notes

- First load may take 1-2 seconds (fetching 3 pages of 20 popular people each)
- Subsequent loads are cached by React Query
- If you see no matches, it's likely because none of the ~60 featured actors share your birthday
  - February 29 (leap day birthdays) especially will have limited matches
  - Very specific birthdates may have fewer matches

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No console messages appear | Refresh page and try again, check browser console is open |
| "Got details for 0" | Check internet connection, TMDB API may be down |
| Has data but "Found 0 matches" | Your birthday doesn't match any of these 60 actors (normal!) |
| Console shows matches but UI empty | File a bug - likely a display rendering issue |
| "Age: undefined" | Birthday wasn't parsed correctly, try format MM/DD/YYYY |

## Browser Support
- Chrome/Edge: F12 → Console tab
- Firefox: F12 → Console tab
- Safari: Cmd+Option+J, or Develop menu → Show Web Inspector

## Next Steps

If you find issues:
1. Screenshot the console output
2. Note your exact birthday (or use test data)
3. Report the issue with console logs attached

The logging will remain in place to help diagnose production issues.
