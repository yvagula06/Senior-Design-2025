# Dish Name Variant Generation Rules

## Purpose
Generate 5-10 textual variants per canonical dish to maximize retrieval accuracy for embedding-based similarity search. Variants should reflect **real user phrasing** while maintaining semantic accuracy.

---

## General Rules for Variant Generation

### Rule 1: Include Natural Language Variations
Users don't always use formal dish names. Include conversational phrasings.

**Examples:**
- Canonical: "Chicken Tikka Masala"
- Variants: "tikka masala", "chicken tikka", "that Indian chicken curry"

### Rule 2: Add Cuisine Context When Ambiguous
If the dish name alone is ambiguous, include cuisine qualifiers.

**Examples:**
- Canonical: "Fried Rice"
- Variants: "Chinese fried rice", "Asian fried rice", "vegetable fried rice"

### Rule 3: Include Style/Preparation Cues
Users often describe how food is prepared rather than using the formal name.

**Examples:**
- Canonical: "Chicken Parmesan"
- Variants: "breaded chicken with marinara", "chicken parm", "Italian breaded chicken"

### Rule 4: Add Common Misspellings (Strategic Only)
Include **predictable** misspellings that embeddings might not catch.

**Examples:**
- Canonical: "Fettuccine Alfredo"
- Variants: "fetuccini alfredo", "fettucine alfredo" (common typos)

**⚠️ Don't overdo this:** Embeddings are already robust to minor spelling variations.

### Rule 5: Use Abbreviations and Short Forms
Users often use shortened versions.

**Examples:**
- Canonical: "Bacon, Lettuce, and Tomato Sandwich"
- Variants: "BLT", "BLT sandwich", "bacon lettuce tomato"

### Rule 6: Include "With" Phrases for Default Components
Users might specify obvious ingredients.

**Examples:**
- Canonical: "Cheeseburger"
- Variants: "burger with cheese", "hamburger with cheese", "beef burger with cheese"

### Rule 7: Avoid Ingredient Overspecification
**❌ Don't add ingredients not implied by the dish name.**

**Bad Example:**
- Canonical: "Caesar Salad"
- ❌ Variant: "caesar salad with anchovies" (anchovies are optional, not default)

**Good Example:**
- Canonical: "Caesar Salad"
- ✅ Variants: "caesar", "chicken caesar", "caesar salad without chicken"

### Rule 8: Include Regional/Brand Terms (When Universal)
If a brand name has become synonymous with the dish, include it.

**Examples:**
- Canonical: "Cola Soft Drink"
- Variants: "coke", "coca cola", "cola"

**⚠️ Caution:** Only for dishes where brand = category (Band-Aid effect)

### Rule 9: Include Portion/Size Context (When Relevant)
For dishes where users specify size.

**Examples:**
- Canonical: "Medium French Fries"
- Variants: "medium fries", "regular fries", "fries medium size"

### Rule 10: Use Negative Qualifiers Sparingly
Only include "without X" if it's a common request.

**Examples:**
- Canonical: "Plain Hamburger"
- Variants: "hamburger no cheese", "burger without cheese"

---

## Variant Generation Framework

### For Each Canonical Dish, Generate:

1. **Exact Lowercase** (normalized)
2. **Shortened Form** (if applicable)
3. **Cuisine + Dish** (if ambiguous)
4. **Preparation Style** (if applicable)
5. **Common Synonym** (if exists)
6. **"With" Phrase** (for obvious ingredients)
7. **Conversational Form** (how users actually say it)
8. **Related Search** (semantically close)

**Target:** 5-10 variants per dish

---

## Concrete Examples

### Example 1: Chicken Tikka Masala

**Canonical Name:** "Chicken Tikka Masala"

**Generated Variants:**
1. `chicken tikka masala` ← exact lowercase
2. `tikka masala` ← shortened (chicken implied)
3. `chicken tikka` ← further shortened
4. `Indian butter chicken` ← common conflation
5. `butter chicken` ← related dish users confuse
6. `creamy chicken curry` ← descriptive style
7. `tikka curry` ← informal shortening
8. `Indian chicken curry with tomato cream sauce` ← verbose user search

