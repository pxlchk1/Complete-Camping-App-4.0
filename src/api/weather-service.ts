/**
 * Weather Service using Vibecode's Google API
 *
 * IMPORTANT: This service fetches REAL weather data for user safety.
 * Inaccurate weather information can cause serious harm to campers.
 */

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_VIBECODE_GOOGLE_API_KEY;

export interface WeatherData {
  current: {
    temp: number;
    condition: string;
    icon: string;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
  };
  forecast: Array<{
    date: string;
    day: string;
    high: number;
    low: number;
    condition: string;
    icon: string;
    precipitation: number;
  }>;
}

/**
 * Fetch current weather and 5-day forecast for a location using Open-Meteo (free, no API key needed)
 */
export async function fetchWeather(latitude: number, longitude: number): Promise<WeatherData> {
  try {
    // Use Open-Meteo API - free, no API key required, accurate data
    // Documentation: https://open-meteo.com/en/docs
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=5`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    // Process current weather
    const current = {
      temp: Math.round(data.current.temperature_2m),
      condition: getWeatherCondition(data.current.weather_code),
      icon: getWeatherCondition(data.current.weather_code),
      feelsLike: Math.round(data.current.apparent_temperature),
      humidity: data.current.relative_humidity_2m,
      windSpeed: Math.round(data.current.wind_speed_10m),
    };

    // Process 5-day forecast
    const forecast = data.daily.time.map((date: string, index: number) => {
      const dateObj = new Date(date);
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

      return {
        date: date,
        day: index === 0 ? "Today" : index === 1 ? "Tomorrow" : dayNames[dateObj.getDay()],
        high: Math.round(data.daily.temperature_2m_max[index]),
        low: Math.round(data.daily.temperature_2m_min[index]),
        condition: getWeatherCondition(data.daily.weather_code[index]),
        icon: getWeatherCondition(data.daily.weather_code[index]),
        precipitation: data.daily.precipitation_probability_max[index] || 0,
      };
    });

    return {
      current,
      forecast,
    };
  } catch (error) {
    console.error("Error fetching weather data:", error);
    throw error;
  }
}

/**
 * Map WMO Weather codes to conditions
 * Source: https://open-meteo.com/en/docs
 */
function getWeatherCondition(code: number): string {
  if (code === 0) return "Clear";
  if (code === 1 || code === 2) return "Partly Cloudy";
  if (code === 3) return "Cloudy";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain Showers";
  if (code >= 85 && code <= 86) return "Snow Showers";
  if (code >= 95 && code <= 99) return "Thunderstorm";
  return "Clear";
}

