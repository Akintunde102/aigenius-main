# Implementation Plan: Non-Text Models Catalog Modal

> **Status:** Approved by User / Ready for Implementation  
> **Target Package:** `client/frontend`  
> **Relevant Domain:** Chat Shell / Model Interface (`client/frontend/src/app/components/model-interface`)  
> **Key Architecture Reference:** [`client/frontend/ARCHITECTURE.md`](../ARCHITECTURE.md), [`AGENTS.md`](../../../AGENTS.md)

---

## Confirmed Specifications & Design Decisions

1. **Trigger & Labeling:** Entry point in the sidebar footer settings/more menu (alongside *Saved messages*, *My files*, etc.) with label **"Media models"** and an icon (e.g. `FiFilm` / `FiLayers`).
2. **Modality Scope:** Includes all non-text models across four tabs:
   - **Images:** Text-to-Image, Inpainting, Image Editing (e.g., FLUX, SeeDream, Gemini Flash Image, Grok Imagine).
   - **Videos:** Text-to-Video, Image-to-Video, Camera controls (e.g., SeeDance, Wan, HappyHorse, FLUX Video).
   - **Voice & Speech:** Text-to-Speech (TTS), Multi-voice synthesis (e.g., Deepgram Aura, Fish Audio, Seed Audio).
   - **Transcription & STT:** Speech-to-Text, Diarization, Audio transcription (e.g., Nova-3, Universal-3.5, Chirp-3).
3. **Card Interaction:** Clicking any model card opens `ModelDetailsModal` displaying comprehensive specifications, parameters, and pricing breakdown. The modal indicates "Catalog preview only — not available for text chat", and the "Use Model" button is completely suppressed.
4. **Discoverability:** A subtle discoverability link/banner inside the chat model picker (`ModelSelectionModal`), e.g., *"Looking for image, video, or audio models? Explore the media models catalog"*.

---

## 1. Executive Summary

Nobox / AIGenius currently hosts a wide selection of multimodal, image, video, speech, and transcription models on the backend (`backend/src/utils/ai-models/`). In the chat UI, the primary model selector (`ModelSelectionModal`) intentionally restricts the selectable list to text-output conversation models (`filterModelsForChatUiCatalog` filters out non-text models). 

This project introduces a **Non-Text Models Catalog Modal**:
- **Purpose:** A dedicated, read-only viewing and discovery experience for non-text models (Image Generation, Video Generation, Voice/Speech synthesis, and Transcription/STT).
- **Not for Picking:** This modal does **not** allow picking/selecting a model for active text chat sessions. Instead, it serves as a showcase, directory, and reference catalog for creative tools, API usage, and capability discovery.
- **Entry Point:** Placed directly in the navigation menu (the sidebar footer options/settings menu, with potential cross-discovery from the text model picker).

---

## 2. Technical Architecture & Data Flow

### 2.1 Data Retrieval & Reusability (Zero Extra API Overhead)

The backend endpoint `GET /gateway/*/model-chats/models` (serviced by `getGatewayModelChatsModels` and `getModels()` in `backend/src/utils/ai-models/index.ts`) already loads and caches **all models across all modalities**:
- Text models (`allowed/text/*`)
- Image models (`allowed/image/*`) (e.g. FLUX.2 Pro, SeeDream 5.0, Gemini Flash Image, Grok Imagine)
- Video models (`allowed/video/*`) (e.g. ByteDance SeeDance 2.0, Alibaba Wan 2.7, HappyHorse 1.1, FLUX.3 Video)
- Speech/TTS models (`allowed/speech/*`) (e.g. Deepgram Aura 2, Fish Audio S2 Pro, Seed Audio 1.0)
- Transcription/STT models (`allowed/transcription/*`) (e.g. Deepgram Nova-3, AssemblyAI Universal-3.5, Google Chirp-3)

Currently, `client/frontend/src/app/components/model-interface/features/models/hooks/useModelData.ts` fetches this unified list once and filters it using `filterModelsForChatUiCatalog()`.

