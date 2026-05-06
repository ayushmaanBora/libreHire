const PROFILE_TO_ROLE = {
  'Systems / Kernel': 'systems',
};

const ROLE_CONSTRAINTS = {
  systems: { must: ['C','C++','Rust','Assembly','Zig'], negative: ['JavaScript','TypeScript','PHP','Ruby','Dart','HTML','CSS'] },
};

const LOCATION_ALIASES = {
  bangalore: ['bangalore', 'bengaluru', 'blr', 'karnataka'],
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

  const primaryLoc = locationParts[0] || '';
  const secondaryLoc = locationParts[1] || '';

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
      // Secondary language query for same location variant
      if (secondaryLangs[0]) locQueries.push(`location:"${locV}" language:"${secondaryLangs[0]}" type:user`.trim());
    }
    queries.push(...locQueries.slice(0, 6));
  } else {
    // No location — pure skill search
    if (langFilter) {
      const secFilter = secondaryLangs.map(l => `language:"${l}"`).join(' ');
      queries.push(`${langFilter} ${secFilter} type:user ${negFilter}`.trim());
      if (secondaryLangs[0]) queries.push(`language:"${secondaryLangs[0]}" type:user ${negFilter}`.trim());
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

  // queryTerms for scoring: all selected languages + role name words
  const queryTerms = [
    ...languages.map(l => l.toLowerCase()),
    ...(primaryLang && !languages.length ? [primaryLang.toLowerCase()] : []),
    ...(jobProfile ? jobProfile.toLowerCase().split(/[\s\/]+/) : []),
  ].filter((v, i, a) => v.length > 1 && a.indexOf(v) === i);

  return { queries, queryTerms, constraints, locationInfo };
}

console.log(buildDeterministicQueries({
  jobProfile: 'Systems / Kernel',
  languages: ['C', 'C++', 'Rust'],
  country: 'India',
  state: 'Karnataka',
  city: 'Bangalore'
}));
