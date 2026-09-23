# PSU-Collab Authentication Audit & Design - Phase 1

**Project**: PSU-Collab - Capstone Project Collaboration and Monitoring System for Pampanga State University
**Audit Date**: 2026-09-23
**Phase**: 1 — Audit & Design Only (**NO CODE CHANGES**)
**Purpose**: Analyze the current JWT authentication implementation and define a secure, maintainable design for automatic token renewal to prevent unnecessary user logouts.

---

# 1. Current Authentication Flow

The current authentication system uses a single JWT access token.

```text
Login
 ↓
POST /auth/jwt/login
 ↓
{ access_token, token_type: "bearer" }
 ↓
Frontend stores access_token in localStorage
 ↓
Subsequent API requests:
Authorization: Bearer <access_token>
 ↓
Access token expires after current 3600-second lifetime
 ↓
Backend returns 401 Unauthorized
 ↓
Frontend handleResponse() detects 401
 ↓
clearToken()
 ↓
dispatch auth:expired event
 ↓
App.tsx receives event
 ↓
Clear React Query authentication-related state/cache
 ↓
Redirect user to /login
```

## Current Problem

The current system treats an expired access token as an expired user session.

This means:

```text
Access token expires
       ↓
User is considered logged out
```

The desired architecture is:

```text
Access token expires
       ↓
Attempt token renewal
       ↓
If refresh succeeds:
    issue new access token
    retry original request
    keep user logged in

If refresh fails:
    clear authentication state
    redirect to /login
```

The goal is therefore **not to make the access token long-lived**, but to introduce a separate refresh/session mechanism.

---

# 2. Current Files Involved

## Backend

* `backend/app/modules/users/auth.py`

  * JWT strategy
  * authentication backend
  * token configuration

* `backend/app/modules/users/services.py`

  * FastAPI Users instance
  * user manager configuration

* `backend/app/modules/users/routes.py`

  * authentication router registration

* `backend/app/modules/users/model.py`

  * User database model

* `backend/app/core/config.py`

  * authentication secrets
  * environment configuration

* `backend/app/main.py`

  * CORS middleware
  * application configuration

## Frontend

* `frontend/src/services/api.ts`

  * login
  * logout
  * current-user request
  * token storage
  * request handling

* `frontend/src/hooks/useAuth.ts`

  * login hook
  * logout hook
  * current-user authentication state

* `frontend/src/main.tsx`

  * React Query configuration

* `frontend/src/App.tsx`

  * authentication-expiration handling
  * redirect behavior
  * authentication state cleanup

---

# 3. FastAPI Users Capability Audit

The current implementation uses:

* `FastAPIUsers[User, uuid.UUID]`
* `JWTStrategy`
* `BearerTransport`
* `fastapi_users.get_auth_router(auth_backend)`

The currently implemented authentication flow provides:

* JWT access-token authentication
* Bearer authentication
* Login
* Logout
* Protected API authentication

The current application does **not** implement a refresh-token flow.

There is currently no application-level implementation for:

* Refresh-token issuance
* Refresh-token renewal
* Refresh-token rotation
* Refresh-token revocation
* Refresh-session tracking

## Important Compatibility Requirement

The exact installed FastAPI Users version **must be verified before Phase 2 implementation**.

The implementation must **not assume** that the installed version provides APIs such as:

```text
get_refresh_router()
get_refresh_strategy()
```

or that its JWT authentication system automatically provides:

```text
rotation
revocation
database-backed refresh sessions
```

These capabilities must be confirmed against the actual installed package/version and source/API documentation.

### Phase 2 compatibility check

Before modifying code, verify:

1. Exact installed FastAPI Users version
2. Available authentication backends
3. Available refresh-token functionality
4. Whether refresh tokens are JWTs or database-backed credentials
5. Whether rotation is supported natively
6. Whether revocation is supported natively
7. Whether refresh-token reuse detection is supported
8. Exact router/strategy APIs
9. Expected login response format
10. Expected refresh response format

If the installed FastAPI Users version does not provide the required functionality, implement the missing refresh/session mechanism explicitly rather than inventing unsupported FastAPI Users APIs.

---

# 4. Recommended Authentication Architecture

## Recommended Model

Use:

```text
Short-lived Access Token
        +
Longer-lived Refresh/Session Credential
```

The two credentials have different purposes.

### Access Token

Used for normal API requests:

```text
Authorization: Bearer <access_token>
```

