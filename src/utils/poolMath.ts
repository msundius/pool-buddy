export function calculatePoolVolume(
  shape: 'round' | 'rectangular' | 'oval',
  dimensions: { diameter?: number; width?: number; length?: number; avgDepth: number }
): number {
  const depth = dimensions.avgDepth || 0;
  if (shape === 'round') {
    const d = dimensions.diameter || 0;
    // Round pool: d * d * depth * 5.9 (pool industry approximation for gallons)
    // Precise: pi * r^2 * depth * 7.4805 = pi * (d/2)^2 * depth * 7.48 = d * d * depth * 5.875
    return Math.round(d * d * depth * 5.875);
  } else if (shape === 'rectangular') {
    const w = dimensions.width || 0;
    const l = dimensions.length || 0;
    // Rectangular pool: l * w * depth * 7.48
    return Math.round(l * w * depth * 7.48);
  } else if (shape === 'oval') {
    const w = dimensions.width || 0;
    const l = dimensions.length || 0;
    // Oval pool: l * w * depth * 5.9 (standard pool approximation, or sometimes length * width * depth * 6.7)
    // Let's use 5.9 which is most common for standard oval pools
    return Math.round(l * w * depth * 5.875);
  }
  return 0;
}

export interface ChemistryCheckResult {
  parameter: 'ph' | 'chlorine' | 'alkalinity' | 'cya' | 'calcium';
  name: string;
  currentValue: number;
  lowTarget: number;
  highTarget: number;
  status: 'ideal' | 'low' | 'high';
  recommendation: string;
  chemicalAdjustment?: {
    chemicalName: string;
    amount: string;
    action: string;
  };
}

