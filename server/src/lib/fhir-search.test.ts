import test from "node:test";
import assert from "node:assert/strict";
import { buildPatientSearchPath } from "./fhir-search";

test("buildPatientSearchPath uses a broad contains search for patient names", () => {
  assert.equal(
    buildPatientSearchPath("john"),
    "/Patient?name:contains=john&_format=json&_count=10",
  );
});

test("buildPatientSearchPath trims and encodes input", () => {
  assert.equal(
    buildPatientSearchPath("  mary jane  "),
    "/Patient?name:contains=mary%20jane&_format=json&_count=10",
  );
});

test("buildPatientSearchPath short-circuits very short queries", () => {
  assert.equal(buildPatientSearchPath("j"), "/Patient?_format=json&_count=0");
  assert.equal(buildPatientSearchPath(" "), "/Patient?_format=json&_count=0");
});
