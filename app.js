const state = {
    city: localStorage.getItem('weather-city') || 'Kabul',
    unit: localStorage.getItem('weather-unit') || 'celsius',
    payload: null,
    loading: false,
    suggestionController: null,
    suggestionRequestId: 0,
};

const weatherCodes = {
    0: { label: 'Clear sky', icon: '☀', theme: 'clear' },
    1: { label: 'Mostly clear', icon: '🌤', theme: 'clear' },
    2: { label: 'Partly cloudy', icon: '⛅', theme: 'clouds' },
    3: { label: 'Overcast', icon: '☁', theme: 'clouds' },
    45: { label: 'Fog', icon: '🌫', theme: 'mist' },
    48: { label: 'Depositing rime fog', icon: '🌫', theme: 'mist' },
    51: { label: 'Light drizzle', icon: '🌦', theme: 'rain' },
    53: { label: 'Drizzle', icon: '🌦', theme: 'rain' },
    55: { label: 'Dense drizzle', icon: '🌧', theme: 'rain' },
    56: { label: 'Freezing drizzle', icon: '🌧', theme: 'rain' },
    57: { label: 'Freezing drizzle', icon: '🌧', theme: 'rain' },
    61: { label: 'Light rain', icon: '🌧', theme: 'rain' },
    63: { label: 'Rain', icon: '🌧', theme: 'rain' },
    65: { label: 'Heavy rain', icon: '⛈', theme: 'storm' },
    66: { label: 'Freezing rain', icon: '⛈', theme: 'storm' },
    67: { label: 'Freezing rain', icon: '⛈', theme: 'storm' },
    71: { label: 'Light snow', icon: '❄', theme: 'snow' },
    73: { label: 'Snow', icon: '❄', theme: 'snow' },
    75: { label: 'Heavy snow', icon: '❄', theme: 'snow' },
    77: { label: 'Snow grains', icon: '❄', theme: 'snow' },
    80: { label: 'Rain showers', icon: '🌦', theme: 'rain' },
    81: { label: 'Rain showers', icon: '🌦', theme: 'rain' },
    82: { label: 'Heavy showers', icon: '⛈', theme: 'storm' },
    85: { label: 'Snow showers', icon: '❄', theme: 'snow' },
    86: { label: 'Heavy snow showers', icon: '❄', theme: 'snow' },
    95: { label: 'Thunderstorm', icon: '⛈', theme: 'storm' },
    96: { label: 'Thunderstorm with hail', icon: '⛈', theme: 'storm' },
    99: { label: 'Thunderstorm with hail', icon: '⛈', theme: 'storm' },
};

const page = document.body.dataset.page || 'home';
const counts = page === 'forecast'
    ? { hourly: 24, daily: 7 }
    : { hourly: 6, daily: 4 };

const elements = {
    form: document.getElementById('city-form'),
    input: document.getElementById('city-input'),
    status: document.getElementById('status-message'),
    suggestions: document.getElementById('suggestions-panel'),
    city: document.getElementById('current-city'),
    location: document.getElementById('location-meta'),
    date: document.getElementById('current-date'),
    temp: document.getElementById('current-temp'),
    feelsLike: document.getElementById('feels-like-value'),
    label: document.getElementById('weather-label'),
    icon: document.getElementById('weather-icon'),
    humidity: document.getElementById('humidity-value'),
    wind: document.getElementById('wind-value'),
    pressure: document.getElementById('pressure-value'),
    visibility: document.getElementById('visibility-value'),
    sunrise: document.getElementById('sunrise-value'),
    sunset: document.getElementById('sunset-value'),
    hourly: document.getElementById('hourly-list'),
    daily: document.getElementById('daily-list'),
    celsius: document.getElementById('celsius-toggle'),
    fahrenheit: document.getElementById('fahrenheit-toggle'),
};

function getWeatherInfo(code) {
    return weatherCodes[code] || { label: 'Unknown conditions', icon: '⛅', theme: 'clear' };
}

function getUnitLabel() {
    return state.unit === 'fahrenheit' ? 'F' : 'C';
}

function convertTemp(value) {
    return state.unit === 'fahrenheit' ? (value * 9) / 5 + 32 : value;
}

function convertSpeed(value) {
    return state.unit === 'fahrenheit' ? value * 0.621371 : value;
}

function convertDistance(value) {
    return state.unit === 'fahrenheit' ? value / 1609.344 : value / 1000;
}

