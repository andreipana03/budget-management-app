interface CategoryIconProps {
  icon?: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { outer: 'w-8 h-8', emoji: 'text-sm' },
  md: { outer: 'w-10 h-10', emoji: 'text-base' },
  lg: { outer: 'w-12 h-12', emoji: 'text-xl' },
};

/** Converts a hex color to an rgba string */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(100,100,100,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function CategoryIcon({ icon, color, size = 'md' }: CategoryIconProps) {
  const { outer, emoji } = sizeMap[size];
  return (
    <div
      className={`${outer} rounded-xl flex items-center justify-center flex-shrink-0`}
      style={{
        backgroundColor: hexToRgba(color, 0.15),
        boxShadow: `inset 0 0 0 1.5px ${hexToRgba(color, 0.35)}`,
      }}
    >
      {icon ? (
        <span className={emoji} role="img">{icon}</span>
      ) : (
        <span
          className="block rounded-full"
          style={{
            width: size === 'sm' ? 10 : size === 'md' ? 12 : 14,
            height: size === 'sm' ? 10 : size === 'md' ? 12 : 14,
            backgroundColor: color,
          }}
        />
      )}
    </div>
  );
}
