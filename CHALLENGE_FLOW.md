# Challenge Flow Architecture

## Endpoints

### 1. `GET /api/challenges/current` ✨ **New - Primary Entry Point**
- **Purpose**: Get user's active challenge (auto-creates if missing)
- **Auth**: Required
- **Behavior**: 
  - Returns existing active challenge if found
  - Auto-creates default (21-day Soft) if none exists
  - Idempotent - safe to call on every app load
- **Use When**: Dashboard load, progress check, any time you need current challenge

### 2. `POST /api/challenges/start`
- **Purpose**: Explicitly start a fresh default challenge
- **Auth**: Required
- **Behavior**: 
  - Marks existing active challenge as inactive
  - Creates new 21-day Soft challenge
  - Resets all progress
- **Use When**: User wants to restart/begin new challenge explicitly

### 3. `POST /api/challenges/create`
- **Purpose**: Create custom challenge (custom days/level)
- **Auth**: Required
- **Behavior**: Similar to `/start` but with custom params

## Frontend Integration

### On Signin/App Load
```typescript
// After successful signin
const { data } = await api.get('/api/challenges/current', {
  headers: { Authorization: `Bearer ${token}` }
});
// data.challenge is guaranteed to exist (auto-created if needed)
```

### Explicit New Challenge
```typescript
// User clicks "Start New Challenge" button
const { data } = await api.post('/api/challenges/start', {}, {
  headers: { Authorization: `Bearer ${token}` }
});
// Fresh challenge created, old one archived
```

### Progress Upload
```typescript
// Before uploading progress
const { challenge } = await api.get('/api/challenges/current');
// Use challenge.challengeId for progress entry
```

## Architecture Benefits

✅ **Lazy initialization** - Challenge created only when needed  
✅ **No extra signin logic** - Auth stays focused on auth  
✅ **Flexible UX** - New users can explore before committing  
✅ **Idempotent** - `/current` safe to call repeatedly  
✅ **Clear intent** - `/start` means "begin fresh", `/current` means "get or create"
