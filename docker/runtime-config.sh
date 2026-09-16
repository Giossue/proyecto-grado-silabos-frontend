#!/bin/sh
set -eu

PUBLIC_API_URL="${PUBLIC_API_URL:-}"
if [ -z "$PUBLIC_API_URL" ] || ! printf '%s' "$PUBLIC_API_URL" \
    | grep -Eq '^https?://([A-Za-z0-9-]+\.)*[A-Za-z0-9-]+(:[0-9]{1,5})?$'; then
    echo "PUBLIC_API_URL debe ser un origen HTTP(S), sin ruta; por ejemplo https://api.silabos.example.edu.ec." >&2
    exit 1
fi
export PUBLIC_API_URL

envsubst '${PUBLIC_API_URL}' \
    < /opt/silabos/config.js.template \
    > /usr/share/nginx/html/config.js
