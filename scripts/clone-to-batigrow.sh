#!/usr/bin/env bash
# =============================================================================
#  clone-to-batigrow.sh — Clonage intégral BatiCost ➜ BatiGrow
# =============================================================================
#
#  Produit une copie COMPLÈTE et FONCTIONNELLE de BatiCost sous le nom BatiGrow,
#  renommée, sans état ni secret partagé avec BatiCost.
#
#  Ce script NE MODIFIE JAMAIS la source : il ne fait que la lire.
#
#  Usage :
#     bash scripts/clone-to-batigrow.sh [dossier_cible]
#
#     dossier_cible par défaut : ../batigrow-ai (à côté de la source)
#
#  Options (variables d'environnement) :
#     FORCE=1        autorise l'écriture dans un dossier cible déjà existant
#     INIT_GIT=1     initialise un dépôt git neuf dans la cible (défaut : 1)
#     KEEP_GENERATED=1  conserve src/convex/_generated (déconseillé)
#
#  Après exécution, dans le dossier cible :
#     bun install
#     bunx convex dev --once     # crée un NOUVEAU déploiement Convex (DB neuve)
#     bunx tsc -b --noEmit
#     bun run test
#
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
TARGET_DIR="${1:-$(dirname "${SOURCE_DIR}")/batigrow-ai}"
TARGET_DIR="$(cd "$(dirname "${TARGET_DIR}")" && pwd)/$(basename "${TARGET_DIR}")"

FORCE="${FORCE:-0}"
INIT_GIT="${INIT_GIT:-1}"
KEEP_GENERATED="${KEEP_GENERATED:-0}"

step() { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
ok()   { printf '    \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '    \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\n\033[1;31mERREUR:\033[0m %s\n' "$*" >&2; exit 1; }

# -----------------------------------------------------------------------------
# 0. Préflight
# -----------------------------------------------------------------------------
step "Vérifications préalables"

[ -f "${SOURCE_DIR}/package.json" ] || die "package.json introuvable dans ${SOURCE_DIR}."
grep -q '"baticost' "${SOURCE_DIR}/package.json" \
  || die "La source ne semble pas être BatiCost (package.json sans \`baticost\`)."

command -v perl >/dev/null 2>&1 || die "perl est requis (renommage)."
command -v grep >/dev/null 2>&1 || die "grep est requis."

if [ -e "${TARGET_DIR}" ]; then
  if [ "${FORCE}" = "1" ]; then
    warn "Cible existante, réécriture autorisée (FORCE=1) : ${TARGET_DIR}"
  else
    die "La cible existe déjà : ${TARGET_DIR}
     Supprimez-la, choisissez un autre chemin, ou relancez avec FORCE=1."
  fi
fi

ok "source      : ${SOURCE_DIR}"
ok "cible       : ${TARGET_DIR}"

# -----------------------------------------------------------------------------
# 1. Copie intégrale (hors artefacts / état local / secrets)
# -----------------------------------------------------------------------------
step "Copie intégrale du dépôt"

EXCLUDES=(
  "node_modules"
  "mobile/node_modules"
  ".git"
  "dist"
  "isolate"
  ".env.local"
  ".env"
  ".env.production"
  ".env.development"
  ".vly-dist-upload.sh"
  "*.tsbuildinfo"
  "mobile/.expo"
)
if [ "${KEEP_GENERATED}" != "1" ]; then
  EXCLUDES+=("src/convex/_generated")
fi

mkdir -p "${TARGET_DIR}"

if command -v rsync >/dev/null 2>&1; then
  RSYNC_ARGS=(-a --delete)
  for e in "${EXCLUDES[@]}"; do RSYNC_ARGS+=(--exclude "$e"); done
  rsync "${RSYNC_ARGS[@]}" "${SOURCE_DIR}/" "${TARGET_DIR}/"
  ok "copie via rsync"
else
  TAR_ARGS=(-cf -)
  for e in "${EXCLUDES[@]}"; do TAR_ARGS+=(--exclude="./$e"); done
  ( cd "${SOURCE_DIR}" && tar "${TAR_ARGS[@]}" . ) | ( cd "${TARGET_DIR}" && tar -xf - )
  ok "copie via tar"
fi

# Purge de sécurité : même si un outil a laissé passer un fichier interdit.
rm -rf \
  "${TARGET_DIR}/node_modules" \
  "${TARGET_DIR}/mobile/node_modules" \
  "${TARGET_DIR}/.git" \
  "${TARGET_DIR}/dist" \
  "${TARGET_DIR}/isolate" \
  "${TARGET_DIR}/.vly-dist-upload.sh" \
  "${TARGET_DIR}/mobile/.expo"
rm -f "${TARGET_DIR}/.env.local" "${TARGET_DIR}/.env" \
      "${TARGET_DIR}/.env.production" "${TARGET_DIR}/.env.development"
[ "${KEEP_GENERATED}" = "1" ] || rm -rf "${TARGET_DIR}/src/convex/_generated"

ok "état BatiCost purgé (.env.local, _generated, dist, isolate, .git)"

# -----------------------------------------------------------------------------
# 2. Renommage BatiCost/baticost/imoprice ➜ BatiGrow/batigrow
# -----------------------------------------------------------------------------
step "Renommage d'identité"

# Ordre impératif : du plus spécifique au plus général.
PAIRS=(
  "baticost-ai-mobile::batigrow-ai-mobile"
  "imoprice-ai-mobile::batigrow-ai-mobile"
  "com.imopriceai.app::com.batigrow.app"
  "imopriceai::batigrow"
  "imoprice::batigrow"
  "baticost-ai::batigrow-ai"
  "BATICOST::BATIGROW"
  "Baticost::Batigrow"
  "BatiCost::BatiGrow"
  "baticost::batigrow"
)

PERL_PROG=""
for pair in "${PAIRS[@]}"; do
  from="${pair%%::*}"
  to="${pair##*::}"
  PERL_PROG+="s/\Q${from}\E/${to}/g;"
done

# Sélectionne uniquement les fichiers TEXTE contenant une marque à renommer.
# (lecture ligne-à-ligne : compatible bash 3.2 / macOS, gère les espaces dans les noms)
RENAMED=0
while IFS= read -r f; do
  [ -n "${f}" ] || continue
  perl -pi -e "${PERL_PROG}" "${f}"
  RENAMED=$((RENAMED + 1))
done < <(grep -rIl -i -e 'baticost' -e 'imoprice' "${TARGET_DIR}" 2>/dev/null || true)

if [ "${RENAMED}" -eq 0 ]; then
  warn "aucun fichier à renommer (déjà propre ?)"
else
  ok "${RENAMED} fichier(s) renommé(s)"
fi

# -----------------------------------------------------------------------------
# 3. Vérification anti-fuite de marque
# -----------------------------------------------------------------------------
step "Vérification anti-fuite de marque (BatiCost / imoprice)"

LEAKS="$(grep -rIl -i -e 'baticost' -e 'imoprice' "${TARGET_DIR}" 2>/dev/null || true)"
COUNT="$(printf '%s\n' "${LEAKS}" | grep -c . || true)"

if [ "${COUNT}" -ne 0 ]; then
  printf '\n%s\n' "${LEAKS}"
  die "${COUNT} fichier(s) contiennent encore une référence BatiCost/imoprice."
fi
ok "0 référence résiduelle à BatiCost / imoprice"

# Contrôles d'isolation
[ -e "${TARGET_DIR}/.env.local" ] && die ".env.local présent : isolation compromise."
[ -e "${TARGET_DIR}/src/convex/_generated" ] && [ "${KEEP_GENERATED}" != "1" ] \
  && die "src/convex/_generated présent : codegen non purgé."
ok "aucun secret ni lien vers la base Convex de BatiCost"

# Preuves d'identité
printf '    • package.json         : %s\n' \
  "$(grep -m1 '"name"' "${TARGET_DIR}/package.json" | tr -d ' ,"')"
printf '    • title (index.html)   : %s\n' \
  "$(grep -m1 -o '<title>[^<]*</title>' "${TARGET_DIR}/index.html")"
printf '    • manifest PWA         : %s\n' \
  "$(grep -m1 -o '"name"[^,]*' "${TARGET_DIR}/public/manifest.webmanifest")"

# -----------------------------------------------------------------------------
# 4. Dépôt git neuf (historique indépendant)
# -----------------------------------------------------------------------------
if [ "${INIT_GIT}" = "1" ] && command -v git >/dev/null 2>&1; then
  step "Initialisation d'un dépôt git indépendant"
  ( cd "${TARGET_DIR}" && git init -q && git add -A \
      && git -c user.name="BatiGrow" -c user.email="dev@batigrow.tn" \
           commit -qm "Initial commit: BatiGrow (clone fonctionnel de BatiCost)" )
  ok "dépôt git créé (aucun historique BatiCost)"
fi

# -----------------------------------------------------------------------------
# 5. Étapes suivantes
# -----------------------------------------------------------------------------
cat <<EOF

$(printf '\033[1;32mClone BatiGrow prêt.\033[0m')

Étapes suivantes — dans ${TARGET_DIR} :

  cd "${TARGET_DIR}"
  bun install

  # Crée un NOUVEAU déploiement Convex + régénère .env.local et _generated :
  bunx convex dev --once

  # 0 erreur TypeScript attendue :
  bunx tsc -b --noEmit

  # Suite de tests (baseline BatiCost : mêmes échecs préexistants) :
  bun run test

  # Audit comparatif BatiCost ↔ BatiGrow :
  bash "${SCRIPT_DIR}/audit-batigrow-clone.sh" "${SOURCE_DIR}" "${TARGET_DIR}"

Rappel d'isolation : ne copiez JAMAIS le .env.local de BatiCost dans BatiGrow.
EOF
