# DJAMMS Appwrite Functions Deployment Guide

This guide walks you through deploying the DJAMMS server-side functions to Appwrite Cloud for automatic user management and player instance creation.

## Overview

The server-side functions eliminate the need for complex client-side logic by handling:
- **Automatic user synchronization** from Auth to DJAMMS database
- **Player instance creation** for approved users on login
- **Active queue initialization** with default playlists
- **User activity logging** and analytics

## Prerequisites

### 1. Appwrite CLI Installation

```bash
# Install Appwrite CLI globally
npm install -g appwrite-cli

# Verify installation
appwrite --version
```

### 2. Authentication

```bash
# Login to your Appwrite account
appwrite login

# Set up the project (if not already done)
appwrite init project
```

When prompted:
- **Project ID**: `68cc86c3002b27e13947`
- **Database ID**: `68cc92d30024e1b6eeb6`

### 3. Permissions Check

Ensure your Appwrite account has:
- ✅ **Functions** permission (create/deploy)
- ✅ **Database** access for collections
- ✅ **Users** read access for Auth integration

## Deployment Methods

### Method 1: Automated Deployment (Recommended)

1. **Navigate to the functions directory**:
   ```bash
   cd /Users/mikeclarkin/DJAMMS_Appwrite_v2/appwrite-functions
   ```

2. **Run the deployment script**:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

3. **Monitor the output** for any errors:
   ```
   🚀 DJAMMS Appwrite Functions Deployment
   =======================================
   
   ✅ Authenticated with Appwrite
   🚀 Deploying user-login-handler function...
   📦 Function doesn't exist, creating it...
   ✅ Function created
   🔧 Setting environment variables...
   ✅ Environment variables set
   📤 Creating deployment...
   ✅ Deployment created and activated
   ```

### Method 2: Manual Deployment

#### Step 1: Create the Function

```bash
cd appwrite-functions/user-login-handler

appwrite functions create \
    --functionId "user-login-handler" \
    --name "DJAMMS User Login Handler" \
    --runtime "node-18.0" \
    --execute "any" \
    --events "users.*.sessions.*.create" \
    --timeout 30 \
    --enabled true \
    --logging true \
    --entrypoint "src/main.js" \
    --commands "npm install"
```

#### Step 2: Set Environment Variables

```bash
appwrite functions updateVariables \
    --functionId "user-login-handler" \
    --variables "APPWRITE_DATABASE_ID=68cc92d30024e1b6eeb6,NODE_ENV=production"
```

#### Step 3: Deploy the Code

```bash
appwrite functions createDeployment \
    --functionId "user-login-handler" \
    --code . \
    --activate true
```

## Verification

### 1. Check Function Status

```bash
# Get function details
appwrite functions get --functionId user-login-handler

# List all functions
appwrite functions list
```

### 2. View Function Logs

```bash
# Get recent executions
appwrite functions listExecutions --functionId user-login-handler --limit 10

# Get specific execution logs
appwrite functions getExecution --functionId user-login-handler --executionId EXECUTION_ID
```

### 3. Test Function Trigger

1. **Login to DJAMMS** with a test user account
2. **Check Appwrite Console** → Functions → user-login-handler → Executions
3. **Verify database records**:
   - New user in `djamms_users` collection
   - Player instance in `player_instances` (if approved)
   - Active queue in `active_queues` (if approved)

## Configuration

### Function Configuration

The function is configured with these settings:

| Setting | Value | Description |
|---------|--------|-------------|
| **Runtime** | `node-18.0` | Node.js version |
| **Event** | `users.*.sessions.*.create` | Login trigger |
| **Timeout** | `30 seconds` | Max execution time |
| **Memory** | `512 MB` | Default memory allocation |
| **CPU** | `0.4 vCPU` | Default CPU allocation |

### Environment Variables

| Variable | Value | Required |
|----------|-------|----------|
| `APPWRITE_DATABASE_ID` | `68cc92d30024e1b6eeb6` | ✅ Yes |
| `NODE_ENV` | `production` | ✅ Yes |

**Auto-provided by Appwrite:**
- `APPWRITE_FUNCTION_ENDPOINT`
- `APPWRITE_FUNCTION_PROJECT_ID`
- `APPWRITE_API_KEY`

## User Role Configuration

The function automatically assigns roles based on email patterns:

### Admin Users (devApproved: true)
- `admin@djamms.app`
- `mike.clarkin@gmail.com`
- `admin@sysvir.com`

### Developer Users (devApproved: true)
- `demo@djamms.app`
- `dev@djamms.app`
- `test@djamms.app`

### Regular Users (devApproved: false)
- All other email addresses

## Frontend Integration

### Update Dashboard Route

Replace the `PlayerInstanceManager` initialization with the simplified server session store:

```typescript
// OLD - Client-side PlayerInstanceManager
import { sessionActions } from '$lib/stores/playerSessionStore';

// NEW - Server-side automation
import { sessionActions } from '$lib/stores/serverSessionStore';

onMount(() => {
  // Much simpler - just check session status
  sessionActions.initializeSession();
});
```

### Update Imports

