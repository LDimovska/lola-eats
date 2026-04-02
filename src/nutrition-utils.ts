import type { Ingredient, RecipeLine } from './nutrition-data'
import {
  EGGSHELL_POWDER_ID,
  INGREDIENTS_BY_ID,
  MEAT_CATEGORIES,
} from './nutrition-data'

export interface NutritionTotals {
  totalGrams: number
  totalCalories: number
  proteinGrams: number
  fatGrams: number
  carbGrams: number
  calciumMg: number
  phosphorusMg: number
  caloriesFromProtein: number
  caloriesFromFat: number
  caloriesFromCarb: number
  proteinPctCalories: number
  fatPctCalories: number
  carbPctCalories: number
  calciumToPhosphorusRatio: number | null
}

export type GuidelineType = 'ok' | 'warning' | 'info'

export interface GuidelineResult {
  type: GuidelineType
  title: string
  message: string
}

/**
 * Simple profile for your dog, used to scale energy recommendations.
 *
 * Energy calculations follow WSAVA-style maintenance energy ranges:
 * - Inactive adult: ~95 kcal × BWkg^0.75
 * - Active adult: ~130 kcal × BWkg^0.75
 * See: "Calorie Ranges for an Average Healthy Adult Dog in Ideal Body Condition"
 * (WSAVA Global Nutrition Committee, updated July 2020).
 */
export type ActivityLevel = 'inactive' | 'normal' | 'active'

export interface DogProfile {
  breed: string
  weightKg: number
  /** Age in months (e.g. 6 for 6 months, 36 for 3 years). */
  ageMonths: number
  sex: 'male' | 'female'
  neuterStatus: 'intact' | 'neutered'
  activityLevel: ActivityLevel
}

export interface EnergyRecommendation {
  estKcalPerDay: number | null
  rangeLowKcalPerDay: number | null
  rangeHighKcalPerDay: number | null
}

const EMPTY_TOTALS: NutritionTotals = {
  totalGrams: 0,
  totalCalories: 0,
  proteinGrams: 0,
  fatGrams: 0,
  carbGrams: 0,
  calciumMg: 0,
  phosphorusMg: 0,
  caloriesFromProtein: 0,
  caloriesFromFat: 0,
  caloriesFromCarb: 0,
  proteinPctCalories: 0,
  fatPctCalories: 0,
  carbPctCalories: 0,
  calciumToPhosphorusRatio: null,
}

export function computeNutrition(
  recipeLines: RecipeLine[],
  customIngredients?: Ingredient[],
): NutritionTotals {
  if (!recipeLines.length) {
    return { ...EMPTY_TOTALS }
  }

  const ingredientById: Record<string, Ingredient> = customIngredients
    ? customIngredients.reduce((acc, ingredient) => {
        acc[ingredient.id] = ingredient
        return acc
      }, {} as Record<string, Ingredient>)
    : INGREDIENTS_BY_ID

  const totals: NutritionTotals = { ...EMPTY_TOTALS }

  for (const line of recipeLines) {
    if (!line.ingredientId || line.grams <= 0) continue
    const ingredient = ingredientById[line.ingredientId]
    if (!ingredient) continue

    const factor = line.grams / 100

    totals.totalGrams += line.grams
    totals.totalCalories += ingredient.caloriesPer100g * factor
    totals.proteinGrams += ingredient.proteinPer100g * factor
    totals.fatGrams += ingredient.fatPer100g * factor
    totals.carbGrams += ingredient.carbPer100g * factor
    totals.calciumMg += ingredient.calciumMgPer100g * factor
    totals.phosphorusMg += ingredient.phosphorusMgPer100g * factor
  }

  // Derive calories from macros for percentage calculations.
  totals.caloriesFromProtein = totals.proteinGrams * 4
  totals.caloriesFromFat = totals.fatGrams * 9
  totals.caloriesFromCarb = totals.carbGrams * 4

  const macroCalories =
    totals.caloriesFromProtein + totals.caloriesFromFat + totals.caloriesFromCarb

  const baseCalories = totals.totalCalories || macroCalories

  if (baseCalories > 0) {
    totals.proteinPctCalories = (totals.caloriesFromProtein / baseCalories) * 100
    totals.fatPctCalories = (totals.caloriesFromFat / baseCalories) * 100
    totals.carbPctCalories = (totals.caloriesFromCarb / baseCalories) * 100
  }

  if (totals.phosphorusMg > 0) {
    totals.calciumToPhosphorusRatio = totals.calciumMg / totals.phosphorusMg
  } else {
    totals.calciumToPhosphorusRatio = null
  }

  return totals
}

/**
 * Ca:P target used for eggshell auto-calculation.
 *
 * Growth/pup diets generally require higher Ca and P targets than adult diets.
 * For your mini poodle, we switch to adult ratio at `MINI_Poodle_ADULT_CUTOFF_MONTHS`.
 *
 * These are simplified educational targets (not vet-calculated formulation).
 */
