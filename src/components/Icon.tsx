// Инлайновые SVG-иконки (Tabler, stroke=currentColor — красятся темой через CSS `color`).
// Бейджи: имя файла = id бейджа (src/data/badges.ts). UI-иконки: search, chat.
// Встраиваем инлайном (а не <img>), чтобы работал currentColor и тема.
const badgeSvgs = import.meta.glob('../assets/badges/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const uiSvgs = import.meta.glob('../assets/icons/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function pick(map: Record<string, string>, name: string): string {
  const key = Object.keys(map).find((p) => p.endsWith(`/${name}.svg`));
  return key ? map[key] : '';
}

export function BadgeIcon({ id, className = '' }: { id: string; className?: string }) {
  const svg = pick(badgeSvgs, id);
  if (!svg) return null;
  return <span className={`svg-icon ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

// UI-иконка по имени файла (без .svg): <Icon name="search" /> / <Icon name="chat" />
export function Icon({ name, className = '' }: { name: string; className?: string }) {
  const svg = pick(uiSvgs, name);
  if (!svg) return null;
  return <span className={`svg-icon ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}
