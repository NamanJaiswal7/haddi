# Google OAuth API Documentation

## Overview

The Google OAuth exchange API allows mobile applications to authenticate users using Google OAuth 2.0. This endpoint exchanges an authorization code for an access token and user information, then either creates a new user account or logs in an existing user.

## Endpoint

```
POST /api/auth/google/exchange
```

## Request

### Headers
```
Content-Type: application/json
```

### Body
```json
{
  "code": "4/0AfJohXn...", // Authorization code from Google
  "redirectUri": "glcapp://auth" // The redirect URI used in OAuth flow
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | Authorization code received from Google OAuth flow |
| `redirectUri` | string | Yes | The redirect URI that was used in the OAuth flow |

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "access_token": "ya29.a0AfB_byC...", // Google access token
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "student",
    "googleId": "google_user_id_123",
    "picture": "https://lh3.googleusercontent.com/...",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Error Responses

#### 400 Bad Request - Missing Required Fields
```json
{
  "success": false,
  "message": "Authorization code and redirect URI are required"
}
```

#### 400 Bad Request - Invalid Authorization Code
```json
{
  "success": false,
  "message": "Failed to obtain access token from Google"
}
```

#### 400 Bad Request - Failed to Get User Info
```json
{
  "success": false,
  "message": "Failed to retrieve user information from Google"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Google OAuth exchange failed",
  "error": "Error details"
}
```

## User Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique user identifier |
| `email` | string | User's email address |
| `name` | string | User's display name |
| `role` | string | User role (always "student" for Google OAuth) |
| `googleId` | string | Google user ID |
| `picture` | string | User's profile picture URL |
| `createdAt` | string | ISO timestamp when user was created |
| `updatedAt` | string | ISO timestamp when user was last updated |

## Flow Description

1. **Authorization Code Exchange**: The API exchanges the authorization code for an access token using Google's OAuth2 API
2. **User Info Retrieval**: Uses the access token to fetch user information from Google's userinfo endpoint
3. **User Lookup/Creation**: 
   - If a user exists with the same email or Google ID, updates their information
   - If no user exists, creates a new student account
4. **JWT Token Generation**: Generates a JWT token for the user session
5. **Response**: Returns the Google access token and user information

## Environment Variables Required

The following environment variables must be set:

- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret
- `JWT_SECRET`: Secret key for JWT token generation

## Setup Instructions

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" and create an OAuth 2.0 Client ID
5. Add your redirect URI (e.g., `glcapp://auth`) to the authorized redirect URIs
6. Note down the Client ID and Client Secret

### 2. Environment Configuration

Update your environment variables in `docker-compose.yml` or `docker-compose.dev.yml`:

```yaml
environment:
  GOOGLE_CLIENT_ID: your_google_client_id_here
  GOOGLE_CLIENT_SECRET: your_google_client_secret_here
```

### 3. Mobile App Integration

In your mobile app, implement the Google OAuth flow:

1. Initiate Google OAuth with your client ID
2. Use the redirect URI: `glcapp://auth`
3. Capture the authorization code from the redirect
4. Send the code and redirect URI to this API endpoint
5. Use the returned JWT token for subsequent API calls

## Testing

Run the test script to verify the API works:

```bash
npm run test:google-oauth
```

This will test the validation logic. For full testing with real Google OAuth, you'll need to:

1. Set up real Google OAuth credentials
2. Get a real authorization code from the OAuth flow
3. Test with actual Google user data

## Security Considerations

- Always use HTTPS in production
- Store Google client secrets securely
- Validate redirect URIs to prevent open redirect attacks
- Implement rate limiting for OAuth endpoints
- Log OAuth activities for security monitoring
- Consider implementing token refresh logic for long-lived sessions

## Error Handling

The API includes comprehensive error handling:

- Validates all required fields
- Handles Google API errors gracefully
- Provides meaningful error messages
- Logs errors for debugging
- Returns appropriate HTTP status codes

## Rate Limiting

Consider implementing rate limiting for this endpoint to prevent abuse:

- Limit requests per IP address
- Limit requests per Google account
- Implement exponential backoff for failed attempts

## Logging

The API logs the following events:

- Successful OAuth exchanges
- New user creation
- Failed OAuth attempts
- Error details for debugging

Logs include user email, Google ID, and user ID for tracking purposes. 