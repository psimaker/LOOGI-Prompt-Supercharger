# Guide: Customizing Enhancement Modes

## Overview

This guide explains how to modify, replace, or add new enhancement modes to the application. I'll use the example of replacing the `concise` mode with a new `scientifically` mode to walk through the required steps.

After following this guide, you will be able to:

-   Rename or replace existing modes.
-   Add new modes to the system.
-   Understand which files to modify for customizations.

## File Structure for Mode Changes

Customizing a mode requires edits in both the frontend and backend. Here are the key files involved:

```
LOOGI-Prompt-Supercharger/
├── src/
│   ├── frontend/            # Frontend Application
│   │   └── src/
│   │       ├── App.tsx      # Main React component with UI text
│   │       ├── types.ts     # TypeScript type definitions (AIMode)
│   │       └── components/
│   │           └── ModeSelector.tsx # The mode selection dropdown
│   └── backend/             # Backend API
│       └── src/
│           └── services/
│               ├── EnhancedPromptEnhancementService.ts # Contains the core enhancement logic
│               └── prompts/
│                   └── index.ts           # Definitions for system prompts
└── docs/
    └── MODUS_CUSTOMIZATION_GUIDE.md # This guide
```

## Step-by-Step: Replacing a Mode

Let's replace the (hypothetical) `concise` mode with a new `scientifically` mode.

### Step 1: Update TypeScript Type

First, update the shared type definition to include the new mode and remove the old one.

**File:** `src/frontend/src/types.ts`

**Before:**
```typescript
export type AIMode = 'standard' | 'creative' | 'technical' | 'concise';
```

**After:**
```typescript
export type AIMode = 'standard' | 'creative' | 'technical' | 'scientifically';
```

### Step 2: Update Prompt Definitions

Define the system prompt and display text for the new mode in the backend.

**File:** `src/backend/src/services/prompts/index.ts`

**Before:**
```typescript
export const modeConfigs = {
  // ... other modes
  concise: {
    name: 'Concise',
    description: 'Brief and focused answers',
    systemPrompt: `You are a concise AI assistant...`
  }
} as const;
```

**After:**
```typescript
export const modeConfigs = {
  // ... other modes
  scientifically: {
    name: 'Scientific',
    description: 'Academically precise and methodologically sound',
    systemPrompt: `You are a scientific AI assistant. Provide academically precise...`
  }
} as const;
```

### Step 3: Update AI Service Logic

The backend service uses a `switch` statement to select the system prompt. Update it to reflect the new mode.

**File:** `src/backend/src/services/EnhancedPromptEnhancementService.ts` (or similar file with the logic)

**Before:**
```typescript
switch (mode) {
  // ... other cases
  case 'concise':
    systemPrompt = prompts.concise.systemPrompt;
    break;
}
```

**After:**
```typescript
switch (mode) {
  // ... other cases
  case 'scientifically':
    systemPrompt = prompts.scientifically.systemPrompt;
    break;
}
```

### Step 4: Update Frontend UI Text

Update the localization text in the main `App.tsx` file so the UI displays the correct name and description for the new mode.

**File:** `src/frontend/src/App.tsx`

Inside the `getLocalizedText` function, find the `modes` object and make the change.

**Before (English text):**
```javascript
modes: {
  // ...
  concise: 'Concise',
  conciseDesc: 'Brief and focused'
}
```

**After (English text):**
```javascript
modes: {
  // ...
  scientifically: 'Scientific',
  scientificallyDesc: 'Academically precise and methodologically sound'
}
```

Remember to also update the German localization block (`if (isGerman)`) in the same file.

### Step 5: Rebuild and Test

After making these changes, rebuild your Docker containers and restart the application to see the new mode in action.

```bash
# Rebuild and start all services
docker compose up --build -d
```

Once the application is running, open the web UI and verify:
1.  The new "Scientific" mode appears in the dropdown.
2.  Selecting it and enhancing a prompt produces the expected scientific tone.

## Troubleshooting

-   **Mode not visible in UI?** Check that you updated `types.ts` and `ModeSelector.tsx` correctly.
-   **API error on enhancement?** Ensure the `switch` statement in the backend service (`EnhancedPromptEnhancementService.ts`) includes a case for your new mode.
-   **Build fails?** A TypeScript error is the most likely cause. Run `npm run build` in `src/frontend` and `src/backend` separately to locate the error.