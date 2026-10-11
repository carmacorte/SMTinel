"""SMTinel 8D Interactive: private same-origin conversion service.

Only start on 127.0.0.1 unless protected by an authenticated HTTPS reverse proxy.
It renders slides via LibreOffice and preserves embedded OOXML attachments.
"""
from __future__ import annotations

import os
import re
import sys
import io
import time
import zipfile
import shutil
import tempfile
import subprocess
import threading
import collections
import json
import hmac
import urllib.request
import urllib.error
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import Response, FileResponse
from fastapi.middleware.cors import CORSMiddleware

BASE = Path(__file__).resolve().parent
LIMIT = 60 * 1024 * 1024
MAX_HTML = 100 * 1024 * 1024
TIMEOUT_S = 300
_LOCK = threading.BoundedSemaphore(value=1)
_RATE = collections.defaultdict(list)
_APP_STARTED = time.time()

app = FastAPI(title='SMTinel 8D Interactive Conversion', docs_url=None, redoc_url=None, openapi_url=None)
# Browser CORS controls where the JavaScript UI can send requests; it is NOT authentication.
ALLOWED_ORIGINS = [v.strip().rstrip('/') for v in os.getenv('SMTINEL_ALLOWED_ORIGINS', 'https://smtinel.com,https://www.smtinel.com').split(',') if v.strip()]
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_methods=['GET','POST','OPTIONS'], allow_headers=['authorization','content-type'], allow_credentials=False)
SERVICE_ENABLED = os.getenv('SMTINEL_CONVERTER_ENABLED','0').strip() == '1'
AUTH_MODE = os.getenv('SMTINEL_AUTH_MODE','supabase').strip().lower()


def _is_public_supabase_key(key: str) -> bool:
    """Fail closed: never publish a service_role or sb_secret credential."""
    if key.startswith('sb_publishable_'):
        return True
    if not key or key.startswith('sb_secret_'):
        return False
    try:
        import base64
        pieces = key.split('.')
        if len(pieces) != 3:
            return False
        payload = json.loads(base64.urlsafe_b64decode(pieces[1] + '=' * (-len(pieces[1]) % 4)))
        return payload.get('role') == 'anon'
    except (ValueError, UnicodeError, TypeError, KeyError):
        return False


def _authorize(request: Request) -> None:
    if not SERVICE_ENABLED:
        raise HTTPException(status_code=503, detail='Servicio de conversion deshabilitado hasta configurar acceso autorizado.')
    auth = request.headers.get('authorization','')
    token = auth.split(' ',1)[1].strip() if auth.lower().startswith('bearer ') else ''
    if AUTH_MODE == 'local':
        if os.getenv('RAILWAY_ENVIRONMENT') or (request.client and request.client.host not in ('127.0.0.1','::1')):
            raise HTTPException(status_code=403, detail='Modo local no permitido desde red.')
        return
    if not token:
        raise HTTPException(status_code=401, detail='Inicia sesion en SMTinel antes de convertir.')
    if AUTH_MODE == 'token':
        secret = os.getenv('SMTINEL_CONVERTER_SECRET','')
        if len(secret)<32 or not hmac.compare_digest(token, secret):
            raise HTTPException(status_code=401, detail='Token no valido.')
        return
    if AUTH_MODE != 'supabase':
        raise HTTPException(status_code=503, detail='Autenticacion del convertidor sin configurar.')
    url = os.getenv('SMTINEL_SUPABASE_URL','').rstrip('/')
    anon = os.getenv('SMTINEL_SUPABASE_ANON_KEY','')
    allowed_emails = {v.strip().lower() for v in os.getenv('SMTINEL_8D_ALLOWED_EMAILS', '').split(',') if v.strip()}
    if not (url.startswith('https://') and _is_public_supabase_key(anon) and allowed_emails):
        raise HTTPException(status_code=503, detail='Validacion Supabase pendiente.')
    # Supabase validates the access token; the public anon key is NOT a service_role key.
    req = urllib.request.Request(url+'/auth/v1/user', headers={'apikey':anon, 'Authorization':'Bearer '+token})
    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            user = json.loads(response.read(65536))
        if not user.get('id'):
            raise HTTPException(status_code=401, detail='Sesion no valida.')
        if str(user.get('email') or '').strip().lower() not in allowed_emails:
            raise HTTPException(status_code=403, detail='Usuario sin permiso para el convertidor 8D.')
    except (urllib.error.HTTPError,urllib.error.URLError,TimeoutError,ValueError) as exc:
        raise HTTPException(status_code=401, detail='No se pudo verificar la sesion.') from exc


