(function (global) {
    const Game = global.Game;
    if (!Game) return;

    const {
        BLOCK,
        BLOCK_INFO,
        world,
        inventory,      // Tablica hotbara (zazwyczaj [0,0,0...])
        CREATIVE_ITEMS,
        gl,
        atlas,
        atlasTexture
    } = Game;

    // -------------------------------------------------------------------------
    // 1. KONFIGURACJA ID
    // -------------------------------------------------------------------------
    
    // ID bloków ze świata (muszą się zgadzać z mountain_and_caves.js)
    const BLOCK_COAL_ORE = 73;
    const BLOCK_IRON_ORE = 74;
    const BLOCK_DIAMOND_ORE = 75;

    // Szukamy wolnych ID dla PRZEDMIOTÓW
    function findFreeID(start) {
        let id = start;
        while (BLOCK_INFO[id]) id++;
        return id;
    }

    const ITEM_COAL_ID = findFreeID(35);     // Węgiel
    const ITEM_DIAMOND_ID = findFreeID(36);  // Diament
    const ITEM_RAW_IRON_ID = findFreeID(37); // Surowe żelazo

    // Rejestracja w BLOCK_INFO (jako przedmioty, nie-solidne)
    const itemProps = { solid: false, opacity: 0, transparent: true };
    BLOCK_INFO[ITEM_COAL_ID] = { ...itemProps, name: "Węgiel" };
    BLOCK_INFO[ITEM_DIAMOND_ID] = { ...itemProps, name: "Diament" };
    BLOCK_INFO[ITEM_RAW_IRON_ID] = { ...itemProps, name: "Surowe Żelazo" };

    // -------------------------------------------------------------------------
    // 2. TEKSTURY PRZEDMIOTÓW
    // -------------------------------------------------------------------------

    function injectTexture(name, blockID, drawCallback) {
        if (!gl || !atlas || !atlasTexture) return;
        const ctx = atlas.canvas.getContext('2d');
        const tileSize = atlas.tile;
        const cols = atlas.cols;

        // Szukanie miejsca
        let u, v;
        if (atlas.blockTex[blockID] && atlas.map[atlas.blockTex[blockID].all]) {
            const pos = atlas.map[atlas.blockTex[blockID].all];
            u = pos.u; v = pos.v;
        } else {
            const idx = Object.keys(atlas.map).length;
            u = idx % cols;
            v = (idx / cols) | 0;
            atlas.map[name] = { u, v };
            atlas.blockTex[blockID] = { all: name };
        }

        // Rysowanie
        const x = u * tileSize;
        const y = v * tileSize;
        
        // Wyczyszczenie tła (dla przezroczystości itemów)
        ctx.clearRect(x, y, tileSize, tileSize);
        
        drawCallback(ctx, x, y, tileSize);

        gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
        gl.generateMipmap(gl.TEXTURE_2D);
    }

    // Węgiel (Ciemna bryłka)
    injectTexture('item_coal', ITEM_COAL_ID, (ctx, x, y, size) => {
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(x + size*0.5, y + size*0.5, size*0.35, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#444';
        ctx.fillRect(x + size*0.4, y + size*0.4, size*0.15, size*0.15);
    });

    // Diament (Błękitny kształt)
    injectTexture('item_diamond', ITEM_DIAMOND_ID, (ctx, x, y, size) => {
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.moveTo(x + size*0.5, y + size*0.2);
        ctx.lineTo(x + size*0.8, y + size*0.5);
        ctx.lineTo(x + size*0.5, y + size*0.9);
        ctx.lineTo(x + size*0.2, y + size*0.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.fillRect(x + size*0.45, y + size*0.35, size*0.1, size*0.1);
    });

    // Surowe Żelazo (Beżowo-rdzawa bryłka)
    injectTexture('item_raw_iron', ITEM_RAW_IRON_ID, (ctx, x, y, size) => {
        ctx.fillStyle = '#d6c2a1'; // Beż
        ctx.beginPath();
        ctx.arc(x + size*0.5, y + size*0.5, size*0.35, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#8c6b4a'; // Rdza
        ctx.fillRect(x + size*0.3, y + size*0.3, size*0.4, size*0.2);
        ctx.fillRect(x + size*0.4, y + size*0.5, size*0.2, size*0.3);
    });

    // -------------------------------------------------------------------------
    // 3. DODANIE DO CREATIVE ITEMS (NAPRAWA)
    // -------------------------------------------------------------------------
    if (CREATIVE_ITEMS && Array.isArray(CREATIVE_ITEMS)) {
        const itemsToAdd = [ITEM_COAL_ID, ITEM_DIAMOND_ID, ITEM_RAW_IRON_ID];
        itemsToAdd.forEach(id => {
            if (!CREATIVE_ITEMS.includes(id)) {
                CREATIVE_ITEMS.push(id);
            }
        });
        console.log("[MOD] Dodano Węgiel, Diament i Surowe Żelazo do menu kreatywnego.");
    }

    // -------------------------------------------------------------------------
    // 4. LOGIKA DROPU (Ekwipunek)
    // -------------------------------------------------------------------------
    
    function giveToPlayer(itemId) {
        // 1. Sprawdzamy czy Game.inventory istnieje i jest tablicą
        if (!inventory || !Array.isArray(inventory)) {
            // Fallback: spróbujmy Game.inventory jeśli lokalna zmienna nie działa
            if (Game.inventory && Array.isArray(Game.inventory)) {
                return addToSimpleArray(Game.inventory, itemId);
            }
            console.error("[MOD] Nie znaleziono ekwipunku gracza.");
            return;
        }
        addToSimpleArray(inventory, itemId);
    }

    function addToSimpleArray(arr, id) {
        // Prosty hotbar: szukamy pierwszego zera (puste)
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] === 0) {
                arr[i] = id;
                console.log(`[DROP] Podniesiono przedmiot ID: ${id} do slotu ${i+1}`);
                
                // Wymuszamy odświeżenie UI jeśli jest taka funkcja
                if (Game.updateInventoryUI) Game.updateInventoryUI();
                return;
            }
        }
        console.log("[DROP] Ekwipunek pełny!");
    }

    // -------------------------------------------------------------------------
    // 5. HOOK NA NISZCZENIE BLOKÓW
    // -------------------------------------------------------------------------

    if (world && typeof world.setBlock === 'function') {
        // Zapisujemy oryginał
        const originalSetBlock = world.setBlock.bind(world);

        // Nadpisujemy
        world.setBlock = function(x, y, z, id, ...args) {
            // Jeśli stawiamy powietrze (0) -> znaczy że niszczymy blok
            if (id === BLOCK.AIR) {
                // Pobieramy co tu było wcześniej
                const prevID = this.getBlock(x, y, z);

                // Logika dropu
                if (prevID === BLOCK_COAL_ORE) {
                    giveToPlayer(ITEM_COAL_ID);
                } else if (prevID === BLOCK_DIAMOND_ORE) {
                    giveToPlayer(ITEM_DIAMOND_ID);
                } else if (prevID === BLOCK_IRON_ORE) {
                    giveToPlayer(ITEM_RAW_IRON_ID); // Teraz daje Surowe Żelazo
                }
            }

            // Wywołujemy oryginalną funkcję, żeby blok zniknął ze świata
            originalSetBlock(x, y, z, id, ...args);
        };
        
        console.log("[MOD] System wydobycia aktywny.");
    } else {
        console.error("[MOD] Błąd: world.setBlock niedostępny.");
    }

    console.log("[MOD] Załadowano moduł mining_logic (Fix v2)");

})(typeof window !== "undefined" ? window : this);