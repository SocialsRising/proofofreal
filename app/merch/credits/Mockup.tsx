/* eslint-disable @next/next/no-img-element */
/** Flat product previews: a garment/object silhouette with the design placed in the real print area. */
type Area = { x: number; y: number; w: number; h: number; r?: number };
type Shape = { body: (fill: string, stroke: string) => React.ReactNode; area: Area; fit: "meet" | "slice" };

const garment = (c?: string) => (c === "White" ? { fill: "#efefec", stroke: "#bdbdb8", ink: "#9a9a95" } : { fill: "#0c0c0c", stroke: "#4a4a47", ink: "#6b6b67" });

const SHAPES: Record<string, Shape> = {
  tee: {
    body: (f, s) => <path d="M62 22 L86 12 Q100 24 114 12 L138 22 L178 50 L160 78 L146 68 L146 204 L54 204 L54 68 L40 78 L22 50 Z" fill={f} stroke={s} strokeWidth="1.5" strokeLinejoin="round" />,
    area: { x: 72, y: 60, w: 56, h: 68 }, fit: "meet",
  },
  hoodie: {
    body: (f, s) => (<>
      <path d="M64 34 Q100 0 136 34 L176 62 L170 190 L150 190 L148 100 L148 206 L52 206 L52 100 L50 190 L30 190 L24 62 Z" fill={f} stroke={s} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M78 36 Q100 56 122 36" fill="none" stroke={s} strokeWidth="1.5" />
      <path d="M70 156 L130 156 L136 186 L64 186 Z" fill="none" stroke={s} strokeWidth="1.2" />
    </>),
    area: { x: 74, y: 66, w: 52, h: 56 }, fit: "meet",
  },
  poster: {
    body: () => (<><rect x="38" y="12" width="124" height="166" rx="2" fill="#000" opacity=".5" transform="translate(3 4)" /><rect x="38" y="12" width="124" height="166" rx="2" fill="#f4f4f1" /></>),
    area: { x: 44, y: 18, w: 112, h: 154 }, fit: "meet",
  },
  frame: {
    body: (f) => (<><rect x="34" y="14" width="132" height="170" rx="3" fill="#000" opacity=".5" transform="translate(3 4)" /><rect x="34" y="14" width="132" height="170" rx="3" fill={f} /><rect x="44" y="24" width="112" height="150" fill="#f4f4f1" /></>),
    area: { x: 54, y: 34, w: 92, h: 130 }, fit: "meet",
  },
  shorts: {
    body: (f, s) => (<><path d="M42 34 L158 34 L168 158 L108 164 L100 96 L92 164 L32 158 Z" fill={f} stroke={s} strokeWidth="1.5" strokeLinejoin="round" /><path d="M42 46 L158 46" stroke={s} strokeWidth="1.2" /></>),
    area: { x: 116, y: 96, w: 36, h: 36 }, fit: "meet",
  },
  sweats: {
    body: (f, s) => (<><path d="M56 12 L144 12 L152 204 L110 206 L100 72 L90 206 L48 204 Z" fill={f} stroke={s} strokeWidth="1.5" strokeLinejoin="round" /><path d="M56 24 L144 24" stroke={s} strokeWidth="1.2" /><path d="M48 192 L90 194 M110 194 L152 192" stroke={s} strokeWidth="1.2" /></>),
    area: { x: 110, y: 56, w: 30, h: 30 }, fit: "meet",
  },
  stickers: {
    body: () => (<><rect x="104" y="30" width="70" height="70" rx="14" fill="#f4f4f1" transform="rotate(12 139 65)" opacity=".55" /><rect x="34" y="52" width="118" height="118" rx="20" fill="#000" opacity=".45" transform="translate(3 4)" /><rect x="34" y="52" width="118" height="118" rx="20" fill="#f4f4f1" /></>),
    area: { x: 42, y: 60, w: 102, h: 102, r: 14 }, fit: "slice",
  },
  phone: {
    body: (f) => <rect x="62" y="10" width="76" height="168" rx="16" fill={f} />,
    area: { x: 62, y: 10, w: 76, h: 168, r: 16 }, fit: "slice",
  },
};

export function Mockup({ product, color, src, uid }: { product: string; color?: string; src?: string | null; uid: string }) {
  const sh = SHAPES[product] ?? SHAPES.tee;
  const g = product === "frame" ? (color === "White" ? { fill: "#f1f1ee", stroke: "#d0d0cc", ink: "#9a9a95" } : { fill: "#1b1b1b", stroke: "#333", ink: "#5a5a56" })
    : product === "phone" ? { fill: "#1b1b1b", stroke: "#333", ink: "#6b6b67" } : garment(color);
  const a = sh.area;
  const clip = `clip-${uid}`;
  return (
    <svg viewBox="0 0 200 220" className="mock" role="img" aria-label={`${product} preview`}>
      <defs><clipPath id={clip}><rect x={a.x} y={a.y} width={a.w} height={a.h} rx={a.r ?? 2} /></clipPath></defs>
      {sh.body(g.fill, g.stroke)}
      {src ? (
        <image href={src} x={a.x} y={a.y} width={a.w} height={a.h} preserveAspectRatio={`xMidYMid ${sh.fit}`} clipPath={`url(#${clip})`} />
      ) : (
        <g>
          <rect x={a.x} y={a.y} width={a.w} height={a.h} rx={a.r ?? 2} fill="none" stroke={g.ink} strokeDasharray="3 3" />
          {a.w > 40 && <text x={a.x + a.w / 2} y={a.y + a.h / 2 + 3} textAnchor="middle" fontSize="7.5" fontWeight="700" letterSpacing=".8" fill={g.ink}>YOUR DESIGN</text>}
        </g>
      )}
      {product === "phone" && <rect x="70" y="18" width="28" height="30" rx="8" fill="#0b0b0b" stroke="#2c2c2c" />}
    </svg>
  );
}
