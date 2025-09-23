// Robust extraction using pdf-parse (PDF) and mammoth (DOCX)
// Work around pdf-parse root module executing test code at import time by importing the library file directly.
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import * as mammoth from 'mammoth';

const OCR_WARNING = "We couldn’t read this file because it’s a scanned PDF. OCR isn’t supported yet. Please paste your resume text instead.";

export function isPDF(name = '', contentType = '') {
  return /\.pdf$/i.test(name) || /application\/pdf/i.test(contentType);
}

export function isDOCX(name = '', contentType = '') {
  return /\.docx$/i.test(name) || /application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/i.test(contentType);
}

function normalizeWhitespace(text) {
  return String(text || '')
    .replace(/\u00A0/g, ' ')
    .replace(/[\t\r]+/g, ' ')
    .replace(/ +/g, ' ')
    .replace(/\s*\n\s*\n\s*/g, '\n\n')
    .trim();
}

function stripRepeatedHeaders(text) {
  const lines = String(text || '').split(/\n/);
  if (lines.length < 10) return text;
  const counts = new Map();
  for (const l of lines) counts.set(l, (counts.get(l) || 0) + 1);
  const header = lines[0];
  const footer = lines[lines.length - 1];
  const out = lines.slice();
  if (header && counts.get(header) >= 3) {
    for (let i = out.length - 1; i >= 0; i--) if (out[i] === header) out.splice(i, 1);
  }
  if (footer && counts.get(footer) >= 3) {
    for (let i = out.length - 1; i >= 0; i--) if (out[i] === footer) out.splice(i, 1);
  }
  return out.join('\n');
}

export async function extractFromPDF(buffer) {
  const warnings = [];
  let text = '';
  try {
    const result = await pdfParse(buffer);
    text = String(result?.text || '');
  } catch {
    text = '';
  }
  const normalized = normalizeWhitespace(stripRepeatedHeaders(text)).replace(/\n{3,}/g, '\n\n');
  const finalText = normalized.trim();
  if (!finalText) warnings.push(OCR_WARNING);
  return { text: finalText, warnings, meta: { chars: finalText.length, pages: undefined } };
}

export async function extractFromDOCX(buffer) {
  const warnings = [];
  let text = '';
  try {
    const result = await mammoth.extractRawText({ buffer });
    text = String(result?.value || result?.text || '');
  } catch {
    text = '';
  }
  const normalized = normalizeWhitespace(text).replace(/\n{3,}/g, '\n\n');
  const finalText = normalized.trim();
  return { text: finalText, warnings, meta: { chars: finalText.length } };
}

export async function extractResumeFromBuffer(buffer, filename, contentType) {
  if (isPDF(filename, contentType)) {
    return await extractFromPDF(buffer);
  }
  if (isDOCX(filename, contentType)) {
    return await extractFromDOCX(buffer);
  }
  throw new Error('Unsupported file type');
}

export { OCR_WARNING };

export function validateUpload(name, contentType, sizeBytes) {
  const allowed = isPDF(name, contentType) || isDOCX(name, contentType);
  if (!allowed) return { ok: false, error: 'Unsupported file type. Only PDF and DOCX are allowed.' };
  if (sizeBytes > 5 * 1024 * 1024) return { ok: false, error: 'File too large (max 5 MB).' };
  return { ok: true };
}
