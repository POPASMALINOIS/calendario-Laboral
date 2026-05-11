const currentYear = new Date().getFullYear();

let selectedYear = Number(localStorage.getItem("selectedCalendarYear")) || currentYear;
let selectedMonth = new Date().getMonth();
let selectedWeekDate = new Date();
let calendarView = localStorage.getItem("calendarView") || "month";
let selectedDayKey = null;

const categories = [
  { name: "Turno Mañana", color: "#2563eb", unit: "días" },
  { name: "Día Blanco", color: "#64748b", unit: "días" },
  { name: "Asuntos Propios", color: "#7c3aed", unit: "días" },
  { name: "Vacaciones", color: "#16a34a", unit: "días" },
  { name: "Baja", color: "#dc2626", unit: "días" },
  { name: "Día Blanco Móvil", color: "#0891b2", unit: "días" },
  { name: "Día Blanco trabajar", color: "#ea580c", unit: "días" },
  { name: "Acompañamiento 1 grado", color: "#be123c", unit: "horas" },
  { name: "Acompañamiento hijos", color: "#9333ea", unit: "horas" }
];

const permitCategories = categories.filter(c => c.name !== "Turno Mañana");

let data = JSON.parse(localStorage.getItem("calendarioLaboralData")) || {
  marks: {},
  counters: {},
  permits: [],
  observations: {},
  extraHours: [],
  workerName: ""
};

if (!data.marks) data.marks = {};
if (!data.counters) data.counters = {};
if (!data.permits) data.permits = [];
if (!data.observations) data.observations = {};
if (!data.extraHours) data.extraHours = [];
if (!data.workerName) data.workerName = "";

function saveData() {
  localStorage.setItem("calendarioLaboralData", JSON.stringify(data));
}

function ensureCounters() {
  categories.forEach(cat => {
    if (!data.counters[cat.name]) {
      data.counters[cat.name] = { total: 0 };
    }
  });
}

function init() {
  ensureCounters();
  fillCategorySelects();
  createYearSelector();
  updateHeader();
  updateCalendarModeButtons();
  renderDashboard();
  renderCalendar();
  loadWorkerName();
}

function updateHeader() {
  const yearLabel = document.getElementById("yearLabel");
  if (!yearLabel) return;

  yearLabel.textContent = data.workerName
    ? `${data.workerName} · ${selectedYear}`
    : `Año ${selectedYear}`;
}

function fillCategorySelects() {
  const select = document.getElementById("categorySelect");
  const modalSelect = document.getElementById("modalCategory");

  [select, modalSelect].forEach(target => {
    if (!target) return;
    target.innerHTML = "";

    categories.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat.name;
      option.textContent = cat.name;
      target.appendChild(option);
    });
  });
}

function createYearSelector() {
  const selector = document.querySelector(".selector");
  if (!selector || document.getElementById("yearSelect")) return;

  const wrapper = document.createElement("div");
  wrapper.className = "year-selector";

  let options = "";

  for (let y = currentYear - 2; y <= currentYear + 6; y++) {
    options += `<option value="${y}" ${y === selectedYear ? "selected" : ""}>${y}</option>`;
  }

  wrapper.innerHTML = `
    <label for="yearSelect">Año</label>
    <select id="yearSelect" onchange="changeYear()">
      ${options}
    </select>
  `;

  selector.appendChild(wrapper);
}

function changeYear() {
  const yearSelect = document.getElementById("yearSelect");
  if (!yearSelect) return;

  selectedYear = Number(yearSelect.value);
  localStorage.setItem("selectedCalendarYear", selectedYear);

  updateHeader();
  renderDashboard();
  renderCalendar();
}

function setCalendarView(view) {
  calendarView = view;
  localStorage.setItem("calendarView", view);
  updateCalendarModeButtons();
  renderCalendar();
}

function updateCalendarModeButtons() {
  ["Year", "Month", "Week"].forEach(name => {
    const btn = document.getElementById("btn" + name);
    if (btn) btn.classList.remove("active-mode");
  });

  const active =
    calendarView === "year" ? "btnYear" :
    calendarView === "week" ? "btnWeek" :
    "btnMonth";

  const btn = document.getElementById(active);
  if (btn) btn.classList.add("active-mode");
}

