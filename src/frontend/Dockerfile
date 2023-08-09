FROM node:lts-alpine as builder

COPY . /srv/app
WORKDIR /srv/app
RUN npm ci \
 && npm run build:prod

FROM node:lts-alpine

ARG QUAY_EXPIRATION=Never
LABEL quay.expires-after=${QUAY_EXPIRATION}

COPY --from=builder /srv/app/dist/s3gw-ui /app
COPY entrypoint.sh /usr/bin/entrypoint.sh

RUN apk --no-cache add gettext \
 && npm install -g http-server \
 && chmod +x /usr/bin/entrypoint.sh

WORKDIR /app
STOPSIGNAL SIGINT
EXPOSE 8080
ENTRYPOINT [ "/usr/bin/entrypoint.sh" ]
