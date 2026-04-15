'use strict';


const API_KEY = 'c17487f1a29e86d7c702d4b8a30176c6';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const MAX_HIST = 8;
const HIST_KEY = 'atmos_history';
const THEME_KEY = 'atmos_theme';
const UNIT_KEY = 'atmos_unit';

let currentUnit = localStorage.getItem(UNIT_KEY) || 'C';
let lastData = null;
let clockTimer = null;
let lightningTimer = null;

const $ = id => document.getElementById(id);
const $$ = sel => document.querySelector(sel);

const appBody = $('appBody');
const cityInput = $('cityInput');
const searchBtn = $('searchBtn');
const locateBtn = $('locateBtn');
const errorBox = $('errorBox');
const errorText = $('errorText');
const loader = $('loader');
const weatherDisplay = $('weatherDisplay');
const histSection = $('histSection');
const histList = $('histList');
const clearBtn = $('clearBtn');
const themeBtn = $('themeBtn');
const themeIco = $('themeIco');
const btnC = $('btnC');
const btnF = $('btnF');


const dispCity = $('dispCity');
const dispTime = $('dispTime');
const dispDate = $('dispDate');
const dispIcon = $('dispIcon');
const dispTemp = $('dispTemp');
const dispUnit = $('dispUnit');
const dispCond = $('dispCond');
const dispFeels = $('dispFeels');
const dispHumidity = $('dispHumidity');
const dispWind = $('dispWind');
const dispVisib = $('dispVisib');
const dispPressure = $('dispPressure');
const dispSunrise = $('dispSunrise');
const dispSunset = $('dispSunset');
const arcMarker = $('arcMarker');


const weatherCanvas = $('weatherCanvas');
const starsLayer = $('starsLayer');
const rainLayer = $('rainLayer');
const snowLayer = $('snowLayer');
const cloudsLayer = $('cloudsLayer');
const sunWrap = $('sunWrap');
const moonWrap = $('moonWrap');
const lightningWrap = $('lightningWrap');
const glassOverlay = $('glassOverlay');


async function fetchByCity(city) {
               const url = `${BASE_URL}?q=${encodeURIComponent(city.trim())}&appid=${API_KEY}&units=metric`;
               return apiFetch(url);
}

async function fetchByCoords(lat, lon) {
               const url = `${BASE_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
               return apiFetch(url);
}

async function apiFetch(url) {
               let res;
               try {
                              res = await fetch(url);
               } catch {
                              throw new Error('Network error — check your internet connection.');
               }

               if (!res.ok) {
                              if (res.status === 404) throw new Error('City not found. Please check the spelling.');
                              if (res.status === 401) throw new Error('Invalid API key. Check script.js config.');
                              if (res.status === 429) throw new Error('Too many requests. Wait a moment and retry.');
                              throw new Error(`API error (${res.status}). Please try again.`);
               }
               return res.json();
}



async function handleSearch(cityOverride) {
               const city = (cityOverride !== undefined ? cityOverride : cityInput.value).trim();
               if (!city) {
                              showError('Please enter a city name.');
                              cityInput.focus();
                              return;
               }

               setLoading(true);
               hideError();

               try {
                              const data = await fetchByCity(city);
                              lastData = data;
                              renderWeather(data);
                              addToHistory(data.name);
               } catch (err) {
                              showError(err.message);
                              hide(weatherDisplay);
               } finally {
                              setLoading(false);
               }
}

function renderWeather(data) {
               const { name, sys, main, weather, wind, timezone, visibility: vis } = data;
               const condition = weather[0].main;
               const isNight = isNightTime(sys.sunrise, sys.sunset, timezone);


               dispCity.textContent = `${name}, ${sys.country}`;


               dispDate.textContent = formatDate(timezone);


               startCityClock(timezone);


               dispIcon.src = `https://openweathermap.org/img/wn/${weather[0].icon}@2x.png`;
               dispIcon.alt = weather[0].description;


               renderTemp(main.temp, main.feels_like);


               dispCond.textContent = weather[0].description;


               dispHumidity.textContent = `${main.humidity}%`;
               dispWind.textContent = `${Math.round(wind.speed * 3.6)} km/h`;
               dispVisib.textContent = vis ? `${(vis / 1000).toFixed(1)} km` : 'N/A';
               dispPressure.textContent = `${main.pressure} hPa`;

               dispSunrise.textContent = formatUnixTime(sys.sunrise, timezone);
               dispSunset.textContent = formatUnixTime(sys.sunset, timezone);
               animateSunArc(sys.sunrise, sys.sunset, timezone);

               show(weatherDisplay);
               reAnimate(weatherDisplay, 'fade-in 0.5s ease both');


               applyWeatherTheme(condition, isNight);
}


