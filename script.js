// State Management Aplikasi Mini Cloud
let filesData = JSON.parse(localStorage.getItem('mini_cloud_files')) || [
    { id: '1', name: 'Dokumen Penting', type: 'folder', size: 0, starred: true, date: new Date().toISOString() },
    { id: '2', name: 'Catatan_Rapat.txt', type: 'file', size: 1024 * 150, starred: false, date: new Date().toISOString() },
    { id: '3', name: 'Laporan_Keuangan.pdf', type: 'file', size: 1024 * 1024 * 2.5, starred: true, date: new Date().toISOString() }
];

const MAX_STORAGE = 50 * 1024 * 1024; // 50 MB dalam bytes

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initUploadListeners();
    initSearch();
    renderAll();
});

// Render Semua Komponen
function renderAll() {
    sortFilesAlphabetically();
    renderMainGrid();
    renderStarredGrid();
    updateStorageUsage();
    saveToLocalStorage();
}

// Persistensi LocalStorage
function saveToLocalStorage() {
    localStorage.setItem('mini_cloud_files', JSON.stringify(filesData));
}

// 1. Fitur Tambahan 1: Urutkan File & Folder secara Abjad (A-Z)
function sortFilesAlphabetically() {
    filesData.sort((a, b) => {
        // Folder didahulukan, lalu file, diurutkan secara case-insensitive A-Z
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name, 'id', { sensitivity: 'base' });
    });
}

// Tab Switching Logic
function initTabs() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const targetTab = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

// 2. Fitur Utama: Upload File & Folder + Drag and Drop
function initUploadListeners() {
    const fileInput = document.getElementById('file-input');
    const folderInput = document.getElementById('folder-input');
    const dropZone = document.getElementById('drop-zone');

    fileInput.addEventListener('change', (e) => handleFilesUpload(e.target.files));
    folderInput.addEventListener('change', (e) => handleFilesUpload(e.target.files));

    // Drag and Drop Events
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const droppedFiles = dt.files;
        handleFilesUpload(droppedFiles);
    });
}

function handleFilesUpload(fileList) {
    if (!fileList || fileList.length === 0) return;

    let totalNewSize = 0;
    Array.from(fileList).forEach(file => {
        totalNewSize += file.size;
    });

    const currentUsed = getCurrentStorageSize();
    if (currentUsed + totalNewSize > MAX_STORAGE) {
        showNotification('Kapasitas penyimpanan 50 MB tidak mencukupi!', 'info');
        return;
    }

    Array.from(fileList).forEach(file => {
        const isFolder = file.webkitRelativePath && file.webkitRelativePath.includes('/');
        // Ambil nama folder utama jika menggunakan webkitdirectory
        let itemName = file.name;
        if (file.webkitRelativePath) {
            const pathParts = file.webkitRelativePath.split('/');
            itemName = pathParts[0]; // Ambil nama folder teratas
        }

        // Cek jika item dengan nama yang sama sudah ada (khusus folder agar tidak duplikat)
        const exists = filesData.some(f => f.name === itemName);
        if (!exists) {
            filesData.push({
                id: 'id_' + Date.now() + Math.random().toString(36.substring(2, 9)),
                name: itemName,
                type: (isFolder || file.webkitRelativePath) ? 'folder' : 'file',
                size: file.size,
                starred: false,
                date: new Date().toISOString()
            });
        }
    });

    renderAll();
    showNotification(`Berhasil mengunggah ${fileList.length} item baru!`, 'success');
}

