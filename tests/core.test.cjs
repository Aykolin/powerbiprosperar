const test = require("node:test"),
  assert = require("node:assert/strict"),
  C = require("../core.js");
const property = {
  id: "a",
  reference: "Imóvel A",
  captured_on: "2026-11-01",
  property_type: "house",
  capture_source: "captadora",
  exclusive: true,
  value_cents: 12345678,
  status: "available",
};
const second = {
  ...property,
  id: "b",
  captured_on: "2026-10-01",
  exclusive: false,
};
const lead = {
  id: "c",
  kind: "lead",
  reference: "Cliente",
  happened_on: "2026-11-02",
  lead_channel: "l4",
  closed_on: null,
  property_id: null,
};
const sale = {
  ...lead,
  id: "d",
  kind: "sale",
  lead_channel: null,
  property_id: "a",
};
const negotiation = {
  ...lead,
  id: "e",
  kind: "negotiation",
  lead_channel: null,
  happened_on: "2026-10-20",
  closed_on: "2026-11-10",
  property_id: null,
};
test("calculates monthly metrics, available properties, exclusivity and pipeline", () => {
  const r = C.calculate(
    [property, second],
    [lead, sale, negotiation],
    "2026-11",
    "2026-11-05",
  );
  assert.equal(r.captures.length, 1);
  assert.equal(r.captures[0].exclusive, true);
  assert.equal(r.vgv, 12345678n);
  assert.equal(r.portfolio.length, 1);
  assert.equal(r.leads[0].lead_channel, "l4");
  assert.equal(r.sales, 1);
  assert.equal(r.negotiations, 1);
  assert.equal(
    C.calculate(
      [property, second],
      [lead, sale, negotiation],
      "2026-11",
      "2026-11-11",
    ).negotiations,
    0,
  );
});
test("handles currency and changing month without floating point rounding", () => {
  assert.equal(C.parseMoney("R$ 1.234.567,89"), 123456789);
  assert.equal(C.money(123456789), "R$ 1.234.567,89");
  assert.throws(() => C.parseMoney("0"));
  assert.throws(() => C.parseMoney("1,001"));
  assert.equal(C.shiftMonth("2026-01", -1), "2025-12");
});
test("backup validation rejects malformed and inconsistent records", () => {
  assert.doesNotThrow(() =>
    C.validate({ properties: [property], activities: [lead, sale] }),
  );
  assert.throws(() =>
    C.validate({
      properties: [property],
      activities: [sale, { ...sale, id: "other" }],
    }),
  );
  assert.throws(() =>
    C.validate({
      properties: [{ ...property, property_type: "__proto__" }],
      activities: [],
    }),
  );
  assert.throws(() => C.validate({ properties: [], activities: [sale] }));
  assert.throws(() =>
    C.validate({
      properties: [property],
      activities: [{ ...negotiation, closed_on: "2026-01-01" }],
    }),
  );
  assert.equal(C.validDate("2026-02-31"), false);
});
