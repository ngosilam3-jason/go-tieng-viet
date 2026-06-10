(function () {
    "use strict";

    const HISTORY_STORAGE_KEY = "typing_history";
    const paragraphs = Array.isArray(window.PARAGRAPHS) ? window.PARAGRAPHS : [];

    const state = {
        currentTitle: "",
        currentText: "",
        startTime: null,
        isTyping: false,
        isFinished: false,
        totalTypedChars: 0
    };

    const elements = {
        workTitle: document.getElementById("workTitle"),
        textDisplay: document.getElementById("textDisplay"),
        typingInput: document.getElementById("typingInput"),
        resultContainer: document.getElementById("resultContainer"),
        accuracyCard: document.getElementById("accuracyCard"),
        wpmCard: document.getElementById("wpmCard"),
        btnNewParagraph: document.getElementById("btnNewParagraph"),
        historyBody: document.getElementById("historyBody")
    };

    function getRandomParagraph() {
        if (paragraphs.length === 0) {
            return {
                title: "",
                text: "Chưa có đoạn văn nào trong file paragraphs.js."
            };
        }

        const randomIndex = Math.floor(Math.random() * paragraphs.length);
        return normalizeParagraph(paragraphs[randomIndex]);
    }

    function normalizeParagraph(paragraph) {
        if (typeof paragraph === "string") {
            return {
                title: "",
                text: paragraph
            };
        }

        return {
            title: paragraph.title || "",
            text: paragraph.text || ""
        };
    }

    function initTest() {
        const paragraph = getRandomParagraph();

        state.currentTitle = paragraph.title;
        state.currentText = paragraph.text;
        state.startTime = null;
        state.isTyping = false;
        state.isFinished = false;
        state.totalTypedChars = 0;

        elements.typingInput.value = "";
        elements.typingInput.disabled = paragraphs.length === 0;
        elements.typingInput.style.display = "block";
        elements.resultContainer.style.display = "none";

        renderWorkTitle();
        renderTextDisplay();
        renderHistory();
        elements.typingInput.focus();
    }

    function renderWorkTitle() {
        elements.workTitle.textContent = state.currentTitle;
    }

    function renderTextDisplay() {
        const fragment = document.createDocumentFragment();
        const content = document.createElement("span");

        elements.textDisplay.textContent = "";
        content.className = "text-display-content";

        Array.from(state.currentText).forEach((char, index) => {
            const span = document.createElement("span");
            span.className = "char-element";
            span.textContent = char;

            if (index === 0) {
                span.classList.add("char-current");
            }

            content.appendChild(span);
        });

        fragment.appendChild(content);
        elements.textDisplay.appendChild(fragment);
    }

    function handleTypingInput() {
        if (state.isFinished) {
            return;
        }

        const inputValue = elements.typingInput.value;

        if (!state.isTyping && inputValue.length > 0) {
            state.startTime = Date.now();
            state.isTyping = true;
        }

        state.totalTypedChars = inputValue.length;

        updateCharacterStatus(inputValue);

        if (inputValue.length >= state.currentText.length) {
            endTest();
        }
    }

    function updateCharacterStatus(inputValue) {
        const charElements = elements.textDisplay.querySelectorAll(".char-element");

        charElements.forEach((span, index) => {
            const expectedChar = state.currentText[index];
            const typedChar = inputValue[index];

            span.className = "char-element";

            if (typedChar == null) {
                if (index === inputValue.length) {
                    span.classList.add("char-current");
                }
                return;
            }

            if (typedChar === expectedChar) {
                span.classList.add("char-correct");
            } else {
                span.classList.add("char-incorrect");
            }
        });
    }

    function handleTypingKeydown(event) {
        if (event.key !== "Enter" || state.isFinished) {
            return;
        }

        endTest();
    }

    function endTest() {
        state.isTyping = false;
        state.isFinished = true;
        elements.typingInput.disabled = true;

        const durationInMinutes = getDurationInMinutes();
        const accuracy = calculateAccuracy(elements.typingInput.value);
        const wpm = calculateWpm(durationInMinutes);

        elements.typingInput.style.display = "none";
        elements.resultContainer.style.display = "flex";
        elements.accuracyCard.textContent = `Chính xác: ${accuracy}%`;
        elements.wpmCard.textContent = `WPM: ${wpm}`;

        saveToHistory(accuracy, wpm);
    }

    function getDurationInMinutes() {
        if (state.startTime == null) {
            return 0;
        }

        return (Date.now() - state.startTime) / 1000 / 60;
    }

    function calculateAccuracy(inputValue) {
        const expectedWords = getWords(state.currentText);
        const typedWords = getWords(inputValue);

        if (typedWords.length === 0) {
            return 0;
        }

        const correctWords = typedWords.filter((word, index) => word === expectedWords[index]).length;

        return Math.round((correctWords / typedWords.length) * 100);
    }

    function getWords(text) {
        return text.trim().split(" ").filter(Boolean);
    }

    function calculateWpm(durationInMinutes) {
        if (durationInMinutes <= 0) {
            return 0;
        }

        return Math.round(getWords(elements.typingInput.value).length / durationInMinutes);
    }

    function saveToHistory(accuracy, wpm) {
        const history = getHistory();
        const record = {
            date: formatDateTime(new Date()),
            title: state.currentTitle,
            paragraph: state.currentText,
            accuracy,
            wpm
        };

        history.unshift(record);
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
        renderHistory();
    }

    function getHistory() {
        try {
            return JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }

    function formatDateTime(date) {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");

        return `${day}/${month}/${year} - ${hours}:${minutes}:${seconds}`;
    }

    function renderHistory() {
        const fragment = document.createDocumentFragment();

        elements.historyBody.textContent = "";

        getHistory().filter(isCurrentParagraphRecord).forEach((item) => {
            const row = document.createElement("tr");
            row.appendChild(createHistoryCell(item.date, "history-date-col"));
            row.appendChild(createHistoryCell(`${item.accuracy}%`, "history-score-col"));
            row.appendChild(createHistoryCell(item.wpm, "history-score-col history-wpm"));
            fragment.appendChild(row);
        });

        elements.historyBody.appendChild(fragment);
    }

    function isCurrentParagraphRecord(item) {
        return item.paragraph === state.currentText;
    }

    function createHistoryCell(value, className) {
        const cell = document.createElement("td");
        cell.className = className;
        cell.textContent = value;
        return cell;
    }

    elements.typingInput.addEventListener("input", handleTypingInput);
    elements.typingInput.addEventListener("keydown", handleTypingKeydown);
    elements.btnNewParagraph.addEventListener("click", initTest);

    initTest();
    renderHistory();
}());
