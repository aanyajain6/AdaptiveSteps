// Clock access in one place (and outside components, where the
// React compiler lint can't mistake event-handler reads for render).
export const nowMs = (): number => Date.now();
export const nowIso = (): string => new Date().toISOString();