function previousPeriod() {
  if (calendarView === "year") {
    selectedYear--;
  } else if (calendarView === "month") {
    selectedMonth--;
    if (selectedMonth < 0) {
      selectedMonth = 11;
      selectedYear--;
    }
  } else {
    selectedWeekDate.setDate(selectedWeekDate.getDate() - 7);
    selectedYear = selectedWeekDate.getFullYear();
    selectedMonth = selectedWeekDate.getMonth();
  }

  syncYearSelect();
  updateHeader();
  renderCalendar();
}

function nextPeriod() {
  if (calendarView === "year") {
    selectedYear++;
  } else if (calendarView === "month") {
    selectedMonth++;
    if (selectedMonth > 11) {
      selectedMonth = 0;
      selectedYear++;
    }
  } else {
    selectedWeekDate.setDate(selectedWeekDate.getDate() + 7);
    selectedYear = selectedWeekDate.getFullYear();
    selectedMonth = selectedWeekDate.getMonth();
  }

  syncYearSelect();
  updateHeader();
  renderCalendar();
}

function syncYearSelect() {
  const yearSelect = document.getElementById("yearSelect");
  if (yearSelect) yearSelect.value = selectedYear;
  localStorage.setItem("selectedCalendarYear", selectedYear);
}

function showTab(id) {
  document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));

  const selectedTab = document.getElementById(id);
  if (selectedTab) selectedTab.classList.add("active");

  if (id === "inicio") renderDashboard();
  if (id === "calendario") renderCalendar();
  if (id === "contadores") renderCounters();
  if (id === "permisos") renderPermits();
  if (id === "horas") renderExtraHours();
  if (id === "ajustes") loadWorkerName();
}

