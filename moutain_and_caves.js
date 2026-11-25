(function (global) {
    const Game = global.Game;
    if (!Game) return;

    const {
        BLOCK,
        BLOCK_INFO,
        world,
        CREATIVE_ITEMS,
        gl,
        atlas,
        atlasTexture
    } = Game;

    // -------------------------------------------------------------------------
    // 1. FUNKCJA WSTRZYKIWANIA TEKSTUR
    // -------------------------------------------------------------------------
    function injectTexture(name, blockID, drawCallback) {
        if (!gl || !atlas || !atlasTexture) return;
        const ctx = atlas.canvas.getContext('2d');
        const tileSize = atlas.tile;
        const cols = atlas.cols;

        // Sprawdzamy czy tekstura już istnieje (żeby nadpisać kamień), czy tworzymy nową
        let u, v;
        if (atlas.blockTex[blockID] && atlas.map[atlas.blockTex[blockID].all]) {
            // Nadpisujemy istniejącą pozycję (np. dla STONE)
            const existingName = atlas.blockTex[blockID].all;
            const pos = atlas.map[existingName];
            u = pos.u;
            v = pos.v;
        } else {
            // Nowe miejsce
            const idx = Object.keys(atlas.map).length;
            u = idx % cols;
            v = (idx / cols) | 0;
            // Rejestracja
            atlas.map[name] = { u, v };
            atlas.blockTex[blockID] = { all: name };
        }

        const x = u * tileSize;
        const y = v * tileSize;

        drawCallback(ctx, x, y, tileSize);

        // Aktualizacja GPU
        gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
        gl.generateMipmap(gl.TEXTURE_2D);
    }

    // ID Bloków
    const DRIPSTONE_ID = 72;
    const ORE_COAL_ID = 73;
    const ORE_IRON_ID = 74;
    const ORE_DIAMOND_ID = 75;
    const LAVA_ID = 12;

    // -------------------------------------------------------------------------
    // 2. NADPISANIE KAMIENIA I NOWE TEKSTURY
    // -------------------------------------------------------------------------

    // --- ZMIANA TEKSTURY KAMIENIA (CIEMNOSZARA) ---
    // Baza: #6e6e6e (jak tło rud), Szum: #595959
    injectTexture('stone_dark', BLOCK.STONE, (ctx, x, y, size) => {
        // Tło
        ctx.fillStyle = '#6e6e6e'; 
        ctx.fillRect(x, y, size, size);
        
        // Generowanie szumu (podobne do noiseFill)
        for (let i = 0; i < 8; i++) {
            // Losowe plamy
            ctx.fillStyle = Math.random() > 0.5 ? '#595959' : '#7d7d7d';
            const rx = Math.floor(Math.random() * size);
            const ry = Math.floor(Math.random() * size);
            const w = Math.floor(Math.random() * (size/3)) + 2;
            const h = Math.floor(Math.random() * (size/3)) + 2;
            ctx.fillRect(x + rx, y + ry, w, h);
        }
    });

    // --- Dripstone ---
    injectTexture('dripstone', DRIPSTONE_ID, (ctx, x, y, size) => {
        ctx.fillStyle = '#111111';
        ctx.fillRect(x, y, size, size);
        for (let i = 0; i < size; i += 4) {
            for (let j = 0; j < size; j += 4) {
                if (Math.random() > 0.6) {
                    const shade = Math.floor(Math.random() * 30) + 10; 
                    ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
                    ctx.fillRect(x + i, y + j, 4, 4);
                }
            }
        }
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + size*0.3, y, size*0.1, size);
    });

    // --- Węgiel ---
    injectTexture('ore_coal', ORE_COAL_ID, (ctx, x, y, size) => {
        ctx.fillStyle = '#6e6e6e'; // Tło pasujące do kamienia
        ctx.fillRect(x, y, size, size);
        // Szum tła
        for(let i=0; i<5; i++) {
            ctx.fillStyle = Math.random()>0.5 ? '#7a7a7a' : '#636363';
            ctx.fillRect(x + Math.random()*size, y + Math.random()*size, size/4, size/4);
        }
        // Węgiel
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x + size*0.2, y + size*0.2, size*0.25, size*0.25);
        ctx.fillRect(x + size*0.6, y + size*0.1, size*0.2, size*0.2);
        ctx.fillRect(x + size*0.3, y + size*0.6, size*0.2, size*0.3);
    });

    // --- Żelazo ---
    injectTexture('ore_iron', ORE_IRON_ID, (ctx, x, y, size) => {
        ctx.fillStyle = '#6e6e6e';
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = '#d6c2a1'; 
        ctx.fillRect(x + size*0.1, y + size*0.5, size*0.2, size*0.3);
        ctx.fillRect(x + size*0.5, y + size*0.2, size*0.3, size*0.2);
        ctx.fillRect(x + size*0.6, y + size*0.6, size*0.25, size*0.25);
    });

    // --- Diament ---
    injectTexture('ore_diamond', ORE_DIAMOND_ID, (ctx, x, y, size) => {
        ctx.fillStyle = '#6e6e6e';
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = '#00ffff'; 
        ctx.fillRect(x + size*0.3, y + size*0.3, size*0.2, size*0.2);
        ctx.fillRect(x + size*0.6, y + size*0.5, size*0.15, size*0.15);
        ctx.fillStyle = '#00bfff'; 
        ctx.fillRect(x + size*0.2, y + size*0.7, size*0.15, size*0.15);
    });

    if (CREATIVE_ITEMS && Array.isArray(CREATIVE_ITEMS)) {
        [DRIPSTONE_ID, ORE_COAL_ID, ORE_IRON_ID, ORE_DIAMOND_ID].forEach(id => {
            if (!CREATIVE_ITEMS.includes(id)) CREATIVE_ITEMS.push(id);
        });
    }

    // -------------------------------------------------------------------------
    // 3. REJESTRACJA FIZYKI (KOLIZJE)
    // -------------------------------------------------------------------------
    if (BLOCK_INFO) {
        const newBlocks = [DRIPSTONE_ID, ORE_COAL_ID, ORE_IRON_ID, ORE_DIAMOND_ID];
        newBlocks.forEach(id => {
            BLOCK_INFO[id] = { solid: true, opacity: 15, transparent: false };
        });
    }

    // -------------------------------------------------------------------------
    // 4. PERLIN NOISE
    // -------------------------------------------------------------------------
    const PERLIN_SIZE = 256; const PERLIN_MASK = 255;
    const p = new Uint8Array(PERLIN_SIZE * 2);
    const permutation = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
    for (let i=0; i < PERLIN_SIZE; i++) p[PERLIN_SIZE + i] = p[i] = permutation[i];
    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(t, a, b) { return a + t * (b - a); }
    function grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    function noise2d(x, y) {
        const X = Math.floor(x) & PERLIN_MASK, Y = Math.floor(y) & PERLIN_MASK;
        x -= Math.floor(x); y -= Math.floor(y);
        const u = fade(x), v = fade(y);
        const A = p[X]+Y, B = p[X+1]+Y;
        return lerp(v, lerp(u, grad(p[A], x, y, 0), grad(p[B], x-1, y, 0)), lerp(u, grad(p[A+1], x, y-1, 0), grad(p[B+1], x-1, y-1, 0)));
    }
    function noise3d(x, y, z) {
        const X = Math.floor(x) & PERLIN_MASK, Y = Math.floor(y) & PERLIN_MASK, Z = Math.floor(z) & PERLIN_MASK;
        x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
        const u = fade(x), v = fade(y), w = fade(z);
        const A = p[X]+Y, AA = p[A]+Z, AB = p[A+1]+Z;
        const B = p[X+1]+Y, BA = p[B]+Z, BB = p[B+1]+Z;
        return lerp(w, lerp(v, lerp(u, grad(p[AA],x,y,z), grad(p[BA],x-1,y,z)), lerp(u, grad(p[AB],x,y-1,z), grad(p[BB],x-1,y-1,z))),
                       lerp(v, lerp(u, grad(p[AA+1],x,y,z-1), grad(p[BA+1],x-1,y,z-1)), lerp(u, grad(p[AB+1],x,y-1,z-1), grad(p[BB+1],x-1,y-1,z-1))));
    }

    // -------------------------------------------------------------------------
    // 5. GENERATOR CHUNKÓW
    // -------------------------------------------------------------------------
    
    function findChunkClass() {
        if (typeof Chunk !== "undefined") return Chunk;
        if (global.Chunk) return global.Chunk;
        if (Game.Chunk) return Game.Chunk;
        if (world) {
            for (let key in world) {
                const val = world[key];
                if (val && (val instanceof Map || typeof val === 'object')) {
                    let sample = null;
                    if (val instanceof Map && val.size > 0) sample = val.values().next().value;
                    else if (Object.keys(val).length > 0) sample = val[Object.keys(val)[0]];
                    if (sample && sample.blocks && typeof sample.generate === 'function') return sample.constructor;
                }
            }
        }
        return null;
    }

    const ChunkClass = findChunkClass();

    if (ChunkClass) {
        console.log("[MOD] M&C: Ciemny kamień, Rudy, Jaskinie, Lawa.");

        const CHUNK_X = 16;
        const CHUNK_Y = 256;
        const CHUNK_Z = 16;
        const SEA_LEVEL = 48;
        
        ChunkClass.prototype.generate = function() {
            if (this.generated) return;
            
            const x0 = this.x0;
            const z0 = this.z0;

            for (let lx = 0; lx < CHUNK_X; lx++) {
                for (let lz = 0; lz < CHUNK_Z; lz++) {
                    const gx = x0 + lx;
                    const gz = z0 + lz;

                    let nBase = noise2d(gx * 0.004, gz * 0.004); 
                    let nMount = noise2d(gx * 0.015, gz * 0.015);
                    let nDetail = noise2d(gx * 0.05, gz * 0.05);

                    let height = 45 + (nBase * 40) + (nMount * 30) + (nDetail * 5);
                    height = Math.floor(height);
                    if (height < 5) height = 5;
                    if (height > CHUNK_Y - 2) height = CHUNK_Y - 2;

                    for (let y = 0; y < CHUNK_Y; y++) {
                        let id = BLOCK.AIR;
                        if (y <= height) {
                            if (y === height) id = BLOCK.GRASS;
                            else if (y >= height - 3) id = BLOCK.DIRT;
                            else id = BLOCK.STONE;
                        } else if (y <= SEA_LEVEL) {
                            id = BLOCK.WATER;
                        }

                        if (y > 2 && id !== BLOCK.AIR && id !== BLOCK.WATER) {
                            let caveNoise = noise3d(gx * 0.03, y * 0.045, gz * 0.03);
                            caveNoise += noise3d(gx * 0.1, y * 0.1, gz * 0.1) * 0.1;
                            if (caveNoise > 0.35) {
                                if (y <= 5) id = LAVA_ID;
                                else id = BLOCK.AIR;
                            }
                        }
                        if (y === 0) id = BLOCK.STONE; 
                        if (y < 35 && id === BLOCK.STONE && Math.random() > 0.8) id = DRIPSTONE_ID;

                        this.set(lx, y, lz, id);
                    }
                }
            }

            // GENEROWANIE RUD
            const ORES = [
                { id: ORE_COAL_ID, count: 20, size: 10, min: 40, max: 50 },
                { id: ORE_IRON_ID, count: 10, size: 5,  min: 20, max: 50 },
                { id: ORE_DIAMOND_ID, count: 2, size: 3,  min: 3, max: 16 }
            ];
            const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

            ORES.forEach(ore => {
                for (let i = 0; i < ore.count; i++) {
                    const startX = randInt(0, 15);
                    const startZ = randInt(0, 15);
                    const startY = randInt(ore.min, ore.max);

                    for (let j = 0; j < ore.size; j++) {
                        const tx = startX + randInt(-1, 1) * randInt(0, 2); 
                        const ty = startY + randInt(-1, 1) * randInt(0, 2);
                        const tz = startZ + randInt(-1, 1) * randInt(0, 2);

                        if (tx >= 0 && tx < 16 && tz >= 0 && tz < 16 && ty > 0 && ty < CHUNK_Y) {
                            const currentBlock = this.get(tx, ty, tz);
                            if (currentBlock === BLOCK.STONE || currentBlock === DRIPSTONE_ID) {
                                this.set(tx, ty, tz, ore.id);
                            }
                        }
                    }
                }
            });

            this.generated = true;
            this.dirty = true;
        };
    } else {
        console.error("[MOD] Błąd: Klasa Chunk niedostępna.");
    }

    console.log("[MOD] Załadowano pełny moduł M&C.");
})(typeof window !== "undefined" ? window : this);