# AIGenius: Conversational Audio Architecture

Authoritative guide for the voice pipeline: how speech-to-text (STT), text-to-speech (TTS), and real-time transport differ between **browser (web)** and **desktop (Electron)**.

Use `isAigeniusDesktopRuntime()` in the frontend to branch behavior. Desktop talks to `http://localhost:8001` (`desktop-server`); the browser talks to the NestJS cloud API and browser Web APIs.

---

## 1. Unified Voice Matrix (current)

| Runtime | Mode | Dictation (mic icon) | Conversational (phone icon) — STT | Conversational — TTS |
| :--- | :--- | :--- | :--- | :--- |
| **Browser** | Native APIs | `webkitSpeechRecognition` → composer | Google STT when `BROWSER_STT_ENGINE=native`; else cloud socket | `speechSynthesis` when `BROWSER_TTS_ENGINE=native`; else cloud socket |
| **Browser** | Cloud | — | Socket.IO `/audio`: `audio:chunk` + `audio:finalize` | Socket.IO: `audio:synthesize` → `audio:data` |
| **Desktop** | Local sidecar | HTTP `POST /stt/stream/*` (WebM accumulate) | **Same HTTP stream as dictation** (not socket STT) | HTTP `POST /tts/synthesize` → WAV → `playAISpeech` |
| **Desktop** | Socket (TTS only) | — | — | Optional fallback: `audio:synthesize` on `ws://localhost:8001/audio` if HTTP fails |

### Important split (desktop, 2026)

- **STT** for conversation mode uses the **HTTP streaming API** (`/stt/stream/start`, `/chunk`, `/transcribe`, `/end`) — identical to dictation. The socket is **not** used for mic chunks or finalize on desktop (avoids empty/corrupt `.webm` session files).
- **TTS** uses **HTTP** `POST /tts/synthesize` from `useSentenceStreaming` (Pocket-TTS sidecar). The local `/audio` socket remains connected for legacy/fallback synthesis only.
- **Browser** behavior is unchanged: conversational STT/TTS go through the **cloud** `/audio` Socket.IO namespace (or native Web APIs when configured).

---

## 2. Environment separation

### A. Desktop (Electron + `desktop-server`)

| Layer | Technology | Entry points |
| :--- | :--- | :--- |
| **Capture** | `useAudioEngine` — Silero VAD (WASM), 16 kHz WAV on silence, 250 ms WebM chunks | Shared by dictation & conversation |
| **Dictation STT** | `useAudioSTT` → HTTP `/stt/stream/*` | Writes composer via `setInput` |
| **Conversation STT** | `useConversationalMode` → HTTP `/stt/stream/*` + WAV fallback `POST /stt/transcribe` | `commitTranscript` → `handleSend` |
| **Conversation TTS** | `useSentenceStreaming` → HTTP `/tts/synthesize` | Sentence streaming → `playAISpeech` |
| **Sidecar** | Python `voice_sidecar.py` (stdio JSON) | STT + TTS subprocess |

Server routes: `desktop-server/src/routes/stt.routes.ts`, `tts.routes.ts`.  
Optional socket gateway: `desktop-server/src/sidecar/audio.gateway.ts` (cloud-parity events; desktop STT should not rely on it).

### B. Browser (web app)

| Layer | Technology |
| :--- | :--- |
| **STT (preferred)** | `webkitSpeechRecognition` when `BROWSER_STT_ENGINE=cloud` still uses neural VAD + optional cloud chunks |
| **STT (fallback)** | Socket `audio:chunk` / `audio:finalize` → Groq/OpenAI Whisper (NestJS `audio.gateway.ts`) |
| **TTS** | Socket `audio:synthesize` → Cartesia/ElevenLabs/etc., or `window.speechSynthesis` when `BROWSER_TTS_ENGINE=native` |
| **Guard** | Never initialize `webkitSpeechRecognition` on desktop (double-transcription with Whisper) |

---

## 3. Desktop HTTP STT stream (dictation + conversation)

