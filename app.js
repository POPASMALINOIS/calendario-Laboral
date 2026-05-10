const currentYear = new Date().getFullYear();
let selectedYear = Number(localStorage.getItem("selectedCalendarYear")) || currentYear;

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
  permits: []
};

if (!data.permits) data.permits = [];

function saveData() {
  localStorage.setItem("calendarioLaboralData", JSON.stringify(data));
}

function ensureCounters() {
  categories.forEach(cat => {
    if (!data.counters[cat.name]) data.counters[cat.name] = { total: 0 };
  });
  saveData();
}

function init() {
  document.getElementById("yearLabel").textContent = "Año " + selectedYear;

  const select = document.getElementById("categorySelect");
  select.innerHTML = "";

  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat.name;
    option.textContent = cat.name;
    select.appendChild(option);
  });

  createYearSelector();
  ensureCounters();
  renderCalendar();
}

function createYearSelector() {
  const selectorBox = document.querySelector(".selector");

  if (!document.getElementById("yearSelect")) {
    const wrapper = document.createElement("div");
    wrapper.style.marginTop = "12px";

    let options = "";
    for (let y = currentYear - 2; y <= currentYear + 6; y++) {
      options += `<option value="${y}" ${y === selectedYear ? "selected" : ""}>${y}</option>`;
    }

    wrapper.innerHTML = `
      <label for="yearSelect">Año del calendario</label>
      <select id="yearSelect" onchange="changeYear()">
        ${options}
      </select>
    `;

    selectorBox.appendChild(wrapper);
  }
}

function changeYear() {
  selectedYear = Number(document.getElementById("yearSelect").value);
  localStorage.setItem("selectedCalendarYear", selectedYear);
  document.getElementById("yearLabel").textContent = "Año " + selectedYear;
  renderCalendar();
}

function showTab(id) {
  document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  if (id === "contadores") renderCounters();
  if (id === "permisos") renderPermits();
}

