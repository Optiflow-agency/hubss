
import { AvatarConfig } from '../types';

// --- 1. SINGLE SOURCE OF TRUTH (Whitelists) ---
// These values are strictly checked against DiceBear Avataaars v9 documentation.

export const AVATAR_CONSTANTS = {
    top: [
        'bigHair', 'bob', 'bun', 'curly', 'curvy',
        'dreads', 'frida', 'fro', 'froBand', 'longButNotTooLong',
        'miaWallace', 'shavedSides', 'straight01', 'straight02',
        'straightAndStrand', 'dreads01', 'dreads02', 'frizzle',
        'shaggy', 'shaggyMullet', 'shortCurly', 'shortFlat', 'shortRound',
        'shortWaved', 'sides', 'theCaesar', 'theCaesarAndSidePart',
        'turban', 'winterHat1', 'winterHat02', 'winterHat03', 'winterHat04', 'hat', 'hijab'
    ],
    accessories: [
        'kurt', 'prescription01', 'prescription02', 'round', 'sunglasses', 'wayfarers', 'eyepatch', 'none'
    ],
    // Hair colors as HEX values
    hairColor: [
        '2c1b18', '4a312c', '724133', 'a55728', 'b58143', 'c93305', 'd6b370', 'e8e1e1', 'ecdcbf', 'f59797'
    ],
    // Hair color display names for UI
    hairColorNames: {
        '2c1b18': 'Nero',
        '4a312c': 'Castano Scuro',
        '724133': 'Castano',
        'a55728': 'Marrone',
        'b58143': 'Castano Chiaro',
        'c93305': 'Rosso',
        'd6b370': 'Biondo',
        'e8e1e1': 'Grigio',
        'ecdcbf': 'Platino',
        'f59797': 'Rosa'
    },
    facialHair: [
        'beardLight', 'beardMajestic', 'beardMedium', 'moustacheFancy', 'moustacheMagnum', 'none'
    ],
    clothing: [
        'blazerAndShirt', 'blazerAndSweater', 'collarAndSweater', 'graphicShirt', 'hoodie', 'overall', 'shirtCrewNeck', 'shirtScoopNeck', 'shirtVNeck'
    ],
    eyes: [
        'closed', 'cry', 'default', 'eyeRoll', 'happy', 'hearts', 'side', 'squint', 'surprised', 'wink', 'winkWacky', 'xDizzy'
    ],
    eyebrows: [
        'angry', 'angryNatural', 'default', 'defaultNatural', 'flatNatural', 'frownNatural', 'raisedExcited', 'raisedExcitedNatural', 'sadConcerned', 'sadConcernedNatural', 'unibrowNatural', 'upDown', 'upDownNatural'
    ],
    mouth: [
        'concerned', 'default', 'disbelief', 'eating', 'grimace', 'sad', 'screamOpen', 'serious', 'smile', 'tongue', 'twinkle', 'vomit'
    ],
    // Skin colors as HEX values
    skinColor: [
        'ffdbac', 'f5cfa0', 'eac086', 'd5a77c', 'c68642', '8d5524', '614335'
    ],
    // Skin color display names for UI
    skinColorNames: {
        'ffdbac': 'Chiara',
        'f5cfa0': 'Chiara Dorata',
        'eac086': 'Media',
        'd5a77c': 'Abbronzata',
        'c68642': 'Scura',
        '8d5524': 'Molto Scura',
        '614335': 'Ebano'
    }
};

// --- 2. DEFAULTS & FALLBACKS ---

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
    style: 'avataaars',
    seed: 'NexusUser',
    top: 'shortFlat',
    accessories: 'none',
    hairColor: '4a312c',
    facialHair: 'none',
    clothing: 'hoodie',
    eyes: 'default',
    eyebrows: 'default',
    mouth: 'default',
    skinColor: 'f5cfa0',
    gender: 'man'
};

// --- 3. SANITIZER (The Gatekeeper) ---

