# Scheduler & Maintenance Agent

## Overview

The Scheduler & Maintenance Agent is a critical background service that performs automated maintenance tasks for the DJAMMS system. This function runs on a scheduled basis (typically every 5 minutes) to ensure system health, clean up outdated data, and process scheduled events.

## Responsibilities

### 1. Connection Auditing
- Monitors player heartbeats across all venues
- Automatically marks players as disconnected after 5 minutes of inactivity
- Updates player instance statuses
- Handles reconnection detection

### 2. Scheduled Events Processing
- Executes scheduled playlist changes at their designated times
- Processes scheduled content updates
- Manages time-based automation tasks

### 3. Cleanup Operations
- Removes activity logs older than 30 days
- Purges inactive content gallery items after 90 days
- Cleans up disconnected player instances after 7 days
- Maintains database efficiency

### 4. System Health Monitoring
- Validates database connectivity
- Checks for corrupted JSON data in venue documents
- Identifies orphaned playlists and data inconsistencies
- Logs system issues for administrative review

## Trigger Configuration

This function should be configured to run on a schedule in Appwrite:

- **Schedule**: Every 5 minutes (`*/5 * * * *`)
- **Trigger**: Cron schedule
- **Runtime**: Node.js 18.0

## Environment Variables

Required environment variables:
- `APPWRITE_ENDPOINT`: Appwrite API endpoint
- `APPWRITE_PROJECT_ID`: Your Appwrite project ID
- `APPWRITE_API_KEY`: Appwrite API key with database permissions
- `APPWRITE_DATABASE_ID`: Database ID containing DJAMMS collections

## API Response

The function returns a comprehensive status report:

```json
{
  "success": true,
  "status": "success|completed_with_errors",
  "message": "Maintenance operations completed",
  "results": {
    "connectionAudits": 25,
    "scheduledEvents": 3,
    "cleanupOperations": 47,
    "notificationsSent": 2,
    "errors": []
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Error Handling

- Individual maintenance tasks are isolated to prevent cascading failures
- All errors are logged and included in the response
- System continues operating even if some maintenance tasks fail
- Critical errors return HTTP 500 status

## Logging

All maintenance activities are logged to the `activity_log` collection with:
- `event_type`: "maintenance_run" or "system_issue"
- `event_data`: Detailed operation results and error information
- `venue_id`: null (system-wide operations)

## Dependencies

- `node-appwrite`: ^13.0.0

## Deployment

```bash
# Deploy to Appwrite
npm run deploy

# Or manually
appwrite functions createDeployment \
  --functionId scheduler-maintenance-agent \
  --code . \
  --activate true
```

## Monitoring

Monitor the function's execution through:
- Appwrite Functions logs
- `activity_log` collection entries
- Response status and results
- Error notifications (when implemented)

## Security Considerations

- Requires database read/write permissions
- Should only be triggered by scheduled execution
- API key should have minimal required permissions
- All operations are logged for audit purposes