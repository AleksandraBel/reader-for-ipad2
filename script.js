document.addEventListener('DOMContentLoaded', function() {
    var bookContent = document.getElementById('book-content');
    var prevPageButton = document.getElementById('prev-page');
    var nextPageButton = document.getElementById('next-page');
    var pageIndicator = document.getElementById('page-indicator');
    var translationPopup = document.getElementById('translation-popup');

    var fullText = '';
    var words = [];
    var wordsPerPage = 250; // Approximate words per page
    var currentPage = 1;
    var totalPages = 1;

    // --- 1. Load the book using XMLHttpRequest for older browser compatibility ---
    function loadBook(url) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 400) {
                fullText = xhr.responseText;
                setupBook();
            } else {
                console.error("Error loading book: Server returned an error.");
                bookContent.innerHTML = '<p>Failed to load book. Please make sure the server is running and the file exists.</p>';
            }
        };
        xhr.onerror = function() {
            console.error("Error loading book: Network error.");
            bookContent.innerHTML = '<p>Failed to load book. A network error occurred.</p>';
        };
        xhr.send();
    }

    // --- 2. Setup the book content ---
    function setupBook() {
        // Split text into words
        words = fullText.trim().split(/\s+/);
        totalPages = Math.ceil(words.length / wordsPerPage);
        
        // Store current page in localStorage
        var savedPage = localStorage.getItem('bookCurrentPage');
        if (savedPage) {
            currentPage = parseInt(savedPage, 10);
        }

        displayPage(currentPage);
    }

    // --- 3. Display a specific page ---
    function displayPage(pageNumber) {
        if (pageNumber < 1 || pageNumber > totalPages) {
            return;
        }
        currentPage = pageNumber;
        localStorage.setItem('bookCurrentPage', currentPage);

        var start = (currentPage - 1) * wordsPerPage;
        var end = start + wordsPerPage;
        var pageWords = words.slice(start, end);

        bookContent.innerHTML = pageWords.map(function(word) {
            return '<span>' + word + '</span>';
        }).join(' ');
        
        pageIndicator.textContent = 'Page ' + currentPage + ' of ' + totalPages;

        // Update button states
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages;
    }

    // --- 4. Event Listeners ---
    prevPageButton.addEventListener('click', function() {
        displayPage(currentPage - 1);
    });

    nextPageButton.addEventListener('click', function() {
        displayPage(currentPage + 1);
    });

    // --- 5. Word Click for Translation ---
    bookContent.addEventListener('click', function(event) {
        if (event.target.tagName === 'SPAN') {
            var word = event.target.textContent.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
            if (word) {
                // Simple translation approach: open Google Translate in a new tab
                var translateUrl = 'https://translate.google.com/?sl=en&tl=ru&text=' + encodeURIComponent(word);
                window.open(translateUrl, '_blank');
            }
        }
    });

    // --- Initial Load ---
    // Load the book from the server script
    loadBook('books/sample-book.txt');
});
