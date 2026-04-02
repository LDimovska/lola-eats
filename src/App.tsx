import { useMemo, useState } from 'react'
import type { RecipeLine } from './nutrition-data'
import {
  EGGSHELL_POWDER_ID,
  INGREDIENTS,
  INGREDIENTS_BY_ID,
  MEAT_CATEGORIES,
} from './nutrition-data'
import type {
  ActivityLevel,
  DogProfile,
  EnergyRecommendation,
  GuidelineResult,
  NutritionTotals,
} from './nutrition-utils'
import {
  computeNutrition,
  estimateDailyEnergyRequirement,
  evaluateGuidelines,
  getEffectiveRecipeLines,
} from './nutrition-utils'
import './App.css'

const DEFAULT_DOG_PROFILE: DogProfile = {
  breed: 'Miniature Poodle',
  weightKg: 6,
  ageMonths: 36,
  sex: 'female',
  neuterStatus: 'neutered',
  activityLevel: 'normal',
}

const SAVED_RECIPES_KEY = 'lola-eats-saved-recipes'

export interface SavedRecipe {
  id: string
  name: string
  lines: RecipeLine[]
  createdAt: number
}

interface CookModeState {
  baseLines: RecipeLine[]
}

function loadSavedRecipes(): SavedRecipe[] {
  try {
    const raw = localStorage.getItem(SAVED_RECIPES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedRecipe[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveSavedRecipes(recipes: SavedRecipe[]) {
  localStorage.setItem(SAVED_RECIPES_KEY, JSON.stringify(recipes))
}

const createRecipeLineId = (() => {
  let counter = 0
  return () => {
    counter += 1
    return `line-${Date.now()}-${counter}`
  }
})()

function createEmptyLine(): RecipeLine {
  const firstIngredientId = INGREDIENTS[0]?.id ?? ''
  return {
    id: createRecipeLineId(),
    ingredientId: firstIngredientId,
    grams: 0,
  }
}

function duplicateLines(lines: RecipeLine[]): RecipeLine[] {
  return lines.map((l) => ({ ...l, id: createRecipeLineId() }))
}

function cloneLines(lines: RecipeLine[]): RecipeLine[] {
  return lines.map((line) => ({ ...line }))
}

function isMeatIngredient(ingredientId: string): boolean {
  const ingredient = INGREDIENTS_BY_ID[ingredientId]
  return ingredient ? MEAT_CATEGORIES.includes(ingredient.category) : false
}

function getMeatTotalGrams(lines: RecipeLine[]): number {
  return lines.reduce(
    (sum, line) => (isMeatIngredient(line.ingredientId) ? sum + Math.max(0, line.grams) : sum),
    0,
  )
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10
}

interface DogProfileFormProps {
  profile: DogProfile
  onChange: (profile: DogProfile) => void
}

function DogProfileForm({ profile, onChange }: DogProfileFormProps) {
  const update = (patch: Partial<DogProfile>) => onChange({ ...profile, ...patch })

  return (
    <div className="panel">
      <h2 className="panel-title">Dog profile</h2>
      <p className="panel-description">
        Used to scale daily energy recommendations (WSAVA-style). Suited for Mini Poodle and
        similar small breeds.
      </p>

      <div className="profile-grid">
        <div className="profile-field">
          <label htmlFor="profile-breed" className="profile-label">
            Breed
          </label>
          <input
            id="profile-breed"
            type="text"
            className="recipe-input"
            value={profile.breed}
            onChange={(e) => update({ breed: e.target.value.trim() || 'Miniature Poodle' })}
            placeholder="e.g. Miniature Poodle"
          />
        </div>

        <div className="profile-field">
          <label htmlFor="profile-weight" className="profile-label">
            Weight (kg)
          </label>
          <input
            id="profile-weight"
            type="number"
            min={1}
            max={60}
            step={0.5}
            className="recipe-input"
            value={profile.weightKg > 0 ? profile.weightKg : ''}
            onChange={(e) => {
              const v = e.target.value === '' ? 0 : Number(e.target.value)
              update({ weightKg: Number.isNaN(v) ? 0 : v })
            }}
          />
        </div>

        <div className="profile-field">
          <label htmlFor="profile-age" className="profile-label">
            Age (months)
          </label>
          <input
            id="profile-age"
            type="number"
            min={1}
            max={240}
            step={1}
            className="recipe-input"
            value={profile.ageMonths > 0 ? profile.ageMonths : ''}
            onChange={(e) => {
              const v = e.target.value === '' ? 0 : Number(e.target.value)
              update({ ageMonths: Number.isNaN(v) ? 0 : Math.max(0, Math.round(v)) })
            }}
            placeholder="e.g. 6, 12, 36"
          />
          <span className="profile-hint">
            e.g. 6 months, 12 = 1 year, 36 = 3 years
          </span>
        </div>

        <div className="profile-field">
          <label htmlFor="profile-sex" className="profile-label">
            Sex
          </label>
          <select
            id="profile-sex"
            className="recipe-select"
            value={profile.sex}
            onChange={(e) => update({ sex: e.target.value as 'male' | 'female' })}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div className="profile-field">
          <label htmlFor="profile-neuter" className="profile-label">
            Neuter status
          </label>
          <select
            id="profile-neuter"
            className="recipe-select"
            value={profile.neuterStatus}
            onChange={(e) => update({ neuterStatus: e.target.value as 'intact' | 'neutered' })}
          >
            <option value="intact">Intact</option>
            <option value="neutered">Neutered</option>
          </select>
        </div>

        <div className="profile-field">
          <label htmlFor="profile-activity" className="profile-label">
            Activity level
          </label>
          <select
            id="profile-activity"
            className="recipe-select"
            value={profile.activityLevel}
            onChange={(e) => update({ activityLevel: e.target.value as ActivityLevel })}
          >
            <option value="inactive">Inactive</option>
            <option value="normal">Normal</option>
            <option value="active">Active</option>
          </select>
        </div>
      </div>
    </div>
  )
}

interface RecipeFormProps {
  lines: RecipeLine[]
  cookMode: boolean
  onChangeLine: (id: string, patch: Partial<RecipeLine>) => void
  onAddLine: () => void
  onAddEggshellAuto: () => void
  onRemoveLine: (id: string) => void
  savedRecipes: SavedRecipe[]
  saveRecipeName: string
  onSaveRecipeNameChange: (name: string) => void
  onSaveRecipe: () => void
  onEditRecipe: (saved: SavedRecipe) => void
  onCookRecipe: (saved: SavedRecipe) => void
  onDeleteSaved: (id: string) => void
  onExitCookMode: () => void
}

function RecipeForm({
  lines,
  cookMode,
  onChangeLine,
  onAddLine,
  onAddEggshellAuto,
  onRemoveLine,
  savedRecipes,
  saveRecipeName,
  onSaveRecipeNameChange,
  onSaveRecipe,
  onEditRecipe,
  onCookRecipe,
  onDeleteSaved,
  onExitCookMode,
}: RecipeFormProps) {
  const hasAutoEggshell = lines.some(
    (l) => l.ingredientId === EGGSHELL_POWDER_ID && l.auto === true,
  )

  return (
    <div className="panel">
      <h2 className="panel-title">Recipe</h2>
      <p className="panel-description">
        Choose ingredients and enter the grams for a single meal. Values are approximate and based
        on common food composition tables.
      </p>
      {cookMode && (
        <p className="cook-mode-note">
          Cook mode is on: edit only meat/organ amounts. Other ingredients auto-scale to keep the
          same recipe balance.
          <button type="button" className="secondary-button" onClick={onExitCookMode}>
            Exit cook mode
          </button>
        </p>
      )}

      <div className="recipe-table" aria-label="Dog recipe ingredients">
        <div className="recipe-header">
          <span>Ingredient</span>
          <span>Amount (g)</span>
          <span aria-hidden="true" />
        </div>
        {lines.map((line) => {
          const isAutoEggshell =
            line.ingredientId === EGGSHELL_POWDER_ID && line.auto === true
          const isMeat = isMeatIngredient(line.ingredientId)
          const readOnlyInCookMode = cookMode && !isMeat && !isAutoEggshell
          const cookEditableRow = cookMode && isMeat
          return (
            <div
              key={line.id}
              className={`recipe-row ${cookEditableRow ? 'recipe-row-editable' : ''}`}
            >
              <select
                className="recipe-select"
                value={line.ingredientId}
                disabled={cookMode}
                onChange={(event) => {
                  const newId = event.target.value || ''
                  onChangeLine(line.id, {
                    ingredientId: newId,
                    ...(newId === EGGSHELL_POWDER_ID ? { auto: true } : { auto: false }),
                  })
                }}
              >
                {INGREDIENTS.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.name}
                  </option>
                ))}
              </select>

              {isAutoEggshell ? (
                <span
                  className="recipe-amount-auto"
                  title="Calculated from meat phosphorus to balance Ca:P"
                >
                  {line.grams > 0 ? line.grams.toFixed(1) : '0'} (auto)
                </span>
              ) : (
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="recipe-input"
                  value={Number.isFinite(line.grams) ? line.grams : ''}
                  disabled={readOnlyInCookMode}
                  onChange={(event) => {
                    const raw = event.target.value
                    const grams = raw === '' ? 0 : Number(raw)
                    onChangeLine(line.id, { grams: Number.isNaN(grams) ? 0 : grams })
                  }}
                />
              )}

              <button
                type="button"
                className="secondary-button"
                onClick={() => onRemoveLine(line.id)}
                disabled={cookMode}
                aria-label="Remove ingredient"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>

      <div className="recipe-actions">
        <button type="button" className="primary-button" onClick={onAddLine} disabled={cookMode}>
          Add ingredient
        </button>
        {!hasAutoEggshell && (
          <button
            type="button"
            className="secondary-button"
            onClick={onAddEggshellAuto}
            disabled={cookMode}
          >
            Add eggshell (auto)
          </button>
        )}
      </div>

      <div className="panel-section">
        <h3 className="panel-subtitle">Save & use recipe</h3>
        <div className="save-recipe-row">
          <input
            type="text"
            className="recipe-input"
            value={saveRecipeName}
            onChange={(e) => onSaveRecipeNameChange(e.target.value)}
            placeholder="Recipe name"
          />
          <button
            type="button"
            className="primary-button"
            onClick={onSaveRecipe}
          >
            Save recipe
          </button>
        </div>
        {savedRecipes.length > 0 && (
          <ul className="saved-list">
            {savedRecipes.map((saved) => (
              <li key={saved.id} className="saved-item">
                <span className="saved-name">{saved.name}</span>
                <div className="saved-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => onEditRecipe(saved)}
                  >
                    Edit recipe
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => onCookRecipe(saved)}
                  >
                    Cook recipe
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => onDeleteSaved(saved.id)}
                    aria-label={`Delete ${saved.name}`}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

interface NutritionSummaryProps {
  totals: NutritionTotals
  hasAnyAmount: boolean
  energy?: EnergyRecommendation | null
}

function NutritionSummary({ totals, hasAnyAmount, energy }: NutritionSummaryProps) {
  if (!hasAnyAmount || totals.totalCalories <= 0) {
    return (
      <div className="panel-section">
        <h3 className="panel-subtitle">Nutrition summary</h3>
        <p className="panel-placeholder">
          Once you add some grams for at least one ingredient, the approximate nutrition for this
          meal will appear here.
        </p>
      </div>
    )
  }

  const pctOfDaily =
    energy?.estKcalPerDay && energy.estKcalPerDay > 0
      ? (totals.totalCalories / energy.estKcalPerDay) * 100
      : null

  return (
    <div className="panel-section">
      <h3 className="panel-subtitle">Nutrition summary</h3>
      <div className="summary-grid">
        <div className="summary-item">
          <span className="summary-label">Total weight</span>
          <span className="summary-value">
            {totals.totalGrams.toFixed(0)} <span className="summary-unit">g</span>
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Approx. calories</span>
          <span className="summary-value">
            {totals.totalCalories.toFixed(0)} <span className="summary-unit">kcal</span>
          </span>
        </div>
        {energy?.estKcalPerDay != null && energy.estKcalPerDay > 0 && (
          <>
            <div className="summary-item">
              <span className="summary-label">Est. daily need</span>
              <span className="summary-value">
                {energy.rangeLowKcalPerDay != null && energy.rangeHighKcalPerDay != null ? (
                  <>
                    {Math.round(energy.rangeLowKcalPerDay)}–
                    {Math.round(energy.rangeHighKcalPerDay)}{' '}
                    <span className="summary-unit">kcal/day</span>
                  </>
                ) : (
                  <>
                    {Math.round(energy.estKcalPerDay)}{' '}
                    <span className="summary-unit">kcal/day</span>
                  </>
                )}
              </span>
            </div>
            {pctOfDaily != null && (
              <div className="summary-item">
                <span className="summary-label">This meal vs daily</span>
                <span className="summary-value">{pctOfDaily.toFixed(0)}%</span>
              </div>
            )}
          </>
        )}
        <div className="summary-item">
          <span className="summary-label">Protein</span>
          <span className="summary-value">
            {totals.proteinGrams.toFixed(1)} g
            <span className="summary-subvalue">
              {' '}
              ({totals.proteinPctCalories.toFixed(0)}
              % of calories)
            </span>
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Fat</span>
          <span className="summary-value">
            {totals.fatGrams.toFixed(1)} g
            <span className="summary-subvalue">
              {' '}
              ({totals.fatPctCalories.toFixed(0)}
              % of calories)
            </span>
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Carbohydrate</span>
          <span className="summary-value">
            {totals.carbGrams.toFixed(1)} g
            <span className="summary-subvalue">
              {' '}
              ({totals.carbPctCalories.toFixed(0)}
              % of calories)
            </span>
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Calcium</span>
          <span className="summary-value">
            {totals.calciumMg.toFixed(0)} <span className="summary-unit">mg</span>
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Phosphorus</span>
          <span className="summary-value">
            {totals.phosphorusMg.toFixed(0)} <span className="summary-unit">mg</span>
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Ca:P ratio</span>
          <span className="summary-value">
            {totals.calciumToPhosphorusRatio != null
              ? totals.calciumToPhosphorusRatio.toFixed(2)
              : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

interface GuidelinePanelProps {
  guidelines: GuidelineResult[]
}

function GuidelinePanel({ guidelines }: GuidelinePanelProps) {
  return (
    <div className="panel-section">
      <h3 className="panel-subtitle">Guidelines</h3>
      {guidelines.length === 0 ? (
        <p className="panel-placeholder">
          Once there is enough nutrition data, approximate guideline notes will appear here.
        </p>
      ) : (
        <ul className="guideline-list">
          {guidelines.map((guideline, index) => (
            <li
              key={`${guideline.title}-${index}`}
              className={`guideline guideline-${guideline.type}`}
            >
              <h4 className="guideline-title">{guideline.title}</h4>
              <p className="guideline-message">{guideline.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function App() {
  const [recipeLines, setRecipeLines] = useState<RecipeLine[]>([createEmptyLine()])
  const [dogProfile, setDogProfile] = useState<DogProfile>(DEFAULT_DOG_PROFILE)
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>(loadSavedRecipes)
  const [saveRecipeName, setSaveRecipeName] = useState('')
  const [cookMode, setCookMode] = useState<CookModeState | null>(null)

  const effectiveLines = useMemo(
    () =>
      getEffectiveRecipeLines(
        recipeLines.map((line) => ({
          ...line,
          grams: Number.isFinite(line.grams) ? line.grams : 0,
        })),
        dogProfile.ageMonths,
      ),
    [recipeLines, dogProfile.ageMonths],
  )

  const hasAnyAmount = effectiveLines.some((line) => line.grams > 0)

  const totals = useMemo(() => computeNutrition(effectiveLines), [effectiveLines])

  const energy = useMemo(
    () => estimateDailyEnergyRequirement(dogProfile),
    [dogProfile],
  )

  const guidelines = useMemo(
    () =>
      evaluateGuidelines(totals, {
        profile: dogProfile,
        energy,
      }),
    [totals, dogProfile, energy],
  )

  const handleChangeLine = (id: string, patch: Partial<RecipeLine>) => {
    if (!cookMode) {
      setRecipeLines((current) =>
        current.map((line) => (line.id === id ? { ...line, ...patch } : line)),
      )
      return
    }

    setRecipeLines((current) => {
      const target = current.find((line) => line.id === id)
      if (!target) return current

      const targetIsMeat = isMeatIngredient(target.ingredientId)
      const isChangingGrams = Object.prototype.hasOwnProperty.call(patch, 'grams')
      const isChangingIngredient = Object.prototype.hasOwnProperty.call(patch, 'ingredientId')

      // In cook mode, ingredient composition is locked. Only meat grams can be edited.
      if (isChangingIngredient) return current
      if (isChangingGrams && !targetIsMeat) return current

      const next = current.map((line) => (line.id === id ? { ...line, ...patch } : { ...line }))

      const baseById = new Map(cookMode.baseLines.map((line) => [line.id, line]))
      const baseMeatTotal = getMeatTotalGrams(cookMode.baseLines)
      const currentMeatTotal = getMeatTotalGrams(next)
      const scale = baseMeatTotal > 0 ? currentMeatTotal / baseMeatTotal : 1

      return next.map((line) => {
        const baseLine = baseById.get(line.id)
        if (!baseLine) return line
        if (line.ingredientId === EGGSHELL_POWDER_ID && line.auto) return line
        if (isMeatIngredient(line.ingredientId)) return line
        return { ...line, grams: roundToTenth(baseLine.grams * scale) }
      })
    })
  }

  const handleAddLine = () => {
    if (cookMode) return
    setRecipeLines((current) => [...current, createEmptyLine()])
  }

  const handleRemoveLine = (id: string) => {
    if (cookMode) return
    setRecipeLines((current) => current.filter((line) => line.id !== id))
  }

  const handleAddEggshellAuto = () => {
    if (cookMode) return
    if (recipeLines.some((l) => l.ingredientId === EGGSHELL_POWDER_ID && l.auto)) return
    setRecipeLines((current) => [
      ...current,
      {
        id: createRecipeLineId(),
        ingredientId: EGGSHELL_POWDER_ID,
        grams: 0,
        auto: true,
      },
    ])
  }

  const handleSaveRecipe = () => {
    const name = saveRecipeName.trim() || `Recipe ${new Date().toLocaleDateString()}`
    const saved: SavedRecipe = {
      id: `saved-${Date.now()}`,
      name,
      lines: recipeLines.map((l) => ({ ...l })),
      createdAt: Date.now(),
    }
    setSavedRecipes((prev) => {
      const next = [...prev, saved]
      saveSavedRecipes(next)
      return next
    })
    setSaveRecipeName('')
  }

  const handleEditRecipe = (saved: SavedRecipe) => {
    setRecipeLines(duplicateLines(saved.lines))
    setCookMode(null)
  }

  const handleCookRecipe = (saved: SavedRecipe) => {
    const loaded = duplicateLines(saved.lines)
    setRecipeLines(loaded)
    setCookMode({
      baseLines: cloneLines(loaded),
    })
  }

  const handleExitCookMode = () => {
    setCookMode(null)
  }

  const handleDeleteSaved = (id: string) => {
    setSavedRecipes((prev) => {
      const next = prev.filter((r) => r.id !== id)
      saveSavedRecipes(next)
      return next
    })
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Lola Eats</h1>
        <p className="app-subtitle">
          A small helper tool to roughly check the nutrition and balance of home-prepared dog meals.
          These numbers are approximate and not a substitute for veterinary advice.
        </p>
      </header>

      <main className="app-main">
        <section className="app-column">
          <DogProfileForm profile={dogProfile} onChange={setDogProfile} />
          <RecipeForm
            lines={effectiveLines}
            cookMode={Boolean(cookMode)}
            onChangeLine={handleChangeLine}
            onAddLine={handleAddLine}
            onAddEggshellAuto={handleAddEggshellAuto}
            onRemoveLine={handleRemoveLine}
            savedRecipes={savedRecipes}
            saveRecipeName={saveRecipeName}
            onSaveRecipeNameChange={setSaveRecipeName}
            onSaveRecipe={handleSaveRecipe}
            onEditRecipe={handleEditRecipe}
            onCookRecipe={handleCookRecipe}
            onDeleteSaved={handleDeleteSaved}
            onExitCookMode={handleExitCookMode}
          />
        </section>

        <section className="app-column">
          <div className="panel">
            <h2 className="panel-title">Nutrition & guidelines</h2>
            <NutritionSummary
              totals={totals}
              hasAnyAmount={hasAnyAmount}
              energy={energy}
            />
            <GuidelinePanel guidelines={guidelines} />
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <p className="disclaimer">
          This app uses simplified ingredient data and broad, non-veterinary guidelines. Always
          consult a qualified veterinary nutritionist before relying on any homemade diet.
        </p>
      </footer>
    </div>
  )
}

export default App
