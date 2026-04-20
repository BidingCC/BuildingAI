import { tool } from "ai";
import { z } from "zod";

type SupportedLanguage = "zh" | "en" | "ja" | "ko";

function detectCityLanguage(city: string): SupportedLanguage {
    const normalized = city.trim();

    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(normalized)) {
        return "ja";
    }

    if (/[\uac00-\ud7af]/.test(normalized)) {
        return "ko";
    }

    if (/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(normalized)) {
        return "zh";
    }

    return "en";
}

async function fetchJsonWithRetry(
    url: string,
    options?: RequestInit,
    retries = 2,
    timeoutMs = 8000,
) {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error(`HTTP_${response.status}`);
                }

                return await response.json();
            } finally {
                clearTimeout(timeoutId);
            }
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError instanceof Error ? lastError : new Error("FETCH_FAILED");
}

async function geocodeCity(
    city: string,
): Promise<{ latitude: number; longitude: number; englishName: string } | null> {
    try {
        const language = detectCityLanguage(city);
        const data = await fetchJsonWithRetry(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=${language}`,
            {
                headers: {
                    "User-Agent": "buildingai/1.0 (buildingai@buildingai.com)",
                    Referer: "https://buildingai.com",
                },
            },
            1,
            6000,
        );

        if (!data?.results || data.results.length === 0) {
            return null;
        }

        const result = data.results[0];
        return {
            latitude: result.latitude,
            longitude: result.longitude,
            englishName: result.name || city,
        };
    } catch {
        return null;
    }
}

export const getWeather = tool({
    description:
        "Get the current weather for a specific location.Only use this tool when the user explicitly asks about weather conditions (e.g., temperature, forecast, rain, climate).Do NOT use this tool for general location-based queries such as tourist attractions, restaurants, travel guides, or city information.The input must be a clear weather-related query with either: - a city name, or - geographic coordinates.",
    inputSchema: z.object({
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        city: z
            .string()
            .describe("City name (e.g., 'San Francisco', 'New York', 'London')")
            .optional(),
    }),
    needsApproval: false,
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
