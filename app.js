(function () {
  "use strict";
  const C = window.Indicators,
    KEY = "prosperar-indicadores-independente-v1",
    $ = (id) => document.getElementById(id);
  let data = { properties: [], activities: [] },
    month = C.today().slice(0, 7),
    view = "dashboard",
    editing = null,
    storageError = false,
    toastTimer;
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const dateLabel = (d) => d.split("-").reverse().join("/");
  const showToast = (message) => {
    const t = $("toast");
    t.textContent = message;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 4000);
  };
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      data = raw
        ? C.validate(JSON.parse(raw))
        : { properties: [], activities: [] };
      storageError = false;
    } catch (e) {
      storageError = true;
      showToast(
        "Não foi possível abrir os dados. Importe um backup ou verifique o armazenamento do navegador.",
      );
    }
  }
  function save(next) {
    if (storageError)
      throw Error(
        "Não foi possível acessar os dados locais. Importe um backup antes de salvar.",
      );
    C.validate(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch (e) {
      throw Error(
        "Não foi possível salvar. Verifique o espaço e as permissões do navegador.",
      );
    }
    data = next;
    render();
  }
  function makeId() {
    if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
    if (globalThis.crypto && crypto.getRandomValues) {
      const b = new Uint8Array(16);
      crypto.getRandomValues(b);
      return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
    }
    throw Error(
      "Este navegador não permite criar identificadores. Use um navegador atualizado.",
    );
  }
  function makeBreakdown(title, subtitle, rows) {
    const max = Math.max(1, ...rows.map((x) => x[1]));
    return `<article class="breakdown"><h3>${esc(title)}</h3><p class="sub">${esc(subtitle)}</p>${rows.map(([label, n]) => `<div class="break-row"><span>${esc(label)}</span><div class="bar" aria-hidden="true"><span style="width:${Math.round((n / max) * 100)}%"></span></div><strong>${n}</strong></div>`).join("")}</article>`;
  }
  const iconPaths = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5M9.5 21v-7h5v7"/>',
    chart: '<path d="M4 20h16M7 17v-5m5 5V7m5 10V4"/>',
    building:
      '<path d="M4 21V5l8-3 8 3v16M2 21h20M8 8h2m4 0h2M8 12h2m4 0h2M10 21v-5h4v5"/>',
    users:
      '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 4 5v1"/>',
    visit:
      '<path d="M12 21s7-6.3 7-12a7 7 0 0 0-14 0c0 5.7 7 12 7 12Z"/><circle cx="12" cy="9" r="2"/>',
    file: '<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  };
  function icon(name) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`;
  }
  function render() {
    const now = C.today(),
      result = C.calculate(data.properties, data.activities, month, now),
      period = new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(month + "-01T12:00:00Z"));
    $("month-label").textContent = period;
    const cards = [
      ["Captações no mês", result.captures.length, "Imóveis captados", "home"],
      [
        "VGV captado",
        C.money(result.vgv),
        "Valor bruto das captações",
        "chart",
      ],
      [
        "Imóveis à venda",
        result.portfolio.length,
        "Carteira atual",
        "building",
      ],
      ["Leads recebidos", result.leads.length, "No mês selecionado", "users"],
      ["Visitas realizadas", result.visits, "No mês selecionado", "visit"],
      [
        "Propostas apresentadas",
        result.proposals,
        "No mês selecionado",
        "file",
      ],
      ["Vendas fechadas", result.sales, "No mês selecionado", "check"],
      [
        "Negociações em andamento",
        result.negotiations,
        "Em " + dateLabel(result.referenceDay),
        "clock",
      ],
    ];
    $("metrics").innerHTML = cards
      .map(
        ([label, value, note, iconName]) =>
          `<article class="metric"><div class="metric-top"><span class="metric-label">${esc(label)}</span><span class="metric-icon" aria-hidden="true">${icon(iconName)}</span></div><div class="metric-value">${esc(value)}</div><div class="metric-note">${esc(note)}</div></article>`,
      )
      .join("");
    const exclusive = result.captures.filter((p) => p.exclusive).length;
    $("breakdowns").innerHTML = [
      makeBreakdown("Exclusividade", "Captações no mês", [
        ["Com exclusividade", exclusive],
        ["Sem exclusividade", result.captures.length - exclusive],
      ]),
      makeBreakdown(
        "Origem das captações",
        "Como os imóveis chegaram até nós",
        Object.entries(C.captureSources).map(([id, label]) => [
          label,
          result.captures.filter((x) => x.capture_source === id).length,
        ]),
      ),
      makeBreakdown(
        "Carteira por tipo",
        "Imóveis disponíveis atualmente",
        Object.entries(C.propertyTypes).map(([id, label]) => [
          label,
          result.portfolio.filter((x) => x.property_type === id).length,
        ]),
      ),
      makeBreakdown(
        "Origem dos leads",
        "Canais no mês selecionado",
        Object.entries(C.channels).map(([id, label]) => [
          label,
          result.leads.filter((x) => x.lead_channel === id).length,
        ]),
      ),
    ].join("");
    $("empty-note").hidden = !!(
      data.properties.length || data.activities.length
    );
    renderRecords(result);
  }
  function renderRecords(metrics) {
    const query = $("record-search").value.trim().toLocaleLowerCase("pt-BR"),
      filter = $("record-filter").value;
    const records = [
      ...data.properties.map((x) => ({
        type: "property",
        date: x.captured_on,
        item: x,
      })),
      ...data.activities
        .filter((x) => x.happened_on.startsWith(month))
        .map((x) => ({ type: x.kind, date: x.happened_on, item: x })),
    ]
      .filter(
        (x) =>
          (filter === "all" || x.type === filter) &&
          x.item.reference.toLocaleLowerCase("pt-BR").includes(query),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
    $("record-list").innerHTML = records.length
      ? records
          .map(({ type, date, item }) => {
            const detail =
              type === "property"
                ? C.propertyTypes[item.property_type] +
                  " · " +
                  (metrics.sold.has(item.id)
                    ? "Venda vinculada"
                    : C.statuses[item.status])
                : type === "lead"
                  ? C.channels[item.lead_channel]
                  : type === "negotiation"
                    ? item.closed_on
                      ? "Encerrada em " + dateLabel(item.closed_on)
                      : "Em andamento"
                    : "";
            return `<button class="record" type="button" data-id="${esc(item.id)}" data-type="${esc(type)}"><span><strong>${esc(item.reference)}</strong><small>${esc(C.kinds[type])} · ${dateLabel(date)}${detail ? " · " + esc(detail) : ""}</small></span>${type === "property" ? `<span class="amount">${esc(C.money(item.value_cents))}</span>` : '<span class="amount">›</span>'}</button>`;
          })
          .join("")
      : '<div class="empty-records">Nenhum registro encontrado para esta seleção.</div>';
  }
  function setView(next) {
    view = next;
    $("dashboard").hidden = view !== "dashboard";
    $("records").hidden = view !== "records";
    document.querySelectorAll("[data-view]").forEach((el) => {
      const active = el.dataset.view === view;
      el.classList.toggle("active", active);
      if (el.getAttribute("role") === "tab")
        el.setAttribute("aria-selected", String(active));
    });
    $("breadcrumb").textContent = view === "dashboard" ? "Painel" : "Registros";
    $("page-title").textContent =
      view === "dashboard" ? "Indicadores comerciais" : "Registros comerciais";
    $("page-subtitle").textContent =
      view === "dashboard"
        ? "Acompanhe captações, carteira, leads e vendas."
        : "Cadastre e acompanhe imóveis, leads e atividades.";
    render();
  }
  const form = $("record-form"),
    dialog = $("record-dialog"),
    kind = $("kind");
  function syncFields() {
    let property = kind.value === "property";
    $("property-fields").hidden = !property;
    $("activity-fields").hidden = property;
    $("lead-fields").hidden = kind.value !== "lead";
    $("negotiation-fields").hidden = kind.value !== "negotiation";
    for (const n of ["property_type", "capture_source", "exclusive", "value"])
      form.elements[n].required = property;
    form.elements.lead_channel.required = kind.value === "lead";
  }
  function openForm(record) {
    editing = record || null;
    form.reset();
    $("form-error").hidden = true;
    kind.disabled = !!editing;
    $("form-title").textContent = editing ? "Editar registro" : "Novo registro";
    $("delete-record").hidden = !editing;
    $("property-select").innerHTML =
      '<option value="">Nenhum</option>' +
      data.properties
        .map((x) => `<option value="${esc(x.id)}">${esc(x.reference)}</option>`)
        .join("");
    form.elements.date.value = C.today();
    if (editing) {
      const x = editing.item;
      kind.value = editing.type;
      form.elements.reference.value = x.reference;
      form.elements.date.value =
        editing.type === "property" ? x.captured_on : x.happened_on;
      if (editing.type === "property") {
        form.elements.property_type.value = x.property_type;
        form.elements.capture_source.value = x.capture_source;
        form.elements.exclusive.value = String(x.exclusive);
        form.elements.value.value = C.money(x.value_cents);
        form.elements.status.value = x.status;
      } else {
        form.elements.lead_channel.value = x.lead_channel || "";
        form.elements.property_id.value = x.property_id || "";
        form.elements.closed_on.value = x.closed_on || "";
      }
    }
    syncFields();
    dialog.showModal();
  }
  function submit(e) {
    e.preventDefault();
    try {
      if (storageError)
        throw Error(
          "Os dados não puderam ser carregados. Importe um backup para continuar.",
        );
      const type = kind.value,
        reference = form.elements.reference.value.trim(),
        date = form.elements.date.value,
        now = C.today();
      if (!reference || reference.length > 160)
        throw Error("Informe uma identificação de até 160 caracteres.");
      if (!C.validDate(date) || date > now)
        throw Error("Informe uma data válida que não seja futura.");
      const next = structuredClone(data),
        id = editing ? editing.item.id : makeId();
      if (type === "property") {
        const property_type = form.elements.property_type.value,
          capture_source = form.elements.capture_source.value,
          ex = form.elements.exclusive.value,
          status = form.elements.status.value;
        if (
          !Object.hasOwn(C.propertyTypes, property_type) ||
          !Object.hasOwn(C.captureSources, capture_source) ||
          !["true", "false"].includes(ex) ||
          !Object.hasOwn(C.statuses, status)
        )
          throw Error("Preencha tipo, origem, exclusividade e situação.");
        const p = {
          id,
          reference,
          captured_on: date,
          property_type,
          capture_source,
          exclusive: ex === "true",
          value_cents: C.parseMoney(form.elements.value.value),
          status,
        };
        if (editing)
          next.properties = next.properties.map((x) => (x.id === id ? p : x));
        else next.properties.push(p);
      } else {
        const channel =
            type === "lead" ? form.elements.lead_channel.value : null,
          closed =
            type === "negotiation"
              ? form.elements.closed_on.value || null
              : null,
          property = form.elements.property_id.value || null;
        if (type === "lead" && !Object.hasOwn(C.channels, channel))
          throw Error("Escolha o canal de origem do lead.");
        if (closed && (!C.validDate(closed) || closed < date || closed > now))
          throw Error(
            "O encerramento deve ser posterior ao início e não pode estar no futuro.",
          );
        if (property && !next.properties.some((p) => p.id === property))
          throw Error("Selecione um imóvel cadastrado.");
        if (
          type === "sale" &&
          property &&
          next.activities.some(
            (a) =>
              a.kind === "sale" && a.property_id === property && a.id !== id,
          )
        )
          throw Error("Este imóvel já possui uma venda vinculada.");
        const activity = {
          id,
          kind: type,
          reference,
          happened_on: date,
          lead_channel: channel,
          closed_on: closed,
          property_id: property,
        };
        if (editing)
          next.activities = next.activities.map((x) =>
            x.id === id ? activity : x,
          );
        else next.activities.push(activity);
      }
      save(next);
      dialog.close();
      showToast("Registro salvo com sucesso.");
    } catch (err) {
      $("form-error").textContent = err.message || "Não foi possível salvar.";
      $("form-error").hidden = false;
    }
  }
  document
    .querySelectorAll("[data-view]")
    .forEach((el) =>
      el.addEventListener("click", () => setView(el.dataset.view)),
    );
  $("new-record").addEventListener("click", () => openForm());
  $("close-dialog").addEventListener("click", () => dialog.close());
  $("cancel-dialog").addEventListener("click", () => dialog.close());
  kind.addEventListener("change", syncFields);
  form.addEventListener("submit", submit);
  $("record-search").addEventListener("input", () => render());
  $("record-filter").addEventListener("change", () => render());
  $("record-list").addEventListener("click", (e) => {
    const el = e.target.closest("button[data-id]");
    if (!el) return;
    const type = el.dataset.type,
      item = (type === "property" ? data.properties : data.activities).find(
        (x) => x.id === el.dataset.id,
      );
    if (item) openForm({ type, item });
  });
  $("delete-record").addEventListener("click", () => {
    if (!editing) return;
    const text =
      editing.type === "property"
        ? "Excluir este imóvel? Os registros de atividades vinculadas serão mantidos, sem o vínculo."
        : "Excluir este registro?";
    if (!confirm(text)) return;
    try {
      const next = structuredClone(data),
        id = editing.item.id;
      if (editing.type === "property") {
        next.properties = next.properties.filter((x) => x.id !== id);
        next.activities = next.activities.map((x) =>
          x.property_id === id ? { ...x, property_id: null } : x,
        );
      } else next.activities = next.activities.filter((x) => x.id !== id);
      save(next);
      dialog.close();
      showToast("Registro excluído.");
    } catch (err) {
      $("form-error").textContent = err.message;
      $("form-error").hidden = false;
    }
  });
  $("previous-month").addEventListener("click", () => {
    month = C.shiftMonth(month, -1);
    render();
  });
  $("next-month").addEventListener("click", () => {
    month = C.shiftMonth(month, 1);
    render();
  });
  $("current-month").addEventListener("click", () => {
    month = C.today().slice(0, 7);
    render();
  });
  $("export-btn").addEventListener("click", () => {
    if (storageError) {
      showToast("Não foi possível acessar os dados para exportar.");
      return;
    }
    const blob = new Blob(
        [
          JSON.stringify(
            {
              format: "prosperar-indicadores",
              version: 1,
              exported_at: new Date().toISOString(),
              data,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "backup-indicadores-" + C.today() + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $("import-btn").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024)
        throw Error("O backup deve ter até 5 MB.");
      const backup = JSON.parse(await file.text());
      if (backup.format !== "prosperar-indicadores" || backup.version !== 1)
        throw Error("Este arquivo não é um backup compatível.");
      const imported = C.validate(backup.data);
      if (
        !confirm(
          "Restaurar este backup? Os registros existentes neste navegador serão substituídos. Exporte uma cópia antes, se precisar.",
        )
      )
        return;
      localStorage.setItem(KEY, JSON.stringify(imported));
      data = imported;
      storageError = false;
      render();
      showToast("Backup restaurado com sucesso.");
    } catch (err) {
      showToast(err.message || "Não foi possível importar o backup.");
    }
  });
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      load();
      render();
    }
  });
  load();
  render();
})();
