// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { extractFromPDF, extractFromDOCX, OCR_WARNING, validateUpload } from './extract.js';
import { deflateRawSync } from 'node:zlib';

function buildMinimalPDFWithText(text: string): Buffer {
  const stream = `BT (${text}) Tj ET`;
  const pdf = `%PDF-1.4\n1 0 obj<<>>endobj\n2 0 obj<<>>endobj\n3 0 obj<<>>stream\n${stream}\nendstream\nendobj\ntrailer<<>>\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

function buildScannedLikePDF(): Buffer {
  const pdf = `%PDF-1.4\n1 0 obj<<>>endobj\n2 0 obj<<>>endobj\ntrailer<<>>\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

// Minimal ZIP containing word/document.xml with deflated payload
function buildDocxWithParagraph(text: string): Buffer {
  const filename = 'word/document.xml';
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`;
  const comp = deflateRawSync(Buffer.from(xml, 'utf8'));
  const localHeaderSig = Buffer.from([0x50,0x4b,0x03,0x04]);
  const version = Buffer.from([20,0,0,0]);
  const method = Buffer.from([8,0]);
  const dosTime = Buffer.alloc(2); const dosDate = Buffer.alloc(2); // zeros
  const crc = Buffer.alloc(4); // not validated by our reader
  const compSize = Buffer.alloc(4); compSize.writeUInt32LE(comp.length);
  const uncompSize = Buffer.alloc(4); uncompSize.writeUInt32LE(Buffer.byteLength(xml));
  const nameBytes = Buffer.from(filename, 'utf8');
  const nameLen = Buffer.alloc(2); nameLen.writeUInt16LE(nameBytes.length);
  const extraLen = Buffer.alloc(2); extraLen.writeUInt16LE(0);
  const localHeader = Buffer.concat([
    localHeaderSig, version, method, dosTime, dosDate, crc, compSize, uncompSize, nameLen, extraLen, nameBytes,
  ]);
  const localOffset = 0;
  const fileData = Buffer.concat([localHeader, comp]);

  const centralSig = Buffer.from([0x50,0x4b,0x01,0x02]);
  const verMade = Buffer.from([20,0]);
  const verNeed = Buffer.from([20,0]);
  const flag = Buffer.from([0,0]);
  const method2 = method;
  const time2 = dosTime; const date2 = dosDate;
  const crc2 = crc; const comp2 = compSize; const uncomp2 = uncompSize;
  const nameLen2 = nameLen; const extraLen2 = extraLen; const commentLen = Buffer.from([0,0]);
  const diskStart = Buffer.from([0,0]); const intAttr = Buffer.from([0,0]); const extAttr = Buffer.alloc(4);
  const relOffset = Buffer.alloc(4); relOffset.writeUInt32LE(localOffset);
  const central = Buffer.concat([
    centralSig, verMade, verNeed, flag, method2, time2, date2, crc2, comp2, uncomp2,
    nameLen2, extraLen2, commentLen, diskStart, intAttr, extAttr, relOffset, nameBytes,
  ]);

  const eocdSig = Buffer.from([0x50,0x4b,0x05,0x06]);
  const diskNum = Buffer.from([0,0]); const cdStartDisk = Buffer.from([0,0]);
  const entriesOnDisk = Buffer.from([1,0]); const totalEntries = Buffer.from([1,0]);
  const cdSize = Buffer.alloc(4); cdSize.writeUInt32LE(central.length);
  const cdOffset = Buffer.alloc(4); cdOffset.writeUInt32LE(fileData.length);
  const commentLen2 = Buffer.from([0,0]);
  const eocd = Buffer.concat([eocdSig, diskNum, cdStartDisk, entriesOnDisk, totalEntries, cdSize, cdOffset, commentLen2]);

  return Buffer.concat([fileData, central, eocd]);
}

describe('extract (backend)', () => {
  it('validates type and size', () => {
    expect(validateUpload('x.pdf', 'application/pdf', 100).ok).toBe(true);
    expect(validateUpload('x.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 100).ok).toBe(true);
    expect(validateUpload('x.txt', 'text/plain', 100).ok).toBe(false);
    expect(validateUpload('x.pdf', 'application/pdf', 6 * 1024 * 1024).ok).toBe(false);
  });

  it('extracts text from simple PDF', async () => {
    const buf = buildMinimalPDFWithText('Hello World');
    const { text, warnings } = await extractFromPDF(buf as any);
    expect(text).toMatch(/Hello World/);
    expect(Array.isArray(warnings)).toBe(true);
  });

  it('emits OCR warning for scanned-like PDF', async () => {
    const buf = buildScannedLikePDF();
    const { text, warnings } = await extractFromPDF(buf as any);
    expect(text).toBe('');
    expect(warnings).toContain(OCR_WARNING);
  });

  it('extracts text from minimal DOCX', async () => {
    const buf = buildDocxWithParagraph('Sample Text');
    const { text } = await extractFromDOCX(buf as any);
    expect(text).toMatch(/Sample Text/);
  });
});
