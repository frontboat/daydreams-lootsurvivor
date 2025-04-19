import { extension, action, type Action } from "@daydreamsai/core";
import SwaggerParser from "@apidevtools/swagger-parser";
import { z } from "zod";
import fetch from "node-fetch";

// Async function to build an extension dynamically
export async function buildApiExtension(schemaUrl?: string) {
    // Use parse instead of validate to avoid strict validation
    // This will still parse the spec but won't validate against the OpenAPI schema
    const specSource = schemaUrl || '';
    const api = await SwaggerParser.parse(specSource) as any; // Swagger v2 or v3
    console.log('Parsed API Spec:', JSON.stringify(api, null, 2)); // Log the parsed spec

    const actions = Object.entries(api.paths).flatMap(([path, pathItemUntyped]) => { // Use intermediate untyped name
        const pathItem = pathItemUntyped as Record<string, any>; // Assert type here
        return Object.entries(pathItem).map(([method, operation]) => {
            // Skip non-HTTP methods like 'parameters' or 'servers' if present at path level
            if (!['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'].includes(method.toLowerCase())) {
                return null; // Skip this entry
            }

            const op = operation as any;
            const actionName = `${method.toUpperCase()} ${path}`;

            // Build input schema from parameters
            const paramShape: Record<string, any> = {};
            for (const p of op.parameters || []) {
                try {
                    const key = p.name.replace(/[^a-zA-Z0-9]/g, "_");
                    // Simplest mapping: all params as strings
                    paramShape[key] = z.string().optional();
                    if (p.required) paramShape[key] = z.string();
                } catch (error) {
                    // Skip parameters that cause issues
                    console.warn(`Warning: Skipping parameter ${p?.name} in ${actionName} due to parsing error`);
                }
            }

            // Create handler that accepts multiple arguments
            const handler = async (args: Record<string, any>, ctx?: any, agent?: any) => {
                // args contains the parameters passed to the action
                const call = args; // For compatibility with the previous implementation

                // Determine Server URL and potential base path
                let serverUrl: string | undefined;
                let pathPrefix = ''; // Store potential basePath from Swagger 2.0

                if (api.swagger === "2.0" && api.schemes && api.host) {
                    // Handle Swagger 2.0 spec
                    serverUrl = `${api.schemes[0]}://${api.host}`; // Base URL without basePath
                    pathPrefix = api.basePath || ''; // Store basePath separately
                    console.log(`Swagger 2.0 detected. Server URL: ${serverUrl}, Path Prefix: ${pathPrefix}`);
                } else {
                    // Try OpenAPI 3 server definitions (Op -> Path -> Root)
                    // These URLs might already include a base path
                    if (op.servers && op.servers[0]?.url) {
                        serverUrl = op.servers[0].url;
                        console.log(`Using OpenAPI 3 Server URL from Operation: ${serverUrl}`);
                    } else if (pathItem.servers && pathItem.servers[0]?.url) {
                        serverUrl = pathItem.servers[0].url;
                        console.log(`Using OpenAPI 3 Server URL from Path: ${serverUrl}`);
                    } else if (api.servers && api.servers[0]?.url) {
                        serverUrl = api.servers[0].url;
                        console.log(`Using OpenAPI 3 Server URL from Root: ${serverUrl}`);
                    } else {
                        // Fallback/Error case: No Swagger 2.0 info and no OpenAPI 3 servers found
                        console.error("Could not determine server URL. No Swagger 2.0 info or OpenAPI 3 servers defined.");
                        console.error("Parsed API structure parts:", JSON.stringify({ rootServers: api.servers, pathServers: pathItem.servers, opServers: op.servers, swaggerVersion: api.swagger, swaggerSchemes: api.schemes, swaggerHost: api.host, swaggerBasePath: api.basePath }, null, 2));
                        throw new Error(`Could not determine base URL for action ${actionName}`);
                    }
                }

                // Clean up serverUrl and pathPrefix (remove trailing/leading slashes)
                if (serverUrl) {
                    serverUrl = serverUrl.replace(/\/+$/, '');
                }
                pathPrefix = pathPrefix.replace(/^\/+/, '').replace(/\/+$/, '');
                const cleanedPath = path.replace(/^\/+/, ''); // Clean the original path too

                // Replace path parameters in the original path string
                let processedPathSegment = cleanedPath; // Start with the cleaned path segment
                for (const p of op.parameters || []) {
                    if (p.in === "path") {
                        const paramName = p.name;
                        const key = paramName.replace(/[^a-zA-Z0-9]/g, "_");
                        const val = call[key] ?? call[paramName];
                        if (val === undefined && p.required) {
                            console.warn(`Warning: Missing required path parameter ${paramName} for ${actionName}. Call:`, call);
                            // Decide how to handle missing required path param - throwing error is safer
                            throw new Error(`Missing required path parameter ${paramName} for action ${actionName}`);
                        } else if (val !== undefined) {
                            // No need to encode path params here, URL constructor handles it
                            processedPathSegment = processedPathSegment.replace(`{${paramName}}`, String(val));
                        } else {
                            // Optional path param missing...
                            console.warn(`Optional path parameter ${paramName} missing for ${actionName}, removing placeholder.`);
                            processedPathSegment = processedPathSegment.replace(`/{${paramName}}`, '').replace(`{${paramName}}`, '');
                        }
                    }
                }

                // Combine base URL, potential prefix, and processed path segment
                const finalPath = pathPrefix ? `/${pathPrefix}/${processedPathSegment}` : `/${processedPathSegment}`;
                // Use URL constructor to handle joining and encoding properly
                let urlObject = new URL(finalPath.replace(/\/\/+/g, '/'), serverUrl);

                // Build query string and add to URL search parameters
                for (const p of op.parameters || []) {
                    if (p.in === "query") {
                        const paramName = p.name;
                        const key = paramName.replace(/[^a-zA-Z0-9]/g, "_"); // Use the same key as in schema
                        const value = call[key] ?? call[paramName]; // Check both possible keys
                        if (value !== undefined) {
                            urlObject.searchParams.append(paramName, String(value));
                        } else if (p.required) {
                            console.warn(`Warning: Missing required query parameter ${paramName} for ${actionName}`);
                        }
                    }
                }

                // Use the final URL string from the URL object
                const finalUrl = urlObject.toString();

                try {
                    // console.log(`Calling API: ${finalUrl}`); // Optional: Add for debugging
                    const res = await fetch(finalUrl);
                    if (!res.ok) {
                        // Attempt to read error response body
                        let errorBody = '';
                        try {
                            errorBody = await res.text();
                        } catch (e) {
                            // Ignore if reading body fails
                        }
                        throw new Error(`${actionName} failed: ${res.status} ${res.statusText}. Body: ${errorBody}`);
                    }
                    // Handle cases where response might be empty or not JSON
                    const contentType = res.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        return res.json();
                    } else {
                        return res.text(); // Return as text if not JSON
                    }
                } catch (error: any) {
                    console.error(`Error in ${actionName} (${finalUrl}): ${error.message}`);
                    throw error; // Re-throw the original error
                }
            };

            // Create and return the action
            return action({
                name: actionName,
                description: op.summary,
                schema: z.object(paramShape),
                handler
            });
        });
    })
        .filter(action => action !== null) as Action<any, any, any, any, any, any>[]; // Filter out nulls and assert type

    return extension({ name: "api", actions });
}