**Rationale:**
- Users often conflate tikka masala with butter chicken
- "Creamy" is a common descriptor users search by
- Shortened forms reflect casual conversation

---

### Example 2: Cheeseburger

**Canonical Name:** "Cheeseburger"

**Generated Variants:**
1. `cheeseburger` ← exact lowercase
2. `cheese burger` ← space variation
3. `burger with cheese` ← natural phrasing
4. `hamburger with cheese` ← technical term
5. `beef burger with cheese` ← protein specified
6. `cheeseburger sandwich` ← redundant but common
7. `burger` ← ultra-short (risky, but users do this)
8. `classic cheeseburger` ← style qualifier

**Rationale:**
- "Burger" alone is risky (could match veggie burger) but users search this way
- "Hamburger with cheese" is technically correct but less common
- "Classic" helps distinguish from specialty burgers

---

### Example 3: Pad Thai

**Canonical Name:** "Pad Thai"

**Generated Variants:**
1. `pad thai` ← exact lowercase
2. `pad thai noodles` ← ingredient specified
3. `Thai noodles` ← cuisine + category
4. `Thai rice noodles` ← more specific
5. `pad thai with chicken` ← common protein (even if not in canonical)
6. `pad thai with shrimp` ← another common protein
7. `phat thai` ← alternate romanization
8. `stir fried Thai noodles` ← descriptive preparation

**Rationale:**
- "Pad Thai" has multiple romanizations
- Users often specify protein even though it varies
- Descriptive form helps non-Thai speakers

**⚠️ Note on proteins:** Include "with chicken" and "with shrimp" as variants IF your canonical dish is a base version. If you have separate canonical entries for each protein, don't cross-contaminate.

---

### Example 4: Caesar Salad

**Canonical Name:** "Caesar Salad"

**Generated Variants:**
1. `caesar salad` ← exact lowercase
2. `caesar` ← ultra-short
3. `ceasar salad` ← common misspelling
4. `cesar salad` ← another misspelling
5. `romaine lettuce salad with parmesan` ← ingredient-based
6. `caesar salad without chicken` ← negative qualifier
7. `classic caesar salad` ← style qualifier
8. `caesar side salad` ← portion context

**Rationale:**
- "Caesar" is commonly misspelled (ceasar, cesar)
- Users specify "without chicken" when they want the base version
- "Classic" helps distinguish from variations (e.g., kale caesar)

---

### Example 5: Margherita Pizza

**Canonical Name:** "Margherita Pizza"

**Generated Variants:**
1. `margherita pizza` ← exact lowercase
2. `margherita` ← shortened
3. `margarita pizza` ← common misspelling (drink confusion)
4. `fresh mozzarella pizza` ← key ingredient
5. `tomato basil pizza` ← ingredient description
6. `pizza margherita` ← Italian word order
7. `cheese and tomato pizza` ← simple description
8. `classic Italian pizza` ← style + cuisine

**Rationale:**
- "Margarita" misspelling is extremely common (drink vs. pizza)
- Ingredient-based searches are common for simple pizzas
- Italian word order variant captures bilingual searches

---

### Example 6: General Tso's Chicken

**Canonical Name:** "General Tso's Chicken"

**Generated Variants:**
1. `general tso's chicken` ← exact lowercase
2. `general tso chicken` ← without possessive
3. `general tao chicken` ← alternate romanization
4. `general gau chicken` ← another romanization
5. `general's chicken` ← shortened possessive
6. `sweet and spicy fried chicken` ← descriptive style
7. `Chinese crispy chicken` ← cuisine + texture
8. `tso chicken` ← ultra-short

**Rationale:**
- Multiple romanizations from Chinese (Tso, Tao, Gau)
- Descriptive form helps users unfamiliar with the name
- Possessive variations are common

---

### Example 7: Eggs Benedict

**Canonical Name:** "Eggs Benedict"

