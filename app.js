const DATA_URL = "docs/sample_itinerary_v0.json";

const state = {
  data: null,
  activeDayIndex: 0,
};

const elements = {
  tripTitle: document.getElementById("trip-title"),
  tripTitleError: document.getElementById("trip-title-error"),
  tripTimezone: document.getElementById("trip-timezone"),
  tripTimezoneError: document.getElementById("trip-timezone-error"),
  tripStartDate: document.getElementById("trip-start-date"),
  tripStartDateError: document.getElementById("trip-start-date-error"),
  tripDayStart: document.getElementById("trip-day-start"),
  tripDayStartError: document.getElementById("trip-day-start-error"),
  dayTabs: document.getElementById("day-tabs"),
  addDay: document.getElementById("add-day"),
  removeDay: document.getElementById("remove-day"),
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

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

function addDays(dateText, days) {
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

function setFieldError(element, message = "") {
  if (!element) return;
  element.textContent = message;
}

function normalizeDays() {
  const trip = state.data?.trip;
  if (!trip) return;
  if (!Array.isArray(trip.days)) trip.days = [];

  const startDate = trip.start_date;
  const canAutoDate = isValidDate(startDate);

  trip.days.forEach((day, index) => {
    day.day = index + 1;
    if (canAutoDate) {
      day.date = addDays(startDate, index);
    } else if (typeof day.date !== "string") {
      day.date = "";
    }
    if (!Array.isArray(day.items)) day.items = [];
  });
}

function validateTripMeta() {
  const trip = state.data?.trip;
  if (!trip) return true;

  const title = (trip.title ?? "").trim();
  const timezone = (trip.timezone ?? "").trim();
  const startDate = (trip.start_date ?? "").trim();
  const dayStart = (trip.day_start ?? "").trim();

  const titleOk = title.length > 0;
  const timezoneOk = timezone.length > 0;
  const startDateOk = isValidDate(startDate);
  const dayStartOk = dayStart === "" ? true : isValidTime(dayStart);

  setValidity(elements.tripTitle, titleOk, titleOk ? "" : "タイトルは必須です");
  setValidity(elements.tripTimezone, timezoneOk, timezoneOk ? "" : "タイムゾーンは必須です");
  setValidity(elements.tripStartDate, startDateOk, startDateOk ? "" : "開始日は YYYY-MM-DD 形式で入力してください");
  setValidity(
    elements.tripDayStart,
    dayStart === "" ? null : dayStartOk,
    dayStartOk ? "" : "DayStart は HH:MM 形式で入力してください"
  );

  setFieldError(elements.tripTitleError, titleOk ? "" : "タイトルは必須です");
  setFieldError(elements.tripTimezoneError, timezoneOk ? "" : "タイムゾーンは必須です");
  setFieldError(elements.tripStartDateError, startDateOk ? "" : "開始日は YYYY-MM-DD 形式で入力してください");
  setFieldError(
    elements.tripDayStartError,
    dayStart === "" || dayStartOk ? "" : "DayStart は HH:MM 形式で入力してください"
  );

  return titleOk && timezoneOk && startDateOk && dayStartOk;
}

function renderTripMeta(trip) {
  elements.tripTitle.value = trip.title ?? "";
  elements.tripTimezone.value = trip.timezone ?? "";
  elements.tripStartDate.value = trip.start_date ?? "";
  elements.tripDayStart.value = trip.day_start ?? "";
  validateTripMeta();
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

function addDay() {
  const trip = state.data?.trip;
  if (!trip) return;

  if (!Array.isArray(trip.days)) trip.days = [];
  trip.days.push({
    day: trip.days.length + 1,
    date: "",
    notes: "",
    items: [],
  });
  normalizeDays();
  state.activeDayIndex = trip.days.length - 1;
  render();
}

function removeDay() {
  const trip = state.data?.trip;
  if (!trip?.days || trip.days.length <= 1) {
    alert("最低1つのDayが必要です。");
    return;
  }

  trip.days.splice(state.activeDayIndex, 1);
  if (state.activeDayIndex >= trip.days.length) {
    state.activeDayIndex = trip.days.length - 1;
  }
  normalizeDays();
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
      normalizeDays();
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

  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const pages = elements.pdfRoot.querySelectorAll(".pdf-page");
  for (let i = 0; i < pages.length; i += 1) {
    const page = pages[i];

    const canvas = await html2canvas(page, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    let imgWidth = pageWidth;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight > pageHeight) {
      imgHeight = pageHeight;
      imgWidth = (canvas.width * imgHeight) / canvas.height;
    }

    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;

    const imgData = canvas.toDataURL("image/jpeg", 1.0);
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", x, y, imgWidth, imgHeight);
  }

  pdf.save(`itinerary_${trip.start_date ?? "trip"}.pdf`);

  document.body.classList.remove("pdf-exporting");
}

function render() {
  if (!state.data?.trip) return;
  const trip = state.data.trip;
  normalizeDays();

  renderTripMeta(trip);
  renderTabs(trip.days);
  renderPdfDayList(trip.days);
  renderTable(trip.days[state.activeDayIndex]);
  elements.removeDay.disabled = trip.days.length <= 1;
}

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error("Failed to load JSON");
    const data = await response.json();
    state.data = data;
    normalizeDays();

    const onTripMetaInput = () => {
      const trip = state.data?.trip;
      if (!trip) return;

      const prevStartDate = trip.start_date ?? "";
      trip.title = elements.tripTitle.value;
      trip.timezone = elements.tripTimezone.value;
      trip.start_date = elements.tripStartDate.value;
      if (elements.tripDayStart.value === "") {
        delete trip.day_start;
      } else {
        trip.day_start = elements.tripDayStart.value;
      }
      if (trip.start_date !== prevStartDate && isValidDate(trip.start_date)) {
        normalizeDays();
        renderTabs(trip.days);
        renderPdfDayList(trip.days);
      }
      validateTripMeta();
    };

    elements.tripTitle.addEventListener("input", onTripMetaInput);
    elements.tripTimezone.addEventListener("input", onTripMetaInput);
    elements.tripStartDate.addEventListener("input", onTripMetaInput);
    elements.tripDayStart.addEventListener("input", onTripMetaInput);
    elements.addDay.addEventListener("click", addDay);
    elements.removeDay.addEventListener("click", removeDay);
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
