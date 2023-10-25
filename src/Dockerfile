FROM registry.suse.com/bci/nodejs:18 as ui-frontend-builder

COPY frontend /srv/frontend
WORKDIR /srv/frontend
RUN npm ci && npm run build:prod

FROM registry.suse.com/bci/python:3.11 as s3gw-ui
ARG QUAY_EXPIRATION=Never

LABEL Name=s3gw-ui
LABEL quay.expires-after=${QUAY_EXPIRATION}

COPY --from=ui-frontend-builder /srv/frontend/dist/s3gw-ui /srv/frontend/dist/s3gw-ui
COPY backend /srv/backend
COPY requirements.txt /srv
COPY s3gw_ui_backend.py /srv

WORKDIR /srv
RUN pip install --no-cache-dir -r requirements.txt \
 && rm -f requirements.txt

STOPSIGNAL SIGINT
EXPOSE 8080

ENV S3GW_UI_PATH "/"

ENTRYPOINT [ \
    "uvicorn", "--factory", "s3gw_ui_backend:app_factory", \
    "--host", "0.0.0.0", "--port", "8080" \
    ]
