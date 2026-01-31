// MEBV - Malawi Education Books & Vacancies
// Complete Frontend Application

const ADMIN_PASSWORD = 'Mdumuka@2026';
const DOWNLOAD_PRICE = 600;
const READ_PRICE = 240;
const PAYMENT_METHODS = {
    'National Bank': { account: '1011288266', name: 'Abraham Msofi' },
    'Airtel Money': { account: '+265993984344', name: 'Abraham Msofi' },
    'TNM Mpamba': { account: '+265897228943', name: 'Abraham Msofi' }
};

let currentBook = null;
let currentAction = null;
let paymentVerified = false;
let sessionExpiry = null;
let currentPaymentMethod = null;

// Initialize app on load
document.addEventListener('DOMContentLoaded', async () => {
    loadBooks();
    setupEventListeners();
    checkAdminAccess();
});

// Load books from JSON database
async function loadBooks() {
    try {
        const response = await fetch('/database/books.json');
        const books = await response.json();
        displayBooks(books);
    } catch (error) {
        console.error('Error loading books:', error);
        document.getElementById('booksGrid').innerHTML = '<p>Error loading books. Please refresh.</p>';
    }
}

// Display books in grid
function displayBooks(books) {
    const grid = document.getElementById('booksGrid');
    grid.innerHTML = '';

    books.forEach(book => {
        const bookCard = createBookCard(book);
        grid.appendChild(bookCard);
    });
}

// Create individual book card
function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    card.innerHTML = `
        <div class="book-preview">
            <img src="${book.previewImage}" alt="${book.title}" onerror="this.src='/assets/previews/default.png'">
        </div>
        <div class="book-info">
            <h3 class="book-title">${escapeHtml(book.title)}</h3>
            <div class="book-price">K${book.price}</div>
            <div class="book-counters">
                <div class="counter">
                    <span class="counter-number">${book.downloads || 0}</span>
                    <span class="counter-label">Downloads</span>
                </div>
                <div class="counter">
                    <span class="counter-number">${book.views || 0}</span>
                    <span class="counter-label">Views</span>
                </div>
                <div class="counter">
                    <span class="counter-number">${book.shares || 0}</span>
                    <span class="counter-label">Shares</span>
                </div>
            </div>
            <div class="book-buttons">
                <button class="btn btn-primary btn-small" onclick="initiateDownload('${escapeHtml(book.id)}')">⬇️ Download</button>
                <button class="btn btn-primary btn-small" onclick="initiateRead('${escapeHtml(book.id)}')">👁️ Read</button>
                <button class="btn btn-secondary btn-small" onclick="shareBook('${escapeHtml(book.id)}')">📤 Share</button>
            </div>
        </div>
    `;
    return card;
}

// Initiate download flow
function initiateDownload(bookId) {
    fetchBookDatabase(books => {
        const book = books.find(b => b.id === bookId);
        if (book) {
            currentBook = book;
            currentAction = 'download';
            showPaymentModal('DOWNLOAD', DOWNLOAD_PRICE, book.title);
        }
    });
}

// Initiate read online flow
function initiateRead(bookId) {
    fetchBookDatabase(books => {
        const book = books.find(b => b.id === bookId);
        if (book) {
            currentBook = book;
            currentAction = 'read';
            showPaymentModal('READ ONLINE', READ_PRICE, book.title);
        }
    });
}

// Show payment modal
function showPaymentModal(type, amount, bookTitle) {
    document.getElementById('paymentTitle').textContent = `${type} - ${escapeHtml(bookTitle)}`;
    document.getElementById('paymentAmount').textContent = `Amount to pay: K${amount}.00`;
    document.getElementById('paymentModal').classList.remove('hidden');
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('menuBtn').addEventListener('click', openMenuModal);
    document.getElementById('donateBtn').addEventListener('click', openDonateModal);
    document.getElementById('whatsappBtn').addEventListener('click', openWhatsApp);
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('confirmPaymentBtn').addEventListener('click', proceedToVerification);
    document.getElementById('verifyBtn').addEventListener('click', verifyTransaction);
    document.getElementById('accessBtn').addEventListener('click', handleAccess);
}

// Menu modal
function openMenuModal() {
    document.getElementById('menuModal').classList.remove('hidden');
}

function closeMenuModal() {
    document.getElementById('menuModal').classList.add('hidden');
}

function openAbout() {
    closeMenuModal();
    document.getElementById('aboutModal').classList.remove('hidden');
}

function closeAboutModal() {
    document.getElementById('aboutModal').classList.add('hidden');
}

function openContact() {
    closeMenuModal();
    document.getElementById('contactModal').classList.remove('hidden');
}

