import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, addDoc, deleteDoc, doc, collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCQntdUX66jx2X643aLPQ-5DdwkxVdwwfs",
  authDomain: "absensi-ae59d.firebaseapp.com",
  projectId: "absensi-ae59d",
  storageBucket: "absensi-ae59d.appspot.com",
  messagingSenderId: "616985671801",
  appId: "1:616985671801:web:b004f4d04f566b9eae3ca8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const tableBody = document.querySelector("#absenTable tbody");
const userInfo = document.getElementById("userInfo");
const namaInput = document.getElementById("nama");
const alasanInput = document.getElementById("alasan");
const form = document.getElementById("absenForm");
const formAdmin = document.getElementById("formAdminAbsen");
const adminNamaSelect = document.getElementById("adminNamaSelect");
const adminAlasanSelect = document.getElementById("adminAlasanSelect");
const adminSubmitBtn = document.getElementById("adminSubmitBtn");
const hariNav = document.getElementById("hariNav");
const exportBtn = document.getElementById("exportBtn");


let selectedHari = null;

const mingguNav = document.getElementById("mingguNav");
const filterAlasan = document.getElementById("filterAlasan");
const filterStatus = document.getElementById("filterStatus");

let absensiData = [];
let selectedWeek = getWeekNumber(new Date());
let currentUser = null;
let chartInstance = null;


onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = "login-page.html";
  currentUser = JSON.parse(localStorage.getItem("currentUser"));
  userInfo.textContent = `Login sebagai ${currentUser.username} (${currentUser.role})`;
  namaInput.value = currentUser.username;
  if (currentUser.role === "admin") {
    formAdmin.style.display = "flex";
    exportBtn.style.display = "inline-block";
  }
  await loadData();
  if (currentUser.role !== "admin") {
    const chart = document.getElementById("chartMingguan");
    const rekap = document.getElementById("rekapMingguan");
    const perUser = document.getElementById("rekapPerUser");

    if (chart) chart.style.display = "none";
    if (rekap) rekap.style.display = "none";
    if (perUser) perUser.style.display = "none";
  }

});

form.onsubmit = async (e) => {
  e.preventDefault();
  const waktu = new Date().toISOString();
  await addDoc(collection(db, "absensi"), {
    nama: namaInput.value,
    waktu,
    alasan: alasanInput.value,
    oleh: namaInput.value
  });
  form.reset();
  namaInput.value = currentUser.username;
  await loadData();
};

function isiNamaAdmin() {
  if (currentUser.role !== "admin") return;

  const namaUnik = [...new Set(absensiData.map(item => item.nama))];
  adminNamaSelect.innerHTML = '<option value="">-- Pilih Nama --</option>';
  namaUnik.forEach(nama => {
    const opt = document.createElement("option");
    opt.value = nama;
    opt.textContent = nama;
    adminNamaSelect.appendChild(opt);
  });
}

function renderHariButtons() {
  const hariList = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const mingguData = absensiData.filter(
    item => getWeekNumber(new Date(item.waktu)) === selectedWeek
  );

  hariNav.innerHTML = "";
  hariNav.style.display = "flex";
  hariNav.style.flexWrap = "wrap";
  hariNav.style.gap = "6px";
  hariNav.style.justifyContent = "center";

  for (let i = 0; i < 7; i++) {
    const btn = document.createElement("button");
    btn.textContent = hariList[i];
    btn.style.padding = "6px 12px";
    btn.style.border = "1px solid #ccc";
    btn.style.borderRadius = "4px";
    btn.style.backgroundColor = i === selectedHari ? "#4CAF50" : "#e0e0e0";
    btn.style.color = i === selectedHari ? "white" : "#333";
    btn.style.fontWeight = i === selectedHari ? "bold" : "normal";
    btn.style.cursor = "pointer";

    btn.onclick = () => {
      selectedHari = i;
      renderTable();
      renderHariButtons();
    };

    hariNav.appendChild(btn);
  }

  // Tombol reset hari
  if (selectedHari !== null) {
    const resetBtn = document.createElement("button");
    resetBtn.textContent = "Semua Hari";
    resetBtn.style.marginLeft = "10px";
    resetBtn.style.padding = "6px 12px";
    resetBtn.style.backgroundColor = "#2196F3";
    resetBtn.style.color = "white";
    resetBtn.style.border = "none";
    resetBtn.style.borderRadius = "4px";
    resetBtn.style.cursor = "pointer";
    resetBtn.style.fontWeight = "bold";

    resetBtn.onclick = () => {
      selectedHari = null;
      renderTable();
      renderHariButtons();
    };

    hariNav.appendChild(resetBtn);
  }
}

