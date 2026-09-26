#!/usr/bin/env bash
# =============================================================================
#  audit-batigrow-clone.sh — Audit comparatif BatiCost ↔ BatiGrow
# =============================================================================
#
#  Compare la source BatiCost et le clone BatiGrow et signale les différences
#  INVOLONTAIRES. Sort en code 1 si une différence non autorisée est détectée.
#
#  Usage :
#     bash scripts/audit-batigrow-clone.sh [source] [cible]
#
#     défaut source : racine du dépôt contenant ce script
#     défaut cible  : ../batigrow-ai
#
# =============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="${1:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
TARGET_DIR="${2:-$(dirname "${SOURCE_DIR}")/batigrow-ai}"

EXCLUDE_RE='(^|/)(node_modules|\.git|dist|isolate|_generated|\.expo)(/|$)'

FAIL=0
section() { printf '\n\033[1;34m── %s\033[0m\n' "$*"; }
pass()    { printf '  \033[32m✓\033[0m %s\n' "$*"; }
fail()    { printf '  \033[1;31m✗\033[0m %s\n' "$*"; FAIL=1; }
info()    { printf '  \033[36m·\033[0m %s\n' "$*"; }

[ -d "${SOURCE_DIR}" ] || { echo "source introuvable : ${SOURCE_DIR}" >&2; exit 2; }
[ -d "${TARGET_DIR}" ] || { echo "cible introuvable : ${TARGET_DIR}" >&2; exit 2; }

printf '\033[1mAudit BatiCost ↔ BatiGrow\033[0m\n'
printf '  source : %s\n  cible  : %s\n' "${SOURCE_DIR}" "${TARGET_DIR}"

