import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { DraftOrder, MenuItemView } from '../types';
import { addDays, toISODate } from '../utils/format';

interface DraftContextValue {
  drafts: DraftOrder[];
  deliveryDate: string;
  setDeliveryDate: (iso: string) => void;
  upsertDraft: (draft: DraftOrder) => void;
  removeDraft: (id: string) => void;
  clearDrafts: () => void;
  draftTotal: (draft: DraftOrder, menu: Record<string, MenuItemView>) => number;
}

const DraftContext = createContext<DraftContextValue | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const [drafts, setDrafts] = useState<DraftOrder[]>([]);
  const [deliveryDate, setDeliveryDate] = useState(() => toISODate(addDays(new Date(), 1)));

  const upsertDraft = useCallback((draft: DraftOrder) => {
    setDrafts((current) =>
      current.some((d) => d.id === draft.id)
        ? current.map((d) => (d.id === draft.id ? draft : d))
        : [...current, draft],
    );
  }, []);

  const removeDraft = useCallback((id: string) => {
    setDrafts((current) => current.filter((d) => d.id !== id));
  }, []);

  const clearDrafts = useCallback(() => setDrafts([]), []);

  const draftTotal = useCallback(
    (draft: DraftOrder, menu: Record<string, MenuItemView>) =>
      Object.entries(draft.quantities).reduce(
        (sum, [menuId, quantity]) => sum + (menu[menuId]?.price ?? 0) * quantity,
        0,
      ),
    [],
  );

  const value = useMemo(
    () => ({ drafts, deliveryDate, setDeliveryDate, upsertDraft, removeDraft, clearDrafts, draftTotal }),
    [drafts, deliveryDate, upsertDraft, removeDraft, clearDrafts, draftTotal],
  );

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDrafts(): DraftContextValue {
  const context = useContext(DraftContext);
  if (!context) throw new Error('useDrafts harus dipakai di dalam <DraftProvider>.');
  return context;
}
