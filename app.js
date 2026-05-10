const year = new Date().getFullYear();

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
    if (!data.counters[cat.name]) {
      data.counters[cat.name] = { total: 0 };
    }
  });
  saveData();
}

function showTab(id) {
  document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  if (id === "contadores") renderCounters();
  if (id === "permisos") renderPermits();
}

function init() {
  document.getElementById("yearLabel").textContent = "Año " + year;

  const select = document.getElementById("categorySelect");
  select.innerHTML = "";

  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat.name;
    option.textContent = cat.name;
    select.appendChild(option);
  });

  ensureCounters();
  renderCalendar();
}

function renderCalendar() {
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const weekDays = ["L", "M", "X", "J", "V", "S", "D"];

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

    const firstDay = new Date(year, month, 1);
    let start = firstDay.getDay();
    start = start === 0 ? 6 : start - 1;

    for (let i = 0; i < start; i++) {
      const empty = document.createElement("div");
      empty.className = "day empty";
      days.appendChild(empty);
    }

    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= totalDays; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const day = document.createElement("div");
      day.className = "day";
      day.textContent = d;

      if (data.marks[dateKey]) {
        const cat = categories.find(c => c.name === data.marks[dateKey].category);
        if (cat) {
          day.classList.add("marked");
          day.style.background = cat.color;

          const small = document.createElement("small");
          small.textContent = cat.name;
          day.appendChild(small);
        }
      }

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

  if (data.marks[dateKey]) {
    const action = confirm("Este día ya está marcado. Aceptar: borrar. Cancelar: cambiar categoría.");
    if (action) {
      delete data.marks[dateKey];
    } else {
      data.marks[dateKey] = {
        category: selected,
        amount: 1,
        createdAt: new Date().toISOString()
      };
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

    data.marks[dateKey] = {
      category: selected,
      amount,
      createdAt: new Date().toISOString()
    };
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
    data.counters[name] = {
      total: Number(input.value || 0)
    };
  });

  saveData();
  renderCounters();
  alert("Contadores guardados.");
}

function calculateUsed(categoryName) {
  let total = 0;

  Object.values(data.marks).forEach(item => {
    if (item.category === categoryName) {
      total += Number(item.amount || 1);
    }
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
      <select id="permitType">
        ${options}
      </select>

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
