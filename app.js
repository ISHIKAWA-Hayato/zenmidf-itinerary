const DATA_URL = "docs/sample_itinerary_v0.json";

const state = {
  data: null,
  activeDayIndex: 0,
};

const elements = {
  tripTitle: document.getElementById("trip-title"),
  tripTimezone: document.getElementById("trip-timezone"),
  tripStartDate: document.getElementById("trip-start-date"),
  tripDayStart: document.getElementById("trip-day-start"),
  dayTabs: document.getElementById("day-tabs"),
  tableBody: document.getElementById("table-body"),
  addRow: document.getElementById("add-row"),
  downloadJson: document.getElementById("download-json"),
  importJsonBtn: document.getElementById("import-json-btn"),
  importJsonInput: document.getElementById("import-json"),
  pdfDayList: document.getElementById("pdf-day-list"),
  downloadPdf: document.getElementById("download-pdf"),
  pdfRoot: document.getElementById("pdf-root"),
};

function createInput(value = "") {
  const input = document.createElement("input");
  input.className = "input";
  input.value = value ?? "";
  return input;
}

function createSelect(options, value = "") {
  const select = document.createElement("select");
  select.className = "input";
  options.forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt;
    option.textContent = opt;
    if (opt === value) option.selected = true;
    select.appendChild(option);
  });
  return select;
}

function isValidTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function timeToMinutes(value) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function setValidity(input, ok, message = "") {
  input.classList.remove("invalid", "valid");
  if (ok === null) return;
  input.classList.add(ok ? "valid" : "invalid");
  input.title = message;
}

function renderTripMeta(trip) {
  elements.tripTitle.textContent = trip.title ?? "-";
  elements.tripTimezone.textContent = trip.timezone ?? "-";
  elements.tripStartDate.textContent = trip.start_date ?? "-";
  elements.tripDayStart.textContent = trip.day_start ?? "-";
}

function renderTabs(days) {
  elements.dayTabs.innerHTML = "";
  days.forEach((day, index) => {
    const button = document.createElement("button");
    button.className = "tab";
    if (index === state.activeDayIndex) button.classList.add("active");
    button.textContent = `Day ${day.day} (${day.date})`;
    button.addEventListener("click", () => {
      state.activeDayIndex = index;
      render();
    });
    elements.dayTabs.appendChild(button);
  });
}

function renderPdfDayList(days) {
  elements.pdfDayList.innerHTML = "";
  days.forEach((day, index) => {
    const label = document.createElement("label");
    label.className = "pdf-day-item";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = true;
    input.dataset.dayIndex = String(index);
    const text = document.createElement("span");
    text.textContent = `Day ${day.day} (${day.date})`;
    label.appendChild(input);
    label.appendChild(text);
    elements.pdfDayList.appendChild(label);
  });
}

