import React from "react";
import Mermaid from "mermaid";

// Ensure mermaid is initialized
Mermaid.initialize({
  startOnLoad: false,
  theme: "default",
});

const MermaidChart = ({ chart }: { chart: string }) => {
  const chartRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (chartRef.current) {
      Mermaid.render("mermaid-chart", chart, chartRef.current);
    }
  }, [chart]);

  return <div ref={chartRef} />;
};

export default MermaidChart;