function renderDashboard() {
  setText("dashboardVacaciones", calculateRemaining("Vacaciones"));
  setText("dashboardAsuntos", calculateRemaining("Asuntos Propios"));
  setText("dashboardAcomp1", calculateRemaining("Acompañamiento 1 grado"));
  setText("dashboardAcompHijos", calculateRemaining("Acompañamiento hijos"));
  setText("dashboardBlancoMovil", calculateRemaining("Día Blanco Móvil"));
  setText("dashboardHorasExtra", getTotalExtraHours());

  const upcoming = document.getElementById("dashboardUpcoming");
  if (!upcoming) return;

  const today = new Date();
  today.setHours(0,0,0,0);

  const upcomingPermits = [...data.permits]
    .filter(p => {
      const d = new Date(p.date);
      d.setHours(0,0,0,0);
      return d >= today;
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  if (upcomingPermits.length === 0) {
    upcoming.innerHTML = "<p>No hay permisos próximos registrados.</p>";
    return;
  }

  upcoming.innerHTML = upcomingPermits.map(p => `
    <div class="history-card compact-card">
      <p><strong>${formatDate(p.date)}</strong></p>
      <p>${p.type}</p>
      <p>${p.note || ""}</p>
    </div>
  `).join("");
}

function renderCalendar() {
  if (calendarView === "year") renderYearCalendar();
  if (calendarView === "month") renderMonthCalendar();
  if (calendarView === "week") renderWeekCalendar();
}

function renderYearCalendar() {
  const grid = document.getElementById("calendarGrid");
  if (!grid) return;

  grid.innerHTML = "";
  setText("currentMonthLabel", selectedYear);

  const wrap = document.createElement("div");
  wrap.className = "year-grid";

  for (let month = 0; month < 12; month++) {
    wrap.appendChild(buildMiniMonth(selectedYear, month));
  }

  grid.appendChild(wrap);
}

function renderMonthCalendar() {
  const grid = document.getElementById("calendarGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const monthNames = getMonthNames();
  setText("currentMonthLabel", `${monthNames[selectedMonth]} ${selectedYear}`);

  const box = document.createElement("div");
  box.className = "month";

  const weekdays = document.createElement("div");
  weekdays.className = "weekdays";

  ["L","M","X","J","V","S","D"].forEach(d => {
    const el = document.createElement("div");
    el.textContent = d;
    weekdays.appendChild(el);
  });

  box.appendChild(weekdays);

  const days = document.createElement("div");
  days.className = "days";

  const firstDay = new Date(selectedYear, selectedMonth, 1);
  let start = firstDay.getDay();
  start = start === 0 ? 6 : start - 1;

  for (let i = 0; i < start; i++) {
    const empty = document.createElement("div");
    empty.className = "day empty";
    days.appendChild(empty);
  }

  const totalDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  for (let d = 1; d <= totalDays; d++) {
    days.appendChild(buildDayCell(selectedYear, selectedMonth, d, "day"));
  }

  box.appendChild(days);
  grid.appendChild(box);
}

function renderWeekCalendar() {
  const grid = document.getElementById("calendarGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const start = getMonday(selectedWeekDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  setText("currentMonthLabel", `${formatDate(dateKeyFromDate(start))} - ${formatDate(dateKeyFromDate(end))}`);

  const weekBox = document.createElement("div");
  weekBox.className = "week-view";

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    const dateKey = dateKeyFromDate(d);
    const dayCard = document.createElement("div");
    dayCard.className = "week-day-card";

    const dayName = d.toLocaleDateString("es-ES", { weekday: "long" });
    const marks = getDayMarks(dateKey);
    const extras = getExtraHoursForDate(dateKey);

    dayCard.innerHTML = `
      <div class="week-day-title">
        <strong>${capitalize(dayName)}</strong>
        <span>${formatDate(dateKey)}</span>
      </div>
      <div class="week-day-content">
        ${marks.length === 0 && extras.length === 0 ? "<p>Sin registros</p>" : ""}
      </div>
    `;

    const content = dayCard.querySelector(".week-day-content");

    marks.forEach(item => {
      const cat = categories.find(c => c.name === item.category);
      content.innerHTML += `<span class="badge week-badge" style="background:${cat?.color || "#333"}">${item.category}</span>`;
    });

    extras.forEach(e => {
      content.innerHTML += `<span class="badge week-badge extra-badge">⏱️ ${e.hours} h extra</span>`;
    });

    attachDayEvents(dayCard, dateKey);
    weekBox.appendChild(dayCard);
  }

  grid.appendChild(weekBox);
}

function buildMiniMonth(year, month) {
  const monthNames = getMonthNames();
  const box = document.createElement("div");
  box.className = "mini-month";

  const title = document.createElement("h3");
  title.textContent = monthNames[month];
  box.appendChild(title);

  const weekdays = document.createElement("div");
  weekdays.className = "mini-weekdays";
  ["L","M","X","J","V","S","D"].forEach(d => {
    const el = document.createElement("div");
    el.textContent = d;
    weekdays.appendChild(el);
  });
  box.appendChild(weekdays);

  const days = document.createElement("div");
  days.className = "mini-days";

  const firstDay = new Date(year, month, 1);
  let start = firstDay.getDay();
  start = start === 0 ? 6 : start - 1;

  for (let i = 0; i < start; i++) {
    const empty = document.createElement("div");
    empty.className = "mini-day empty";
    days.appendChild(empty);
  }

  const totalDays = new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= totalDays; d++) {
    days.appendChild(buildDayCell(year, month, d, "mini-day"));
  }

  box.appendChild(days);
  return box;
}

function buildDayCell(year, month, d, className) {
  const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const holidays = getSpanishNationalHolidays(year);
  const day = document.createElement("div");
  day.className = className;

  if (holidays[dateKey]) day.classList.add("holiday");

  let html = `<strong>${d}</strong>`;

  if (holidays[dateKey] && className === "day") {
    html += `<span class="holiday-chip">Festivo</span>`;
  }

  getDayMarks(dateKey).forEach(item => {
    const cat = categories.find(c => c.name === item.category);
    if (cat) {
      html += className === "mini-day"
        ? `<span class="mini-dot" style="background:${cat.color}"></span>`
        : `<span class="cat-chip" style="background:${cat.color}">${cat.name}</span>`;
    }
  });

  const extras = getExtraHoursForDate(dateKey);
  if (extras.length > 0) {
    html += className === "mini-day"
      ? `<span class="mini-dot extra-dot"></span>`
      : `<span class="cat-chip extra-chip">⏱️ Horas extra</span>`;
  }

  if (data.observations[dateKey]) {
    html += `<span class="note-dot"></span>`;
  }

  day.innerHTML = html;
  attachDayEvents(day, dateKey);
  return day;
}

function attachDayEvents(day, dateKey) {
  let pressTimer = null;

  const startPress = () => {
    pressTimer = setTimeout(() => {
      pressTimer = null;
      openDayModal(dateKey);
    }, 600);
  };

  const endPress = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
      quickMarkDay(dateKey);
    }
  };

  const cancelPress = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };

  day.addEventListener("touchstart", startPress, { passive: true });
  day.addEventListener("touchend", endPress, { passive: true });
  day.addEventListener("touchcancel", cancelPress, { passive: true });
  day.addEventListener("mousedown", startPress);
  day.addEventListener("mouseup", endPress);
  day.addEventListener("mouseleave", cancelPress);
  day.addEventListener("contextmenu", e => e.preventDefault());
}