export function evaluateChemistry(
  readings: { ph: number; chlorine: number; alkalinity: number; cya: number; calcium: number },
  volumeGallons: number
): ChemistryCheckResult[] {
  const results: ChemistryCheckResult[] = [];
  const safeVolume = volumeGallons || 10000;

  // 1. pH (Ideal 7.2 - 7.6, OK range 7.2 - 7.8, but let's check narrow target of 7.2 - 7.6)
  let phStatus: 'ideal' | 'low' | 'high' = 'ideal';
  let phRec = 'Your pH level is inside the ideal range.';
  let phAdj: ChemistryCheckResult['chemicalAdjustment'] = undefined;

  if (readings.ph < 7.2) {
    phStatus = 'low';
    const diff = 7.4 - readings.ph;
    // 6 oz of Soda Ash (Sodium Carbonate) raises pH by 0.2 in 10,000 gallons
    const sodaAshOz = (safeVolume / 10000) * (diff / 0.2) * 6;
    phRec = `Your pH is acidic. Low pH can cause eye irritation and corrode metal equipment.`;
    phAdj = {
      chemicalName: 'Soda Ash (Sodium Carbonate)',
      amount: sodaAshOz < 1 ? '< 1 oz' : `${sodaAshOz.toFixed(1)} oz`,
      action: 'Dissolve in water, broadcast around pool with pump running.'
    };
  } else if (readings.ph > 7.6) {
    phStatus = 'high';
    const diff = readings.ph - 7.4;
    // 10 fluid oz of Muriatic Acid (31.45%) lowers pH by approx 0.2 in 10,000 gallons
    const acidFlOz = (safeVolume / 10000) * (diff / 0.2) * 10;
    phRec = `Your pH is basic/alkaline. High pH leads to scale formation and reduces chlorine sanitizing power.`;
    phAdj = {
      chemicalName: 'Muriatic Acid (31.45% HCl) or Dry Acid',
      amount: acidFlOz < 1 ? '< 1 oz' : `${acidFlOz.toFixed(1)} fl. oz`,
      action: 'Pour acid directly into pool water in front of a return jet (wear safety goggles!).'
    };
  }
  results.push({
    parameter: 'ph',
    name: 'pH Level',
    currentValue: readings.ph,
    lowTarget: 7.2,
    highTarget: 7.6,
    status: phStatus,
    recommendation: phRec,
    chemicalAdjustment: phAdj
  });

  // 2. Free Chlorine (FC: Ideal 1.0 - 4.0 ppm, or target 3 ppm)
  let fcStatus: 'ideal' | 'low' | 'high' = 'ideal';
  let fcRec = 'Your Free Chlorine is at healthy sanitizing levels.';
  let fcAdj: ChemistryCheckResult['chemicalAdjustment'] = undefined;

  if (readings.chlorine < 1.0) {
    fcStatus = 'low';
    const diff = 3.0 - readings.chlorine; // aim to boost to 3 ppm
    // Liquid Chlorine (12.5%): 10.7 fl oz raises chlorine by 1 ppm in 10,000 gallons
    const liqChlorineOz = (safeVolume / 10000) * diff * 10.7;
    // Cal-Hypo (65%): 2.0 oz raises chlorine by 1 ppm in 10,000 gallons
    const calHypoOz = (safeVolume / 10000) * diff * 2.0;

    fcRec = `Chlorine level is too low to sanitize. Sanitizer deficiency allows algae to bloom and bacteria to spread.`;
    fcAdj = {
      chemicalName: 'Liquid Chlorine (12.5%)',
      amount: `${liqChlorineOz.toFixed(1)} fl. oz (or ${calHypoOz.toFixed(1)} oz of Cal-Hypo shock)`,
      action: 'Add after sunset with the pump running on high to thoroughly distribute.'
    };
  } else if (readings.chlorine > 5.0) {
    fcStatus = 'high';
    fcRec = `Your chlorine level is high. While safe to swim up to 5-8 ppm (depending on CYA), you should stop adding chlorine and let sunlight naturally lower it.`;
    fcAdj = {
      chemicalName: 'None (Sunlight / Airing)',
      amount: '0 oz',
      action: 'Leave the pool cover off during the day. Let UV rays naturally break down the excess chlorine.'
    };
  }
  results.push({
    parameter: 'chlorine',
    name: 'Free Chlorine',
    currentValue: readings.chlorine,
    lowTarget: 1.0,
    highTarget: 4.0,
    status: fcStatus,
    recommendation: fcRec,
    chemicalAdjustment: fcAdj
  });

  // 3. Total Alkalinity (TA: Ideal 80 - 120 ppm)
  let taStatus: 'ideal' | 'low' | 'high' = 'ideal';
  let taRec = 'Total Alkalinity is in equilibrium, protecting your pH from fluctuating.';
  let taAdj: ChemistryCheckResult['chemicalAdjustment'] = undefined;

  if (readings.alkalinity < 80) {
    taStatus = 'low';
    const diff = 100 - readings.alkalinity; // raise to central 100 ppm
    // 22.4 oz (1.4 lbs) of Baking Soda raises alkalinity by 10 ppm in 10,000 gallons
    const bakingSodaLbs = (safeVolume / 10000) * (diff / 10) * 1.4;
    taRec = `Alkalinity is low. This causes rapid pH changes (pH bounce), increasing acidity risks and equipment corrosion.`;
    taAdj = {
      chemicalName: 'Baking Soda (Sodium Bicarbonate)',
      amount: `${bakingSodaLbs.toFixed(1)} lbs`,
      action: 'Broadcast baking soda over pool surface. It is highly safe and dissolves quickly.'
    };
  } else if (readings.alkalinity > 120) {
    taStatus = 'high';
    const diff = readings.alkalinity - 100; // bring down towards 100 ppm
    // Muriatic acid lowers alkalinity (requires 26 oz of acid to lower by 10 ppm in 10,000 gallons)
    const acidForTaFlOz = (safeVolume / 10000) * (diff / 10) * 26;
    taRec = `Alkalinity is high. High alkalinity causes chronic high pH, cloudiness, and scale. Needs Muriatic acid to reduce.`;
    taAdj = {
      chemicalName: 'Muriatic Acid (and Aeration)',
      amount: `${acidForTaFlOz.toFixed(1)} fl. oz`,
      action: 'Add acid to pool to lower alkalinity, then run the pump/aerator to restore pH.'
    };
  }
  results.push({
    parameter: 'alkalinity',
    name: 'Total Alkalinity',
    currentValue: readings.alkalinity,
    lowTarget: 80,
    highTarget: 120,
    status: taStatus,
    recommendation: taRec,
    chemicalAdjustment: taAdj
  });

  // 4. Cyanuric Acid / Stabilizer (CYA: Ideal 30 - 50 ppm for traditional, up to 70-80 for salt pools)
  let cyaStatus: 'ideal' | 'low' | 'high' = 'ideal';
  let cyaRec = 'Stabilizer is adequate. Sunlight won\'t burn off chlorine too quickly.';
  let cyaAdj: ChemistryCheckResult['chemicalAdjustment'] = undefined;

  if (readings.cya < 30) {
    cyaStatus = 'low';
    const diff = 40 - readings.cya; // raise to 40 ppm
    // 13 oz of Cyanuric Acid raises CYA by 10 ppm in 10,000 gallons
    const cyaOz = (safeVolume / 10000) * (diff / 10) * 13;
    cyaRec = `Your stabilizer levels are low. UV rays from sunlight will consume your chlorine in just a few hours.`;
    cyaAdj = {
      chemicalName: 'Cyanuric Acid (Stabilizer / Conditioner)',
      amount: cyaOz < 16 ? `${cyaOz.toFixed(1)} oz` : `${(cyaOz / 16).toFixed(1)} lbs`,
      action: 'Place inside a sock in your skimmer basket or float, or dissolve slowly (takes up to 5 days to dissolve).'
    };
  } else if (readings.cya > 60) {
    cyaStatus = 'high';
    cyaRec = `Your stabilizer level is too high. Excess CYA locks chlorine up (chlorine lock), making it ineffective.`;
    cyaAdj = {
      chemicalName: 'Partial Water Drain & Refill',
      amount: `${Math.round(((readings.cya - 40) / readings.cya) * 100)}% Water Replacement`,
      action: 'Carefully drain a portion of water. For above-ground pools, drain in small steps to avoid collapsing the walls!'
    };
  }
  results.push({
    parameter: 'cya',
    name: 'Cyanuric Acid (CYA)',
    currentValue: readings.cya,
    lowTarget: 30,
    highTarget: 50,
    status: cyaStatus,
    recommendation: cyaRec,
    chemicalAdjustment: cyaAdj
  });

  // 5. Calcium Hardness (Ideal 150 - 250 ppm, vinyl pools can tolerate lower levels but 150+ protects equipment)
  let chStatus: 'ideal' | 'low' | 'high' = 'ideal';
  let chRec = 'Calcium Hardness is in an acceptable range to protect heater/pump fittings.';
  let chAdj: ChemistryCheckResult['chemicalAdjustment'] = undefined;

  if (readings.calcium < 120) {
    chStatus = 'low';
    const diff = 180 - readings.calcium; // raise to 180 ppm
    // 1.2 lbs of Calcium Chloride per 10,000 gallons raises CH by 10 ppm
    const calciumLbs = (safeVolume / 10000) * (diff / 10) * 1.2;
    chRec = `Calcium level is low. While vinyl liners don't bleed calcium, hyper-low calcium can corrode metal ladders, heater exchangers, and screws.`;
    chAdj = {
      chemicalName: 'Calcium Chloride (Hardness Increaser)',
      amount: `${calciumLbs.toFixed(1)} lbs`,
      action: 'Dissolve in a bucket of pool water first, then pour around the deep end.'
    };
  } else if (readings.calcium > 350) {
    chStatus = 'high';
    chRec = `Your Calcium Hardness is high, which can cause scaling and cloudy water. Ensure pH and alkalinity do not stay high to prevent scale.`;
    chAdj = {
      chemicalName: 'None (or Partial Drain)',
      amount: '0 lbs',
      action: 'Keep pH between 7.2-7.4 to prevent calcium scaling. Dilute with fresh soft water if levels exceed 450 ppm.'
    };
  }
  results.push({
    parameter: 'calcium',
    name: 'Calcium Hardness',
    currentValue: readings.calcium,
    lowTarget: 150,
    highTarget: 250,
    status: chStatus,
    recommendation: chRec,
    chemicalAdjustment: chAdj
  });

  return results;
}
