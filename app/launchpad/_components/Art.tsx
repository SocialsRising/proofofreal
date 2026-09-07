import { paletteFor } from "../_lib/mock";

export function Art({ symbol, image, size = "", className = "" }: { symbol: string; image?: string | null; size?: "" | "sm" | "md" | "xl"; className?: string }) {
  const [a, b, c] = paletteFor(symbol.toUpperCase());
  const label = symbol.slice(0, 5).toUpperCase();
  return (
    <div className={`art ${size} ${className}`} style={{ background: `linear-gradient(150deg,${a} 0%,${b} 55%,${c} 100%)` }}>
      {image ? <img src={image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : <span className={label.length > 4 ? "l5" : ""}>{label || "?"}</span>}
    </div>
  );
}
