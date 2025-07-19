pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

window.AndroidInterface = {
    onFileRead: function(content) {
        processFileContent(content);
        document.getElementById('overlay').classList.remove('active');
        document.getElementById('menu').classList.remove('active');
    }
};

var AndroidInterface = {
    saveFile: function(filename, content) {
        if (window.Android && typeof window.Android.saveFile === 'function') {
            window.Android.saveFile(filename, content);
        } else {
            console.log("Save file called:", filename, content);
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }
    },
    
    onFileRead: function(content) {
        processFileContent(content);
    }
};

window.AndroidInterface = AndroidInterface;

function adjustViewport() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    const headerHeight = document.querySelector('header').offsetHeight;
    const contentPadding = 40;
    const cardFooterHeight = 60;
    const availableHeight = window.innerHeight - headerHeight - contentPadding;
    
    const card = document.getElementById('card');
    card.style.height = `${availableHeight - cardFooterHeight}px`;
    card.style.maxHeight = 'none';
}

document.addEventListener('DOMContentLoaded', function() {
    adjustViewport();
    window.addEventListener('resize', adjustViewport);
    window.addEventListener('orientationchange', adjustViewport);

    const menuBtn = document.getElementById('menu-btn');
    const menu = document.getElementById('menu');
    const overlay = document.getElementById('overlay');
    const card = document.getElementById('card');
    const cardContent = document.getElementById('card-content');
    const questionEl = document.getElementById('question');
    const answerEl = document.getElementById('answer');
    const currentCardInput = document.getElementById('current-card-input');
    const totalCardsSpan = document.getElementById('total-cards');
    const editModal = document.getElementById('edit-modal');
    const contentEditor = document.getElementById('content-editor');
    const saveEditBtn = document.getElementById('save-edit');
    const cancelEditBtn = document.getElementById('cancel-edit');
    const importFileBtn = document.getElementById('import-file');
    const exportFileBtn = document.getElementById('export-file');
    const editContentBtn = document.getElementById('edit-content');
    const shuffleBtn = document.getElementById('shuffle');
    const resetOrderBtn = document.getElementById('reset-order');
    const increaseFontBtn = document.getElementById('increase-font');
    const decreaseFontBtn = document.getElementById('decrease-font');
    const currentFontSizeEl = document.getElementById('current-font-size');
    const fileInput = document.getElementById('file-input');
    const fileExport = document.getElementById('file-export');
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    const searchInput = document.getElementById('search-input');
    const searchPrevBtn = document.getElementById('search-prev-btn');
    const searchNextBtn = document.getElementById('search-next-btn');
    const searchInfo = document.getElementById('search-info');
    const processingMessage = document.getElementById('processing-message');

    let items = [];
    let originalItems = [];
    let currentIndex = 0;
    let isQAMode = true;
    let baseFontSize;
    let touchStartX = 0;
    let touchStartY = 0;
    let searchTerm = '';
    let searchResults = [];
    let currentSearchIndex = -1;
    let isFirstSearchClick = true;
    let originalSeparator = '\t';

    loadSampleData();
    updateDisplay();

    menuBtn.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', toggleMenu);
    saveEditBtn.addEventListener('click', saveContent);
    cancelEditBtn.addEventListener('click', closeEditModal);
    importFileBtn.addEventListener('click', function() {
        document.getElementById('file-input').click();
    });
    editContentBtn.addEventListener('click', openEditModal);
    shuffleBtn.addEventListener('click', shuffleItems);
    resetOrderBtn.addEventListener('click', resetOrder);
    increaseFontBtn.addEventListener('click', increaseFontSize);
    decreaseFontBtn.addEventListener('click', decreaseFontSize);
    fileInput.addEventListener('change', handleFileImport);
    exportFileBtn.addEventListener('click', exportFile);
    
    searchInput.addEventListener('input', function() {
        const hasText = this.value.trim().length > 0;
        searchNextBtn.disabled = !hasText;
        searchPrevBtn.disabled = !hasText;
        
        if (!hasText) {
            clearSearch();
        }
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    searchPrevBtn.addEventListener('click', function() {
        if (isFirstSearchClick) {
            performSearch();
            isFirstSearchClick = false;
        } else {
            goToPrevSearchResult();
        }
    });
    
    searchNextBtn.addEventListener('click', function() {
        if (isFirstSearchClick) {
            performSearch();
            isFirstSearchClick = false;
        } else {
            goToNextSearchResult();
        }
    });
    
    searchInput.addEventListener('input', function() {
        isFirstSearchClick = true;
    });
    
    currentCardInput.addEventListener('focus', function() {
        this.select();
    });
    
    currentCardInput.addEventListener('blur', function() {
        jumpToCard();
    });
    
    currentCardInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            jumpToCard();
            this.blur();
        }
    });
    
    prevButton.addEventListener('click', function(e) {
        e.stopPropagation();
        prevItem();
    });
    
    nextButton.addEventListener('click', function(e) {
        e.stopPropagation();
        nextItem();
    });
    
    card.addEventListener('click', function(e) {
        if (!e.target.classList.contains('nav-button') && isQAMode) {
            answerEl.classList.toggle('visible');
        }
    });

    cardContent.addEventListener('touchstart', function(e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    cardContent.addEventListener('touchmove', function(e) {
        const touchY = e.touches[0].clientY;
        const diffY = Math.abs(touchY - touchStartY);
        
        const touchX = e.touches[0].clientX;
        const diffX = Math.abs(touchX - touchStartX);
        
        if (diffX > diffY && diffX > 10) {
            e.preventDefault();
        }
    }, { passive: false });

    cardContent.addEventListener('touchend', function(e) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;

        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            if (diffX > 0) {
                prevItem();
            } else {
                nextItem();
            }
        }
    }, { passive: true });

    document.body.addEventListener('touchstart', function(e) {
        if (e.target.closest('#card')) return;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    document.body.addEventListener('touchmove', function(e) {
        if (e.target.closest('#card')) return;
        if (window.scrollY === 0 && e.touches[0].clientY > touchStartY) {
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            prevItem();
        } else if (e.key === 'ArrowRight') {
            nextItem();
        } else if (e.key === 'ArrowUp') {
            if (cardContent.scrollHeight > cardContent.clientHeight) {
                e.preventDefault();
                cardContent.scrollBy(0, -50);
            }
        } else if (e.key === 'ArrowDown') {
            if (cardContent.scrollHeight > cardContent.clientHeight) {
                e.preventDefault();
                cardContent.scrollBy(0, 50);
            }
        } else if (e.key === ' ' || e.key === 'Enter') {
            if (isQAMode) {
                answerEl.classList.toggle('visible');
            }
        } else if (e.key === 'Escape') {
            if (menu.classList.contains('active')) {
                toggleMenu();
            }
        } else if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            toggleMenu();
            searchInput.focus();
        }
    });

    function toggleMenu() {
        menu.classList.toggle('active');
        overlay.classList.toggle('active');
        
        if (menu.classList.contains('active')) {
            menu.scrollTo(0, 0);
        }
    }

    function openEditModal() {
        toggleMenu();
        
        contentEditor.value = isQAMode 
            ? items.map(item => `${item.question}${originalSeparator}${item.answer}`).join('\n')
            : items.map(item => item.text).join('\n');
            
        editModal.classList.add('active');
        overlay.classList.add('active');
    }

    function closeEditModal() {
        editModal.classList.remove('active');
        overlay.classList.remove('active');
    }

    function saveContent() {
        const text = contentEditor.value;
        if (text.trim() === '') {
            alert('O conteúdo não pode estar vazio!');
            return;
        }
        
        const hasTabs = text.includes('\t');
        const hasDoubleSemicolon = text.includes(';;');
        const isAlternatingLines = checkAlternatingLinesFormat(text);
        
        if (hasTabs || hasDoubleSemicolon) {
            originalSeparator = hasDoubleSemicolon ? ';;' : '\t';
            parseQAContent(text);
        } else if (isAlternatingLines) {
            parseAlternatingLinesContent(text);
        } else {
            parseTextContent(text);
        }
        
        closeEditModal();
        updateDisplay();
        saveState();
    }

    function checkAlternatingLinesFormat(text) {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) return false;
        
        const linesToCheck = Math.min(lines.length, 50);
        
        for (let i = 0; i < linesToCheck; i++) {
            const line = lines[i].trim();
            
            const punctuationInside = /[.!?…](?![.!?…]*$)/.test(line);
            if (punctuationInside) {
                return false;
            }
            
            const multipleSentences = (line.match(/[.!?…]/g) || []).length > 1;
            if (multipleSentences) {
                return false;
            }
        }
        
        if (lines.length % 2 !== 0) {
            return false;
        }
        
        return true;
    }

    function loadSampleData() {
        const savedState = loadState();
        if (savedState) {
            items = savedState.items;
            originalItems = savedState.originalItems;
            currentIndex = savedState.currentIndex || 0;
            isQAMode = savedState.isQAMode;
            baseFontSize = savedState.baseFontSize || 20; 
            originalSeparator = savedState.originalSeparator || '\t';
        } else {
            const sampleData = `O que é HTML?\tHTML é a linguagem de marcação padrão para criar páginas web.\nO que é CSS?\tCSS é a linguagem de estilos usada para descrever a apresentação de um documento HTML.`;
            baseFontSize = 20; 
            parseQAContent(sampleData);
        }
        updateFontSize(); 
    }

    function parseQAContent(text) {
        const lines = text.split('\n');
        items = [];
        originalItems = [];
        
        const hasTabs = text.includes('\t');
        const hasDoubleSemicolon = text.includes(';;');
        
        let separator = null;
        if (hasTabs) {
            separator = '\t';
        } else if (hasDoubleSemicolon) {
            separator = ';;';
        }
        
        originalSeparator = separator;
        
        if (!separator) {
            parseTextContent(text);
            return;
        }
        
        for (const line of lines) {
            if (line.trim() === '') continue;
            
            const parts = line.split(separator);
            
            if (parts.length >= 2) {
                const question = parts[0].trim();
                const answer = parts.slice(1).join(separator).trim();
                items.push({ question, answer });
            } else {
                if (hasMultipleSentences(line)) {
                    parseTextContent(text);
                    return;
                }
                items.push({ text: line.trim() });
            }
        }
        
        originalItems = [...items];
        currentIndex = 0;
        isQAMode = items.length > 0 && items[0].hasOwnProperty('question');
        saveState();
    }

    function hasMultipleSentences(line) {
        return /[.!?…](?![.!?…]*$)/.test(line.trim());
    }

    function parseAlternatingLinesContent(text) {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        items = [];
        originalItems = [];
        
        if (lines.length % 2 !== 0) {
            parseTextContent(text);
            return;
        }
        
        for (let i = 0; i < lines.length - 1; i += 2) {
            const question = lines[i].trim();
            const answer = lines[i + 1].trim();
            
            if (hasMultipleSentences(question) || hasMultipleSentences(answer)) {
                parseTextContent(text);
                return;
            }
            
            items.push({ question, answer });
        }
        
        originalItems = [...items];
        currentIndex = 0;
        isQAMode = true;
        saveState();
    }

    function parseTextContent(text) {
        let cleanedText = text.replace(/(\r\n|\n|\r)(?![.!?…])/g, ' ');
        cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
        
        const sentenceRegex = /[^.!?…]+[.!?…]+/g;
        let sentences = cleanedText.match(sentenceRegex) || [];
        sentences = sentences.map(s => s.trim()).filter(s => s.length > 0);
        
        const implicitSentenceRegex = /[^.!?…]+$/g;
        const implicitSentences = cleanedText.match(implicitSentenceRegex) || [];
        
        if (implicitSentences.length > 0) {
            const lastImplicit = implicitSentences[implicitSentences.length - 1].trim();
            if (lastImplicit) {
                if (sentences.length > 0) {
                    sentences[sentences.length - 1] += ' ' + lastImplicit;
                } else {
                    sentences.push(lastImplicit);
                }
            }
        }
        
        let processedItems = [];
        let currentChunk = '';
        
        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i];
            
            if (currentChunk.length + sentence.length < 75 && i < sentences.length - 1) {
                currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
                continue;
            }
            
            if (currentChunk || sentence.length >= 75) {
                processedItems.push({
                    text: currentChunk ? currentChunk + ' ' + sentence : sentence
                });
                currentChunk = '';
            } 
            else if (i === sentences.length - 1 && processedItems.length > 0) {
                processedItems[processedItems.length - 1].text += ' ' + sentence;
            }
            else {
                processedItems.push({ text: sentence });
            }
        }
        
        items = processedItems;
        originalItems = [...items];
        currentIndex = 0;
        isQAMode = false;
        saveState();
    }

    function updateDisplay() {
        if (items.length === 0) {
            questionEl.textContent = "Nenhum conteúdo carregado.";
            questionEl.style.fontSize = `${baseFontSize}px`;
            updateFontSize();
            answerEl.style.fontSize = `${baseFontSize - 2}px`;
            answerEl.textContent = "";
            currentCardInput.value = "0";
            totalCardsSpan.textContent = "/ 0";
            return;
        }
        
        const currentItem = items[currentIndex];
        
        if (isQAMode) {
            questionEl.innerHTML = currentItem.question;
            answerEl.innerHTML = currentItem.answer;
            
            if (searchTerm && currentItem.answer.toLowerCase().includes(searchTerm.toLowerCase())) {
                answerEl.classList.add('visible');
            } else {
                answerEl.classList.remove('visible');
            }
        } else {
            questionEl.innerHTML = currentItem.text;
            answerEl.textContent = "";
            answerEl.classList.remove('visible');
        }
        
        currentCardInput.value = currentIndex + 1;
        totalCardsSpan.textContent = `/ ${items.length}`;
        
        adjustInputWidth();
        
        cardContent.scrollTop = 0;
        
        if (searchTerm) {
            highlightText();
        }
        
        updateSearchButtons();
    }

    function adjustInputWidth() {
        const tempSpan = document.createElement('span');
        tempSpan.style.visibility = 'hidden';
        tempSpan.style.whiteSpace = 'nowrap';
        tempSpan.style.fontSize = window.getComputedStyle(currentCardInput).fontSize;
        tempSpan.style.fontFamily = window.getComputedStyle(currentCardInput).fontFamily;
        tempSpan.textContent = currentCardInput.value;
        document.body.appendChild(tempSpan);
        
        const width = tempSpan.offsetWidth + 10;
        currentCardInput.style.width = `${Math.max(width, 30)}px`;
        
        document.body.removeChild(tempSpan);
    }

    function jumpToCard() {
        const num = parseInt(currentCardInput.value);
        if (num >= 1 && num <= items.length) {
            currentIndex = num - 1;
            updateDisplay();
            saveState();
        } else {
            currentCardInput.value = currentIndex + 1;
            adjustInputWidth();
        }
    }

    function nextItem() {
        if (items.length === 0) return;
        currentIndex = (currentIndex + 1) % items.length;
        updateDisplay();
        saveState();
    }

    function prevItem() {
        if (items.length === 0) return;
        currentIndex = (currentIndex - 1 + items.length) % items.length;
        updateDisplay();
        saveState();
    }

    function shuffleItems() {
        if (items.length === 0) return;
        
        for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
        }
        
        currentIndex = 0;
        updateDisplay();
        toggleMenu();
        saveState();
    }

    function resetOrder() {
        if (originalItems.length === 0) return;
        items = [...originalItems];
        currentIndex = 0;
        updateDisplay();
        toggleMenu();
        saveState();
    }

    function increaseFontSize() {
        baseFontSize = Math.min(baseFontSize + 2, 32);
        updateFontSize();
        saveState();
    }

    function decreaseFontSize() {
        baseFontSize = Math.max(baseFontSize - 2, 12);
        updateFontSize();
        saveState();
    }

    function updateFontSize() {
        questionEl.style.fontSize = `${baseFontSize}px`;
        answerEl.style.fontSize = `${Math.max(baseFontSize - 2, 12)}px`;
        currentFontSizeEl.textContent = baseFontSize;
        adjustInputWidth();
    }

    function handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            isFileActuallyPDF(file).then(isPDF => {
                if (isPDF) {
                    processPDFFile(file);
                } else {
                    processTextFile(file);
                }
            });
        } else {
            processTextFile(file);
        }
        
        e.target.value = '';
    }

    function processFileContent(content, filename) {
        try {
            const hasTabs = content.includes('\t');
            const hasDoubleSemicolon = content.includes(';;');
            const isAlternatingLines = checkAlternatingLinesFormat(content);
            
            if (hasTabs || hasDoubleSemicolon) {
                parseQAContent(content);
            } else if (isAlternatingLines) {
                parseAlternatingLinesContent(content);
            } else {
                parseTextContent(content);
            }
            
            updateDisplay();
        } catch (error) {
            alert('Erro ao ler o arquivo: ' + error.message);
            console.error(error);
        }
    }

    function processTextFile(file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const utf8decoder = new TextDecoder('utf-8');
                const data = new Uint8Array(e.target.result);
                let contentString = utf8decoder.decode(data);
                
                if (contentString.includes('�')) {
                    try {
                        const latin1decoder = new TextDecoder('ISO-8859-1');
                        contentString = latin1decoder.decode(data);
                    } catch (e) {
                        console.warn("Não foi possível decodificar como ISO-8859-1", e);
                    }
                }
                
                const hasTabs = contentString.includes('\t');
                const hasDoubleSemicolon = contentString.includes(';;');
                const isAlternatingLines = checkAlternatingLinesFormat(contentString);
                
                if (hasTabs || hasDoubleSemicolon) {
                    parseQAContent(contentString);
                } else if (isAlternatingLines) {
                    parseAlternatingLinesContent(contentString);
                } else {
                    parseTextContent(contentString);
                }
                
                updateDisplay();
            } catch (error) {
                alert('Erro ao ler o arquivo: ' + error.message);
                console.error(error);
            }
        };
        
        reader.readAsArrayBuffer(file);
    }

    async function isFileActuallyPDF(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const arr = new Uint8Array(e.target.result.slice(0, 4));
                const header = Array.from(arr).map(b => b.toString(16)).join('');
                resolve(header === '25504446');
            };
            reader.readAsArrayBuffer(file.slice(0, 4));
        });
    }
    
    async function processPDFFile(file) {
        processingMessage.textContent = "Processando PDF...";
        processingMessage.style.display = 'block';
    
        try {
            const isPDF = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const arr = new Uint8Array(e.target.result.slice(0, 4));
                    const header = Array.from(arr).map(b => b.toString(16)).join('');
                    resolve(header === '25504446');
                };
                reader.readAsArrayBuffer(file.slice(0, 4));
            });
    
            if (!isPDF) {
                throw new Error("O arquivo não é um PDF válido");
            }
    
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({
                data: arrayBuffer,
                cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                cMapPacked: true
            }).promise;
    
            let fullText = '';
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                
                const pageText = textContent.items
                    .map(item => {
                        const yPos = item.transform ? item.transform[5] : 0;
                        return {
                            text: item.str,
                            yPos: yPos
                        };
                    })
                    .sort((a, b) => b.yPos - a.yPos)
                    .reduce((acc, curr, index, array) => {
                        if (index === 0 || Math.abs(curr.yPos - array[index-1].yPos) > 5) {
                            acc.push([curr]);
                        } else {
                            acc[acc.length-1].push(curr);
                        }
                        return acc;
                    }, [])
                    .map(line => line.map(item => item.text).join(' '))
                    .join('\n');
    
                fullText += pageText + '\n\n';
            }
    
            const lines = fullText.split('\n').filter(line => line.trim() !== '');
            
            let isAlternatingLines = true;
            for (let i = 0; i < Math.min(lines.length, 50); i++) { 
                const line = lines[i].trim();
                if (hasMultipleSentences(line)) {
                    isAlternatingLines = false;
                    break;
                }
            }
    
            if (isAlternatingLines && lines.length > 1 && lines.length % 2 === 0) {
                parseAlternatingLinesContent(fullText);
            } else {
                const hasTabs = fullText.includes('\t');
                const hasDoubleSemicolon = fullText.includes(';;');
                
                if (hasTabs || hasDoubleSemicolon) {
                    parseQAContent(fullText);
                } else {
                    parseTextContent(fullText);
                }
            }
    
            updateDisplay();
        } catch (error) {
            console.error("Erro no processamento:", error);
            
            if (error.message.includes("Invalid PDF") || error.message.includes("cabeçalho")) {
                processingMessage.textContent = "Tentando como arquivo de texto...";
                await new Promise(resolve => setTimeout(resolve, 1500));
                processTextFile(file);
            } else {
                alert(`Erro: ${error.message}\nConsulte o console para detalhes.`);
            }
        } finally {
            processingMessage.style.display = 'none';
        }
    }
    
    function exportFile() {
        if (items.length === 0) return;
        
        let content;
        if (isQAMode) {
            content = items.map(item => `${item.question}${originalSeparator}${item.answer}`).join('\n');
        } else {
            content = items.map(item => item.text).join('\n');
        }
        
        if (window.Android && typeof window.Android.saveFile === 'function') {
            const filename = isQAMode ? 'perguntas_respostas.txt' : 'conteudo.txt';
            window.Android.saveFile(filename, content);
        } else {
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = isQAMode ? 'perguntas_respostas.txt' : 'conteudo.txt';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }
    }

    function fallbackExport(content) {
        if (window.Android && typeof window.Android.saveFile === 'function') {
            const filename = isQAMode ? 'perguntas_respostas.txt' : 'conteudo.txt';
            window.Android.saveFile(filename, content);
        } else {
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = isQAMode ? 'perguntas_respostas.txt' : 'conteudo.txt';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }
    }
    
    function triggerDownload(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
    
    function fallbackExport(url, filename) {
        fileExport.href = url;
        fileExport.download = filename;
        fileExport.click();
        URL.revokeObjectURL(url);
        closeExportModal();
    }
    
    function saveState() {
        const state = {
            items,
            originalItems,
            currentIndex,
            isQAMode,
            baseFontSize,
            originalSeparator
        };
        localStorage.setItem('appState', JSON.stringify(state));
    }
    
    function loadState() {
        const savedState = localStorage.getItem('appState');
        return savedState ? JSON.parse(savedState) : null;
    }
    
    function performSearch() {
        searchTerm = searchInput.value.trim();
        if (!searchTerm) {
            clearSearch();
            return;
        }
        
        searchResults = [];
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            let textToSearch = '';
            
            if (isQAMode) {
                textToSearch = item.question + ' ' + item.answer;
            } else {
                textToSearch = item.text;
            }
            
            if (textToSearch.toLowerCase().includes(searchTerm.toLowerCase())) {
                searchResults.push(i);
            }
        }
        
        if (searchResults.length === 0) {
            searchInfo.textContent = 'Nenhum resultado encontrado para: ' + searchTerm;
            searchPrevBtn.disabled = true;
            searchNextBtn.disabled = true;
            return;
        }
        
        currentSearchIndex = 0;
        currentIndex = searchResults[currentSearchIndex];
        updateDisplay();
        updateSearchInfo();
    }
    
    function goToPrevSearchResult() {
        if (searchResults.length === 0) return;
        
        currentSearchIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
        currentIndex = searchResults[currentSearchIndex];
        updateDisplay();
        updateSearchInfo();
    }
    
    function goToNextSearchResult() {
        if (searchResults.length === 0) return;
        
        currentSearchIndex = (currentSearchIndex + 1) % searchResults.length;
        currentIndex = searchResults[currentSearchIndex];
        updateDisplay();
        updateSearchInfo();
    }
    
    function updateSearchInfo() {
        if (searchResults.length === 0) {
            searchInfo.textContent = '';
        } else {
            searchInfo.textContent = `Resultado ${currentSearchIndex + 1} de ${searchResults.length}`;
        }
    }
    
    function updateSearchButtons() {
        searchPrevBtn.disabled = searchResults.length === 0 || currentSearchIndex <= 0;
        searchNextBtn.disabled = searchResults.length === 0 || currentSearchIndex >= searchResults.length - 1;
    }
    
    function highlightText() {
        if (!searchTerm) return;
        
        const highlight = (element, isCurrent) => {
            const text = element.textContent;
            const regex = new RegExp(searchTerm, 'gi');
            
            let newText = text.replace(regex, match => {
                return `<span class="highlight">${match}</span>`;
            });
            
            if (isCurrent) {
                newText = newText.replace(
                    new RegExp(searchTerm, 'i'), 
                    match => `<span class="current-highlight">${match}</span>`
                );
            }
            
            element.innerHTML = newText;
        };
        
        if (isQAMode) {
            highlight(questionEl, true);
            highlight(answerEl, true);
        } else {
            highlight(questionEl, true);
        }
    }
    
    function clearSearch() {
        searchTerm = '';
        searchResults = [];
        currentSearchIndex = -1;
        searchInfo.textContent = '';
        searchPrevBtn.disabled = true;
        searchNextBtn.disabled = true;
        isFirstSearchClick = true;
        updateDisplay();
    }
});