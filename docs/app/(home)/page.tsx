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

  return (
    <div className="mb-16">
      <div className="border border-border rounded-sm bg-card/50 backdrop-blur-sm p-8">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border">
          <span className="w-3 h-3 rounded-full bg-destructive/80"></span>
          <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
          <span className="w-3 h-3 rounded-full bg-green-500/80"></span>
          <span className="ml-auto text-xs text-muted-foreground">terminal</span>
        </div>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <span className="text-primary">{typedText}</span>
            <span className={cn(
              "inline-block w-2 h-4 bg-primary ml-1",
              showCursor ? "opacity-100" : "opacity-0"
            )}></span>
          </div>
          
          <div className="text-2xl md:text-3xl font-bold text-foreground mt-6">
            {subtitle}
          </div>
          
          <div className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Build autonomous agents with persistent memory, type-safe actions, 
            and seamless platform integration. Beyond chatbots.
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
      desc: "Each conversation maintains its own memory and state"
    },
    {
      label: "ACTIONS",
      value: "Type-safe operations",
      desc: "Define agent capabilities with full TypeScript support"
    },
    {
      label: "MEMORY",
      value: "Dual-tier persistence",
      desc: "Working memory for execution, long-term storage between sessions"
    },
    {
      label: "PLATFORMS",
      value: "Multi-channel support",
      desc: "Discord, Twitter, Telegram, CLI, and web interfaces"
    }
  ];

  return (
    <div className="mb-16">
      <div className="text-xs text-muted-foreground mb-4">$ cat features.txt</div>
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
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText("npm install @daydreamsai/core");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-16">
      <div className="text-xs text-muted-foreground mb-4">$ vim quickstart.ts</div>
      <div className="border border-border rounded-sm bg-background overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
          <span className="text-xs text-muted-foreground">quickstart.ts</span>
          <button
            onClick={handleCopy}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? "[copied]" : "[copy]"}
          </button>
        </div>
        <pre className="p-4 text-xs overflow-x-auto">
          <code>
            <span className="text-muted-foreground"># Install</span>{"\n"}
            <span className="text-primary">$</span> npm install @daydreamsai/core{"\n\n"}
            
            <span className="text-muted-foreground"># Create agent</span>{"\n"}
            <span className="text-primary">import</span> {"{ createDreams, context }"} <span className="text-primary">from</span> <span className="text-green-600">"@daydreamsai/core"</span>;{"\n"}
            <span className="text-primary">import</span> {"{ openai }"} <span className="text-primary">from</span> <span className="text-green-600">"@ai-sdk/openai"</span>;{"\n\n"}
            
            <span className="text-primary">const</span> agent = createDreams({"{\n"}
            {"  "}model: openai(<span className="text-green-600">"gpt-4o"</span>),{"\n"}
            {"  "}contexts: [context({"{\n"}
            {"    "}type: <span className="text-green-600">"chat"</span>,{"\n"}
            {"    "}create: () {"=> ({ messages: [] })\n"}
            {"  "}{"})],\n"}
            {"});\n\n"}
            
            <span className="text-primary">await</span> agent.send(<span className="text-green-600">"Hello, agent!"</span>);
          </code>
        </pre>
      </div>
    </div>
  );
}

function Examples() {
  const examples = [
    { name: "discord-bot", desc: "Stateful Discord agent with memory" },
    { name: "trading-agent", desc: "Portfolio tracking and execution" },
    { name: "customer-support", desc: "Knowledge base integration" },
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
    "OpenAI", "Anthropic", "Groq", "Google", "Mistral", "DeepSeek"
  ];

  return (
    <div className="mt-16 pt-8 border-t border-border">
      <div className="text-xs text-muted-foreground mb-6">
        $ echo "Supported providers:"
      </div>
      <div className="flex flex-wrap gap-3 mb-8">
        {providers.map((provider) => (
          <span 
            key={provider} 
            className="text-xs px-2 py-1 border border-border rounded-sm text-muted-foreground hover:text-foreground hover:border-primary transition-colors cursor-default"
          >
            {provider}
          </span>
        ))}
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
