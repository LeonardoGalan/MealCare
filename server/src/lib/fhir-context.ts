type Coding = {
  display?: string;
};

type CodeableConcept = {
  text?: string;
  coding?: Coding[];
};

type Bundle<T> = {
  entry?: Array<{
    resource?: T;
  }>;
};

type ConditionResource = {
  code?: CodeableConcept;
};

type AllergyResource = {
  code?: CodeableConcept;
};

export type FhirDashboardContext = {
  conditions: string[];
  allergies: string[];
  providerSuggestions: string[];
};

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function extractConceptLabel(concept?: CodeableConcept): string | null {
  if (!concept) {
    return null;
  }

  return concept.text || concept.coding?.find((coding) => coding.display)?.display || null;
}

const IRRELEVANT_TERMS = [
  // employment terms, etc
  "employment",
  "not in labor force",
  "labor force",
  "social contact",
  "social isolation",
  "received higher education",
  "primary school education",
  "high school level",
  "educated to",
  "risk activity involvement",
  "housing unsatisfactory",
  "criminal record",
  "refugee",
  "military service",
  "victim of intimate partner",

  // dental, medical history terms
  "gingivitis",
  "dental filling",
  "loss of teeth",
  "impacted molars",
  "infection of tooth",

  "medication review due",
  "history of tubal ligation",
  "history of appendectomy",
  "history of renal transplant",
  "history of coronary artery bypass",
  "abnormal findings diagnostic imaging",

  "viral sinusitis",
  "acute viral pharyngitis",
  "acute infective cystitis",
  "acute bronchitis",

  // musculoskeletal
  "scoliosis",
  "fracture of bone",
  "chronic low back pain",
  "chronic neck pain",
  "chronic pain",

  // other irrelevant to app
  "sepsis",
  "acute respiratory distress",
  "dependent drug abuse",
  "recurrent urinary tract infection",
];

export function isDietRelevant(condition: string): boolean {
  const lower = condition.toLowerCase();
  return !IRRELEVANT_TERMS.some((term) => lower.includes(term));
}

export function extractConditionNames(bundle: Bundle<ConditionResource>): string[] {
  const all = unique(
    bundle.entry?.flatMap((entry) => {
      const label = extractConceptLabel(entry.resource?.code);
      return label ? [label] : [];
    }) || [],
  );
  return all.filter(isDietRelevant);
}

export function extractAllergyNames(bundle: Bundle<AllergyResource>): string[] {
  return unique(
    bundle.entry?.flatMap((entry) => {
      const label = extractConceptLabel(entry.resource?.code);
      return label ? [label] : [];
    }) || [],
  );
}

function hasMatch(values: string[], terms: string[]): boolean {
  const loweredValues = values.map((value) => value.toLowerCase());
  return terms.some((term) =>
    loweredValues.some((value) => value.includes(term)),
  );
}
export type FoodToAvoid = {
  food: string;
  reason: string;
  condition: string;
};

