(() => {
    "use strict";

    function renderCurrentLine(element, cues, index) {
        const text = String(cues[index]?.text || "");
        if (element.textContent !== text) element.textContent = text;
        element.setAttribute("aria-label", text);
    }

    window.KaraokurLyricDisplay = { renderCurrentLine };
})();
