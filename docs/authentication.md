# PSU-Collab Authentication System

This document explains the actual authentication implementation in PSU-Collab as implemented in Phases 1-3.

## 1. JWT Fundamentals

### What JWT Means
JWT stands for JSON Web Token, an open standard (RFC 7519) that defines a compact and self-contained way for securely transmitting information between parties as a JSON object.

### What a JWT Is
A JWT is a string made up of three parts separated by dots (`.`):
- Header
- Payload
- Signature

### Header
The header typically consists of two parts: the type of token (JWT) and the signing algorithm being used (e.g., HMAC SHA256 or RSA).

Example:
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Payload
The payload contains the claims. Claims are statements about an entity (typically, the user) and additional data. There are three types of claims: registered, public, and private claims.

### Signature
To create the signature part, you have to take the encoded header, the encoded payload, a secret, and the algorithm specified in the header, and sign that.

### How JWT Signature Validation Works
When a token is received, the application verifies the signature by:
1. Decoding the header and payload
2. Recreating the signature using the header, payload, and secret key
3. Comparing the recreated signature with the signature in the token
4. If they match, the token is valid and hasn't been tampered with

### What `exp` Means
The `exp` (expiration time) claim identifies the expiration time on or after which the JWT MUST NOT be accepted for processing. The processing of the `exp` claim requires that the current date/time MUST be before the expiration date/time listed in the `exp` claim.

### What `iat` Means
The `iat` (issued at) claim identifies the time at which the JWT was issued. This claim can be used to determine the age of the JWT.

### What `sub` Means
The `sub` (subject) claim identifies the principal that is the subject of the JWT. In PSU-Collab, this contains the user's UUID.

### Other Claims Actually Used by PSU-Collab
PSU-Collab uses the standard JWT claims plus some custom implementation details:
- `sub`: User's UUID (string format)
- `exp`: Expiration timestamp
- `iat`: Issued at timestamp
- `aud`: Audience (not explicitly used in validation but present)
- `iss`: Issuer (not explicitly used in validation but present)

## 2. Access Tokens

### Purpose
Access tokens are used to authenticate API requests. They are sent with each request to verify the identity of the user making the request.

### Lifetime
Access tokens are short-lived, expiring after 30 minutes (1800 seconds) as configured in `ACCESS_TOKEN_EXPIRE_SECONDS`.

### Where They Are Sent
Access tokens are sent in the Authorization header as a Bearer token:
```
Authorization: Bearer <access_token>
```

### How the Backend Validates Them
The backend validates access tokens by:
1. Extracting the token from the Authorization header
2. Using the JWTStrategy from fastapi-users with the application's SECRET_KEY
3. Verifying the token's signature
4. Checking that the token hasn't expired (validating the `exp` claim)
5. Extracting the user information from the token's `sub` claim
6. Loading the user from the database to ensure they still exist and are active

### Why They Are Short-Lived
Access tokens are short-lived to limit the window of opportunity if a token is compromised. If an access token is stolen, the attacker can only use it for a limited time (30 minutes) before it expires.

### Why Not Make Access Tokens Last Several Days?
Making access tokens last several days would significantly increase the security risk:
- If stolen, an attacker would have prolonged access to the user's account
- It would defeat the purpose of having a refresh token mechanism
- Long-lived tokens increase the potential damage from token theft
- It goes against security best practices for token-based authentication

## 3. Refresh Tokens/Session

### Purpose
Refresh tokens are used to obtain new access tokens when the current access token expires, allowing users to remain authenticated without needing to re-enter their credentials.

### Lifetime
Refresh tokens are long-lived, expiring after 7 days (604800 seconds) as configured in `REFRESH_TOKEN_EXPIRE_SECONDS`.

### When They Are Used
Refresh tokens are used when:
1. An access token expires (returns 401 Unauthorized)
2. The frontend automatically attempts to refresh the access token using the refresh token
3. The user manually logs out (which revokes refresh tokens)
4. The refresh token itself expires (requiring re-login)

### Where They Are Store
Refresh tokens are stored:
- In the frontend: in localStorage (as `refresh_token`)
- In the backend: in the `refresh_tokens` database table (hashed for security)

### Whether They Are Rotated
Yes, refresh tokens are rotated. Each time a refresh token is used to obtain a new access token, a new refresh token is generated and the old one is invalidated.

### Whether They Are Revocable
Yes, refresh tokens are revocable. They can be revoked by:
- Deleting the token record from the database (on logout)
- Setting the `replaced_by` field when rotating tokens
- Manual administrative removal (though not exposed via API)

### What Happens When They Expire
When a refresh token expires:
1. The frontend's attempt to refresh the access token will fail
2. The frontend will clear both access and refresh tokens from storage
3. The frontend will dispatch an `auth:expired` event
4. The user will be redirected to the login page
5. The user must enter their credentials again to obtain new tokens

## 4. Access vs Refresh

