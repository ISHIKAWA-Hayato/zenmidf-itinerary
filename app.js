const DATA_URL = "docs/sample_itinerary_v0.json";
const STORAGE_KEY = "zenmidf-itinerary-autosave-v1";
const INPUT_MODE_STORAGE_KEY = "zenmidf-itinerary-input-mode-v1";
const DEFAULT_LOCALE = "ja-JP";
const COST_PATTERN = /^\d+$/;
const INPUT_MODES = {
  DETAIL: "detail",
  SIMPLE: "simple",
};
const TABLE_COLUMNS = [
  "start",
  "end",
  "type",
  "title",
  "from",
  "to",
  "location",
  "kind",
  "category",
  "transport",
  "cost",
  "memo",
  "actions",
];
const SIMPLE_VISIBLE_COLUMNS = new Set(["start", "end", "type", "title", "memo", "actions"]);
const DETAIL_VISIBLE_COLUMNS = new Set([
  "type",
  "from",
  "start",
  "to",
  "end",
  "location",
  "title",
  "kind",
  "category",
  "cost",
  "memo",
  "actions",
]);
const SIMPLE_COLUMN_ORDER = [
  "start",
  "end",
  "type",
  "title",
  "from",
  "to",
  "location",
  "kind",
  "category",
  "transport",
  "cost",
  "memo",
  "actions",
];
const DETAIL_COLUMN_ORDER = [
  "type",
  "from",
  "start",
  "to",
  "end",
  "location",
  "title",
  "kind",
  "category",
  "cost",
  "memo",
  "actions",
];
const SIMPLE_COLUMN_LABELS = {
  title: "Title",
  location: "Location",
  category: "Category",
  transport: "Transport",
};
const DETAIL_COLUMN_LABELS = {
  title: "Number",
  location: "Transport/Location",
  category: "Destination",
  transport: "Transport",
};
// URLが極端に長くなるとブラウザや共有先で扱えないため、一般的な上限（~64KB）未満に制限
const MAX_SHARE_DATA_CHARS = 60000;

const state = {
  data: null,
  activeDayIndex: 0,
  readOnly: false,
  inputMode: INPUT_MODES.SIMPLE,
  saveTimer: null,
  toastTimer: null,
};

const VALIDATION_MESSAGES = {
  titleRequired: "タイトルは必須です",
  timezoneRequired: "タイムゾーンは必須です",
  timezoneFormat: "タイムゾーンは Area/City 形式で入力してください",
  startDateFormat: "開始日は YYYY-MM-DD 形式で入力してください",
  dayStartFormat: "DayStart は HH:MM 形式で入力してください",
};

const elements = {
  tripTitle: document.getElementById("trip-title"),
  tripTitleError: document.getElementById("trip-title-error"),
  tripTimezone: document.getElementById("trip-timezone"),
  tripTimezoneError: document.getElementById("trip-timezone-error"),
  tripStartDate: document.getElementById("trip-start-date"),
  tripStartDateError: document.getElementById("trip-start-date-error"),
  tripDayStart: document.getElementById("trip-day-start"),
  tripDayStartField: document.getElementById("trip-day-start-field"),
  tripDayStartError: document.getElementById("trip-day-start-error"),
  inputModeDetail: document.getElementById("input-mode-detail"),
  inputModeSimple: document.getElementById("input-mode-simple"),
  dayTabs: document.getElementById("day-tabs"),
  addDay: document.getElementById("add-day"),
  removeDay: document.getElementById("remove-day"),
  tableBody: document.getElementById("table-body"),
  itineraryTable: document.getElementById("itinerary-table"),
  addRow: document.getElementById("add-row"),
  downloadJson: document.getElementById("download-json"),
  importJsonBtn: document.getElementById("import-json-btn"),
  importJsonInput: document.getElementById("import-json"),
  shareUrl: document.getElementById("share-url"),
  pdfDayList: document.getElementById("pdf-day-list"),
  downloadPdf: document.getElementById("download-pdf"),
  pdfRoot: document.getElementById("pdf-root"),
  tableCaption: document.getElementById("itinerary-table-caption"),
  saveStatus: document.getElementById("save-status"),
  toast: document.getElementById("toast"),
  readonlyBanner: document.getElementById("readonly-banner"),
  loadingSkeleton: document.getElementById("loading-skeleton"),
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

function isValidTimezone(value) {
  // 例: Asia/Tokyo, America/New_York
  return /^[A-Za-z][A-Za-z0-9_+\-]*(?:\/[A-Za-z0-9_+\-]+)+$/.test(value);
}

function showToast(message) {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    elements.toast.hidden = true;
  }, 2400);
}

