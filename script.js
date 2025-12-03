// DOM Elements
const memoryForm = document.getElementById('memoryFormElement') || document.getElementById('memoryForm');
const memoriesContainer = document.getElementById('memoriesContainer');
const imageInput = document.getElementById('image');
const imagePreview = document.getElementById('imagePreview');
const searchInput = document.getElementById('searchInput');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const favoritesFilterBtn = document.getElementById('favoritesFilterBtn');

// Storage key
const STORAGE_KEY = 'vaulted_memories';

let editingId = null;
let editingOriginalImage = null;
let showFavoritesOnly = false;

// Load memories on page load
document.addEventListener('DOMContentLoaded', () => {
    renderMemories();
    setDefaultDate();
});

// Set default date to today
function setDefaultDate() {
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}

// Image preview functionality
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (!file.type.startsWith('image/')) {
            showError('image', 'Please select a valid image file');
            imageInput.value = '';
            imagePreview.classList.remove('show');
            return;
        }
        clearError('image');
        const reader = new FileReader();
        reader.onload = (event) => {
            imagePreview.src = event.target.result;
            imagePreview.classList.add('show');
        };
        reader.readAsDataURL(file);
    } else {
        imagePreview.classList.remove('show');
    }
});

// Form submission (create or update)
memoryForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const title = document.getElementById('title').value.trim();
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value.trim();
    const tagsInput = document.getElementById('tags').value.trim();
    const tags = tagsInput ? tagsInput.split(',').map(t=>t.trim()).filter(Boolean) : [];
    const imageFile = imageInput.files[0];

    const finish = (imageData) => {
        if (editingId) {
            updateMemory(editingId, title, date, description, imageData, tags);
        } else {
            saveMemory(title, date, description, imageData, tags);
        }
    };

    if (imageFile) {
        const reader = new FileReader();
        reader.onload = (event) => finish(event.target.result);
        reader.readAsDataURL(imageFile);
    } else {
        // if editing and no new image chosen, keep original
        if (editingId) finish(editingOriginalImage || null);
        else finish(null);
    }
});

// Validate form inputs
function validateForm() {
    let isValid = true;

    const title = document.getElementById('title').value.trim();
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value.trim();

    if (!title) { showError('title','Please enter a title'); isValid = false; }
    else if (title.length > 100) { showError('title','Title must be less than 100 characters'); isValid = false; }
    else clearError('title');

    if (!date) { showError('date','Please select a date'); isValid = false; } else clearError('date');

    if (!description) { showError('description','Please enter a description'); isValid = false; }
    else if (description.length > 1000) { showError('description','Description must be less than 1000 characters'); isValid = false; }
    else clearError('description');

    return isValid;
}

// Show error message
function showError(field, message) {
    const formGroup = document.getElementById(field).closest('.form-group');
    const errorElement = document.getElementById(field + 'Error');
    if (formGroup) formGroup.classList.add('error');
    if (errorElement) { errorElement.textContent = message; errorElement.classList.add('show'); }
}

// Clear error message
function clearError(field) {
    const formGroup = document.getElementById(field).closest('.form-group');
    const errorElement = document.getElementById(field + 'Error');
    if (formGroup) formGroup.classList.remove('error');
    if (errorElement) errorElement.classList.remove('show');
}