function createRow(item, rowIndex) {
  const tr = document.createElement("tr");

  const startInput = createInput(item.start);
  const endInput = createInput(item.end);
  const typeSelect = createSelect(["move", "place", "do"], item.type);
  const titleInput = createInput(item.title);
  const fromInput = createInput(item.from);
  const toInput = createInput(item.to);
  const locationInput = createInput(item.location);
  const kindInput = createInput(item.kind);
  const categoryInput = createInput(item.category);
  const transportInput = createInput(item.transport);
  const costInput = createInput(item.cost ?? "");
  const memoInput = createInput(item.memo);

  titleInput.placeholder = "必須";

  const cells = [
    startInput,
    endInput,
    typeSelect,
    titleInput,
    fromInput,
    toInput,
    locationInput,
    kindInput,
    categoryInput,
    transportInput,
    costInput,
    memoInput,
  ];

  cells.forEach((el) => {
    const td = document.createElement("td");
    td.appendChild(el);
    tr.appendChild(td);
  });

  const deleteTd = document.createElement("td");
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "削除";
  deleteBtn.addEventListener("click", () => deleteRow(rowIndex));
  deleteTd.appendChild(deleteBtn);
  tr.appendChild(deleteTd);

  function validateRow() {
    const start = startInput.value.trim();
    const end = endInput.value.trim();
    const title = titleInput.value.trim();

    const startValid = start === "" ? true : isValidTime(start);
    const endValid = end === "" ? true : isValidTime(end);

    setValidity(
      startInput,
      start === "" ? null : startValid,
      startValid ? "" : "時刻は HH:MM 形式"
    );
    setValidity(
      endInput,
      end === "" ? null : endValid,
      endValid ? "" : "時刻は HH:MM 形式"
    );

    if (startValid && endValid && start && end) {
      const orderOk = timeToMinutes(start) <= timeToMinutes(end);
      if (!orderOk) {
        setValidity(startInput, false, "Start <= End である必要があります");
        setValidity(endInput, false, "Start <= End である必要があります");
      }
    }

    const titleOk = title.length > 0;
    setValidity(
      titleInput,
      titleOk,
      titleOk ? "" : "Title は必須です"
    );
  }

  // Update state on input change
  startInput.addEventListener("input", () => {
    updateItem(rowIndex, "start", startInput.value);
    validateRow();
  });
  endInput.addEventListener("input", () => {
    updateItem(rowIndex, "end", endInput.value);
    validateRow();
  });
  typeSelect.addEventListener("change", () => updateItem(rowIndex, "type", typeSelect.value));
  titleInput.addEventListener("input", () => {
    updateItem(rowIndex, "title", titleInput.value);
    validateRow();
  });
  fromInput.addEventListener("input", () => updateItem(rowIndex, "from", fromInput.value));
  toInput.addEventListener("input", () => updateItem(rowIndex, "to", toInput.value));
  locationInput.addEventListener("input", () => updateItem(rowIndex, "location", locationInput.value));
  kindInput.addEventListener("input", () => updateItem(rowIndex, "kind", kindInput.value));
  categoryInput.addEventListener("input", () => updateItem(rowIndex, "category", categoryInput.value));
  transportInput.addEventListener("input", () => updateItem(rowIndex, "transport", transportInput.value));
  costInput.addEventListener("input", () => updateItem(rowIndex, "cost", Number(costInput.value)));
  memoInput.addEventListener("input", () => updateItem(rowIndex, "memo", memoInput.value));

  validateRow();
  return tr;
}

function renderTable(day) {
  elements.tableBody.innerHTML = "";
  if (!day?.items) return;

  day.items.forEach((item, index) => {
    elements.tableBody.appendChild(createRow(item, index));
  });
}

function updateItem(index, key, value) {
  const day = state.data.trip.days[state.activeDayIndex];
  if (!day?.items[index]) return;

  if (value === "" || value === null || value === undefined) {
    delete day.items[index][key];
  } else {
    day.items[index][key] = value;
  }
}

function addRow() {
  const day = state.data.trip.days[state.activeDayIndex];
  if (!day.items) day.items = [];

  const newItem = {
    id: `item-${Date.now()}`,
    type: "place",
    start: "",
    end: "",
    title: "",
    location: "",
    kind: "spot",
    cost: 0,
    memo: "",
  };

  day.items.push(newItem);
  render();
}

function deleteRow(index) {
  const day = state.data.trip.days[state.activeDayIndex];
  day.items.splice(index, 1);
  render();
}

function downloadJson() {
  if (!state.data) return;
  const blob = new Blob([JSON.stringify(state.data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "itinerary.json";
  a.click();
  URL.revokeObjectURL(url);
}

function validateImportedData(data) {
  return (
    data &&
    typeof data === "object" &&
    data.trip &&
    Array.isArray(data.trip.days)
  );
}

function handleImportJson(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!validateImportedData(data)) {
        alert("JSONの形式が不正です（trip.days が必要です）。");
        return;
      }
      state.data = data;
      state.activeDayIndex = 0;
      render();
    } catch (err) {
      alert("JSONの解析に失敗しました。");
    }
  };
  reader.readAsText(file, "utf-8");
}

function getSelectedDayIndexes() {
  const checkboxes = elements.pdfDayList.querySelectorAll("input[type=\"checkbox\"]");
  return Array.from(checkboxes)
    .filter((el) => el.checked)
    .map((el) => Number(el.dataset.dayIndex));
}

