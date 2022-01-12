
export function multiplyCost(cost, factor) {
  return {
    gold: cost.gold ? cost.gold * factor: null,
    oil: cost.oil ? cost.oil * factor : null,
    wood: cost.wood ? cost.wood * factor : null,
  };
}

export function getFreeCost() {
  return {};
}

export function costEqualsCost(cost1, cost2) {
  cost1 = multiplyCost(cost1, 1);
  cost2 = multiplyCost(cost2, 1);

  return cost1.gold === cost2.gold && cost1.oil === cost2.oil && cost1.wood === cost2.wood;
}

export function isFreeCost(cost) {

  return costEqualsCost(cost, getFreeCost());

}
