const apiKey = 'ae0a26bef5bcb26a37dc6a59acfade6e';
const baseUrl = 'https://api.openweathermap.org/data/2.5/forecast';
const forecastContainer = document.getElementById('forecast-container');
const defaultLocation = {
    latitude: 28.6139,  // Delhi's latitude
    longitude: 77.2090  // Delhi's longitude
};
let isCelsius = true; // Default to Celsius
const cityInput = document.getElementById('cityInput');
const citySuggestions = document.getElementById('citySuggestions');

// function to fetch weather details
async function fetchWeatherData(latitude, longitude) {
    try {
        const response = await fetch(`${baseUrl}?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`);
        if (!response.ok) {
            throw new Error('Failed to fetch weather data');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching weather data:', error);
        return null;
    }
}

// function to display weather details
async function displayWeatherData() {
    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        const weatherData = await fetchWeatherData(position.coords.latitude, position.coords.longitude);
        const cityName = await fetchCityName(position.coords.latitude, position.coords.longitude);

        updateCityName(cityName); // Update the city name in the header
        displayForecast(weatherData);
    } catch (error) {
        const weatherData = await fetchWeatherData(defaultLocation.latitude, defaultLocation.longitude);
        const cityName = await fetchCityName(defaultLocation.latitude, defaultLocation.longitude);

        updateCityName(cityName); // Update the city name in the header
        displayForecast(weatherData);
    }
}

//function to update cityname
function updateCityName(cityName) {
    const cityNameElement = document.getElementById('city-name');
    cityNameElement.textContent = cityName;
}

//function to fetch city name
async function fetchCityName(latitude, longitude) {
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}`);
        if (!response.ok) {
            throw new Error('Failed to fetch city name');
        }
        const data = await response.json();
        return data.name;
    } catch (error) {
        console.error('Error fetching city name:', error);
        return 'Unknown';
    }
}

cityInput.addEventListener('input', async () => {
    const inputText = cityInput.value.trim();
    if (inputText.length >= 3) {
        const suggestions = await fetchCitySuggestions(inputText);
        displayCitySuggestions(suggestions);
    } else {
        citySuggestions.innerHTML = '';
    }
});

//function to fetch city name suggesstions so that user doesn't enter any wrong city name
async function fetchCitySuggestions(query) {
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/find?q=${query}&appid=${apiKey}`);
        if (!response.ok) {
            throw new Error('Failed to fetch city suggestions');
        }
        const data = await response.json();
        return data.list;
    } catch (error) {
        console.error('Error fetching city suggestions:', error);
        return [];
    }
}

//function to display suggestions
function displayCitySuggestions(suggestions) {
    citySuggestions.innerHTML = '';
    suggestions.forEach(city => {
        const option = document.createElement('option');
        option.value = city.name;
        citySuggestions.appendChild(option);
    });
}

