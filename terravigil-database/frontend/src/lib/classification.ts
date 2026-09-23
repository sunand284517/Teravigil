import type { Classification, Detection } from '../domain/types';

/**
 * Marker geometry per classification. Shared by the badge, the map markers, and
 * the sweep ribbon so the same observation is the same shape everywhere
 * (P-20.6) — and so classification is never conveyed by colour alone (P-20.12).
 */
export const CLASSIFICATION_GLYPH: Record<Classification, string> = {
  confirmed: '⬤',
  unconfirmed_visual: '△',
  unresolved_metal: '◇',
};

export const CLASSIFICATION_LABEL: Record<Classification, string> = {
  confirmed: 'Confirmed mine',
  unconfirmed_visual: 'Unconfirmed visual',
  unresolved_metal: 'Unresolved metal',
};

export function detectionLabel(detection: Detection): string {
  return detection.sourceId ?? detection.sourceRecordId ?? detection.id;
}
