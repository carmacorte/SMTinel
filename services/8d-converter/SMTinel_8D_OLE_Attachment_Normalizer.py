#!/usr/bin/env python3
"""Normalize embedded OLE attachments in SMTinel 8D HTML.

PowerPoint often stores inserted files as ppt/embeddings/oleObject*.bin.
That container name is useless to users, so this pass tries to recover the
actual payload from the OLE Package stream, infer its extension, restore a
safe filename, MIME type and Excel preview sheets when possible.

The original PowerPoint is not modified. The exported HTML still remains
self-contained; only the attachment manifest and attachment bytes are refined.
"""
from __future__ import annotations

import base64
import datetime as _dt
import io
import json
import mimetypes
import re
import struct
import sys
import zipfile
from pathlib import Path

try:
    import olefile  # type: ignore
except Exception:  # pragma: no cover - handled at runtime inside Docker
    olefile = None

try:
    import openpyxl  # type: ignore
except Exception:  # pragma: no cover
    openpyxl = None

if len(sys.argv) < 2:
    print('Usage: python SMTinel_8D_OLE_Attachment_Normalizer.py report.html')
    raise SystemExit(2)

path = Path(sys.argv[1]).resolve()
text = path.read_text(encoding='utf-8')
match = re.search(r'(<script\s+id="embedded-data"\s+type="application/json">)(.*?)(</script>)', text, flags=re.S)
if not match:
    raise RuntimeError('embedded-data not found')

data = json.loads(match.group(2))
attachments = data.get('attachments') or []

MIME_BY_EXT = {
    '.pdf': 'application/pdf',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xlsm': 'application/vnd.ms-excel.sheet.macroEnabled.12',
    '.xls': 'application/vnd.ms-excel',
    '.csv': 'text/csv',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.eml': 'message/rfc822',
    '.msg': 'application/vnd.ms-outlook',
    '.txt': 'text/plain',
    '.zip': 'application/zip',
}

LABEL_BY_EXT = {
    '.pdf': 'PDF',
    '.xlsx': 'Excel',
    '.xlsm': 'Excel',
    '.xls': 'Excel',
    '.csv': 'CSV',
    '.docx': 'Word',
    '.doc': 'Word',
    '.pptx': 'PowerPoint',
    '.ppt': 'PowerPoint',
    '.eml': 'Email',
    '.msg': 'Outlook mail',
    '.txt': 'Text',
    '.zip': 'ZIP',
}

SAFE_CHARS = re.compile(r'[^A-Za-z0-9._()\- ]+')
FILENAME_RE = re.compile(r'[^\x00\\/:*?"<>|\r\n]{1,120}\.(?:xlsx|xlsm|xls|csv|pdf|docx|doc|pptx|ppt|eml|msg|txt|zip)', re.I)


def safe_name(name: str, fallback: str) -> str:
    name = (name or '').strip().replace('\\', '/').split('/')[-1]
    name = SAFE_CHARS.sub('_', name).strip(' ._')
    return name or fallback


def trim_payload(payload: bytes, ext: str | None) -> bytes:
    if ext == '.pdf':
        eof = payload.rfind(b'%%EOF')
        if eof > 0:
            return payload[:eof + 5]
    return payload


