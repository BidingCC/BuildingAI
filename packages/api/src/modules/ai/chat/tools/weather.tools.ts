import { tool } from "ai";
import { z } from "zod";

async function geocodeCity(
    city: string,
): Promise<{ latitude: number; longitude: number; englishName: string } | null> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1&accept-language=en`,
        );

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            return null;
        }

        const result = data[0];
        return {
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            englishName: result.display_name.split(",")[0] || city,
        };
    } catch {
        return null;
    }
}

export const getWeather = tool({
    description:
        "Get the current weather at a location. You can provide either coordinates or a city name.",
    inputSchema: z.object({
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        city: z
            .string()
            .describe("City name (e.g., 'San Francisco', 'New York', 'London')")
            .optional(),
    }),
    needsApproval: true,
    execute: async (input) => {
        let latitude: number;
        let longitude: number;
        let englishCityName: string | undefined;

        if (input.city) {
            const coords = await geocodeCity(input.city);
            if (!coords) {
                return {
                    error: `Could not find coordinates for "${input.city}". Please check the city name.`,
                };
            }
            latitude = coords.latitude;
            longitude = coords.longitude;
            englishCityName = coords.englishName;
        } else if (input.latitude !== undefined && input.longitude !== undefined) {
            latitude = input.latitude;
            longitude = input.longitude;
        } else {
            return {
                error: "Please provide either a city name or both latitude and longitude coordinates.",
            };
        }

        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
        );

        const weatherData = await response.json();

        if (englishCityName) {
            weatherData.cityName = englishCityName;
        }

        return weatherData;
    },
});
