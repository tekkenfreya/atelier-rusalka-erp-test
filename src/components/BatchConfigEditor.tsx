import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator } from "lucide-react";

// Volume and quantity options per category (same as Procurement.tsx)
const MOISTURIZER_VOLUMES = [30, 40, 50, 60, 70, 100];
const CLEANSER_VOLUMES = [50, 100, 120, 150, 170, 200, 250];
const SERUM_VOLUMES = [10, 15, 20, 25, 30, 40, 50, 70];
const FOAMING_SHOWER_GEL_VOLUMES = [100, 150, 200, 250, 300, 400, 500];
const QUANTITY_OPTIONS = [50, 100, 200, 500, 1000, 10000];

export interface BatchConfig {
  moisturizerVolume: number;
  moisturizerQuantity: number;
  cleanserVolume: number;
  cleanserQuantity: number;
  serumVolume: number;
  serumQuantity: number;
  foamingShowerGelVolume: number;
  foamingShowerGelQuantity: number;
}

export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  moisturizerVolume: 50,
  moisturizerQuantity: 100,
  cleanserVolume: 150,
  cleanserQuantity: 100,
  serumVolume: 30,
  serumQuantity: 100,
  foamingShowerGelVolume: 250,
  foamingShowerGelQuantity: 100,
};

interface BatchConfigEditorProps {
  config: BatchConfig;
  onChange: (config: BatchConfig) => void;
}

interface CategoryRowProps {
  label: string;
  volumeOptions: number[];
  volume: number;
  quantity: number;
  onVolumeChange: (value: number) => void;
  onQuantityChange: (value: number) => void;
}

const CategoryRow = ({
  label,
  volumeOptions,
  volume,
  quantity,
  onVolumeChange,
  onQuantityChange,
}: CategoryRowProps) => (
  <div className="grid grid-cols-3 gap-2 items-center">
    <span className="text-sm font-medium truncate">{label}</span>
    <Select
      value={volume.toString()}
      onValueChange={(v) => onVolumeChange(parseInt(v))}
    >
      <SelectTrigger className="h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {volumeOptions.map((v) => (
          <SelectItem key={v} value={v.toString()}>
            {v} ml
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select
      value={quantity.toString()}
      onValueChange={(v) => onQuantityChange(parseInt(v))}
    >
      <SelectTrigger className="h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {QUANTITY_OPTIONS.map((q) => (
          <SelectItem key={q} value={q.toString()}>
            {q}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export const BatchConfigEditor = ({ config, onChange }: BatchConfigEditorProps) => {
  const updateConfig = (key: keyof BatchConfig, value: number) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="space-y-3 rounded-md border p-4 bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Calculator className="h-4 w-4" />
        Batch Configuration
      </div>
      <p className="text-xs text-muted-foreground">
        Configure production volumes and quantities to calculate the "Needed" amount for each ingredient.
      </p>

      {/* Header row */}
      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground font-medium">
        <span>Category</span>
        <span>Volume</span>
        <span>Quantity</span>
      </div>

      {/* Category rows */}
      <div className="space-y-2">
        <CategoryRow
          label="Moisturizer"
          volumeOptions={MOISTURIZER_VOLUMES}
          volume={config.moisturizerVolume}
          quantity={config.moisturizerQuantity}
          onVolumeChange={(v) => updateConfig("moisturizerVolume", v)}
          onQuantityChange={(q) => updateConfig("moisturizerQuantity", q)}
        />
        <CategoryRow
          label="Cleanser"
          volumeOptions={CLEANSER_VOLUMES}
          volume={config.cleanserVolume}
          quantity={config.cleanserQuantity}
          onVolumeChange={(v) => updateConfig("cleanserVolume", v)}
          onQuantityChange={(q) => updateConfig("cleanserQuantity", q)}
        />
        <CategoryRow
          label="Serum"
          volumeOptions={SERUM_VOLUMES}
          volume={config.serumVolume}
          quantity={config.serumQuantity}
          onVolumeChange={(v) => updateConfig("serumVolume", v)}
          onQuantityChange={(q) => updateConfig("serumQuantity", q)}
        />
        <CategoryRow
          label="Foaming Shower Gel"
          volumeOptions={FOAMING_SHOWER_GEL_VOLUMES}
          volume={config.foamingShowerGelVolume}
          quantity={config.foamingShowerGelQuantity}
          onVolumeChange={(v) => updateConfig("foamingShowerGelVolume", v)}
          onQuantityChange={(q) => updateConfig("foamingShowerGelQuantity", q)}
        />
      </div>
    </div>
  );
};

export default BatchConfigEditor;