function setSaveStatus(message) {
  if (!elements.saveStatus) return;
  elements.saveStatus.textContent = message;
}

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  try {
    return new TextDecoder().decode(bytes);
  } catch (error) {
    throw new Error("共有データのデコードに失敗しました");
  }
}

function setReadOnlyMode(readOnly) {
  state.readOnly = readOnly;
  if (elements.readonlyBanner) elements.readonlyBanner.hidden = !readOnly;
  if (elements.tableCaption) {
    elements.tableCaption.textContent = readOnly
      ? "日ごとの行程閲覧テーブル"
      : "日ごとの行程編集テーブル";
  }

  const editTargets = [
    elements.tripTitle,
    elements.tripTimezone,
    elements.tripStartDate,
    elements.tripDayStart,
    elements.addDay,
    elements.removeDay,
    elements.addRow,
    elements.importJsonBtn,
    elements.importJsonInput,
  ];
  editTargets.forEach((el) => {
    if (!el) return;
    el.disabled = readOnly;
  });
}

function isSimpleInputMode() {
  return state.inputMode === INPUT_MODES.SIMPLE;
}

function renderInputModeSwitch() {
  const modeButtons = [
    [elements.inputModeDetail, INPUT_MODES.DETAIL],
    [elements.inputModeSimple, INPUT_MODES.SIMPLE],
  ];
  modeButtons.forEach(([button, mode]) => {
    if (!button) return;
    const selected = state.inputMode === mode;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", selected ? "true" : "false");
  });
}

function applyInputModeVisibility() {
  const isSimple = isSimpleInputMode();
  if (elements.tripDayStartField) {
    elements.tripDayStartField.hidden = isSimple;
  }
  if (!elements.itineraryTable) return;
  const columnOrder = isSimple ? SIMPLE_COLUMN_ORDER : DETAIL_COLUMN_ORDER;
  const columnLabels = isSimple ? SIMPLE_COLUMN_LABELS : DETAIL_COLUMN_LABELS;
  const visibility = isSimple ? SIMPLE_VISIBLE_COLUMNS : DETAIL_VISIBLE_COLUMNS;

  const headerRow = elements.itineraryTable.tHead?.rows?.[0];
  if (headerRow) {
    columnOrder.forEach((column) => {
      const th = headerRow.querySelector(`[data-col="${column}"]`);
      if (th) headerRow.appendChild(th);
    });
    Object.entries(columnLabels).forEach(([column, text]) => {
      const th = headerRow.querySelector(`[data-col="${column}"]`);
      if (th) th.textContent = text;
    });
  }

  elements.tableBody.querySelectorAll("tr").forEach((tr) => {
    columnOrder.forEach((column) => {
      const td = tr.querySelector(`[data-col="${column}"]`);
      if (td) tr.appendChild(td);
    });
  });

  TABLE_COLUMNS.forEach((column) => {
    const visible = visibility.has(column);
    elements.itineraryTable
      .querySelectorAll(`[data-col="${column}"]`)
      .forEach((el) => {
        el.hidden = !visible;
      });
  });
}

function setInputMode(mode, { persist = true } = {}) {
  const nextMode = mode === INPUT_MODES.SIMPLE ? INPUT_MODES.SIMPLE : INPUT_MODES.DETAIL;
  if (state.inputMode === nextMode) return;
  state.inputMode = nextMode;
  renderInputModeSwitch();
  render();
  if (persist && !state.readOnly) {
    try {
      localStorage.setItem(INPUT_MODE_STORAGE_KEY, nextMode);
    } catch (error) {
      // localStorage が使えない環境では永続化しない
    }
  }
}

function scheduleAutosave() {
  if (state.readOnly || !state.data) return;
  setSaveStatus("保存中...");
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
      const timeText = new Date().toLocaleTimeString(navigator.language || DEFAULT_LOCALE);
      setSaveStatus(`自動保存済み（${timeText}）`);
    } catch (error) {
      setSaveStatus("自動保存に失敗しました");
    }
  }, 320);
}

