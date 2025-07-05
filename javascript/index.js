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
const db = getFirestore(app);
const tableBody = document.querySelector("#absenTable tbody");

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

async function loadData() {
  const q = query(collection(db, "absensi"), orderBy("waktu", "desc"));
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map(doc => doc.data());

  const namaSet = new Set();
  const tableBody = document.querySelector("#absenTable tbody");
  tableBody.innerHTML = '';

  // Filter
  const filterNama = document.getElementById("filterNama").value;
  const filterAlasan = document.getElementById("filterAlasan").value;

  data.slice(0, 50).forEach(item => {
    namaSet.add(item.nama);

    const status = getStatus(item.waktu);
    const cocokNama = filterNama === 'all' || item.nama === filterNama;
    const cocokAlasan = filterAlasan === 'all' || item.alasan === filterAlasan;

    if (cocokNama && cocokAlasan) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.nama}</td>
        <td>${formatTanggal(item.waktu)}</td>
        <td class="${status === 'Terlambat' ? 'late' : 'on-time'}">${status}</td>
        <td class="alasan-badge">${item.alasan}</td>
      `;
      tableBody.appendChild(row);
    }
  });

  // Isi select nama kalau belum diisi
  const namaSelect = document.getElementById("filterNama");
  if (namaSelect.options.length <= 1) {
    [...namaSet].sort().forEach(nama => {
      const opt = document.createElement("option");
      opt.value = nama;
      opt.textContent = nama;
      namaSelect.appendChild(opt);
    });
  }
}


loadData();
document.getElementById("filterNama").addEventListener("change", loadData);
document.getElementById("filterAlasan").addEventListener("change", loadData);