function formatTemperature(value) {
    return `${Math.round(value)}°${getUnitLabel()}`;
}

function formatSpeed(value) {
    return `${Math.round(value)} ${state.unit === 'fahrenheit' ? 'mph' : 'km/h'}`;
}

function formatDistance(value) {
    return `${convertDistance(value).toFixed(1)} ${state.unit === 'fahrenheit' ? 'mi' : 'km'}`;
}

function formatTime(value) {
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value));
}

function formatDay(value) {
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
    }).format(new Date(value));
}

function setStatus(message) {
    if (elements.status) {
        elements.status.textContent = message;
    }
}

function setLoading(loading) {
    state.loading = loading;
    if (elements.form) {
        const button = elements.form.querySelector('button[type="submit"]');
        if (button) {
            button.disabled = loading;
            button.textContent = loading ? 'Loading...' : (page === 'forecast' ? 'Update forecast' : 'Search weather');
        }
    }
}

function hideSuggestions() {
    if (elements.suggestions) {
        elements.suggestions.hidden = true;
        elements.suggestions.innerHTML = '';
    }
}

function showSuggestions(results) {
    if (!elements.suggestions) {
        return;
    }

    if (!results.length) {
        hideSuggestions();
        return;
    }

    elements.suggestions.hidden = false;
    elements.suggestions.innerHTML = results.map(result => {
        const primary = [result.name, result.admin1].filter(Boolean).join(', ');
        const secondary = [result.country, result.timezone].filter(Boolean).join(' • ');
        return `
            <button type="button" class="suggestion-item" data-suggestion-name="${(result.name || '').replace(/\"/g, '&quot;')}" data-suggestion-admin1="${(result.admin1 || '').replace(/\"/g, '&quot;')}" data-suggestion-country="${(result.country || '').replace(/\"/g, '&quot;')}" data-suggestion-lat="${result.latitude}" data-suggestion-lon="${result.longitude}">
                <span>
                    <span class="suggestion-title">${primary}</span>
                    <span class="suggestion-meta block">${secondary}</span>
                </span>
                <span class="suggestion-meta">${result.admin1 || result.country || 'Location'}</span>
            </button>
        `;
    }).join('');

    elements.suggestions.querySelectorAll('[data-suggestion-name]').forEach(button => {
        button.addEventListener('click', () => {
            const location = {
                name: button.getAttribute('data-suggestion-name') || state.city,
                admin1: button.getAttribute('data-suggestion-admin1') || '',
                country: button.getAttribute('data-suggestion-country') || '',
                latitude: Number(button.getAttribute('data-suggestion-lat')),
                longitude: Number(button.getAttribute('data-suggestion-lon')),
            };
            const label = [location.name, location.admin1, location.country].filter(Boolean).join(', ');
            if (elements.input) {
                elements.input.value = location.name;
            }
            hideSuggestions();
            loadWeatherByCoordinates(location, label);
        });
    });
}

function syncUnitButtons() {
    if (!elements.celsius || !elements.fahrenheit) {
        return;
    }

    const isCelsius = state.unit === 'celsius';
    elements.celsius.classList.toggle('unit-button-active', isCelsius);
    elements.fahrenheit.classList.toggle('unit-button-active', !isCelsius);
    elements.celsius.setAttribute('aria-pressed', String(isCelsius));
    elements.fahrenheit.setAttribute('aria-pressed', String(!isCelsius));
}

function applyTheme(code) {
    const theme = getWeatherInfo(code).theme;
    document.body.dataset.weatherTheme = theme;
}

function getLocationLabel(location) {
    const parts = [location.name, location.admin1, location.country].filter(Boolean);
    return parts.join(', ');
}

async function geocodeCity(city) {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    if (!response.ok) {
        throw new Error('Location lookup failed.');
    }

    const data = await response.json();
    const location = data.results?.[0];
    if (!location) {
        throw new Error(`No results found for ${city}.`);
    }

    return location;
}