Characteristics:

* Short-lived
* Used frequently
* Contains user authentication claims
* Should not be used as the long-term session credential

### Refresh Credential

Used only to obtain a new access token.

Characteristics:

* Longer-lived
* Used much less frequently
* Must have stronger lifecycle controls
* Should be revocable
* Should preferably rotate after successful use

---

# 5. Target Authentication Flow

The target flow should be:

```text
                           LOGIN
                             │
                             ▼
                  ┌─────────────────────┐
                  │ Access Token        │
                  │ Short Lifetime      │
                  └──────────┬──────────┘
                             │
                             │
                  ┌──────────▼──────────┐
                  │ Refresh Credential  │
                  │ Long Lifetime       │
                  └──────────┬──────────┘
                             │
                             ▼
                    Normal API Requests
                             │
                             ▼
                    Access Token Expires
                             │
                             ▼
                         API → 401
                             │
                             ▼
                    Refresh Request
                             │
                   ┌─────────┴─────────┐
                   │                   │
                SUCCESS              FAILURE
                   │                   │
                   ▼                   ▼
          New Access Token        Clear Session
                   │                   │
                   ▼                   ▼
            Retry Request          /login
```

The frontend must **not immediately log the user out simply because the access token expired**.

---

# 6. Access-Token Lifetime

## Recommendation

Use:

**15–30 minutes (900–1800 seconds)**

A specific value should be selected during Phase 2. A reasonable initial value is:

**30 minutes / 1800 seconds**

### Rationale

A short access-token lifetime:

* Limits the usefulness of a stolen access token
* Prevents long-lived bearer credentials
* Makes refresh-token authentication the mechanism responsible for maintaining a session
* Provides a clear separation between API authorization and session persistence

The access-token lifetime should **not** be increased to several hours or days simply to prevent logouts.

The purpose of the refresh mechanism is precisely to avoid that tradeoff.

---

# 7. Refresh/Session Lifetime

The previous design mixed an absolute expiration period with a sliding expiration period. These should be explicitly separated.

## Recommended Model

Use:

### Inactivity expiration

**7 days**

A refresh/session credential becomes invalid if the user has not refreshed their session for 7 days.

### Maximum session lifetime

Use a separate maximum lifetime if required by the project's security policy.

For example:

**30 days maximum**

This means an actively used session cannot continue indefinitely.

The exact maximum lifetime can be finalized during Phase 2.

### Example

```text
Day 0
Login
 ↓
Refresh session expires after 7 days of inactivity

Day 5
User refreshes
 ↓
7-day inactivity window starts again

Day 10
User refreshes
 ↓
7-day inactivity window starts again
```

If a maximum session lifetime is configured:

```text
Day 0
Login
 ↓
Regularly refreshed
 ↓
Maximum session lifetime reached
 ↓
User must authenticate again
```

This is preferable to describing the system as both having a "7-day absolute expiration" and "7-day sliding expiration."

---

# 8. Refresh Token Rotation

If refresh-token rotation is supported or implemented, the intended behavior is:

```text
Refresh Token A
      │
      ▼
Refresh request
      │
      ▼
Token A invalidated
      │
      ▼
Refresh Token B issued
```

The old refresh token must not remain indefinitely usable.

## Refresh-Token Reuse Detection

Rotation should also consider reuse detection.

Example:

```text
Token A
  ↓
legitimate refresh
  ↓
Token B issued
  ↓
Token A becomes invalid
```

If Token A is subsequently presented again:

```text
Token A
  ↓
Reuse detected
  ↓
Treat as suspicious
  ↓
Revoke associated refresh session/token family
```

This is important because rotation without reuse detection does not fully address a stolen refresh token.

The exact implementation depends on the capabilities of the installed FastAPI Users version.

---

# 9. Refresh-Token Revocation

Refresh credentials must support invalidation.

Revocation should occur when:

* User logs out
* Refresh credential expires
* Refresh credential is rotated
* Refresh-token reuse is detected
* An administrator terminates a user's session, if administrative session termination is implemented
* Security-sensitive account changes require session invalidation

The system must distinguish:

```text
Access-token expiration
```

from:

```text
Session/refresh-token revocation
```

An expired access token does not necessarily mean that the user's session has ended.

---

# 10. Refresh Credential Storage

## Preferred Production Architecture

The strongest browser-based architecture would generally be:

