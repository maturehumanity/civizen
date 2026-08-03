import { supabase } from '@/integrations/supabase/client';

const CERTIFICATE_BUCKET = 'education-certificates';
const MAX_BYTES = 12 * 1024 * 1024;

function getCertificateExtension(file: File): string {
  const rawExtension = file.name.split('.').pop()?.trim().toLowerCase();
  if (rawExtension && rawExtension.length <= 5) {
    return rawExtension;
  }

  const mimeToExtension: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };

  return mimeToExtension[file.type] || 'bin';
}

export function isEducationCertificateFile(file: File): boolean {
  const allowed = new Set([
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ]);
  if (file.type && allowed.has(file.type)) return true;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return Boolean(ext && ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext));
}

export async function uploadEducationCertificate(file: File, userId: string) {
  if (!isEducationCertificateFile(file)) {
    throw new Error('invalid_type');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('too_large');
  }

  const extension = getCertificateExtension(file);
  const filePath = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(CERTIFICATE_BUCKET)
    .upload(filePath, file, {
      contentType: file.type || undefined,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  return { filePath };
}
