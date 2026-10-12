#!/usr/bin/env python3
"""Recover simple OLE Package attachments left as oleObject*.bin.

PowerPoint can embed ordinary files as an OLE Package. In those cases the PPTX
contains a Compound File Binary wrapper named oleObject*.bin, while the useful
payload is inside the Ole10Native package data. If olefile is not available, or
if the first normalizer cannot resolve a plain text package, the exported HTML
still shows a useless .bin. Humanity has invented worse, but not by much.

This pass scans unresolved attachment bytes for Ole10Native-style filename and
payload records, then restores the original filename, extension, MIME type and
base64 payload inside the self-contained HTML.
"""
from __future__ import annotations

import base64
import json
import mimetypes
import re
import struct
import sys
from pathlib import Path

if len(sys.argv) < 2:
    print('Usage: python SMTinel_8D_OLE_Package_Recoverer.py report.html')
    raise SystemExit(2)

path = Path(sys.argv[1]).resolve()
text = path.read_text(encoding='utf-8')
match = re.search(r'(<script\s+id="embedded-data"\s+type="application/json">)(.*?)(</script>)', text, flags=re.S)
if not match:
    print('embedded-data not found; OLE package recovery skipped')
    raise SystemExit(0)

data = json.loads(match.group(2))
attachments = data.get('attachments') or []

SAFE_CHARS = re.compile(r'[^A-Za-z0-9._()\- ]+')
FILENAME_RE = re.compile(rb'[^\x00\\/:*?"<>|\r\n]{1,140}\.(?:xlsx|xlsm|xls|csv|pdf|docx|doc|pptx|ppt|eml|msg|txt|zip)', re.I)

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

MAGIC_BY_EXT = [
    (b'%PDF-', '.pdf'),
    (b'PK\x03\x04', '.zip'),
    (b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1', '.ole'),
]


def safe_name(name: str, fallback: str) -> str:
    name = (name or '').strip().replace('\\', '/').split('/')[-1]
    name = SAFE_CHARS.sub('_', name).strip(' ._')
    return name or fallback


def looks_like_cfb(blob: bytes) -> bool:
    return blob.startswith(b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1')


def trim_payload(payload: bytes, ext: str) -> bytes:
    if ext.lower() == '.pdf':
        eof = payload.rfind(b'%%EOF')
        if eof > 0:
            return payload[:eof + 5]
    return payload


def recover_ole10native_package(blob: bytes) -> tuple[str, bytes] | None:
    """Recover (filename, payload) from an OLE Package wrapper.

    Observed layout inside the Package stream:
      DWORD native_size, WORD flags, filename\0, source_path\0,
      metadata/temp_path ... filename\0, DWORD file_size, payload

    PowerPoint is not legally required to be pleasant, so this parser scans for
    plausible file names and validates the payload size before trusting it.
    """
    if not looks_like_cfb(blob):
        return None

    for m in FILENAME_RE.finditer(blob):
        raw_name = m.group(0)
        pos = m.start()
        # NativeDataSize normally starts 6 bytes before filename: DWORD + WORD.
        for native_start in (pos - 6, pos - 4, pos - 8):
            if native_start < 0 or native_start + 4 > len(blob):
                continue
            native_size = struct.unpack_from('<I', blob, native_start)[0]
            if native_size <= 16 or native_size > len(blob) - native_start:
                continue
            native_limit = native_start + 4 + native_size

            positions: list[int] = []
            cursor = pos
            while True:
                hit = blob.find(raw_name, cursor, native_limit)
                if hit < 0:
                    break
                positions.append(hit)
                cursor = hit + 1

            # The last occurrence is normally the temp path filename before the
            # payload size. Earlier ones are only metadata, exactly because one
            # filename was apparently not enough paperwork.
            for name_pos in reversed(positions):
                end_name = name_pos + len(raw_name)
                if end_name >= native_limit or blob[end_name] != 0:
                    continue
                size_pos = end_name + 1
                if size_pos + 4 > native_limit:
                    continue
                file_size = struct.unpack_from('<I', blob, size_pos)[0]
                payload_start = size_pos + 4
                if file_size <= 0 or file_size > native_limit - payload_start:
                    continue
                payload = blob[payload_start:payload_start + file_size]
                # If the filename says PDF/OOXML but the payload starts later,
                # carve by magic inside this native payload. For plain .txt/.eml
                # the payload starts directly at byte zero.
                name = raw_name.decode('latin-1', errors='ignore')
                ext = Path(name).suffix.lower()
                for magic, magic_ext in MAGIC_BY_EXT:
                    offset = payload.find(magic)
                    if offset > 0 and (ext == magic_ext or magic_ext != '.ole'):
                        payload = payload[offset:]
                        if magic_ext != '.zip':
                            ext = magic_ext
                        break
                if ext == '.pdf':
                    payload = trim_payload(payload, ext)
                return name, payload
    return None


def rows_from_text(payload: bytes) -> list[dict]:
    try:
        content = payload.decode('utf-8')
    except UnicodeDecodeError:
        content = payload.decode('latin-1', errors='replace')
    lines = [line.strip() for line in content.splitlines() if line.strip()]
    if not lines:
        return []
    # Give the mobile fallback a simple searchable table for serial-number lists.
    rows = [['Line', 'Value']]
    for i, line in enumerate(lines[:5000], 1):
        rows.append([str(i), line])
    return [{'name': 'Text', 'rows': rows, 'count': len(lines)}]

changed = 0
for idx, att in enumerate(attachments, 1):
    name = str(att.get('name') or '')
    ext = Path(name).suffix.lower()
    opaque = ext == '.bin' or name.lower().startswith('oleobject') or att.get('mime') == 'application/octet-stream'
    if not opaque:
        continue
    try:
        raw = base64.b64decode(att.get('b64') or '', validate=False)
    except Exception:
        continue

    recovered = recover_ole10native_package(raw)
    if not recovered:
        continue

    recovered_name, payload = recovered
    ext = Path(recovered_name).suffix.lower() or '.bin'
    final_name = safe_name(recovered_name, f'evidence_{idx:02d}{ext}')
    if not Path(final_name).suffix:
        final_name += ext

    att['containerName'] = name
    att['name'] = final_name
    att['type'] = LABEL_BY_EXT.get(ext, 'Embedded file')
    att['mime'] = MIME_BY_EXT.get(ext, mimetypes.guess_type(final_name)[0] or 'application/octet-stream')
    att['size'] = len(payload)
    att['b64'] = base64.b64encode(payload).decode('ascii')
    if ext in ('.txt', '.csv'):
        att['sheets'] = rows_from_text(payload)
    elif ext == '.eml':
        # Keep the bytes original. The dedicated mail evidence patch owns rich
        # mail preview logic when it is available.
        att['sheets'] = att.get('sheets') or []
    changed += 1

if changed:
    new_json = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    text = text[:match.start(2)] + new_json + text[match.end(2):]
    path.write_text(text, encoding='utf-8')

print(f'OLE Package recovery applied: {changed} attachment(s) recovered in {path}')
