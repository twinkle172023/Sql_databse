/**
 * Secure File Validation & Deep Magic-Byte Inspection Engine
 * 
 * SECURITY PRINCIPLES:
 * 1. Never trust the extension or Content-Type header supplied by client.
 * 2. Inspect raw file bytes (Magic Numbers / File Signatures).
 * 3. Detect script code (Python, Shell, JS, PHP) disguised as documents.
 * 4. Verify structural boundaries before accepting file.
 * 5. Isolate files in non-executable storage with randomized UUID names.
 */

export interface ValidationReport {
  isValid: boolean;
  verdict: 'ACCEPTED' | 'REJECTED';
  claimedExtension: string;
  claimedMime: string;
  detectedType: string;
  detectedMime: string;
  magicBytesHex: string;
  magicBytesAscii: string;
  expectedSignature: string;
  threatLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  securityReasons: string[];
  recommendation: string;
}

const SUPPORTED_PERMITTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.jpg', '.jpeg', '.png'];

export function inspectFileBytes(buffer: Buffer, originalFilename: string, clientMimeType?: string): ValidationReport {
  const ext = originalFilename.includes('.')
    ? '.' + originalFilename.split('.').pop()!.toLowerCase()
    : '';

  // 1. Generate Hex & ASCII preview of first 32 bytes
  const previewSlice = buffer.subarray(0, Math.min(buffer.length, 32));
  const magicBytesHex = Array.from(previewSlice)
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');

  const magicBytesAscii = Array.from(previewSlice)
    .map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
    .join('');

  const textSample = buffer.subarray(0, Math.min(buffer.length, 4096)).toString('utf8');

  const securityReasons: string[] = [];
  let detectedType = 'Unknown / Unrecognized';
  let detectedMime = 'application/octet-stream';
  let expectedSignature = 'N/A';
  let threatLevel: ValidationReport['threatLevel'] = 'LOW';
  let isValid = false;

  // 2. Check for Executable Signatures (PE, ELF, Mach-O, Java Class)
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    detectedType = 'Windows Executable / DLL (PE32)';
    detectedMime = 'application/x-dosexec';
    threatLevel = 'CRITICAL';
    securityReasons.push('Header begins with "MZ" (0x4D 0x5A), the Windows DOS/PE executable marker.');
  } else if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    detectedType = 'Linux ELF Binary Executable';
    detectedMime = 'application/x-executable';
    threatLevel = 'CRITICAL';
    securityReasons.push('Header begins with 0x7F ELF, a Linux binary executable.');
  } else if (buffer.length >= 4 && buffer[0] === 0xca && buffer[1] === 0xfe && buffer[2] === 0xba && buffer[3] === 0xbe) {
    detectedType = 'Java Bytecode Class';
    detectedMime = 'application/java-vm';
    threatLevel = 'HIGH';
    securityReasons.push('Header begins with 0xCAFEBABE, compiled Java bytecode.');
  }

  // 3. Check for Script Signatures (Python, Bash, JS, PHP)
  const isPythonScript = 
    /^(#!.*python|import\s+[a-zA-Z0-9_]|from\s+[a-zA-Z0-9_]+\s+import|def\s+[a-zA-Z0-9_]+\s*\(|print\s*\(|class\s+[a-zA-Z0-9_]+:)/m.test(textSample);

  const isBashScript = 
    /^(#!\/(bin|usr\/bin)\/(bash|sh|zsh)|chmod\s+\+x|curl\s+-|wget\s+-|echo\s+["'])/m.test(textSample);

  const isPhpScript = 
    /(<\?php|<\?=|\beval\s*\(|\bsystem\s*\(|\bpassthru\s*\()/i.test(textSample);

  const isJsScript = 
    /^(#!.*node|<script\b|\bconst\s+[a-zA-Z0-9_]+\s*=|\blet\s+[a-zA-Z0-9_]+\s*=|function\s+[a-zA-Z0-9_]*\s*\(|require\s*\(['"])/m.test(textSample);

  if (threatLevel !== 'CRITICAL') {
    if (isPythonScript) {
      detectedType = 'Python Source Script';
      detectedMime = 'text/x-python';
      threatLevel = 'HIGH';
      securityReasons.push('Payload contains Python language syntax or shebang (e.g. print, import, def).');
    } else if (isBashScript) {
      detectedType = 'Unix Shell Script';
      detectedMime = 'text/x-shellscript';
      threatLevel = 'HIGH';
      securityReasons.push('Payload contains Unix shell commands or shebang (e.g. #!/bin/bash).');
    } else if (isPhpScript) {
      detectedType = 'PHP Script';
      detectedMime = 'text/x-php';
      threatLevel = 'CRITICAL';
      securityReasons.push('Payload contains PHP execution delimiters (<?php or <?=).');
    } else if (isJsScript) {
      detectedType = 'JavaScript Code';
      detectedMime = 'application/javascript';
      threatLevel = 'HIGH';
      securityReasons.push('Payload contains JavaScript code patterns or DOM script wrappers.');
    }
  }

  // 4. Genuine Magic Byte Detection for Permitted Types
  // PDF
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    detectedType = 'PDF Document';
    detectedMime = 'application/pdf';
    expectedSignature = '25 50 44 46 (%PDF)';
    threatLevel = 'SAFE';
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
    threatLevel = 'SAFE';
  }
  // JPEG / JPG
  else if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    detectedType = 'JPEG Image';
    detectedMime = 'image/jpeg';
    expectedSignature = 'FF D8 FF';
    threatLevel = 'SAFE';
  }
  // DOCX or PPTX (ZIP container PK\x03\x04)
  else if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    // Inspect zip central directory or entries for word/ or ppt/
    const bufferString = buffer.subarray(0, Math.min(buffer.length, 2048)).toString('latin1');
    if (bufferString.includes('word/') || ext === '.docx') {
      detectedType = 'DOCX Document (OpenXML)';
      detectedMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      expectedSignature = '50 4B 03 04 (PK.. + word/)';
      threatLevel = 'SAFE';
    } else if (bufferString.includes('ppt/') || ext === '.pptx') {
      detectedType = 'PPTX Presentation (OpenXML)';
      detectedMime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      expectedSignature = '50 4B 03 04 (PK.. + ppt/)';
      threatLevel = 'SAFE';
    } else {
      detectedType = 'ZIP Archive';
      detectedMime = 'application/zip';
      expectedSignature = '50 4B 03 04';
      threatLevel = 'MEDIUM';
      securityReasons.push('Generic ZIP archive container detected without standard Office XML schema.');
    }
  }
  // Legacy DOC or PPT (CFB OLE header: D0 CF 11 E0 A1 B1 1A E1)
  else if (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 && buffer[5] === 0xb1 && buffer[6] === 0x1a && buffer[7] === 0xe1
  ) {
    if (ext === '.ppt') {
      detectedType = 'Legacy PowerPoint PPT';
      detectedMime = 'application/vnd.ms-powerpoint';
    } else {
      detectedType = 'Legacy Word DOC';
      detectedMime = 'application/msword';
    }
    expectedSignature = 'D0 CF 11 E0 A1 B1 1A E1 (CFB OLE)';
    threatLevel = 'SAFE';
  }
  // Plain Text (TXT)
  else if (
    ext === '.txt' &&
    !isPythonScript && !isBashScript && !isPhpScript && !isJsScript &&
    threatLevel !== 'CRITICAL'
  ) {
    // Check if buffer is valid printable text without null bytes or binary control characters
    let isBinary = false;
    for (let i = 0; i < Math.min(buffer.length, 1024); i++) {
      const byte = buffer[i];
      if (byte === 0x00 || (byte < 0x09 && byte !== 0x0a && byte !== 0x0d) || (byte >= 0x0e && byte < 0x20)) {
        isBinary = true;
        break;
      }
    }
    if (!isBinary) {
      detectedType = 'Plain Text (ASCII/UTF-8)';
      detectedMime = 'text/plain';
      expectedSignature = 'Printable ASCII/UTF-8 text';
      threatLevel = 'SAFE';
    }
  }

  // 5. Compare Claimed Extension vs Content
  const claimedExtClean = ext.replace('.', '').toUpperCase();

  // Determine expected signatures for the claimed extension
  switch (ext) {
    case '.pdf':
      expectedSignature = '25 50 44 46 (%PDF)';
      break;
    case '.png':
      expectedSignature = '89 50 4E 47 0D 0A 1A 0A';
      break;
    case '.jpg':
    case '.jpeg':
      expectedSignature = 'FF D8 FF';
      break;
    case '.docx':
      expectedSignature = '50 4B 03 04 (PK.. OpenXML)';
      break;
    case '.pptx':
      expectedSignature = '50 4B 03 04 (PK.. OpenXML)';
      break;
    case '.doc':
    case '.ppt':
      expectedSignature = 'D0 CF 11 E0 A1 B1 1A E1';
      break;
    case '.txt':
      expectedSignature = 'UTF-8 Printable Text';
      break;
    default:
      expectedSignature = 'Unpermitted file extension';
      securityReasons.push(`File extension "${ext}" is not in the whitelist.`);
  }

  // Discrepancy checks:
  if (!SUPPORTED_PERMITTED_EXTENSIONS.includes(ext)) {
    securityReasons.push(`Extension "${ext}" is not supported. Supported: PDF, DOC/DOCX, PPT/PPTX, TXT, JPG, PNG.`);
  }

  if (ext === '.pdf' && !detectedType.includes('PDF')) {
    securityReasons.push(`Extension is .pdf but binary magic bytes do not begin with %PDF- (0x25 0x50 0x44 0x46).`);
  }
  if (ext === '.png' && !detectedType.includes('PNG')) {
    securityReasons.push(`Extension is .png but binary magic bytes do not match PNG signature.`);
  }
  if ((ext === '.jpg' || ext === '.jpeg') && !detectedType.includes('JPEG')) {
    securityReasons.push(`Extension is ${ext} but binary magic bytes do not start with FF D8 FF.`);
  }
  if (ext === '.docx' && !detectedType.includes('DOCX')) {
    securityReasons.push(`Extension is .docx but binary does not contain Word OpenXML structure.`);
  }
  if (ext === '.pptx' && !detectedType.includes('PPTX')) {
    securityReasons.push(`Extension is .pptx but binary does not contain PowerPoint OpenXML structure.`);
  }
  if (ext === '.txt' && detectedType.includes('Script')) {
    securityReasons.push(`Extension is .txt but content is an executable script (${detectedType}).`);
  }

  // Script or executable disguised as document
  if (
    (ext === '.pdf' || ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.docx' || ext === '.pptx' || ext === '.txt') &&
    (isPythonScript || isBashScript || isPhpScript || isJsScript || threatLevel === 'CRITICAL')
  ) {
    securityReasons.push(`EXTENSION SPOOFING DETECTED: File claims to be ${claimedExtClean} but contains executable script/binary code (${detectedType}).`);
    threatLevel = 'CRITICAL';
  }

  // Final Decision
  if (securityReasons.length === 0 && threatLevel === 'SAFE') {
    isValid = true;
  }

  const verdict = isValid ? 'ACCEPTED' : 'REJECTED';
  const recommendation = isValid
    ? 'File passes content-inspection and magic-byte verification. Stored safely with randomized UUID.'
    : `Rejected immediately: Extension spoofing or forbidden file format. Never execute or save as trusted content.`;

  return {
    isValid,
    verdict,
    claimedExtension: claimedExtClean || 'NONE',
    claimedMime: clientMimeType || 'application/octet-stream',
    detectedType,
    detectedMime,
    magicBytesHex,
    magicBytesAscii,
    expectedSignature,
    threatLevel,
    securityReasons,
    recommendation,
  };
}