```text
Access Token
    ↓
Short-lived client-side storage

Refresh Credential
    ↓
HttpOnly + Secure cookie
```

Advantages:

* JavaScript cannot directly read an HttpOnly refresh credential
* Reduces the impact of token-stealing XSS attacks
* Separates the long-lived session credential from application JavaScript

However, this requires additional security configuration:

* `HttpOnly`
* `Secure`
* appropriate `SameSite`
* CORS credentials configuration
* CSRF considerations
* correct frontend/backend origin configuration

---

## PSU-Collab Initial Implementation Option

For the current capstone implementation, localStorage may be retained for consistency with the existing architecture if the security tradeoff is explicitly accepted:

| Credential         | Initial Storage | Purpose                  |
| ------------------ | --------------- | ------------------------ |
| Access Token       | `localStorage`  | Authorization header     |
| Refresh Credential | `localStorage`  | Obtain new access tokens |

### Important Security Limitation

Both credentials stored in localStorage are readable by JavaScript.

Therefore:

```text
XSS vulnerability
      ↓
Potential token theft
```

Short access-token lifetime reduces the useful lifetime of a stolen access token, but **does not eliminate the risk of a stolen refresh credential**.

Refresh-token rotation, revocation, and reuse detection reduce the impact but do not make localStorage equivalent to an HttpOnly cookie.

Therefore, the Phase 2 implementation should document localStorage as an **implementation tradeoff**, not as the strongest possible browser-security architecture.

---

# 11. Backend Implementation Plan — Phase 2

Before writing code, inspect the exact installed FastAPI Users version and determine which parts can be implemented natively.

## 11.1 `backend/app/modules/users/auth.py`

Investigate and configure:

* Access-token strategy
* Refresh/session strategy
* Access-token lifetime
* Refresh/session lifetime
* Token secrets
* Rotation support
* Revocation support
* Refresh credential validation

Do not assume a particular FastAPI Users function name until verified against the installed version.

If separate signing secrets are appropriate:

```text
SECRET_KEY
REFRESH_TOKEN_SECRET_KEY
```

may be used so that access and refresh credentials are cryptographically separated.

The exact configuration should be determined during implementation based on the chosen strategy.

---

## 11.2 `backend/app/modules/users/services.py`

Determine whether the current `FastAPIUsers` configuration can directly support the selected refresh architecture.

If FastAPI Users does not provide the required refresh/session functionality, introduce a dedicated service rather than forcing unsupported behavior into the existing authentication abstraction.

Potential responsibilities:

```text
RefreshSessionService
├── create session
├── validate session
├── rotate session
├── revoke session
├── detect reuse
└── expire session
```

---

## 11.3 `backend/app/modules/users/routes.py`

Expose the refresh endpoint according to the actual authentication implementation.

The endpoint contract should be finalized only after the FastAPI Users version and strategy have been verified.

Conceptually:

```text
POST /auth/refresh
```

should:

1. Validate refresh credential
2. Verify expiration
3. Verify revocation status
4. Verify user/session validity
5. Rotate credential if rotation is enabled
6. Issue a new access token
7. Return the required credentials
8. Reject invalid/reused credentials

---

## 11.4 `backend/app/core/config.py`

Potential configuration values:

```text
ACCESS_TOKEN_EXPIRE_SECONDS
REFRESH_TOKEN_INACTIVITY_SECONDS
REFRESH_TOKEN_MAX_LIFETIME_SECONDS
SECRET_KEY
REFRESH_TOKEN_SECRET_KEY
```

Do not hard-code these values in source code.

Values should be loaded through the application's existing configuration/environment mechanism.

---

## 11.5 Database Considerations

If database-backed refresh sessions are required, introduce a dedicated refresh/session model rather than storing only an opaque revocation list.

A potential conceptual model:

```text
RefreshSession
------------------------------
id
user_id
token_identifier / token_hash
created_at
last_used_at
expires_at
revoked_at
replaced_by
```

The exact schema should be determined during Phase 2 after confirming whether FastAPI Users already provides an appropriate mechanism.

The system should **never store raw refresh credentials in plaintext in the database** if a database-backed credential model is implemented.

---

# 12. Frontend Implementation Plan — Phase 3

## 12.1 `frontend/src/services/api.ts`

Add centralized functions for:

* Access-token storage
* Access-token retrieval
* Refresh-credential storage
* Refresh-credential retrieval
* Credential clearing
* Refresh request
* Authentication failure handling