|                          | Access Token                  | Refresh/Session                |
| ------------------------ | ----------------------------- | ------------------------------ |
| Purpose                  | API authentication            | Obtain/maintain authentication |
| Lifetime                 | Short (30 minutes)            | Longer (7 days)                |
| Used on normal API calls | Yes                           | No                             |
| Exposure                 | Minimize (short-lived)        | Protect strongly               |
| Expiration               | Short (30 minutes)            | Longer policy (7 days)         |
| Rotation                 | N/A                           | Yes (on each use)              |
| Storage                  | localStorage (access_token)   | localStorage (refresh_token) + database (hashed) |

## 5. PSU-Collab Authentication Flow

```text
Login
 ↓
Authentication
 ↓
Access token
 +
Refresh/session
 ↓
API requests
 ↓
Access token expires
 ↓
Automatic refresh
 ↓
New access token
 ↓
Continue using application
```

Also:
```text
Refresh/session expires
 ↓
Refresh fails
 ↓
Authentication cleared
 ↓
/login
```

## 6. Why the Old System Logged Users Out

The previous behavior was:
```text
JWT expires
 ↓
401
 ↓
frontend clears token
 ↓
auth:expired
 ↓
/login
```

The problem was not necessarily JWT itself. The application was treating access-token expiration as complete session expiration, requiring users to log in again even when they might still have valid refresh tokens.

The current system fixes this by:
1. Separating access tokens (short-lived) from refresh tokens (long-lived)
2. Automatically using refresh tokens to obtain new access tokens when the current one expires
3. Only requiring re-login when the refresh token itself expires or is invalidated

## 7. Common Web Application Convention

Modern applications commonly separate:
```text
Short-lived access credential
+
Longer-lived refresh/session credential
```

Common implementations include:
* access + refresh tokens
* server-side sessions
* HttpOnly cookies
* OAuth/OIDC
* BFF architectures

PSU-Collab selected the **access + refresh tokens** approach because:
- It provides a good balance of security and user experience
- Access tokens are short-lived, limiting exposure if stolen
- Refresh tokens enable long sessions without frequent re-authentication
- Token rotation reduces replay attack risk
- It works well with SPA (Single Page Application) architectures
- It doesn't require server-side session storage, improving scalability
- It avoids the complexities of cookie-based approaches (CSRF, SameSite, etc.)

We do not claim that every website uses the same architecture - different applications have different requirements and constraints.

## 8. Security

### Token Theft
Why short access-token lifetime limits exposure:
- If an access token is stolen, the attacker can only use it for the remaining lifetime (max 30 minutes)
- After that, they would need a valid refresh token to continue
- Refresh tokens are better protected and rotated, making them harder to steal and use
- The combination significantly reduces the window of opportunity for attackers

### XSS
Explain why browser storage such as localStorage can expose credentials to JavaScript:
- localStorage is accessible via JavaScript, making it vulnerable to XSS attacks
- If an attacker can execute JavaScript in your application (through XSS), they can read data from localStorage
- This includes both access tokens and refresh tokens if stored there
- However, the short lifetime of access tokens limits the damage from such theft
- Refresh token rotation means that even if stolen, a refresh token may only be usable once

### HttpOnly Cookies
Explain what HttpOnly protects against:
- HttpOnly cookies are not accessible via JavaScript's `document.cookie` API
- This protects against theft of cookies through XSS attacks
- However, HttpOnly does NOT eliminate XSS vulnerabilities - it only protects cookie data
- The application can still be vulnerable to other XSS attacks that don't target cookies

Note: PSU-Collab does NOT use HttpOnly cookies for token storage. We use localStorage instead, which means:
- Tokens ARE accessible to JavaScript
- We rely on Content Security Policy (CSP) and other measures to prevent XSS
- The short access token lifetime and refresh token rotation mitigate risks

### CSRF
If cookies are used, explain:
* SameSite
* CSRF considerations
* the project's actual mitigation

Since PSU-Collab uses localStorage for token storage rather than cookies:
- CSRF is not applicable in the traditional sense (no cookies to forge)
- However, we still need to protect against other types of forged requests
- Our protection comes from:
  1. Requiring the Authorization Bearer header for API requests (not automatically sent by browsers)
  2. CORS policies that restrict which origins can make requests
  3. The fact that custom headers like Authorization are not sent in simple cross-origin requests without preflight

## 9. Refresh Token Rotation

If implemented, explain:
```text
RT1
 ↓
refresh
 ↓
RT2
 ↓
RT1 invalid
```

Refresh token rotation is implemented in PSU-Collab:
1. When a user logs in, they receive RT1 (refresh token 1)
2. When the access token expires and the frontend uses RT1 to get a new access token:
   - The backend validates RT1
   - Creates a new access token
   - Creates a new refresh token (RT2)
   - Marks RT1 as replaced by setting its `replaced_by` field to RT2's ID
   - Returns both the new access token and RT2
3. RT1 is now invalid because its `replaced_by` field is set
4. If someone tries to use RT1 again, it will be rejected

