// ─── Mock data Mady App ───────────────────────────────────────────────────────

export const SPECIES = ['Perro', 'Gato', 'Conejo', 'Ave', 'Reptil', 'Otro'];
export const GENDERS  = ['Macho', 'Hembra'];
export const SIZES    = ['Pequeño', 'Mediano', 'Grande'];

export const MOCK_USER = {
  id:     'u1',
  name:   'Sofía Ramírez',
  email:  'sofia@madyapp.com',
  avatar: null,
  phone:  '+52 55 1234 5678',
  city:   'Ciudad de México',
};

export const MOCK_PETS = [
  {
    id:        'p1',
    name:      'Luna',
    species:   'Perro',
    breed:     'Golden Retriever',
    age:       '3 años',
    gender:    'Hembra',
    size:      'Grande',
    color:     'Dorado',
    weight:    '28 kg',
    chip:      '985141003123456',
    vaccines:  ['Rabia', 'Parvovirus', 'Distemper'],
    notes:     'Le encanta correr en el parque. Muy sociable con niños.',
    status:    'home',   // home | lost | found
    emoji:     '🐕',
    ownerId:   'u1',
    lastSeen:  null,
    lostDate:  null,
    photoColor:'#D4A843',
  },
  {
    id:        'p2',
    name:      'Milo',
    species:   'Gato',
    breed:     'Siamés',
    age:       '2 años',
    gender:    'Macho',
    size:      'Mediano',
    color:     'Crema y café',
    weight:    '4.5 kg',
    chip:      '985141003789012',
    vaccines:  ['Rabia', 'Calicivirus'],
    notes:     'Muy independiente. Prefiere la tranquilidad.',
    status:    'home',
    emoji:     '🐱',
    ownerId:   'u1',
    lastSeen:  null,
    lostDate:  null,
    photoColor:'#8B6F5E',
  },
  {
    id:        'p3',
    name:      'Coco',
    species:   'Conejo',
    breed:     'Holland Lop',
    age:       '1 año',
    gender:    'Macho',
    size:      'Pequeño',
    color:     'Blanco y gris',
    weight:    '1.8 kg',
    chip:      null,
    vaccines:  ['VHD'],
    notes:     'Le gustan las zanahorias y la lechuga.',
    status:    'home',
    emoji:     '🐇',
    ownerId:   'u1',
    lastSeen:  null,
    lostDate:  null,
    photoColor:'#9E9E9E',
  },
];

export const MOCK_REPORTS = [
  {
    id:      'r1',
    petId:   'p2',
    type:    'lost',
    date:    '2025-01-15',
    address: 'Col. Condesa, CDMX',
    lat:     19.4088,
    lng:    -99.1720,
    notes:   'Se escapó por la puerta trasera.',
    active:  true,
  },
];

export const VACCINE_OPTIONS = [
  'Rabia', 'Parvovirus', 'Distemper', 'Leptospirosis',
  'Bordetella', 'Calicivirus', 'Herpesvirus', 'VHD',
  'Otra',
];