```
                  ┌────────────────────────────────────────┐
                  │ GET /gateway/*/model-chats/models      │
                  │ (Full Model Dump: Text + Non-Text)     │
                  └───────────────────┬────────────────────┘
                                      │
                         fetchCloudModelsList()
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
   filterConversationPickableModels()              filterNonTextModels()
              │                                               │
              ▼                                               ▼
    Chat Text Models                                Non-Text Media Models
 (Used by ModelSelectionModal)                    (Used by NonTextModelsModal)
```

**Implementation Strategy:**
- Enhance `useModelData.ts` (or provide a lightweight companion hook `useNonTextModelData.ts`) to retain and export the non-text models (`nonTextModels: Model[]`).
- Utilize existing modality classifiers in `modelConversationEligibility.utils.ts` (`catalogModalityFromModel`).
- No new backend endpoints or extra roundtrips required.

---

## 3. Component Hierarchy & File Structure

```
client/frontend/src/app/components/model-interface/features/models/
├── components/
│   ├── NonTextModelsModal.tsx            <-- [NEW] Main catalog modal shell
│   ├── NonTextModelCard.tsx              <-- [NEW] Media-focused model showcase card
│   ├── NonTextModelFilters.tsx           <-- [NEW] Search + Modality Tabs + Provider filter
│   ├── ModelDetailsModal.tsx             <-- [REUSED] Full spec & pricing inspection
│   └── ... (existing ModelSelection components)
├── hooks/
│   ├── useNonTextModels.ts               <-- [NEW] Filtering, sorting, and search hook
│   └── useModelData.ts                   <-- [MODIFIED] Expose raw / non-text models
├── utils/
│   ├── modelConversationEligibility.utils.ts <-- [MODIFIED] Add filterNonTextModels helper
│   └── nonTextModelFormatting.utils.ts   <-- [NEW] Pricing/modality/parameter display helpers
└── index.ts                              <-- Export new components
```

---

## 4. UI & UX Specification

### 4.1 Header & Search Bar
- **Header Title:** "Media & Creative Models" (or "Non-Text Model Catalog").
- **Subtitle:** "Explore specialized models for image generation, video production, speech synthesis, and transcription."
- **Search Bar:** Real-time search by model name, developer/lab, model ID, description, or capability tags.
- **Dismiss Control:** Top-right close button (`FiX`), backdrop click, and `Escape` key shortcut.

### 4.2 Modality Filtering Tabs
Interactive tab filters with counts:
1. **All** — Complete non-text inventory.
2. **Images** (`FaRegImage`) — Text-to-Image, Image Editing, Inpainting (e.g., FLUX, SeeDream, Midjourney proxy).
3. **Videos** (`FiFilm`) — Text-to-Video, Image-to-Video, Frame-interpolation (e.g., SeeDance, Wan, HappyHorse).
4. **Speech & Voice** (`FiMic` / `FiVolume2`) — Text-to-Speech (TTS), Voice Cloning (e.g., Deepgram Aura, Fish Audio).
5. **Transcription** (`FiFileText`) — Speech-to-Text (STT), Audio diarization (e.g., Deepgram Nova, AssemblyAI).

### 4.3 Secondary Filters & Sorting
- **Lab / Provider Filter:** Dropdown matching existing `FilterPillDropdown` (Black Forest Labs, ByteDance, Google, Alibaba, Deepgram, xAI, etc.).
- **Sorting Dropdown:**
  - Default (Featured & popular first)
  - Name (A-Z)
  - Lab / Provider
  - Release Date (Newest first)
  - Estimated Cost / Generation Pricing

### 4.4 Non-Text Model Card (`NonTextModelCard`)
The card design matches the existing design system (`app-model-card`, CSS variables, dark/light theme support) with non-text specific affordances:
- **Header:** Model display name + Provider badge.
- **Modality Badges:**
  - Clear visual indicator of input/output (e.g., `Text + Image → Image`, `Text → Video 1080p`).