```typescript
// In your dashboard/+page.svelte
import { 
  userSession,
  isSessionReady, 
  isUserApproved, 
  isPendingApproval,
  sessionActions 
} from '$lib/stores/serverSessionStore';
```

## Monitoring

### Function Execution Monitoring

1. **Appwrite Console**:
   - Go to **Functions** → **user-login-handler**
   - Click **Executions** tab
   - Monitor success/failure rates

2. **Database Monitoring**:
   - Check `djamms_users` for new user records
   - Check `player_instances` for instance creation
   - Check `user_activity` for login events

### Performance Metrics

Monitor these metrics in Appwrite Console:

- **Execution Time**: Should be < 10 seconds typically
- **Success Rate**: Should be > 95%
- **Memory Usage**: Should be < 256 MB
- **Error Rate**: Should be < 5%

## Troubleshooting

### Common Issues

#### Function Not Triggering

**Symptoms**: No executions when users log in

**Solutions**:
1. Check event configuration: `users.*.sessions.*.create`
2. Verify function is **enabled**
3. Check webhook permissions in project settings
4. Ensure function deployment is **active**

#### Database Permission Errors

**Symptoms**: `Permission denied` errors in function logs

**Solutions**:
1. Check `APPWRITE_API_KEY` has correct permissions
2. Verify database collections exist and have proper permissions
3. Check collection-level permissions for function execution

#### User Not Found Errors

**Symptoms**: `User not found in auth system` errors

**Solutions**:
1. Check webhook payload structure
2. Verify `userId` extraction from event payload
3. Check Auth service permissions for function

#### Player Instance Creation Fails

**Symptoms**: Approved users not getting player instances

**Solutions**:
1. Check `player_instances` collection exists
2. Verify collection attributes are properly created
3. Check for unique constraint violations on `instanceId`
4. Review default playlist availability

### Debug Mode

For detailed debugging, set environment variable:

```bash
appwrite functions updateVariables \
    --functionId "user-login-handler" \
    --variables "NODE_ENV=development,APPWRITE_DATABASE_ID=68cc92d30024e1b6eeb6"
```

This enables detailed error messages in function responses.

### Log Analysis

Check function logs for specific error patterns:

```bash
# Get recent logs
appwrite functions listExecutions --functionId user-login-handler --limit 20

# Common error patterns to look for:
# - "❌ Failed to sync user"
# - "❌ Failed to create player instance" 
# - "❌ Global error in login handler"
# - "⚠️ Failed to create active queue"
```

## Security Considerations

### API Key Permissions

The function's API key should have **minimum required permissions**:

- ✅ **Database Read/Write**: For user and instance management
- ✅ **Users Read**: For Auth user information
- ❌ **Users Write**: Not needed (Auth handles user creation)
- ❌ **Storage**: Not needed for this function
- ❌ **Functions**: Not needed for execution

### Data Privacy

- **Sensitive data**: User emails and names are stored in DJAMMS database
- **Security**: All operations server-side with validated inputs
- **Compliance**: Follow your organization's data retention policies

### Error Information

- **Production**: Sensitive error details not exposed to clients
- **Development**: Full error information available for debugging
- **Logging**: All operations logged for security auditing

## Performance Optimization

### Execution Time

Typical execution times:
- **New user**: 3-8 seconds (creates user + instance + queue)
- **Existing user**: 1-3 seconds (updates timestamps)
- **Existing approved user**: 2-4 seconds (updates user + instance)

### Memory Usage

- **Baseline**: ~50 MB for Node.js runtime
- **Peak**: ~150 MB during database operations
- **Recommended**: 512 MB allocation (default)

### Database Queries

The function is optimized with:
- **Indexed queries**: Uses email and userId indexes
- **Batch operations**: Minimizes database round-trips
- **Error handling**: Graceful degradation on non-critical failures

## Backup and Recovery

### Function Code Backup

```bash
# Download current function code
appwrite functions getDeployment \
    --functionId user-login-handler \
    --deploymentId DEPLOYMENT_ID \
    --destination ./backup/
```

### Rollback Deployment

```bash
# List previous deployments
appwrite functions listDeployments --functionId user-login-handler

# Activate previous deployment
appwrite functions updateDeployment \
    --functionId user-login-handler \
    --deploymentId PREVIOUS_DEPLOYMENT_ID \
    --activate true
```

## Support

### Getting Help

1. **Function logs**: First check execution logs in Appwrite Console
2. **Database state**: Verify collections and data integrity
3. **Network issues**: Check Appwrite service status
4. **Code issues**: Review function source code for logic errors

### Contact Information

- **DJAMMS Team**: Contact via project repository issues
- **Appwrite Support**: [Appwrite Discord](https://discord.gg/appwrite) for platform issues
- **Documentation**: [Appwrite Functions Docs](https://appwrite.io/docs/functions)

## Next Steps

After successful deployment:

1. ✅ **Test user login flow** with different user types
2. ✅ **Monitor function executions** for first week
3. ✅ **Update frontend code** to use server session store
4. ✅ **Configure monitoring alerts** for function failures
5. ✅ **Document user approval process** for your team

The server-side functions are now handling user management automatically! 🎉