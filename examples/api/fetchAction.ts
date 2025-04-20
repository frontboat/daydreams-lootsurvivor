import {
    action,
    http,
    type ActionCallContext,
    type AnyAgent,
    type AnyContext,
    type MaybePromise
} from "@daydreamsai/core";
import { z } from "zod";

// Re-introduce responseType, default to 'text'
const fetchInputSchema = z.object({
    url: z.string().url("Must provide a valid URL."),
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]).default("GET"),
    headers: z.record(z.string()).optional().describe("Optional HTTP headers."),
    // Allow arrays (of string/number/boolean) as values in params record
    params: z.record(z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.union([z.string(), z.number(), z.boolean()]))
    ])).optional().describe("Optional query parameters. Values can be strings, numbers, booleans, or arrays of these."),
    body: z.any().optional().describe("Optional request body for methods like POST, PUT, PATCH."),
    responseType: z.enum(["text", "json"]).default("text").describe("Desired response handling: 'text' returns raw text, 'json' attempts to parse JSON and returns the object.")
});

// Define more flexible output schema
const fetchSuccessOutputSchema = z.object({
    ok: z.literal(true),
    status: z.number(),
    data: z.any().describe("Parsed JSON object (if responseType='json' and successful) or raw text body (if responseType='text')."),
});

const fetchErrorOutputSchema = z.object({
    ok: z.literal(false),
    status: z.number().optional().describe("HTTP status code, if available."),
    error: z.string().describe("Description of the error (network error, HTTP error, JSON parsing error).")
});

const fetchOutputSchema = z.union([fetchSuccessOutputSchema, fetchErrorOutputSchema]);

// Define a single object schema for the 'returns' field
const fetchActionReturnsSchema = z.object({
    ok: z.boolean().describe("Indicates if the request was successful."),
    status: z.number().optional().describe("HTTP status code."),
    data: z.any().optional().describe("Response data (JSON or text) on success."),
    error: z.string().optional().describe("Error message on failure.")
});

// Infer types
type FetchInput = z.infer<typeof fetchInputSchema>;
type FetchOutput = z.infer<typeof fetchOutputSchema>;

export const fetchAction = action({
    name: "fetch",
    description: "Fetches content from a URL. Returns {ok: true, status, data} on HTTP success (data is text or parsed JSON based on responseType), or {ok: false, status?, error} on failure.",
    schema: fetchInputSchema,
    returns: fetchActionReturnsSchema,
    handler: async (
        args: FetchInput,
        ctx,
        agent
    ): Promise<FetchOutput> => {
        const { url, method, headers, params, body, responseType } = args;

        const options: any = {
            method,
            headers,
            ...(body && ["POST", "PUT", "PATCH"].includes(method) ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
            params,
        };

        let res: Response;
        try {
            res = await http.request(url, options);
        } catch (error: any) {
            console.error(`Fetch action network error for URL: ${url}`, error);
            return {
                ok: false,
                error: `Network Error: ${error.message || "An unknown network error occurred."}`
            };
        }

        const responseText = await res.text();

        if (!res.ok) {
            console.error(`Fetch action HTTP error for URL: ${url}. Status: ${res.status}`);
            return {
                ok: false,
                status: res.status,
                error: `HTTP Error ${res.status} ${res.statusText}. Body: ${responseText}`
            };
        }

        // Handle success case
        if (responseType === 'json') {
            try {
                const jsonData = JSON.parse(responseText);
                return {
                    ok: true,
                    status: res.status,
                    data: jsonData
                };
            } catch (parseError: any) {
                console.error(`Fetch action JSON parsing error for URL: ${url}`, parseError);
                return {
                    ok: false,
                    status: res.status, // Still include status as HTTP request was ok
                    error: `JSON Parsing Error: ${parseError.message}. Raw text: ${responseText}`
                };
            }
        } else {
            // responseType is 'text'
            return {
                ok: true,
                status: res.status,
                data: responseText
            };
        }
    },
}); 