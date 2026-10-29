/**
 * StitchIcons — Custom hand-crafted SVG icons for Stitch POS category buttons.
 * Style: clean line art, 1.5px stroke, 24×24 viewBox, rounded caps/joins.
 */

interface IconProps { size?: number; className?: string }
const base = 'fill-none stroke-current'
const props = (size: number) => ({
  viewBox: '0 0 24 24', width: size, height: size,
  strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
})

/* ── Garments ─────────────────────────────────────────────────────────────── */

export function DressIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg {...props(size)} className={`${base} ${className}`}>
      {/* Sweetheart neckline + fitted bodice + A-line skirt */}
      <path d="M9 2C7.5 2 7 3 7 4.5V7L3.5 10.5L5 12H7L5.5 22H18.5L17 12H19L20.5 10.5L17 7V4.5C17 3 16.5 2 15 2" />
      <path d="M9 2Q12 5.5 15 2" />
      <line x1="7" y1="7" x2="17" y2="7" />
    </svg>
  )
}

export function PantIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg {...props(size)} className={`${base} ${className}`}>
      {/* Waistband + two legs */}
      <rect x="4" y="3" width="16" height="4" rx="1" />
      <path d="M4 7v5l4 9h4l1-9M20 7v5l-4 9h-4l-1-9" />
    </svg>
  )
}

export function ShirtIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg {...props(size)} className={`${base} ${className}`}>
      {/* Shirt with collar + sleeves */}
      <path d="M8 2L3 7l2.5 2L6 22h12l.5-13L21 7 16 2l-2 3c0 0-1 1-2 1s-2-1-2-1L8 2z" />
      <path d="M10 5L12 7L14 5" />
      <line x1="12" y1="7" x2="12" y2="22" />
    </svg>
  )
}

export function BlazerIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg {...props(size)} className={`${base} ${className}`}>
      {/* Single-breasted jacket with lapels */}
      <path d="M9 2L4 7v15h16V7l-5-5-3 4-3-4z" />
      {/* Lapels */}
      <path d="M9 2l3 4 3-4" />
      {/* Centre placket */}
      <line x1="12" y1="6" x2="12" y2="22" />
      {/* Button */}
      <circle cx="13.5" cy="13" r="0.8" fill="currentColor" />
      {/* Breast pocket */}
      <rect x="5.5" y="8" width="3.5" height="2.5" rx="0.5" />
    </svg>
  )
}

export function WeddingIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg {...props(size)} className={`${base} ${className}`}>
      {/* Ball gown silhouette */}
      <path d="M10 2C8.5 2 8 3 8 4.5V8L3 16l1.5 6h15L21 16l-5-7.5V4.5C16 3 15.5 2 14 2" />
      <path d="M10 2Q12 5 14 2" />
      <line x1="8" y1="8" x2="16" y2="8" />
      {/* Veil suggestion */}
      <path d="M14 2c1 0 2 .5 3 1.5" strokeDasharray="1.5 1" />
    </svg>
  )
}

export function ScissorsIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg {...props(size)} className={`${base} ${className}`}>
      {/* Tailor's scissors */}
      <circle cx="7.5" cy="6.5" r="2.5" />
      <circle cx="7.5" cy="17.5" r="2.5" />
      <line x1="7.5" y1="6.5" x2="21" y2="20" />
      <line x1="7.5" y1="17.5" x2="21" y2="4" />
      <line x1="14" y1="12" x2="21" y2="12" />
    </svg>
  )
}

export function MeasurementIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg {...props(size)} className={`${base} ${className}`}>
      {/* Measuring tape roll */}
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="3" />
      {/* Tape marks */}
      <line x1="12" y1="5" x2="12" y2="7" />
      <line x1="12" y1="17" x2="12" y2="19" />
      <line x1="5" y1="12" x2="7" y2="12" />
      <line x1="17" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export function NeedleIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg {...props(size)} className={`${base} ${className}`}>
      {/* Needle with thread */}
      <path d="M18 3l3 3-13 13-3-3 13-13z" />
      <path d="M18 3l-3 3" />
      <ellipse cx="20" cy="4" rx="1.5" ry="0.8" transform="rotate(45 20 4)" />
      {/* Thread */}
      <path d="M5 19c-1 1-2 3-1.5 1.5C4 19 5 17 7 15" strokeDasharray="1.2 1" />
    </svg>
  )
}

export function ButtonIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg {...props(size)} className={`${base} ${className}`}>
      {/* 4-hole button */}
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.5" strokeDasharray="2 1.5" />
      <circle cx="10.5" cy="10.5" r="1" fill="currentColor" />
      <circle cx="13.5" cy="10.5" r="1" fill="currentColor" />
      <circle cx="10.5" cy="13.5" r="1" fill="currentColor" />
      <circle cx="13.5" cy="13.5" r="1" fill="currentColor" />
    </svg>
  )
}