export function buildFoodsToAvoid(
  conditions: string[],
  allergies: string[],
): FoodToAvoid[] {
  const foods: FoodToAvoid[] = [];

  for (const allergy of allergies) {
    const lower = allergy.toLowerCase();

    if (lower.includes("fish")) {
      foods.push({
        food: "Fish and fish products",
        reason: "Known allergy to fish",
        condition: "Fish allergy",
      });
    }
    if (lower.includes("shellfish")) {
      foods.push({
        food: "Shellfish (shrimp, crab, lobster)",
        reason: "Known allergy to shellfish",
        condition: "Shellfish allergy",
      });
    }
    if (lower.includes("peanut")) {
      foods.push({
        food: "Peanuts and peanut products",
        reason: "Known allergy to peanuts",
        condition: "Peanut allergy",
      });
    }
    if (lower.includes("soy")) {
      foods.push({
        food: "Soy products (tofu, soy sauce, edamame)",
        reason: "Known allergy to soy",
        condition: "Soy allergy",
      });
    }
    if (
      lower.includes("milk") ||
      lower.includes("dairy") ||
      lower.includes("lactose")
    ) {
      foods.push({
        food: "Dairy products (milk, cheese, yogurt)",
        reason: "Known dairy allergy or intolerance",
        condition: "Dairy allergy",
      });
    }
    if (lower.includes("egg")) {
      foods.push({
        food: "Eggs and egg-containing products",
        reason: "Known allergy to eggs",
        condition: "Egg allergy",
      });
    }
    if (lower.includes("wheat") || lower.includes("gluten")) {
      foods.push({
        food: "Wheat and gluten-containing products",
        reason: "Known allergy to wheat/gluten",
        condition: "Wheat/Gluten allergy",
      });
    }
    if (
      lower.includes("tree nut") ||
      lower.includes("almond") ||
      lower.includes("walnut") ||
      lower.includes("cashew")
    ) {
      foods.push({
        food: "Tree nuts (almonds, walnuts, cashews)",
        reason: "Known allergy to tree nuts",
        condition: "Tree nut allergy",
      });
    }
    if (lower.includes("aspirin")) {
      foods.push({
        food: "Foods high in salicylates (berries, tomatoes, spices)",
        reason:
          "Aspirin sensitivity may cross-react with salicylate-containing foods",
        condition: "Aspirin sensitivity",
      });
    }
    if (lower.includes("sulfa") || lower.includes("sulfamethoxazole")) {
      foods.push({
        food: "Sulfite-containing foods (dried fruits, wine, pickled foods)",
        reason: "Sulfa sensitivity may cross-react with sulfites in food",
        condition: "Sulfa sensitivity",
      });
    }
  }

  if (hasMatch(conditions, ["dermatitis", "eczema"])) {
    foods.push(
      {
        food: "Dairy products",
        reason: "Common inflammatory trigger for skin conditions",
        condition: "Atopic dermatitis",
      },
      {
        food: "Eggs",
        reason: "Frequent allergen linked to eczema flare-ups",
        condition: "Atopic dermatitis",
      },
      {
        food: "Soy products",
        reason: "Can trigger inflammatory skin responses",
        condition: "Atopic dermatitis",
      },
      {
        food: "Processed foods",
        reason: "Additives and preservatives may worsen skin inflammation",
        condition: "Atopic dermatitis",
      },
      {
        food: "High-sugar foods",
        reason: "Increases inflammation and can trigger flare-ups",
        condition: "Atopic dermatitis",
      },
    );
  }

  if (hasMatch(conditions, ["migraine"])) {
    foods.push(
      {
        food: "Aged cheese",
        reason: "Contains tyramine which can trigger migraines",
        condition: "Chronic migraine",
      },
      {
        food: "Processed meats",
        reason:
          "Nitrates in deli meats and hot dogs are known migraine triggers",
        condition: "Chronic migraine",
      },
      {
        food: "Alcohol (especially red wine)",
        reason: "Histamines and sulfites can trigger migraines",
        condition: "Chronic migraine",
      },
      {
        food: "Artificial sweeteners",
        reason: "Aspartame is a documented migraine trigger",
        condition: "Chronic migraine",
      },
      {
        food: "MSG-containing foods",
        reason: "Monosodium glutamate can trigger headaches",
        condition: "Chronic migraine",
      },
      {
        food: "Excess caffeine",
        reason:
          "Caffeine withdrawal and overconsumption both trigger migraines",
        condition: "Chronic migraine",
      },
    );
  }

  if (hasMatch(conditions, ["stress"])) {
    foods.push(
      {
        food: "Excess caffeine",
        reason: "Stimulates cortisol production and worsens anxiety",
        condition: "Stress",
      },
      {
        food: "High-sugar snacks",
        reason: "Causes blood sugar spikes and crashes that worsen stress",
        condition: "Stress",
      },
      {
        food: "Alcohol",
        reason: "Disrupts sleep and increases cortisol levels",
        condition: "Stress",
      },
      {
        food: "Highly processed foods",
        reason: "Lack of nutrients needed for stress regulation",
        condition: "Stress",
      },
    );
  }

  if (hasMatch(conditions, ["diabetes", "prediabetes"])) {
    foods.push(
      {
        food: "Sugary drinks",
        reason: "Causes rapid blood sugar spikes",
        condition: "Diabetes",
      },
      {
        food: "White bread and refined grains",
        reason: "High glycemic index foods spike blood sugar",
        condition: "Diabetes",
      },
      {
        food: "Candy and sweets",
        reason: "Concentrated sugar with no nutritional value",
        condition: "Diabetes",
      },
      {
        food: "Fruit juice",
        reason: "High sugar concentration without fiber to slow absorption",
        condition: "Diabetes",
      },
    );
  }

  if (hasMatch(conditions, ["hypertension", "high blood pressure"])) {
    foods.push(
      {
        food: "High-sodium foods",
        reason: "Excess sodium raises blood pressure",
        condition: "Hypertension",
      },
      {
        food: "Canned soups",
        reason: "Often contain very high sodium levels",
        condition: "Hypertension",
      },
      {
        food: "Deli meats",
        reason: "Preserved with sodium and nitrates",
        condition: "Hypertension",
      },
      {
        food: "Pickled foods",
        reason: "High sodium from the brining process",
        condition: "Hypertension",
      },
    );
  }

  if (
    hasMatch(conditions, [
      "obesity",
      "overweight",
      "hyperlipidemia",
      "high cholesterol",
    ])
  ) {
    foods.push(
      {
        food: "Fried foods",
        reason: "High in trans fats and calories",
        condition: "High cholesterol / Obesity",
      },
      {
        food: "Fast food",
        reason: "Calorie-dense with unhealthy fats and sodium",
        condition: "High cholesterol / Obesity",
      },
      {
        food: "Sugary beverages",
        reason: "Empty calories contributing to weight gain",
        condition: "High cholesterol / Obesity",
      },
      {
        food: "Butter and full-fat dairy",
        reason: "High in saturated fats that raise cholesterol",
        condition: "High cholesterol / Obesity",
      },
    );
  }

  if (hasMatch(conditions, ["gout"])) {
    foods.push(
      {
        food: "Red meat",
        reason: "High in purines which increase uric acid",
        condition: "Gout",
      },
      {
        food: "Organ meats",
        reason: "Very high purine content",
        condition: "Gout",
      },
      { food: "Shellfish", reason: "High in purines", condition: "Gout" },
      {
        food: "Beer and spirits",
        reason: "Alcohol increases uric acid production",
        condition: "Gout",
      },
    );
  }

  if (hasMatch(conditions, ["kidney", "renal"])) {
    foods.push(
      {
        food: "High-potassium foods (bananas, oranges)",
        reason: "Damaged kidneys cannot regulate potassium",
        condition: "Kidney disease",
      },
      {
        food: "High-phosphorus foods (dairy, nuts)",
        reason: "Excess phosphorus builds up with kidney disease",
        condition: "Kidney disease",
      },
      {
        food: "Excess protein",
        reason: "Overworks kidneys and accelerates damage",
        condition: "Kidney disease",
      },
    );
  }

  // Deduplicate by food name
  const seen = new Set<string>();
  return foods.filter((item) => {
    if (seen.has(item.food)) return false;
    seen.add(item.food);
    return true;
  });
}

export function buildProviderSuggestions(
  conditions: string[],
  allergies: string[],
): string[] {
  const suggestions: string[] = [];

  if (hasMatch(conditions, ["diabetes", "prediabetes"])) {
    suggestions.push(
      "Aim for consistent carbohydrate portions across meals to support glucose control.",
    );
  }

  if (hasMatch(conditions, ["hypertension", "high blood pressure"])) {
    suggestions.push(
      "Keep sodium in check and prioritize minimally processed foods for blood pressure support.",
    );
  }

  if (hasMatch(conditions, ["obesity", "overweight", "hyperlipidemia", "high cholesterol"])) {
    suggestions.push(
      "Lean protein, higher-fiber meals, and smaller late-day portions are a strong next step.",
    );
  }

  if (allergies.length > 0) {
    suggestions.push(
      `Continue avoiding foods containing ${allergies.slice(0, 3).join(", ")}.`,
    );
  }

  if (suggestions.length === 0) {
    suggestions.push(
      "Build each meal around a protein source, high-fiber produce, and a measured carbohydrate portion.",
    );
  }

  return suggestions;
}