function addDays(dateText, days) {
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
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
  input.removeAttribute("aria-invalid");
  if (ok === null) return;
  input.classList.add(ok ? "valid" : "invalid");
  if (!ok) input.setAttribute("aria-invalid", "true");
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
  const isDayStartVisible = !isSimpleInputMode();

  const titleOk = title.length > 0;
  const timezoneRequiredOk = timezone.length > 0;
  const timezoneFormatOk = timezoneRequiredOk ? isValidTimezone(timezone) : false;
  const timezoneOk = timezoneRequiredOk && timezoneFormatOk;
  const startDateOk = isValidDate(startDate);
  const dayStartOk = dayStart === "" ? true : isValidTime(dayStart);
  const hasDayStartInput = isDayStartVisible && dayStart !== "";
  const dayStartValidity = hasDayStartInput ? dayStartOk : null;
  const dayStartError = hasDayStartInput && !dayStartOk
    ? VALIDATION_MESSAGES.dayStartFormat
    : "";

  setValidity(
    elements.tripTitle,
    titleOk,
    titleOk ? "" : VALIDATION_MESSAGES.titleRequired
  );
  setValidity(
    elements.tripTimezone,
    timezoneOk,
    timezoneRequiredOk
      ? (timezoneFormatOk ? "" : VALIDATION_MESSAGES.timezoneFormat)
      : VALIDATION_MESSAGES.timezoneRequired
  );
  setValidity(
    elements.tripStartDate,
    startDateOk,
    startDateOk ? "" : VALIDATION_MESSAGES.startDateFormat
  );
  // day_start は任意項目のため、空欄は未判定（null）として表示色を付けない
  setValidity(
    elements.tripDayStart,
    dayStartValidity,
    dayStartError
  );

  setFieldError(
    elements.tripTitleError,
    titleOk ? "" : VALIDATION_MESSAGES.titleRequired
  );
  setFieldError(
    elements.tripTimezoneError,
    timezoneRequiredOk
      ? (timezoneFormatOk ? "" : VALIDATION_MESSAGES.timezoneFormat)
      : VALIDATION_MESSAGES.timezoneRequired
  );
  setFieldError(
    elements.tripStartDateError,
    startDateOk ? "" : VALIDATION_MESSAGES.startDateFormat
  );
  setFieldError(
    elements.tripDayStartError,
    dayStartError
  );

  return titleOk && timezoneOk && startDateOk && (isDayStartVisible ? dayStartOk : true);
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
    button.type = "button";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", index === state.activeDayIndex ? "true" : "false");
    if (index === state.activeDayIndex) button.classList.add("active");
    button.textContent = `Day ${day.day} (${day.date})`;
    button.addEventListener("click", () => {
      state.activeDayIndex = index;
      render();
    });
    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const diff = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (index + diff + days.length) % days.length;
      state.activeDayIndex = nextIndex;
      render();
      const nextTab = elements.dayTabs.querySelectorAll(".tab")[nextIndex];
      nextTab?.focus();
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
  startInput.type = "time";
  startInput.step = "60";
  const endInput = createInput(item.end);
  endInput.type = "time";
  endInput.step = "60";
  const typeSelect = createSelect(["move", "place", "do"], item.type);
  const titleInput = createInput(item.title);
  const fromInput = createInput(item.from);
  const toInput = createInput(item.to);
  const transportOrLocationValue = item.type === "move"
    ? (item.transport ?? "")
    : (item.location ?? "");
  const locationInput = createInput(transportOrLocationValue);
  const kindInput = createInput(item.kind);
  const categoryInput = createInput(item.category);
  const transportInput = createInput(item.transport);
  const costInput = createInput(item.cost ?? "");
  const memoInput = createInput(item.memo);
  // type=number は指数表記を許容するため、整数制約を実現する目的で text + pattern を利用
  costInput.type = "text";
  costInput.inputMode = "numeric";
  costInput.pattern = "\\d+";

  titleInput.placeholder = "必須";

  const cells = [
    { key: "start", el: startInput },
    { key: "end", el: endInput },
    { key: "type", el: typeSelect },
    { key: "title", el: titleInput },
    { key: "from", el: fromInput },
    { key: "to", el: toInput },
    { key: "location", el: locationInput },
    { key: "kind", el: kindInput },
    { key: "category", el: categoryInput },
    { key: "transport", el: transportInput },
    { key: "cost", el: costInput },
    { key: "memo", el: memoInput },
  ];

  cells.forEach(({ key, el }) => {
    const td = document.createElement("td");
    td.dataset.col = key;
    td.appendChild(el);
    tr.appendChild(td);
  });

  const deleteTd = document.createElement("td");
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.type = "button";
  deleteBtn.textContent = "削除";
  deleteBtn.setAttribute("aria-label", `${rowIndex + 1}行目を削除`);
  deleteBtn.disabled = state.readOnly;
  deleteBtn.addEventListener("click", () => deleteRow(rowIndex));
  deleteTd.appendChild(deleteBtn);
  deleteTd.dataset.col = "actions";
  tr.appendChild(deleteTd);

  function validateRow() {
    const start = startInput.value.trim();
    const end = endInput.value.trim();
    const title = titleInput.value.trim();
    const isSimpleMode = isSimpleInputMode();
    const costRaw = costInput.value.trim();

    const startValid = start === "" ? true : isValidTime(start);
    const endValid = end === "" ? true : isValidTime(end);
    const costValid = costRaw === "" ? true : COST_PATTERN.test(costRaw);

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

    let costValidity = null;
    if (!isSimpleMode && costRaw !== "") {
      costValidity = costValid;
    }
    setValidity(
      costInput,
      costValidity,
      isSimpleMode || costValid ? "" : "Cost は 0 以上の整数で入力してください"
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
  titleInput.addEventListener("input", () => {
    updateItem(rowIndex, "title", titleInput.value);
    validateRow();
  });
  fromInput.addEventListener("input", () => updateItem(rowIndex, "from", fromInput.value));
  toInput.addEventListener("input", () => updateItem(rowIndex, "to", toInput.value));
  locationInput.addEventListener("input", () => {
    const key = typeSelect.value === "move" ? "transport" : "location";
    updateItem(rowIndex, key, locationInput.value);
  });
  kindInput.addEventListener("input", () => updateItem(rowIndex, "kind", kindInput.value));
  categoryInput.addEventListener("input", () => updateItem(rowIndex, "category", categoryInput.value));
  transportInput.addEventListener("input", () => updateItem(rowIndex, "transport", transportInput.value));
  costInput.addEventListener("input", () => {
    const raw = costInput.value.trim();
    if (raw === "") {
      updateItem(rowIndex, "cost", "");
    } else if (COST_PATTERN.test(raw)) {
      updateItem(rowIndex, "cost", Number(raw));
    }
    validateRow();
  });
  memoInput.addEventListener("input", () => updateItem(rowIndex, "memo", memoInput.value));

  typeSelect.addEventListener("change", () => {
    updateItem(rowIndex, "type", typeSelect.value);
    const day = state.data?.trip?.days?.[state.activeDayIndex];
    const currentItem = day?.items?.[rowIndex];
    const nextValue = typeSelect.value === "move"
      ? (currentItem?.transport ?? "")
      : (currentItem?.location ?? "");
    locationInput.value = nextValue;
    validateRow();
  });

  if (state.readOnly) {
    cells.forEach(({ el }) => {
      el.disabled = true;
    });
  }

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
  if (state.readOnly) return;
  const day = state.data.trip.days[state.activeDayIndex];
  if (!day?.items[index]) return;

  if (value === "" || value === null || value === undefined) {
    delete day.items[index][key];
  } else {
    day.items[index][key] = value;
  }
  scheduleAutosave();
}

function addRow() {
  if (state.readOnly) return;
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
  scheduleAutosave();
  render();
}

function addDay() {
  if (state.readOnly) return;
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
  scheduleAutosave();
  render();
}

function removeDay() {
  if (state.readOnly) return;
  const trip = state.data?.trip;
  if (!trip?.days || trip.days.length <= 1) {
    alert("最後のDayは削除できません。");
    return;
  }

  trip.days.splice(state.activeDayIndex, 1);
  if (state.activeDayIndex >= trip.days.length) {
    state.activeDayIndex = trip.days.length - 1;
  }
  normalizeDays();
  scheduleAutosave();
  render();
}

function deleteRow(index) {
  if (state.readOnly) return;
  const day = state.data.trip.days[state.activeDayIndex];
  day.items.splice(index, 1);
  scheduleAutosave();
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
  setSaveStatus("JSONを書き出しました");
  showToast("JSON保存を開始しました");
}

function validateImportedData(data) {
  if (!data || typeof data !== "object") return "JSONオブジェクトではありません。";
  if (!data.trip || typeof data.trip !== "object") return "trip オブジェクトが必要です。";
  if (!Array.isArray(data.trip.days)) return "trip.days 配列が必要です。";
  if (typeof data.trip.title !== "string" || data.trip.title.trim() === "") {
    return "trip.title は必須です。";
  }
  if (typeof data.trip.timezone !== "string" || !isValidTimezone(data.trip.timezone.trim())) {
    return "trip.timezone は Area/City 形式で入力してください。";
  }
  if (typeof data.trip.start_date !== "string" || !isValidDate(data.trip.start_date.trim())) {
    return "trip.start_date は YYYY-MM-DD 形式で入力してください。";
  }
  return "";
}

function handleImportJson(file) {
  if (state.readOnly) return;
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const validationError = validateImportedData(data);
      if (validationError) {
        alert(`JSONの形式が不正です: ${validationError}`);
        return;
      }
      state.data = data;
      normalizeDays();
      state.activeDayIndex = 0;
      scheduleAutosave();
      showToast("JSONを読み込みました");
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

async function copyShareUrl() {
  if (!state.data) return;
  const jsonText = JSON.stringify(state.data);
  const encoded = toBase64Url(jsonText);
  if (encoded.length > MAX_SHARE_DATA_CHARS) {
    showToast(`データサイズが大きすぎます（${encoded.length}/${MAX_SHARE_DATA_CHARS} 文字）`);
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.set("data", encoded);
  url.searchParams.set("readonly", "1");
  const shareText = url.toString();
  try {
    await navigator.clipboard.writeText(shareText);
    showToast("共有URLをコピーしました（閲覧専用）");
  } catch (error) {
    showToast("クリップボードが使えないためダイアログからURLをコピーしてください");
    window.prompt("共有URL（ダイアログの内容を手動でコピーしてください）", shareText);
  }
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

function createPdfPage(day, trip, pageNumber, totalPages) {
  const page = document.createElement("section");
  page.className = "pdf-page";

  const header = document.createElement("div");
  header.className = "pdf-header";
  const title = document.createElement("div");
  title.className = "pdf-title";
  title.textContent = trip.title ?? "-";
  header.appendChild(title);

  const subtitle = document.createElement("div");
  subtitle.className = "pdf-subtitle";
  subtitle.textContent = `Day ${day.day} / ${day.date}`;
  header.appendChild(subtitle);

  const meta = document.createElement("div");
  meta.className = "pdf-meta";
  meta.textContent = `Timezone: ${trip.timezone ?? "-"} / DayStart: ${trip.day_start ?? "-"}`;
  header.appendChild(meta);
  page.appendChild(header);

  const tableTitle = document.createElement("div");
  tableTitle.className = "pdf-section-title";
  tableTitle.textContent = "Itinerary Details";
  page.appendChild(tableTitle);

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
  timelineTitle.className = "pdf-section-title pdf-timeline__title";
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

  const footer = document.createElement("div");
  footer.className = "pdf-footer";
  footer.textContent = `zenmidf-itinerary | ${pageNumber} / ${totalPages}`;
  page.appendChild(footer);

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
  const totalPages = selectedIndexes.length;
  selectedIndexes.forEach((index) => {
    const day = trip.days[index];
    if (!day) return;
    const pageNumber = elements.pdfRoot.childElementCount + 1;
    elements.pdfRoot.appendChild(createPdfPage(day, trip, pageNumber, totalPages));
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
      onclone: (clonedDoc) => {
        const rootVars = clonedDoc.createElement("style");
        rootVars.textContent = `:root {
          --bg: #f3f6f8;
          --card: #ffffff;
          --text: #111827;
          --muted: #374151;
          --primary: #0f766e;
          --primary-strong: #0d5f59;
          --primary-soft: #e9f7f6;
          --border: #dbe3ea;
          --table-header: #eef3f6;
          --danger: #dc2626;
          --success: #16a34a;
          --ring: rgba(15, 118, 110, 0.28);
        }`;
        clonedDoc.head.appendChild(rootVars);
      },
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

  renderInputModeSwitch();
  renderTripMeta(trip);
  renderTabs(trip.days);
  renderPdfDayList(trip.days);
  renderTable(trip.days[state.activeDayIndex]);
  applyInputModeVisibility();
  elements.removeDay.disabled = state.readOnly || trip.days.length <= 1;
}

async function init() {
  document.body.classList.add("loading");
  try {
    const params = new URLSearchParams(window.location.search);
    const readonlyParam = params.get("readonly");
    setReadOnlyMode(readonlyParam === "1" || readonlyParam === "true");
    try {
      const cachedMode = localStorage.getItem(INPUT_MODE_STORAGE_KEY);
      if (cachedMode === INPUT_MODES.SIMPLE || cachedMode === INPUT_MODES.DETAIL) {
        state.inputMode = cachedMode;
      }
    } catch (error) {
      // localStorage が使えない環境では既定値を利用
    }

    const sharedData = params.get("data");
    let data = null;
    if (sharedData) {
      try {
        const decoded = fromBase64Url(sharedData);
        const parsed = JSON.parse(decoded);
        const validationError = validateImportedData(parsed);
        if (validationError) {
          throw new Error(validationError);
        }
        data = parsed;
        setSaveStatus("共有URLから読み込みました");
      } catch (error) {
        showToast(`共有URLデータを読み込めませんでした: ${error.message}`);
      }
    } else if (!state.readOnly) {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          const validationError = validateImportedData(parsed);
          if (!validationError) {
            data = parsed;
            setSaveStatus("自動保存データを復元しました");
          }
        }
      } catch (error) {
        showToast("自動保存データの復元に失敗しました");
      }
    }

    if (!data) {
      const response = await fetch(DATA_URL);
      if (!response.ok) throw new Error("Failed to load JSON");
      data = await response.json();
      setSaveStatus("サンプルデータを読み込みました");
    }
    state.data = data;
    normalizeDays();

    const onTripMetaInput = () => {
      if (state.readOnly) return;
      const trip = state.data?.trip;
      if (!trip) return;

      const prevStartDate = trip.start_date ?? "";
      trip.title = elements.tripTitle.value.trim();
      trip.timezone = elements.tripTimezone.value.trim();
      trip.start_date = elements.tripStartDate.value.trim();
      const dayStartValue = elements.tripDayStart.value;
      if (dayStartValue === "") {
        delete trip.day_start;
      } else if (isValidTime(dayStartValue)) {
        trip.day_start = dayStartValue;
      } else {
        delete trip.day_start;
      }
      if (trip.start_date !== prevStartDate && isValidDate(trip.start_date)) {
        normalizeDays();
        renderTabs(trip.days);
        renderPdfDayList(trip.days);
      }
      validateTripMeta();
      scheduleAutosave();
    };

    elements.dayTabs.setAttribute("role", "tablist");
    elements.tripTitle.setAttribute("aria-describedby", "trip-title-error");
    elements.tripTimezone.setAttribute("aria-describedby", "trip-timezone-error");
    elements.tripStartDate.setAttribute("aria-describedby", "trip-start-date-error");
    elements.tripDayStart.setAttribute("aria-describedby", "trip-day-start-error");
    elements.inputModeDetail.addEventListener("click", () => setInputMode(INPUT_MODES.DETAIL));
    elements.inputModeSimple.addEventListener("click", () => setInputMode(INPUT_MODES.SIMPLE));
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
    elements.shareUrl.addEventListener("click", copyShareUrl);
    elements.downloadPdf.addEventListener("click", exportPdf);

    render();
    if (state.readOnly) {
      setSaveStatus("閲覧専用モード");
    } else if (!localStorage.getItem(STORAGE_KEY)) {
      scheduleAutosave();
    }
  } catch (error) {
    console.error(error);
    elements.tableBody.innerHTML = "<tr><td colspan=\"13\">JSON読み込みに失敗しました</td></tr>";
    setSaveStatus("読み込みに失敗しました");
  } finally {
    document.body.classList.remove("loading");
  }
}

init();
