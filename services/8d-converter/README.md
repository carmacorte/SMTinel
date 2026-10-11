# SMTinel 8D Interactive Converter · Railway

Servicio independiente para convertir PPT/PPTX en un **HTML autónomo**, con representación visual de diapositivas, adjuntos incrustados, índice, favicon y lectura sin JavaScript en iPhone. El servicio NO añade presentaciones ni reportes al repositorio o a una base de datos.

## Instalación en Railway

1. Conectar `carmacorte/SMTinel`, rama `main` después de aprobar la PR.
2. En el servicio abrir **Settings → Source → Root Directory** y definir `/services/8d-converter`.
3. En **Build** seleccionar **Dockerfile** (ruta `Dockerfile` relativa a la carpeta raíz).
4. Railway proporciona `PORT` automáticamente; Docker escucha en `${PORT:-8765}`.
5. Probar `GET /api/8d/health`. **La respuesta `ready:false` es intencional** mientras no se habilite autenticación.
6. Configurar `SMTINEL_ALLOWED_ORIGINS=https://smtinel.com,https://www.smtinel.com`, `SMTINEL_SUPABASE_URL`, `SMTINEL_SUPABASE_ANON_KEY`, `SMTINEL_AUTH_MODE=supabase` y finalmente `SMTINEL_CONVERTER_ENABLED=1`.
7. Vincular `api.smtinel.com` como dominio personalizado en Railway, después agregar los DNS que Railway indique en GoDaddy.
8. La UI `assets/smtinel-8d-railway-bridge-v2025.js` se monta solamente al abrir Export Center, obtiene metadatos públicos de `/api/8d/auth-config`, autentica bajo demanda y envía `Authorization: Bearer <token temporal>`. El index no reactiva el cliente Supabase ni carga datos operativos a un servidor. Mientras la API esté deshabilitada, el widget muestra ese estado sin permitir uploads.

Las variables `SMTINEL_SUPABASE_URL` y `SMTINEL_SUPABASE_ANON_KEY` son valores de cliente/publicables. **Nunca** colocar `service_role` en el navegador, en GitHub ni en este proyecto.

## Comportamiento de seguridad

- `SMTINEL_CONVERTER_ENABLED=0` por defecto; todo POST a `/convert` se rechaza con HTTP 503.
- Una vez habilitado, exige un token real verificado por Supabase (`/auth/v1/user`) en cada solicitud. CORS limita orígenes de navegador, pero **no reemplaza autenticación**.
- `.ppt` y `.pptx`, máximo 60 MB comprimidos, 100 diapositivas, 750 MB descomprimidos, HTML máximo 100 MB, una conversión a la vez, límite de solicitudes por IP.
- Conversión mediante `TemporaryDirectory`; PPTX, PDF, adjuntos extraídos y salida HTML se borran al terminar la solicitud, incluso ante fallo. No hay almacenamiento duradero ni logs del contenido, aunque el servidor y la infraestructura pueden generar metadatos de acceso.
- Ejecuta LibreOffice como usuario sin privilegios y con perfil temporal. Antes de habilitar documentos corporativos en un proveedor externo, obtener autorización de alojamiento.
- Para mayor seguridad en producción: configurar límites de CPU/memoria, proxy con límite de cuerpo, cuotas por usuario, protección antivirus, política de retención de logs, y aislamiento de conversores.

## Test local

Para pruebas sin cuentas, únicamente en tu PC:

```sh
export SMTINEL_CONVERTER_ENABLED=1 SMTINEL_AUTH_MODE=local
python -m uvicorn serve_8d:app --host 127.0.0.1 --port 8765
curl http://127.0.0.1:8765/api/8d/health
curl -F 'file=@reporte.pptx' http://127.0.0.1:8765/api/8d/convert -o reporte.html
```

## Pendiente después del despliegue

El bridge de Export Center y el endpoint público `/api/8d/auth-config` se incluyen en una rama para revisión. Para usarlo, primero configurar las variables de autenticación en Railway y autorizar el alojamiento de documentos corporativos. Mantener `SMTINEL_CONVERTER_ENABLED=0` hasta entonces. No se admiten claves `service_role`, y no se guardan tokens en el navegador.

## Acceso independiente desde Export Center

El bridge consulta Railway únicamente al abrir Export Center, nunca al entrar a Yield Flow o Board Impact. Ofrece inicio de sesión de correo y contraseña mediante Supabase Auth sin SDK, cookies ni persistencia de tokens; alternativamente, el modo `token` admite una clave temporal mantenida solo en memoria. Se recomienda Supabase Auth con cuentas y controles corporativos antes de habilitar el servicio. El archivo PPT/PPTX se envía únicamente después de autorizar.

En Railway, comprobar `SMTINEL_AUTH_MODE=supabase`, `SMTINEL_SUPABASE_URL`, `SMTINEL_SUPABASE_ANON_KEY`, `SMTINEL_ALLOWED_ORIGINS=https://smtinel.com,https://www.smtinel.com`. Solo después activar `SMTINEL_CONVERTER_ENABLED=1` y validar un PPTX autorizado.
