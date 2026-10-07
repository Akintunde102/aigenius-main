/**
 * Keep in sync with `.app-modal-overlay` in `globals.scss`.
 * Popovers portaled to `document.body` must use >= MODAL_POPOVER_Z_INDEX when
 * they can open inside a full-screen modal (My files, attachment library, etc.).
 */
export const MODAL_OVERLAY_Z_INDEX = 9999;
export const MODAL_POPOVER_Z_INDEX = 10050;
/** Second-layer dialogs (preview panel, confirm on top of another modal). */
export const MODAL_ELEVATED_Z_INDEX = 10060;
