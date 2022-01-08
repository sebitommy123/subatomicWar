
export function sinusoidalTimeValue(min, max, period) {
  return (Math.sin(Date.now() / period) + 1) / 2 * (max - min) + min;
}

export function decayingQuantity(quantity, decay) {
  return Math.cos(decay * Math.PI * 0.7 - Math.PI * 0.2) * quantity;
}

export function interpolateXYC(start, end, progress) {

  let x = start.x + (end.x - start.x) * progress;
  let y = start.y + (end.y - start.y) * progress;
  let c = start.c + (end.c - start.c) * progress;

  return {x, y, c};

}
