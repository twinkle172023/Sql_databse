/**
 * File MIME & Magic-Byte Detection Engine
 * Detects the file format and magic bytes while accepting all uploads without rejection.
 */

export interface ValidationReport {
  isValid: boolean;
  verdict: 'ACCEPTED';
  claimedExtension: string;
  claimedMime: string;
  detectedType: string;
  detectedMime: string;
  magicBytesHex: string;
  magicBytesAscii: string;
  expectedSignature: string;
  threatLevel: 'SAFE' | 'LOW';
  securityReasons: string[];
  recommendation: string;
}

export function inspectFileBytes(buffer: Buffer, originalFilename: string, clientMimeType?: string): ValidationReport {
  const ext = originalFilename.includes('.')
    ? '.' + originalFilename.split('.').pop()!.toLowerCase()
    : '';

  const previewSlice = buffer.subarray(0, Math.min(buffer.length, 32));
  const magicBytesHex = Array.from(previewSlice)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');

  const magicBytesAscii = Array.from(previewSlice)
    .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
    .join('');

  let detectedType = 'Unknown / Binary';
  let detectedMime = clientMimeType || 'application/octet-stream';
  let expectedSignature = 'N/A';

  // PDF
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    detectedType = 'PDF Document';
    detectedMime = 'application/pdf';
    expectedSignature = '25 50 44 46 (%PDF)';
  }
  // PNG
  else if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    detectedType = 'PNG Image';
    detectedMime = 'image/png';
    expectedSignature = '89 50 4E 47 0D 0A 1A 0A';
  }
  // JPEG / JPG
  else if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    detectedType = 'JPEG Image';
    detectedMime = 'image/jpeg';
    expectedSignature = 'FF D8 FF';
  }
  // DOCX or PPTX (ZIP container PK\x03\x04)
  else if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    const bufferString = buffer.subarray(0, Math.min(buffer.length, 2048)).toString('latin1');
    if (bufferString.includes('word/') || ext === '.docx') {
      detectedType = 'DOCX Document';
      detectedMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      expectedSignature = '50 4B 03 04 (PK.. word/)';
    } else if (bufferString.includes('ppt/') || ext === '.pptx') {
      detectedType = 'PPTX Presentation';
      detectedMime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      expectedSignature = '50 4B 03 04 (PK.. ppt/)';
    } else {
      detectedType = 'ZIP Document Archive';
      detectedMime = 'application/zip';
      expectedSignature = '50 4B 03 04';
    }
  }
  // Legacy DOC / PPT
  else if (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0
  ) {
    if (ext === '.ppt') {
      detectedType = 'PowerPoint PPT';
      detectedMime = 'application/vnd.ms-powerpoint';
    } else {
      detectedType = 'Word DOC';
      detectedMime = 'application/msword';
    }
    expectedSignature = 'D0 CF 11 E0 A1 B1 1A E1';
  }
  // Plain text
  else if (ext === '.txt' || (!buffer.includes(0x00) && buffer.length < 500000)) {
    detectedType = 'Plain Text (TXT)';
    detectedMime = 'text/plain';
    expectedSignature = 'Printable ASCII/UTF-8';
  } else {
    detectedType = ext ? `${ext.replace('.', '').toUpperCase()} Document` : 'Binary Document';
  }

  const claimedExtClean = ext.replace('.', '').toUpperCase() || 'NONE';

  return {
    isValid: true,
    verdict: 'ACCEPTED',
    claimedExtension: claimedExtClean,
    claimedMime: clientMimeType || detectedMime,
    detectedType,
    detectedMime,
    magicBytesHex,
    magicBytesAscii,
    expectedSignature,
    threatLevel: 'SAFE',
    securityReasons: [],
    recommendation: 'Document accepted and stored in database.',
  };
}
