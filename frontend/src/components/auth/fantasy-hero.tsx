/**
 * Animated fantasy backdrop for the login screen.
 *
 * A real photograph (public/login-hero.jpg) with three layers of motion:
 * a slow Ken Burns zoom on the picture, two drifting fog banks, and a field
 * of floating "fireflies". Positions come from a fixed formula rather than
 * Math.random so server and client render the same markup.
 */

const FIREFLIES = Array.from({ length: 26 }, (_, i) => {
  const seed = (i + 1) * 9301 + 49297;
  const rand = (n: number) => ((seed * (n + 3)) % 233280) / 233280;
  return {
    left: `${Math.round(rand(1) * 100)}%`,
    top: `${Math.round(35 + rand(2) * 62)}%`,
    size: 2 + Math.round(rand(3) * 4),
    dx: `${Math.round((rand(4) - 0.5) * 120)}px`,
    dy: `${-Math.round(60 + rand(5) * 180)}px`,
    dur: `${(7 + rand(6) * 9).toFixed(1)}s`,
    delay: `${(-rand(7) * 14).toFixed(1)}s`,
  };
});

export function FantasyHero() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#1a1722]" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/login-hero.jpg"
        alt=""
        className="fx-kenburns absolute inset-0 size-full object-cover"
      />

      <div className="fx-fog absolute -inset-x-1/4 top-[48%] h-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent blur-2xl" />
      <div
        className="fx-fog absolute -inset-x-1/4 bottom-0 h-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-3xl"
        style={{ animationDuration: '30s', animationDirection: 'alternate-reverse' }}
      />

      {FIREFLIES.map((f, i) => (
        <span
          key={i}
          className="fx-firefly absolute rounded-full bg-amber-200"
          style={
            {
              left: f.left,
              top: f.top,
              width: f.size,
              height: f.size,
              boxShadow: '0 0 10px 3px rgba(253, 224, 71, 0.65)',
              '--fx-dx': f.dx,
              '--fx-dy': f.dy,
              '--fx-dur': f.dur,
              '--fx-delay': f.delay,
            } as React.CSSProperties
          }
        />
      ))}

      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
    </div>
  );
}
