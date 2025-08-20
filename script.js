document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Elements ---
    const viewer = document.getElementById('viewer');
    const translationPanelContainer = document.getElementById('translation-panel-container');
    const translationPanel = document.getElementById('translation-panel');
    const bookTitle = document.getElementById('book-title');
    const settingsButton = document.getElementById('settings-button');
    const settingsPanel = document.getElementById('settings-panel');
    const prevPageButton = document.getElementById('prev-page-button');
    const nextPageButton = document.getElementById('next-page-button');
    const pageNumDisplay = document.getElementById('page-number-display');

    // --- File Paths ---
    const originalBookPath = 'books/Moby-Dick.txt';
    const translatedBookPath = 'books/Moby-Dick(ru).txt';

    // --- State ---
    let lastHighlightedOriginalWord = null;
    let lastHighlightedTranslatedWord = null;
    let originalParagraphs = []; // Will hold all <p> elements of the original book
    let currentPage = 1;
    const paragraphsPerPage = 20; // Adjust this to change page size
    let totalPages = 0;

    /**
     * Processes text into an array of paragraph elements with word spans.
     * @param {string} text - The text to process.
     * @returns {Array<HTMLElement>} - An array of <p> elements.
     */
    function processTextToParagraphs(text) {
        const processedParagraphs = [];
        const segments = text.split(/\n+/).filter(s => s.trim() !== '');

        segments.forEach((segment, pIndex) => {
            const p = document.createElement('p');
            p.dataset.segmentId = pIndex;

            const words = segment.trim().split(/\s+/);
            words.forEach((word, wIndex) => {
                const span = document.createElement('span');
                span.textContent = word + ' ';
                span.dataset.wordId = `${pIndex}-${wIndex}`;
                p.appendChild(span);
            });
            processedParagraphs.push(p);
        });
        return processedParagraphs;
    }

    /**
     * Renders a specific page into the viewer.
     * @param {number} page - The page number to render.
     */
    function renderPage(page) {
        viewer.innerHTML = '';
        const startIndex = (page - 1) * paragraphsPerPage;
        const endIndex = startIndex + paragraphsPerPage;
        const pageParagraphs = originalParagraphs.slice(startIndex, endIndex);

        pageParagraphs.forEach(p => viewer.appendChild(p));

        // Update UI
        pageNumDisplay.textContent = `Page ${page} of ${totalPages}`;
        prevPageButton.disabled = page === 1;
        nextPageButton.disabled = page === totalPages;
        currentPage = page;
    }

    // --- Main Logic ---
    Promise.all([
        fetch(originalBookPath).then(res => res.text()),
        fetch(translatedBookPath).then(res => res.text())
    ])
    .then(([originalText, translatedText]) => {
        // Process and store all original paragraphs
        originalParagraphs = processTextToParagraphs(originalText);
        totalPages = Math.ceil(originalParagraphs.length / paragraphsPerPage);

        // Process and display the translation panel (it's not paginated)
        const translationParagraphs = processTextToParagraphs(translatedText);
        translationPanel.innerHTML = '';
        translationParagraphs.forEach(p => translationPanel.appendChild(p));

        bookTitle.textContent = "Moby Dick";
        renderPage(1); // Render the first page
    })
    .catch(error => {
        console.error('Error loading books:', error);
        viewer.textContent = 'Failed to load book content.';
    });

    // --- Event Listeners ---
    prevPageButton.addEventListener('click', () => {
        if (currentPage > 1) {
            renderPage(currentPage - 1);
        }
    });

    nextPageButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            renderPage(currentPage + 1);
        }
    });

    // Handle clicks on the original text to show the panel and highlight word
    viewer.addEventListener('click', function(event) {
        const targetWord = event.target.closest('span[data-word-id]');
        if (!targetWord) return;

        translationPanelContainer.classList.add('visible');
        document.body.classList.add('panel-visible');

        const wordId = targetWord.dataset.wordId;
        const translatedWord = translationPanel.querySelector(`span[data-word-id="${wordId}"]`);

        if (lastHighlightedOriginalWord) lastHighlightedOriginalWord.classList.remove('highlight-word');
        if (lastHighlightedTranslatedWord) lastHighlightedTranslatedWord.classList.remove('highlight-word');

        targetWord.classList.add('highlight-word');
        lastHighlightedOriginalWord = targetWord;

        if (translatedWord) {
            translatedWord.classList.add('highlight-word');
            lastHighlightedTranslatedWord = translatedWord;
            translatedWord.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    });

    // Hide panel when clicking on it
    translationPanelContainer.addEventListener('click', function(event) {
        if (event.target === translationPanelContainer || event.target === translationPanel) {
            translationPanelContainer.classList.remove('visible');
            document.body.classList.remove('panel-visible');
        }
    });

    // Toggle settings panel
    settingsButton.addEventListener('click', () => {
        settingsPanel.classList.toggle('hidden');
    });

    // --- Drag-to-Scroll for Translation Panel ---
    let isDown = false;
    let startX;
    let scrollLeft;

    translationPanelContainer.addEventListener('mousedown', (e) => {
        isDown = true;
        translationPanelContainer.classList.add('active');
        startX = e.pageX - translationPanelContainer.offsetLeft;
        scrollLeft = translationPanelContainer.scrollLeft;
    });

    translationPanelContainer.addEventListener('mouseleave', () => {
        isDown = false;
        translationPanelContainer.classList.remove('active');
    });

    translationPanelContainer.addEventListener('mouseup', () => {
        isDown = false;
        translationPanelContainer.classList.remove('active');
    });

    translationPanelContainer.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - translationPanelContainer.offsetLeft;
        const walk = (x - startX) * 2;
        translationPanelContainer.scrollLeft = scrollLeft - walk;
    });

    // --- Settings (Font Size, Theme) ---
    const decreaseFontButton = document.getElementById('decrease-font');
    const increaseFontButton = document.getElementById('increase-font');
    const fontSizeValue = document.getElementById('font-size-value');
    const themeButtons = document.querySelectorAll('.theme-button');

    let currentFontSize = 22;
    function applyFontSize() {
        viewer.style.fontSize = currentFontSize + 'px';
        fontSizeValue.textContent = currentFontSize;
        localStorage.setItem('parallelReaderFontSize', currentFontSize);
    }

    function applyTheme(theme) {
        document.body.className = 'theme-' + theme;
        localStorage.setItem('parallelReaderTheme', theme);
        themeButtons.forEach(button => {
            button.classList.toggle('active', button.getAttribute('data-theme') === theme);
        });
    }

    decreaseFontButton.addEventListener('click', () => {
        if (currentFontSize > 10) {
            currentFontSize -= 2;
            applyFontSize();
        }
    });

    increaseFontButton.addEventListener('click', () => {
        if (currentFontSize < 48) {
            currentFontSize += 2;
            applyFontSize();
        }
    });

    themeButtons.forEach(button => {
        button.addEventListener('click', function() {
            applyTheme(this.getAttribute('data-theme'));
        });
    });

    // Load saved settings on start
    currentFontSize = parseInt(localStorage.getItem('parallelReaderFontSize') || '22', 10);
    applyFontSize();
    const savedTheme = localStorage.getItem('parallelReaderTheme') || 'day';
    applyTheme(savedTheme);
});
