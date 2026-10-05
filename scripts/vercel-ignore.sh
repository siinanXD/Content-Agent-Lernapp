#!/usr/bin/env bash
# Vercel "Ignored Build Step" (SIN-223): Exit 0 = Build überspringen, Exit 1 = bauen.
# Hobby-Limit schonen: keine Preview für reine Doku-Commits. Production (main) wird immer gebaut.
# Überholte Commits eines PRs bricht Vercel selbst ab (github.autoJobCancelation, siehe vercel.json).
set -u

branch="${VERCEL_GIT_COMMIT_REF:-}"
if [ "$branch" = "main" ] || [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "Production: Build läuft."
  exit 1
fi

# Ohne Vorgänger-Commit lässt sich nichts vergleichen: lieber bauen.
if ! git rev-parse --verify -q HEAD^ >/dev/null; then
  echo "Kein HEAD^: Build läuft."
  exit 1
fi

# Nur Doku geändert (docs/, *.md, .github/, e2e/, scripts/autonomy/, Tests ohne Laufzeit-Wirkung)?
if git diff --quiet HEAD^ HEAD -- . \
  ':(exclude)docs' ':(exclude)*.md' ':(exclude).github' ':(exclude)e2e' ':(exclude)scripts/autonomy'; then
  echo "Nur Doku/CI geändert: Preview wird übersprungen."
  exit 0
fi

echo "Code geändert: Build läuft."
exit 1
