(function (root) {
  "use strict";
  const propertyTypes = {
    rural: "Rural",
    apartment: "Apartamento",
    house: "Casa",
    commercial: "Comercial",
    land: "Terreno",
  };
  const captureSources = {
    captadora: "Captadora",
    system: "Sistema de captação",
    broker: "Corretora",
    agency: "Imobiliária",
  };
  const statuses = {
    available: "À venda",
    sold: "Vendido",
    inactive: "Fora da carteira",
  };
  const kinds = {
    property: "Imóvel captado",
    lead: "Lead",
    visit: "Visita",
    proposal: "Proposta",
    sale: "Venda",
    negotiation: "Negociação",
  };
  const channels = { social: "Redes sociais", l4: "L4", other: "Outros" };
  function today() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }
  function monthEnd(month) {
    const [y, m] = month.split("-").map(Number);
    return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  }
  function shiftMonth(month, n) {
    const [y, m] = month.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
  }
  function money(cents) {
    const n = BigInt(cents);
    return (
      "R$ " +
      (n / 100n).toLocaleString("pt-BR") +
      "," +
      String(n % 100n).padStart(2, "0")
    );
  }
  function parseMoney(value) {
    const s = String(value)
      .trim()
      .replace(/^R\$\s*/i, "")
      .replace(/\s/g, "");
    if (!/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/.test(s))
      throw Error("Informe o valor em reais, por exemplo 350.000,00.");
    const [n, d = ""] = s.replaceAll(".", "").split(",");
    const cents = BigInt(n) * 100n + BigInt(d.padEnd(2, "0"));
    if (cents < 1n || cents > 9000000000000n)
      throw Error("Informe um valor maior que zero.");
    return Number(cents);
  }
  function calculate(properties, activities, month, now) {
    const inMonth = (d) => d.slice(0, 7) === month;
    const captures = properties.filter((x) => inMonth(x.captured_on));
    const monthly = activities.filter((x) => inMonth(x.happened_on));
    const ref = month === now.slice(0, 7) ? now : monthEnd(month);
    const sold = new Set(
      activities
        .filter(
          (x) => x.kind === "sale" && x.property_id && x.happened_on <= now,
        )
        .map((x) => x.property_id),
    );
    return {
      captures,
      vgv: captures.reduce((n, x) => n + BigInt(x.value_cents), 0n),
      portfolio: properties.filter(
        (x) =>
          x.status === "available" && x.captured_on <= now && !sold.has(x.id),
      ),
      leads: monthly.filter((x) => x.kind === "lead"),
      visits: monthly.filter((x) => x.kind === "visit").length,
      proposals: monthly.filter((x) => x.kind === "proposal").length,
      sales: monthly.filter((x) => x.kind === "sale").length,
      negotiations: activities.filter(
        (x) =>
          x.kind === "negotiation" &&
          x.happened_on <= ref &&
          (!x.closed_on || x.closed_on > ref),
      ).length,
      referenceDay: ref,
      sold,
    };
  }
  function validDate(v) {
    if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(v + "T12:00:00Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }
  function validate(data) {
    if (
      !data ||
      !Array.isArray(data.properties) ||
      !Array.isArray(data.activities)
    )
      throw Error("O arquivo não contém dados válidos do sistema.");
    const ids = new Set();
    for (const p of data.properties) {
      if (
        !p ||
        typeof p.id !== "string" ||
        !p.id ||
        ids.has(p.id) ||
        typeof p.reference !== "string" ||
        !p.reference.trim() ||
        p.reference.length > 160 ||
        !validDate(p.captured_on) ||
        !Object.hasOwn(propertyTypes, p.property_type) ||
        !Object.hasOwn(captureSources, p.capture_source) ||
        typeof p.exclusive !== "boolean" ||
        !Number.isSafeInteger(p.value_cents) ||
        p.value_cents < 1 ||
        p.value_cents > 9000000000000 ||
        !Object.hasOwn(statuses, p.status)
      )
        throw Error("O arquivo contém um imóvel inválido.");
      ids.add(p.id);
    }
    const activityIds = new Set(),
      sales = new Set();
    for (const a of data.activities) {
      if (
        !a ||
        typeof a.id !== "string" ||
        !a.id ||
        activityIds.has(a.id) ||
        !Object.hasOwn(kinds, a.kind) ||
        a.kind === "property" ||
        typeof a.reference !== "string" ||
        !a.reference.trim() ||
        a.reference.length > 160 ||
        !validDate(a.happened_on) ||
        (a.kind === "lead"
          ? !Object.hasOwn(channels, a.lead_channel)
          : a.lead_channel !== null) ||
        (a.closed_on !== null &&
          (!validDate(a.closed_on) ||
            a.kind !== "negotiation" ||
            a.closed_on < a.happened_on)) ||
        (a.property_id !== null && !ids.has(a.property_id))
      )
        throw Error("O arquivo contém uma atividade inválida.");
      if (a.kind === "sale" && a.property_id) {
        if (sales.has(a.property_id))
          throw Error(
            "O arquivo contém vendas duplicadas para o mesmo imóvel.",
          );
        sales.add(a.property_id);
      }
      activityIds.add(a.id);
    }
    return data;
  }
  const api = {
    propertyTypes,
    captureSources,
    statuses,
    kinds,
    channels,
    today,
    monthEnd,
    shiftMonth,
    money,
    parseMoney,
    calculate,
    validate,
    validDate,
  };
  root.Indicators = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
