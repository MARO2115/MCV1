(function (global) {
    const Game = global.Game;
    if (!Game) return;

    const {
        input // Używamy tylko input
    } = Game;

    // -----------------------------------------------------------------
    // LOGIKA MODUŁU AZERTY (PEŁNA)
    // -----------------------------------------------------------------

    function updateInputState(key, isPressed) {
        const k = key.toLowerCase();

        // RUCH: Z (fizyczne) -> W (logiczne - przód)
        if (k === 'z') {
            if (typeof input.w !== 'undefined') input.w = isPressed;
            if (input.keys && typeof input.keys.w !== 'undefined') input.keys.w = isPressed;
        }

        // RUCH: Q (fizyczne) -> A (logiczne - lewo)
        if (k === 'q') {
            if (typeof input.a !== 'undefined') input.a = isPressed;
            if (input.keys && typeof input.keys.a !== 'undefined') input.keys.a = isPressed;
        }

        // INTERAKCJA/DROP: A (fizyczne) -> Q (logiczne - np. wyrzucanie)
        // To zabezpieczenie na przyszłość, gdybyś dodał coś pod 'Q'
        if (k === 'a') {
            if (typeof input.q !== 'undefined') input.q = isPressed;
            if (input.keys && typeof input.keys.q !== 'undefined') input.keys.q = isPressed;
        }
    }

    window.addEventListener('keydown', (e) => {
        updateInputState(e.key, true);
    });

    window.addEventListener('keyup', (e) => {
        updateInputState(e.key, false);
    });

    console.log("[MOD] Załadowano moduł AZERTY (Full Mapped)");
})(typeof window !== "undefined" ? window : this);