const GROWTH_CA_P_RATIO = 2
const ADULT_CA_P_RATIO = 1.2
const MINI_PUPPY_ADULT_CUTOFF_MONTHS = 12

function getTargetCaPRatio(ageMonths: number): number {
  if (!Number.isFinite(ageMonths) || ageMonths <= 0) return ADULT_CA_P_RATIO
  return ageMonths < MINI_PUPPY_ADULT_CUTOFF_MONTHS ? GROWTH_CA_P_RATIO : ADULT_CA_P_RATIO
}

/**
 * Returns recipe lines with auto eggshell powder amount computed from meat phosphorus.
 * Only lines with ingredientId === EGGSHELL_POWDER_ID and auto === true are updated;
 * phosphorus from ingredients in MEAT_CATEGORIES is used to compute required calcium.
 */
export function getEffectiveRecipeLines(lines: RecipeLine[], ageMonths: number): RecipeLine[] {
  const autoEggshellIndex = lines.findIndex(
    (l) => l.ingredientId === EGGSHELL_POWDER_ID && l.auto === true,
  )
  if (autoEggshellIndex < 0) return lines

  const meatIds = new Set(
    Object.values(INGREDIENTS_BY_ID)
      .filter((i) => MEAT_CATEGORIES.includes(i.category))
      .map((i) => i.id),
  )

  let phosphorusFromMeatMg = 0
  let calciumFromOthersMg = 0

  for (let i = 0; i < lines.length; i++) {
    if (i === autoEggshellIndex) continue
    const line = lines[i]
    const ing = INGREDIENTS_BY_ID[line.ingredientId]
    if (!ing || line.grams <= 0) continue
    const factor = line.grams / 100
    if (meatIds.has(line.ingredientId)) {
      phosphorusFromMeatMg += ing.phosphorusMgPer100g * factor
    }
    calciumFromOthersMg += ing.calciumMgPer100g * factor
  }

  const targetCaPRatio = getTargetCaPRatio(ageMonths)
  const requiredCalciumMg = phosphorusFromMeatMg * targetCaPRatio
  const needCalciumMg = requiredCalciumMg - calciumFromOthersMg
  const eggshellIng = INGREDIENTS_BY_ID[EGGSHELL_POWDER_ID]
  const caPer100g = eggshellIng?.calciumMgPer100g ?? 40000
  const gramsEggshell =
    needCalciumMg <= 0 ? 0 : (needCalciumMg / caPer100g) * 100
  const rounded = Math.round(gramsEggshell * 10) / 10

  const result = lines.slice()
  result[autoEggshellIndex] = {
    ...lines[autoEggshellIndex],
    grams: rounded,
  }
  return result
}

const MIN_PROFILE_WEIGHT_KG = 1
const MAX_PROFILE_WEIGHT_KG = 60

function clampWeightKg(weightKg: number): number {
  if (!Number.isFinite(weightKg)) return 0
  if (weightKg < MIN_PROFILE_WEIGHT_KG) return MIN_PROFILE_WEIGHT_KG
  if (weightKg > MAX_PROFILE_WEIGHT_KG) return MAX_PROFILE_WEIGHT_KG
  return weightKg
}

/**
 * Estimate daily energy requirements (kcal/day) based on WSAVA-style MER.
 *
 * We use:
 * - Low end of range: 95 kcal × BWkg^0.75  (inactive adult)
 * - High end of range: 130 kcal × BWkg^0.75 (active adult)
 * - Central estimate depends on activity level:
 *   - inactive: 95
 *   - normal: midpoint between 95 and 130 (~112.5)
 *   - active: 130
 *
 * This is intentionally simple and meant for rough checking only.
 */
export function estimateDailyEnergyRequirement(profile: DogProfile): EnergyRecommendation {
  const weightKg = clampWeightKg(profile.weightKg)

  if (!weightKg || weightKg <= 0) {
    return {
      estKcalPerDay: null,
      rangeLowKcalPerDay: null,
      rangeHighKcalPerDay: null,
    }
  }

  const bw075 = Math.pow(weightKg, 0.75)
  const low = 95 * bw075
  const high = 130 * bw075

  let factor: number
  switch (profile.activityLevel) {
    case 'inactive':
      factor = 95
      break
    case 'active':
      factor = 130
      break
    default:
      factor = (95 + 130) / 2
  }

  const est = factor * bw075

  return {
    estKcalPerDay: est,
    rangeLowKcalPerDay: low,
    rangeHighKcalPerDay: high,
  }
}

export interface GuidelineContext {
  profile?: DogProfile
  energy?: EnergyRecommendation | null
}


