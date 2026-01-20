import { TileType } from './game.js';

const E = TileType.EMPTY;
const W = TileType.WALL;
const C = TileType.CRYSTAL;
const D = TileType.DATA;
const B = TileType.ENERGY_CELL;
const H = TileType.HAZARD;
const G = TileType.CHARGER;

export const Level1 = {
    id: 'level_1',
    name: '1. Hello Drone',
    description: 'Pelajari perintah dasar: MOVE dan COLLECT',
    lesson: 'MOVE forward menggerakkan drone maju. COLLECT mengambil resource di tile saat ini.',

    width: 5,
    height: 3,

    grid: [
        [W, W, W, W, W],
        [W, E, E, C, W],
        [W, W, W, W, W]
    ],

    startX: 1,
    startY: 1,
    startFacing: 'east',
    startEnergy: 100,
    maxEnergy: 100,

    fogOfWar: false,
    scanRadius: 5,

    objectives: [
        { type: 'collect', resource: 'crystal', count: 1 }
    ],

    optimalEnergy: 7,
    optimalSteps: 3,
    timeLimit: 20,

    tutorial: {
        enabled: true,
        steps: [
            { message: '👋 Selamat datang! Drone kamu ada di sebelah kiri.', highlight: 'canvas' },
            { message: '💎 Tujuanmu: ambil crystal di sebelah kanan.', highlight: 'canvas' },
            { message: '📝 Ketik: MOVE forward (untuk maju 2 kali)', highlight: 'editor' },
            { message: '📝 Lalu ketik: COLLECT (untuk mengambil crystal)', highlight: 'editor' }
        ]
    },

    hints: [
        '💡 Ketik MOVE forward untuk maju',
        '💡 Ketik COLLECT untuk mengambil crystal',
        '💡 Tekan F5 atau klik Run untuk menjalankan'
    ],

    sampleSolution: `MOVE forward
MOVE forward
COLLECT`
};

export const Level2 = {
    id: 'level_2',
    name: '2. Turn Around',
    description: 'Pelajari TURN untuk berbelok',
    lesson: 'TURN left/right memutar drone 90 derajat. Gunakan ini untuk menavigasi maze.',

    width: 5,
    height: 5,

    grid: [
        [W, W, W, W, W],
        [W, E, W, C, W],
        [W, E, W, E, W],
        [W, E, E, E, W],
        [W, W, W, W, W]
    ],

    startX: 1,
    startY: 1,
    startFacing: 'south',
    startEnergy: 100,
    maxEnergy: 100,

    fogOfWar: false,
    scanRadius: 5,

    objectives: [
        { type: 'collect', resource: 'crystal', count: 1 }
    ],

    optimalEnergy: 15,
    optimalSteps: 8,
    timeLimit: 30,

    hints: [
        '💡 TURN right untuk belok kanan',
        '💡 TURN left untuk belok kiri',
        '💡 Ikuti jalur berbentuk L'
    ],

    sampleSolution: `MOVE forward
MOVE forward
TURN right
MOVE forward
MOVE forward
TURN left
MOVE forward
COLLECT`
};

export const Level3 = {
    id: 'level_3',
    name: '3. Loop Basics',
    description: 'Gunakan LOOP untuk mengulang aksi',
    lesson: 'LOOP n: ... END mengulang kode di dalamnya sebanyak n kali. Ini menghemat penulisan kode berulang.',

    width: 8,
    height: 3,

    grid: [
        [W, W, W, W, W, W, W, W],
        [W, E, C, E, C, E, C, W],
        [W, W, W, W, W, W, W, W]
    ],

    startX: 1,
    startY: 1,
    startFacing: 'east',
    startEnergy: 100,
    maxEnergy: 100,

    fogOfWar: false,
    scanRadius: 5,

    objectives: [
        { type: 'collect', resource: 'crystal', count: 3 }
    ],

    optimalEnergy: 21,
    optimalSteps: 9,
    timeLimit: 30,

    hints: [
        '💡 Tanpa LOOP: MOVE, COLLECT, MOVE, COLLECT... (panjang!)',
        '💡 Dengan LOOP: LOOP 3: MOVE forward COLLECT END',
        '⚠️ Jangan lupa END di akhir LOOP'
    ],

    sampleSolution: `LOOP 3:
    MOVE forward
    COLLECT
END`
};

