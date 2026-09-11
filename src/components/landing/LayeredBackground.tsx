import { motion } from 'framer-motion';

/**
 * Full-bleed earthy topographic background.
 * Fixed to viewport so it spans the entire scroll seamlessly (end-to-end).
 * Palette: warm sand, olive, terra cotta, amber, espresso.
 */
export function LayeredBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      {/* Warm sand base with subtle vertical warmth */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, #FBF7F0 0%, #F3EDE3 45%, #ECE3D2 100%)',
        }}
      />

      {/* Large amber sun glow, top-right */}
      <motion.div
        className="absolute -top-[20%] -right-[15%] w-[80vw] h-[80vw] rounded-full"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(232,176,89,0.55) 0%, rgba(232,176,89,0.18) 35%, rgba(232,176,89,0) 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ scale: [1, 1.06, 1], x: [0, -20, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Terra cotta wash, mid-left */}
      <motion.div
        className="absolute top-[20%] -left-[20%] w-[70vw] h-[70vw] rounded-full"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(217,142,115,0.45) 0%, rgba(217,142,115,0.12) 40%, rgba(217,142,115,0) 70%)',
          filter: 'blur(60px)',
        }}
        animate={{ scale: [1, 1.08, 1], y: [0, 30, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Olive deep wash, bottom-right */}
      <motion.div
        className="absolute -bottom-[25%] -right-[10%] w-[75vw] h-[75vw] rounded-full"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(140,140,112,0.35) 0%, rgba(140,140,112,0.10) 45%, rgba(140,140,112,0) 75%)',
          filter: 'blur(50px)',
        }}
        animate={{ scale: [1, 1.05, 1], x: [0, 25, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Topographic contour layer 1 — olive */}
      <motion.svg
        viewBox="0 0 1600 1200"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full opacity-[0.10]"
        animate={{ x: [0, -15, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      >
        <g fill="none" stroke="#5C5A3F" strokeWidth="1.2">
          <path d="M0,900 C300,820 600,880 900,780 C1200,680 1400,740 1600,640" />
          <path d="M0,820 C320,740 620,800 920,700 C1220,600 1420,660 1600,560" />
          <path d="M0,740 C340,660 640,720 940,620 C1240,520 1440,580 1600,480" />
          <path d="M0,660 C360,580 660,640 960,540 C1260,440 1460,500 1600,400" />
          <path d="M0,580 C380,500 680,560 980,460 C1280,360 1480,420 1600,320" />
        </g>
      </motion.svg>

      {/* Topographic contour layer 2 — terra, opposite direction */}
      <motion.svg
        viewBox="0 0 1600 1200"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full opacity-[0.09]"
        animate={{ x: [0, 18, 0] }}
        transition={{ duration: 34, repeat: Infinity, ease: 'easeInOut' }}
      >
        <g fill="none" stroke="#A85A3E" strokeWidth="1">
          <path d="M0,1100 C280,1020 580,1080 880,980 C1180,880 1380,940 1600,840" />
          <path d="M0,1020 C300,940 600,1000 900,900 C1200,800 1400,860 1600,760" />
          <path d="M0,940 C320,860 620,920 920,820 C1220,720 1420,780 1600,680" />
        </g>
      </motion.svg>

      {/* Bottom espresso silhouette — anchors the composition */}
      <svg
        viewBox="0 0 1600 600"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 w-full h-[35vh] opacity-[0.08]"
      >
        <path
          d="M0,600 L0,420 C200,360 420,400 640,320 C860,240 1080,300 1280,260 C1420,232 1520,250 1600,220 L1600,600 Z"
          fill="#382517"
        />
      </svg>

      {/* Fine grain texture — full bleed */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />
    </div>
  );
}
