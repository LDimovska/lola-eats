export type IngredientCategory = 'meat' | 'organ' | 'carb' | 'veg' | 'supplement' | 'other'

export interface Ingredient {
  id: string
  name: string
  category: IngredientCategory
  /**
   * Approximate calories per 100g of the raw ingredient.
   */
  caloriesPer100g: number
  /**
   * Grams of protein per 100g.
   */
  proteinPer100g: number
  /**
   * Grams of fat per 100g.
   */
  fatPer100g: number
  /**
   * Grams of carbohydrates per 100g.
   */
  carbPer100g: number
  /**
   * Approximate calcium content in milligrams per 100g.
   */
  calciumMgPer100g: number
  /**
   * Approximate phosphorus content in milligrams per 100g.
   */
  phosphorusMgPer100g: number
}

export interface RecipeLine {
  id: string
  ingredientId: string
  grams: number
  /** When true, grams are computed from meat phosphorus to balance Ca:P (eggshell powder only). */
  auto?: boolean
}

export const EGGSHELL_POWDER_ID = 'eggshell_powder'
export const MEAT_CATEGORIES: IngredientCategory[] = ['meat', 'organ']

export const INGREDIENTS: Ingredient[] = [
  {
    id: 'chicken_thigh',
    name: 'Chicken thigh (raw, no skin)',
    category: 'meat',
    caloriesPer100g: 180,
    proteinPer100g: 20,
    fatPer100g: 11,
    carbPer100g: 0,
    calciumMgPer100g: 12,
    phosphorusMgPer100g: 200,
  },
  {
    id: 'chicken_breast',
    name: 'Chicken breast (raw)',
    category: 'meat',
    caloriesPer100g: 165,
    proteinPer100g: 31,
    fatPer100g: 3.6,
    carbPer100g: 0,
    calciumMgPer100g: 12,
    phosphorusMgPer100g: 220,
  },
  {
    id: 'chicken_heart',
    name: 'Chicken heart (raw)',
    category: 'organ',
    caloriesPer100g: 153,
    proteinPer100g: 16,
    fatPer100g: 9,
    carbPer100g: 0.5,
    calciumMgPer100g: 12,
    phosphorusMgPer100g: 250,
  },
  {
    id: 'beef_muscle',
    name: 'Beef muscle (raw, lean)',
    category: 'meat',
    caloriesPer100g: 250,
    proteinPer100g: 26,
    fatPer100g: 6,
    carbPer100g: 0,
    calciumMgPer100g: 10,
    phosphorusMgPer100g: 200,
  },
  {
    id: 'chicken_liver',
    name: 'Chicken liver (raw)',
    category: 'organ',
    caloriesPer100g: 140,
    proteinPer100g: 21,
    fatPer100g: 5,
    carbPer100g: 2,
    calciumMgPer100g: 12,
    phosphorusMgPer100g: 300,
  },
  {
    id: 'beef_heart',
    name: 'Beef heart (raw)',
    category: 'organ',
    caloriesPer100g: 160,
    proteinPer100g: 20,
    fatPer100g: 8,
    carbPer100g: 0,
    calciumMgPer100g: 10,
    phosphorusMgPer100g: 200,
  },
  {
    id: 'white_rice_cooked',
    name: 'White rice (cooked)',
    category: 'carb',
    caloriesPer100g: 130,
    proteinPer100g: 2.5,
    fatPer100g: 0.3,
    carbPer100g: 28,
    calciumMgPer100g: 10,
    phosphorusMgPer100g: 40,
  },
  {
    id: 'sweet_potato_cooked',
    name: 'Sweet potato (cooked)',
    category: 'veg',
    caloriesPer100g: 90,
    proteinPer100g: 2,
    fatPer100g: 0.1,
    carbPer100g: 21,
    calciumMgPer100g: 30,
    phosphorusMgPer100g: 45,
  },
  {
    id: 'carrot_raw',
    name: 'Carrot (raw)',
    category: 'veg',
    caloriesPer100g: 41,
    proteinPer100g: 0.9,
    fatPer100g: 0.2,
    carbPer100g: 10,
    calciumMgPer100g: 33,
    phosphorusMgPer100g: 35,
  },
  {
    id: 'egg_whole',
    name: 'Egg (whole, raw)',
    category: 'other',
    caloriesPer100g: 143,
    proteinPer100g: 13,
    fatPer100g: 10,
    carbPer100g: 1,
    calciumMgPer100g: 56,
    phosphorusMgPer100g: 198,
  },
  {
    id: 'fish_oil',
    name: 'Fish oil',
    category: 'supplement',
    caloriesPer100g: 900,
    proteinPer100g: 0,
    fatPer100g: 100,
    carbPer100g: 0,
    calciumMgPer100g: 0,
    phosphorusMgPer100g: 0,
  },
  {
    id: 'ground_bone_meal',
    name: 'Ground bone meal',
    category: 'supplement',
    caloriesPer100g: 0,
    proteinPer100g: 0,
    fatPer100g: 0,
    carbPer100g: 0,
    calciumMgPer100g: 20000,
    phosphorusMgPer100g: 10000,
  },
  {
    id: 'peas_cooked',
    name: 'Peas (cooked)',
    category: 'veg',
    caloriesPer100g: 84,
    proteinPer100g: 5.4,
    fatPer100g: 0.2,
    carbPer100g: 15.6,
    calciumMgPer100g: 25,
    phosphorusMgPer100g: 100,
  },
  {
    id: 'green_pepper',
    name: 'Green pepper (raw)',
    category: 'veg',
    caloriesPer100g: 20,
    proteinPer100g: 1,
    fatPer100g: 0.2,
    carbPer100g: 4.6,
    calciumMgPer100g: 10,
    phosphorusMgPer100g: 26,
  },
  {
    id: 'pumpkin_butternut',
    name: 'Pumpkin / butternut squash (cooked)',
    category: 'veg',
    caloriesPer100g: 40,
    proteinPer100g: 0.9,
    fatPer100g: 0.1,
    carbPer100g: 10.5,
    calciumMgPer100g: 21,
    phosphorusMgPer100g: 44,
  },
  {
    id: 'celery_raw',
    name: 'Celery (raw)',
    category: 'veg',
    caloriesPer100g: 14,
    proteinPer100g: 0.7,
    fatPer100g: 0.2,
    carbPer100g: 3,
    calciumMgPer100g: 40,
    phosphorusMgPer100g: 24,
  },
  {
    id: 'egg_boiled',
    name: 'Egg (whole, boiled)',
    category: 'other',
    caloriesPer100g: 155,
    proteinPer100g: 13,
    fatPer100g: 11,
    carbPer100g: 1.1,
    calciumMgPer100g: 50,
    phosphorusMgPer100g: 198,
  },
  {
    id: 'pumpkin_seeds_ground',
    name: 'Pumpkin seeds (ground)',
    category: 'supplement',
    caloriesPer100g: 559,
    proteinPer100g: 30,
    fatPer100g: 49,
    carbPer100g: 10.7,
    calciumMgPer100g: 46,
    phosphorusMgPer100g: 1230,
  },
  {
    id: 'blackberries',
    name: 'Blackberries (raw)',
    category: 'veg',
    caloriesPer100g: 43,
    proteinPer100g: 1.4,
    fatPer100g: 0.5,
    carbPer100g: 9.6,
    calciumMgPer100g: 29,
    phosphorusMgPer100g: 22,
  },
  {
    id: 'raspberries',
    name: 'Raspberries (raw)',
    category: 'veg',
    caloriesPer100g: 52,
    proteinPer100g: 1.2,
    fatPer100g: 0.7,
    carbPer100g: 11.9,
    calciumMgPer100g: 25,
    phosphorusMgPer100g: 29,
  },
  {
    id: 'kefir',
    name: 'Kefir',
    category: 'other',
    caloriesPer100g: 41,
    proteinPer100g: 3.3,
    fatPer100g: 1,
    carbPer100g: 4.5,
    calciumMgPer100g: 130,
    phosphorusMgPer100g: 100,
  },
  {
    id: 'ginger_raw',
    name: 'Ginger (raw)',
    category: 'veg',
    caloriesPer100g: 80,
    proteinPer100g: 1.8,
    fatPer100g: 0.8,
    carbPer100g: 17.8,
    calciumMgPer100g: 16,
    phosphorusMgPer100g: 34,
  },
  {
    id: 'beef_neck',
    name: 'Beef neck',
    category: 'meat',
    caloriesPer100g: 299,
    proteinPer100g: 30,
    fatPer100g: 19,
    carbPer100g: 0,
    calciumMgPer100g: 10,
    phosphorusMgPer100g: 181,
  },
  {
    id: EGGSHELL_POWDER_ID,
    name: 'Eggshell powder (auto from meat P)',
    category: 'supplement',
    caloriesPer100g: 0,
    proteinPer100g: 0,
    fatPer100g: 0,
    carbPer100g: 0,
    calciumMgPer100g: 40000,
    phosphorusMgPer100g: 0,
  },
]

export const INGREDIENTS_BY_ID: Record<string, Ingredient> = INGREDIENTS.reduce(
  (acc, ingredient) => {
    acc[ingredient.id] = ingredient
    return acc
  },
  {} as Record<string, Ingredient>,
)

