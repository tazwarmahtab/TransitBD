import { useState } from "react";
import { Card } from "./card";
import { Toggle } from "./toggle";
import { TransportType } from "@shared/schema";
import { Bus, Train, Car } from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ReactNode> = {
  'BUS': <Bus className="h-4 w-4" />,
  'TRAIN': <Train className="h-4 w-4" />,
  'CNG': <Car className="h-4 w-4" />,
};

interface MapLegendProps {
  transportTypes: TransportType[];
  onToggleMode: (type: string) => void;
  activeTypes: string[];
}

export function MapLegend({ transportTypes, onToggleMode, activeTypes }: MapLegendProps) {
  return (
    <Card className="absolute right-4 top-24 p-4 bg-background/40 backdrop-blur-sm border shadow-lg">
      <div className="space-y-2">
        <h3 className="font-medium text-sm mb-3">Modes</h3>
        <div className="flex flex-col gap-2">
          {transportTypes.map((type) => (
            <Toggle
              key={type.id}
              pressed={activeTypes.includes(type.name)}
              onPressedChange={() => onToggleMode(type.name)}
              size="sm"
              aria-label={`Toggle ${type.name}`}
              className="flex items-center gap-2 w-full justify-start"
            >
              {iconMap[type.name]}
              <span className="text-xs">{type.name}</span>
            </Toggle>
          ))}
        </div>
      </div>
    </Card>
  );
}