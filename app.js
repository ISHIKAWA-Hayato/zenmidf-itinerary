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

  // Update state on input change
  startInput.addEventListener("input", () => updateItem(rowIndex, "start", startInput.value));
  endInput.addEventListener("input", () => updateItem(rowIndex, "end", endInput.value));
  typeSelect.addEventListener("change", () => updateItem(rowIndex, "type", typeSelect.value));
  titleInput.addEventListener("input", () => updateItem(rowIndex, "title", titleInput.value));
  fromInput.addEventListener("input", () => updateItem(rowIndex, "from", fromInput.value));
  toInput.addEventListener("input", () => updateItem(rowIndex, "to", toInput.value));
  locationInput.addEventListener("input", () => updateItem(rowIndex, "location", locationInput.value));
  kindInput.addEventListener("input", () => updateItem(rowIndex, "kind", kindInput.value));
  categoryInput.addEventListener("input", () => updateItem(rowIndex, "category", categoryInput.value));
  transportInput.addEventListener("input", () => updateItem(rowIndex, "transport", transportInput.value));
  costInput.addEventListener("input", () => updateItem(rowIndex, "cost", Number(costInput.value)));
  memoInput.addEventListener("input", () => updateItem(rowIndex, "memo", memoInput.value));

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
    render();
  } catch (error) {
    console.error(error);
    elements.tableBody.innerHTML = "<tr><td colspan=\"13\">JSON読み込みに失敗しました</td></tr>";
  }
}

init();