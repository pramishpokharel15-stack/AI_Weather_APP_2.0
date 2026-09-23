const databaseKey = 'thread-weather-database';
const sessionKey = 'thread-weather-user';
const state = { unit: 'celsius', weather: null, city: null, user: localStorage.getItem(sessionKey) };
const elements = {
  form: document.querySelector('#location-form'), latitude: document.querySelector('#latitude'), longitude: document.querySelector('#longitude'),
  temperature: document.querySelector('#temperature'), temperatureUnit: document.querySelector('#temperature-unit'), feelsLike: document.querySelector('#feels-like'),
  condition: document.querySelector('#condition'), wind: document.querySelector('#wind'), location: document.querySelector('#location-label'), footerLocation: document.querySelector('#coordinates-footer'),
  outfitTitle: document.querySelector('#outfit-title'), outfitDescription: document.querySelector('#outfit-description'), outfitList: document.querySelector('#outfit-list'), tip: document.querySelector('#tip-text'),
  error: document.querySelector('#error-message'), loading: document.querySelector('#loading-message'), updated: document.querySelector('#last-updated'), citySearch: document.querySelector('#city-search'),
  accountStatus: document.querySelector('#account-status'), loginButton: document.querySelector('#login-button'), favoriteButton: document.querySelector('#favorite-button'), logoutButton: document.querySelector('#logout-button'), loginDialog: document.querySelector('#login-dialog'), loginForm: document.querySelector('#login-form'), username: document.querySelector('#username'), cancelLogin: document.querySelector('#cancel-login')
};

function getDatabase() { try { return JSON.parse(localStorage.getItem(databaseKey)) || {}; } catch { return {}; } }
function saveDatabase(database) { localStorage.setItem(databaseKey, JSON.stringify(database)); }
function updateAccountUi() {
  const profile = state.user ? getDatabase()[state.user] : null;
  elements.loginButton.hidden = Boolean(state.user); elements.favoriteButton.hidden = !state.user || !state.city; elements.logoutButton.hidden = !state.user;
  if (!state.user) { elements.accountStatus.textContent = 'Log in to save a city that loads automatically next time.'; return; }
  elements.accountStatus.textContent = profile?.favorite ? `${profile.favorite.name} is saved for ${state.user}.` : `Hi ${state.user}. Save a favorite city for your next visit.`;
  elements.favoriteButton.textContent = profile?.favorite?.name === state.city?.name ? 'Favorite saved' : 'Save current city';
}
function setUser(username) { state.user = username.trim().toLowerCase(); localStorage.setItem(sessionKey, state.user); const database = getDatabase(); database[state.user] ||= {}; saveDatabase(database); updateAccountUi(); }
function saveFavorite() { if (!state.user || !state.city) return; const database = getDatabase(); database[state.user] = { ...(database[state.user] || {}), favorite: state.city }; saveDatabase(database); updateAccountUi(); }
function restoreFavorite() { const favorite = state.user ? getDatabase()[state.user]?.favorite : null; if (!favorite) return; elements.citySearch.value = favorite.name; elements.latitude.value = favorite.latitude; elements.longitude.value = favorite.longitude; state.city = favorite; }