function quickMarkDay(dateKey) {
  const selected = document.getElementById("categorySelect")?.value;
  if (!selected) return;

  if (!Array.isArray(data.marks[dateKey])) {
    data.marks[dateKey] = data.marks[dateKey] ? [data.marks[dateKey]] : [];
  }

  const exists = data.marks[dateKey].some(m => m.category === selected);

  if (exists) {
    data.marks[dateKey] = data.marks[dateKey].filter(m => m.category !== selected);
    if (data.marks[dateKey].length === 0) delete data.marks[dateKey];
  } else {
    data.marks[dateKey].push({
      category: selected,
      amount: 1,
      createdAt: new Date().toISOString()
    });
  }

  saveData();
  renderDashboard();
  renderCalendar();
}

function openDayModal(dateKey) {
  selectedDayKey = dateKey;

  const modal = document.getElementById("dayModal");
  if (!modal) return;

  const modalDate = document.getElementById("modalDate");
  if (modalDate) modalDate.textContent = formatDateLong(dateKey);

  const observationInput = document.getElementById("dayObservation");
  if (observationInput) observationInput.value = data.observations[dateKey] || "";

  const holidays = getSpanishNationalHolidays(Number(dateKey.split("-")[0]));
  const holidayBox = document.getElementById("modalHoliday");

  if (holidayBox) {
    holidayBox.innerHTML = holidays[dateKey]
      ? `<div class="holiday-box">Festivo nacional: ${holidays[dateKey]}</div>`
      : "";
  }

  renderModalDayInfo();
  modal.classList.remove("hidden");
}

function closeDayModal() {
  selectedDayKey = null;
  const modal = document.getElementById("dayModal");
  if (modal) modal.classList.add("hidden");
}

function renderModalDayInfo() {
  const box = document.getElementById("modalDayInfo");
  if (!box || !selectedDayKey) return;

  const marks = getDayMarks(selectedDayKey);
  const extras = getExtraHoursForDate(selectedDayKey);

  let html = "";

  if (marks.length === 0 && extras.length === 0) {
    html += `<div class="observation-box">Este día no tiene categorías marcadas.</div>`;
  }

  marks.forEach((item, index) => {
    const cat = categories.find(c => c.name === item.category);

    html += `
      <div class="day-detail-item">
        <p>
          <span class="badge" style="background:${cat?.color || "#333"}">
            ${item.category}
          </span>
        </p>
        <p>Cantidad: <strong>${item.amount || 1} ${cat?.unit || ""}</strong></p>
        <button type="button" class="secondary" onclick="editDayCategoryAmount(${index})">Editar cantidad</button>
        <button type="button" class="danger" onclick="removeCategoryFromSelectedDay(${index})">Quitar categoría</button>
      </div>
    `;
  });

  extras.forEach(e => {
    html += `
      <div class="day-detail-item">
        <p><span class="badge extra-badge">⏱️ Horas extra</span></p>
        <p><strong>${e.hours} horas</strong></p>
        <p>${e.note || ""}</p>
      </div>
    `;
  });

  box.innerHTML = html;
}

function addCategoryToSelectedDay() {
  if (!selectedDayKey) return;

  const selected = document.getElementById("modalCategory")?.value;
  if (!selected) return;

  const cat = categories.find(c => c.name === selected);

  if (!Array.isArray(data.marks[selectedDayKey])) {
    data.marks[selectedDayKey] = data.marks[selectedDayKey] ? [data.marks[selectedDayKey]] : [];
  }

  const alreadyExists = data.marks[selectedDayKey].some(m => m.category === selected);

  if (alreadyExists) {
    alert("Esta categoría ya está marcada en este día.");
    return;
  }

  let amount = 1;

  if (cat && cat.unit === "horas") {
    const input = prompt(`¿Cuántas horas quieres descontar de "${selected}"?`, "1");
    if (input === null || input === "") return;
    amount = Number(input);
    if (isNaN(amount) || amount <= 0) {
      alert("Introduce un número válido.");
      return;
    }
  }

  data.marks[selectedDayKey].push({
    category: selected,
    amount,
    createdAt: new Date().toISOString()
  });

  saveData();
  renderDashboard();
  renderModalDayInfo();
  renderCalendar();
}

