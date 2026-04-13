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

export function extractConditionNames(bundle: Bundle<ConditionResource>): string[] {
  return unique(
    bundle.entry?.flatMap((entry) => {
      const label = extractConceptLabel(entry.resource?.code);
      return label ? [label] : [];
    }) || [],
  );
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