function renderTemp(tempC, feelsC) {
               if (currentUnit === 'C') {
                              dispTemp.textContent = Math.round(tempC);
                              dispUnit.textContent = '°C';
                              dispFeels.textContent = `Feels like ${Math.round(feelsC)}°C`;
               } else {
                              const tempF = cToF(tempC);
                              const feelsF = cToF(feelsC);
                              dispTemp.textContent = Math.round(tempF);
                              dispUnit.textContent = '°F';
                              dispFeels.textContent = `Feels like ${Math.round(feelsF)}°F`;
               }
}


function applyWeatherTheme(condition, isNight) {

               clearAllLayers();

               const c = condition.toLowerCase();


               const classes = ['weather-default', 'weather-clear-day', 'weather-clear-night',
                              'weather-cloudy', 'weather-rain', 'weather-snow', 'weather-storm', 'weather-mist'];
               appBody.classList.remove(...classes);

               if (c === 'clear') {
                              if (isNight) {
                                             appBody.classList.add('weather-clear-night');
                                             showLayer(starsLayer); buildStars(80);
                                             showLayer(moonWrap);
                              } else {
                                             appBody.classList.add('weather-clear-day');
                                             showLayer(sunWrap);
                              }
               } else if (c === 'clouds') {
                              appBody.classList.add('weather-cloudy');
                              showLayer(cloudsLayer);
                              if (isNight) { showLayer(starsLayer); buildStars(30); }
               } else if (c === 'drizzle' || c === 'rain') {
                              appBody.classList.add('weather-rain');
                              showLayer(rainLayer); buildRain(120);
                              showLayer(cloudsLayer);
                              glassOverlay.style.opacity = '1';
                              if (isNight) { showLayer(starsLayer); buildStars(15); }
               } else if (c === 'thunderstorm') {
                              appBody.classList.add('weather-storm');
                              showLayer(rainLayer); buildRain(180);
                              showLayer(cloudsLayer);
                              showLayer(lightningWrap); startLightning();
                              glassOverlay.style.opacity = '1';
               } else if (c === 'snow') {
                              appBody.classList.add('weather-snow');
                              showLayer(snowLayer); buildSnow(80);
                              if (isNight) { showLayer(starsLayer); buildStars(20); }
               } else if (['mist', 'smoke', 'haze', 'dust', 'fog', 'sand', 'ash', 'squall', 'tornado'].includes(c)) {
                              appBody.classList.add('weather-mist');
                              showLayer(cloudsLayer);
               } else {
                              appBody.classList.add('weather-default');
                              if (isNight) { showLayer(starsLayer); buildStars(60); showLayer(moonWrap); }
                              else showLayer(sunWrap);
               }
}


function showLayer(el) { el.style.opacity = '1'; }
function hideLayer(el) { el.style.opacity = '0'; }

function clearAllLayers() {
               hideLayer(starsLayer); starsLayer.innerHTML = '';
               hideLayer(rainLayer); rainLayer.innerHTML = '';
               hideLayer(snowLayer); snowLayer.innerHTML = '';
               hideLayer(cloudsLayer);
               hideLayer(sunWrap);
               hideLayer(moonWrap);
               hideLayer(lightningWrap);
               glassOverlay.style.opacity = '0';
               if (lightningTimer) { clearInterval(lightningTimer); lightningTimer = null; }
}