```
MediaRecorder (250 ms WebM) ──POST /stt/stream/chunk──► append session.webm
Neural VAD silence (WAV)     ──POST /stt/stream/transcribe──► faster-whisper | whisper.cpp
                             ──POST /stt/stream/end──► cleanup
```

If the WebM session is missing or invalid, conversation mode falls back to uploading the **VAD WAV** via `POST /stt/transcribe`.

**Server safeguards** (`stt-stream-utils.ts`):

- Skip transcribe if file &lt; 2 KB or missing WebM EBML header (avoids sidecar “Invalid data” errors).
- Snapshot file before transcribe so concurrent chunk appends do not corrupt reads.

---

## 4. Audio pipeline & latency (shared)

### Voice Activity Detection (VAD)

1. **Neural VAD (primary)**: `@ricky0123/vad-web` (Silero), 16 kHz WAV on `onSpeechEnd`.
2. **Energy fallback**: `ScriptProcessorNode` for barge-in while assistant is speaking.
3. **Preview gate**: Browser live captions only when VAD has approved speech (`isSpeechDetectedRef`).

### Browser “zero-latency” STT (unchanged)

When native Google STT is active, finalize uses in-browser final text — no `audio:finalize` wait.

### TTS sentence streaming (unchanged logic)

`useSentenceStreaming.ts`: punctuation / comma splits, partial flush timer (`TTS_PARTIAL_FLUSH_MS`), end-of-stream flush, `streamFlushPendingRef` mic gating.

**Desktop path**: after each speakable segment → `POST /tts/synthesize` → decode WAV in `playAISpeech`.  
**Browser path**: `socket.emit('audio:synthesize')` → `audio:data` → `playAISpeech` (unchanged).

---

## 5. GPU acceleration & STT/TTS backends

### Speech-to-text

| Backend | When used | GPU in AIGenius today |
| :--- | :--- | :--- |
| **whisper.cpp** (subprocess) | `AIGENIUS_STT_BACKEND=whisper_cpp`, or `auto` when CLI + GGML weights exist | **CPU only** in our CLI invocation (`-t` threads via `WHISPER_CPP_THREADS`). We do **not** pass `-ngl` / GPU layer flags. A GPU-enabled `whisper-cli` build still runs CPU unless you extend `stt_whisper_cpp.py`. |
| **faster-whisper** (Python) | `AIGENIUS_STT_BACKEND=faster_whisper`, or `auto` fallback | **NVIDIA CUDA** when `torch.cuda.is_available()` (`float16`); else CPU `int8`. This is what many desktop logs show (`model=faster-whisper-base`). |

Env: `AIGENIUS_STT_BACKEND` = `auto` | `whisper_cpp` | `faster_whisper` (see `voice_sidecar_lib/stt_config.py`).

### Text-to-speech (Pocket-TTS)

| Backend | When used | GPU in AIGenius today |
| :--- | :--- | :--- |
| **PyTorch** (`pocket_tts`) | `AIGENIUS_TTS_BACKEND=pytorch`, or `auto` without ONNX model | Uses Pocket-TTS / PyTorch defaults (`PYTORCH_ENABLE_MPS_FALLBACK=1` for Apple Silicon). No explicit CUDA wiring in our code. |
| **ONNX Runtime** | `AIGENIUS_TTS_BACKEND=onnx`, or `auto` when `models/pocket_tts.onnx` exists | **Windows**: DirectML (`onnxruntime-directml`) when available; else **CUDA** EP; else CPU. See `voice_sidecar_lib/tts_onnx.py`. |

Env: `AIGENIUS_TTS_BACKEND` = `auto` | `pytorch` | `onnx`.

---

## 6. Voices (desktop Pocket-TTS)

Default preset: **`alba`** (female, English — Kyutai “Alba Mackenna” casual prompt).

Built-in English presets (pass string name to `voice` / `AIGENIUS_TTS_VOICE`):

| Preset | Notes |
| :--- | :--- |
| `alba` | Default; female |
| `cosette` | Female |
| `eponine` | Female |
| `fantine` | Female |
| `azelma` | Female |
| `marius`, `javert`, `jean` | Male character voices |

