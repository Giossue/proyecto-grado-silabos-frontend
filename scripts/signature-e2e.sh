#!/usr/bin/env bash
# I-139. Prueba de extremo a extremo de la firma en el navegador:
#   1. crea dos .p12 de prueba con OpenSSL (docente y coordinación);
#   2. pide al backend la posición del sello (SignatureStampLocator);
#   3. firma con el módulo del frontend (src/lib/signature) en Node;
#   4. valida cada paso con IncrementalPdfSignatureVerifier del backend y con pdfsig.
# Uso: scripts/signature-e2e.sh documento.pdf [carpeta-de-salida]
# Variables: BACKEND_DIR (por defecto ../proyecto-grado-silabos-backend), P12_LEGACY=1
# para cifrar el .p12 con 3DES/SHA-1 como muchas CA.
set -euo pipefail

input=$(realpath "${1:?Indique el PDF a firmar}")
work=$(realpath -m "${2:-$(mktemp -d)}")
frontend=$(cd "$(dirname "$0")/.." && pwd)
backend=$(realpath "${BACKEND_DIR:-$frontend/../proyecto-grado-silabos-backend}")
mkdir -p "$work"
legacy=()
[[ "${P12_LEGACY:-0}" == 1 ]] && legacy=(-legacy)

make_p12() { # nombre clave archivo
  openssl req -x509 -newkey rsa:2048 -sha256 -days 30 -nodes -subj "/C=EC/O=ENTIDAD DE PRUEBA/CN=$1" \
    -keyout "$work/$3.key" -out "$work/$3.crt" 2>/dev/null
  openssl pkcs12 -export "${legacy[@]}" -inkey "$work/$3.key" -in "$work/$3.crt" -passout "pass:$2" -out "$work/$3.p12"
  rm -f "$work/$3.key"
}
make_p12 "DOCENTE DE PRUEBA" "clave-docente" docente
make_p12 "COORDINACION DE PRUEBA" "clave-coordinacion" coordinacion

cat >"$work/backend.php" <<'PHP'
<?php
// php backend.php stamp <pdf> <rol> | verify <anterior> <firmado>
require $argv[1].'/vendor/autoload.php';
$app = require $argv[1].'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if ($argv[2] === 'stamp') {
    echo json_encode(app(App\Modules\Documents\Infrastructure\Rendering\SignatureStampLocator::class)->locate(file_get_contents($argv[3]), $argv[4]));
    exit(0);
}
try {
    $certificate = app(App\Modules\Documents\Application\IncrementalPdfSignatureVerifier::class)
        ->verify(file_get_contents($argv[3]), file_get_contents($argv[4]));
    echo "Verificador PHP: VALIDA · titular {$certificate->holder}\n";
} catch (Illuminate\Validation\ValidationException $exception) {
    echo 'Verificador PHP: RECHAZADA · '.implode(' ', $exception->validator->errors()->all())."\n";
    exit(1);
}
PHP

sign() { # entrada salida p12 clave rol
  local stamp
  stamp=$(php "$work/backend.php" "$backend" stamp "$1" "$5")
  echo "Sello ($5): $stamp"
  (cd "$frontend" && SIGN_E2E_INPUT="$1" SIGN_E2E_OUTPUT="$2" SIGN_E2E_P12="$3" SIGN_E2E_PASSWORD="$4" \
    SIGN_E2E_ROLE="$5" SIGN_E2E_STAMP="$stamp" npx vitest run src/lib/signature/signPdf.e2e.test.ts >/dev/null)
  php "$work/backend.php" "$backend" verify "$1" "$2"
}

cp "$input" "$work/0-original.pdf"
sign "$work/0-original.pdf" "$work/1-docente.pdf" "$work/docente.p12" clave-docente docente
sign "$work/1-docente.pdf" "$work/2-coordinacion.pdf" "$work/coordinacion.p12" clave-coordinacion coordinacion
cmp -n "$(stat -c %s "$work/1-docente.pdf")" "$work/1-docente.pdf" "$work/2-coordinacion.pdf" && echo "La segunda firma conserva intactos los bytes de la primera."
echo "--- pdfsig $work/2-coordinacion.pdf"
pdfsig "$work/2-coordinacion.pdf" || true
