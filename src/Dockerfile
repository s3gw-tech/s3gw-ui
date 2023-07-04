FROM node:lts-alpine as ui-frontend-builder

COPY frontend /srv/frontend
WORKDIR /srv/frontend
RUN npm ci \
 && npm run build:prod

FROM python:alpine3.18 as s3gw-ui
LABEL Name=s3gw-ui

COPY --from=ui-frontend-builder /srv/frontend/dist/s3gw-ui /srv/frontend/dist/s3gw-ui
COPY backend /srv/backend
COPY requirements.txt /srv
COPY s3gw_ui_backend.py /srv
WORKDIR /srv
RUN pip install --no-cache-dir -r requirements.txt
STOPSIGNAL SIGINT
EXPOSE 8080
ENTRYPOINT [ "python", "./s3gw_ui_backend.py" ]