# -----------------------------------------------------------------------------
section "1. Interface — routes (src/main.tsx)"
# -----------------------------------------------------------------------------
missing=0
[ -f "${SOURCE_DIR}/src/main.tsx" ] || { fail "src/main.tsx manquant dans la source"; missing=1; }
[ -f "${TARGET_DIR}/src/main.tsx" ] || { fail "src/main.tsx manquant dans la cible"; missing=1; }
if [ "${missing}" -eq 0 ]; then
  SRC_ROUTES="$(grep -oE 'path="[^"]*"' "${SOURCE_DIR}/src/main.tsx" | sort -u)"
  DST_ROUTES="$(grep -oE 'path="[^"]*"' "${TARGET_DIR}/src/main.tsx" | sort -u)"
  if [ "${SRC_ROUTES}" = "${DST_ROUTES}" ]; then
    pass "$(printf '%s\n' "${SRC_ROUTES}" | grep -c .) routes identiques"
  else
    fail "routes différentes :"
    diff <(printf '%s\n' "${SRC_ROUTES}") <(printf '%s\n' "${DST_ROUTES}") | sed 's/^/      /'
  fi
fi

# -----------------------------------------------------------------------------
section "2. Fonctionnel — fonctions Convex exportées"
# -----------------------------------------------------------------------------
convex_fns() {
  find "$1/src/convex" -maxdepth 1 -name '*.ts' 2>/dev/null | sort | while read -r f; do
    n="$(grep -cE 'export const .* = (query|mutation|action|internalQuery|internalMutation|internalAction)' "$f")"
    printf '%s %s\n' "$(basename "$f")" "${n}"
  done
}
diff <(convex_fns "${SOURCE_DIR}") <(convex_fns "${TARGET_DIR}") > /tmp/.bg_convex_diff 2>/dev/null
if [ ! -s /tmp/.bg_convex_diff ]; then
  total="$(awk '{s+=$2} END {print s}' <(convex_fns "${SOURCE_DIR}"))"
  pass "mêmes fichiers backend et $total fonctions par fichier"
else
  fail "fonctions Convex différentes :"
  sed 's/^/      /' /tmp/.bg_convex_diff
fi
rm -f /tmp/.bg_convex_diff

# -----------------------------------------------------------------------------
section "3. Fonctionnel — rôles"
# -----------------------------------------------------------------------------
missing=0
[ -f "${SOURCE_DIR}/src/convex/schema.ts" ] || { fail "src/convex/schema.ts manquant dans la source"; missing=1; }
[ -f "${TARGET_DIR}/src/convex/schema.ts" ] || { fail "src/convex/schema.ts manquant dans la cible"; missing=1; }
if [ "${missing}" -eq 0 ]; then
  if diff <(grep -A4 'export const ROLES' "${SOURCE_DIR}/src/convex/schema.ts") \
          <(grep -A4 'export const ROLES' "${TARGET_DIR}/src/convex/schema.ts") >/dev/null 2>&1; then
    pass "rôles identiques ($(grep -oE '"[a-z]+"' <(grep -A4 'export const ROLES' "${SOURCE_DIR}/src/convex/schema.ts") | tr '\n' ' '))"
  else
    fail "définition des rôles différente"
  fi
fi

# -----------------------------------------------------------------------------
section "4. Technique — inventaire des fichiers source"
# -----------------------------------------------------------------------------
inventory() {
  ( cd "$1" && find . -type f \
      \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.json' \
         -o -name '*.css' -o -name '*.html' -o -name '*.md' \) \
      -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' \
      -not -path '*/isolate/*' -not -path '*/_generated/*' -not -path '*/.expo/*' \
      -not -name '.vly-dist-upload.sh' -not -name 'bun.lock' \
    | sort )
}
diff <(inventory "${SOURCE_DIR}") <(inventory "${TARGET_DIR}") > /tmp/.bg_files_diff 2>/dev/null
if [ ! -s /tmp/.bg_files_diff ]; then
  pass "$(inventory "${SOURCE_DIR}" | grep -c .) fichiers source identiques"
else
  fail "fichiers manquants/en trop :"
  sed 's/^/      /' /tmp/.bg_files_diff
fi
rm -f /tmp/.bg_files_diff

# -----------------------------------------------------------------------------
section "5. Technique — dépendances"
# -----------------------------------------------------------------------------
deps() { node -e '
  const p = require(process.argv[1]);
  const out = {};
  for (const [k, v] of Object.entries({ ...(p.dependencies||{}), ...(p.devDependencies||{}) })) out[k] = v;
  process.stdout.write(Object.keys(out).sort().map(k => k + " " + out[k]).join("\n"));
' "$1/package.json" 2>/dev/null; }
if diff <(deps "${SOURCE_DIR}") <(deps "${TARGET_DIR}") >/dev/null 2>&1; then
  pass "dépendances et versions identiques"
else
  fail "dépendances différentes :"
  diff <(deps "${SOURCE_DIR}") <(deps "${TARGET_DIR}") | sed 's/^/      /'
fi

# -----------------------------------------------------------------------------
section "6. Technique — design (src/index.css)"
# -----------------------------------------------------------------------------
if [ ! -f "${SOURCE_DIR}/src/index.css" ] || [ ! -f "${TARGET_DIR}/src/index.css" ]; then
  fail "src/index.css manquant (source et/ou cible)"
elif diff -q "${SOURCE_DIR}/src/index.css" "${TARGET_DIR}/src/index.css" >/dev/null 2>&1; then
  pass "jetons de design identiques (index.css bit-à-bit)"
else
  fail "src/index.css différent :"
  diff "${SOURCE_DIR}/src/index.css" "${TARGET_DIR}/src/index.css" | head -40 | sed 's/^/      /'
fi

# -----------------------------------------------------------------------------
section "7. Marque — fuites résiduelles"
# -----------------------------------------------------------------------------
LEAKS="$(grep -rIl -i -e 'baticost' -e 'imoprice' "${TARGET_DIR}" \
          -r --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
          --exclude-dir=isolate 2>/dev/null || true)"
if [ -z "${LEAKS}" ]; then
  pass "0 occurrence de baticost / imoprice / BatiCost dans BatiGrow"
else
  fail "références résiduelles :"
  printf '%s\n' "${LEAKS}" | sed 's/^/      /'
fi

# -----------------------------------------------------------------------------
section "8. Isolation — état BatiCost absent"
# -----------------------------------------------------------------------------
check_absent() { [ -e "$1" ] && fail "$2 présent : $1" || pass "$2 absent"; }
check_absent "${TARGET_DIR}/.env.local"                ".env.local"
check_absent "${TARGET_DIR}/src/convex/_generated"     "_generated copié"
check_absent "${TARGET_DIR}/.git"                      "historique git BatiCost"
check_absent "${TARGET_DIR}/dist"                      "artefact dist"
check_absent "${TARGET_DIR}/isolate"                   "artefact isolate"

# -----------------------------------------------------------------------------
section "9. Différences attendues (autorisées)"
# -----------------------------------------------------------------------------
pkgname() { node -e 'const p=require(process.argv[1]);process.stdout.write(String(p.name))' "$1" 2>/dev/null || echo '?'; }
info "package web  : $(pkgname "${SOURCE_DIR}/package.json")  ➜  $(pkgname "${TARGET_DIR}/package.json")"
info "package mob. : $(pkgname "${SOURCE_DIR}/mobile/package.json")  ➜  $(pkgname "${TARGET_DIR}/mobile/package.json")"
info "title        : $(grep -m1 -o '<title>[^<]*</title>' "${TARGET_DIR}/index.html" 2>/dev/null || echo '?')"
info "manifest     : $(grep -m1 -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' "${TARGET_DIR}/public/manifest.webmanifest" 2>/dev/null || echo '?')"
info "git remote   : (aucun : dépôt neuf)"

# -----------------------------------------------------------------------------
printf '\n'
if [ "${FAIL}" -eq 0 ]; then
  printf '\033[1;32mAudit OK — aucune différence involontaire détectée.\033[0m\n'
  exit 0
else
  printf '\033[1;31mAudit ÉCHOUÉ — corrigez les points ci-dessus.\033[0m\n'
  exit 1
fi