function removeCategoryFromSelectedDay(index) {
  if (!selectedDayKey) return;
  if (!confirm("¿Quitar esta categoría del día?")) return;

  const marks = getDayMarks(selectedDayKey);
  marks.splice(index, 1);

  if (marks.length === 0) {
    delete data.marks[selectedDayKey];
  } else {
    data.marks[selectedDayKey] = marks;
  }

  saveData();
  renderDashboard();
  renderModalDayInfo();
  renderCalendar();
}

function editDayCategoryAmount(index) {
  if (!selectedDayKey) return;

  const marks = getDayMarks(selectedDayKey);
  const item = marks[index];
  const cat = categories.find(c => c.name === item.category);

  const newAmount = prompt(`Introduce cantidad en ${cat?.unit || "unidades"}:`, item.amount || 1);

  if (newAmount === null || newAmount === "") return;

  const value = Number(newAmount);

  if (isNaN(value) || value <= 0) {
    alert("Introduce un número válido.");
    return;
  }

  marks[index].amount = value;
  data.marks[selectedDayKey] = marks;

  saveData();
  renderDashboard();
  renderModalDayInfo();
  renderCalendar();
}

function saveDayObservation() {
  if (!selectedDayKey) return;

  const input = document.getElementById("dayObservation");
  const note = input ? input.value.trim() : "";

  if (note) {
    data.observations[selectedDayKey] = note;
  } else {
    delete data.observations[selectedDayKey];
  }

  saveData();
  renderCalendar();
  alert("Observación guardada.");
}

function renderCounters() {
  const list = document.getElementById("counterList");
  if (!list) return;

  list.innerHTML = "";

  categories.forEach(cat => {
    const used = calculateUsed(cat.name);
    const total = Number(data.counters[cat.name]?.total || 0);
    const remaining = total - used;

    const card = document.createElement("div");
    card.className = "counter-card compact-counter";

    card.innerHTML = `
      <div class="counter-head">
        <span class="badge" style="background:${cat.color}">${cat.name}</span>
        <strong>${remaining} ${cat.unit}</strong>
      </div>

      <div class="counter-mini-grid">
        <label>Total</label>
        <input type="number" step="0.5" min="0" value="${total}" data-counter="${cat.name}">
        <span>Usado: ${used} ${cat.unit}</span>
      </div>
    `;

    list.appendChild(card);
  });
}

function saveCounters() {
  document.querySelectorAll("[data-counter]").forEach(input => {
    const name = input.getAttribute("data-counter");

    data.counters[name] = {
      total: Number(input.value || 0)
    };
  });

  saveData();
  renderDashboard();
  renderCounters();
  alert("Contadores guardados.");
}

function renderPermits() {
  const list = document.getElementById("historyList");
  if (!list) return;

  const options = permitCategories
    .map(cat => `<option value="${cat.name}">${cat.name}</option>`)
    .join("");

  const permitsSorted = [...data.permits].sort((a, b) => a.date.localeCompare(b.date));

  list.innerHTML = `
    <div class="glass-card">
      <label>Fecha</label>
      <input type="date" id="permitDate">

      <label>Tipo de permiso</label>
      <select id="permitType">${options}</select>

      <label>Observación</label>
      <input type="text" id="permitNote">

      <button type="button" onclick="addPermit()">Añadir permiso</button>
    </div>

    <div id="permitRows"></div>
  `;

  const rows = document.getElementById("permitRows");

  if (!rows) return;

  if (permitsSorted.length === 0) {
    rows.innerHTML = "<p>No hay permisos registrados.</p>";
    return;
  }

  rows.innerHTML = permitsSorted.map((p, index) => `
    <div class="history-card">
      <p><strong>${formatDate(p.date)}</strong></p>
      <p>${p.type}</p>
      <p>${p.note || ""}</p>
      <button class="danger" onclick="deletePermit(${index})">Eliminar</button>
    </div>
  `).join("");
}

function addPermit() {
  const date = document.getElementById("permitDate")?.value;
  const type = document.getElementById("permitType")?.value;
  const note = document.getElementById("permitNote")?.value || "";

  if (!date) {
    alert("Selecciona una fecha.");
    return;
  }

  data.permits.push({
    date,
    type,
    note,
    createdAt: new Date().toISOString()
  });

  saveData();
  renderDashboard();
  renderPermits();
}

function deletePermit(index) {
  const sorted = [...data.permits].sort((a, b) => a.date.localeCompare(b.date));
  const item = sorted[index];

  data.permits = data.permits.filter(p => p.createdAt !== item.createdAt);

  saveData();
  renderDashboard();
  renderPermits();
}

