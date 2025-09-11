# API Documentation

## Overview

The backend API provides endpoints for enhancing, validating, and managing prompts. All endpoints are prefixed with `/api`.

**Base URL:** `http://localhost:3011/api` (when running locally)

## Common Headers

All `POST` requests must include the following header:

```
Content-Type: application/json
```

## Endpoints

### Prompt Enhancement

#### `POST /enhance`

Enhances a given prompt based on the selected mode. This is the primary endpoint of the service.

**Request Body:**

```json
{
  "prompt": "Your prompt text here",
  "mode": "standard" 
}
```

-   `prompt` (string, required): The text to enhance.
-   `mode` (string, required): The enhancement mode. Must be one of `standard`, `creative`, `technical`, or `scientifically`.

**Success Response (200 OK):**

```json
{
    "enhancedPrompt": "This is the AI-generated, enhanced version of your prompt...",
    "taskMode": "enhance",
    "validationResult": {
        "isValid": true,
        "violations": []
    },
    "attempts": 1,
    "_meta": {
        "processingTime": 1534,
        "requestId": "req_1725986933389_j8k5w2y9n"
    }
}
```

#### `POST /enhance/suggestions`

Returns a list of suggestions for how to improve a prompt without running the full enhancement process.

**Request Body:**

```json
{
  "prompt": "Your prompt text here",
  "mode": "technical"
}
```

**Success Response (200 OK):**

```json
{
    "suggestions": [
        "Specify the desired output format (e.g., JSON, XML, a specific coding style).",
        "Include constraints such as performance, security, or resource limitations.",
        "Define the expected structure of the output clearly."
    ],
    "prompt": "Your prompt text here",
    "mode": "technical"
}
```

#### `POST /enhance/validate`

Validates a prompt against a set of quality rules and returns issues or warnings.

**Request Body:**

```json
{
  "prompt": "fix my code",
  "mode": "technical"
}
```

**Success Response (200 OK):**

```json
{
    "validation": {
        "isValid": true,
        "issues": [],
        "warnings": [
            "Prompt is very short and may lack sufficient context."
        ]
    },
    "suggestions": []
}
```

### Service & Configuration

#### `GET /health`

Checks the health of the backend service. Useful as a container health check.

**Success Response (200 OK):**

```json
{
    "status": "ok",
    "version": "1.0.0",
    "uptime": 120.45
}
```

#### `GET /enhance/status`

Provides the current status of the AI enhancement service, including the model being used.

**Success Response (200 OK):**

```json
{
    "service": "enhancement",
    "model": "deepseek-chat",
    "available": true,
    "timestamp": "2025-09-10T16:50:11.432Z"
}
```

#### `GET /enhance/config`

Returns the current client-side configuration for the AI service.

**Success Response (200 OK):**

```json
{
    "config": {
        "model": "deepseek-chat",
        "baseURL": "https://api.deepseek.com/v1",
        "maxTokens": 3000,
        "temperature": 0.2,
        "topP": 0.9,
        "frequencyPenalty": 0,
        "presencePenalty": 0,
        "timeout": 30000,
        "maxRetries": 3,
        "retryDelay": 1000
    },
    "timestamp": "2025-09-10T16:51:22.189Z"
}
```

### Logging (Optional)

These endpoints are only available if `LOG_AI_REQUESTS` is set to `true` in your `.env` file.

-   `GET /enhance/logs/:promptId?`: Retrieves logs for a specific prompt or all logs if no ID is provided.
-   `DELETE /enhance/logs`: Clears all stored logs.

## Error Handling

The API returns standard HTTP status codes for errors.

-   `400 Bad Request`: The request body is missing required fields or contains invalid data.
-   `429 Too Many Requests`: The rate limit has been exceeded. The default is 10 requests per minute.
-   `500 Internal Server Error`: An unexpected error occurred on the server.
-   `503 Service Unavailable`: The AI service is not available or failed to respond.