function buildTimeline(items) {
  if (!items || items.length === 0) return [];
  const sortable = items.map((item, index) => ({
    index,
    item,
    start: isValidTime(item.start) ? timeToMinutes(item.start) : null,
  }));
  sortable.sort((a, b) => {
    if (a.start === null && b.start === null) return a.index - b.index;
    if (a.start === null) return 1;
    if (b.start === null) return -1;
    return a.start - b.start;
  });
  return sortable.map((entry) => entry.item);
}

function createPdfPage(day, trip) {
  const page = document.createElement("section");
  page.className = "pdf-page";

  const header = document.createElement("div");
  header.className = "pdf-header";
  header.innerHTML = `
    <div class="pdf-title">${trip.title ?? "-"}</div>
    <div class="pdf-subtitle">Day ${day.day} / ${day.date}</div>
    <div class="pdf-meta">Timezone: ${trip.timezone ?? "-"} / DayStart: ${trip.day_start ?? "-"}</div>
  `;
  page.appendChild(header);

  const table = document.createElement("table");
  table.className = "pdf-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Start</th>
        <th>End</th>
        <th>Type</th>
        <th>Title</th>
        <th>From</th>
        <th>To</th>
        <th>Location</th>
        <th>Kind</th>
        <th>Category</th>
        <th>Transport</th>
        <th>Cost</th>
        <th>Memo</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");
  (day.items || []).forEach((item) => {
    const tr = document.createElement("tr");
    const cells = [
      item.start ?? "",
      item.end ?? "",
      item.type ?? "",
      item.title ?? "",
      item.from ?? "",
      item.to ?? "",
      item.location ?? "",
      item.kind ?? "",
      item.category ?? "",
      item.transport ?? "",
      item.cost ?? "",
      item.memo ?? "",
    ];
    cells.forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  page.appendChild(table);

  const timeline = document.createElement("div");
  timeline.className = "pdf-timeline";
  const timelineTitle = document.createElement("div");
  timelineTitle.className = "pdf-timeline__title";
  timelineTitle.textContent = "Timeline";
  timeline.appendChild(timelineTitle);

  const list = document.createElement("ul");
  list.className = "pdf-timeline__list";
  buildTimeline(day.items || []).forEach((item) => {
    const li = document.createElement("li");
    const time = item.start && item.end ? `${item.start}–${item.end}` : (item.start ?? "");
    li.textContent = `${time} ${item.title ?? ""}`.trim();
    list.appendChild(li);
  });
  timeline.appendChild(list);
  page.appendChild(timeline);

  return page;
}

async function exportPdf() {
  if (!state.data?.trip) return;
  const trip = state.data.trip;
  const selectedIndexes = getSelectedDayIndexes();
  if (selectedIndexes.length === 0) {
    alert("PDF出力する日を選択してください。");
    return;
  }

  elements.pdfRoot.innerHTML = "";
  selectedIndexes.forEach((index) => {
    const day = trip.days[index];
    if (!day) return;
    elements.pdfRoot.appendChild(createPdfPage(day, trip));
  });

  document.body.classList.add("pdf-exporting");

  // フォント＆レイアウトの確定を待つ
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const filename = `itinerary_${trip.start_date ?? "trip"}.pdf`;
  const opt = {
    margin: [10, 10, 10, 10],
    filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, backgroundColor: "#ffffff" },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"] },
  };

  try {
    await html2pdf().set(opt).from(elements.pdfRoot).save();
  } finally {
    document.body.classList.remove("pdf-exporting");
  }
}

function render() {
  if (!state.data?.trip) return;
  const trip = state.data.trip;

  renderTripMeta(trip);
  renderTabs(trip.days);
  renderPdfDayList(trip.days);
  renderTable(trip.days[state.activeDayIndex]);
}

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error("Failed to load JSON");
    const data = await response.json();
    state.data = data;

    elements.addRow.addEventListener("click", addRow);
    elements.downloadJson.addEventListener("click", downloadJson);
    elements.importJsonBtn.addEventListener("click", () => elements.importJsonInput.click());
    elements.importJsonInput.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      handleImportJson(file);
      event.target.value = "";
    });
    elements.downloadPdf.addEventListener("click", exportPdf);

    render();
  } catch (error) {
    console.error(error);
    elements.tableBody.innerHTML = "<tr><td colspan=\"13\">JSON読み込みに失敗しました</td></tr>";
  }
}

init();