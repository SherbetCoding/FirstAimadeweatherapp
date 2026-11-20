# Weather App

A Windows WPF weather app that displays its interface through Microsoft Edge WebView2.

## Prerequisites

- Windows
- [.NET 10 SDK](https://dotnet.microsoft.com/download) to build and run the app
- [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) to run it

## Run

From the project root:

```powershell
dotnet run
```

Weather and city-search data are provided by [Open-Meteo](https://open-meteo.com/) and do not require an API key.

## Main interactions

- Search for a city by name and press Enter.
- Select a saved place, or use **Use my location** for geolocation-based weather.
- Switch between **Today** and the **7-day forecast**.
- Change between Celsius and Fahrenheit with the °C/°F control.
- Use the refresh button to update the current weather.
