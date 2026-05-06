const LOCATION_ALIASES = {
  delhi:     ['delhi', 'new delhi', 'ncr', 'noida', 'gurgaon', 'gurugram', 'faridabad'],
  bangalore: ['bangalore', 'bengaluru', 'blr', 'karnataka'],
  mumbai:    ['mumbai', 'bombay', 'pune', 'maharashtra'],
  hyderabad: ['hyderabad', 'hyd', 'telangana', 'secunderabad'],
  chennai:   ['chennai', 'madras', 'tamil nadu'],
  kolkata:   ['kolkata', 'calcutta', 'west bengal'],
  berlin:    ['berlin', 'germany', 'munich', 'hamburg', 'frankfurt'],
  london:    ['london', 'uk', 'england', 'manchester', 'birmingham'],
  'new york':['new york', 'nyc', 'ny', 'brooklyn', 'manhattan'],
  'san francisco':['san francisco', 'sf', 'bay area', 'silicon valley', 'san jose', 'palo alto'],
  seattle:   ['seattle', 'wa', 'washington state'],
  toronto:   ['toronto', 'canada', 'ontario', 'vancouver'],
  singapore: ['singapore', 'sg'],
  tokyo:     ['tokyo', 'japan', 'osaka'],
  paris:     ['paris', 'france'],
  amsterdam: ['amsterdam', 'netherlands', 'holland'],
  stockholm: ['stockholm', 'sweden'],
  zurich:    ['zurich', 'switzerland'],
  dubai:     ['dubai', 'uae', 'abu dhabi'],
  austin:    ['austin', 'texas', 'tx'],
  boston:    ['boston', 'massachusetts', 'ma'],
  chicago:   ['chicago', 'illinois'],
};

const PROFILE_TO_ROLE = {
  'Systems / Kernel': 'systems',
  'Frontend': 'frontend',
};

const ROLE_CONSTRAINTS = {
  systems:           { must: ['C','C++','Rust','Assembly','Zig'],             negative: ['JavaScript','TypeScript','PHP','Ruby','Dart','HTML','CSS'] },
};

function buildDeterministicQueries(params) {
  const { jobProfile, languages, country, state, city } = params;

  // Resolve role constraints
  const roleKey = PROFILE_TO_ROLE[jobProfile] || jobProfile.toLowerCase();
  const constraints = ROLE_CONSTRAINTS[roleKey] || null;

  // Determine primary language — user-selected takes precedence over role default
  const primaryLang = languages[0] || constraints?.must[0] || '';
  const secondaryLangs = languages.slice(1);
  const langFilter = primaryLang ? `language:"${primaryLang}"` : '';
  const negFilter = constraints ? constraints.negative.map(l => `-language:"${l}"`).join(' ') : '';

  // Build location strings (most specific to least specific)
  const locationParts = [];
  if (city) locationParts.push(city);
  if (state) locationParts.push(state);
  if (country) locationParts.push(country);

  const queries = [];

  // When location is given, ONLY generate location-anchored queries.
  // Never add a skill-only fallback — that is the #1 cause of wrong-city devs appearing.
  if (locationParts.length > 0) {
    // Use Bangalore LOCATION_ALIASES if we recognise the city, else use what the user typed
    const cityVariants = [];
    for (const [, aliases] of Object.entries(LOCATION_ALIASES)) {
      if (aliases.some(a => locationParts.some(lp => lp.toLowerCase() === a || a.includes(lp.toLowerCase())))) {
        cityVariants.push(...aliases.slice(0, 4));
        break;
      }
    }
    // Fallback: just use what the user typed
    if (cityVariants.length === 0) cityVariants.push(...locationParts);

    // Generate one query per (city variant × primary language), capped at 6 queries
    const locQueries = [];
    for (const locV of cityVariants.slice(0, 3)) {
      if (langFilter) locQueries.push(`location:"${locV}" ${langFilter} type:user ${negFilter}`.trim());
      // Secondary language query for same location variant (also gets negative filters to avoid web devs!)
      for (const secL of secondaryLangs) {
        locQueries.push(`location:"${locV}" language:"${secL}" type:user ${negFilter}`.trim());
      }
    }
    queries.push(...locQueries.slice(0, 8));
  } else {
    // No location — pure skill search
    if (langFilter) {
      queries.push(`${langFilter} type:user ${negFilter}`.trim());
      for (const secL of secondaryLangs) {
        queries.push(`language:"${secL}" type:user ${negFilter}`.trim());
      }
    }
  }
  // Ensure at least 1 query
  if (queries.length === 0) {
    queries.push(`${langFilter || 'type:user'} type:user`);
  }

  // Build locationInfo for scoring
  const canonicalLoc = city || state || country || '';
  const locVariants = locationParts.map(l => l.toLowerCase());
  const locationInfo = canonicalLoc
    ? { canonical: canonicalLoc, variants: locVariants, isKnown: true }
    : null;

  return { queries, locationInfo };
}

console.log(buildDeterministicQueries({
  jobProfile: '',
  languages: ['C', 'C++', 'Rust'],
  country: 'India',
  state: 'Karnataka',
  city: 'Bangalore'
}));
