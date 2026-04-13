# MealCare Implementation Checklist

## Phase 0: Baseline Stabilization

- [x] Add missing protected delete route for meal logs
- [x] Extract reusable nutrition aggregation logic out of the dashboard
- [x] Reduce `any` usage in the dashboard path
- [x] Fix repo-wide client lint blockers that would fail verification
- [x] Add backend tests for nutrition aggregation helpers
- [ ] Add route-level tests for meal log endpoints
- [ ] Clean up placeholder sidebar routes that do not have pages yet
- [ ] Do a wider type cleanup across remaining frontend pages

## Phase 1: Calorie and Macronutrient Dashboard

- [x] Add `GET /meal-logs/summary?date=YYYY-MM-DD`
- [x] Add date-filtered `GET /meal-logs?date=YYYY-MM-DD`
- [x] Support optional `loggedAt` when creating meal logs
- [x] Add selected-date daily dashboard view
- [x] Show total calories for the selected day
- [x] Show total protein for the selected day
- [x] Show total carbs for the selected day
- [x] Show total fat for the selected day
- [x] Show per-meal-type nutrition cards
- [x] Show selected-day logged meals grouped by meal type
- [x] Keep FHIR patient linking flow working on the dashboard
- [x] Add implementation notes for this phase in this shared checklist

### Phase 1 Verification

- [x] `cd server && npm test`
- [x] `cd client && npm run lint`
- [x] `cd client && npm run build`
- [x] Register and log in manually
- [x] Search for a food and add it to the selected date
- [x] Confirm calories, protein, carbs, and fat update correctly
- [x] Confirm the matching meal-type card updates correctly
- [x] Delete a meal and confirm totals return to the expected values
- [x] Switch dates and confirm the dashboard loads the correct daily totals
- [x] Link a FHIR patient and confirm the patient card still works

## Phase 2: Progress Charts and Daily Trends

- [ ] Add chart library
- [ ] Add progress endpoint for date-range nutrition data
- [ ] Support `Today`, `7 days`, and `30 days` ranges
- [ ] Fill missing dates with zero-value buckets
- [ ] Add calorie trend chart
- [ ] Add macro trend chart
- [ ] Add selected-range summary statistics
- [ ] Add tests for range aggregation logic

## Phase 3: Meal Plan Display

- [ ] Add read-only meal plan endpoint(s)
- [ ] Add weekly meal plan UI
- [ ] Show planned calories and macros by day
- [ ] Add empty-state handling when no meal plan exists

## Extra Features

- [ ] Meals to avoid view
- [ ] Healthy substitutions or meal suggestions
- [ ] Macro target comparisons
- [ ] Better provider or care-team recommendations
