export function GrainOverlay() {
  return (
    <div
      data-noise
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        mixBlendMode: 'overlay',
        opacity: 0.04,
        zIndex: 100,
      }}
      aria-hidden="true"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        style={{ display: 'block' }}
      >
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves={2}
            stitchTiles="stitch"
            result="noise"
          />
          <feColorMatrix type="saturate" values="0" in="noise" result="desaturated" />
          <feBlend in="SourceGraphic" in2="desaturated" mode="overlay" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </div>
  );
}