The existing `handleResponse()` logic should change from:

```text
401
 ↓
logout
```

to:

```text
401
 ↓
Can refresh?
 ├── No → logout
 └── Yes
      ↓
   refresh
      ↓
   success?
   ├── Yes → retry request
   └── No → logout
```

---

# 13. Prevent Refresh Loops

The refresh request itself must not trigger another refresh attempt.

For example:

```text
Normal request
 ↓
401
 ↓
Refresh request
 ↓
401
 ↓
DO NOT refresh again
 ↓
Authentication failure
```

Otherwise the frontend could enter an infinite refresh loop.

The implementation should explicitly distinguish:

```text
normal API request
```

from:

```text
refresh request
```

---

# 14. Concurrent Request Handling

This is a core frontend requirement.

The system must prevent multiple simultaneous 401 responses from generating multiple refresh requests.

Desired behavior:

```text
Request A → 401 ─┐
Request B → 401 ─┤
Request C → 401 ─┤
                  │
                  ▼
             ONE refresh
                  │
                  ▼
          New access token
             │    │    │
             ▼    ▼    ▼
           A retry B retry C retry
```

Not:

```text
Request A → refresh
Request B → refresh
Request C → refresh
```

A shared refresh promise/lock/queue should be used.

If refresh fails, all waiting requests should receive the authentication failure result and the application should perform a single logout/redirect operation.

---

# 15. Frontend Authentication State

## `frontend/src/hooks/useAuth.ts`

Update:

### Login

Store the authentication credentials returned by the login flow.

### Logout

Perform:

```text
server-side session revocation
        ↓
clear access credential
        ↓
clear refresh credential
        ↓
clear authentication state
        ↓
clear relevant React Query cache
```

### Current User

Continue obtaining the authenticated user using the access token.

An expired access token should no longer automatically imply that the user must log in again.

---

# 16. `frontend/src/App.tsx`

The existing:

```text
auth:expired
```

event should no longer be dispatched merely because an access token expired.

Instead:

```text
Access token expired
        ↓
Refresh attempted
        ↓
Refresh succeeds
        ↓
No logout event
```

Only after refresh failure should the application:

```text
clear credentials
 ↓
clear authentication state
 ↓
clear appropriate query cache
 ↓
redirect /login
```

The existing `auth:expired` event can either be retained as a final authentication-failure event or replaced with a clearer event such as:

```text
auth:failed
```

The exact naming should be determined during implementation.

---

# 17. Automatic Refresh Strategy

## Primary Strategy

Use **401-triggered refresh** initially.

Advantages:

* Simple
* Works with the existing request architecture
* Avoids unnecessary refresh requests
* Easy to test
* Naturally handles unexpected expiration

Flow:

```text
API request
 ↓
401
 ↓
Check refresh credential
 ↓
Acquire refresh lock
 ↓
Refresh
 ↓
Update access credential
 ↓
Retry original request
```

## Optional Future Improvement

A proactive refresh strategy can be added later:

```text
Access token has < N seconds remaining
 ↓
Refresh before API request
```

However, proactive/background renewal is **not required for the initial implementation**.

The Phase 3 implementation should prioritize correctness and race-condition handling over additional complexity.

---

# 18. Logout Behavior

Logout must invalidate the long-lived authentication credential.

Target flow:

```text
User clicks Logout
       ↓
POST logout/revoke endpoint
       ↓
Server invalidates refresh session
       ↓
Frontend clears access token
       ↓
Frontend clears refresh credential
       ↓
Clear auth-related React Query cache
       ↓
Redirect to login
```

If the server logout request fails because the session is already invalid or expired, the frontend should still clear local credentials and complete the logout operation.

The user should not remain locally authenticated merely because the server-side logout request failed.

---

# 19. Documentation Plan — Phase 4

Documentation should explain the authentication architecture rather than simply documenting individual functions.

## Required Documentation

### Access Token

Document:

* Purpose
* Lifetime
* Authorization header usage
* Expiration behavior

### Refresh Credential

Document:

* Purpose
* Lifetime/inactivity rules
* Storage decision
* Rotation
* Revocation
* Reuse detection

### Automatic Refresh

Document:

```text
401
 ↓
refresh
 ↓
retry
```

### Logout

Document:

```text
revoke refresh session
 ↓
clear client credentials
```

### Security Tradeoffs

