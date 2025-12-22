# Plan-Based Restrictions

This document outlines the subscription plan restrictions implemented in SneakLink.

## Available Plans

### Free Plan
- **Max Stores Per Request**: 10
- **Max Stores Per Day**: 50
- **Can Scrape**: ❌ No
- **Can Add Stores**: ❌ No
- **Can Export**: ❌ No
- **Advanced Filters**: ❌ No
- **Max Filters**: 1
- **Rate Limit**: 10 requests/minute, 100 requests/hour

**Available Features:**
- ✅ Basic search
- ✅ Country filter
- ❌ Theme filter
- ❌ Tag filter
- ❌ Date filter
- ❌ Business model filter

### Starter Plan
- **Max Stores Per Request**: 50
- **Max Stores Per Day**: 200
- **Can Scrape**: ❌ No
- **Can Add Stores**: ✅ Yes
- **Can Export**: ❌ No
- **Advanced Filters**: ✅ Yes
- **Max Filters**: 3
- **Rate Limit**: 30 requests/minute, 500 requests/hour

**Available Features:**
- ✅ Basic search
- ✅ Country filter
- ✅ Theme filter
- ✅ Tag filter
- ✅ Date filter
- ❌ Business model filter

### Pro Plan
- **Max Stores Per Request**: 100
- **Max Stores Per Day**: 1,000
- **Can Scrape**: ✅ Yes
- **Can Add Stores**: ✅ Yes
- **Can Export**: ✅ Yes
- **Advanced Filters**: ✅ Yes
- **Max Filters**: 10 (effectively unlimited)
- **Rate Limit**: 60 requests/minute, 2,000 requests/hour

**Available Features:**
- ✅ Basic search
- ✅ Country filter
- ✅ Theme filter
- ✅ Tag filter
- ✅ Date filter
- ✅ Business model filter

### Enterprise Plan
- **Max Stores Per Request**: 1,000 (effectively unlimited)
- **Max Stores Per Day**: 10,000 (effectively unlimited)
- **Can Scrape**: ✅ Yes
- **Can Add Stores**: ✅ Yes
- **Can Export**: ✅ Yes
- **Advanced Filters**: ✅ Yes
- **Max Filters**: Unlimited
- **Rate Limit**: 120 requests/minute, 10,000 requests/hour

**Available Features:**
- ✅ Basic search
- ✅ Country filter
- ✅ Theme filter
- ✅ Tag filter
- ✅ Date filter
- ✅ Business model filter

## Implementation Details

### Middleware

The plan restrictions are enforced through middleware:

1. **`checkPlanAction(action)`** - Checks if user's plan allows a specific action
   - Used for: scraping, adding stores, exporting
   - Returns 403 if plan doesn't support the action

2. **`applyPlanLimits`** - Automatically limits results based on plan
   - Applied to GET /api/stores
   - Limits the number of stores returned per request

3. **`validatePlanFilters`** - Validates filter usage based on plan
   - Checks number of filters applied
   - Checks if specific filter types are allowed
   - Returns 403 if restrictions are violated

### API Endpoints

#### GET /api/stores
- Applies plan-based limits automatically
- Returns plan information in response if user is authenticated
- Headers: `X-Plan-Limit`, `X-Requested-Limit`

#### POST /api/stores
- Requires authentication
- Requires `canAddStores` permission
- Free plan users cannot add stores

#### POST /api/stores/scrape
- Requires authentication
- Requires `canScrape` permission
- Only Pro and Enterprise plans can trigger scraping

### Response Format

When authenticated, the API response includes plan information:

```json
{
  "stores": [...],
  "pagination": {...},
  "plan": "free",
  "planRestrictions": {
    "maxStoresPerRequest": 10,
    "maxStoresPerDay": 50
  }
}
```

### Error Responses

When a plan restriction is violated, the API returns:

```json
{
  "error": "Feature not available",
  "message": "This feature is not available on the Free plan. Please upgrade to access this feature.",
  "plan": "free",
  "requiredPlans": ["pro", "enterprise"]
}
```

## Configuration

Plan restrictions are defined in `server/config/planRestrictions.js`. To modify restrictions:

1. Edit the `PLAN_RESTRICTIONS` object
2. Update the middleware if needed
3. Restart the server

## Testing

To test plan restrictions:

1. Create users with different plans
2. Authenticate with each user
3. Test API endpoints
4. Verify restrictions are enforced correctly
