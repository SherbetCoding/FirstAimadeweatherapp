const API_BASE = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_BASE = "https://geocoding-api.open-meteo.com/v1/search";
const savedCityKey = "weather.lastCity";
const savedUnitKey = "weather.unit";

const state = {
  city: localStorage.getItem(savedCityKey) || "San Francisco",
  country: "",
  latitude: null,
  longitude: null,
  unit: localStorage.getItem(savedUnitKey) || "celsius",
  weather: null,
  view: "today"
};

const $ = (selector) => document.querySelector(selector);
const weatherCodes = {
  0: ["Clear sky", "☀", "☾"],
  1: ["Mostly clear", "🌤", "🌙"],
  2: ["Partly cloudy", "⛅", "☁"],
  3: ["Overcast", "☁", "☁"],
  45: ["Foggy", "🌫", "🌫"],
  48: ["Rime fog", "🌫", "🌫"],
  51: ["Light drizzle", "🌦", "🌧"],
  53: ["Drizzle", "🌦", "🌧"],
  55: ["Heavy drizzle", "🌧", "🌧"],
  56: ["Freezing drizzle", "🌧", "🌧"],
  57: ["Freezing drizzle", "🌧", "🌧"],
  61: ["Light rain", "🌦", "🌧"],
  63: ["Rain", "🌧", "🌧"],
  65: ["Heavy rain", "🌧", "🌧"],
  66: ["Freezing rain", "🌧", "🌧"],
  67: ["Freezing rain", "🌧", "🌧"],
  71: ["Light snow", "🌨", "🌨"],
  73: ["Snow", "🌨", "🌨"],
  75: ["Heavy snow", "❄", "❄"],
  77: ["Snow grains", "🌨", "🌨"],
  80: ["Light showers", "🌦", "🌧"],
  81: ["Showers", "🌧", "🌧"],
  82: ["Heavy showers", "🌧", "🌧"],
  85: ["Snow showers", "🌨", "🌨"],
  86: ["Heavy snow showers", "🌨", "🌨"],
  95: ["Thunderstorms", "⛈", "⛈"],
  96: ["Thunderstorms", "⛈", "⛈"],
  99: ["Thunderstorms", "⛈", "⛈"]
};

const compassDirections = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function weatherForCode(code, isDay = true) {
  const result = weatherCodes[code] || ["Unknown", "☁", "☁"];
  return { description: result[0], icon: isDay ? result[1] : result[2] };
}

function temperature(value) {
  if (!Number.isFinite(value)) return "--";
  const converted = state.unit === "fahrenheit" ? (value * 9) / 5 + 32 : value;
  return `${Math.round(converted)}°`;
}

function speed(value) {
  if (!Number.isFinite(value)) return "--";
  return Math.round(state.unit === "fahrenheit" ? value * 0.621371 : value);
}

function distance(meters) {
  if (!Number.isFinite(meters)) return "--";
  return (meters / 1000).toFixed(1);
}

