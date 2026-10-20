let filesData = JSON.parse(localStorage.getItem('mini_cloud_files')) || [
    { id: '1', name: 'Dokumen Penting', type: 'folder', size: 0, starred: true, date: new Date().toISOString() },
    { id: '2', name: 'Catatan_Rapat.txt', type: 'file', size: 1024 * 150, starred: false, date: new Date().toISOString() }
];

const MAX_STORAGE = 50 * 1024 * 1024; // 50 MB

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initUploadListeners();
    initSearch();
    renderAll();
});

function renderAll() {
    sortFilesAlphabetically();
    renderMainGrid();
    renderStarredGrid();
    updateStorageUsage();
    saveToLocalStorage();
}

function saveToLocalStorage() {
    localStorage.setItem('mini_cloud_files', JSON.stringify(filesData));
}

function sortFilesAlphabetically() {
    filesData.sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name, 'id', { sensitivity: 'base' });
    });
}

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

// Debugged Upload & Drag-Drop Listeners
function initUploadListeners() {
    const fileInput = document.getElementById('file-input');
    const folderInput = document.getElementById('folder-input');
    const dropZone = document.getElementById('drop-zone');

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleFilesUpload(e.target.files);
            }
            e.target.value = ''; // Reset value agar file yang sama bisa di-upload kembali
        });
    }

    if (folderInput) {
        folderInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleFilesUpload(e.target.files);
            }
            e.target.value = '';
        });
    }

    if (dropZone) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('dragover');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt && dt.files && dt.files.length > 0) {
                handleFilesUpload(dt.files);
            }
        });
    }
}

function handleFilesUpload(fileList) {
    if (!fileList || fileList.length === 0) return;

    let addedCount = 0;
    Array.from(fileList).forEach(file => {
        let itemName = file.name;
        let isFolder = false;

        // Deteksi apakah item berupa folder via webkitdirectory / path hierarki
        if (file.webkitRelativePath && file.webkitRelativePath.includes('/')) {
            const pathParts = file.webkitRelativePath.split('/');
            itemName = pathParts[0]; 
            isFolder = true;
        }

        // Cek apakah item dengan nama dan tipe yang sama sudah ada
        const exists = filesData.some(f => f.name === itemName && f.type === (isFolder ? 'folder' : 'file'));
        
        if (!exists) {
            filesData.push({
                id: 'id_' + Date.now() + Math.random().toString(36).substring(2, 9),
                name: itemName,
                type: isFolder ? 'folder' : 'file',
                size: file.size || 0,
                starred: false,
                date: new Date().toISOString()
            });
            addedCount++;
        }
    });

    renderAll();
    if (addedCount > 0) {
        showNotification(`Berhasil mengunggah ${addedCount} item baru!`, 'success');
    } else {
        showNotification(`Item tersebut sudah ada di dalam cloud.`, 'info');
    }
}

function renderMainGrid() {
    const grid = document.getElementById('main-file-grid');
    const searchInput = document.getElementById('search-input');
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
    const filteredFiles = filesData.filter(f => f.name.toLowerCase().includes(searchQuery));

    if (!grid) return;

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
}

function renderStarredGrid() {
    const grid = document.getElementById('starred-file-grid');
    const starredFiles = filesData.filter(item => item.starred);

    if (!grid) return;

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

window.toggleStar = function(id) {
    const item = filesData.find(f => f.id === id);
    if (item) {
        item.starred = !item.starred;
        renderAll();
        showNotification(`Status bintang untuk "${item.name}" diperbarui.`, 'info');
    }
}

window.downloadItem = function(id) {
    const item = filesData.find(f => f.id === id);
    if (item) {
        showNotification(`Mengunduh: ${item.name}`, 'success');
    }
}

window.deleteItem = function(id) {
    const itemIndex = filesData.findIndex(f => f.id === id);
    if (itemIndex !== -1) {
        const itemName = filesData[itemIndex].name;
        filesData.splice(itemIndex, 1);
        renderAll();
        showNotification(`"${itemName}" berhasil dihapus.`, 'info');
    }
}

function getCurrentStorageSize() {
    return filesData.reduce((acc, curr) => acc + (curr.size || 0), 0);
}

function updateStorageUsage() {
    const usedBytes = getCurrentStorageSize();
    const percentage = Math.min((usedBytes / MAX_STORAGE) * 100, 100);
    
    const storageText = document.getElementById('storage-text');
    const progressFill = document.getElementById('progress-fill');
    
    if (storageText) storageText.innerText = `${formatBytes(usedBytes)} / 50 MB`;
    if (progressFill) progressFill.style.width = `${percentage}%`;
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function initSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderMainGrid();
        });
    }
}

function showNotification(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
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