export const getSafeAvatarConfig = (config: Partial<AvatarConfig> | undefined | null): AvatarConfig => {
    // 1. Start with Default
    const safeConfig = { ...DEFAULT_AVATAR_CONFIG };

    if (!config) return safeConfig;

    // 2. Merge & Validate properties one by one
    if (config.seed && typeof config.seed === 'string') safeConfig.seed = config.seed;

    // Helper to validate against whitelist
    const validate = (key: keyof typeof AVATAR_CONSTANTS, value: string | undefined) => {
        const whitelist = AVATAR_CONSTANTS[key];
        if (Array.isArray(whitelist) && value && whitelist.includes(value)) {
            return value;
        }
        return safeConfig[key as keyof AvatarConfig] as string; // Return default if invalid
    };

    safeConfig.top = validate('top', config.top);
    safeConfig.accessories = validate('accessories', config.accessories);
    safeConfig.hairColor = validate('hairColor', config.hairColor);
    safeConfig.facialHair = validate('facialHair', config.facialHair);
    safeConfig.clothing = validate('clothing', config.clothing);
    safeConfig.eyes = validate('eyes', config.eyes);
    safeConfig.eyebrows = validate('eyebrows', config.eyebrows);
    safeConfig.mouth = validate('mouth', config.mouth);
    safeConfig.skinColor = validate('skinColor', config.skinColor);

    if(config.gender === 'woman' || config.gender === 'man') {
        safeConfig.gender = config.gender;
    }

    return safeConfig;
};

// --- 4. RENDERER (URL Builder) ---

export const generateAvatarUrl = (config: Partial<AvatarConfig>): string => {
    const finalConfig = getSafeAvatarConfig(config);

    const params = new URLSearchParams();
    params.append('seed', finalConfig.seed);
    params.append('top', finalConfig.top);
    params.append('hairColor', finalConfig.hairColor);
    params.append('clothing', finalConfig.clothing);
    params.append('eyes', finalConfig.eyes);
    params.append('eyebrows', finalConfig.eyebrows);
    params.append('mouth', finalConfig.mouth);
    params.append('skinColor', finalConfig.skinColor);

    // Logic for Accessories probability
    if (finalConfig.accessories !== 'none') {
        params.append('accessories', finalConfig.accessories);
        params.append('accessoriesProbability', '100');
    } else {
        params.append('accessoriesProbability', '0');
    }

    // Logic for Facial Hair probability
    if (finalConfig.facialHair !== 'none') {
        params.append('facialHair', finalConfig.facialHair);
        params.append('facialHairProbability', '100');
    } else {
        params.append('facialHairProbability', '0');
    }

    return `https://api.dicebear.com/9.x/avataaars/svg?${params.toString()}`;
};

// --- 5. UI HELPERS (For Editor) ---

