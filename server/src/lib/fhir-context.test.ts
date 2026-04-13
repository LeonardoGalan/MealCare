import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProviderSuggestions,
  extractAllergyNames,
  extractConditionNames,
  extractConceptLabel,
} from "./fhir-context";

test("extractConceptLabel prefers text then coding display", () => {
  assert.equal(
    extractConceptLabel({ text: "Type 2 diabetes", coding: [{ display: "Diabetes" }] }),
    "Type 2 diabetes",
  );
  assert.equal(
    extractConceptLabel({ coding: [{ display: "Peanut allergy" }] }),
    "Peanut allergy",
  );
  assert.equal(extractConceptLabel(undefined), null);
});

test("extractConditionNames returns unique condition labels", () => {
  const conditions = extractConditionNames({
    entry: [
      { resource: { code: { text: "Type 2 diabetes" } } },
      { resource: { code: { coding: [{ display: "Hypertension" }] } } },
      { resource: { code: { text: "Type 2 diabetes" } } },
    ],
  });

  assert.deepEqual(conditions, ["Type 2 diabetes", "Hypertension"]);
});

test("extractAllergyNames returns unique allergy labels", () => {
  const allergies = extractAllergyNames({
    entry: [
      { resource: { code: { text: "Peanut allergy" } } },
      { resource: { code: { coding: [{ display: "Shellfish allergy" }] } } },
    ],
  });

  assert.deepEqual(allergies, ["Peanut allergy", "Shellfish allergy"]);
});

test("buildProviderSuggestions maps conditions and allergies to guidance", () => {
  const suggestions = buildProviderSuggestions(
    ["Type 2 diabetes", "Hypertension"],
    ["Peanuts"],
  );

  assert.ok(
    suggestions.some((value) =>
      value.includes("consistent carbohydrate portions across meals"),
    ),
  );
  assert.ok(
    suggestions.some((value) => value.includes("sodium in check")),
  );
  assert.ok(
    suggestions.some((value) => value.includes("Peanuts")),
  );
});
