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

  /** Mode Kurir: daftar antar tanpa menu. Disimpan di sini agar centang tidak hilang saat pindah tab. */
  courierMode: boolean;
  setCourierMode: (on: boolean) => void;
  courierIds: string[];
  toggleCourier: (customerId: string) => void;
  addCourierIds: (ids: string[]) => void;
  setCourierIds: (ids: string[]) => void;
  clearCourier: () => void;
}

const DraftContext = createContext<DraftContextValue | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const [drafts, setDrafts] = useState<DraftOrder[]>([]);
  const [deliveryDate, setDeliveryDate] = useState(() => toISODate(addDays(new Date(), 1)));
  const [courierMode, setCourierMode] = useState(false);
  const [courierIds, setCourierIds] = useState<string[]>([]);

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

  const toggleCourier = useCallback((customerId: string) => {
    setCourierIds((current) =>
      current.includes(customerId) ? current.filter((id) => id !== customerId) : [...current, customerId],
    );
  }, []);

  const addCourierIds = useCallback((ids: string[]) => {
    setCourierIds((current) => Array.from(new Set([...current, ...ids])));
  }, []);

  const clearCourier = useCallback(() => setCourierIds([]), []);

  const value = useMemo(
    () => ({
      drafts,
      deliveryDate,
      setDeliveryDate,
      upsertDraft,
      removeDraft,
      clearDrafts,
      draftTotal,
      courierMode,
      setCourierMode,
      courierIds,
      toggleCourier,
      addCourierIds,
      setCourierIds,
      clearCourier,
    }),
    [
      drafts, deliveryDate, upsertDraft, removeDraft, clearDrafts, draftTotal,
      courierMode, courierIds, toggleCourier, addCourierIds, clearCourier,
    ],
  );

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDrafts(): DraftContextValue {
  const context = useContext(DraftContext);
  if (!context) throw new Error('useDrafts harus dipakai di dalam <DraftProvider>.');
  return context;
}
