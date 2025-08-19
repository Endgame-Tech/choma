# API Call Optimization Plan

## Current Issues Identified

### 1. Excessive Polling Intervals

- **Notifications**: Every 60 seconds (admin-react)
- **WebSocket checks**: Every 5 seconds (admin-react)
- **Network monitoring**: Every 5 seconds (mobile app)
- **Delivery tracking**: Every 30 seconds (mobile app)
- **Banner rotation**: Every 6 seconds (mobile app)

### 2. Redundant API Calls

- Multiple useEffect hooks triggering same endpoints
- No caching between components
- Re-fetching on every component mount
- Duplicate assignment fetching in MealPlanScheduler

### 3. Poor Cache Management

- Short cache durations
- No cache invalidation strategy
- Cache not shared between components

## Optimization Strategy

### Phase 1: Reduce Polling Frequencies

1. **Notifications**: 60s → 5 minutes (300s)
2. **WebSocket checks**: 5s → 30s
3. **Network monitoring**: 5s → 15s
4. **Delivery tracking**: 30s → 2 minutes (120s)

### Phase 2: Implement Intelligent Caching

1. Extend cache durations for static data
2. Implement cache sharing between components
3. Add cache invalidation on user actions
4. Use WebSocket events to invalidate cache

### Phase 3: Optimize Component Behavior

1. Debounce rapid API calls
2. Prevent duplicate requests
3. Use visibility change detection
4. Implement request deduplication

### Phase 4: Add Request Batching

1. Batch multiple similar requests
2. Use GraphQL-style query aggregation
3. Implement request queuing

## Implementation Priority

1. Critical polling reduction (immediate impact)
2. Cache optimization (medium-term improvement)
3. Component optimization (long-term maintenance)
4. Advanced batching (future enhancement)
