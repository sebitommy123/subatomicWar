
export function multiplyCost(cost, factor) {
  return {
    gold: cost.gold ? cost.gold * factor: null,
    oil: cost.oil ? cost.oil * factor : null,
    wood: cost.wood ? cost.wood * factor : null,
  };
}