def infer_payload(data_bytes: bytes) -> tuple[str | None, str | None]:
    if data_bytes.startswith(b'%PDF-'):
        return '.pdf', 'PDF'
    if data_bytes.startswith(b'PK\x03\x04') or data_bytes.startswith(b'PK\x05\x06') or data_bytes.startswith(b'PK\x07\x08'):
        try:
            with zipfile.ZipFile(io.BytesIO(data_bytes)) as zf:
                names = set(zf.namelist())
            if 'xl/workbook.xml' in names:
                return '.xlsx', 'Excel'
            if 'word/document.xml' in names:
                return '.docx', 'Word'
            if 'ppt/presentation.xml' in names:
                return '.pptx', 'PowerPoint'
        except Exception:
            return '.zip', 'ZIP'
        return '.zip', 'ZIP'
    if data_bytes.startswith(b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'):
        return '.xls', 'Excel'
    return None, None


def extract_filename(blob: bytes, ext: str | None) -> str | None:
    candidates: list[str] = []
    for decoder in ('utf-8', 'cp1252', 'latin-1'):
        try:
            s = blob.decode(decoder, errors='ignore')
            candidates.extend(m.group(0).strip() for m in FILENAME_RE.finditer(s))
        except Exception:
            pass
    try:
        s16 = blob.decode('utf-16le', errors='ignore')
        candidates.extend(m.group(0).strip() for m in FILENAME_RE.finditer(s16))
    except Exception:
        pass
    if ext:
        by_ext = [c for c in candidates if c.lower().endswith(ext.lower())]
        if by_ext:
            return by_ext[-1]
    return candidates[-1] if candidates else None


def carve_known_payload(blob: bytes, header: bytes | None = None) -> tuple[bytes, str | None, str | None, str | None] | None:
    """Find a recognizable document payload inside an OLE blob or stream.

    Some Acrobat/Package insertions leave the real PDF or OOXML file buried
    inside a stream, not neatly at byte zero. So we scan the whole thing. Yes,
    it is as charming as it sounds.
    """
    header = header or blob[:8192]
    for magic in (b'%PDF-', b'PK\x03\x04', b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'):
        start = blob.find(magic)
        while start >= 0:
            payload = blob[start:]
            ext, label = infer_payload(payload)
            if ext:
                payload = trim_payload(payload, ext)
                fname = extract_filename(header, ext) or extract_filename(blob[max(0, start - 4096):start + 4096], ext)
                return payload, fname, ext, label
            start = blob.find(magic, start + 1)
    return None


def stream_name(parts: list[str]) -> str:
    return '/'.join(str(p) for p in parts)


def extract_from_ole(data_bytes: bytes) -> tuple[bytes, str | None, str | None, str | None]:
    """Return payload, filename, extension and label.

    For real OLE Package objects, the useful file is normally inside the
    \x01Ole10Native stream. When exact parsing is unclear, scan for a plausible
    native-size prefix and known file magic. This is defensive because PowerPoint
    versions write slightly different package wrappers.
    """
    ext, label = infer_payload(data_bytes)
    if ext:
        return trim_payload(data_bytes, ext), extract_filename(data_bytes[:8192], ext), ext, label

    carved = carve_known_payload(data_bytes)
    if carved:
        return carved

    if not (olefile and olefile.isOleFile(io.BytesIO(data_bytes))):
        return data_bytes, None, None, None

    ole = olefile.OleFileIO(io.BytesIO(data_bytes))
    try:
        streams = ole.listdir(streams=True, storages=False)
        preferred = [p for p in streams if 'Ole10Native' in stream_name(p)]
        preferred += [p for p in streams if stream_name(p).endswith('Package')]
        preferred += [p for p in streams if stream_name(p).lower().endswith('contents')]
        preferred += streams
        seen: set[str] = set()
        for spath in preferred:
            sname = stream_name(spath)
            if sname in seen:
                continue
            seen.add(sname)
            try:
                native = ole.openstream(spath).read()
            except Exception:
                continue
            header = native[:8192]
            guessed_name = extract_filename(header, None)

            # Search size-prefixed native payloads used by Ole10Native.
            limit = max(0, len(native) - 4)
            for pos in range(limit):
                size = struct.unpack_from('<I', native, pos)[0]
                if size <= 8 or size > len(native) - pos - 4:
                    continue
                payload = native[pos + 4:pos + 4 + size]
                ext, label = infer_payload(payload)
                if ext:
                    fname = extract_filename(header, ext) or guessed_name
                    return trim_payload(payload, ext), fname, ext, label

            carved = carve_known_payload(native, header)
            if carved:
                payload, fname, ext, label = carved
                return payload, fname or guessed_name, ext, label
    finally:
        ole.close()

    return data_bytes, None, None, None


def parse_xlsx_sheets(payload: bytes) -> list[dict]:
    if not openpyxl:
        return []
    try:
        wb = openpyxl.load_workbook(io.BytesIO(payload), data_only=True, read_only=True)
        sheets = []
        for ws in wb.worksheets:
            rows = []
            for row in ws.iter_rows():
                out = []
                for cell in row:
                    v = cell.value
                    if v is None:
                        out.append('')
                    elif isinstance(v, (_dt.datetime, _dt.date)):
                        out.append(v.strftime('%Y-%m-%d'))
                    elif isinstance(v, (int, float)) and '%' in str(cell.number_format):
                        out.append(f'{v * 100:.2f}%')
                    else:
                        out.append(str(v))
                rows.append(out)
            sheets.append({'name': ws.title, 'rows': rows, 'count': max(len(rows) - 1, 0)})
        wb.close()
        return sheets
    except Exception:
        return []

changed = 0
unresolved = 0
for idx, att in enumerate(attachments, 1):
    name = str(att.get('name') or '')
    try:
        raw = base64.b64decode(att.get('b64') or '', validate=False)
    except Exception:
        continue
    current_ext = Path(name).suffix.lower()
    is_opaque_ole = current_ext == '.bin' or name.lower().startswith('oleobject') or att.get('mime') == 'application/octet-stream'
    if not is_opaque_ole:
        continue

    payload, recovered_name, ext, label = extract_from_ole(raw)
    slides = att.get('slides') or []
    slide_num = (slides[0].get('index', 0) + 1) if slides and isinstance(slides[0], dict) else idx
    if not ext:
        # Last resort: avoid Office's oleObject*.bin label while staying honest
        # about the bytes. Do not fake a PDF extension if the PDF payload was not
        # recovered. Humans hate .bin; auditors hate lying. Both are annoying.
        ext = '.bin'
        label = 'Embedded file'
        recovered_name = f'embedded_evidence_slide_{slide_num:02d}.bin'
        unresolved += 1
    else:
        recovered_name = recovered_name or f'evidence_slide_{slide_num:02d}{ext}'

    fallback = f'evidence_{idx:02d}{ext}'
    final_name = safe_name(recovered_name or '', fallback)
    if not Path(final_name).suffix and ext:
        final_name += ext

    att['containerName'] = name
    att['name'] = final_name
    att['type'] = label or LABEL_BY_EXT.get(ext, 'Embedded file')
    att['mime'] = MIME_BY_EXT.get(ext, mimetypes.guess_type(final_name)[0] or 'application/octet-stream')
    att['size'] = len(payload)
    att['b64'] = base64.b64encode(payload).decode('ascii')
    if ext in ('.xlsx', '.xlsm'):
        sheets = parse_xlsx_sheets(payload)
        if sheets:
            att['sheets'] = sheets
            att.pop('parse_warning', None)
    else:
        att['sheets'] = att.get('sheets') or []
    changed += 1

if changed:
    new_json = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    text = text[:match.start(2)] + new_json + text[match.end(2):]
    path.write_text(text, encoding='utf-8')

print(f'OLE attachment normalization applied: {changed} attachment(s) updated in {path}; unresolved={unresolved}')