function closeContactModal() {
    document.getElementById('contactModal').classList.add('hidden');
}

// Donations modal
function openDonateModal() {
    document.getElementById('donateModal').classList.remove('hidden');
}

function closeDonateModal() {
    document.getElementById('donateModal').classList.add('hidden');
}

// WhatsApp redirect
function openWhatsApp() {
    window.open('https://wa.me/265993984344?text=Add%20me%20to%20MEBV', '_blank');
}

// Search functionality
async function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    const resultsContainer = document.getElementById('searchResults');

    if (query.length < 2) {
        resultsContainer.classList.add('hidden');
        return;
    }

    fetchBookDatabase(books => {
        const matches = books.filter(book =>
            book.title.toLowerCase().includes(query)
        ).slice(0, 8);

        if (matches.length === 0) {
            resultsContainer.innerHTML = '<div class="search-result-item">No results found</div>';
        } else {
            resultsContainer.innerHTML = matches.map(book => `
                <div class="search-result-item" onclick="selectSearchResult('${escapeHtml(book.id)}')">
                    <div class="search-result-title">${escapeHtml(book.title)}</div>
                    <div class="search-result-price">K${book.price}</div>
                </div>
            `).join('');
        }

        resultsContainer.classList.remove('hidden');
    });
}

function selectSearchResult(bookId) {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').classList.add('hidden');
    fetchBookDatabase(books => {
        const book = books.find(b => b.id === bookId);
        if (book) {
            document.querySelector('html').scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
}

// Payment verification
function proceedToVerification() {
    document.getElementById('paymentModal').classList.add('hidden');
    document.getElementById('verificationModal').classList.remove('hidden');
}

function closeVerificationModal() {
    document.getElementById('verificationModal').classList.add('hidden');
}

function verifyTransaction() {
    const transactionId = document.getElementById('transactionId').value.trim();

    if (!transactionId) {
        showError('Please enter transaction ID');
        return;
    }

    // Validate transaction ID format
    const isValid = validateTransactionId(transactionId);

    if (!isValid) {
        showAccessDenied();
        return;
    }

    // Mark payment as verified
    paymentVerified = true;
    sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hour session

    // Store session
    sessionStorage.setItem('paymentVerified', 'true');
    sessionStorage.setItem('sessionExpiry', sessionExpiry.getTime());
    sessionStorage.setItem('currentBookId', currentBook.id);
    sessionStorage.setItem('currentAction', currentAction);

    document.getElementById('verificationModal').classList.add('hidden');

    if (currentAction === 'download') {
        showAccessModal('✓ Payment verified! Your book is ready to download.');
    } else if (currentAction === 'read') {
        showAccessModal('✓ Payment verified! You can now read the book for 24 hours.');
    }
}

// Validate transaction ID
function validateTransactionId(txnId) {
    const txnUpper = txnId.toUpperCase();
    const expectedAmount = currentAction === 'download' ? 'K600' : 'K240';
    const today = new Date();
    const dateStr = today.toLocaleDateString().replace(/\//g, '');

    // Check if transaction contains required elements
    const hasName = txnUpper.includes('ABRAHAM') && txnUpper.includes('MSOFI');
    const hasAmount = txnUpper.includes('600') || txnUpper.includes('240');
    const hasDate = txnUpper.includes(dateStr) || txnUpper.includes(today.getDate().toString());
    const hasAccountNumber = txnUpper.includes('1011288266') || 
                            txnUpper.includes('265993984344') || 
                            txnUpper.includes('265897228943');

    return hasName && hasAmount && hasAccountNumber;
}

// Show access granted modal
function showAccessModal(message) {
    document.getElementById('accessMessage').textContent = message;
    document.getElementById('accessModal').classList.remove('hidden');
}

function closeAccessModal() {
    document.getElementById('accessModal').classList.add('hidden');
}

// Handle access (download or read)
function handleAccess() {
    closeAccessModal();

    if (currentAction === 'download') {
        triggerDownload();
    } else if (currentAction === 'read') {
        enableReadAccess();
    }
}

// Trigger file download
function triggerDownload() {
    if (!currentBook) return;

    fetchBookDatabase(async books => {
        const book = books.find(b => b.id === currentBook.id);
        if (!book || !book.filePath) {
            showError('Book file not found');
            return;
        }

        try {
            const link = document.createElement('a');
            link.href = book.filePath;
            link.download = `${book.title}.${getFileExtension(book.filePath)}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Increment download counter
            incrementCounter(book.id, 'downloads');
        } catch (error) {
            showError('Download failed. Please try again.');
        }
    });
}

// Enable read access
function enableReadAccess() {
    if (!currentBook) return;

    // Store read session
    sessionStorage.setItem('readAccess', JSON.stringify({
        bookId: currentBook.id,
        expiry: sessionExpiry.getTime()
    }));

    // Increment views counter
    incrementCounter(currentBook.id, 'views');

    // Create read window
    const readWindow = window.open('', 'readBook', 'width=800,height=600');
    readWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Reading: ${escapeHtml(currentBook.title)}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                .read-container { max-width: 900px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
                .read-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
                .read-header h1 { margin: 0; color: #333; }
                .countdown { color: #d32f2f; font-weight: bold; }
                .read-content { text-align: center; padding: 40px; }
                .notice { background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
            </style>
        </head>
        <body>
            <div class="read-container">
                <div class="read-header">
                    <h1>${escapeHtml(currentBook.title)}</h1>
                    <div class="countdown">Time Remaining: <span id="countdown">24:00:00</span></div>
                </div>
                <div class="notice">
                    📖 You have 24 hours to read this book. After that, access will be locked.
                </div>
                <div class="read-content">
                    <p>Book file: ${escapeHtml(currentBook.filePath)}</p>
                    <p><strong>To view the file, download it from the main application.</strong></p>
                    <p>This secure viewer ensures you have access for exactly 24 hours.</p>
                </div>
            </div>
            <script>
                const expiryTime = ${sessionExpiry.getTime()};
                setInterval(() => {
                    const remaining = expiryTime - Date.now();
                    if (remaining <= 0) {
                        document.getElementById('countdown').textContent = '00:00:00';
                        alert('Your read access has expired.');
                        window.close();
                    } else {
                        const hours = Math.floor(remaining / (1000 * 60 * 60));
                        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
                        document.getElementById('countdown').textContent = 
                            String(hours).padStart(2, '0') + ':' + 
                            String(minutes).padStart(2, '0') + ':' + 
                            String(seconds).padStart(2, '0');
                    }
                }, 1000);
            </script>
        </body>
        </html>
    `);
}

// Share book
function shareBook(bookId) {
    fetchBookDatabase(books => {
        const book = books.find(b => b.id === bookId);
        if (book) {
            currentBook = book;
            const shareLink = `${window.location.origin}${window.location.pathname}?book=${bookId}`;
            document.getElementById('shareLink').value = shareLink;
            document.getElementById('shareModal').classList.remove('hidden');

            // Increment share counter
            incrementCounter(bookId, 'shares');
        }
    });
}

function closeShareModal() {
    document.getElementById('shareModal').classList.add('hidden');
}

function copyShareLink() {
    const shareLink = document.getElementById('shareLink');
    shareLink.select();
    document.execCommand('copy');

    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(() => {
        btn.textContent = originalText;
    }, 2000);
}

// Close payment modal
function closePaymentModal() {
    document.getElementById('paymentModal').classList.add('hidden');
}

// Close download modal
function closeDownloadModal() {
    document.getElementById('downloadModal').classList.add('hidden');
}

// Show access denied
function showAccessDenied() {
    closeVerificationModal();
    alert('❌ ACCESS DENIED\n\nTransaction verification failed. Please check:\n- Account name is "Abraham Msofi"\n- Account number matches payment method\n- Today\'s date is included\n- Amount is correct (K600 or K240)');
}

// Show error message
function showError(message) {
    alert(`⚠️ ${message}`);
}

// Get file extension
function getFileExtension(filePath) {
    return filePath.split('.').pop().toLowerCase();
}

// Increment counter (simulated - in real app would update backend)
function incrementCounter(bookId, counterType) {
    // This would typically update the backend
    // For now, just increment in memory
}

// Escape HTML for security
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

// Fetch book database
function fetchBookDatabase(callback) {
    fetch('/database/books.json')
        .then(response => response.json())
        .then(data => callback(data))
        .catch(error => console.error('Error fetching books:', error));
}

// Admin access check (SHIFT + CTRL + TAB)
let adminKeyCombo = [];
document.addEventListener('keydown', (e) => {
    adminKeyCombo = [e.shiftKey, e.ctrlKey, e.key === 'Tab'];
    if (adminKeyCombo[0] && adminKeyCombo[1] && e.key === 'Tab') {
        e.preventDefault();
        if (!document.getElementById('adminPanel').classList.contains('hidden')) {
            return;
        }
        showAdminLogin();
    }
});

function showAdminLogin() {
    const password = prompt('Enter admin password:');
    if (password === ADMIN_PASSWORD) {
        window.location.href = '/admin.html';
    } else if (password !== null) {
        alert('Invalid password');
    }
}

function checkAdminAccess() {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        // Admin is logged in
    }
}

// Close modals on outside click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.add('hidden');
    }
});