def _allow_origin(request: Request) -> None:
    origin = request.headers.get('origin','').rstrip('/')
    if origin and origin not in ALLOWED_ORIGINS:
        raise HTTPException(status_code=403,detail='Origen no autorizado.')


def _validate_pptx(path: Path) -> None:
    if not zipfile.is_zipfile(path):
        raise HTTPException(415,'Archivo PPTX inválido.')
    try:
        with zipfile.ZipFile(path) as z:
            entries=z.infolist()
            if len(entries)>10000:
                raise HTTPException(413,'Demasiados objetos dentro del PPTX.')
            if not {'ppt/presentation.xml','[Content_Types].xml'}.issubset(set(z.namelist())):
                raise HTTPException(415,'El archivo no tiene una estructura PowerPoint válida.')
            if sum(bool(re.fullmatch(r'ppt/slides/slide[0-9]+\.xml',i.filename)) for i in entries)>100:
                raise HTTPException(413,'Se admiten hasta 100 diapositivas por conversión.')
            if sum(max(0,i.file_size) for i in entries)>750*1024*1024:
                raise HTTPException(413,'Presentación descomprimida demasiado grande.')
            for entry in entries:
                if entry.file_size>250*1024*1024:
                    raise HTTPException(413,'Adjunto demasiado grande.')
                if entry.compress_size and entry.file_size/max(1,entry.compress_size)>3000:
                    raise HTTPException(413,'Relación de compresión sospechosa.')
    except (OSError, zipfile.BadZipFile) as exc:
        raise HTTPException(415,'El archivo PPTX está dañado.') from exc


def _check_rate(request:Request)->None:
    ip=(request.client.host if request.client else 'unknown')
    now=time.monotonic()
    hits=[v for v in _RATE[ip] if now-v<60]
    _RATE[ip]=hits
    if len(hits)>=4:
        raise HTTPException(status_code=429,detail='Límite de conversiones. Intenta nuevamente en un minuto.')
    hits.append(now)


@app.get('/api/8d/auth-config')
def auth_config(request: Request):
    """Public metadata for just-in-time 8D login. Never includes private keys."""
    _allow_origin(request)
    mode = AUTH_MODE if AUTH_MODE in ('supabase', 'token') else 'unavailable'
    url = os.getenv('SMTINEL_SUPABASE_URL', '').strip().rstrip('/')
    public_key = os.getenv('SMTINEL_SUPABASE_ANON_KEY', '').strip()
    if mode == 'supabase':
        configured = (url.startswith('https://') and _is_public_supabase_key(public_key)
                      and bool(os.getenv('SMTINEL_8D_ALLOWED_EMAILS', '').strip()))
    elif mode == 'token':
        configured = len(os.getenv('SMTINEL_CONVERTER_SECRET', '')) >= 32
    else:
        configured = False
    response = {
        'mode': mode,
        'configured': configured,
        'requires_auth': True,
        # The anon/publishable key is explicitly designed for client use.
        'supabase_url': url if configured and mode == 'supabase' else '',
        'supabase_anon_key': public_key if configured and mode == 'supabase' else '',
    }
    return Response(content=json.dumps(response), media_type='application/json',
                    headers={'Cache-Control': 'no-store'})


@app.get('/api/8d/health')
def health(request:Request):
    _allow_origin(request)
    # Service switch and LibreOffice availability are independent conditions.
    # Never report that LibreOffice is missing merely because conversion is disabled.
    libreoffice_available = bool(shutil.which('soffice') or shutil.which('libreoffice'))
    ready = SERVICE_ENABLED and libreoffice_available
    status = ('disabled' if not SERVICE_ENABLED else
              'libreoffice_missing' if not libreoffice_available else 'ready')
    return {
        'ready': ready,
        'status': status,
        'converter_enabled': SERVICE_ENABLED,
        'libreoffice_available': libreoffice_available,
        'formats': ['ppt', 'pptx'],
        'engine': 'SMTinel 8D Interactive V20.25.1 Railway',
        'requires_auth': True,
    }


