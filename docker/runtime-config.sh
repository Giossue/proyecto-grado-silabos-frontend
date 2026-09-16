#!/bin/sh
set -eu

PUBLIC_API_URL="${PUBLIC_API_URL:-}"
case "$PUBLIC_API_URL" in
    ""|http://*|https://*) ;;
    *) echo "PUBLIC_API_URL debe ser una URL HTTP(S) o quedar vacía." >&2; exit 1 ;;
esac
export PUBLIC_API_URL

envsubst '${PUBLIC_API_URL}' \
    < /opt/silabos/config.js.template \
    > /usr/share/nginx/html/config.js
