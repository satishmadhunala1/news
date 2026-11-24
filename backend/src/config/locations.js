/**
 * Default news locations. Users can extend these via dashboard settings.
 */

const DEFAULT_LOCATIONS = [
  { id: 'hyderabad', label: 'Hyderabad', query: 'Hyderabad', country: 'in', region: 'Telangana' },
  { id: 'telangana', label: 'Telangana', query: 'Telangana', country: 'in', region: 'Telangana' },
  { id: 'andhra-pradesh', label: 'Andhra Pradesh', query: 'Andhra Pradesh', country: 'in', region: 'Andhra Pradesh' },
  { id: 'india', label: 'India', query: 'India', country: 'in', region: null },
  { id: 'united-states', label: 'United States', query: 'United States', country: 'us', region: null },
  { id: 'united-kingdom', label: 'United Kingdom', query: 'United Kingdom', country: 'gb', region: null },
  { id: 'china', label: 'China', query: 'China', country: 'cn', region: null },
  { id: 'russia', label: 'Russia', query: 'Russia', country: 'ru', region: null },
  { id: 'europe', label: 'Europe', query: 'Europe', country: null, region: null },
  { id: 'international', label: 'International', query: 'world', country: null, region: null },
];

function getLocationById(id) {
  return DEFAULT_LOCATIONS.find((loc) => loc.id === id) || null;
}

module.exports = {
  DEFAULT_LOCATIONS,
  getLocationById,
};