// 3. Fitur Utama: UI/UX Melihat File & Folder (Main Grid)
function renderMainGrid() {
    const grid = document.getElementById('main-file-grid');
    const searchQuery = document.getElementById('search-input').value.toLowerCase();
    
    const filteredFiles = filesData.filter(f => f.name.toLowerCase().includes(searchQuery));

    if (filteredFiles.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-folder-open"></i>
                <p>Belum ada file atau folder tersimpan</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filteredFiles.map(item => createFileCardHTML(item)).join('');
    attachCardListeners();
}

// 4. Fitur Tambahan 2: Section Berbintang (Starred UI/UX terpisah)
function renderStarredGrid() {
    const grid = document.getElementById('starred-file-grid');
    const starredFiles = filesData.filter(item => item.starred);

    if (starredFiles.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-star"></i>
                <p>Belum ada file atau folder berbintang</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = starredFiles.map(item => createFileCardHTML(item)).join('');
    attachCardListeners();
}

function createFileCardHTML(item) {
    let iconClass = 'fa-file-lines';
    if (item.type === 'folder') {
        iconClass = 'fa-folder';
    } else if (item.name.endsWith('.pdf')) {
        iconClass = 'fa-file-pdf';
    } else if (item.name.match(/\.(jpg|jpeg|png|gif)$/i)) {
        iconClass = 'fa-file-image';
    }

    const starClass = item.starred ? 'fa-solid fa-star starred' : 'fa-regular fa-star';

    return `
        <div class="file-card" data-id="${item.id}">
            <div class="file-icon"><i class="fa-solid ${iconClass}"></i></div>
            <div class="file-details">
                <div class="file-name" title="${item.name}">${item.name}</div>
                <div class="file-size">${item.type === 'folder' ? 'Folder' : formatBytes(item.size)}</div>
            </div>
            <div class="file-actions">
                <button class="action-btn star-btn" title="Tandai Bintang" onclick="toggleStar('${item.id}')">
                    <i class="${starClass}"></i>
                </button>
                <button class="action-btn download-btn" title="Unduh File" onclick="downloadItem('${item.id}')">
                    <i class="fa-solid fa-download"></i>
                </button>
                <button class="action-btn delete-btn" title="Hapus" onclick="deleteItem('${item.id}')">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </div>
    `;
}

// Aksi Toggle Bintang (Starred)
window.toggleStar = function(id) {
    const item = filesData.find(f => f.id === id);
    if (item) {
        item.starred = !item.starred;
        renderAll();
        showNotification(`Status bintang untuk "${item.name}" diperbarui.`, 'info');
    }
}

// Aksi Unduh File (Fitur 4: Notifikasi luar & dalam)
window.downloadItem = function(id) {
    const item = filesData.find(f => f.id === id);
    if (item) {
        showNotification(`Mengunduh: ${item.name}`, 'success');
        triggerBrowserNotification('Unduhan Dimulai', `File ${item.name} sedang diunduh.`);
    }
}

// Aksi Hapus Item
window.deleteItem = function(id) {
    const itemIndex = filesData.findIndex(f => f.id === id);
    if (itemIndex !== -1) {
        const itemName = filesData[itemIndex].name;
        filesData.splice(itemIndex, 1);
        renderAll();
        showNotification(`"${itemName}" berhasil dihapus.`, 'info');
    }
}

// 3. Fitur Utama: Indikator Jumlah Penyimpanan Terpakai
function getCurrentStorageSize() {
    return filesData.reduce((acc, curr) => acc + (curr.size || 0), 0);
}

function updateStorageUsage() {
    const usedBytes = getCurrentStorageSize();
    const percentage = Math.min((usedBytes / MAX_STORAGE) * 100, 100);
    
    document.getElementById('storage-text').innerText = `${formatBytes(usedBytes)} / 50 MB`;
    document.getElementById('progress-fill').style.width = `${percentage}%`;
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Pencarian Real-Time
function initSearch() {
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', () => {
        renderMainGrid();
    });
}

// 4. Fitur Utama: Notifikasi di Dalam dan Luar Cloud
function showNotification(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-circle-check';
    if (type === 'info') icon = 'fa-circle-info';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Fitur Notifikasi Luar (Browser Notification API)
const notifyBtn = document.getElementById('notify-permission-btn');
notifyBtn.addEventListener('click', () => {
    if (!("Notification" in window)) {
        alert("Browser ini tidak mendukung desktop notification.");
    } else if (Notification.permission === "granted") {
        showNotification("Notifikasi luar sudah aktif!", "success");
        triggerBrowserNotification("Mini Cloud", "Sistem notifikasi luar aktif dan berjalan.");
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                showNotification("Izin notifikasi diberikan!", "success");
            }
        });
    }
});

function triggerBrowserNotification(title, body) {
    if (Notification.permission === "granted") {
        new Notification(title, {
            body: body,
            icon: 'https://cdn-icons-png.flaticon.com/512/109/109613.png'
        });
    }
}

function attachCardListeners() {
    // Bisa ditambahkan event tambahan jika diperlukan
}
