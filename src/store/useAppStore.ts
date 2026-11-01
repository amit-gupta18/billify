import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { useMemo } from 'react';
import {
  defaultSettings,
  emptySeller,
  type Invoice,
  type LineItem,
  type SellerProfile,
  type Settings,
} from '../types/invoice';
import { computeTotals } from '../lib/gst';
import { formatSerial, isInvoiceNoTaken } from '../lib/serial';
import { validateForExport } from '../lib/validateInvoice';

interface AppState {
  seller: SellerProfile;
  settings: Settings;
  invoices: Record<string, Invoice>;
  hydrated: boolean;

  setHydrated: (v: boolean) => void;
  createDraft: () => string;
  updateInvoice: (id: string, patch: Partial<Invoice>) => void;
  addItem: (id: string, item: Omit<LineItem, 'id'>) => void;
  updateItem: (id: string, itemId: string, patch: Partial<LineItem>) => void;
  removeItem: (id: string, itemId: string) => void;
  finalise: (id: string) => { ok: boolean; errors?: ReturnType<typeof validateForExport> };
  duplicate: (id: string) => string | null;
  deleteInvoice: (id: string) => void;
  updateSeller: (patch: Partial<SellerProfile>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowIso(): string {
  return new Date().toISOString();
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      seller: emptySeller(),
      settings: defaultSettings(),
      invoices: {},
      hydrated: false,

      setHydrated: (v) => set({ hydrated: v }),

      createDraft: () => {
        const { settings, invoices } = get();
        const id = Crypto.randomUUID();
        const invoiceNo = formatSerial(settings);
        const now = nowIso();
        const invoice: Invoice = {
          id,
          invoiceNo,
          date: todayIso(),
          buyer: { name: '', address: '', stateCode: '' },
          meta: { paymentTerms: settings.defaultPaymentTerms },
          items: [],
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        };
        set({
          invoices: { ...invoices, [id]: invoice },
          settings: { ...settings, nextSerial: settings.nextSerial + 1 },
        });
        return id;
      },

      updateInvoice: (id, patch) => {
        const { invoices } = get();
        const inv = invoices[id];
        if (!inv || inv.status === 'final') return;

        if (patch.invoiceNo !== undefined) {
          if (isInvoiceNoTaken(patch.invoiceNo, invoices, id)) {
            return;
          }
        }

        const merged: Invoice = {
          ...inv,
          ...patch,
          buyer: patch.buyer ? { ...inv.buyer, ...patch.buyer } : inv.buyer,
          meta: patch.meta ? { ...inv.meta, ...patch.meta } : inv.meta,
          updatedAt: nowIso(),
        };
        set({ invoices: { ...invoices, [id]: merged } });
      },

      addItem: (id, item) => {
        const { invoices } = get();
        const inv = invoices[id];
        if (!inv || inv.status === 'final') return;
        const newItem: LineItem = { ...item, id: Crypto.randomUUID() };
        set({
          invoices: {
            ...invoices,
            [id]: {
              ...inv,
              items: [...inv.items, newItem],
              updatedAt: nowIso(),
            },
          },
        });
      },

      updateItem: (id, itemId, patch) => {
        const { invoices } = get();
        const inv = invoices[id];
        if (!inv || inv.status === 'final') return;
        set({
          invoices: {
            ...invoices,
            [id]: {
              ...inv,
              items: inv.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
              updatedAt: nowIso(),
            },
          },
        });
      },

      removeItem: (id, itemId) => {
        const { invoices } = get();
        const inv = invoices[id];
        if (!inv || inv.status === 'final') return;
        set({
          invoices: {
            ...invoices,
            [id]: {
              ...inv,
              items: inv.items.filter((it) => it.id !== itemId),
              updatedAt: nowIso(),
            },
          },
        });
      },

      finalise: (id) => {
        const state = get();
        const inv = state.invoices[id];
        if (!inv || inv.status === 'final') return { ok: false };
        const errors = validateForExport(inv, state.seller, state.invoices);
        if (errors.length) return { ok: false, errors };
        set({
          invoices: {
            ...state.invoices,
            [id]: { ...inv, status: 'final', updatedAt: nowIso() },
          },
        });
        return { ok: true };
      },

      duplicate: (id) => {
        const source = get().invoices[id];
        if (!source) return null;
        const { settings } = get();
        const newId = get().createDraft();
        const dup = get().invoices[newId];
        if (!dup) return null;
        const items = source.items.map((it) => ({ ...it, id: Crypto.randomUUID() }));
        set({
          invoices: {
            ...get().invoices,
            [newId]: {
              ...dup,
              buyer: { ...source.buyer },
              meta: {
                ...source.meta,
                paymentTerms: source.meta.paymentTerms ?? settings.defaultPaymentTerms,
              },
              items,
              status: 'draft',
              updatedAt: nowIso(),
            },
          },
        });
        return newId;
      },

      deleteInvoice: (id) => {
        const { invoices } = get();
        const { [id]: _, ...rest } = invoices;
        set({ invoices: rest });
      },

      updateSeller: (patch) => set({ seller: { ...get().seller, ...patch } }),

      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
    }),
    {
      name: 'invoice-app/v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (state) => ({
        seller: state.seller,
        settings: state.settings,
        invoices: state.invoices,
      }),
    }
  )
);

export function useInvoiceList() {
  const invoices = useAppStore((s) => s.invoices);
  return useMemo(() => {
    return Object.values(invoices).sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [invoices]);
}

export function useInvoice(id: string | undefined) {
  return useAppStore((s) => (id ? s.invoices[id] : undefined));
}

export function useTotals(id: string | undefined) {
  const invoice = useInvoice(id);
  const seller = useAppStore((s) => s.seller);
  return useMemo(() => {
    if (!invoice) return null;
    return computeTotals(invoice, seller);
  }, [invoice, seller]);
}

export function isInvoiceNoDuplicate(invoiceNo: string, excludeId: string): boolean {
  return isInvoiceNoTaken(invoiceNo, useAppStore.getState().invoices, excludeId);
}