export function evaluateGuidelines(
  totals: NutritionTotals,
  context?: GuidelineContext,
): GuidelineResult[] {
  const results: GuidelineResult[] = []

  if (totals.totalGrams <= 0 || totals.totalCalories <= 0) {
    results.push({
      type: 'info',
      title: 'No recipe yet',
      message: 'Add some ingredients and amounts to see nutrition and guidelines.',
    })
    return results
  }

  const macroCalories =
    totals.caloriesFromProtein + totals.caloriesFromFat + totals.caloriesFromCarb

  if (macroCalories <= 0) {
    results.push({
      type: 'info',
      title: 'Not enough macro data',
      message:
        'The current ingredients do not have enough macro information to estimate protein, fat, and carbohydrate balance.',
    })
  } else {
    const p = totals.proteinPctCalories
    const f = totals.fatPctCalories
    const c = totals.carbPctCalories

    results.push({
      type: 'info',
      title: 'Macronutrient balance (approximate)',
      message: `About ${p.toFixed(0)}% of calories from protein, ${f.toFixed(
        0,
      )}% from fat, and ${c.toFixed(
        0,
      )}% from carbohydrate. These are approximate values for rough checking only.`,
    })

    if (p < 20) {
      results.push({
        type: 'warning',
        title: 'Low protein',
        message:
          'Protein provides less than about 20% of calories. Many dogs do better with higher protein diets; consider increasing lean meat or egg.',
      })
    } else if (p > 50) {
      results.push({
        type: 'warning',
        title: 'Very high protein',
        message:
          'Protein provides more than about 50% of calories. This is not always a problem, but it can be intense for some dogs; consider balancing with appropriate fat and carbohydrate sources.',
      })
    }

    if (f < 10) {
      results.push({
        type: 'warning',
        title: 'Very low fat',
        message:
          'Fat provides less than about 10% of calories. Some fat is useful for energy and palatability; consider adding an appropriate fat source (for example fish oil).',
      })
    } else if (f > 60) {
      results.push({
        type: 'warning',
        title: 'Very high fat',
        message:
          'Fat provides more than about 60% of calories. Very high-fat meals can be hard on the pancreas and stomach; discuss with your vet if you are aiming for a very high-fat diet.',
      })
    }
  }

  if (totals.calciumMg <= 0 && totals.phosphorusMg <= 0) {
    results.push({
      type: 'info',
      title: 'No calcium/phosphorus data',
      message:
        'This recipe does not currently include ingredients with calcium and phosphorus data. Balanced calcium and phosphorus are important, especially for growing dogs.',
    })
  } else if (totals.phosphorusMg <= 0 && totals.calciumMg > 0) {
    results.push({
      type: 'warning',
      title: 'Calcium without phosphorus',
      message:
        'Calcium appears in the recipe but phosphorus is very low or missing. Dogs need both; most real-world recipes will have some phosphorus from meat, organs, or grains.',
    })
  } else if (totals.calciumToPhosphorusRatio != null) {
    const ratio = totals.calciumToPhosphorusRatio

    if (ratio < 1) {
      results.push({
        type: 'warning',
        title: 'Low calcium relative to phosphorus',
        message:
          'The calcium-to-phosphorus ratio is below 1:1. Many guidelines suggest keeping Ca:P at least around 1.1–1.2:1 for adult dogs; consider adding an appropriate calcium source.',
      })
    } else if (ratio > 2) {
      results.push({
        type: 'warning',
        title: 'High calcium relative to phosphorus',
        message:
          'The calcium-to-phosphorus ratio appears to be above about 2:1. Excessive calcium relative to phosphorus can also be problematic, especially for growing dogs.',
      })
    } else {
      results.push({
        type: 'ok',
        title: 'Calcium to phosphorus ratio is in a broad acceptable range',
        message:
          'The estimated calcium-to-phosphorus ratio is roughly between 1:1 and 2:1. This is a broad, approximate range often suggested for adult dogs in resources such as NRC and WSAVA. Always confirm with a qualified veterinary nutrition resource for your specific dog.',
      })
    }
  }

  const energy = context?.energy
  const profile = context?.profile

  if (energy?.estKcalPerDay && energy.estKcalPerDay > 0 && totals.totalCalories > 0) {
    const pctOfDaily = (totals.totalCalories / energy.estKcalPerDay) * 100

    const weightPart =
      profile && Number.isFinite(profile.weightKg) && profile.weightKg > 0
        ? ` for a dog of about ${profile.weightKg.toFixed(1)} kg`
        : ''

    const lowerBreed = profile?.breed.toLowerCase() ?? ''
    const breedQualifier = lowerBreed.includes('poodle') ? ' poodle' : ''

    results.push({
      type: 'info',
      title: 'Energy compared with estimated daily needs',
      message: `If this meal were fed once per day, it would provide roughly ${pctOfDaily.toFixed(
        0,
      )}% of the estimated daily calories for a${breedQualifier}${weightPart} with a ${
        profile?.activityLevel ?? 'normal'
      } activity level. This estimate is based on WSAVA-style maintenance energy ranges and is meant for rough checking only.`,
    })
  }

  results.push({
    type: 'info',
    title: 'Important note',
    message:
      'These numbers are approximate and for educational use only. They are not a substitute for a complete diet formulation by a qualified veterinary nutritionist or for official guidelines from bodies such as AAFCO, NRC, or WSAVA.',
  })

  return results
}

