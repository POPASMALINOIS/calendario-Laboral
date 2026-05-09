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

let data = JSON.parse(localStorage.getItem("calendarioLaboralData")) || {
  marks: {},
  counters: {}
};

function saveData() {
  localStorage.setItem("calendarioLaboralData", JSON.stringify(data));
}

function ensureCounters() {
  categories.forEach(cat => {
    if (!data.counters[cat.name]) {
      data.counters[cat.name] = {
        total: 0
      };
    }
  });
  saveData();
}

function showTab(id) {
  document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  if (id === "contadores") renderCounters();
  if (id === "permisos") renderHistory();
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
    const action = confirm("Este día ya está marcado. Pulsa Aceptar para borrar la marca o Cancelar para cambiarla por la categoría seleccionada.");

    if (action) {
      delete data.marks[dateKey];
    } else {
      data.marks[dateKey] = {
        category: selected,
        amount: cat.unit === "horas" ? 1 : 1,
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
        alert("Introduce un número de horas válido.");
        return;
      }
    }

    const remaining = getRemaining(selected);

    if (data.counters[selected]?.total > 0 && amount > remaining) {
      const proceed = confirm(`Atención: estás superando el saldo disponible. Restante actual: ${remaining} ${cat.unit}. ¿Quieres continuar igualmente?`);
      if (!proceed) return;
    }

    data.marks[dateKey] = {
      category: selected,
      amount: amount,
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
      <h3>
        <span class="badge" style="background:${cat.color}">
          ${cat.name}
        </span>
      </h3>

      <div class="counter-row">
        <div>
          <label>Total disponible</label>
          <input 
            type="number" 
            step="0.5" 
            min="0"
            value="${total}" 
            data-counter="${cat.name}"
          >
        </div>

        <div>
          <label>Usado</label>
          <input 
            type="text" 
            value="${used} ${cat.unit}" 
            disabled
          >
        </div>

        <div>
          <label>Restante</label>
          <input 
            type="text" 
            value="${remaining} ${cat.unit}" 
            disabled
          >
        </div>
      </div>

      <p style="font-size:13px; margin-bottom:0;">
        Unidad de control: <strong>${cat.unit}</strong>
      </p>
    `;

    list.appendChild(card);
  });

  const info = document.createElement("div");
  info.className = "counter-card";
  info.innerHTML = `
    <h3>Resumen</h3>
    <p>Introduce en cada categoría los días u horas que tienes disponibles.</p>
    <p>La aplicación descontará automáticamente lo utilizado según los días que marques en el calendario.</p>
  `;
  list.prepend(info);
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
  alert("Contadores guardados correctamente.");
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

function getRemaining(categoryName) {
  const total = Number(data.counters[categoryName]?.total || 0);
  const used = calculateUsed(categoryName);
  return total - used;
}

function renderHistory() {
  const list = document.getElementById("historyList");
  list.innerHTML = "";

  const entries = Object.entries(data.marks).sort((a, b) => a[0].localeCompare(b[0]));

  if (entries.length === 0) {
    list.innerHTML = "<p>No hay permisos registrados.</p>";
    return;
  }

  entries.forEach(([date, item]) => {
    const cat = categories.find(c => c.name === item.category);
    const card = document.createElement("div");
    card.className = "history-card";

    card.innerHTML = `
      <p><strong>${formatDate(date)}</strong></p>
      <p>
        <span class="badge" style="background:${cat?.color || "#333"}">
          ${item.category}
        </span>
      </p>
      <p>Cantidad consumida: <strong>${item.amount} ${cat?.unit || ""}</strong></p>
      <button onclick="editAmount('${date}')">Editar días/horas</button>
      <button class="danger" onclick="deleteMark('${date}')">Eliminar</button>
    `;

    list.appendChild(card);
  });
}

function editAmount(date) {
  const item = data.marks[date];
  const cat = categories.find(c => c.name === item.category);
  const current = item.amount || 1;

  const newAmount = prompt(`Introduce la nueva cantidad en ${cat?.unit || "unidades"}:`, current);

  if (newAmount !== null && newAmount !== "") {
    const value = Number(newAmount);

    if (isNaN(value) || value <= 0) {
      alert("Introduce un número válido.");
      return;
    }

    data.marks[date].amount = value;
    saveData();
    renderHistory();
    renderCalendar();
  }
}

function deleteMark(date) {
  if (confirm("¿Eliminar este permiso del historial y del calendario?")) {
    delete data.marks[date];
    saveData();
    renderHistory();
    renderCalendar();
  }
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
  if (confirm("¿Seguro que quieres borrar todos los datos? Esta acción no se puede deshacer.")) {
    localStorage.removeItem("calendarioLaboralData");
    location.reload();
  }
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

init();
