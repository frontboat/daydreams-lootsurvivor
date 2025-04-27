import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  anthropic,
  anthropicModels,
  google,
  googleModels,
  groq,
  groqModels,
  openai,
  openaiModels,
  openrouter,
  openrouterModels,
} from "@/agent/models";
import { SelectProps } from "@radix-ui/react-select";
import { LanguageModelV1 } from "ai";

export function getModel(modelName: string) {
  if (modelName === "default") return undefined;

  let model: LanguageModelV1 | undefined = undefined;

  if (openaiModels.includes(modelName)) {
    model = openai(modelName);
  }

  if (anthropicModels.includes(modelName)) {
    model = anthropic(modelName);
  }

  if (groqModels.includes(modelName)) {
    model = groq(modelName);
  }

  if (openrouterModels.includes(modelName)) {
    model = openrouter(modelName);
  }

  if (googleModels.includes(modelName)) {
    model = google(modelName);
  }

  return model;
}

export function ModelSelect(props: SelectProps) {
  return (
    <Select {...props}>
      <SelectTrigger className="w-[200px] h-auto px-6 py-2 mr-auto border-0 focus:ring-0">
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="default">Default</SelectItem>
        <SelectGroup>
          <SelectLabel>OpenAI</SelectLabel>
          {openaiModels.map((model) => (
            <SelectItem value={model} key={model}>
              {model}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Anthropic</SelectLabel>
          {anthropicModels.map((model) => (
            <SelectItem value={model} key={model}>
              {model}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Groq</SelectLabel>
          {groqModels.map((model) => (
            <SelectItem value={model} key={model}>
              {model}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Google</SelectLabel>
          {googleModels.map((model) => (
            <SelectItem value={model} key={model}>
              {model}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>OpenRouter</SelectLabel>
          {openrouterModels.map((model) => (
            <SelectItem value={model} key={model}>
              {model}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
