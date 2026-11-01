import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { sanitizePdfFileName } from '../lib/serial';

export async function exportInvoicePdf(html: string, invoiceNo: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  const fileName = sanitizePdfFileName(invoiceNo);
  const dest = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.copyAsync({ from: uri, to: dest });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) return;

  try {
    await Sharing.shareAsync(dest, {
      mimeType: 'application/pdf',
      dialogTitle: `Share ${fileName}`,
    });
  } catch {
    // User cancelled
  }
}
