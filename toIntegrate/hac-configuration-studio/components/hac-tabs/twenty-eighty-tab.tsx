"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Info, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import type { HAC2080Config } from "@/lib/types/hac-config"

interface TwentyEightyTabProps {
  config: HAC2080Config
  onChange: (updated: HAC2080Config) => void
}

export function TwentyEightyTab({ config, onChange }: TwentyEightyTabProps) {
  const [newSignalType, setNewSignalType] = useState("")
  const [newWeightingKey, setNewWeightingKey] = useState("")
  const [newWeightingValue, setNewWeightingValue] = useState("1.0")

  const handleAddSignalType = () => {
    if (!newSignalType.trim()) return
    const upperType = newSignalType.trim().toUpperCase()
    if (config.preferred_signal_types.includes(upperType)) return
    onChange({
      ...config,
      preferred_signal_types: [...config.preferred_signal_types, upperType],
    })
    setNewSignalType("")
  }

  const handleRemoveSignalType = (type: string) => {
    onChange({
      ...config,
      preferred_signal_types: config.preferred_signal_types.filter((t) => t !== type),
    })
  }

  const handleAddWeighting = () => {
    if (!newWeightingKey.trim()) return
    const upperKey = newWeightingKey.trim().toUpperCase()
    onChange({
      ...config,
      signal_weighting: {
        ...config.signal_weighting,
        [upperKey]: Number.parseFloat(newWeightingValue) || 1.0,
      },
    })
    setNewWeightingKey("")
    setNewWeightingValue("1.0")
  }

  const handleRemoveWeighting = (key: string) => {
    const { [key]: _, ...rest } = config.signal_weighting
    onChange({
      ...config,
      signal_weighting: rest,
    })
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          These settings control the 20/80 summary panel in Clinical Review, determining which findings and signals are
          highlighted.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Findings Configuration</CardTitle>
          <CardDescription>Control how many findings are displayed and extracted</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="max_findings">Maximum Findings</Label>
            <Input
              id="max_findings"
              type="number"
              min="1"
              max="10"
              value={config.max_findings}
              onChange={(e) => onChange({ ...config, max_findings: Number.parseInt(e.target.value) || 1 })}
            />
            <p className="text-xs text-muted-foreground">Number of top findings to display (1-10, default: 5)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="min_confidence">Minimum Confidence</Label>
            <div className="flex items-center gap-4">
              <Slider
                id="min_confidence"
                min={50}
                max={95}
                step={5}
                value={[config.min_confidence * 100]}
                onValueChange={([value]) => onChange({ ...config, min_confidence: value / 100 })}
                className="flex-1"
              />
              <span className="w-16 text-sm font-medium">{(config.min_confidence * 100).toFixed(0)}%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum confidence threshold for findings (0.5-0.95, default: 0.70)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="extraction_strategy">Extraction Strategy</Label>
            <Select
              value={config.extraction_strategy}
              onValueChange={(value: "top_k" | "threshold" | "hybrid") =>
                onChange({ ...config, extraction_strategy: value })
              }
            >
              <SelectTrigger id="extraction_strategy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top_k">Top K</SelectItem>
                <SelectItem value="threshold">Threshold</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">How to select which findings to display</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Signal Type Preferences</CardTitle>
          <CardDescription>Preferred signal types to highlight in findings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Preferred Signal Types</Label>
            <div className="flex flex-wrap gap-2">
              {config.preferred_signal_types.map((type) => (
                <Badge key={type} variant="secondary" className="gap-1">
                  {type}
                  <button onClick={() => handleRemoveSignalType(type)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., DEVICE, LAB, VITAL"
                value={newSignalType}
                onChange={(e) => setNewSignalType(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleAddSignalType()}
              />
              <Button onClick={handleAddSignalType} variant="outline" size="sm">
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Signal types to prioritize (e.g., DEVICE, LAB, VITAL, MEDICATION)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Signal Weighting</CardTitle>
          <CardDescription>Adjust importance of different signal types</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Weight Multipliers</Label>
            <div className="space-y-2">
              {Object.entries(config.signal_weighting).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <Badge variant="outline" className="w-32">
                    {key}
                  </Badge>
                  <Input
                    type="number"
                    step="0.1"
                    value={value}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        signal_weighting: {
                          ...config.signal_weighting,
                          [key]: Number.parseFloat(e.target.value) || 1.0,
                        },
                      })
                    }
                    className="w-24"
                  />
                  <Button onClick={() => handleRemoveWeighting(key)} variant="ghost" size="sm">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Signal type"
                value={newWeightingKey}
                onChange={(e) => setNewWeightingKey(e.target.value.toUpperCase())}
                className="flex-1"
              />
              <Input
                type="number"
                step="0.1"
                placeholder="Weight"
                value={newWeightingValue}
                onChange={(e) => setNewWeightingValue(e.target.value)}
                className="w-24"
              />
              <Button onClick={handleAddWeighting} variant="outline" size="sm">
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Multiplier for each signal type (1.0 = normal, &gt;1.0 = higher priority)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
