// Database Mock Snek GAS
const databaseKuih = [
    { id: "SNK862", nama: "Kuih Almond London Premium", carbs: 9, protein: 1, fat: 4 },
    { id: "SNK863", nama: "Kuih Makmur", carbs: 8, protein: 1, fat: 3 },
    { id: "SNK864", nama: "Kuih Cornflakes Madu", carbs: 10, protein: 1, fat: 3 },
    { id: "SNK865", nama: "Kuih Nestum", carbs: 9, protein: 1, fat: 3 },
    { id: "SNK866", nama: "Kuih Nestum Coklat", carbs: 10, protein: 1, fat: 4 },
    { id: "SNK867", nama: "Kuih Milo", carbs: 10, protein: 1, fat: 4 },
    { id: "SNK868", nama: "Kuih Red Velvet", carbs: 10, protein: 1, fat: 5 },
    { id: "SNK869", nama: "Kuih Almond London", carbs: 7, protein: 2, fat: 6 },
    { id: "SNK870", nama: "Kuih Tart Nenas", carbs: 10, protein: 1, fat: 4 }
];

let selectedItems = [];

// DOM Elements
const itemsContainer = document.getElementById("items-container");
const selectedList = document.getElementById("selected-list");
const searchInput = document.getElementById("search-input");
const totalCarbsEl = document.getElementById("total-carbs");
const totalProteinEl = document.getElementById("total-protein");
const totalFatEl = document.getElementById("total-fat");
const totalItemsEl = document.getElementById("total-items");
const totalKcalEl = document.getElementById("total-kcal");
const btnCopy = document.getElementById("btn-copy");
const btnClear = document.getElementById("btn-clear");

// Hitung Kalori mengikut formula makronutrien (Carbs*4 + Protein*4 + Fat*9)
function hitungKaloriItem(carbs, protein, fat) {
    return (carbs * 4) + (protein * 4) + (fat * 9);
}

// Render senarai item dengan filter carian
function renderItems(filterText = "") {
    itemsContainer.innerHTML = "";
    
    const filtered = databaseKuih.filter(item => 
        item.nama.toLowerCase().includes(filterText.toLowerCase()) || 
        item.id.toLowerCase().includes(filterText.toLowerCase())
    );

    if (filtered.length === 0) {
        itemsContainer.innerHTML = `<p class="col-span-2 text-sm text-gray-400 text-center py-4">Tiada kuih dijumpai.</p>`;
        return;
    }

    filtered.forEach(item => {
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
                <p class="font-bold text-gray-800 text-sm">${itemKcal} kcal</p>
            </div>
        `;
        card.addEventListener("click", () => tambahKePilihan(item));
        itemsContainer.appendChild(card);
    });
}

function tambahKePilihan(item) {
    selectedItems.push(item);
    updateUI();
}

function buangDariPilihan(index) {
    selectedItems.splice(index, 1);
    updateUI();
}

// Logik Auto-kira apabila item dipilih
function updateUI() {
    selectedList.innerHTML = "";
    let totalCarbs = 0, totalProtein = 0, totalFat = 0;
    
    selectedItems.forEach((item, index) => {
        totalCarbs += item.carbs;
        totalProtein += item.protein;
        totalFat += item.fat;
        
        const itemKcal = hitungKaloriItem(item.carbs, item.protein, item.fat);
        const selectedBlock = document.createElement("div");
        selectedBlock.className = "bg-white p-2.5 rounded-lg border border-gray-200 flex justify-between items-center text-xs shadow-sm relative";
        selectedBlock.innerHTML = `
            <div>
                <p class="font-bold text-gray-800">${item.nama}</p>
                <p class="text-[10px] text-gray-400 mt-0.5">${itemKcal} kcal · C ${item.carbs}g · P ${item.protein}g · F ${item.fat}g</p>
            </div>
            <button class="text-gray-400 hover:text-red-500 font-bold p-1 cursor-pointer" data-index="${index}">&times;</button>
        `;
        selectedBlock.querySelector("button").addEventListener("click", (e) => {
            buangDariPilihan(parseInt(e.target.getAttribute("data-index")));
        });
        selectedList.appendChild(selectedBlock);
    });
    
    const totalKcal = hitungKaloriItem(totalCarbs, totalProtein, totalFat);
    
    totalCarbsEl.innerText = `${totalCarbs} g`;
    totalProteinEl.innerText = `${totalProtein} g`;
    totalFatEl.innerText = `${totalFat} g`;
    totalItemsEl.innerText = selectedItems.length;
    totalKcalEl.innerText = totalKcal;
}

// Event Listener untuk input carian
searchInput.addEventListener("input", (e) => {
    renderItems(e.target.value);
});

// Logik Salin Total Kcal ke Clipboard
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
    }).catch(err => alert("Gagal menyalin: " + err));
});

btnClear.addEventListener("click", () => {
    selectedItems = [];
    updateUI();
});

// Initialize
renderItems();
updateUI();
