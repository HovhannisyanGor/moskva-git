#!/bin/sh
# Бэкап Localee: база данных + загруженные файлы.
#
# Запуск на сервере:
#   sh /opt/localee/server/backup.sh
#
# Куда складывать (по умолчанию /opt/localee/backups) можно передать аргументом:
#   sh /opt/localee/server/backup.sh /mnt/backup
#
# Почему не просто `cp localee.db`:
# база работает в режиме WAL — часть свежих данных лежит не в самом файле, а в
# соседнем localee.db-wal. Обычная копия на живом сервере может получиться
# битой или потерять последние записи. Здесь используется штатный онлайн-бэкап
# SQLite: он снимает согласованный слепок, не останавливая сервис.
#
# Файлы (data/uploads) копируются докладыванием: их имена — хеш содержимого,
# они никогда не меняются, поэтому повторно копировать уже сохранённое не нужно.
# Второй запуск занимает секунды и место почти не тратит.

set -e

APP=/opt/localee/server
DEST=${1:-/opt/localee/backups}
KEEP=14                      # сколько слепков базы хранить

STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$DEST/db" "$DEST/uploads"

# --- 1. База: согласованный снимок ---
cd "$APP"
node -e "
import('better-sqlite3').then(async (m) => {
  const db = new m.default('$APP/data/localee.db', { readonly: true });
  await db.backup('$DEST/db/localee-$STAMP.db');
  db.close();
}).catch((e) => { console.error('Не удалось снять бэкап базы:', e.message); process.exit(1); });
"
gzip -f "$DEST/db/localee-$STAMP.db"

# --- 2. Файлы: докладываем только новые ---
rsync -a --ignore-existing "$APP/data/uploads/" "$DEST/uploads/"

# --- 3. Чистим слишком старые слепки базы (файлы не трогаем: на них ссылаются
#        записи, которые могут быть и в старых слепках) ---
ls -1t "$DEST/db"/localee-*.db.gz 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
  rm -f "$old"
done

# --- Итог ---
echo "Бэкап готов: $STAMP"
echo "  база:  $(ls -lh "$DEST/db/localee-$STAMP.db.gz" | awk '{print $5}')  ($DEST/db)"
echo "  файлы: $(du -sh "$DEST/uploads" | awk '{print $1}')  ($(find "$DEST/uploads" -type f | wc -l | tr -d ' ') шт.)"
echo "  слепков базы хранится: $(ls -1 "$DEST/db"/localee-*.db.gz 2>/dev/null | wc -l | tr -d ' ') (лимит $KEEP)"
echo
echo "Забрать копию к себе на компьютер:"
echo "  rsync -avz root@80.78.244.37:$DEST/ ~/localee-backup/"
