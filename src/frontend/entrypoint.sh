#!/bin/sh
envsubst < /app/assets/rgw_service.config.json.sample \
  > /app/assets/rgw_service.config.json
exec http-server /app/
