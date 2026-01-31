// MEBV Admin Panel

const ADMIN_PASSWORD = 'Mdumuka@2026';

let booksDatabase = [];
let adsDatabase = [];

document.addEventListener('DOMContentLoaded', () => {
    checkAdminLogin();
    loadDatabasesForAdmin();
    setupAdminEventListeners();
});

function checkAdminLogin() {
    const loginContainer = document.getElementById('loginContainer');
    const adminPanel = document.getElementById('adminPanel');

    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        loginContainer.style.display = 'none';
        adminPanel.classList.remove('hidden');
    } else {
        adminPanel.classList.add('hidden');
        loginContainer.style.display = 'flex';
    }
}

function setupAdminEventListeners() {
    document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('bookUploadForm').addEventListener('submit', handleBookUpload);
    document.getElementById('adsUploadForm').addEventListener('submit', handleAdsUpload);

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });
}

function handleAdminLogin(e) {
    e.preventDefault();
    const password = document.getElementById('adminPassword').value;

    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('adminPanel').classList.remove('hidden');
        loadDatabasesForAdmin();
    } else {
        document.getElementById('loginError').textContent = '❌ Invalid password';
    }
}

function logout() {
    sessionStorage.removeItem('adminLoggedIn');
    location.reload();
}

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');

    if (tabName === 'manage') {
        loadBooksForManagement();
    }
}

async function loadDatabasesForAdmin() {
    try {
        const response = await fetch('/database/books.json');
        booksDatabase = await response.json();
    } catch (error) {
        console.error('Error loading books database:', error);
    }
}

function handleBookUpload(e) {
    e.preventDefault();

    const title = document.getElementById('bookTitle').value;
    const price = parseInt(document.getElementById('bookPrice').value);
    const format = document.getElementById('bookFormat').value;
    const fileInput = document.getElementById('bookFile');
    const previewInput = document.getElementById('bookPreview');

    if (!fileInput.files.length) {
        showStatus('uploadStatus', 'Please select a book file', 'error');
        return;
    }

    const bookFile = fileInput.files[0];
    const fileName = sanitizeFileName(title, format);

    // Simulate file upload (in production would use FormData and actual upload)
    const reader = new FileReader();
    reader.onload = (e) => {
        // Create new book entry
        const newBook = {
            id: 'book_' + Date.now(),
            title: title,
            price: price,
            filePath: `/books/${format}/${fileName}`,
            previewImage: previewInput.files.length ? `/assets/previews/${sanitizeFileName(title, 'png')}` : '/assets/previews/default.png',
            downloads: 0,
            views: 0,
            shares: 0,
            uploadedAt: new Date().toISOString()
        };

        // Add to database
        booksDatabase.push(newBook);

        // Save to localStorage (simulating database save)
        localStorage.setItem('booksDatabase', JSON.stringify(booksDatabase));

        showStatus('uploadStatus', `✓ Book "${title}" uploaded successfully!`, 'success');

        // Reset form
        document.getElementById('bookUploadForm').reset();

        // In production, this would save to actual database
    };

    reader.readAsArrayBuffer(bookFile);
}

function handleAdsUpload(e) {
    e.preventDefault();

    const title = document.getElementById('adTitle').value;
    const link = document.getElementById('adLink').value;
    const fileInput = document.getElementById('adFile');

    if (!fileInput.files.length) {
        showStatus('adsStatus', 'Please select an ad file', 'error');
        return;
    }

    const fileName = sanitizeFileName(title, 'media');

    const newAd = {
        id: 'ad_' + Date.now(),
        title: title,
        filePath: `/assets/ads/${fileName}`,
        link: link || '#',
        uploadedAt: new Date().toISOString()
    };

    adsDatabase.push(newAd);
    localStorage.setItem('adsDatabase', JSON.stringify(adsDatabase));

    showStatus('adsStatus', `✓ Ad "${title}" uploaded successfully!`, 'success');
    document.getElementById('adsUploadForm').reset();
}

function loadBooksForManagement() {
    const listContainer = document.getElementById('booksList');
    listContainer.innerHTML = '';

    if (booksDatabase.length === 0) {
        listContainer.innerHTML = '<p>No books uploaded yet.</p>';
        return;
    }

    booksDatabase.forEach(book => {
        const bookItem = document.createElement('div');
        bookItem.className = 'book-list-item';
        bookItem.innerHTML = `
            <div class="book-list-item-info">
                <div class="book-list-item-title">${escapeHtml(book.title)}</div>
                <div class="book-list-item-details">
                    K${book.price} | Format: ${book.filePath.split('.').pop().toUpperCase()} | 
                    Downloads: ${book.downloads} | Views: ${book.views} | Shares: ${book.shares}
                </div>
            </div>
            <div class="book-list-item-actions">
                <button class="btn btn-secondary btn-small" onclick="editBook('${book.id}')">Edit</button>
                <button class="btn btn-secondary btn-small" onclick="deleteBook('${book.id}')">Delete</button>
            </div>
        `;
        listContainer.appendChild(bookItem);
    });
}

function editBook(bookId) {
    const book = booksDatabase.find(b => b.id === bookId);
    if (book) {
        // Populate form with book data
        document.getElementById('bookTitle').value = book.title;
        document.getElementById('bookPrice').value = book.price;
        document.getElementById('bookFormat').value = book.filePath.split('.').pop();

        // Switch to upload tab
        document.querySelector('[data-tab="upload"]').click();

        // Change button text temporarily
        const submitBtn = document.querySelector('#bookUploadForm button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '📝 Update Book';

        // Update handler
        document.getElementById('bookUploadForm').onsubmit = (e) => {
            e.preventDefault();
            book.title = document.getElementById('bookTitle').value;
            book.price = parseInt(document.getElementById('bookPrice').value);
            localStorage.setItem('booksDatabase', JSON.stringify(booksDatabase));
            showStatus('uploadStatus', '✓ Book updated successfully!', 'success');
            submitBtn.textContent = originalText;
            document.getElementById('bookUploadForm').onsubmit = handleBookUpload;
            document.getElementById('bookUploadForm').reset();
        };
    }
}

function deleteBook(bookId) {
    if (confirm('Are you sure you want to delete this book?')) {
        booksDatabase = booksDatabase.filter(b => b.id !== bookId);
        localStorage.setItem('booksDatabase', JSON.stringify(booksDatabase));
        loadBooksForManagement();
    }
}

function sanitizeFileName(text, extension) {
    return text.toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 50) + '.' + extension;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function showStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `status-message ${type}`;
    setTimeout(() => {
        element.className = 'status-message';
    }, 5000);
}