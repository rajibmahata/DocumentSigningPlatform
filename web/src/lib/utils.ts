import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function base64ToBlob(base64: string, contentType: string): Blob {
  const byteChars = atob(base64);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteArray[i] = byteChars.charCodeAt(i);
  }
  return new Blob([byteArray], { type: contentType });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'signed':   return 'bg-green-100 text-green-700';
    case 'pending':  return 'bg-yellow-100 text-yellow-700';
    case 'expired':  return 'bg-red-100 text-red-700';
    case 'cancelled':return 'bg-gray-100 text-gray-600';
    default:         return 'bg-blue-100 text-blue-700';
  }
}
