const { openrouter } = require("@openrouter/ai-sdk-provider");

const model = openrouter("google/gemini-2.5-pro");
console.log("Provider:", model.provider);
console.log("Model ID:", model.modelId);
console.log("Provider ID:", model.providerId);
console.log("All properties:", Object.keys(model));