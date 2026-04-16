import type { NetWorthSnapshot, RetirementGoal } from "./supabase";

export interface ProjectionPoint {
  year: number;
  age: number;
  netWorth: number;
  projected: boolean;
}

export interface ProjectionInput {
  currentNetWorth: number;
  monthlySavings: number;
  goal: RetirementGoal;
  historicalSnapshots: NetWorthSnapshot[];
}

export interface ProjectionResult {
  points: ProjectionPoint[];
  goalReachedYear: number | null;
  goalReachedAge: number | null;
  projectedAtRetirement: number;
  onTrack: boolean;
  yearsToGoal: number | null;
  shortfall: number;
}

export function runProjection(input: ProjectionInput): ProjectionResult {
  const { currentNetWorth, monthlySavings, goal, historicalSnapshots } = input;
  const {
    current_age,
    retirement_age,
    target_amount,
    expected_return_rate,
    inflation_rate,
  } = goal;

  const currentYear = new Date().getFullYear();
  const yearsToRetire = retirement_age - current_age;

  // Fisher equation: real return strips out inflation
  const realReturn =
    (1 + expected_return_rate) / (1 + inflation_rate) - 1;
  const annualSavings = monthlySavings * 12;

  // Build historical points from snapshots
  const historicalPoints: ProjectionPoint[] = historicalSnapshots
    .slice()
    .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
    .map((s) => {
      const snapYear = new Date(s.snapshot_date).getFullYear();
      const yearsDiff = currentYear - snapYear;
      return {
        year: snapYear,
        age: current_age - yearsDiff,
        netWorth: s.net_worth,
        projected: false,
      };
    });

  const historicalYears = new Set(historicalPoints.map((p) => p.year));

  // Project forward from today
  const projectedPoints: ProjectionPoint[] = [];
  let nw = currentNetWorth;
  let goalReachedYear: number | null = null;
  let goalReachedAge: number | null = null;

  for (let i = 0; i <= yearsToRetire; i++) {
    const year = currentYear + i;
    const age = current_age + i;

    if (i > 0) {
      nw = nw * (1 + realReturn) + annualSavings;
    }

    projectedPoints.push({
      year,
      age,
      netWorth: Math.round(nw),
      projected: true,
    });

    if (goalReachedYear === null && nw >= target_amount) {
      goalReachedYear = year;
      goalReachedAge = age;
    }
  }

  const projectedAtRetirement =
    projectedPoints[projectedPoints.length - 1]?.netWorth ?? currentNetWorth;

  // Merge: prefer historical for past/current year
  const mergedProjected = projectedPoints.filter(
    (p) => !historicalYears.has(p.year)
  );
  const allPoints = [...historicalPoints, ...mergedProjected].sort(
    (a, b) => a.year - b.year
  );

  return {
    points: allPoints,
    goalReachedYear,
    goalReachedAge,
    projectedAtRetirement,
    onTrack: projectedAtRetirement >= target_amount,
    yearsToGoal: goalReachedYear ? goalReachedYear - currentYear : null,
    shortfall: target_amount - projectedAtRetirement,
  };
}

export function computeMonthlySavings(
  monthlyIncome: number,
  monthlyFixedCosts: number,
  avgVariableExpenses: number
): number {
  return monthlyIncome - monthlyFixedCosts - avgVariableExpenses;
}