exportBtn.onclick = function () {
  const filtered = absensiData
    .filter(item => getWeekNumber(new Date(item.waktu)) === selectedWeek)
    .filter(item => {
      const status = getStatus(item.waktu);
      return filterStatus.value === 'all' || status === filterStatus.value;
    })
    .filter(item => filterAlasan.value === 'all' || item.alasan === filterAlasan.value)
    .filter(item => selectedHari === null || new Date(item.waktu).getDay() === selectedHari);

  if (filtered.length === 0) {
    alert("Tidak ada data untuk diexport.");
    return;
  }

  let csv = "Nama;Waktu;Status;Alasan;Diinput Oleh\n";
  filtered.forEach(item => {
    const status = getStatus(item.waktu);
    const row = [
      `"${item.nama}"`,
      `"${formatTanggal(item.waktu)}"`,
      `"${status}"`,
      `"${item.alasan}"`,
      `"${item.oleh}"`
    ];
    csv += row.join(";") + "\n";
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `absensi_minggu_${selectedWeek}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

function renderChartMingguan() {
  const hariList = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const dataMinggu = absensiData.filter(
    item => getWeekNumber(new Date(item.waktu)) === selectedWeek
  );

  const countPerHari = [0, 0, 0, 0, 0, 0, 0]; // index = 0 (Minggu) ... 6 (Sabtu)

  dataMinggu.forEach(item => {
    const hari = new Date(item.waktu).getDay();
    countPerHari[hari]++;
  });

  const ctx = document.getElementById('chartMingguan').getContext('2d');

  // Destroy chart lama biar gak dobel
  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: hariList,
      datasets: [{
        label: 'Jumlah Absen per Hari',
        data: countPerHari,
        backgroundColor: '#4CAF50',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `Total: ${ctx.parsed.y}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
}


async function loadData() {
  const q = query(collection(db, "absensi"), orderBy("waktu", "desc"));
  const snapshot = await getDocs(q);
  absensiData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  isiNamaAdmin();
  renderMingguButtons();
  renderHariButtons();
  renderTable();

  if (currentUser.role === "admin") {
    renderChartMingguan();
  }

}

function renderMingguButtons() {
  const mingguSet = new Set(absensiData.map(item => getWeekNumber(new Date(item.waktu))));
  mingguNav.innerHTML = '';
  [...mingguSet].sort().forEach(week => {
    const btn = document.createElement('button');
    btn.textContent = `Minggu ${week}`;
    btn.classList.toggle('active', week === selectedWeek);
    btn.onclick = () => {
      selectedWeek = week;
      selectedHari = null; // reset filter harian
      renderTable();
      renderMingguButtons();
      renderHariButtons(); // update tombol hari sesuai minggu baru
      if (currentUser.role === "admin") renderChartMingguan(); // tambahkan ini!
    };
    mingguNav.appendChild(btn);
  });
}

function renderRekapPerUser(data) {
  const container = document.getElementById("rekapPerUser");
  if (!data || data.length === 0) {
    container.innerHTML = "";
    return;
  }

  const countMap = {};
  data.forEach(item => {
    if (!countMap[item.nama]) countMap[item.nama] = 0;
    countMap[item.nama]++;
  });

  const listHTML = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1]) // urutkan terbanyak dulu
    .map(([nama, jumlah]) => `• <strong>${nama}</strong>: ${jumlah}x`)
    .join("<br>");

  container.innerHTML = `
    <h3>Rekap per User ${selectedHari !== null ? 'Hari Ini' : 'Minggu Ini'}:</h3>
    ${listHTML}
  `;
}


function renderTable() {
  const alasanFilter = filterAlasan.value;
  const statusFilter = filterStatus.value;
  tableBody.innerHTML = '';

  const filtered = absensiData
    .filter(item => getWeekNumber(new Date(item.waktu)) === selectedWeek)
    .filter(item => alasanFilter === 'all' || item.alasan === alasanFilter)
    .filter(item => {
      const status = getStatus(item.waktu);
      return statusFilter === 'all' || status === statusFilter;
    })
    .filter(item => {
      if (selectedHari === null) return true;
      return new Date(item.waktu).getDay() === selectedHari;
    });


  const label = selectedHari !== null
    ? `Total absen hari ini: ${filtered.length}`
    : `Total absen minggu ini: ${filtered.length}`;
  document.getElementById("rekapMingguan").textContent = label;

  filtered.forEach(item => {
    const status = getStatus(item.waktu);
    const canDelete = currentUser.role === "admin" || item.oleh === currentUser.username;
    const row = document.createElement("tr");
    row.innerHTML = `
          <td>${item.nama}</td>
          <td>${formatTanggal(item.waktu)}</td>
          <td class="${status === 'Terlambat' ? 'late' : 'on-time'}">${status}</td>
          <td class="alasan-badge">${item.alasan}</td>
          <td>${canDelete ? `<button class="delete-btn" onclick="hapus('${item.id}')">Hapus</button>` : ''}</td>
        `;
    tableBody.appendChild(row);
  });

  renderRekapPerUser(filtered);
}

window.hapus = async function (id) {
  if (!confirm("Yakin mau hapus absen ini?")) return;
  await deleteDoc(doc(db, "absensi", id));
  await loadData();
}

filterAlasan.addEventListener("change", renderTable);
filterStatus.addEventListener("change", renderTable);

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getStatus(waktuISO) {
  const jam = new Date(waktuISO);
  const batas = new Date(jam);
  batas.setHours(8, 0, 0);
  return jam > batas ? 'Terlambat' : 'Tepat Waktu';
}

function formatTanggal(waktuISO) {
  return new Date(waktuISO).toLocaleString("id-ID", {
    weekday: "short", day: "2-digit", month: "long",
    year: "numeric", hour: "2-digit", minute: "2-digit"
  });
}
adminSubmitBtn.onclick = async () => {
  const nama = adminNamaSelect.value;
  const alasan = adminAlasanSelect.value;
  if (!nama || !alasan) return alert("Lengkapi data!");

  const waktu = new Date().toISOString();
  await addDoc(collection(db, "absensi"), {
    nama,
    waktu,
    alasan,
    oleh: currentUser.username
  });

  await loadData();
};


window.logout = () => {
  localStorage.clear();
  signOut(auth).then(() => location.href = "index.html");
};