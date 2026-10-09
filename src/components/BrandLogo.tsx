import horizontal from "@/assets/spotterbro-logo-horizontal.svg.asset.json";
import vertical from "@/assets/spotterbro-logo-vertical.svg.asset.json";

export function BrandLogo({ stacked = false, className = "" }: { stacked?: boolean; className?: string }) {
  return <img src={stacked ? vertical.url : horizontal.url} alt="SpotterBro.ai" className={`block h-auto max-w-full object-contain ${className}`} />;
}