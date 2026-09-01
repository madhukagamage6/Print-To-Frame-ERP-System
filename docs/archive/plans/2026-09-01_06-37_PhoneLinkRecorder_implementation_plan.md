# Implementation Plan — Windows Phone Link Click-to-Call & In-Browser Live Call Recorder

Integrate 1-click call execution via the Windows Phone Link protocol (`tel:`) and an in-browser live call recording engine into the universal Lead & Deal Card (`LeadCardDetails.jsx`), seamlessly feeding recorded calls into the Gemini AI Call Scope Analyzer.

## User Review Required

> [!IMPORTANT]
> **Key Architecture Highlights**:
> 1. **Windows Phone Link Integration**:
>    - Clicking **`Call via Phone Link`** uses standard OS protocol hooks (`tel:+94...`), prompting Windows to bring Phone Link into focus with the lead's number pre-filled on the dial pad.
> 2. **In-Browser Live Call Recording**:
>    - Clicking **`● Record Live Call`** activates the browser's `MediaRecorder` API to capture call audio with live timer indicators (`● REC 01:24`).
>    - Clicking **`⏹ Stop & Analyze`** automatically compresses the recording (8kHz mono WAV) and feeds it directly into the AI Call Recording Analyzer without manual file uploads.
> 3. **Design System & UI Consistency**:
>    - Uses existing PTF dark theme tokens (`bg-surface-container`, `border-outline-variant`, `#00daf3` cyan, `#10b981` emerald), Lucide icons (`PhoneCall`, `Mic`, `Square`, `Radio`), and responsive layout.

---

## Proposed Changes

### CRM Module

#### [MODIFY] [`LeadCardDetails.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/LeadCardDetails.jsx)

- **Add Live Audio Recording State & MediaRecorder Lifecycle**:
  - State variables: `isRecording` (boolean), `recordingDuration` (seconds), `mediaRecorderRef`, `audioChunksRef`, `recordingTimerRef`.
  - Handlers:
    - `startCallRecording()`: Initializes `navigator.mediaDevices.getUserMedia({ audio: true })`, starts chunk collection, and runs 1-second interval timer.
    - `stopCallRecording()`: Finalizes blob, creates downsampled 8kHz WAV `File` object, populates `audioFile` & `audioPreviewUrl`, sets `uploadStage = 'ready'`, and displays audio preview.
    - `cancelCallRecording()`: Cleans up media stream tracks and resets timer.

- **Add Call Action Suite in Client Profile Details (Top Left)**:
  - Directly beneath the Contact Number input:
    - **`Call via Phone Link` Button**: Formats the phone number and triggers `tel:<phone>`, opening Windows Phone Link.
    - **`Record Live Call` / `Stop Recording` Button**:
      - Idle State: Emerald/Cyan styled `● Record Call` button.
      - Active State: Pulsing red indicator `● Recording 00:45 • Stop & Send to AI`.

- **Enhanced AI Call Recording Analyzer Section**:
  - Displays recorded audio badge with duration and file details alongside standard file upload dropzone.
  - 1-click **`Extract Scope using Gemini AI`** immediately processes the recorded call into technical specifications.

---

## Verification Plan

### Automated Build Verification
- Run `npm run build` in `c:\Users\User\Documents\print-to-frame-erp-system` to ensure 100% clean bundle compilation with zero syntax or build errors.

### Manual Verification
1. Open any Lead or Deal card in the CRM.
2. Enter a phone number (e.g. `+94 71 141 9027`).
3. Click **`Call via Phone Link`**:
   - Verify Windows triggers the Phone Link application with the number pre-filled.
4. Click **`● Record Call`**:
   - Verify browser microphone permission prompt appears (on first use).
   - Verify active recording timer (`● REC 00:05...`) displays cleanly.
5. Speak for 5–10 seconds and click **`⏹ Stop & Send to AI`**:
   - Verify audio is captured, compressed, and loaded into the audio preview player.
   - Click **`Extract Scope using Gemini AI`** and verify technical scope extraction succeeds.
