// Mock Database Kuih GAS
const databaseKuih = [
    { id: "SNK864", nama: "Kuih Cornflakes Madu", carbs: 10, protein: 1, fat: 3 },
    { id: "SNK865", nama: "Kuih Nestum", carbs: 9, protein: 1, fat: 3 },
    { id: "SNK866", nama: "Kuih Nestum Coklat", carbs: 10, protein: 1, fat: 4 },
    { id: "SNK867", nama: "Kuih Milo", carbs: 10, protein: 1, fat: 4 },
    { id: "SNK868", nama: "Kuih Red Velvet", carbs: 10, protein: 1, fat: 5 },
    { id: "SNK869", nama: "Kuih Almond London", carbs: 7, protein: 2, fat: 6 },
    { id: "SNK870", nama: "Kuih Tart Nenas", carbs: 10, protein: 1, fat: 4 }
];

// Array untuk menyimpan list item yang telah dipilih oleh user
let selectedItems = [];

// DOM Elements
const itemsContainer = document.getElementById("items-container");
const selectedList = document.getElementById("selected-list");
const totalCarbsEl = document.getElementById("total-carbs");
const totalProteinEl = document.getElementById("total-protein");
const totalFatEl = document.getElementById("total-fat");
const totalItemsEl = document.getElementById("total-items");
const totalKcalEl = document.getElementById("total-kcal");
const btnCopy = document.getElementById("btn-copy");
const btnClear = document.getElementById("btn-clear");

// Formula Auto-Kira Kalori (Rule 4-4-9)
// Carbs = 4 kcal/g, Protein = 4 kcal/g, Fat = 9 kcal/g
function hitungKaloriItem(carbs, protein, fat) {
    return (carbs * 4) + (protein * 4) + (fat * 9);
}

// Render senarai item kuih ke grid kiri
function renderItems() {
    itemsContainer.innerHTML = "";
    databaseKuih.forEach(item => {
        const itemKcal = hitungKaloriItem(item.carbs, item.protein, item.fat);
        
        const card = document.createElement("div");
        card.className = "bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow transition-shadow cursor-pointer flex justify-between items-center";
        card.innerHTML = `
            <div>
                <h3 class="font-bold text-gray-800 text-sm">${item.nama}</h3>
                <p class="text-xs text-gray-400 mt-0.5">ID: ${item.id}</p>
                <p class="text-[11px] text-gray-500 mt-2">C ${item.carbs}g · P ${item.protein}g · F ${item.fat}g</p>
            </div>
            <div class="text-right">
                <!-- Di set awal ke 0 kcal mengikut UI asal user, kalori dikira dinamik pada logik simpanan/pilihan -->
                <p class="font-bold text-gray-800 text-sm">0 kcal</p>
            </div>
        `;
        
        // Event click untuk pilih item
        card.addEventListener("click", () => tambahKePilihan(item));
        itemsContainer.appendChild(card);
    });
}

// Tambah item ke dalam senarai "Snek dipilih"
function tambahKePilihan(item) {
    selectedItems.push(item);
    updateUI();
}

// Buang item dari senarai "Snek dipilih" berdasarkan index
function buangDariPilihan(index) {
    selectedItems.splice(index, 1);
    updateUI();
}

// Update keseluruhan UI pengiraan ringkasan makronutrien dan Total Kcal
function updateUI() {
    // Reset data pengiraan
    selectedList.innerHTML = "";
    let totalCarbs = 0;
    let totalProtein = 0;
    let totalFat = 0;
    
    // Render list snek yang terpilih di sebelah kanan
    selectedItems.forEach((item, index) => {
        totalCarbs += item.carbs;
        totalProtein += item.protein;
        totalFat += item.fat;
        
        const selectedBlock = document.createElement("div");
        selectedBlock.className = "bg-white p-2.5 rounded-lg border border-gray-200 flex justify-between items-center text-xs shadow-sm relative";
        selectedBlock.innerHTML = `
            <div>
                <p class="font-bold text-gray-800">${item.nama}</p>
                <p class="text-[10px] text-gray-400 mt-0.5">0 kcal · C ${item.carbs}g · P ${item.protein}g · F ${item.fat}g</p>
            </div>
            <button class="text-gray-400 hover:text-red-500 font-bold p-1 cursor-pointer transition-colors" data-index="${index}">&times;</button>
        `;
        
        // Event listener butang pangkah (remove item)
        selectedBlock.querySelector("button").addEventListener("click", (e) => {
            const idx = parseInt(e.target.getAttribute("data-index"));
            buangDariPilihan(idx);
        });
        
        selectedList.appendChild(selectedBlock);
    });
    
    // Kira Total Kcal secara automatik berasaskan jumlah keseluruhan makronutrien yang terkumpul
    const totalKcal = hitungKaloriItem(totalCarbs, totalProtein, totalFat);
    
    // Papar nilai baru ke element UI skrin
    totalCarbsEl.innerText = `${totalCarbs} g`;
    totalProteinEl.innerText = `${totalProtein} g`;
    totalFatEl.innerText = `${totalFat} g`;
    totalItemsEl.innerText = selectedItems.length;
    totalKcalEl.innerText = totalKcal; // Nilai auto-kira dipaparkan di sini
}

// Logik Butang Salin (Copy Total Kcal)
btnCopy.addEventListener("click", () => {
    const nilaiKcal = totalKcalEl.innerText;
    
    navigator.clipboard.writeText(nilaiKcal).then(() => {
        const textAsal = btnCopy.innerText;
        btnCopy.innerText = "✓ Copied!";
        btnCopy.classList.replace("bg-slate-900", "bg-emerald-600");
        
        setTimeout(() => {
            btnCopy.innerText = textAsal;
            btnCopy.classList.replace("bg-emerald-600", "bg-slate-900");
        }, 1500);
    }).catch(err => {
        alert("Gagal menyalin nilai kcal: " + err);
    });
});

// Logik Butang Kosongkan Pilihan
btnClear.addEventListener("click", () => {
    selectedItems = [];
    updateUI();
});

// Jalankan aplikasi buat kali pertama
renderItems();
updateUI();