function formatTime(dateString) {
  if (!dateString) return "--:--";
  const [hour, minute] = dateString.split("T")[1].split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

function showStatus(message = "") {
  const status = $("#status-message");
  status.textContent = message;
  status.hidden = !message;
}

async function findCity(query) {
  const params = new URLSearchParams({ name: query, count: "1", language: "en", format: "json" });
  const response = await fetch(`${GEOCODING_BASE}?${params}`);
  if (!response.ok) throw new Error("City search is unavailable right now. Please try again.");
  const data = await response.json();
  const place = data.results?.[0];
  if (!place) throw new Error(`We couldn't find “${query}”. Try another city name.`);
  return {
    city: place.name,
    country: place.country || "",
    latitude: place.latitude,
    longitude: place.longitude
  };
}

async function loadWeather(location = null) {
  const target = location || {
    city: state.city,
    country: state.country,
    latitude: state.latitude,
    longitude: state.longitude
  };

  showStatus("");
  $("#current-condition").textContent = "Updating conditions…";

  try {
    let resolved = target;
    if (!Number.isFinite(target.latitude) || !Number.isFinite(target.longitude)) {
      resolved = await findCity(target.city);
    }

    const params = new URLSearchParams({
      latitude: resolved.latitude,
      longitude: resolved.longitude,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,visibility,uv_index",
      hourly: "temperature_2m,precipitation_probability,weather_code",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max",
      forecast_days: "7",
      timezone: "auto"
    });
    const response = await fetch(`${API_BASE}?${params}`);
    if (!response.ok) throw new Error("Weather data is unavailable right now. Check your connection and try again.");
    const data = await response.json();
    if (!data.current || !data.daily || !data.hourly) {
      throw new Error("The weather service returned incomplete data. Please try again.");
    }

    state.city = resolved.city;
    state.country = resolved.country || "";
    state.latitude = resolved.latitude;
    state.longitude = resolved.longitude;
    state.weather = data;
    localStorage.setItem(savedCityKey, state.city);
    renderWeather(data);
  } catch (error) {
    $("#current-condition").textContent = "Weather unavailable";
    showStatus(error instanceof Error ? error.message : "Something went wrong while loading the weather.");
  }
}

function renderWeather(data) {
  const current = data.current;
  const daily = data.daily;
  const today = weatherForCode(current.weather_code, current.is_day === 1);
  const windDirection = compassDirections[Math.round(current.wind_direction_10m / 45) % 8];
  const uv = daily.uv_index_max?.[0];
  const uvLabel = !Number.isFinite(uv) ? "—" : uv < 3 ? "Low · Enjoy the outdoors" : uv < 6 ? "Moderate · Seek some shade" : uv < 8 ? "High · Wear sun protection" : "Very high · Extra sun protection";

  $("#breadcrumb-city").textContent = state.city;
  $("#location-name").textContent = state.city;
  $("#location-country").textContent = state.country ? `· ${state.country}` : "";
  $("#current-condition").textContent = today.description;
  $("#current-temp").innerHTML = `${temperature(current.temperature_2m).replace("°", "")}<span>°</span>`;
  $("#hero-weather-icon").textContent = today.icon;
  $("#feels-like").textContent = temperature(current.apparent_temperature);
  $("#high-low").textContent = `H: ${temperature(daily.temperature_2m_max?.[0])}  L: ${temperature(daily.temperature_2m_min?.[0])}`;
  $("#sunrise-time").textContent = formatTime(daily.sunrise?.[0]);
  $("#sunset-time").textContent = formatTime(daily.sunset?.[0]);
  $("#updated-time").textContent = `Updated ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date())}`;
  $("#wind-speed").textContent = speed(current.wind_speed_10m);
  $("#wind-unit").textContent = state.unit === "fahrenheit" ? "mph" : "km/h";
  $("#wind-direction").textContent = windDirection;
  $("#wind-arrow").style.transform = `rotate(${current.wind_direction_10m}deg)`;
  $("#humidity").textContent = Math.round(current.relative_humidity_2m);
  $("#humidity-meter").style.width = `${Math.max(0, Math.min(100, current.relative_humidity_2m))}%`;
  $("#uv-index").textContent = Number.isFinite(uv) ? Math.round(uv) : "--";
  $("#uv-caption").textContent = uvLabel;
  $("#visibility").textContent = distance(current.visibility);
  $("#today-date").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${daily.time[0]}T12:00:00`));
  $("#footer-location").innerHTML = `Weather for ${escapeHtml(state.city)} <span>✦</span>`;
  renderHourly(data);
  renderWeekly(data);
}

function renderHourly(data) {
  const container = $("#hourly-forecast");
  const currentHour = data.current.time.slice(0, 13);
  const startIndex = Math.max(0, data.hourly.time.findIndex((time) => time.slice(0, 13) >= currentHour));
  const entries = data.hourly.time
    .slice(startIndex, startIndex + 12)
    .map((time, offset) => ({ time, index: startIndex + offset }));

  container.replaceChildren(...entries.map(({ time, index }, itemIndex) => {
    const card = document.createElement("div");
    card.className = `hour-card${itemIndex === 0 ? " current-hour" : ""}`;
    const hour = Number(time.slice(11, 13));
    const isDay = hour >= 6 && hour < 19;
    const condition = weatherForCode(data.hourly.weather_code[index], isDay);
    const hourLabel = itemIndex === 0 ? "Now" : `${hour % 12 || 12}${hour < 12 ? "AM" : "PM"}`;
    card.innerHTML = `<span class="hour-time">${hourLabel}</span><span class="hour-icon">${condition.icon}</span><span class="hour-temp">${temperature(data.hourly.temperature_2m[index])}</span><span class="hour-rain">☂ ${data.hourly.precipitation_probability[index] ?? 0}%</span>`;
    return card;
  }));
}

function renderWeekly(data) {
  const container = $("#weekly-forecast");
  container.replaceChildren(...data.daily.time.map((date, index) => {
    const row = document.createElement("div");
    row.className = "day-row";
    const day = index === 0 ? "Today" : new Intl.DateTimeFormat(undefined, { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
    const condition = weatherForCode(data.daily.weather_code[index]);
    const rain = data.daily.precipitation_probability_max[index];
    row.innerHTML = `<span class="day-name">${day}</span><span class="day-icon">${condition.icon}</span><span class="day-condition">${condition.description}</span><span class="day-temps"><strong>${temperature(data.daily.temperature_2m_max[index])}</strong><span>${temperature(data.daily.temperature_2m_min[index])}</span></span><span class="day-rain">☂ ${rain ?? 0}%</span>`;
    return row;
  }));
}

function escapeHtml(text) {
  const element = document.createElement("span");
  element.textContent = text;
  return element.innerHTML;
}

function setView(view) {
  state.view = view;
  const isWeek = view === "week";
  $("#weekly-section").hidden = !isWeek;
  document.querySelectorAll("[data-view]").forEach((button) => {
    if (button.classList.contains("nav-item")) button.classList.toggle("active", button.dataset.view === view);
  });
  $("#breadcrumb-city").textContent = isWeek ? "7-day forecast" : state.city;
  if (isWeek) $("#weekly-section").scrollIntoView({ behavior: "smooth", block: "start" });
  else window.scrollTo({ top: 0, behavior: "smooth" });
}

$("#search-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = $("#city-search").value.trim();
  if (!query) {
    showStatus("Enter a city name to search.");
    return;
  }
  await loadWeather({ city: query, country: "", latitude: null, longitude: null });
  if (state.weather) $("#city-search").value = "";
});

document.querySelectorAll(".place-item").forEach((button) => {
  button.addEventListener("click", () => loadWeather({
    city: button.dataset.city,
    country: button.dataset.country,
    latitude: null,
    longitude: null
  }));
});

document.querySelectorAll(".unit-button").forEach((button) => {
  button.addEventListener("click", () => {
    state.unit = button.dataset.unit;
    localStorage.setItem(savedUnitKey, state.unit);
    document.querySelectorAll(".unit-button").forEach((unitButton) => {
      const selected = unitButton === button;
      unitButton.classList.toggle("selected", selected);
      unitButton.setAttribute("aria-pressed", String(selected));
    });
    if (state.weather) renderWeather(state.weather);
  });
});

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

$("#refresh-button").addEventListener("click", () => loadWeather());

$("#location-button").addEventListener("click", () => {
  if (!navigator.geolocation) {
    showStatus("Location services aren't available in this WebView.");
    return;
  }
  showStatus("Requesting your location…");
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => loadWeather({
      city: "Your location",
      country: "",
      latitude: coords.latitude,
      longitude: coords.longitude
    }),
    (error) => {
      const message = error.code === error.PERMISSION_DENIED
        ? "Location permission was denied. You can still search for a city."
        : "We couldn't get your location. Please try again or search for a city.";
      showStatus(message);
    },
    { enableHighAccuracy: false, timeout: 10000 }
  );
});

const unitButton = document.querySelector(`.unit-button[data-unit="${state.unit}"]`) || document.querySelector('.unit-button[data-unit="celsius"]');
unitButton.click();
$("#today-date").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${new Date().toISOString().slice(0, 10)}T12:00:00Z`));
loadWeather();