function buildStars(count) {
               const frag = document.createDocumentFragment();
               for (let i = 0; i < count; i++) {
                              const s = document.createElement('div');
                              s.className = 'star';
                              const size = Math.random() * 2.5 + 0.5;
                              s.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      top:${Math.random() * 70}%;
      --dur:${(Math.random() * 3 + 1.5).toFixed(1)}s;
      --delay:-${(Math.random() * 4).toFixed(1)}s;
    `;
                              frag.appendChild(s);
               }
               starsLayer.appendChild(frag);
}


function buildRain(count) {
               const frag = document.createDocumentFragment();
               for (let i = 0; i < count; i++) {
                              const d = document.createElement('div');
                              d.className = 'raindrop';
                              const h = Math.random() * 18 + 8;
                              d.style.cssText = `
      left:${Math.random() * 100}%;
      height:${h}px;
      opacity:${Math.random() * 0.5 + 0.3};
      --dur:${(Math.random() * 0.5 + 0.55).toFixed(2)}s;
      --delay:-${(Math.random() * 1.5).toFixed(2)}s;
    `;
                              frag.appendChild(d);
               }
               rainLayer.appendChild(frag);
}


function buildSnow(count) {
               const flakes = ['❄', '❅', '❆', '*', '•'];
               const frag = document.createDocumentFragment();
               for (let i = 0; i < count; i++) {
                              const f = document.createElement('div');
                              f.className = 'snowflake';
                              const sz = Math.random() * 12 + 8;
                              const drift = (Math.random() * 80 - 40).toFixed(0);
                              f.style.cssText = `
      left:${Math.random() * 100}%;
      --sz:${sz}px;
      font-size:${sz}px;
      --dur:${(Math.random() * 5 + 4).toFixed(1)}s;
      --delay:-${(Math.random() * 8).toFixed(1)}s;
      --drift:${drift}px;
    `;
                              f.textContent = flakes[Math.floor(Math.random() * flakes.length)];
                              frag.appendChild(f);
               }
               snowLayer.appendChild(frag);
}


function startLightning() {
               const bolts = lightningWrap.querySelectorAll('.bolt');

               bolts.forEach((b, i) => {
                              b.style.setProperty('--flash-dur', `${(Math.random() * 5 + 5).toFixed(1)}s`);
                              b.style.setProperty('--flash-delay', `${(Math.random() * 3).toFixed(1)}s`);
                              b.style.left = `${10 + i * 40 + Math.random() * 20}%`;
               });
}




function animateSunArc(srUnix, ssUnix, tzOffset) {
               if (!arcMarker) return;
               const nowUnix = Date.now() / 1000;
               const t = Math.min(1, Math.max(0, (nowUnix - srUnix) / (ssUnix - srUnix)));

               // Quadratic bezier: P0=(10,75) P1=(100,-20) P2=(190,75)
               const x = (1 - t) * (1 - t) * 10 + 2 * (1 - t) * t * 100 + t * t * 190;
               const y = (1 - t) * (1 - t) * 75 + 2 * (1 - t) * t * (-20) + t * t * 75;

               arcMarker.setAttribute('cx', x.toFixed(1));
               arcMarker.setAttribute('cy', y.toFixed(1));
}


function setUnit(unit) {
               currentUnit = unit;
               localStorage.setItem(UNIT_KEY, unit);
               btnC.classList.toggle('active', unit === 'C');
               btnF.classList.toggle('active', unit === 'F');
               dispUnit.textContent = unit === 'C' ? '°C' : '°F';

               if (lastData) {
                              renderTemp(lastData.main.temp, lastData.main.feels_like);
               }
}


function loadHistory() {
               try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); }
               catch { return []; }
}
function saveHistory(arr) { localStorage.setItem(HIST_KEY, JSON.stringify(arr)); }

function addToHistory(city) {
               let h = loadHistory().filter(c => c.toLowerCase() !== city.toLowerCase());
               h.unshift(city);
               if (h.length > MAX_HIST) h = h.slice(0, MAX_HIST);
               saveHistory(h);
               renderHistory();
}

function clearHistory() {
               localStorage.removeItem(HIST_KEY);
               renderHistory();
}

function renderHistory() {
               const h = loadHistory();
               histList.innerHTML = '';

               if (!h.length) { hide(histSection); return; }
               show(histSection);

               h.forEach((city, i) => {
                              const btn = document.createElement('button');
                              btn.className = 'hist-chip';
                              btn.style.animationDelay = `${i * 0.04}s`;
                              btn.innerHTML = `<span class="chip-dot"></span>${city}`;
                              btn.addEventListener('click', () => {
                                             cityInput.value = city;
                                             handleSearch(city);
                              });
                              histList.appendChild(btn);
               });
}


function handleGeolocation() {
               if (!navigator.geolocation) {
                              showError('Geolocation is not supported by your browser.');
                              return;
               }
               setLoading(true); hideError();
               locateBtn.disabled = true;

               navigator.geolocation.getCurrentPosition(
                              async pos => {
                                             try {
                                                            const data = await fetchByCoords(pos.coords.latitude, pos.coords.longitude);
                                                            lastData = data;
                                                            cityInput.value = data.name;
                                                            renderWeather(data);
                                                            addToHistory(data.name);
                                             } catch (err) {
                                                            showError(err.message);
                                                            hide(weatherDisplay);
                                             } finally {
                                                            setLoading(false);
                                                            locateBtn.disabled = false;
                                             }
                              },
                              err => {
                                             setLoading(false);
                                             locateBtn.disabled = false;
                                             if (err.code === 1) showError('Location denied — please allow access in your browser settings.');
                                             else showError('Unable to get your location. Try searching manually.');
                              },
                              { timeout: 12000 }
               );
}


function applyTheme(mode) {
               if (mode === 'light') {
                              appBody.classList.add('light-mode');
                              themeIco.innerHTML = `<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="currentColor" stroke="none"/>`;
               } else {
                              appBody.classList.remove('light-mode');
                              themeIco.innerHTML = `<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>`;
               }
}

function toggleTheme() {
               const isLight = appBody.classList.contains('light-mode');
               const next = isLight ? 'dark' : 'light';
               localStorage.setItem(THEME_KEY, next);
               applyTheme(next);
}


function show(el) { el.style.display = ''; }
function hide(el) { el.style.display = 'none'; }

function setLoading(on) {
               if (on) {
                              show(loader);
                              hide(weatherDisplay);
                              searchBtn.disabled = true;
                              searchBtn.innerHTML = `<svg class="spin-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" style="animation:spin 0.8s linear infinite"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Loading…`;
               } else {
                              hide(loader);
                              searchBtn.disabled = false;
                              searchBtn.innerHTML = `Search <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
               }
}

