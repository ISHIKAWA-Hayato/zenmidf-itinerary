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

function render() {
  if (!state.data?.trip) return;
  const trip = state.data.trip;

  renderTripMeta(trip);
  renderTabs(trip.days);
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
    render();
  } catch (error) {
    console.error(error);
    elements.tableBody.innerHTML = "<tr><td colspan=\"13\">JSON読み込みに失敗しました</td></tr>";
  }
}

init();