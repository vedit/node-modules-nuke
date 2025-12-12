// Renderer logic
const selectDirBtn = document.getElementById('select-dir-btn');
const modulesList = document.getElementById('modules-list');
const totalSizeEl = document.getElementById('total-size');
const scanStatus = document.getElementById('scan-status');
const nukeBtn = document.getElementById('nuke-btn');
const listHeader = document.getElementById('list-header');
const selectAllCheckbox = document.getElementById('select-all');

let foundModules = []; // Array of { path, size }
let selectedIndices = new Set();
let isScanning = false;

selectDirBtn.addEventListener('click', async () => {
  const p = await window.api.selectDirectory();
  if (p) {
    startScan(p);
  }
});

async function startScan(path) {
  if (isScanning) return;
  isScanning = true;
  scanStatus.classList.remove('hidden');
  modulesList.innerHTML = '';
  listHeader.classList.add('hidden');
  nukeBtn.disabled = true;
  foundModules = [];
  selectedIndices.clear();
  updateTotalSize();

  try {
    // We will implement the actual progressive scanning in main process next
    // For now, let's assume scanDirectory returns the full list for simplicity
    // or we handle progress events.
    // Let's assume we want to listen to progress.

    // This is a placeholder call until we implement the full logic in main
    const results = await window.api.scanDirectory(path);
    // results is array of { path, sizeBytes, sizeFormatted }
    foundModules = results;
    applySort(); // Default sort applied
  } catch (err) {
    console.error(err);
    scanStatus.innerText = 'Error scanning directory.';
  } finally {
    isScanning = false;
    scanStatus.classList.add('hidden');
    if (foundModules.length > 0) {
      listHeader.classList.remove('hidden');
    }
  }
}

function renderList() {
  modulesList.innerHTML = '';
  foundModules.forEach((mod, index) => {
    const li = document.createElement('li');
    li.className = 'module-item';

    const checkboxContainer = document.createElement('label');
    checkboxContainer.className = 'checkbox-container';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.index = index;
    checkbox.checked = selectedIndices.has(index);
    checkbox.addEventListener('change', (e) => toggleSelection(index, e.target.checked));

    const checkmark = document.createElement('span');
    checkmark.className = 'checkmark';

    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(checkmark);

    const pathSpan = document.createElement('span');
    pathSpan.className = 'module-path';
    pathSpan.innerText = mod.path;
    pathSpan.title = mod.path; // Tooltip

    const sizeSpan = document.createElement('span');
    sizeSpan.className = 'module-size';
    sizeSpan.innerText = mod.sizeFormatted;

    li.appendChild(checkboxContainer);
    li.appendChild(pathSpan);
    li.appendChild(sizeSpan);

    modulesList.appendChild(li);
  });
  updateUIState();
}

function toggleSelection(index, isSelected) {
  if (isSelected) {
    selectedIndices.add(index);
  } else {
    selectedIndices.delete(index);
  }
  updateUIState();
}

function updateUIState() {
  // Update Nuke button
  nukeBtn.disabled = selectedIndices.size === 0;
  nukeBtn.innerText = selectedIndices.size > 0 ? `NUKE ${selectedIndices.size} FOLDER${selectedIndices.size === 1 ? '' : 'S'}` : 'NUKE SELECTED';

  // Update Select All checkbox
  const allSelected = foundModules.length > 0 && selectedIndices.size === foundModules.length;
  selectAllCheckbox.checked = allSelected;

  // Update total size found (just aesthetic, valid logic would sum selected)
  updateTotalSize();
}

// Sorting Logic
let currentSort = { field: 'sizeBytes', dir: 'desc' }; // default sort

document.querySelectorAll('.sortable').forEach(el => {
  el.addEventListener('click', () => {
    const field = el.dataset.sort;
    if (currentSort.field === field) {
      currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
      currentSort.field = field;
      currentSort.dir = 'desc'; // default to desc for new field
    }
    applySort();
  });
});

function applySort() {
  // We need to preserve selection. 
  // Best way: Map selectedIndices to paths, sort, then re-map paths to new indices.
  const selectedPaths = new Set();
  selectedIndices.forEach(i => {
    if (foundModules[i]) selectedPaths.add(foundModules[i].path);
  });

  foundModules.sort((a, b) => {
    let valA = a[currentSort.field];
    let valB = b[currentSort.field];

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return currentSort.dir === 'asc' ? -1 : 1;
    if (valA > valB) return currentSort.dir === 'asc' ? 1 : -1;
    return 0;
  });

  // Re-calculate selected indices based on paths
  selectedIndices.clear();
  foundModules.forEach((m, index) => {
    if (selectedPaths.has(m.path)) {
      selectedIndices.add(index);
    }
  });

  renderList();
  updateSortIndicators();
}

function updateSortIndicators() {
  document.querySelectorAll('.sortable span').forEach(span => span.innerText = '↕');

  const activeHeader = document.querySelector(`.sortable[data-sort="${currentSort.field}"] span`);
  if (activeHeader) {
    activeHeader.innerText = currentSort.dir === 'asc' ? '↑' : '↓';
  }
}

selectAllCheckbox.addEventListener('change', (e) => {
  const isChecked = e.target.checked;
  selectedIndices.clear();
  if (isChecked) {
    foundModules.forEach((_, i) => selectedIndices.add(i));
  }
  // Re-render essentially to update all checkboxes efficiently? 
  // Or just iterate DOM. Re-rendering is cleaner for this scale.
  renderList();
});

nukeBtn.addEventListener('click', async () => {
  if (confirm(`Are you sure you want to delete ${selectedIndices.size} folders? This cannot be undone.`)) {
    const pathsToDelete = Array.from(selectedIndices).map(i => foundModules[i].path);
    await window.api.deleteDirectories(pathsToDelete);

    // Remove from list
    // Sort indices descending to remove from back without messing up indices?
    // Actually simplest is filter out deleted ones from foundModules and re-render.
    const deletedSet = new Set(pathsToDelete);
    foundModules = foundModules.filter(m => !deletedSet.has(m.path));
    selectedIndices.clear();
    renderList();
  }
});

function updateTotalSize() {
  let totalBytes = 0;
  foundModules.forEach(m => totalBytes += m.sizeBytes);
  totalSizeEl.innerText = formatSize(totalBytes) + ' found';
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
