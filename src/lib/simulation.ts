import { FundParams, SimulationResult, SimulationSummary, MonteCarloResults } from '@/types';

// Seeded random number generator for reproducibility
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Simple LCG random
  random(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  // Box-Muller for normal distribution
  gaussian(mean: number = 0, stdDev: number = 1): number {
    const u1 = this.random();
    const u2 = this.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  // Random integer in range [min, max]
  randInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }
}

/**
 * Outcome distribution for discovery-only companies (didn't graduate to conviction)
 * Higher failure rate, lower upside since these weren't selected for conviction
 *
 * Based on seed/pre-seed benchmarks:
 * - ~70% fail (0x)
 * - ~20% return 0.5-2x
 * - ~7% return 2-5x
 * - ~3% return 5x+
 */
function sampleDiscoveryOnlyMultiple(rng: SeededRandom): number {
  const r = rng.random();

  if (r < 0.70) {
    return 0.0;        // 70% fail completely
  } else if (r < 0.85) {
    return 0.5 + rng.random() * 1.5; // 15% return 0.5-2x
  } else if (r < 0.92) {
    return 2.0 + rng.random() * 3.0; // 7% return 2-5x
  } else if (r < 0.97) {
    return 5.0 + rng.random() * 5.0; // 5% return 5-10x
  } else if (r < 0.99) {
    return 10.0 + rng.random() * 10.0; // 2% return 10-20x
  } else {
    return 20.0 + rng.random() * 30.0; // 1% return 20-50x
  }
}

/**
 * Outcome distribution for conviction companies (graduated from discovery)
 * Better outcomes since these are pre-selected top ~25%
 *
 * Conviction companies have stronger outcomes:
 * - ~50% fail (0x)
 * - ~27% return ~1x
 * - ~12% return ~3x
 * - ~6% return ~7x
 * - ~3.5% return ~20x
 * - ~1% return ~40x
 * - ~0.5% return 100x+
 */
function sampleConvictionMultiple(rng: SeededRandom): number {
  const r = rng.random();

  if (r < 0.50) {
    return 0.0;        // 50% fail
  } else if (r < 0.77) {
    return 0.8 + rng.random() * 0.4; // 27% ~ capital back (0.8-1.2x)
  } else if (r < 0.89) {
    return 2.5 + rng.random() * 1.5; // 12% ~3x (2.5-4x)
  } else if (r < 0.95) {
    return 5.0 + rng.random() * 5.0; // 6% ~7x (5-10x)
  } else if (r < 0.985) {
    return 15.0 + rng.random() * 10.0; // 3.5% ~20x (15-25x)
  } else if (r < 0.995) {
    return 30.0 + rng.random() * 20.0; // 1% ~40x (30-50x)
  } else {
    return 75.0 + rng.random() * 75.0; // 0.5% mega-outlier (75-150x)
  }
}

/**
 * Calculate IRR using Newton-Raphson method
 */
function calculateIRR(cashFlows: number[], guess: number = 0.1): number {
  const maxIterations = 100;
  const tolerance = 1e-6;

  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      const discountFactor = Math.pow(1 + rate, t);
      npv += cashFlows[t] / discountFactor;
      if (t > 0) {
        dnpv -= t * cashFlows[t] / Math.pow(1 + rate, t + 1);
      }
    }

    if (Math.abs(npv) < tolerance) {
      return rate;
    }

    if (Math.abs(dnpv) < tolerance) {
      break;
    }

    const newRate = rate - npv / dnpv;

    // Bound the rate to reasonable values
    if (newRate < -0.99) {
      rate = -0.99;
    } else if (newRate > 10) {
      rate = 10;
    } else {
      rate = newRate;
    }
  }

  // Fallback: binary search if Newton-Raphson fails
  return binarySearchIRR(cashFlows);
}

function binarySearchIRR(cashFlows: number[]): number {
  let low = -0.99;
  let high = 5.0;
  const tolerance = 1e-6;
  const maxIterations = 100;

  const npv = (rate: number): number => {
    return cashFlows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + rate, t), 0);
  };

  const npvLow = npv(low);
  const npvHigh = npv(high);

  if (npvLow * npvHigh > 0) {
    return NaN; // No solution in range
  }

  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    const npvMid = npv(mid);

    if (Math.abs(npvMid) < tolerance) {
      return mid;
    }

    if (npvLow * npvMid < 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return (low + high) / 2;
}