Document why localStorage is currently being used and explicitly identify the XSS risk.

Also document that an HttpOnly refresh cookie is a stronger future option if the application is deployed beyond the capstone environment.

---

# 20. Testing Plan — Phase 5

## 20.1 Unit Tests

Test:

* Access-token storage
* Access-token retrieval
* Refresh-credential storage
* Refresh-credential retrieval
* Credential clearing
* Refresh request
* Refresh failure handling
* Logout behavior
* Retry behavior
* Refresh lock/queue behavior

---

# 21. Integration Tests

## Successful Refresh

```text
Login
 ↓
Access protected resource
 ↓
Access token expires
 ↓
Protected request returns 401
 ↓
Refresh succeeds
 ↓
Original request is retried
 ↓
Request succeeds
 ↓
User remains logged in
```

## Expired Refresh Session

```text
Login
 ↓
Access token expires
 ↓
Refresh credential also expired
 ↓
Refresh returns 401
 ↓
Credentials cleared
 ↓
User redirected to /login
```

## Concurrent Requests

```text
Request A → 401
Request B → 401
Request C → 401
 ↓
ONE refresh request
 ↓
A/B/C retry using new access token
```

## Logout

Verify:

```text
Logout
 ↓
Refresh session revoked
 ↓
Local credentials cleared
 ↓
Old refresh credential rejected
```

---

# 22. Security Tests

Verify:

* Expired access tokens are rejected
* Invalid refresh credentials are rejected
* Expired refresh credentials are rejected
* Revoked refresh credentials are rejected
* Old rotated refresh credentials are rejected
* Refresh-token reuse is detected if rotation/reuse detection is implemented
* Logout invalidates the refresh session
* Access-token theft is limited by short expiration
* Refresh credentials are not logged
* Tokens are not exposed in error messages
* Refresh endpoint cannot be used to create an infinite refresh loop
* Refresh endpoint has appropriate rate limiting or abuse protection where practical

---

# 23. UI/UX Tests

Verify:

* User does not see a login redirect when only the access token expires
* Page remains usable while token renewal occurs
* Loading states remain correct during refresh
* Failed refresh results in a clean login redirect
* Multiple simultaneous API requests do not cause multiple logout events
* Browser tab switching does not corrupt authentication state
* Browser reload behaves correctly when the refresh session is still valid
* Logout consistently clears authentication state

---

# 24. Multi-Tab Considerations

Multiple browser tabs may independently encounter an expired access token.

The implementation should account for this where practical.

Potential scenario:

```text
Tab A → 401 → refresh
Tab B → 401 → refresh
```

At minimum, each tab must safely handle receiving a newly rotated credential.

If refresh-token rotation is implemented with strict single-use tokens, multi-tab coordination becomes particularly important because two tabs could attempt to use the same refresh credential.

Therefore, Phase 3 must explicitly test:

```text
Multiple tabs
 ↓
simultaneous token expiration
 ↓
refresh behavior
 ↓
no accidental session invalidation
```

The exact coordination mechanism should be selected during implementation.

---

# 25. Risks Identified

## 25.1 FastAPI Users Compatibility

The exact FastAPI Users version and supported refresh architecture are not yet verified.

**Mitigation:**

Before Phase 2:

1. Inspect installed package version
2. Inspect available authentication APIs
3. Verify refresh support
4. Verify router/strategy APIs
5. Design around the actual installed version

Do not assume undocumented or version-specific functions.

---

## 25.2 localStorage Security Risk

Storing refresh credentials in localStorage means JavaScript can potentially access them.

**Mitigation:**

* Short access-token lifetime
* Refresh-token rotation
* Refresh-token revocation
* Reuse detection
* Strong XSS prevention
* Never log credentials
* Strict input/output handling

Long term, consider an HttpOnly refresh cookie.

---

## 25.3 Refresh Race Conditions

Multiple requests may receive 401 simultaneously.

**Mitigation:**

Use a single refresh lock/shared promise and queue waiting requests.

---

## 25.4 Refresh-Token Rotation Race Conditions

Strict rotation can cause problems if multiple browser tabs attempt to refresh simultaneously.

**Mitigation:**

Test multi-tab behavior and design the refresh-session mechanism to safely handle concurrent refresh attempts.

---

## 25.5 Backend Configuration Errors

Incorrect token lifetime, secret, rotation, or revocation configuration could break authentication.

**Mitigation:**

Use centralized configuration and integration tests before deployment.

