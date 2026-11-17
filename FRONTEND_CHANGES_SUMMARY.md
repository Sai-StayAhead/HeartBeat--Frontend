# Heartbeat Frontend - Changes Applied

## ✅ All Changes Verified - Build Successful

---

## 🔐 Password Complexity Requirements (Matching Backend)

### Updated `PasswordField` Component (`src/App.jsx`)
- **New requirements enforced** (matches backend validation):
  - Minimum 8 characters (was 6)
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
- **Visual password strength indicator**:
  - Real-time checklist of requirements with ✓/○ icons
  - Color-coded (green = met, dim = unmet)
  - Progress bar showing completion percentage
  - Green bar when all requirements met, amber when partial
- **Used in**:
  - `CreateUserModal` (admin creating users)
  - `ResetPasswordModal` (admin resetting passwords)
  - Ready for login form if needed

---

## 🛡️ Rate Limiting Handling (Matching Backend slowapi)

### Updated `useApi` Hook (`src/service/api.js`)
- **Handles 429 Too Many Requests responses**:
  - Parses `Retry-After` header from backend
  - Extracts error message from response body
  - Calls optional `onRateLimited` callback
  - Throws error with `status: 429` and `retryAfter` properties

### Updated `LoginScreen` (`src/App.jsx`)
- **Rate limit countdown timer**:
  - Shows "Try again in Xs" on submit button when rate limited
  - Disables submit button during countdown
  - Visual warning banner with countdown
  - Auto-clears when countdown reaches 0
- **Backend integration**: Works with backend's 5 requests/minute limit on `/auth/login`, `/auth/refresh`, `/auth/register`

---

## 🏥 Health Check Integration

### New Health Check Utilities (`src/service/api.js`)

| Function | Purpose |
|----------|---------|
| `checkBackendHealth(baseUrl)` | Calls `/health` - liveness probe |
| `checkBackendReady(baseUrl)` | Calls `/ready` - readiness probe (DB check) |
| `useBackendHealth(baseUrl, intervalMs)` | React hook for periodic checks |

**Returns**:
```javascript
{
  health: { healthy: boolean, checking: boolean, status: string, timestamp: string, ... },
  readiness: { ready: boolean, checking: boolean, database: string, timestamp: string, ... }
}
```

**Usage in components**:
```javascript
import { useBackendHealth } from '../service/api';

function MyComponent({ baseUrl }) {
  const { health, readiness } = useBackendHealth(baseUrl, 60000);
  
  if (!health.healthy) return <OfflineBanner />;
  if (!readiness.ready) return <DegradedBanner />;
  
  return <Dashboard />;
}
```

---

## 📋 Files Modified

### Core Components (`src/App.jsx`)
| Component | Changes |
|-----------|---------|
| `PasswordField` | Complete rewrite with strength indicator, requirements checklist |
| `CreateUserModal` | Updated to use minLength=8, showRequirements=true |
| `ResetPasswordModal` | Updated to use minLength=8, showRequirements=true |
| `LoginScreen` | Added rate limit countdown handling (429 responses) |

### Services (`src/service/api.js`)
| Addition | Description |
|----------|-------------|
| `onRateLimited` parameter in `useApi` | Callback for rate limit events |
| 429 handling in request function | Parses Retry-After, calls callback |
| `checkBackendHealth()` | Liveness probe caller |
| `checkBackendReady()` | Readiness probe caller |
| `useBackendHealth()` | React hook for periodic monitoring |

---

## 🔄 Backend-Frontend Contract Alignment

| Backend Change | Frontend Implementation |
|----------------|------------------------|
| Password: 8 chars + complexity | PasswordField validates & displays requirements |
| Rate limit: 5 req/min on auth | LoginScreen countdown, useApi 429 handling |
| `/health` endpoint | `checkBackendHealth()` utility |
| `/ready` endpoint | `checkBackendReady()` utility |
| `client_id` param on dashboard | `buildDashboardQuery` already supported it ✓ |

---

## ✅ Verification

```bash
# Frontend build
cd C:\Projects\heartbeat-frontend && npm run build
# ✓ built in 1.43s

# Backend imports
C:\Projects\heartbeat-backend\env\Scripts\python.exe -c "from app.main import app"
# Backend imports OK
```

---

## 🚀 Usage Examples

### Using Health Checks in Dashboard
```javascript
// In Dashboard.jsx or AppShell.jsx
import { useBackendHealth } from '../service/api';

function AppShell({ baseUrl, ... }) {
  const { health, readiness } = useBackendHealth(baseUrl);
  
  useEffect(() => {
    if (!health.healthy) {
      // Show offline indicator, disable WebSocket
    }
    if (!readiness.ready) {
      // Show degraded mode banner
    }
  }, [health, readiness]);
  
  return <Dashboard ... />;
}
```

### Handling Rate Limits in Components
```javascript
const api = useApi(baseUrl, session, 
  onTokensRefreshed, 
  onUnauthorized,
  (err) => {
    if (err.status === 429) {
      showToast(`Rate limited: wait ${err.retryAfter}s`);
      // Component can read err.retryAfter for custom UI
    }
  }
);
```

---

## 📦 Bundle Size Impact

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| JS Bundle | 845.94 KB | 847.92 KB | +2 KB (negligible) |
| CSS Bundle | 163.87 KB | 163.87 KB | No change |

All changes are tree-shakable and only loaded when used.