export const Level4 = {
    id: 'level_4',
    name: '4. Sensing the World',
    description: 'Gunakan scan() untuk melihat tile di depan',
    lesson: 'scan() mengembalikan tipe tile di depan drone: "empty", "wall", "crystal", dll.',

    width: 6,
    height: 4,

    grid: [
        [W, W, W, W, W, W],
        [W, E, C, E, C, W],
        [W, E, W, W, E, W],
        [W, W, W, W, W, W]
    ],

    startX: 1,
    startY: 1,
    startFacing: 'east',
    startEnergy: 100,
    maxEnergy: 100,

    fogOfWar: false,
    scanRadius: 5,

    objectives: [
        { type: 'collect', resource: 'crystal', count: 2 }
    ],

    optimalEnergy: 20,
    optimalSteps: 10,
    timeLimit: 40,

    hints: [
        '💡 scan() mengembalikan "crystal" jika ada crystal di depan',
        '💡 Gunakan log scan() untuk melihat hasilnya di console',
        '💡 Coba: log scan() lalu MOVE forward'
    ],

    sampleSolution: `log scan()
MOVE forward
COLLECT
log scan()
MOVE forward
MOVE forward
TURN right
MOVE forward
MOVE forward
COLLECT`
};

export const Level5 = {
    id: 'level_5',
    name: '5. Conditional Logic',
    description: 'Gunakan IF untuk membuat keputusan',
    lesson: 'IF condition: ... END menjalankan kode hanya jika kondisi benar. Gabungkan dengan scan()!',

    width: 6,
    height: 4,

    grid: [
        [W, W, W, W, W, W],
        [W, E, E, C, E, W],
        [W, E, C, E, C, W],
        [W, W, W, W, W, W]
    ],

    startX: 1,
    startY: 1,
    startFacing: 'east',
    startEnergy: 80,
    maxEnergy: 100,

    fogOfWar: false,
    scanRadius: 5,

    objectives: [
        { type: 'collect', resource: 'crystal', count: 3 }
    ],

    optimalEnergy: 30,
    optimalSteps: 12,
    timeLimit: 50,

    hints: [
        '💡 IF scan() == "crystal": COLLECT END',
        '💡 Ini hanya COLLECT jika benar-benar ada crystal',
        '💡 Mencegah error "nothing to collect"'
    ],

    sampleSolution: `LOOP 4:
    IF scan() == "crystal":
        MOVE forward
        COLLECT
    ELSE:
        MOVE forward
    END
END

TURN right
LOOP 3:
    IF scan() == "crystal":
        MOVE forward
        COLLECT
    ELSE:
        MOVE forward
    END
END`
};

export const Level6 = {
    id: 'level_6',
    name: '6. Wall Avoidance',
    description: 'Hindari dinding dengan smart navigation',
    lesson: 'Gabungkan scan() dengan IF untuk menghindari dinding secara otomatis.',

    width: 7,
    height: 5,

    grid: [
        [W, W, W, W, W, W, W],
        [W, E, E, W, E, C, W],
        [W, E, W, E, E, E, W],
        [W, E, E, E, W, C, W],
        [W, W, W, W, W, W, W]
    ],

    startX: 1,
    startY: 2,
    startFacing: 'east',
    startEnergy: 80,
    maxEnergy: 100,

    fogOfWar: false,
    scanRadius: 5,

    objectives: [
        { type: 'collect', resource: 'crystal', count: 2 }
    ],

    optimalEnergy: 35,
    optimalSteps: 15,
    timeLimit: 60,

    hints: [
        '💡 IF scan() == "wall": TURN right END',
        '💡 Ini akan belok jika ada dinding di depan',
        '💡 Drone tidak akan nabrak!'
    ],

    sampleSolution: `LOOP 15:
    IF scan() == "wall":
        TURN right
    ELIF scan() == "crystal":
        MOVE forward
        COLLECT
    ELSE:
        MOVE forward
    END
END`
};

