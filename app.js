const currentYear = new Date().getFullYear();

let selectedYear = Number(localStorage.getItem("selectedCalendarYear")) || currentYear;
let selectedMonth = new Date().getMonth();
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
  workerName: ""
};

if (!data.marks) data.marks = {};
if (!data.counters) data.counters = {};
if (!data.permits) data.permits = [];
if (!data.observations) data.observations = {};
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
  renderDashboard();
  renderCalendar();
  loadWorkerName();
}

function updateHeader() {
  const yearLabel = document.getElementById("yearLabel");
  if (!yearLabel) return;

  if (data.workerName) {
    yearLabel.textContent = `${data.workerName} · ${selectedYear}`;
  } else {
    yearLabel.textContent = `Año ${selectedYear}`;
  }
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
  wrapper.style.marginTop = "12px";

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

function previousMonth() {
  selectedMonth--;

  if (selectedMonth < 0) {
    selectedMonth = 11;
    selectedYear--;
  }

  updateHeader();
  renderCalendar();
}

function nextMonth() {
  selectedMonth++;

  if (selectedMonth > 11) {
    selectedMonth = 0;
    selectedYear++;
  }

  updateHeader();
  renderCalendar();
}

function showTab(id) {
  document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));

  const selectedTab = document.getElementById(id);
  if (selectedTab) selectedTab.classList.add("active");

  if (id === "inicio") renderDashboard();
  if (id === "calendario") renderCalendar();
  if (id === "contadores") renderCounters();
  if (id === "permisos") renderPermits();
}

function renderDashboard() {
  const vacaciones = calculateRemaining("Vacaciones");
  const asuntos = calculateRemaining("Asuntos Propios");
  const horas =
    calculateRemaining("Acompañamiento 1 grado") +
    calculateRemaining("Acompañamiento hijos");

  const permisos = data.permits.length;

  setText("dashboardVacaciones", vacaciones);
  setText("dashboardAsuntos", asuntos);
  setText("dashboardHoras", horas);
  setText("dashboardPermisos", permisos);

  const upcoming = document.getElementById("dashboardUpcoming");

  if (!upcoming) return;

  const upcomingPermits = [...data.permits]
    .filter(p => new Date(p.date) >= new Date())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  if (upcomingPermits.length === 0) {
    upcoming.innerHTML = "<p>No hay permisos próximos registrados.</p>";
    return;
  }

  upcoming.innerHTML = upcomingPermits.map(p => `
    <div class="history-card">
      <p><strong>${formatDate(p.date)}</strong></p>
      <p>${p.type}</p>
      <p>${p.note || ""}</p>
    </div>
  `).join("");
}

function renderCalendar() {
  const grid = document.getElementById("calendarGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  setText("currentMonthLabel", `${monthNames[selectedMonth]} ${selectedYear}`);

  const holidays = getSpanishNationalHolidays(selectedYear);

  const box = document.createElement("div");
  box.className = "month";

  const title = document.createElement("h3");
  title.textContent = monthNames[selectedMonth];
  box.appendChild(title);

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
    const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const day = document.createElement("div");
    day.className = "day";

    if (holidays[dateKey]) {
      day.classList.add("holiday");
    }

    let html = `<strong>${d}</strong>`;

    if (holidays[dateKey]) {
      html += `<span class="holiday-chip">Festivo</span>`;
    }

    getDayMarks(dateKey).forEach(item => {
      const cat = categories.find(c => c.name === item.category);

      if (cat) {
        html += `<span class="cat-chip" style="background:${cat.color}">${cat.name}</span>`;
      }
    });

    if (data.observations[dateKey]) {
      html += `<span class="note-dot"></span>`;
    }

    day.innerHTML = html;

    attachDayEvents(day, dateKey);

    days.appendChild(day);
  }

  box.appendChild(days);
  grid.appendChild(box);
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

  const cat = categories.find(c => c.name === selected);

  if (!Array.isArray(data.marks[dateKey])) {
    data.marks[dateKey] = data.marks[dateKey] ? [data.marks[dateKey]] : [];
  }

  const exists = data.marks[dateKey].some(m => m.category === selected);

  if (exists) {
    data.marks[dateKey] = data.marks[dateKey].filter(m => m.category !== selected);

    if (data.marks[dateKey].length === 0) {
      delete data.marks[dateKey];
    }
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

function renderCounters() {
  const list = document.getElementById("counterList");
  if (!list) return;

  list.innerHTML = "";

  categories.forEach(cat => {
    const used = calculateUsed(cat.name);
    const total = Number(data.counters[cat.name]?.total || 0);
    const remaining = total - used;

    const card = document.createElement("div");
    card.className = "counter-card";

    card.innerHTML = `
      <h3><span class="badge" style="background:${cat.color}">${cat.name}</span></h3>

      <label>Total disponible</label>
      <input type="number" step="0.5" min="0" value="${total}" data-counter="${cat.name}">

      <label>Usado</label>
      <input type="text" value="${used} ${cat.unit}" disabled>

      <label>Restante</label>
      <input type="text" value="${remaining} ${cat.unit}" disabled>
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
  if (input) {
    input.value = data.workerName || "";
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatDate(date) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

function getSpanishNationalHolidays(year) {
  const holidays = {};

  const add = (month, day, name) => {
    holidays[`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`] = name;
  };

  add(1,1,"Año Nuevo");
  add(1,6,"Reyes");
  add(5,1,"Fiesta del Trabajo");
  add(8,15,"Asunción");
  add(10,12,"Fiesta Nacional");
  add(11,1,"Todos los Santos");
  add(12,6,"Constitución");
  add(12,8,"Inmaculada");
  add(12,25,"Navidad");

  return holidays;
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