// Mappings for Italian Display Names
export const ASSET_DISPLAY_NAMES: Record<string, string> = {
    // Skin (now hex values)
    'ffdbac': 'Chiara', 'f5cfa0': 'Chiara Dorata', 'eac086': 'Media', 'd5a77c': 'Abbronzata',
    'c68642': 'Scura', '8d5524': 'Molto Scura', '614335': 'Ebano',
    // Hair Colors (hex)
    '2c1b18': 'Nero', '4a312c': 'Castano Scuro', '724133': 'Castano', 'a55728': 'Marrone',
    'b58143': 'Castano Chiaro', 'c93305': 'Rosso', 'd6b370': 'Biondo', 'e8e1e1': 'Grigio',
    'ecdcbf': 'Platino', 'f59797': 'Rosa',
    // Tops
    bob: 'Caschetto', bun: 'Chignon', curly: 'Ricci', curvy: 'Ondulati',
    straight01: 'Lisci', straight02: 'Lisci 2', longButNotTooLong: 'Media Lunghezza',
    shortFlat: 'Corti Piatti', shortRound: 'Corti Tondi', theCaesar: 'Caesar',
    dreads01: 'Dread Corti', dreads02: 'Dread Lunghi', frizzle: 'Spettinati',
    shaggy: 'Shaggy', shaggyMullet: 'Mullet', shortCurly: 'Corti Ricci',
    shortWaved: 'Corti Mossi', sides: 'Rasati Lati', bigHair: 'Voluminosi',
    // Accessories
    none: 'Nessuno', kurt: 'Kurt', prescription01: 'Vista 1', prescription02: 'Vista 2',
    round: 'Tondi', sunglasses: 'Sole', wayfarers: 'Wayfarer', eyepatch: 'Benda',
    // Facial Hair
    beardMedium: 'Barba Media', beardLight: 'Barba Corta', beardMajestic: 'Barba Lunga',
    moustacheFancy: 'Baffi Fancy', moustacheMagnum: 'Baffi Magnum',
    // Clothes
    hoodie: 'Felpa', blazerAndShirt: 'Giacca e Camicia', blazerAndSweater: 'Giacca e Maglione',
    collarAndSweater: 'Maglione', graphicShirt: 'T-Shirt Grafica', overall: 'Salopette',
    shirtCrewNeck: 'T-Shirt', shirtScoopNeck: 'Scollo Tondo', shirtVNeck: 'Scollo V',
    // Eyes
    default: 'Normale', happy: 'Felice', wink: 'Occhiolino', hearts: 'Innamorato',
    squint: 'Sospettoso', surprised: 'Sorpreso', closed: 'Chiusi', cry: 'Pianto',
    eyeRoll: 'Eye Roll', side: 'Di Lato', winkWacky: 'Occhiolino Pazzo', xDizzy: 'Stordito',
    // Mouth
    smile: 'Sorriso', twinkle: 'Sorriso Furbetto', serious: 'Serio', tongue: 'Linguaccia',
    grimace: 'Smorfia', concerned: 'Preoccupato', disbelief: 'Incredulo', eating: 'Mangiando',
    sad: 'Triste', screamOpen: 'Urlo', vomit: 'Nausea',
    // Eyebrows
    defaultNatural: 'Naturali', raisedExcited: 'Sorprese', raisedExcitedNatural: 'Sorprese Naturali',
    sadConcerned: 'Preoccupate', sadConcernedNatural: 'Preoccupate Naturali',
    angry: 'Arrabbiate', angryNatural: 'Arrabbiate Naturali',
    flatNatural: 'Piatte', frownNatural: 'Accigliate', unibrowNatural: 'Monociglio',
    upDown: 'Su e Giù', upDownNatural: 'Su e Giù Naturali'
};

export const getDisplayName = (key: string) => ASSET_DISPLAY_NAMES[key] || key.replace(/([A-Z])/g, ' $1').trim();

// Filter assets by gender for the UI
export const getAssetsForGender = (gender: 'man' | 'woman') => {
    if (gender === 'woman') {
        return {
            top: AVATAR_CONSTANTS.top.filter(t =>
                ['bob', 'bun', 'curly', 'curvy', 'straight01', 'straight02', 'longButNotTooLong',
                 'miaWallace', 'bigHair', 'frida', 'fro', 'froBand', 'straightAndStrand'].includes(t)
            ),
            clothing: AVATAR_CONSTANTS.clothing,
            facialHair: ['none'], // Women usually don't have beards in this style
            eyebrows: AVATAR_CONSTANTS.eyebrows,
            mouth: AVATAR_CONSTANTS.mouth,
            eyes: AVATAR_CONSTANTS.eyes
        };
    } else {
        return {
            top: AVATAR_CONSTANTS.top.filter(t =>
                ['shortFlat', 'shortRound', 'shortCurly', 'shortWaved', 'theCaesar',
                 'theCaesarAndSidePart', 'dreads01', 'dreads02', 'frizzle', 'shaggy',
                 'shaggyMullet', 'sides', 'hat', 'turban', 'winterHat1'].includes(t)
            ),
            clothing: AVATAR_CONSTANTS.clothing,
            facialHair: AVATAR_CONSTANTS.facialHair,
            eyebrows: AVATAR_CONSTANTS.eyebrows,
            mouth: AVATAR_CONSTANTS.mouth,
            eyes: AVATAR_CONSTANTS.eyes
        };
    }
};