**Generated Variants:**
1. `eggs benedict` ← exact lowercase
2. `eggs benny` ← common nickname
3. `poached eggs with hollandaise` ← preparation + sauce
4. `eggs on english muffin with hollandaise` ← full description
5. `benedict` ← ultra-short
6. `eggs benedict with ham` ← traditional protein
7. `classic eggs benedict` ← style qualifier
8. `hollandaise eggs` ← sauce-focused

**Rationale:**
- "Eggs benny" is widely used slang
- Hollandaise is the distinguishing feature
- Descriptive versions help users unfamiliar with the name

---

### Example 8: Pho

**Canonical Name:** "Pho" (Vietnamese Noodle Soup)

**Generated Variants:**
1. `pho` ← exact lowercase
2. `pho soup` ← redundant but users add it
3. `Vietnamese noodle soup` ← cuisine + category
4. `Vietnamese beef noodle soup` ← common protein
5. `pho bo` ← Vietnamese term for beef pho
6. `pho ga` ← Vietnamese term for chicken pho
7. `Vietnamese soup with noodles` ← natural phrasing
8. `rice noodle soup` ← noodle type specified

**Rationale:**
- Many users add "soup" even though pho already means soup
- Protein variants are common (bo = beef, ga = chicken)
- Descriptive variants help non-Vietnamese speakers

---

## Edge Cases to Avoid

### ❌ Edge Case 1: Over-Specifying Optional Ingredients

**Bad Example:**
- Canonical: "Greek Salad"
- ❌ Variant: "greek salad with olives and feta" ← these are standard, not optional

**Why It's Bad:** Creates noise. Users searching "greek salad" already expect these ingredients.

**Good Approach:**
- ✅ Variant: "greek salad" (let embeddings handle the standard ingredients)

---

### ❌ Edge Case 2: Creating Variants That Match Other Dishes

**Bad Example:**
- Canonical: "Chicken Caesar Salad"
- ❌ Variant: "chicken salad" ← this is a DIFFERENT dish (mayo-based)

**Why It's Bad:** Ambiguous variant will retrieve wrong dish.

**Good Approach:**
- ✅ Variant: "caesar salad with chicken" (keeps "caesar" to disambiguate)

---

### ❌ Edge Case 3: Brand Names That Aren't Universal

**Bad Example:**
- Canonical: "Fried Chicken Sandwich"
- ❌ Variant: "chick fil a sandwich" ← too specific to one brand

**Why It's Bad:** This should be a separate canonical dish if the nutrition differs.

**Good Approach:**
- ✅ Variant: "fried chicken sandwich" (generic)
- ✅ Create separate canonical: "Chick-fil-A Chicken Sandwich" (if data available)

---

### ❌ Edge Case 4: Including Customization Options

**Bad Example:**
- Canonical: "Burrito"
- ❌ Variant: "burrito with sour cream" ← customization, not a variant

**Why It's Bad:** Toppings vary; they're not part of the canonical dish.

**Good Approach:**
- ✅ Variant: "burrito" (base form)
- ✅ Let users add toppings separately in app UI

---

### ❌ Edge Case 5: Creating Variants in Other Languages (Without Strategy)

**Bad Example:**
- Canonical: "Chicken Fajitas"
- ❌ Variant: "fajitas de pollo" ← Spanish translation

**Why It's Bad:** Unless your user base searches in Spanish, this adds noise.

**Good Approach:**
- ✅ Only add non-English variants if:
  - Your embedding model is multilingual
  - You have significant non-English user base
  - The dish is commonly searched in that language in the US (e.g., "pho bo")

---

### ❌ Edge Case 6: Extreme Abbreviations

**Bad Example:**
- Canonical: "Peanut Butter and Jelly Sandwich"
- ❌ Variant: "pb&j", "pbj", "pb and j"

**Why It's Bad:** While valid, abbreviations this extreme might not embed well.

**Good Approach:**
- ✅ Include: "peanut butter jelly sandwich" (words intact)
- ⚠️ Test abbreviations: If your embedding model handles them well, include sparingly

---

### ❌ Edge Case 7: Overly Formal/Technical Names

**Bad Example:**
- Canonical: "French Fries"
- ❌ Variant: "pommes frites" ← too formal