---

## 25.6 Incomplete Logout

Clearing only the access token is insufficient if a valid refresh credential remains.

**Mitigation:**

Centralize logout behavior and ensure both server-side session invalidation and client-side credential clearing occur.

---

# 26. Security Design Summary

The target architecture is:

```text
┌──────────────────────────────────────────┐
│                LOGIN                     │
└──────────────────┬───────────────────────┘
                   │
          ┌────────┴────────┐
          ▼                 ▼
┌──────────────────┐ ┌────────────────────┐
│ Access Token     │ │ Refresh Credential │
│                  │ │                    │
│ Short-lived      │ │ Long-lived         │
│ ~15–30 minutes   │ │ ~7-day inactivity  │
│                  │ │ + max lifetime      │
└────────┬─────────┘ └─────────┬──────────┘
         │                     │
         │ API requests        │ Refresh
         │                     │
         ▼                     ▼
      Backend              Rotation
         │                     │
         │ 401                 │
         └──────────┬──────────┘
                    ▼
               New Access
                  Token
                    │
                    ▼
              Retry Request
```

The fundamental security boundary is:

```text
Access Token
    =
Short-lived API authorization

Refresh Credential
    =
Long-lived session authorization
```

These credentials must have different lifecycles and responsibilities.

---

# 27. Recommended Implementation Sequence

## Phase 1 — Audit & Design

**Current phase**

No source code, migrations, configuration, or documentation changes.

Finalize:

* Authentication architecture
* Token lifetimes
* Storage strategy
* Rotation model
* Revocation model
* Session model
* Frontend refresh behavior

---

## Phase 2 — Backend

Before implementation:

1. Verify exact FastAPI Users version
2. Verify supported refresh functionality
3. Select native vs custom refresh implementation
4. Configure access-token lifetime
5. Configure refresh/session lifetime
6. Implement refresh endpoint
7. Implement rotation
8. Implement revocation
9. Implement reuse detection if rotation is used
10. Configure secrets
11. Add database model/migration only if required
12. Test backend authentication independently

---

## Phase 3 — Frontend

Implement:

1. Dual credential handling
2. Refresh function
3. 401 detection
4. Refresh lock/queue
5. Request retry
6. Refresh failure handling
7. Logout handling
8. Auth state updates
9. Multi-tab behavior
10. Browser reload behavior

---

## Phase 4 — Documentation

Update:

* Authentication architecture documentation
* README where appropriate
* API documentation
* Inline security comments
* Token lifecycle documentation
* Configuration documentation

---

## Phase 5 — Testing

Perform:

1. Unit tests
2. Backend integration tests
3. Frontend integration tests
4. Token expiration tests
5. Refresh tests
6. Rotation tests
7. Revocation tests
8. Reuse detection tests
9. Concurrent request tests
10. Multi-tab tests
11. Logout tests
12. Security tests
13. UI/UX validation

---

# 28. Phase 1 Completion Criteria

Phase 1 is considered complete when the following are established:

* [x] Current authentication flow documented
* [x] Current authentication files identified
* [x] Current JWT behavior identified
* [x] Need for refresh/session authentication established
* [x] Short-lived access-token architecture selected
* [x] Automatic renewal behavior defined
* [x] Concurrent request behavior identified
* [x] Logout behavior defined
* [x] Security risks identified
* [x] Testing strategy defined

Before Phase 2 begins, the following must be verified:

* [ ] Exact FastAPI Users version
* [ ] Actual refresh-token APIs available in that version
* [ ] Native vs custom refresh implementation
* [ ] Exact refresh/session lifetime model
* [ ] Rotation implementation
* [ ] Revocation implementation
* [ ] Refresh-token reuse handling
* [ ] Database requirements
* [ ] Final token storage strategy
* [ ] Multi-tab behavior

---

# 29. Critical Constraint

**This Phase 1 document is an audit and design specification only.**

During Phase 1:

* DO NOT modify source code
* DO NOT create migrations
* DO NOT modify configuration
* DO NOT change token lifetimes
* DO NOT add authentication endpoints
* DO NOT modify frontend authentication behavior
* DO NOT modify documentation in the repository

Phase 2 may begin only after the architecture has been reviewed and the actual FastAPI Users version/capabilities have been verified.

The implementation must follow the verified capabilities of the installed dependencies rather than assuming that a particular FastAPI Users refresh-token API exists.  
