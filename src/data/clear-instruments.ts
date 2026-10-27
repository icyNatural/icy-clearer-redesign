// CLEAR uses explicit mathematical constructions, never invented observations.
export const TAU = Math.PI * 2;
export const ORBIT = {
  earthDays: 365.256,
  marsDays: 686.98,
  earthRadius: 1,
  marsRadius: 1.524,
  recordDays: 780,
};
export type Vec = { x: number; y: number };
export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
export function orbit(day: number) {
  const earth = {
    x: Math.cos((TAU * day) / ORBIT.earthDays),
    y: Math.sin((TAU * day) / ORBIT.earthDays),
  };
  const mars = {
    x: ORBIT.marsRadius * Math.cos((TAU * day) / ORBIT.marsDays),
    y: ORBIT.marsRadius * Math.sin((TAU * day) / ORBIT.marsDays),
  };
  return {
    earth,
    mars,
    relative: { x: mars.x - earth.x, y: mars.y - earth.y },
  };
}
export function angularError(a: number, b: number) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}
export function predictionError(epicycle = true) {
  let squared = 0;
  const count = 48;
  for (let i = 0; i < count; i++) {
    const { earth, mars, relative } = orbit(
      (i * ORBIT.recordDays) / (count - 1),
    );
    const predicted = Math.atan2(
      mars.y - (epicycle ? earth.y : 0),
      mars.x - (epicycle ? earth.x : 0),
    );
    squared += angularError(predicted, Math.atan2(relative.y, relative.x)) ** 2;
  }
  return (Math.sqrt(squared / count) * 180) / Math.PI;
}

// The same analytic record is integrated at every scale. Averaging each bin
// analytically prevents undersampled fast oscillations from becoming false cycles.
export const WINDOWS = [1, 60, 86400, 2592000, 31557600];
export const WINDOW_NAMES = [
  "1 SECOND",
  "1 MINUTE",
  "1 DAY",
  "30 DAYS",
  "1 YEAR",
];
// Amplitudes sum to .44. With a .46–.52 baseline, the entire
// one-year record (not just the displayed samples) stays within 0–1.
const WAVES = [
  [0.06, 0.22],
  [0.08, 12],
  [0.14, 86400],
  [0.1, 28 * 86400],
  [0.06, 31557600],
];
export function meanActivity(start: number, end: number) {
  const width = end - start;
  let value = 0.46 + (0.06 * (start + end)) / (2 * WINDOWS[4]);
  for (const [amplitude, period] of WAVES) {
    const frequency = TAU / period;
    value +=
      width < 1e-6
        ? amplitude * Math.sin(frequency * start)
        : (amplitude *
            (Math.cos(frequency * start) - Math.cos(frequency * end))) /
          (frequency * width);
  }
  return value;
}
export function scaleTrace(level: number, bins = 240) {
  const index = clamp(Math.floor(level), 0, 3);
  const fraction = clamp(level - index, 0, 1);
  const duration =
    WINDOWS[index] * (WINDOWS[index + 1] / WINDOWS[index]) ** fraction;
  const values = Array.from({ length: bins }, (_, i) =>
    meanActivity((i * duration) / bins, ((i + 1) * duration) / bins),
  );
  return { duration, values, binSeconds: duration / bins };
}

export function ambiguousLoop(
  phase: number,
  view: number,
  samples = 240,
  depth = 0,
): Vec[] {
  return Array.from({ length: samples }, (_, i) => {
    const a = (TAU * i) / samples;
    const radius =
      98 + Math.sin(3 * a + phase) * 22 + Math.cos(5 * a - phase * 0.7) * 10;
    const x = Math.cos(a) * radius,
      y = Math.sin(a) * radius;
    const z = Math.sin(2 * a + phase) * 34 + depth;
    return {
      x: 300 + (x * Math.cos(view) + z * Math.sin(view)) * 1.24,
      y: 234 + y + z * 0.35,
    };
  });
}
export function pathFrom(points: Vec[], closed = false) {
  return (
    points
      .map(
        (point, i) =>
          `${i ? "L" : "M"}${point.x.toFixed(2)},${point.y.toFixed(2)}`,
      )
      .join("") + (closed ? "Z" : "")
  );
}
export const LIGHT_SOURCES = [
  {
    name: "SUN",
    seconds: 500,
    delay: "≈ 08m 20s",
    label: "about 8 minutes, 20 seconds",
  },
  {
    name: "SIRIUS",
    seconds: 8.6 * 31557600,
    delay: "≈ 8.6 years",
    label: "about 8.6 years",
  },
  {
    name: "ANDROMEDA",
    seconds: 2.5e6 * 31557600,
    delay: "≈ 2.5 million years",
    label: "about 2.5 million years",
  },
].map((source) => ({
  ...source,
  x:
    468 -
    (414 * Math.log(source.seconds / 500)) / Math.log((2.5e6 * 31557600) / 500),
}));
