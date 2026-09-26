#!/bin/sh
# Sauvegarde quotidienne de la base Neon de prod, conservée 30 jours.
set -e
. "$HOME/backups/anibet/.env"   # contient NEON_URL=...
docker run --rm -e NEON_URL postgres:16 pg_dump "$NEON_URL" -Fc \
  > "$HOME/backups/anibet/anibet-$(date +%F).dump"
find "$HOME/backups/anibet" -name "anibet-*.dump" -mtime +30 -delete