export function ZipperIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg {...props(size)} className={`${base} ${className}`}>
      {/* Zipper teeth */}
      <line x1="12" y1="2" x2="12" y2="22" />
      <rect x="9" y="2" width="6" height="3" rx="1" fill="currentColor" className="opacity-80" />
      {/* Teeth pairs */}
      {[5.5, 8.5, 11.5, 14.5, 17.5].map((y, i) => (
        <g key={i}>
          <rect x="7" y={y} width="4" height="2" rx="0.5" />
          <rect x="13" y={y} width="4" height="2" rx="0.5" />
        </g>
      ))}
    </svg>
  )
}

export function HangerIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg {...props(size)} className={`${base} ${className}`}>
      {/* Clothes hanger for Dry Cleaning */}
      <path d="M12 4a2 2 0 0 1 2 2c0 1-1 2-2 3L3 14.5A2 2 0 0 0 4 18h16a2 2 0 0 0 1-3.5L12 9" />
      <line x1="12" y1="2" x2="12" y2="4" />
    </svg>
  )
}

export function PatchIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg {...props(size)} className={`${base} ${className}`}>
      {/* Patch / band-aid shape */}
      <rect x="4" y="8" width="16" height="8" rx="4" />
      <rect x="9" y="5" width="6" height="14" rx="1" />
      {/* Cross */}
      <line x1="12" y1="10" x2="12" y2="14" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  )
}

export function SkirtIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg {...props(size)} className={`${base} ${className}`}>
      {/* Waistband + A-line skirt */}
      <rect x="7" y="3" width="10" height="3" rx="1" />
      <path d="M7 6L3 22h18L17 6" />
    </svg>
  )
}

export function ElasticIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg {...props(size)} className={`${base} ${className}`}>
      {/* Elastic band — wavy lines */}
      <path d="M3 10 Q6 7 9 10 Q12 13 15 10 Q18 7 21 10" />
      <path d="M3 14 Q6 11 9 14 Q12 17 15 14 Q18 11 21 14" />
      {/* End clips */}
      <line x1="3" y1="8" x2="3" y2="16" />
      <line x1="21" y1="8" x2="21" y2="16" />
    </svg>
  )
}

export function SchoolIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg {...props(size)} className={`${base} ${className}`}>
      {/* Backpack */}
      <rect x="6" y="7" width="12" height="14" rx="2" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" />
      <path d="M9 14h6M12 12v4" />
      <rect x="9" y="3" width="6" height="2" rx="1" />
    </svg>
  )
}

export function MiscIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg {...props(size)} className={`${base} ${className}`}>
      {/* Needle and thread — generic tailoring */}
      <path d="M5 19L19 5" />
      <path d="M19 5l-4 1 3 3 1-4z" />
      <path d="M5 19c-1 2-3 1-2 0 1-2 2-3 3-2" />
    </svg>
  )
}

/** Returns the correct icon component for a given category name */
export function CategoryIcon({ name, size = 28 }: { name: string; size?: number }) {
  const n = name.toLowerCase()
  if (n.includes('dress'))                            return <DressIcon size={size} />
  if (n.includes('pant') || n.includes('trouser'))   return <PantIcon size={size} />
  if (n.includes('shirt') || n.includes('blouse') || n.includes('polo')) return <ShirtIcon size={size} />
  if (n.includes('blazer') || n.includes('jacket') || n.includes('coat')) return <BlazerIcon size={size} />
  if (n.includes('skirt'))                           return <SkirtIcon size={size} />
  if (n.includes('wedding') || n.includes('bridal') || n.includes('gown')) return <WeddingIcon size={size} />
  if (n.includes('repair') || n.includes('alter'))   return <ScissorsIcon size={size} />
  if (n.includes('measurement') || n.includes('measure') || n.includes('waist')) return <MeasurementIcon size={size} />
  if (n.includes('zipper') || n.includes('zip'))     return <ZipperIcon size={size} />
  if (n.includes('button'))                          return <ButtonIcon size={size} />
  if (n.includes('patch'))                           return <PatchIcon size={size} />
  if (n.includes('elastic'))                         return <ElasticIcon size={size} />
  if (n.includes('dry') || n.includes('cleaning'))   return <HangerIcon size={size} />
  if (n.includes('school') || n.includes('uniform')) return <SchoolIcon size={size} />
  if (n.includes('pocket'))                          return <NeedleIcon size={size} />
  if (n.includes('evening') || n.includes('formal')) return <WeddingIcon size={size} />
  return <MiscIcon size={size} />
}