Why rotation reduces replay risk:
- If an attacker steals a refresh token, they can only use it once
- After the legitimate user (or attacker) uses it, it gets rotated and becomes invalid
- Any subsequent attempt to use the stolen token will fail
- This limits the usefulness of stolen refresh tokens to a single use

## 10. Logout

Exactly what happens during logout:
1. Frontend calls `/auth/jwt/logout` endpoint
2. Backend receives the request with the current access token
3. Backend validates the access token to get the user ID
4. Backend calls `revoke_refresh_tokens_for_user(user_id)` which:
   - Deletes ALL refresh token records for that user from the database
5. Backend returns success response
6. Frontend clears both access token and refresh token from localStorage
7. Frontend clears query cache
8. Frontend redirects to `/login` page

## 11. Configuration

All relevant environment/configuration settings (without documenting real secrets):

From `backend/app/core/config.py`:
- `SECRET_KEY`: Used for signing JWTs (access tokens)
- `ACCESS_TOKEN_EXPIRE_SECONDS`: Lifetime of access tokens in seconds (default: 1800 = 30 minutes)
- `REFRESH_TOKEN_EXPIRE_SECONDS`: Lifetime of refresh tokens in seconds (default: 604800 = 7 days)
- `REFRESH_TOKEN_SECRET_KEY`: Used for refresh token operations (defaults to SECRET_KEY if not set)

These are configured via environment variables:
- `SECRET_KEY`
- `ACCESS_TOKEN_EXPIRE_SECONDS`
- `REFRESH_TOKEN_EXPIRE_SECONDS`
- `REFRESH_TOKEN_SECRET_KEY` (optional)

## 12. Troubleshooting

Include common problems:

### Access token expired
- Symptoms: API requests return 401 Unauthorized
- Diagnosis: Check if access token exists in localStorage and when it was issued
- Solution: The frontend should automatically attempt to refresh using the refresh token
- If refresh fails, user needs to log in again

### Refresh failed
- Symptoms: Automatic token refresh fails, user gets logged out
- Diagnosis: 
  1. Check if refresh token exists in localStorage
  2. Check network requests to `/auth/refresh-token`
  3. Look for 401 responses from refresh endpoint
- Solution: 
  1. If refresh token is missing/invalid: user needs to log in
  2. If server error: check backend logs
  3. If network issue: check connectivity

### Session expired
- Symptoms: User is redirected to login page unexpectedly
- Diagnosis:
  1. Check if both tokens were cleared from localStorage
  2. Check if `auth:expired` event was dispatched
  3. Determine if it was due to access token expiration (should auto-refresh) or refresh token expiration (requires login)
- Solution: User needs to log in again with credentials

### Login redirect
- Symptoms: After login, user is not redirected to expected page
- Diagnosis: Check navigation logic in login success handler
- Solution: Verify routing configuration

### Cookie not being sent
- Note: PSU-Collab uses localStorage, not cookies for token storage
- If attempting to use cookies: check SameSite, Secure, and domain settings

### CORS issues
- Symptoms: Browser blocks requests to backend due to CORS policy
- Diagnosis: Check browser console for CORS error messages
- Solution: 
  1. Verify backend CORS middleware configuration
  2. Ensure frontend origin is allowed
  3. Check that credentials are included if needed

### 401 loops
- Symptoms: Repeated 401 responses despite having tokens
- Diagnosis:
  1. Check if tokens are malformed or expired
  2. Verify that refresh token rotation is working correctly
  3. Check if user account is disabled/deleted
- Solution:
  1. Clear tokens and log in fresh
  2. Check backend logs for validation errors
  3. Verify user account status in database

## 13. Developer Testing

Explain how developers can safely test token expiration without changing production security settings:

### Testing Access Token Expiration
1. Do NOT use multi-day access tokens as a testing workaround
2. Instead, temporarily reduce `ACCESS_TOKEN_EXPIRE_SECONDS` to a small value (e.g., 10 seconds) in a development environment
3. This allows testing the refresh flow without compromising security
4. Remember to revert the change after testing

### Testing Refresh Token Expiration
1. Similarly, temporarily reduce `REFRESH_TOKEN_EXPIRE_SECONDS` to a small value for testing
2. Or manually delete the refresh token from localStorage to simulate expiration
3. Test that the user is properly redirected to login

### Safe Testing Practices
1. Always test in development/staging environments, never production
2. Use separate test accounts for expiration testing
3. Clear browser storage between test runs
4. Monitor network requests to verify token exchange flow
5. Test both successful refresh and failed refresh scenarios
6. Verify that token rotation works correctly (old tokens invalidated, new tokens work)

### Verification
At the end, verify the documentation matches the actual implementation from Phases 1-3 by checking:
- Token lifetimes match config values
- Refresh token rotation is implemented as described
- Logout properly revokes tokens
- Automatic refresh flow works in frontend
- Error handling matches documented behavior