### How to change desktop voice

1. **Server env** (recommended): set before starting `desktop-server`:
   ```bash
   AIGENIUS_TTS_VOICE=cosette
   ```
2. **Frontend constant**: `AUDIO_CONSTANTS.LOCAL_DESKTOP_TTS_VOICE` in `audio.constants.ts` (sent in each `POST /tts/synthesize` body).
3. **Per request**: `{ "text": "...", "voice": "eponine" }` on `/tts/synthesize`.

Browser cloud TTS uses separate presets in `backend/src/config/voice.config.ts` (Cartesia: `Grace`, `Friendly Female`, etc.) — not Pocket-TTS names.

---

## 7. Key frontend hooks

| Hook | Role |
| :--- | :--- |
| `useAudioEngine.ts` | Mic, VAD, MediaRecorder, `playAISpeech`, native TTS queue |
| `useAudioSTT.ts` | Dictation; desktop → HTTP stream; browser → socket when connected |
| `useConversationalMode.ts` | Phone mode; desktop STT → HTTP; browser STT → socket / native |
| `useSentenceStreaming.ts` | LLM text → TTS; desktop → HTTP; browser → socket / native |
| `useVoiceLoopMaintenance.ts` | Partial STT: desktop HTTP / browser `audio:partialFlush` |
| `useAudioSocket.ts` | Connects `/audio` (cloud URL or `localhost:8001`) |
| `useTranscriptManager.ts` | Conversation-only commit filters (noise, status, duplicates) |

Wiring: `useModelInterface.ts` (production). Keep in sync with `AudioContext.tsx` if that path is used.

---

## 8. Socket protocol (browser cloud + desktop TTS fallback)

### Client → server

| Event | Browser | Desktop |
| :--- | :--- | :--- |
| `audio:chunk` | WebM stream (if not native STT) | Not used for STT |
| `audio:finalize` | WAV after VAD | Not used for STT |
| `audio:synthesize` | `{ text }` | Fallback only; prefer HTTP TTS |
| `audio:interrupt` | Barge-in | Barge-in |

### Server → client

| Event | Purpose |
| :--- | :--- |
| `audio:transcription` | STT partial/final (browser) |
| `audio:data` | WAV chunk for playback (browser socket TTS) |
| `audio:error` | Failure |
| `audio:partialIdle` | Partial STT slot free |

NestJS gateway: `backend/src/modules/audio/audio.gateway.ts`.  
Desktop gateway: `desktop-server/src/sidecar/audio.gateway.ts` (finalize temp files use `.wav` / `.webm` by magic bytes).

---

## 9. Developer rules

1. **Dual hook sites**: Changes to conversational/dictation hooks must stay aligned in `useModelInterface.ts` and `AudioContext.tsx` when both are active.
2. **Do not route desktop STT through socket** while also using HTTP stream sessions — causes corrupt WebM and “Invalid data” from faster-whisper.
3. **Browser paths**: Do not gate browser TTS on desktop HTTP; keep `!socket?.connected` early return for web cloud mode.
4. **VAD assets**: `baseAssetPath` / `onnxWASMBasePath` need trailing slashes (`/vad/`).
5. **Diagnostics**: `localStorage.setItem('aigenius:voice-trace', '1')` (frontend), `AIGENIUS_VOICE_OBS=1` (desktop-server).

---

## 10. Related files

| Area | Path |
| :--- | :--- |
| Voice architecture (this doc) | `ARCHITECTURE_VOICE.md` |
| Desktop STT routes | `desktop-server/src/routes/stt.routes.ts` |
| Desktop TTS routes | `desktop-server/src/routes/tts.routes.ts` |
| Sidecar STT/TTS | `desktop-server/python/voice_sidecar_lib/` |
| Cloud audio gateway | `backend/src/modules/audio/audio.gateway.ts` |
| Frontend constants | `frontend/.../hooks/audio.constants.ts` |