function renderCalendar() {
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const weekDays = ["L", "M", "X", "J", "V", "S", "D"];
  const holidays = getSpanishNationalHolidays(selectedYear);

  for (let month = 0; month < 12; month++) {
    const box = document.createElement("div");
    box.className = "month";

    const title = document.createElement("h3");
    title.textContent = monthNames[month];
    box.appendChild(title);

    const weekdays = document.createElement("div");
    weekdays.className = "weekdays";

    weekDays.forEach(d => {
      const el = document.createElement("div");
      el.textContent = d;
      weekdays.appendChild(el);
    });

    box.appendChild(weekdays);

    const days = document.createElement("div");
    days.className = "days";

    const firstDay = new Date(selectedYear, month, 1);
    let start = firstDay.getDay();
    start = start === 0 ? 6 : start - 1;

    for (let i = 0; i < start; i++) {
      const empty = document.createElement("div");
      empty.className = "day empty";
      days.appendChild(empty);
    }

    const totalDays = new Date(selectedYear, month + 1, 0).getDate();

    for (let d = 1; d <= totalDays; d++) {
      const dateKey = `${selectedYear}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const day = document.createElement("div");
      day.className = "day";

      if (holidays[dateKey]) day.classList.add("holiday");

      let html = `<strong>${d}</strong>`;

      if (holidays[dateKey]) {
        html += `<span class="holiday-chip">Festivo</span>`;
      }

      const marks = Array.isArray(data.marks[dateKey])
        ? data.marks[dateKey]
        : data.marks[dateKey]
          ? [data.marks[dateKey]]
          : [];

      marks.forEach(item => {
        const cat = categories.find(c => c.name === item.category);
        if (cat) {
          html += `<span class="cat-chip" style="background:${cat.color}">${cat.name}</span>`;
        }
      });

      day.innerHTML = html;
      day.onclick = () => markDay(dateKey);

      days.appendChild(day);
    }

    box.appendChild(days);
    grid.appendChild(box);
  }
}

function markDay(dateKey) {
  const selected = document.getElementById("categorySelect").value;
  const cat = categories.find(c => c.name === selected);

  if (!Array.isArray(data.marks[dateKey])) {
    data.marks[dateKey] = data.marks[dateKey] ? [data.marks[dateKey]] : [];
  }

  const alreadyExists = data.marks[dateKey].some(m => m.category === selected);

  if (alreadyExists) {
    const remove = confirm("Esta categoría ya está marcada en este día. ¿Quieres quitarla?");
    if (remove) {
      data.marks[dateKey] = data.marks[dateKey].filter(m => m.category !== selected);
      if (data.marks[dateKey].length === 0) delete data.marks[dateKey];
    }
  } else {
    let amount = 1;

    if (cat.unit === "horas") {
      const input = prompt(`¿Cuántas horas quieres descontar de "${selected}"?`, "1");
      if (input === null || input === "") return;

      amount = Number(input);

      if (isNaN(amount) || amount <= 0) {
        alert("Introduce un número válido.");
        return;
      }
    }

    data.marks[dateKey].push({
      category: selected,
      amount,
      createdAt: new Date().toISOString()
    });
  }

  saveData();
  renderCalendar();
}

function renderCounters() {
  ensureCounters();

  const list = document.getElementById("counterList");
  list.innerHTML = "";

  categories.forEach(cat => {
    const used = calculateUsed(cat.name);
    const total = Number(data.counters[cat.name]?.total || 0);
    const remaining = total - used;

    const card = document.createElement("div");
    card.className = "counter-card";

    card.innerHTML = `
      <h3><span class="badge" style="background:${cat.color}">${cat.name}</span></h3>

      <div class="counter-row">
        <div>
          <label>Total disponible</label>
          <input type="number" step="0.5" min="0" value="${total}" data-counter="${cat.name}">
        </div>

        <div>
          <label>Usado</label>
          <input type="text" value="${used} ${cat.unit}" disabled>
        </div>

        <div>
          <label>Restante</label>
          <input type="text" value="${remaining} ${cat.unit}" disabled>
        </div>
      </div>
    `;

    list.appendChild(card);
  });
}

function saveCounters() {
  document.querySelectorAll("[data-counter]").forEach(input => {
    const name = input.getAttribute("data-counter");
    data.counters[name] = { total: Number(input.value || 0) };
  });

  saveData();
  renderCounters();
  alert("Contadores guardados.");
}

function calculateUsed(categoryName) {
  let total = 0;

  Object.values(data.marks).forEach(dayMarks => {
    const marks = Array.isArray(dayMarks) ? dayMarks : [dayMarks];
    marks.forEach(item => {
      if (item.category === categoryName) total += Number(item.amount || 1);
    });
  });

  return total;
}

function renderPermits() {
  const list = document.getElementById("historyList");

  const options = permitCategories
    .map(cat => `<option value="${cat.name}">${cat.name}</option>`)
    .join("");

  const permitsSorted = [...data.permits].sort((a, b) => a.date.localeCompare(b.date));

  list.innerHTML = `
    <div class="counter-card">
      <h3>Nuevo permiso</h3>

      <label>Fecha</label>
      <input type="date" id="permitDate">

      <label>Tipo de permiso</label>
      <select id="permitType">${options}</select>

      <label>Observación</label>
      <input type="text" id="permitNote" placeholder="Ej: médico, colegio, gestión personal...">

      <button type="button" onclick="addPermit()">Añadir permiso</button>
    </div>

    <div class="counter-card">
      <h3>Permisos registrados</h3>
      <div id="permitRows"></div>
    </div>
  `;

  const rows = document.getElementById("permitRows");

  if (permitsSorted.length === 0) {
    rows.innerHTML = "<p>No hay permisos registrados.</p>";
    return;
  }

  rows.innerHTML = permitsSorted.map((p, index) => {
    const cat = categories.find(c => c.name === p.type);
    return `
      <div class="history-card">
        <p><strong>${formatDate(p.date)}</strong></p>
        <p><span class="badge" style="background:${cat?.color || "#333"}">${p.type}</span></p>
        <p>${p.note || "Sin observaciones"}</p>
        <button class="danger" type="button" onclick="deletePermit(${index})">Eliminar</button>
      </div>
    `;
  }).join("");
}

function addPermit() {
  const date = document.getElementById("permitDate").value;
  const type = document.getElementById("permitType").value;
  const note = document.getElementById("permitNote").value.trim();

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
  renderPermits();
}

function deletePermit(index) {
  const sorted = [...data.permits].sort((a, b) => a.date.localeCompare(b.date));
  const itemToDelete = sorted[index];

  data.permits = data.permits.filter(p => p.createdAt !== itemToDelete.createdAt);

  saveData();
  renderPermits();
}

function getSpanishNationalHolidays(year) {
  const easter = getEasterDate(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);

  const holidays = {};

  const add = (month, day, name) => {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    holidays[key] = name;
  };

  add(1, 1, "Año Nuevo");
  add(1, 6, "Reyes");
  add(goodFriday.getMonth() + 1, goodFriday.getDate(), "Viernes Santo");
  add(5, 1, "Fiesta del Trabajo");
  add(8, 15, "Asunción");
  add(10, 12, "Fiesta Nacional");
  add(11, 1, "Todos los Santos");
  add(12, 6, "Constitución");
  add(12, 8, "Inmaculada");
  add(12, 25, "Navidad");

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

function formatDate(date) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

function exportData() {
  const text = JSON.stringify(data, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "calendario-laboral-copia.json";
  a.click();

  URL.revokeObjectURL(url);
}

function clearAll() {
  if (confirm("¿Seguro que quieres borrar todos los datos?")) {
    localStorage.removeItem("calendarioLaboralData");
    location.reload();
  }
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

init();