**Why It's Bad:** US users don't search this way.

**Good Approach:**
- ✅ Variant: "fries" (how users actually talk)

---

## Variant Quality Checklist

Before adding a variant, ask:

### ✅ Would a Real User Search This?
- **Yes:** "tikka masala" → ✅ Add
- **No:** "chicken in tomato cream sauce with garam masala" → ❌ Skip

### ✅ Is This Semantically Equivalent?
- **Yes:** "burger with cheese" = "cheeseburger" → ✅ Add
- **No:** "chicken salad" ≠ "chicken caesar salad" → ❌ Skip

### ✅ Does This Avoid Ambiguity?
- **Yes:** "chicken tikka" (unique enough) → ✅ Add
- **No:** "chicken" (too broad) → ❌ Skip

### ✅ Is the Spelling/Grammar Reasonable?
- **Yes:** "ceasar salad" (common typo) → ✅ Add
- **No:** "ceazr slad" (too broken) → ❌ Skip

---

## Implementation Tips

### 1. Start with Top 50 Dishes
Generate variants manually for your most common dishes to establish patterns.

### 2. Use Templates for Similar Dishes
**Template for curries:**
- `{protein} {curry_name}`
- `{curry_name}`
- `{cuisine} {protein} curry`
- `{descriptive_style} {protein} curry`

**Example Applied to "Chicken Tikka Masala":**
- chicken tikka masala ✓
- tikka masala ✓
- indian chicken curry ✓
- creamy chicken curry ✓

### 3. Test with Real User Queries
- Collect anonymous search logs
- Identify unmatched queries
- Add missing variants

### 4. A/B Test Variant Quality
- Track retrieval accuracy
- Remove variants that cause false positives
- Add variants that improve recall

### 5. Balance Precision vs Recall
- **Too few variants:** Users won't find dishes (low recall)
- **Too many variants:** Users get wrong dishes (low precision)
- **Sweet spot:** 7-9 variants per dish

---

## Variant Generation Workflow

```
For each canonical dish:
  1. Write exact lowercase version
  2. Add 2-3 shortened forms (if natural)
  3. Add 1-2 cuisine/style qualifiers (if needed for disambiguation)
  4. Add 1-2 descriptive preparations (how users describe it)
  5. Add 1-2 common synonyms or related terms
  6. Add 1 common misspelling (if predictable)
  7. Review for ambiguity
  8. Test with embedding similarity
  9. Finalize 5-10 variants
```

---

## Example Variant Set (Final Review)

### Good Variant Set ✅
**Canonical:** "Chicken Tikka Masala"

```
1. chicken tikka masala
2. tikka masala
3. chicken tikka
4. indian butter chicken
5. butter chicken
6. creamy chicken curry
7. tikka curry
8. chicken masala
```

**Why It's Good:**
- Covers shortened forms
- Includes common conflation (butter chicken)
- Has descriptive style (creamy)
- All variants are realistic user searches
- No ambiguity with other dishes

---

### Poor Variant Set ❌
**Canonical:** "Chicken Tikka Masala"

```
1. chicken tikka masala
2. chicken
3. curry
4. indian food
5. murgh tikka masala
6. chicken in tomato sauce
7. chicken tikka masala with basmati rice
8. spicy chicken
```

**Why It's Bad:**
- "chicken" and "curry" are too broad (ambiguity)
- "indian food" is a category, not a dish
- "murgh tikka masala" is Hindi (US users won't search this)
- "with basmati rice" specifies a side (not part of canonical)
- "spicy chicken" could match many dishes

---

## Summary

**Key Principles:**
1. Reflect real user language
2. Avoid over-specification
3. Include strategic misspellings
4. Use shortened forms naturally
5. Maintain semantic equivalence
6. Test for ambiguity
7. Target 7-9 variants per dish

**Common Pitfalls:**
- Too broad (ambiguous)
- Too specific (includes customization)
- Other language without strategy
- Brand names that aren't universal
- Over-specifying standard ingredients

Use this guide to generate high-quality variants that maximize retrieval accuracy while minimizing false positives.