/**
 * Simulate a single fund run
 */
export function simulateFundOnce(params: FundParams, rng: SeededRandom): SimulationResult {
  const { fundLife, fundSize, mgmtFeeRate, mgmtFeeFullYears, mgmtFeeStepdown, carry } = params;
  const { discoveryCheckSize, maxDiscoveryChecks, convictionCheckSize, graduationRate, followOnReservePercent } = params;

  // Calculate management fees over fund life
  let totalFees = 0;
  for (let year = 1; year <= fundLife; year++) {
    if (year <= mgmtFeeFullYears) {
      totalFees += mgmtFeeRate * fundSize;
    } else {
      totalFees += mgmtFeeStepdown * mgmtFeeRate * fundSize;
    }
  }

  const investableCapital = fundSize - totalFees;

  // Calculate follow-on reserve
  const followOnReserve = fundSize * followOnReservePercent;
  const deployableCapital = investableCapital - followOnReserve;

  // Number of companies at each stage
  const numDiscovery = maxDiscoveryChecks;
  const numConviction = Math.round(numDiscovery * graduationRate);

  // Check if we have enough capital
  const discoveryTotal = numDiscovery * discoveryCheckSize;
  const convictionTotal = numConviction * convictionCheckSize;
  const earlyStageTotal = discoveryTotal + convictionTotal;

  if (earlyStageTotal > deployableCapital) {
    // Scale down if needed
    const scaleFactor = deployableCapital / earlyStageTotal;
    // This shouldn't happen with proper fund configuration
    console.warn('Capital constraint hit, scaling investments');
  }

  // Generate outcomes for all discovery companies
  const discoveryOutcomes: number[] = [];
  const tractionSignals: number[] = [];

  for (let i = 0; i < numDiscovery; i++) {
    // Each company gets an underlying "quality" that determines outcome
    const outcome = sampleDiscoveryOnlyMultiple(rng);
    discoveryOutcomes.push(outcome);

    // Traction signal is noisy observation of quality
    const signal = Math.log(outcome + 0.1) + rng.gaussian(0, 1.0);
    tractionSignals.push(signal);
  }

  // Select top performers by traction signal for conviction
  const indexed = tractionSignals.map((signal, idx) => ({ signal, idx }));
  indexed.sort((a, b) => b.signal - a.signal);
  const convictionIndices = new Set(indexed.slice(0, numConviction).map(x => x.idx));

  // For conviction companies, resample with better distribution
  // (they get conviction-level outcomes since we're now filtering)
  const convictionOutcomes: Map<number, number> = new Map();
  for (const idx of convictionIndices) {
    convictionOutcomes.set(idx, sampleConvictionMultiple(rng));
  }

  // Follow-on allocation (best performing conviction companies)
  // Number of follow-on investments based on reserve size
  const avgFollowOnCheck = convictionCheckSize * 0.5; // Follow-ons typically smaller
  const numFollowOn = Math.min(
    Math.floor(followOnReserve / avgFollowOnCheck),
    Math.round(numConviction * 0.4) // At most 40% of conviction portfolio
  );

  // Select best conviction companies for follow-on (by outcome)
  const convictionByOutcome = Array.from(convictionIndices)
    .map(idx => ({ idx, outcome: convictionOutcomes.get(idx)! }))
    .sort((a, b) => b.outcome - a.outcome);

  const followOnIndices = new Set(convictionByOutcome.slice(0, numFollowOn).map(x => x.idx));
  const followOnCheckSize = numFollowOn > 0 ? followOnReserve / numFollowOn : 0;

  // Build cash flows
  const cashFlows: number[] = new Array(fundLife + 1).fill(0);

  // Year 0: no activity
  // Year 1: Discovery checks
  cashFlows[1] -= discoveryTotal;

  // Year 1-2: Conviction checks (2-3 months after discovery, so same year in annual model)
  cashFlows[1] -= convictionTotal;

  // Year 2-3: Follow-on deployments
  if (numFollowOn > 0) {
    cashFlows[2] -= followOnReserve * 0.5;
    cashFlows[3] -= followOnReserve * 0.5;
  }

  // Calculate returns
  let totalDistGross = 0;

  // Discovery-only exits (years 4-10)
  for (let i = 0; i < numDiscovery; i++) {
    const exitYear = rng.randInt(4, fundLife);

    if (convictionIndices.has(i)) {
      // Conviction company
      const outcome = convictionOutcomes.get(i)!;
      const invested = discoveryCheckSize + convictionCheckSize;
      let distribution = invested * outcome;

      // Follow-on returns (if applicable)
      if (followOnIndices.has(i)) {
        // Follow-on invested at higher valuation, so lower multiple
        const followOnMultiple = Math.max(outcome / 3, 0); // ~3x step-up
        distribution += followOnCheckSize * followOnMultiple;
      }

      cashFlows[exitYear] += distribution;
      totalDistGross += distribution;
    } else {
      // Discovery-only company
      const outcome = discoveryOutcomes[i];
      const distribution = discoveryCheckSize * outcome;
      cashFlows[exitYear] += distribution;
      totalDistGross += distribution;
    }
  }

  // Calculate metrics
  const totalCalled = -cashFlows.filter(cf => cf < 0).reduce((a, b) => a + b, 0);

  const grossTvpi = totalDistGross / totalCalled;
  const dpiGross = grossTvpi; // No recycling

  // Carry calculation
  const profit = totalDistGross - totalCalled;
  const carryPaid = Math.max(profit, 0) * carry;
  const totalDistNet = totalDistGross - carryPaid;
  const netTvpi = totalDistNet / totalCalled;
  const dpiNet = netTvpi;

  // Net IRR (carry paid at end)
  const cashFlowsNet = [...cashFlows];
  cashFlowsNet[fundLife] -= carryPaid;
  const irrNet = calculateIRR(cashFlowsNet);

  return {
    totalCalled,
    totalDistGross,
    totalDistNet,
    grossTvpi,
    netTvpi,
    dpiGross,
    dpiNet,
    irrNet: isNaN(irrNet) ? 0 : irrNet,
    carryPaid,
    discoveryOnlyCount: numDiscovery - numConviction,
    convictionCount: numConviction,
    followOnCount: numFollowOn,
  };
}

