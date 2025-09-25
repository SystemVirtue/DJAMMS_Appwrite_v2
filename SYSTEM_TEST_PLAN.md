# DJAMMS System Test Plan

## Server-Side Functions Integration Test

### Objective
Validate that the complete server-side automation system works correctly with the frontend integration.

### Test Environment
- **Development Server**: http://localhost:5174
- **Appwrite Function**: user-login-handler (Status: ready)
- **Event Trigger**: users.*.sessions.*.create (login events)
- **Database**: 68cc92d30024e1b6eeb6 (v3 simplified schema)

### Test Scenarios

#### 1. New User Login Flow
**Expected Behavior:**
1. User accesses homepage and clicks "Sign in with Google"
2. User completes OAuth flow and returns to dashboard  
3. Server function automatically triggers on session creation
4. Function creates user record in djamms_users collection
5. Function assigns "pending" role by default
6. Function creates player_instance record
7. Function creates active_queues record
8. Dashboard shows "Pending Approval" status
9. Video player shows approval pending message

**Test Steps:**
1. Open http://localhost:5174 in incognito mode
2. Click "Sign in with Google" 
3. Complete OAuth with test account
4. Observe dashboard for approval status
5. Navigate to /videoplayer and verify access control
6. Check Appwrite Console for function execution logs
7. Verify database records were created automatically

#### 2. Approved User Access
**Expected Behavior:**
1. Admin manually approves user in Appwrite Console
2. User refreshes dashboard - status changes to "Approved"
3. User can access video player without restrictions
4. Player instance is fully functional

**Test Steps:**
1. Use existing approved user or manually approve test user
2. Login and observe immediate approval status
3. Access video player - should load normally
4. Verify all features work as expected

#### 3. Server Function Monitoring
**Expected Behavior:**
1. Function executes successfully on every login event
2. No errors in function execution logs
3. Database consistency maintained
4. Proper error handling for edge cases

**Test Steps:**
1. Monitor Appwrite Console function execution section
2. Review execution logs for errors
3. Test with multiple concurrent logins
4. Verify database integrity

### Success Criteria
- ✅ Server function triggers automatically on login
- ✅ User records created without client-side intervention  
- ✅ Approval system works correctly
- ✅ Video player access control functions properly
- ✅ Dashboard displays correct approval status
- ✅ No function execution errors
- ✅ Database remains consistent

### Failure Scenarios to Test
1. Function execution timeout
2. Database connection issues
3. Malformed OAuth data
4. Duplicate user creation attempts
5. Network interruptions during function execution

### Environment Variables Status
- APPWRITE_DATABASE_ID: Set to 68cc92d30024e1b6eeb6
- NODE_ENV: Set to production
- Function Runtime: Node.js 18.0
- Function Status: Ready
- Event Triggers: Configured for login events

### Next Steps After Testing
1. Review function execution logs
2. Optimize performance if needed
3. Add error monitoring
4. Document any edge cases discovered
5. Deploy to production environment