export const Level7 = {
    id: 'level_7',
    name: '7. Energy Management',
    description: 'Kelola energy dengan WAIT dan charger',
    lesson: 'Variabel energy menunjukkan sisa energi. WAIT memulihkan 1 energy per tick. Charger ⚡ memberikan +20.',

    width: 8,
    height: 4,

    grid: [
        [W, W, W, W, W, W, W, W],
        [W, E, E, G, E, E, C, W],
        [W, C, E, E, E, E, E, W],
        [W, W, W, W, W, W, W, W]
    ],

    startX: 1,
    startY: 1,
    startFacing: 'east',
    startEnergy: 30,
    maxEnergy: 100,

    fogOfWar: false,
    scanRadius: 5,

    objectives: [
        { type: 'collect', resource: 'crystal', count: 2 }
    ],

    optimalEnergy: 25,
    optimalSteps: 14,
    timeLimit: 50,

    hints: [
        '💡 Energy terbatas! Perhatikan indikator 🔋',
        '💡 Charger ⚡ memberikan +20 energy',
        '💡 WAIT memulihkan 1 energy, tapi lambat'
    ],

    sampleSolution: `MOVE forward
MOVE forward

MOVE forward
MOVE forward
MOVE forward
COLLECT

TURN right
TURN right
MOVE forward
MOVE forward
MOVE forward
MOVE forward
TURN right
MOVE forward
COLLECT`
};

export const Level8 = {
    id: 'level_8',
    name: '8. WHILE Loops',
    description: 'WHILE untuk loop berbasis kondisi',
    lesson: 'WHILE condition: ... END terus berjalan SELAMA kondisi benar. Hati-hati infinite loop!',

    width: 8,
    height: 5,

    grid: [
        [W, W, W, W, W, W, W, W],
        [W, E, C, E, C, E, C, W],
        [W, E, E, E, E, E, E, W],
        [W, E, C, E, C, E, C, W],
        [W, W, W, W, W, W, W, W]
    ],

    startX: 1,
    startY: 2,
    startFacing: 'east',
    startEnergy: 100,
    maxEnergy: 100,

    fogOfWar: false,
    scanRadius: 5,

    objectives: [
        { type: 'collect', resource: 'crystal', count: 6 }
    ],

    optimalEnergy: 40,
    optimalSteps: 18,
    timeLimit: 60,

    hints: [
        '💡 WHILE energy > 50: ... END',
        '💡 Loop akan berhenti saat energy <= 50',
        '💡 Gunakan WHILE inventory.crystal < 6 untuk loop sampai cukup'
    ],

    sampleSolution: `WHILE inventory.crystal < 6:
    IF scan() == "crystal":
        MOVE forward
        COLLECT
    ELIF scan() == "wall":
        TURN right
    ELSE:
        MOVE forward
    END
END

log "Semua crystal terkumpul!"`
};

export const Level9 = {
    id: 'level_9',
    name: '9. Fog of War',
    description: 'Eksplorasi dengan visibility terbatas',
    lesson: 'Fog of War menyembunyikan area yang belum dijelajahi. Gunakan scan() untuk "melihat" sebelum bergerak!',

    width: 8,
    height: 6,

    grid: [
        [W, W, W, W, W, W, W, W],
        [W, E, E, E, W, E, C, W],
        [W, E, W, E, E, E, E, W],
        [W, E, W, W, W, E, W, W],
        [W, E, E, C, E, E, C, W],
        [W, W, W, W, W, W, W, W]
    ],

    startX: 1,
    startY: 1,
    startFacing: 'south',
    startEnergy: 80,
    maxEnergy: 100,

    fogOfWar: true,
    scanRadius: 1,

    objectives: [
        { type: 'collect', resource: 'crystal', count: 3 }
    ],

    optimalEnergy: 50,
    optimalSteps: 25,
    timeLimit: 80,

    hints: [
        '🌫️ Fog of War aktif! Area gelap belum terlihat',
        '💡 scan() mengungkap tile di depan',
        '💡 Jalan perlahan dan scan sebelum bergerak'
    ],

    sampleSolution: `WHILE inventory.crystal < 3:
    log scan()
    
    IF scan() == "crystal":
        MOVE forward
        COLLECT
    ELIF scan() == "wall":
        TURN right
    ELSE:
        MOVE forward
    END
    
    IF energy < 20:
        log "Energy rendah!"
        WAIT 5
    END
END`
};