- **Capability Tags:** E.g., `Aspect Ratio`, `Seed Control`, `First/Last Frame`, `Multi-Voice`, `Word Timestamps`.
- **Pricing Indicator:** Cost formatted per image, per video, or per audio minute (derived from `model.pricing.image_output`, `video_output`, etc.).
- **Interaction:**
  - Click anywhere on the card to open detailed technical specifications.
  - Quick action: "Copy Model ID" button for easy reference in prompts or API tools.
  - **No Selection Controls:** No radio button, no "Use Model" primary action, no active chat session switching.

### 4.5 Detailed View (`ModelDetailsModal`)
- Clicking any card opens `ModelDetailsModal`.
- The modal already contains the fallback state:
  ```tsx
  <div className="flex items-center gap-1.5 text-xs text-[var(--modal-muted-fg)]">
      <FiAlertCircle size={14} className="shrink-0 opacity-80" />
      <span>Catalog preview only — not available for text chat</span>
  </div>
  ```
  and suppresses the `Use Model` button because `canPickForChat` is `false`.
- In this non-text modal context, the modal will display full pricing tables, input/output schemas, supported parameters, and token/context ceilings.

---

## 5. Navigation & Menu Wiring

### 5.1 Sidebar Footer Settings Menu (`SidebarFooter.tsx`)
In the popup menu opened by the settings button (gear icon) at the bottom of `ChatHistorySidebar`:
- Add a new menu entry:
  ```tsx
  <button
      type="button"
      className={MENU_ROW_BASE}
      onClick={(e) => {
          e.stopPropagation();
          onOpenNonTextModels();
          setIsMenuOpen(false);
      }}
  >
      <span className={MENU_ICON_SLOT} aria-hidden>
          <FiFilm size={MENU_ICON_SIZE} strokeWidth={MENU_ICON_STROKE} />
      </span>
      <span>Media models</span>
  </button>
  ```

### 5.2 Callback & State Propagation
1. `ChatHistorySidebar.tsx` receives `onOpenNonTextModels?: () => void`.
2. `ModelInterfaceSidebarPanel.tsx` forwards the prop.
3. `ModelInterface.tsx` maintains state:
   ```tsx
   const [showNonTextModelsModal, setShowNonTextModelsModal] = useState(false);
   ```
4. `ModelInterfaceModalStack.tsx` renders `NonTextModelsModal` when `showNonTextModelsModal` is `true`.

---

## 6. Implementation Steps & Milestones

| Step | Action | Files Affected |
|------|--------|----------------|
| **1** | Add non-text models helper & update `useModelData` to expose non-text models | `modelConversationEligibility.utils.ts`, `useModelData.ts` |
| **2** | Create `useNonTextModels` filtering and sorting hook | `features/models/hooks/useNonTextModels.ts` |
| **3** | Build `NonTextModelCard` and `NonTextModelFilters` | `features/models/components/NonTextModelCard.tsx`, `NonTextModelFilters.tsx` |
| **4** | Build `NonTextModelsModal` matching the theme & portal conventions | `features/models/components/NonTextModelsModal.tsx` |
| **5** | Add menu trigger to `SidebarFooter.tsx` and wire through `ChatHistorySidebar` | `SidebarFooter.tsx`, `ChatHistorySidebar.tsx` |
| **6** | Wire modal in `ModelInterface.tsx` and `ModelInterfaceModalStack.tsx` | `ModelInterface.tsx`, `ModelInterfaceModalStack.tsx` |
| **7** | Verification & testing | TypeScript verification (`tsc --noEmit`), smoke tests |

---

## 7. Verification & Safeguards

1. **Platform Rules Compliance:**
   - No dynamic `@/` imports.
   - Use CSS variables (`var(--modal-bg)`, `var(--modal-border)`, `var(--sidebar-fg)`, etc.) for dark/light theme fidelity.
   - No hot-path console logging.
2. **Verification Commands:**
   - `cd client/frontend && npx tsc --noEmit`
   - Run unit/smoke tests for touched components.
