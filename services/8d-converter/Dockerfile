FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 HOME=/tmp/smtinel
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    libreoffice-impress libreoffice-core fonts-liberation fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY serve_8d.py Convertir_PPTX_a_HTML_iOS.py SMTinel_PPTX_a_HTML_Converter.py SMTinel_8D_iOS_Progressive_Patch.py SMTinel_8D_OLE_Attachment_Normalizer.py SMTinel_8D_Handoff_English_Theme_Patch.py SMTinel_8D_Final_English_Polish_Patch.py SMTinel_8D_Mail_Evidence_Patch.py SMTinel_8D_Mobile_Excel_Visibility_Patch.py smtinel_favicon.png ./
RUN useradd -m -u 10001 smtinel && mkdir -p /tmp/smtinel && chown -R smtinel:smtinel /tmp/smtinel /app
USER smtinel
EXPOSE 8765
CMD ["sh", "-c", "exec uvicorn serve_8d:app --host 0.0.0.0 --port ${PORT:-8765} --workers 1 --proxy-headers"]