//Main function that displays weather forecasts
function displayForecast(data) {
    forecastContainer.innerHTML = '';

    // Get the current day from the API data
    const currentDayData = data.list[0];
    const currentDayDate = new Date(currentDayData.dt * 1000);
    const currentDayName = currentDayDate.toLocaleDateString('en-US', { weekday: 'long' });

    if (!data || !data.list || data.list.length === 0) {
        const errorElement = document.createElement('div');
        errorElement.textContent = 'Error fetching weather data';
        forecastContainer.appendChild(errorElement);
        return;
    }

    const currentDate = new Date();
    const nextWeek = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const dailyForecasts = {};
    for (const dayData of data.list) {
        const date = new Date(dayData.dt * 1000);

        if (date <= nextWeek) {
            const options = { hour: 'numeric', minute: 'numeric', timeZoneName: 'short' };
            const time = date.toLocaleTimeString('en-US', options);
            const day = date.toLocaleDateString('en-US', { weekday: 'long' });

            if (!dailyForecasts[day]) {
                dailyForecasts[day] = [];
            }

            dailyForecasts[day].push({
                minTemp: dayData.main.temp_min,
                maxTemp: dayData.main.temp_max,
                icon: dayData.weather[0].icon,
                description: dayData.weather[0].description,
                humidity: dayData.main.humidity,
                windSpeed: dayData.wind.speed,
                date: date.toLocaleDateString('en-US'),
                time: time
            });
        }
    }

    for (const day in dailyForecasts) {
        const forecasts = dailyForecasts[day];
        const totalForecasts = forecasts.length;

        const avgMinTemp = forecasts.reduce((sum, forecast) => sum + forecast.minTemp, 0) / totalForecasts;
        const avgMaxTemp = forecasts.reduce((sum, forecast) => sum + forecast.maxTemp, 0) / totalForecasts;
        const avgHumidity = forecasts.reduce((sum, forecast) => sum + forecast.humidity, 0) / totalForecasts;
        const avgWindSpeed = forecasts.reduce((sum, forecast) => sum + forecast.windSpeed, 0) / totalForecasts;

        const iconUrl = `http://openweathermap.org/img/w/${forecasts[0].icon}.png`;

        const dayElement = document.createElement('div');
        dayElement.className = 'day';
        dayElement.innerHTML = `
            <h2>${day}</h2>
            <img src="${iconUrl}" alt="${forecasts[0].description}">
            <p>${forecasts[0].description}</p>
            <p class="temperature" data-temperature="${avgMinTemp.toFixed(1)}">${avgMinTemp.toFixed(1)} °C</p>
            <p>Humidity: ${forecasts[0].humidity}%</p>
            <p>Wind Speed: ${forecasts[0].windSpeed} m/s</p>
            <p>Date: ${forecasts[0].date}</p>
            <p>Time: ${forecasts[0].time}</p>
            <canvas id="temperatureChart${day}" width="200" height="100"></canvas>
        `;
        forecastContainer.appendChild(dayElement);

        createTemperatureChart(`temperatureChart${day}`, avgMinTemp, avgMaxTemp, avgHumidity, avgWindSpeed);
    }

    // Attach event listeners for toggling temperature after displaying the forecast
    attachTemperatureEventListeners();
}

//function to create charts
function createTemperatureChart(canvasId, minTemp, maxTemp, humidity, windSpeed) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Min Temp', 'Max Temp', 'Humidity', 'Wind Speed'],
            datasets: [
                {
                    label: 'Values',
                    data: [minTemp, maxTemp, humidity, windSpeed],
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderWidth: 2,
                    fill: false,
                },
            ],
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Values',
                    },
                },
                x: {
                    title: {
                        display: true,
                        text: 'Metrics',
                    },
                },
            },
        },
    });
}

//fucntion to toggle between temperature unit
function toggleTemperature(element, celsiusTemp) {
    const newTemp = isCelsius ? `${((celsiusTemp * 9/5) + 32).toFixed(1)} °F` : `${celsiusTemp.toFixed(1)} °C`;
    element.textContent = newTemp;
    isCelsius = !isCelsius;
}

document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('searchButton');
    searchButton.addEventListener('click', () => {
        const enteredCity = document.getElementById('cityInput').value;
        searchCityWeather(enteredCity);
    });

    initialize();
});

async function searchCityWeather(cityName) {
    if (cityName) {
        try {
            const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${apiKey}&units=metric`);
            if (!response.ok) {
                throw new Error('City not found');
            }
            const cityData = await response.json();

            const weatherData = await fetchWeatherData(cityData.coord.lat, cityData.coord.lon);
            updateCityName(cityData.name);
            displayForecast(weatherData);
        } catch (error) {
            console.error('Error fetching city weather data:', error);
        }
    }
}

function attachTemperatureEventListeners() {
    const temperatureElements = document.querySelectorAll('.temperature');

    temperatureElements.forEach(element => {
        const celsiusTemp = parseFloat(element.getAttribute('data-temperature'));

        element.addEventListener('click', () => {
            toggleTemperature(element, celsiusTemp);
        });
    });
}

async function initialize() {
    await displayWeatherData();
}

initialize();