@app.post('/api/8d/convert')
def convert(request:Request, file: UploadFile=File(...)):
    _allow_origin(request)
    _authorize(request)
    _check_rate(request)
    name=Path(file.filename or '').name
    ext=Path(name).suffix.lower()
    if ext not in ('.ppt','.pptx'):
        raise HTTPException(415,'Formato no admitido. Usa .ppt o .pptx.')
    if not _LOCK.acquire(blocking=False):
        raise HTTPException(429,'Otra conversión está en curso. Intenta nuevamente en unos segundos.')
    try:
        with tempfile.TemporaryDirectory(prefix='smtinel_8d_') as td:
            work=Path(td)
            safe=re.sub(r'[^A-Za-z0-9._-]+','_',Path(name).stem)[:88].strip('._-') or 'Presentation'
            src=work/(safe+ext)
            count=0
            with src.open('wb') as output:
                while chunk:=file.file.read(1024*1024):
                    count+=len(chunk)
                    if count>LIMIT:
                        raise HTTPException(413,'Archivo superior al límite de 60 MB.')
                    output.write(chunk)
            if not count:
                raise HTTPException(422,'No se recibió ningún archivo.')
            if ext=='.pptx':
                _validate_pptx(src)
            else:
                with src.open('rb') as fh:
                    if fh.read(8)!=b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1':
                        raise HTTPException(415,'El archivo .ppt no corresponde al formato binario de PowerPoint.')
                lo=shutil.which('soffice') or shutil.which('libreoffice')
                if not lo:
                    raise HTTPException(503,'El servicio necesita LibreOffice para convertir .ppt.')
                converted=work/'converted';converted.mkdir()
                profile=work/'lo-profile-ppt'
                cmd=[lo,'-env:UserInstallation='+profile.as_uri(),'--headless','--convert-to','pptx','--outdir',str(converted),str(src)]
                try:
                    subprocess.run(cmd,capture_output=True,timeout=120,check=True)
                except (subprocess.CalledProcessError,subprocess.TimeoutExpired) as exc:
                    raise HTTPException(422,'No se pudo interpretar la presentación .ppt.') from exc
                new_src=converted/(src.stem+'.pptx')
                if not new_src.exists():
                    raise HTTPException(422,'No se pudo convertir el formato PPT antiguo.')
                _validate_pptx(new_src)
                src=new_src
            result=work/'output.html'
            cmd=[sys.executable,str(BASE/'Convertir_PPTX_a_HTML_iOS.py'),str(src),str(result)]
            try:
                proc=subprocess.run(cmd,capture_output=True,text=True,timeout=TIMEOUT_S,check=False,cwd=str(work))
            except subprocess.TimeoutExpired as exc:
                raise HTTPException(504,'Se agotó el tiempo de conversión del 8D.') from exc
            if proc.returncode or not result.is_file():
                print('8D CONVERSION ERROR',proc.stdout[-1500:],proc.stderr[-2500:],file=sys.stderr)
                raise HTTPException(422,'No fue posible renderizar esta presentación. Revisa su compatibilidad y fuentes.')
            if result.stat().st_size>MAX_HTML:
                raise HTTPException(413,'El HTML final supera 100 MB. Usa un paquete web ZIP.')
            payload=result.read_bytes()
            if b'<!DOCTYPE html>' not in payload[:200] and b'<!doctype html>' not in payload[:200]:
                raise HTTPException(422,'El motor generó un HTML incompleto.')
            filename=f'SMTinel_8D_Interactive_{safe}.html'
            headers={
               'Content-Disposition': 'attachment; filename="'+filename+'"',
               'Cache-Control':'private, no-store',
               'X-Content-Type-Options':'nosniff',
               'X-SMTinel-Slides':str(payload.count(b'class="sf-slide"')),
            }
            return Response(content=payload,media_type='text/html; charset=utf-8',headers=headers)
    finally:
        try:file.file.close()
        except Exception:pass
        _LOCK.release()


@app.get('/')
def root():
    # Development convenience. Production website already serves index.html.
    here=BASE/'index.html'
    if here.is_file():return FileResponse(here,media_type='text/html')
    return {'service':'SMTinel 8D', 'health':'/api/8d/health'}
