# Offline Invoice (Expo)

Fully offline React Native invoicing app: create GST tax invoices, compute IGST/CGST/SGST on device, preview the template, and export PDFs with no network calls.

## Stack

- Expo SDK 58 + TypeScript + Expo Router
- Zustand + AsyncStorage persistence
- `expo-print` / `expo-sharing` for on-device PDF export
- Jest unit tests for GST totals, amount in words, and HTML snapshot

## Run

```bash
npm install
npm start
```

## Test

```bash
npm test
```

## Features

- Invoice list with search, duplicate, delete
- Draft editor with buyer details, order/dispatch meta, line items
- Live GST totals (inter-state IGST vs intra-state CGST+SGST)
- Settings: seller profile, bank details, serial defaults
- Preview WebView matches exported PDF HTML
- Final invoices are read-only; duplicate creates a new draft serial

All data is stored locally under the key `invoice-app/v1`.
