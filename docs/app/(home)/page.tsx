"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility function for combining classnames
function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground font-mono">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Terminal />
        <Features />
        <QuickStart />
        <Examples />
        <Footer />
      </div>
    </main>
  );
}

function Terminal() {
  const [typedText, setTypedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [copied, setCopied] = useState(false);
  const fullText = "daydreams@ai:~$ ";
  const subtitle = "TypeScript framework for stateful AI agents";

  useEffect(() => {
    let i = 0;
    const typeInterval = setInterval(() => {
      if (i < fullText.length) {
        setTypedText(fullText.substring(0, i + 1));
        i++;
      } else {
        clearInterval(typeInterval);
      }
    }, 50);

    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);

    return () => {
      clearInterval(typeInterval);
      clearInterval(cursorInterval);
    };
  }, []);

  const handleCopyInstall = async () => {
    await navigator.clipboard.writeText("npm install @daydreamsai/core");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLLM = async () => {
    window.open("/llm.txt", "_blank");
  };

  return (
    <div className="mb-16">
      <div className="border border-border rounded-sm bg-card/50 backdrop-blur-sm p-8">
        <div className="mb-4 pb-4 border-b border-border">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-primary">NEW:</span>
            <span className="text-muted-foreground">
              x402 nanoservice enabled
            </span>
            <span className="text-muted-foreground">|</span>
            <Link
              href="/docs/tutorials/x402/server"
              className="text-primary hover:underline"
            >
              [view examples]
            </Link>
          </div>
        </div>
        <div className="space-y-4">
          <div className="text-2xl md:text-3xl font-bold text-foreground">
            {subtitle}
          </div>

          <div className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Build autonomous agents with persistent memory, type-safe actions,
            and seamless platform integration. Beyond chatbots.
          </div>

          <div className="mt-6 mb-4">
            <button
              onClick={handleCopyInstall}
              className="group flex items-center gap-3 px-4 py-3 bg-card border border-primary rounded-sm hover:bg-primary/10 transition-colors w-full max-w-md"
            >
              <span className="text-primary text-sm font-mono">$</span>
              <span className="text-foreground font-mono text-sm flex-1 text-left">
                npm install @daydreamsai/core
              </span>
              <span className="text-xs text-muted-foreground group-hover:text-primary">
                {copied ? "[copied]" : "[copy]"}
              </span>
            </button>
          </div>

          <div className="flex gap-4 pt-4">
            <Link
              href="/docs/core"
              className="text-primary hover:underline text-sm"
            >
              [docs]
            </Link>
            <Link
              href="/docs/tutorials"
              className="text-primary hover:underline text-sm"
            >
              [examples]
            </Link>
            <Link
              href="https://github.com/daydreamsai/daydreams"
              className="text-primary hover:underline text-sm"
            >
              [github]
            </Link>
            <button
              onClick={handleCopyLLM}
              className="text-primary hover:underline text-sm"
            >
              [llm.txt]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Features() {
  const features = [
    {
      label: "CONTEXTS",
      value: "Isolated state management",
      desc: "Each conversation maintains its own memory and state",
    },
    {
      label: "ACTIONS",
      value: "Type-safe operations",
      desc: "Define agent capabilities with full TypeScript support",
    },
    {
      label: "MEMORY",
      value: "Dual-tier persistence",
      desc: "Working memory for execution, long-term storage between sessions",
    },
    {
      label: "PLATFORMS",
      value: "Multi-channel support",
      desc: "Discord, Twitter, Telegram, CLI, web, and x402 nanoservices",
    },
  ];

  return (
    <div className="mb-16">
      <div className="text-xs text-muted-foreground mb-4">
        $ cat features.txt
      </div>
      <div className="border border-border rounded-sm bg-card/30 p-6">
        <div className="space-y-6">
          {features.map((feature, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-baseline gap-3">
                <span className="text-xs text-primary font-semibold min-w-[100px]">
                  [{feature.label}]
                </span>
                <span className="text-sm text-foreground">{feature.value}</span>
              </div>
              <div className="ml-[112px] text-xs text-muted-foreground">
                {feature.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuickStart() {
  return (
    <div className="mb-16">
      <div className="text-xs text-muted-foreground mb-4">$ cat agent.ts</div>
      <div className="border border-border rounded-sm bg-background overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
          <span className="text-xs text-muted-foreground">agent.ts</span>
        </div>
        <pre className="p-4 text-xs overflow-x-auto">
          <code>
            <span className="text-muted-foreground">
              // Minimal agent setup
            </span>
            {"\n"}
            <span className="text-primary">import</span>{" "}
            {"{ createDreams, context }"}{" "}
            <span className="text-primary">from</span>{" "}
            <span className="text-green-600">"@daydreamsai/core"</span>;{"\n"}
            <span className="text-primary">import</span> {"{ openai }"}{" "}
            <span className="text-primary">from</span>{" "}
            <span className="text-green-600">"@ai-sdk/openai"</span>;{"\n\n"}
            <span className="text-muted-foreground">
              // Define a context for conversations
            </span>
            {"\n"}
            <span className="text-primary">const</span> chatContext = context(
            {"{\n"}
            {"  "}type: <span className="text-green-600">"chat"</span>,{"\n"}
            {"  "}create: () {"=> ({ messages: [] })\n"}
            {"});\n\n"}
            <span className="text-muted-foreground">// Create your agent</span>
            {"\n"}
            <span className="text-primary">const</span> agent = createDreams(
            {"{\n"}
            {"  "}model: openai(<span className="text-green-600">"gpt-4o"</span>
            ),{"\n"}
            {"  "}contexts: [chatContext],{"\n"}
            {"  "}actions: [],{" "}
            <span className="text-muted-foreground">
              // Add custom actions here
            </span>
            {"\n"}
            {"  "}extensions: []{" "}
            <span className="text-muted-foreground">
              // Add platform extensions
            </span>
            {"\n"}
            {"});\n\n"}
            <span className="text-muted-foreground">// Send a message</span>
            {"\n"}
            <span className="text-primary">const</span> response ={" "}
            <span className="text-primary">await</span> agent.send(
            <span className="text-green-600">"Hello, agent!"</span>);{"\n"}
            console.log(response);
          </code>
        </pre>
      </div>
    </div>
  );
}

function Examples() {
  const examples = [
    { name: "discord-bot", desc: "Stateful Discord agent with memory" },
    { name: "x402-nanoservice", desc: "Autonomous nanoservice agents" },
    { name: "trading-agent", desc: "Portfolio tracking and execution" },
    { name: "multi-platform", desc: "Cross-platform deployment" },
  ];

  return (
    <div className="mb-16">
      <div className="text-xs text-muted-foreground mb-4">$ ls examples/</div>
      <div className="border border-border rounded-sm bg-card/30 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {examples.map((example, i) => (
            <div key={i} className="flex items-baseline gap-2 py-1">
              <span className="text-primary text-xs">→</span>
              <span className="text-sm text-foreground font-medium">
                {example.name}/
              </span>
              <span className="text-xs text-muted-foreground">
                {example.desc}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <Link
            href="/docs/tutorials"
            className="text-xs text-primary hover:underline"
          >
            $ cd tutorials/ →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  const providers = [
    "OpenAI",
    "Anthropic",
    "Groq",
    "Google",
    "Mistral",
    "DeepSeek",
  ];

  return (
    <div className="mt-16 pt-8 border-t border-border">
      <div className="text-xs text-muted-foreground mb-6">
        $ echo "Supported providers:"
      </div>
      <div className="flex flex-wrap gap-3 mb-4">
        {providers.map((provider) => (
          <span
            key={provider}
            className="text-xs px-2 py-1 border border-border rounded-sm text-muted-foreground hover:text-foreground hover:border-primary transition-colors cursor-default"
          >
            {provider}
          </span>
        ))}
      </div>
      <div className="text-xs text-muted-foreground mb-8">
        + all{" "}
        <Link
          href="https://sdk.vercel.ai/providers"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          AI SDK providers
        </Link>
      </div>

      <div className="flex items-center justify-between pt-8 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <span className="text-primary">daydreams@ai:~$</span> _
        </div>
        <div className="flex gap-4">
          <Link
            href="https://discord.gg/rt8ajxQvXh"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            [discord]
          </Link>
          <Link
            href="https://github.com/daydreamsai/daydreams"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            [github]
          </Link>
          <Link
            href="/docs/core"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            [start →]
          </Link>
        </div>
      </div>
    </div>
  );
}