/**
 * Calculate summary statistics
 */
function calculateSummary(values: number[]): SimulationSummary {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const percentile = (p: number): number => {
    const idx = (p / 100) * (n - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    const weight = idx - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };

  return {
    mean: values.reduce((a, b) => a + b, 0) / n,
    p10: percentile(10),
    p25: percentile(25),
    p50: percentile(50),
    p75: percentile(75),
    p90: percentile(90),
    min: sorted[0],
    max: sorted[n - 1],
  };
}

/**
 * Run Monte Carlo simulation
 */
export function runMonteCarloSimulation(
  params: FundParams,
  numSimulations: number = 5000,
  seed?: number
): MonteCarloResults {
  const rng = new SeededRandom(seed ?? Date.now());

  const simulations: SimulationResult[] = [];

  for (let i = 0; i < numSimulations; i++) {
    simulations.push(simulateFundOnce(params, rng));
  }

  const grossTvpis = simulations.map(s => s.grossTvpi);
  const netTvpis = simulations.map(s => s.netTvpi);
  const dpiNets = simulations.map(s => s.dpiNet);
  const irrNets = simulations.map(s => s.irrNet);

  // Probability calculations
  const probReturnFund = simulations.filter(s => s.netTvpi >= 1.0).length / numSimulations;
  const prob2x = simulations.filter(s => s.netTvpi >= 2.0).length / numSimulations;
  const prob3x = simulations.filter(s => s.netTvpi >= 3.0).length / numSimulations;

  return {
    simulations,
    summary: {
      grossTvpi: calculateSummary(grossTvpis),
      netTvpi: calculateSummary(netTvpis),
      dpiNet: calculateSummary(dpiNets),
      irrNet: calculateSummary(irrNets),
    },
    probReturnFund,
    prob2x,
    prob3x,
    params,
    numSimulations,
  };
}