function formatCoordinate(value, positive, negative) { return `${Math.abs(Number(value)).toFixed(2)}° ${Number(value) >= 0 ? positive : negative}`; }
function convertTemperature(celsius) { return state.unit === 'celsius' ? celsius : (celsius * 9 / 5) + 32; }
function displayTemperature(celsius) { return Math.round(convertTemperature(celsius)); }
function weatherDescription(code) {
  if (code === 0) return 'Clear sky';
  if ([1, 2, 3].includes(code)) return 'Partly cloudy';
  if ([45, 48].includes(code)) return 'Misty';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67].includes(code)) return 'Rain';
  if ([71, 73, 75, 77].includes(code)) return 'Snow';
  if ([80, 81, 82].includes(code)) return 'Rain showers';
  if ([95, 96, 99].includes(code)) return 'Thunderstorms';
  return 'Changing skies';
}
function outfitFor(temperature, code, wind) {
  const isWet = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code);
  const isSnow = [71, 73, 75, 77].includes(code);
  let result;
  if (temperature < 5) result = { title: 'Layer up, warmly.', description: 'A proper cold-weather uniform for staying comfortable outside.', items: ['Insulated coat', 'Chunky knit + thermal base', 'Wool trousers or lined denim', 'Boots and a warm scarf'], tip: 'Keep extremities warm: wool socks and gloves make the biggest difference.' };
  else if (temperature < 14) result = { title: 'The considered layer.', description: 'A little structure and a little softness for a crisp day.', items: ['Lightweight jacket', 'Long-sleeve knit', 'Relaxed trousers', 'Closed-toe sneakers'], tip: 'Bring a layer you can remove once the afternoon warms up.' };
  else if (temperature < 22) result = { title: 'Easy, with a layer.', description: 'Comfortable enough for a walk, polished enough for wherever you land.', items: ['Overshirt or light cardigan', 'Breathable tee', 'Straight-leg trousers', 'Low-profile sneakers'], tip: 'A lightweight outer layer is your best friend between shade and sun.' };
  else result = { title: 'Keep it light.', description: 'An airy look that lets the day do its thing.', items: ['Breathable cotton shirt', 'Relaxed shorts or linen pants', 'Canvas sneakers or sandals', 'Sunglasses'], tip: 'Choose natural fabrics that let air move when the temperature climbs.' };
  if (isWet) result.items.push(isSnow ? 'Water-resistant boots' : 'Compact umbrella');
  if (wind > 25) result.items.push('Wind-resistant outer layer');
  return result;
}
function render() {
  const { current } = state.weather;
  const temp = current.temperature_2m;
  elements.temperature.textContent = displayTemperature(temp);
  elements.temperatureUnit.textContent = state.unit === 'celsius' ? '°C' : '°F';
  elements.feelsLike.textContent = `Feels like a ${displayTemperature(temp)}° day · ${current.time.replace('T', ' · ')}`;
  elements.condition.textContent = weatherDescription(current.weather_code);
  elements.wind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  const outfit = outfitFor(temp, current.weather_code, current.wind_speed_10m);
  elements.outfitTitle.textContent = outfit.title;
  elements.outfitDescription.textContent = outfit.description;
  elements.outfitList.innerHTML = outfit.items.map(item => `<li>${item}</li>`).join('');
  elements.tip.textContent = outfit.tip;
  const lat = elements.latitude.value; const lon = elements.longitude.value;
  const coordinateText = `${formatCoordinate(lat, 'N', 'S')} · ${formatCoordinate(lon, 'E', 'W')}`;
  elements.location.textContent = coordinateText; elements.footerLocation.textContent = coordinateText;
  updateAccountUi();
}
async function searchCity() {
  const query = elements.citySearch.value.trim();
  if (!query) { showError('Enter a city name to search.'); return; }
  elements.error.hidden = true; elements.loading.hidden = false;
  try {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: query, count: 1, language: 'en', format: 'json' })}`);
    if (!response.ok) throw new Error('City search unavailable');
    const result = await response.json(); if (!result.results?.length) throw new Error('City not found');
    const city = result.results[0]; elements.latitude.value = city.latitude.toFixed(4); elements.longitude.value = city.longitude.toFixed(4);
    state.city = { name: [city.name, city.admin1, city.country].filter(Boolean).join(', '), latitude: city.latitude, longitude: city.longitude }; await loadWeather();
  } catch { showError('We could not find that city. Try a nearby city or check the spelling.'); }
  finally { elements.loading.hidden = true; }
}
async function loadWeather() {
  const latitude = Number(elements.latitude.value); const longitude = Number(elements.longitude.value);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) { showError('Please enter a valid latitude (-90 to 90) and longitude (-180 to 180).'); return; }
  elements.error.hidden = true; elements.loading.hidden = false;
  const params = new URLSearchParams({ latitude, longitude, current: 'temperature_2m,weather_code,wind_speed_10m', temperature_unit: 'celsius', wind_speed_unit: 'kmh' });
  try { const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`); if (!response.ok) throw new Error('Forecast unavailable'); state.weather = await response.json(); if (!state.city) state.city = { name: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`, latitude, longitude }; render(); elements.updated.textContent = 'Forecast updated just now'; }
  catch (error) { showError('We could not read that forecast. Check your coordinates or try again.'); }
  finally { elements.loading.hidden = true; }
}
function showError(message) { elements.error.textContent = message; elements.error.hidden = false; }
elements.form.addEventListener('submit', event => { event.preventDefault(); elements.citySearch.value.trim() ? searchCity() : loadWeather(); });
elements.loginButton.addEventListener('click', () => { elements.loginDialog.showModal(); elements.username.focus(); });
elements.cancelLogin.addEventListener('click', () => elements.loginDialog.close());
elements.loginForm.addEventListener('submit', event => { event.preventDefault(); setUser(elements.username.value); elements.loginDialog.close(); restoreFavorite(); if (state.city) loadWeather(); });
elements.favoriteButton.addEventListener('click', saveFavorite);
elements.logoutButton.addEventListener('click', () => { state.user = null; localStorage.removeItem(sessionKey); updateAccountUi(); });
document.querySelectorAll('.unit-button').forEach(button => button.addEventListener('click', () => { state.unit = button.dataset.unit; document.querySelectorAll('.unit-button').forEach(item => item.classList.toggle('is-active', item === button)); if (state.weather) render(); }));
restoreFavorite(); updateAccountUi();
loadWeather();
