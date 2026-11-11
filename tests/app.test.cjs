const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Indicators = require("../core.js");

test("Abre o painel e salva uma captação no navegador", () => {
  const elements = new Map();
  const makeElement = () => ({
    value: "",
    hidden: false,
    innerHTML: "",
    textContent: "",
    disabled: false,
    dataset: {},
    handlers: {},
    classList: { toggle() {} },
    addEventListener(name, callback) {
      this.handlers[name] = callback;
    },
    setAttribute() {},
    showModal() {
      this.open = true;
    },
    close() {
      this.open = false;
    },
  });
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, makeElement());
    return elements.get(id);
  };
  const form = get("record-form");
  form.elements = Object.fromEntries(
    [
      "kind",
      "reference",
      "date",
      "property_type",
      "capture_source",
      "exclusive",
      "value",
      "status",
      "lead_channel",
      "closed_on",
      "property_id",
    ].map((name) => [name, makeElement()]),
  );
  // O select de tipo e o campo do formulário representam o mesmo elemento.
  elements.set("kind", form.elements.kind);
  form.reset = () => {
    for (const element of Object.values(form.elements)) element.value = "";
    form.elements.kind.value = "property";
    form.elements.status.value = "available";
  };
  get("record-filter").value = "all";
  const storage = new Map();
  const context = {
    document: {
      getElementById: get,
      querySelectorAll: () => [],
      createElement: makeElement,
    },
    window: { Indicators, addEventListener() {} },
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
    },
    crypto: { randomUUID: () => "imovel-teste" },
    structuredClone,
    Intl,
    Date,
    Math,
    Set,
    BigInt,
    Object,
    String,
    Number,
    Blob,
    URL,
    confirm: () => true,
    setTimeout: () => 1,
    clearTimeout() {},
  };
  context.globalThis = context;
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "../app.js"), "utf8"),
    context,
  );
  assert.match(get("metrics").innerHTML, /Captações no mês/);
  assert.doesNotMatch(get("metrics").innerHTML, /undefined/);
  get("new-record").handlers.click();
  form.elements.reference.value = "Casa Panorama";
  form.elements.property_type.value = "house";
  form.elements.capture_source.value = "captadora";
  form.elements.exclusive.value = "true";
  form.elements.value.value = "350.000,00";
  form.handlers.submit({ preventDefault() {} });
  const saved = JSON.parse(
    storage.get("prosperar-indicadores-independente-v1"),
  );
  assert.equal(saved.properties[0].reference, "Casa Panorama");
  assert.equal(saved.properties[0].value_cents, 35000000);
  assert.equal(saved.properties[0].exclusive, true);
  assert.equal(get("record-dialog").open, false);
});