async function fetchCitySuggestions(query) {
    const requestId = ++state.suggestionRequestId;

    if (state.suggestionController) {
        state.suggestionController.abort();
    }

    const controller = new AbortController();
    state.suggestionController = controller;

    try {
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`, {
            signal: controller.signal,
        });

        if (requestId !== state.suggestionRequestId) {
            return;
        }

        if (!response.ok) {
            throw new Error('Suggestion lookup failed.');
        }

        const data = await response.json();
        showSuggestions(data.results || []);
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            return;
        }

        hideSuggestions();
    }
}

async function fetchWeather(location) {
    const params = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        timezone: 'auto',
        forecast_days: '7',
        current_weather: 'true',
        hourly: 'temperature_2m,apparent_temperature,relativehumidity_2m,pressure_msl,visibility,windspeed_10m,weathercode',
        daily: 'weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset',
    });

    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!response.ok) {
        throw new Error('Forecast lookup failed.');
    }

    return response.json();
}

async function fetchWeatherByCoordinates(location) {
    const params = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        timezone: 'auto',
        forecast_days: '7',
        current_weather: 'true',
        hourly: 'temperature_2m,apparent_temperature,relativehumidity_2m,pressure_msl,visibility,windspeed_10m,weathercode',
        daily: 'weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset',
    });

    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!response.ok) {
        throw new Error('Forecast lookup failed.');
    }

    return response.json();
}

function getCurrentHourIndex(times, currentTime) {
    const exactIndex = times.indexOf(currentTime);
    if (exactIndex >= 0) {
        return exactIndex;
    }

    const currentDate = new Date(currentTime).getTime();
    let closestIndex = 0;
    let smallestGap = Number.POSITIVE_INFINITY;

    times.forEach((time, index) => {
        const gap = Math.abs(new Date(time).getTime() - currentDate);
        if (gap < smallestGap) {
            smallestGap = gap;
            closestIndex = index;
        }
    });

    return closestIndex;
}

function renderCurrent(location, data) {
    const current = data.current_weather;
    const currentInfo = getWeatherInfo(current.weathercode);
    const hourly = data.hourly;
    const currentIndex = getCurrentHourIndex(hourly.time, current.time);
    const humidity = hourly.relativehumidity_2m[currentIndex];
    const pressure = hourly.pressure_msl[currentIndex];
    const visibility = hourly.visibility[currentIndex];
    const feelsLike = hourly.apparent_temperature[currentIndex];

    state.payload = { location, data, currentIndex };

    if (elements.city) {
        elements.city.textContent = location.name;
    }

    if (elements.location) {
        elements.location.textContent = getLocationLabel(location);
    }

    if (elements.date) {
        elements.date.textContent = new Date(current.time).toLocaleString('en-US', {
            weekday: 'long',
            hour: 'numeric',
            minute: '2-digit',
            month: 'short',
            day: 'numeric',
        });
    }

    if (elements.temp) {
        elements.temp.textContent = formatTemperature(convertTemp(current.temperature));
    }

    if (elements.feelsLike) {
        elements.feelsLike.textContent = formatTemperature(convertTemp(feelsLike));
    }

    if (elements.label) {
        elements.label.textContent = currentInfo.label;
    }

    if (elements.icon) {
        elements.icon.textContent = currentInfo.icon;
    }

    if (elements.humidity) {
        elements.humidity.textContent = `${humidity}%`;
    }

    if (elements.wind) {
        elements.wind.textContent = formatSpeed(convertSpeed(current.windspeed));
    }

    if (elements.pressure) {
        elements.pressure.textContent = `${Math.round(pressure)} hPa`;
    }

    if (elements.visibility) {
        elements.visibility.textContent = formatDistance(visibility);
    }

    if (elements.sunrise) {
        elements.sunrise.textContent = formatTime(data.daily.sunrise[0]);
    }

    if (elements.sunset) {
        elements.sunset.textContent = formatTime(data.daily.sunset[0]);
    }

    applyTheme(current.weathercode);
}

function renderHourly(data) {
    if (!elements.hourly) {
        return;
    }

    const currentIndex = state.payload?.currentIndex ?? 0;
    const limit = counts.hourly;
    const items = data.hourly.time.slice(currentIndex, currentIndex + limit);

    elements.hourly.innerHTML = items.map((time, offset) => {
        const index = currentIndex + offset;
        const code = data.hourly.weathercode[index];
        const info = getWeatherInfo(code);
        const temperature = formatTemperature(convertTemp(data.hourly.temperature_2m[index]));
        const humidity = data.hourly.relativehumidity_2m[index];
        return `
            <article class="forecast-card">
                <time>${formatTime(time)}</time>
                <div class="temperature">${temperature}</div>
                <div class="meta">${info.icon} ${info.label}</div>
                <div class="meta">Humidity ${humidity}%</div>
            </article>
        `;
    }).join('');
}

function renderDaily(data) {
    if (!elements.daily) {
        return;
    }

    elements.daily.innerHTML = data.daily.time.slice(0, counts.daily).map((time, index) => {
        const info = getWeatherInfo(data.daily.weathercode[index]);
        const high = formatTemperature(convertTemp(data.daily.temperature_2m_max[index]));
        const low = formatTemperature(convertTemp(data.daily.temperature_2m_min[index]));
        return `
            <article class="day-card">
                <div>
                    <time>${formatDay(time)}</time>
                    <strong>${info.label}</strong>
                    <div class="meta">${info.icon}</div>
                </div>
                <div class="text-right">
                    <div class="temperature">${high}</div>
                    <div class="meta">Low ${low}</div>
                </div>
            </article>
        `;
    }).join('');
}

function renderData(location, data) {
    renderCurrent(location, data);
    renderHourly(data);
    renderDaily(data);
    syncUnitButtons();
    localStorage.setItem('weather-city', state.city);
    localStorage.setItem('weather-unit', state.unit);
}

async function loadWeather(city) {
    const trimmedCity = city.trim();
    if (!trimmedCity) {
        setStatus('Enter a city name to load weather.');
        return;
    }

    const searchTerm = trimmedCity.split(',')[0].trim();

    try {
        setLoading(true);
        setStatus(`Loading live weather for ${searchTerm}...`);
        const location = await geocodeCity(searchTerm);
        const data = await fetchWeatherByCoordinates(location);
        state.city = searchTerm;
        if (elements.input) {
            elements.input.value = searchTerm;
        }
        renderData(location, data);
        setStatus(`Showing live weather for ${getLocationLabel(location)}.`);
    } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Unable to load weather right now.');
    } finally {
        setLoading(false);
    }
}

async function loadWeatherByCoordinates(location, cityLabel) {
    try {
        setLoading(true);
        setStatus(`Loading live weather for ${cityLabel || getLocationLabel(location)}...`);
        const data = await fetchWeatherByCoordinates(location);
        state.city = location.name;
        if (elements.input) {
            elements.input.value = location.name;
        }
        renderData(location, data);
        setStatus(`Showing live weather for ${getLocationLabel(location)}.`);
    } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Unable to load weather right now.');
    } finally {
        setLoading(false);
    }
}

function bindEvents() {
    if (elements.form) {
        elements.form.addEventListener('submit', event => {
            event.preventDefault();
            loadWeather(elements.input?.value || state.city);
        });
    }

    if (elements.input) {
        let debounceId = null;

        elements.input.addEventListener('input', () => {
            const query = elements.input.value.trim();

            if (debounceId) {
                window.clearTimeout(debounceId);
            }

            if (query.length < 2) {
                hideSuggestions();
                return;
            }

            debounceId = window.setTimeout(() => {
                fetchCitySuggestions(query);
            }, 250);
        });

        elements.input.addEventListener('focus', () => {
            const query = elements.input.value.trim();
            if (query.length >= 2) {
                fetchCitySuggestions(query);
            }
        });

        elements.input.addEventListener('blur', () => {
            window.setTimeout(() => hideSuggestions(), 150);
        });
    }

    if (elements.suggestions) {
        elements.suggestions.addEventListener('mousedown', event => {
            event.preventDefault();
        });
    }

    document.querySelectorAll('[data-city]').forEach(button => {
        button.addEventListener('click', () => {
            const city = button.getAttribute('data-city') || state.city;
            if (elements.input) {
                elements.input.value = city;
            }
            loadWeather(city);
        });
    });

    if (elements.celsius) {
        elements.celsius.addEventListener('click', () => {
            if (state.unit === 'celsius') {
                return;
            }
            state.unit = 'celsius';
            if (state.payload) {
                renderData(state.payload.location, state.payload.data);
            }
        });
    }

    if (elements.fahrenheit) {
        elements.fahrenheit.addEventListener('click', () => {
            if (state.unit === 'fahrenheit') {
                return;
            }
            state.unit = 'fahrenheit';
            if (state.payload) {
                renderData(state.payload.location, state.payload.data);
            }
        });
    }
}

async function init() {
    bindEvents();
    syncUnitButtons();

    if (elements.input) {
        elements.input.value = state.city;
    }

    await loadWeather(state.city);
}

document.addEventListener('DOMContentLoaded', init);