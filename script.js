document.addEventListener('DOMContentLoaded', function() {
    // --- Polyfill for Element.closest() ---
    if (!Element.prototype.closest) {
        Element.prototype.closest = function(s) {
            var el = this;
            do {
                if (el.matches(s)) return el;
                el = el.parentElement || el.parentNode;
            } while (el !== null && el.nodeType === 1);
            return null;
        };
    }
    // Polyfill for Element.matches()
    if (!Element.prototype.matches) {
        Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
    }

    // --- DOM Elements ---
    var viewer = document.getElementById('viewer');
    var translationPanelContainer = document.getElementById('translation-panel-container');
    var translationPanel = document.getElementById('translation-panel');
    var bookTitle = document.getElementById('book-title');
    var settingsButton = document.getElementById('settings-button');
    var settingsPanel = document.getElementById('settings-panel');
    var prevPageButton = document.getElementById('prev-page-button');
    var nextPageButton = document.getElementById('next-page-button');
    var pageNumDisplay = document.getElementById('page-number-display');
    var singleWordPanel = document.getElementById('single-word-translation-panel');

    // --- File Paths ---
    var originalBookPath = 'books/Moby-Dick.txt';
    var translatedBookPath = 'books/Moby-Dick(ru).txt';

    // --- State ---
    var lastHighlightedOriginalWord = null;
    var lastHighlightedTranslatedWord = null;
    var originalParagraphStrings = []; // Holds all paragraph strings of the original book
    var translatedParagraphStrings = []; // Holds all paragraph strings of the translated book
    var currentPage = 1;
    var paragraphsPerPage = 20; // Adjust this to change page size
    var totalPages = 0;

    /**
     * Processes an array of paragraph strings into an array of paragraph DOM elements.
     * @param {Array<string>} paragraphStrings - The array of strings to process.
     * @param {number} paragraphOffset - The starting index for segment IDs.
     * @returns {Array<HTMLElement>} - An array of <p> elements.
     */
    function processParagraphsToDom(paragraphStrings, paragraphOffset) {
        var processedParagraphs = [];
        for (var i = 0; i < paragraphStrings.length; i++) {
            var segment = paragraphStrings[i];
            var pIndex = paragraphOffset + i;

            var p = document.createElement('p');
            p.setAttribute('data-segment-id', pIndex);

            var words = segment.trim().split(/\s+/);
            for (var j = 0; j < words.length; j++) {
                var word = words[j];
                var span = document.createElement('span');
                span.textContent = word + ' ';
                span.setAttribute('data-word-id', pIndex + '-' + j);
                p.appendChild(span);
            }
            processedParagraphs.push(p);
        }
        return processedParagraphs;
    }

    /**
     * Renders a specific page into the viewer.
     * @param {number} page - The page number to render.
     */
    function renderPage(page) {
        viewer.innerHTML = ''; // Clear existing content
        var startIndex = (page - 1) * paragraphsPerPage;
        var endIndex = startIndex + paragraphsPerPage;
        var pageParagraphStrings = originalParagraphStrings.slice(startIndex, endIndex);

        var pageParagraphDoms = processParagraphsToDom(pageParagraphStrings, startIndex);
        for (var i = 0; i < pageParagraphDoms.length; i++) {
            viewer.appendChild(pageParagraphDoms[i]);
        }

        // Update UI
        pageNumDisplay.textContent = 'Page ' + page + ' of ' + totalPages;
        prevPageButton.disabled = page === 1;
        nextPageButton.disabled = page === totalPages;
        currentPage = page;
        window.scrollTo(0, 0); // Scroll to top on page change
    }

    /**
     * Fetches a translation for a single word using MyMemory API.
     * @param {string} word - The word to translate.
     * @param {function} callback - The callback to execute with the result.
     */
    function getTranslation(word, callback) {
        var cleanedWord = word.toLowerCase().replace(/[^a-z]/g, ''); // Clean the word
        if (!cleanedWord) {
            callback(word + ': (не слово)');
            return;
        }

        var apiUrl = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(cleanedWord) + '&langpair=en|ru';

        var xhr = new XMLHttpRequest();
        xhr.open('GET', apiUrl, true);

        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    if (data.responseStatus !== 200) {
                        callback(word + ': (перевод не найден)');
                        return;
                    }
                    var translation = data.responseData.translatedText;
                    if (translation.toLowerCase() === cleanedWord) {
                        callback(word + ': (перевод не найден)');
                        return;
                    }
                    var firstTranslation = translation.split(';')[0].split(',')[0].trim();
                    callback(word + ': ' + firstTranslation);
                } catch (e) {
                    callback('Ошибка обработки перевода.');
                }
            } else {
                callback('Ошибка перевода.');
            }
        };
        xhr.onerror = function() {
            callback('Ошибка сети при переводе.');
        };
        xhr.send();
    }

    // --- Main Logic ---
    function getText(url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                callback(null, xhr.responseText);
            } else {
                callback(new Error('Failed to load text file: ' + url));
            }
        };
        xhr.onerror = function() {
            callback(new Error('Network error while fetching text file: ' + url));
        };
        xhr.send();
    }

    getText(originalBookPath, function(err, originalText) {
        if (err) {
            console.error('Error loading original book:', err);
            viewer.textContent = 'Failed to load book content.';
            return;
        }
        getText(translatedBookPath, function(err, translatedText) {
            if (err) {
                console.error('Error loading translated book:', err);
                viewer.textContent = 'Failed to load book content.';
                return;
            }

            originalParagraphStrings = originalText.split(/\n+/).filter(function(s) { return s.trim() !== ''; });
            translatedParagraphStrings = translatedText.split(/\n+/).filter(function(s) { return s.trim() !== ''; });
            totalPages = Math.ceil(originalParagraphStrings.length / paragraphsPerPage);

            bookTitle.textContent = "Moby Dick";
            renderPage(1); // Render the first page
        });
    });

    // --- Event Listeners ---
    prevPageButton.addEventListener('click', function() {
        if (currentPage > 1) {
            renderPage(currentPage - 1);
        }
    });

    nextPageButton.addEventListener('click', function() {
        if (currentPage < totalPages) {
            renderPage(currentPage + 1);
        }
    });

    // Handle clicks on the original text to show the panel and highlight word
    viewer.addEventListener('click', function(event) {
        var targetWord = event.target.closest('span[data-word-id]');
        if (!targetWord) return;

        // --- Update Translation Panel On-Demand ---
        var segmentId = parseInt(targetWord.closest('p').getAttribute('data-segment-id'), 10);
        var translatedParagraphString = translatedParagraphStrings[segmentId];
        if (translatedParagraphString) {
            var translatedDom = processParagraphsToDom([translatedParagraphString], segmentId);
            translationPanel.innerHTML = '';
            translationPanel.appendChild(translatedDom[0]);
        }
        // --- End On-Demand Update ---

        translationPanelContainer.classList.add('visible');
        document.body.classList.add('panel-visible');

        var wordId = targetWord.getAttribute('data-word-id');
        var translatedWord = translationPanel.querySelector('span[data-word-id="' + wordId + '"]');

        if (lastHighlightedOriginalWord) lastHighlightedOriginalWord.classList.remove('highlight-word');
        if (lastHighlightedTranslatedWord) lastHighlightedTranslatedWord.classList.remove('highlight-word');

        targetWord.classList.add('highlight-word');
        lastHighlightedOriginalWord = targetWord;

        if (translatedWord) {
            translatedWord.classList.add('highlight-word');
            lastHighlightedTranslatedWord = translatedWord;
            translatedWord.scrollIntoView();
        }

        // --- Single Word Translation ---
        singleWordPanel.classList.add('visible');
        var word = targetWord.textContent.trim();
        if (word) {
            singleWordPanel.textContent = 'Перевод...';
            getTranslation(word, function(translation) {
                singleWordPanel.textContent = translation;
            });
        }
    });

    // Hide panel when clicking on it
    translationPanelContainer.addEventListener('click', function(event) {
        if (event.target === translationPanelContainer || event.target === translationPanel) {
            translationPanelContainer.classList.remove('visible');
            document.body.classList.remove('panel-visible');
            singleWordPanel.classList.remove('visible');
        }
    });

    // Toggle settings panel
    settingsButton.addEventListener('click', function() {
        settingsPanel.classList.toggle('hidden');
    });

    // --- Drag-to-Scroll for Translation Panel ---
    var isDown = false;
    var startX;
    var scrollLeft;

    translationPanelContainer.addEventListener('mousedown', function(e) {
        isDown = true;
        translationPanelContainer.classList.add('active');
        startX = e.pageX - translationPanelContainer.offsetLeft;
        scrollLeft = translationPanelContainer.scrollLeft;
    });
    translationPanelContainer.addEventListener('mouseleave', function() { isDown = false; translationPanelContainer.classList.remove('active'); });
    translationPanelContainer.addEventListener('mouseup', function() { isDown = false; translationPanelContainer.classList.remove('active'); });
    translationPanelContainer.addEventListener('mousemove', function(e) {
        if (!isDown) return;
        e.preventDefault();
        var x = e.pageX - translationPanelContainer.offsetLeft;
        var walk = (x - startX) * 2;
        translationPanelContainer.scrollLeft = scrollLeft - walk;
    });

    // --- Settings (Font Size, Theme) ---
    var decreaseFontButton = document.getElementById('decrease-font');
    var increaseFontButton = document.getElementById('increase-font');
    var fontSizeValue = document.getElementById('font-size-value');
    var themeButtons = document.querySelectorAll('.theme-button');

    var currentFontSize = 22;
    function applyFontSize() {
        viewer.style.fontSize = currentFontSize + 'px';
        fontSizeValue.textContent = currentFontSize;
        localStorage.setItem('parallelReaderFontSize', currentFontSize);
    }

    function applyTheme(theme) {
        document.body.className = 'theme-' + theme;
        localStorage.setItem('parallelReaderTheme', theme);
        for (var i = 0; i < themeButtons.length; i++) {
            themeButtons[i].classList.toggle('active', themeButtons[i].getAttribute('data-theme') === theme);
        }
    }

    decreaseFontButton.addEventListener('click', function() { 
        if (currentFontSize > 10) { currentFontSize -= 2; applyFontSize(); } 
    });
    increaseFontButton.addEventListener('click', function() { 
        if (currentFontSize < 48) { currentFontSize += 2; applyFontSize(); } 
    });

    for (var i = 0; i < themeButtons.length; i++) {
        themeButtons[i].addEventListener('click', function() {
            applyTheme(this.getAttribute('data-theme'));
        });
    }

    // Load saved settings on start
    currentFontSize = parseInt(localStorage.getItem('parallelReaderFontSize') || '22', 10);
    applyFontSize();
    var savedTheme = localStorage.getItem('parallelReaderTheme') || 'day';
    applyTheme(savedTheme);
});