function addExtraHours() {
  const date = document.getElementById("extraDate")?.value;
  const hours = Number(document.getElementById("extraHours")?.value || 0);
  const note = document.getElementById("extraNote")?.value || "";

  if (!date || hours <= 0) {
    alert("Introduce fecha y horas válidas.");
    return;
  }

  data.extraHours.push({
    date,
    hours,
    note,
    createdAt: new Date().toISOString()
  });

  saveData();
  document.getElementById("extraDate").value = "";
  document.getElementById("extraHours").value = "";
  document.getElementById("extraNote").value = "";

  renderDashboard();
  renderExtraHours();
  renderCalendar();
}

function renderExtraHours() {
  const list = document.getElementById("extraHoursList");
  if (!list) return;

  const sorted = [...data.extraHours].sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) {
    list.innerHTML = `<div class="glass-card"><p>No hay horas extra registradas.</p></div>`;
    return;
  }

  list.innerHTML = sorted.map((e, index) => `
    <div class="history-card">
      <p><strong>${formatDate(e.date)}</strong></p>
      <p>⏱️ ${e.hours} horas</p>
      <p>${e.note || ""}</p>
      <button class="danger" onclick="deleteExtraHours(${index})">Eliminar</button>
    </div>
  `).join("");
}

function deleteExtraHours(index) {
  const sorted = [...data.extraHours].sort((a, b) => a.date.localeCompare(b.date));
  const item = sorted[index];

  data.extraHours = data.extraHours.filter(e => e.createdAt !== item.createdAt);

  saveData();
  renderDashboard();
  renderExtraHours();
  renderCalendar();
}

function getExtraHoursForDate(dateKey) {
  return data.extraHours.filter(e => e.date === dateKey);
}

function getTotalExtraHours() {
  return data.extraHours.reduce((sum, e) => sum + Number(e.hours || 0), 0);
}

function getDayMarks(dateKey) {
  if (!data.marks[dateKey]) return [];
  return Array.isArray(data.marks[dateKey]) ? data.marks[dateKey] : [data.marks[dateKey]];
}

function calculateUsed(categoryName) {
  let total = 0;

  Object.values(data.marks).forEach(dayMarks => {
    const marks = Array.isArray(dayMarks) ? dayMarks : [dayMarks];

    marks.forEach(item => {
      if (item.category === categoryName) {
        total += Number(item.amount || 1);
      }
    });
  });

  return total;
}

function calculateRemaining(categoryName) {
  const total = Number(data.counters[categoryName]?.total || 0);
  return total - calculateUsed(categoryName);
}

function saveWorkerName() {
  const input = document.getElementById("workerName");
  if (!input) return;

  data.workerName = input.value.trim();

  saveData();
  updateHeader();
  alert("Nombre guardado.");
}

function loadWorkerName() {
  const input = document.getElementById("workerName");
  if (input) input.value = data.workerName || "";
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatDate(date) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

function formatDateLong(date) {
  const [y, m, d] = date.split("-");
  const parsed = new Date(Number(y), Number(m) - 1, Number(d));

  return parsed.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function dateKeyFromDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getMonthNames() {
  return ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getSpanishNationalHolidays(year) {
  const easter = getEasterDate(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);

  const holidays = {};

  const add = (month, day, name) => {
    holidays[`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`] = name;
  };

  add(1,1,"Año Nuevo");
  add(1,6,"Reyes");
  add(goodFriday.getMonth() + 1, goodFriday.getDate(), "Viernes Santo");
  add(5,1,"Fiesta del Trabajo");
  add(8,15,"Asunción");
  add(10,12,"Fiesta Nacional");
  add(11,1,"Todos los Santos");
  add(12,6,"Constitución");
  add(12,8,"Inmaculada");
  add(12,25,"Navidad");

  return holidays;
}

function getEasterDate(year) {
  const f = Math.floor;
  const G = year % 19;
  const C = f(year / 100);
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
  const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;
  const L = I - J;
  const month = 3 + f((L + 40) / 44);
  const day = L + 28 - 31 * f(month / 4);

  return new Date(year, month - 1, day);
}

function exportData() {
  const text = JSON.stringify(data, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "calendario-laboral-pro.json";
  a.click();

  URL.revokeObjectURL(url);
}

function clearAll() {
  if (!confirm("¿Seguro que deseas borrar todos los datos?")) return;
  localStorage.removeItem("calendarioLaboralData");
  location.reload();
}

document.addEventListener("DOMContentLoaded", init);
