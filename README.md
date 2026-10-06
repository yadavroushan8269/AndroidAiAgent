# Android AI Agent — Version 1

A small Kotlin Android prototype for a personal AI-style agent using Android AccessibilityService.

## What it does
- Opens YouTube, Chrome, or Android Settings from a natural-language command.
- Finds visible editable fields.
- Types a search phrase using AccessibilityNodeInfo.ACTION_SET_TEXT.
- Tries to click a visible Search/Go/Enter control.
- Shows agent status in the app.
- Includes Run and Stop controls.

Example:
`YouTube kholo aur search Python tutorial karo`

## Important
This is a Version 1 automation prototype, not a full general-purpose AI agent. The planner is rule-based so it can be built without putting an API key into the APK. A later version can replace the planner with an LLM and add stronger screen understanding.

Accessibility automation should be used only on a device and apps where you have permission to automate. Google Play has separate policies for accessibility services; check current policy requirements before publishing.

## Build
Use Android Studio with JDK 17. The project uses Android Gradle Plugin 9.4.0 and Kotlin 2.4.10.

1. Open this folder in Android Studio.
2. Sync Gradle.
3. Build > Build APK(s).
4. Install the debug APK.
5. Open AI Agent and enable `AI Agent Accessibility` in Android Accessibility settings.
6. Return to the app and run a command.
