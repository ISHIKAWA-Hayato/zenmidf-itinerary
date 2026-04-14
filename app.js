const DATA_URL = "docs/sample_itinerary_v0.json";

let tripData = null;
let currentDayIndex = 0;

const tripTitleEl = document.getElementById("trip-title");
const tripTimezoneEl = document.getElementById("trip-timezone");
const tripStartDateEl = document.getElementById("trip-start-date");
const tripDayStartEl = document.getElementById("trip-day-start");
const dayTabsEl = document.getElementById("day-tabs");
const tableBodyEl = document.getElementById("table-body");
const addRowBtn = document.getElementById("add-row");

function createEmptyItem() {
  return {
    id: `item-${Date.now()}`,
    type: "place",
    start: "",
    end: "",
    title: "",
    location: "",
    kind: "spot",
    cost: 0,
    memo: ""
  };
}

function renderTripMeta() {
  tripTitleEl.textContent = tripData.trip.title || "-";
  tripTimezoneEl.textContent = tripData.trip.timezone || "-";
  tripStartDateEl.textContent = tripData.trip.start_date || "-";
  tripDayStartEl.textContent = tripData.trip.day_start || "-";
}

function renderTabs() {
  dayTabsEl.innerHTML = "";
  tripData.trip.days.forEach((day, index) => {
    const btn = document.createElement("button");
    btn.className = `tab ${index === currentDayIndex ? "active" : ""}`;
    btn.type = "button";
    btn.textContent = `Day ${day.day}`;
    btn.addEventListener("click", () => {
      currentDayIndex = index;
      renderTabs();
      renderTable();
    });
    dayTabsEl.appendChild(btn);
  });
}

function onFieldChange(item, field, value) {
  item[field] = value;
}

function createInput(value, onChange, type = "text") {
  const input = document.createElement("input");
  input.className = "input";
  input.type = type;
  input.value = value ?? "";
  input.addEventListener("input", (event) => onChange(event.target.value));
  return input;
}

function createSelect(value, options, onChange) {
  const select = document.createElement("select");
  select.className = "input";
  options.forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt;
    option.textContent = opt;
    if (opt === value) option.selected = true;
    select.appendChild(option);
  });
  select.addEventListener("change", (event) => onChange(event.target.value));
  return select;
}

function renderTable() {
  tableBodyEl.innerHTML = "";
  const day = tripData.trip.days[currentDayIndex];
  day.items.forEach((item, idx) => {
    const row = document.createElement("tr");

    row.appendChild(createCell(createInput(item.start, (val) => onFieldChange(item, "start", val))));
    row.appendChild(createCell(createInput(item.end, (val) => onFieldChange(item, "end", val))));
    row.appendChild(createCell(createSelect(item.type, ["move", "place", "do"], (val) => onFieldChange(item, "type", val))));
    row.appendChild(createCell(createInput(item.title, (val) => onFieldChange(item, "title", val))));
    row.appendChild(createCell(createInput(item.from || "", (val) => onFieldChange(item, "from", val))));
    row.appendChild(createCell(createInput(item.to || "", (val) => onFieldChange(item, "to", val))));
    row.appendChild(createCell(createInput(item.location || "", (val) => onFieldChange(item, "location", val))));
    row.appendChild(createCell(createInput(item.kind || "", (val) => onFieldChange(item, "kind", val))));
    row.appendChild(createCell(createInput(item.category || "", (val) => onFieldChange(item, "category", val))));
    row.appendChild(createCell(createInput(item.transport || "", (val) => onFieldChange(item, "transport", val))));
    row.appendChild(createCell(createInput(item.cost ?? "", (val) => onFieldChange(item, "cost", Number(val)))));
    row.appendChild(createCell(createInput(item.memo || "", (val) => onFieldChange(item, "memo", val))));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "削除";
    deleteBtn.type = "button";
    deleteBtn.addEventListener("click", () => {
      day.items.splice(idx, 1);
      renderTable();
    });
    row.appendChild(createCell(deleteBtn));

    tableBodyEl.appendChild(row);
  });
}

function createCell(content) {
  const cell = document.createElement("td");
  cell.appendChild(content);
  return cell;
}

addRowBtn.addEventListener("click", () => {
  const day = tripData.trip.days[currentDayIndex];
  day.items.push(createEmptyItem());
  renderTable();
});

async function init() {
  const response = await fetch(DATA_URL);
  tripData = await response.json();
  renderTripMeta();
  renderTabs();
  renderTable();
}

init();