export const Level10 = {
    id: 'level_10',
    name: '10. Master Challenge',
    description: 'Tantangan akhir! Gabungkan semua yang telah dipelajari',
    lesson: 'Level ini menguji semua skill: navigation, loops, conditions, energy management, dan fog exploration.',

    width: 10,
    height: 8,

    grid: [
        [W, W, W, W, W, W, W, W, W, W],
        [W, E, E, H, E, E, W, C, E, W],
        [W, E, W, W, E, E, E, E, E, W],
        [W, E, E, E, E, W, W, E, W, W],
        [W, W, W, E, G, E, E, E, D, W],
        [W, C, E, E, W, W, E, W, E, W],
        [W, E, E, E, E, E, E, C, D, W],
        [W, W, W, W, W, W, W, W, W, W]
    ],

    startX: 1,
    startY: 1,
    startFacing: 'east',
    startEnergy: 50,
    maxEnergy: 100,

    fogOfWar: true,
    scanRadius: 2,

    objectives: [
        { type: 'collect', resource: 'crystal', count: 3 },
        { type: 'collect', resource: 'data', count: 2 }
    ],

    optimalEnergy: 60,
    optimalSteps: 40,
    timeLimit: 120,

    hints: [
        '🏆 Ini level terakhir! Gunakan semua skill',
        '⚠️ Hindari hazard (merah)',
        '⚡ Cari charger untuk energy',
        '💎 Kumpulkan 3 crystal DAN 2 data core'
    ],

    sampleSolution: `WHILE inventory.crystal < 3 or inventory.data < 2:
    IF scan() == "hazard":
        TURN right
        log "Hazard detected!"
    ELIF scan() == "wall":
        TURN right
    ELIF scan() == "crystal":
        MOVE forward
        COLLECT
        log "Got crystal!"
    ELIF scan() == "data":
        MOVE forward
        COLLECT
        log "Got data!"
    ELIF scan() == "charger":
        MOVE forward
        log "Charging..."
    ELSE:
        MOVE forward
    END
    
    IF energy < 15:
        WAIT 10
    END
END

log "🏆 LEVEL COMPLETE!"`
};

export const Levels = [
    Level1, Level2, Level3, Level4, Level5,
    Level6, Level7, Level8, Level9, Level10
];

export function getLevelById(id) {
    return Levels.find(level => level.id === id);
}

export function getLevelByNumber(num) {
    return Levels[num - 1];
}

export const LevelProgression = [
    { level: 1, concept: 'MOVE & COLLECT', icon: '🚀' },
    { level: 2, concept: 'TURN', icon: '🔄' },
    { level: 3, concept: 'LOOP', icon: '🔁' },
    { level: 4, concept: 'scan()', icon: '👁️' },
    { level: 5, concept: 'IF / ELSE', icon: '❓' },
    { level: 6, concept: 'Smart Navigation', icon: '🧭' },
    { level: 7, concept: 'Energy & WAIT', icon: '🔋' },
    { level: 8, concept: 'WHILE Loops', icon: '♾️' },
    { level: 9, concept: 'Fog of War', icon: '🌫️' },
    { level: 10, concept: 'Master Challenge', icon: '🏆' }
];

export default Levels;