function showError(msg) {
               errorText.textContent = msg;
               show(errorBox);
               reAnimate(errorBox, 'shake 0.4s ease');
}
function hideError() { hide(errorBox); }

function reAnimate(el, animation) {
               el.style.animation = 'none';
               void el.offsetWidth;
               el.style.animation = animation;
}


function isNightTime(srUnix, ssUnix, tzOffset) {
               const nowLocal = Date.now() / 1000 + tzOffset;
               const srLocal = srUnix + tzOffset;
               const ssLocal = ssUnix + tzOffset;
               // Get time-of-day in seconds
               const tod = nowLocal % 86400;
               const srTod = srLocal % 86400;
               const ssTod = ssLocal % 86400;
               return tod < srTod || tod > ssTod;
}

function formatDate(tzOffset) {
               const nowUtcMs = Date.now();
               const localDate = new Date(nowUtcMs + tzOffset * 1000);
               return localDate.toLocaleDateString('en-GB', {
                              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                              timeZone: 'UTC'
               });
}

function formatUnixTime(unix, tzOffset) {
               const d = new Date((unix + tzOffset) * 1000);
               const hh = d.getUTCHours();
               const mm = String(d.getUTCMinutes()).padStart(2, '0');
               return `${hh % 12 || 12}:${mm} ${hh >= 12 ? 'PM' : 'AM'}`;
}


function startCityClock(tzOffset) {
               if (clockTimer) clearInterval(clockTimer);

               const tick = () => {
                              const d = new Date(Date.now() + tzOffset * 1000);
                              const hh = d.getUTCHours();
                              const mm = String(d.getUTCMinutes()).padStart(2, '0');
                              const ss = String(d.getUTCSeconds()).padStart(2, '0');
                              const ampm = hh >= 12 ? 'PM' : 'AM';
                              dispTime.textContent = `${hh % 12 || 12}:${mm}:${ss} ${ampm}`;
               };

               tick();
               clockTimer = setInterval(tick, 1000);
}


function cToF(c) { return c * 9 / 5 + 32; }




searchBtn.addEventListener('click', () => handleSearch());


cityInput.addEventListener('keydown', e => {
               if (e.key === 'Enter') handleSearch();
});


cityInput.addEventListener('input', () => {
               if (errorBox.style.display !== 'none') hideError();
});


locateBtn.addEventListener('click', handleGeolocation);


clearBtn.addEventListener('click', clearHistory);


themeBtn.addEventListener('click', toggleTheme);


btnC.addEventListener('click', () => setUnit('C'));
btnF.addEventListener('click', () => setUnit('F'));



function init() {

               const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
               applyTheme(savedTheme);


               const savedUnit = localStorage.getItem(UNIT_KEY) || 'C';
               setUnit(savedUnit);


               renderHistory();


               cityInput.focus();

               buildStars(60);
               showLayer(starsLayer);
}

init();