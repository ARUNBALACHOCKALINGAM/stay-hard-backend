# Stay Hard API Documentation

## Overview

The Stay Hard API provides endpoints for managing habit-building challenges, daily progress tracking, and progress photo management. This RESTful API uses JSON for requests and responses, except for file uploads which use multipart/form-data.

## Base URL

```
http://localhost:5000/api
```

## Authentication

> 🚧 Coming soon: JWT-based authentication

Currently, the API operates without authentication. Authentication will be added in a future update.

## Endpoints

### Users

#### Get User by ID
```http
GET /users/:id
```

**Parameters**
- `id` (path) - User's MongoDB ID

**Response** (200 OK)
```json
{
  "_id": "string",
  "email": "string",
  "name": "string",
  "photoUrl": "string",
  "googleId": "string",
  "currentChallengeId": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### Create User
```http
POST /users
```

**Request Body**
```json
{
  "email": "string",
  "name": "string",
  "photoUrl": "string (optional)",
  "googleId": "string (optional)"
}
```

**Response** (201 Created)
```json
{
  "_id": "string",
  "email": "string",
  "name": "string",
  "photoUrl": "string",
  "googleId": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### Update User
```http
PUT /users/:id
```

**Parameters**
- `id` (path) - User's MongoDB ID

**Request Body**
```json
{
  "name": "string (optional)",
  "photoUrl": "string (optional)",
  "currentChallengeId": "string (optional)"
}
```

### Challenges

#### Get Challenge
```http
GET /challenges/:id
```

**Parameters**
- `id` (path) - Challenge ID

**Response** (200 OK)
```json
{
  "_id": "string",
  "userId": "string",
  "challengeId": "string",
  "challengeDays": 21 | 45 | 60 | 75,
  "challengeLevel": "Soft" | "Hard" | "Custom",
  "startDate": "string",
  "expectedEndDate": "string",
  "status": "active" | "completed" | "failed" | "abandoned",
  "customTasks": [
    {
      "id": "string",
      "text": "string",
      "order": "number"
    }
  ],
  "totalDays": "number",
  "completedDays": "number",
  "currentStreak": "number",
  "longestStreak": "number",
  "avgCompletionRate": "number"
}
```

#### Update Challenge Days
```http
PATCH /challenges/:id/days
```

**Parameters**
- `id` (path) - Challenge ID

**Request Body**
```json
{
  "challengeDays": 21 | 45 | 60 | 75
}
```

#### Update Challenge Difficulty
```http
PATCH /challenges/:id/difficulty
```

**Parameters**
- `id` (path) - Challenge ID

**Request Body**
```json
{
  "challengeLevel": "Soft" | "Hard" | "Custom",
  "customTasks": [
    {
      "id": "string",
      "text": "string",
      "order": "number"
    }
  ]
}
```

#### Reset Challenge Progress
```http
POST /challenges/:id/reset
```

**Parameters**
- `id` (path) - Challenge ID

### Daily Progress

#### Get Tasks for Date
```http
GET /progress
```

**Query Parameters**
- `userId` (required) - User's MongoDB ID
- `challengeId` (required) - Challenge ID
- `date` (required) - Date in YYYY-MM-DD format

**Response** (200 OK)
```json
{
  "_id": "string",
  "userId": "string",
  "challengeId": "string",
  "date": "string",
  "dayNumber": "number",
  "tasks": [
    {
      "id": "string",
      "text": "string",
      "completed": "boolean",
      "completedAt": "string"
    }
  ],
  "completionRate": "number"
}
```

#### Update Task Status
```http
PATCH /progress/:progressId/tasks/:taskId
```

**Parameters**
- `progressId` (path) - Progress document ID
- `taskId` (path) - Task ID

**Request Body**
```json
{
  "completed": "boolean"
}
```

### Gallery

#### Upload Progress Photo
```http
POST /gallery/upload
```

**Request Body** (multipart/form-data)
- `photo` (file) - Image file
- `userId` (string) - User's MongoDB ID
- `challengeId` (string) - Challenge ID
- `date` (string) - ISO date string

**Response** (201 Created)
```json
{
  "message": "Photo uploaded successfully",
  "file": {
    "filename": "string",
    "id": "string",
    "metadata": {
      "userId": "string",
      "challengeId": "string",
      "date": "string"
    }
  }
}
```

#### Get Progress Photos
```http
GET /gallery
```

**Query Parameters**
- `userId` (required) - User's MongoDB ID
- `challengeId` (optional) - Challenge ID
- `startDate` (optional) - ISO date string
- `endDate` (optional) - ISO date string

**Response** (200 OK)
```json
[
  {
    "id": "string",
    "filename": "string",
    "uploadDate": "string",
    "metadata": {
      "userId": "string",
      "challengeId": "string",
      "date": "string"
    },
    "url": "string"
  }
]
```

#### Stream Photo
```http
GET /gallery/:id
```

**Parameters**
- `id` (path) - Photo's GridFS ID

**Response**
- Content-Type: image/jpeg
- Binary image data

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "message": "Error description",
  "errors": ["Validation error details"]
}
```

### 404 Not Found
```json
{
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "message": "Something went wrong!",
  "error": "Detailed error in development mode"
}
```

## Planned Features

### Authentication
- JWT-based authentication
- Protected routes
- User roles and permissions

### Challenge Management
- Challenge creation endpoint
- Automatic challenge completion/failure detection
- Challenge templates

### Progress Tracking
- Bulk task updates
- Progress statistics and analytics
- Streak notifications

### Gallery
- Photo deletion
- Image optimization
- Multiple photo formats support

### Infrastructure
- Rate limiting
- Request logging
- Caching layer

## Best Practices

1. Always validate the MongoDB ObjectIds before using them in requests
2. Use ISO date strings (YYYY-MM-DD) for date parameters
3. Keep photo uploads under 5MB
4. Check response status codes for proper error handling

## Rate Limits

> 🚧 Coming soon: Rate limiting implementation

## Versioning

Current version: v1

## Support

For API support, please open an issue in the repository.