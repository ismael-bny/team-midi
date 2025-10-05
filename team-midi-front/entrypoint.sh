#!/bin/sh
set -e
# remplace ${BACKEND_URL} et ${PORT} dans le template
envsubst '${BACKEND_URL} ${PORT}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
