import { HttpClient } from "../core/http-client";
import type { HttpClientOptions } from "../core/types";

export function createHttpClient(options: HttpClientOptions = {}): HttpClient {
    return new HttpClient(options);
}
