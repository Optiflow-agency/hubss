
import { AvatarConfig } from '../types';

// --- 1. SINGLE SOURCE OF TRUTH (Whitelists) ---
// These values are strictly checked against DiceBear Avataaars v7 documentation.

export const AVATAR_CONSTANTS = {
    top: [
        'longHairBigHair', 'longHairBob', 'longHairBun', 'longHairCurly', 'longHairCurvy', 
        'longHairDreads', 'longHairFrida', 'longHairFro', 'longHairFroBand', 'longHairNotTooLong', 
        'longHairMiaWallace', 'longHairShavedSides', 'longHairStraight', 'longHairStraight2', 
        'longHairStraightStrand', 'shortHairDreads01', 'shortHairDreads02', 'shortHairFrizzle', 
        'shortHairShaggyMullet', 'shortHairShortCurly', 'shortHairShortFlat', 'shortHairShortRound', 
        'shortHairShortWaved', 'shortHairSides', 'shortHairTheCaesar', 'shortHairTheCaesarSidePart',
        'turban', 'winterHat1', 'winterHat2', 'winterHat3', 'winterHat4', 'hat'
    ],
    accessories: [
        'kurt', 'prescription01', 'prescription02', 'round', 'sunglasses', 'wayfarers', 'none'
    ],
    hairColor: [
        'aurora', 'black', 'blonde', 'blondeGolden', 'brown', 'brownDark', 'pastelPink', 'platinum', 'red', 'silverGray'
    ],
    facialHair: [
        'beardLight', 'beardMajestic', 'beardMedium', 'moustacheFancy', 'moustacheMagnum', 'none'
    ],
    clothing: [
        'blazerAndShirt', 'blazerAndSweater', 'collarAndSweater', 'graphicShirt', 'hoodie', 'overall', 'shirtCrewNeck', 'shirtScoopNeck', 'shirtVNeck'
    ],
    eyes: [
        'close', 'cry', 'default', 'dizzy', 'eyeRoll', 'happy', 'hearts', 'side', 'squint', 'surprised', 'wink', 'winkWacky'
    ],
    eyebrows: [
        'angry', 'angryNatural', 'default', 'defaultNatural', 'flatNatural', 'frownNatural', 'raisedExcited', 'raisedExcitedNatural', 'sadConcerned', 'sadConcernedNatural', 'unibrownNatural', 'upDown', 'upDownNatural'
    ],
    mouth: [
        'concerned', 'default', 'disbelief', 'eating', 'grimace', 'sad', 'screamOpen', 'serious', 'smile', 'tongue', 'twinkle', 'vomit'
    ],
    skinColor: [
        'tanned', 'yellow', 'pale', 'light', 'brown', 'darkBrown', 'black'
    ]
};

// --- 2. DEFAULTS & FALLBACKS ---

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
    style: 'avataaars',
    seed: 'NexusUser',
    top: 'shortHairShortFlat',
    accessories: 'none',
    hairColor: 'brownDark',
    facialHair: 'none',
    clothing: 'hoodie',
    eyes: 'default',
    eyebrows: 'default',
    mouth: 'default',
    skinColor: 'light',
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
        if (value && AVATAR_CONSTANTS[key].includes(value)) {
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

    return `https://api.dicebear.com/7.x/avataaars/svg?${params.toString()}`;
};

// --- 5. UI HELPERS (For Editor) ---

// Mappings for Italian Display Names
export const ASSET_DISPLAY_NAMES: Record<string, string> = {
    // Skin
    pale: 'Pallida', light: 'Chiara', tanned: 'Abbronzata', yellow: 'Dorata', darkBrown: 'Molto Scura',
    // Hair Colors
    black: 'Nero', brownDark: 'Castano Scuro', brown: 'Castano', red: 'Rosso', blonde: 'Biondo', blondeGolden: 'Biondo Oro', platinum: 'Platino', pastelPink: 'Rosa', silverGray: 'Grigio', aurora: 'Aurora',
    // Tops
    longHairBob: 'Caschetto', longHairBun: 'Chignon', longHairCurly: 'Ricci Lunghi', longHairCurvy: 'Ondulati', longHairStraight: 'Lisci', longHairNotTooLong: 'Media Lunghezza',
    shortHairShortFlat: 'Corti Piatti', shortHairShortRound: 'Corti Tondi', shortHairTheCaesar: 'Caesar', shortHairDreads01: 'Dread Corti', shortHairFrizzle: 'Spettinati',
    // Accessories
    none: 'Nessuno', kurt: 'Kurt', prescription01: 'Vista 1', prescription02: 'Vista 2', round: 'Tondi', sunglasses: 'Sole', wayfarers: 'Wayfarer',
    // Facial Hair
    beardMedium: 'Barba Media', beardLight: 'Barba Corta', beardMajestic: 'Barba Lunga', moustacheFancy: 'Baffi Fancy', moustacheMagnum: 'Baffi Magnum',
    // Clothes
    hoodie: 'Felpa', blazerAndShirt: 'Giacca', collarAndSweater: 'Maglione', shirtCrewNeck: 'T-Shirt', shirtScoopNeck: 'Scollo Tondo',
    // Eyes
    default: 'Normale', happy: 'Felice', wink: 'Occhiolino', hearts: 'Innamorato', squint: 'Sospettoso', surprised: 'Sorpreso',
    // Mouth
    smile: 'Sorriso', twinkle: 'Sorriso Furbetto', serious: 'Serio', tongue: 'Linguaccia', grimace: 'Smorfia',
    // Eyebrows
    defaultNatural: 'Naturali', raisedExcited: 'Eccitate', sadConcerned: 'Preoccupate', angry: 'Arrabbiate'
};

export const getDisplayName = (key: string) => ASSET_DISPLAY_NAMES[key] || key.replace(/([A-Z])/g, ' $1').trim();

// Filter assets by gender for the UI
export const getAssetsForGender = (gender: 'man' | 'woman') => {
    if (gender === 'woman') {
        return {
            top: AVATAR_CONSTANTS.top.filter(t => t.startsWith('long') || t.includes('Bob') || t.includes('Bun')),
            clothing: AVATAR_CONSTANTS.clothing,
            facialHair: ['none'], // Women usually don't have beards in this style
            eyebrows: AVATAR_CONSTANTS.eyebrows,
            mouth: AVATAR_CONSTANTS.mouth,
            eyes: AVATAR_CONSTANTS.eyes
        };
    } else {
        return {
            top: AVATAR_CONSTANTS.top.filter(t => t.startsWith('short') || t.includes('Hat') || t === 'turban'),
            clothing: AVATAR_CONSTANTS.clothing,
            facialHair: AVATAR_CONSTANTS.facialHair,
            eyebrows: AVATAR_CONSTANTS.eyebrows,
            mouth: AVATAR_CONSTANTS.mouth,
            eyes: AVATAR_CONSTANTS.eyes
        };
    }
};
