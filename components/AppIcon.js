export default function AppIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradIcon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#4285F4', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#1565C0', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <path d="M256 48C167.634 48 96 119.634 96 208C96 320 256 464 256 464C256 464 416 320 416 208C416 119.634 344.366 48 256 48Z" fill="url(#gradIcon)"/>
      <path d="M256 128L176 224H240V320L320 224H256V128Z" fill="white"/>
    </svg>
  );
}