// Save (new) memory to localStorage
function saveMemory(title, date, description, imageBase64, tags) {
    const memories = getMemories();
    const memory = { id: Date.now().toString(), title, date, description, image: imageBase64, tags: tags||[], favorite:false, createdAt: new Date().toISOString() };
    memories.unshift(memory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
    resetForm();
    renderMemories();
}

// Update existing memory
function updateMemory(id, title, date, description, imageBase64, tags) {
    const memories = getMemories();
    const i = memories.findIndex(m=>m.id===id);
    if (i===-1) return;
    memories[i].title = title;
    memories[i].date = date;
    memories[i].description = description;
    memories[i].image = imageBase64;
    memories[i].tags = tags || [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
    resetForm();
    renderMemories();
}

function resetForm(){
    memoryForm.reset();
    imagePreview.classList.remove('show');
    document.getElementById('memoryId').value = '';
    editingId = null; editingOriginalImage = null;
    setDefaultDate();
}

// Get memories from localStorage
function getMemories() {
    try { const memoriesJson = localStorage.getItem(STORAGE_KEY); return memoriesJson ? JSON.parse(memoriesJson) : []; } catch(e){ return []; }
}

// Delete memory
function deleteMemory(id) {
    if (!confirm('Are you sure you want to delete this memory?')) return;
    const memories = getMemories();
    const filteredMemories = memories.filter(memory => memory.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredMemories));
    renderMemories();
}

// Toggle favorite
function toggleFavorite(id) {
    const memories = getMemories();
    const i = memories.findIndex(m=>m.id===id); if (i===-1) return;
    memories[i].favorite = !memories[i].favorite;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
    renderMemories();
}

// Format date for display
function formatDate(dateString) { const options = { year: 'numeric', month: 'long', day: 'numeric' }; return new Date(dateString).toLocaleDateString('en-US', options); }

// Escape HTML to prevent XSS
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

// Validate Base64 image data URL
function isValidImageDataUrl(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') return false;
    const validPattern = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/;
    return validPattern.test(dataUrl);
}

// Render memories to the DOM with filters/search
function renderMemories() {
    const all = getMemories();
    const query = (searchInput && searchInput.value || '').toLowerCase().trim();
    let filtered = all.slice();
    if (showFavoritesOnly) filtered = filtered.filter(m=>m.favorite);
    if (query) {
        filtered = filtered.filter(m => {
            const text = `${m.title} ${m.description} ${(m.tags||[]).join(' ')}`.toLowerCase();
            return text.includes(query);
        });
    }

    if (!filtered || filtered.length===0) {
        memoriesContainer.innerHTML = `<div class="no-memories"><p>No memories yet. Add your first memory above!</p></div>`;
        return;
    }

    memoriesContainer.innerHTML = filtered.map(memory => {
        const safeImage = memory.image && isValidImageDataUrl(memory.image) ? memory.image : null;
        const tagHtml = (memory.tags||[]).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join(' ');
        const favClass = memory.favorite ? 'fav active' : 'fav';
        return `
            <div class="memory-card" data-memory-id="${escapeHtml(memory.id)}">
                ${safeImage ? `<img src="${safeImage}" alt="${escapeHtml(memory.title)}" class="memory-image">` : ''}
                <div class="memory-content">
                    <div class="memory-header">
                        <h3 class="memory-title">${escapeHtml(memory.title)}</h3>
                        <div style="display:flex;gap:8px;align-items:center">
                          <span class="memory-date">${formatDate(memory.date)}</span>
                          <button class="edit-btn" title="Edit">Edit</button>
                          <button class="delete-btn" title="Delete">Delete</button>
                          <button class="fav-btn ${favClass}" title="Favorite">★</button>
                        </div>
                    </div>
                    <p class="memory-description">${escapeHtml(memory.description)}</p>
                    <div class="tags-row">${tagHtml}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Event delegation for card actions
memoriesContainer.addEventListener('click', (e) => {
    const card = e.target.closest('.memory-card');
    if (!card) return;
    const id = card.dataset.memoryId;
    if (e.target.classList.contains('delete-btn')) { deleteMemory(id); }
    else if (e.target.classList.contains('edit-btn')) { beginEdit(id); }
    else if (e.target.classList.contains('fav-btn')) { toggleFavorite(id); }
});

// Begin editing a memory
function beginEdit(id) {
    const memories = getMemories();
    const m = memories.find(x=>x.id===id); if (!m) return;
    editingId = id; editingOriginalImage = m.image || null;
    document.getElementById('title').value = m.title || '';
    document.getElementById('date').value = m.date || '';
    document.getElementById('description').value = m.description || '';
    document.getElementById('tags').value = (m.tags||[]).join(', ');
    document.getElementById('memoryId').value = id;
    if (m.image) { imagePreview.src = m.image; imagePreview.classList.add('show'); }
    window.scrollTo({top:0,behavior:'smooth'});
}

// Export/Import
exportBtn.addEventListener('click', ()=>{
    const data = JSON.stringify(getMemories(), null, 2);
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `vaulted_memories_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', ()=> importFile.click());
importFile.addEventListener('change', (e)=>{
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev)=>{
        try{
            const imported = JSON.parse(ev.target.result);
            if (!Array.isArray(imported)) throw new Error('Invalid file');
            if (confirm('Replace current memories with imported ones? Click Cancel to append instead.')) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
            } else {
                const current = getMemories();
                const merged = imported.concat(current);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            }
            renderMemories();
        } catch (err){ alert('Failed to import: ' + err.message); }
    };
    reader.readAsText(f);
    importFile.value = '';
});

// Search and favorites filter
if (searchInput) searchInput.addEventListener('input', ()=> renderMemories());
favoritesFilterBtn.addEventListener('click', ()=>{
    showFavoritesOnly = !showFavoritesOnly;
    favoritesFilterBtn.textContent = showFavoritesOnly ? 'Showing Favorites' : 'Show Favorites';
    renderMemories();
});

