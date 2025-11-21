"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2, Info } from "lucide-react"
import type { HACFieldMapping } from "@/lib/types/hac-config"

interface MappingsTabProps {
  mappings: HACFieldMapping[]
  onChange: (updated: HACFieldMapping[]) => void
}

export function MappingsTab({ mappings, onChange }: MappingsTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMapping, setEditingMapping] = useState<HACFieldMapping | null>(null)
  const [currentTab, setCurrentTab] = useState<"signal" | "criterion">("signal")

  const signalMappings = mappings.filter((m) => m.mapping_type === "signal")
  const criterionMappings = mappings.filter((m) => m.mapping_type === "criterion")

  const handleOpenDialog = (mapping?: HACFieldMapping) => {
    if (mapping) {
      setEditingMapping(mapping)
      setCurrentTab(mapping.mapping_type)
    } else {
      setEditingMapping({
        mapping_id: `mapping-${Date.now()}`,
        mapping_type: currentTab,
        source_key: "",
        display_label: "",
        category: "",
        validation_rules: null,
      })
    }
    setDialogOpen(true)
  }

  const handleSaveMapping = (mapping: HACFieldMapping) => {
    const existingIndex = mappings.findIndex((m) => m.mapping_id === mapping.mapping_id)
    if (existingIndex >= 0) {
      onChange(mappings.map((m, i) => (i === existingIndex ? mapping : m)))
    } else {
      onChange([...mappings, mapping])
    }
    setDialogOpen(false)
    setEditingMapping(null)
  }

  const handleDeleteMapping = (mappingId: string) => {
    onChange(mappings.filter((m) => m.mapping_id !== mappingId))
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Field mappings provide human-friendly labels for signals and criteria used in the Case View. These labels
          appear in Clinical Review and suggested questions.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Field Mappings</CardTitle>
              <CardDescription>Configure display labels for signals and criteria</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Mapping
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as "signal" | "criterion")}>
            <TabsList className="mb-4">
              <TabsTrigger value="signal">
                Signals{" "}
                <Badge variant="secondary" className="ml-2">
                  {signalMappings.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="criterion">
                Criteria{" "}
                <Badge variant="secondary" className="ml-2">
                  {criterionMappings.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signal">
              <MappingTable mappings={signalMappings} onEdit={handleOpenDialog} onDelete={handleDeleteMapping} />
            </TabsContent>

            <TabsContent value="criterion">
              <MappingTable mappings={criterionMappings} onEdit={handleOpenDialog} onDelete={handleDeleteMapping} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <MappingDialog
        open={dialogOpen}
        mapping={editingMapping}
        onClose={() => {
          setDialogOpen(false)
          setEditingMapping(null)
        }}
        onSave={handleSaveMapping}
      />
    </div>
  )
}

interface MappingTableProps {
  mappings: HACFieldMapping[]
  onEdit: (mapping: HACFieldMapping) => void
  onDelete: (mappingId: string) => void
}

function MappingTable({ mappings, onEdit, onDelete }: MappingTableProps) {
  if (mappings.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No mappings configured. Click "Add Mapping" to create one.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source Key</TableHead>
            <TableHead>Display Label</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Validation Rules</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mappings.map((mapping) => (
            <TableRow key={mapping.mapping_id}>
              <TableCell className="font-mono text-sm">{mapping.source_key}</TableCell>
              <TableCell>{mapping.display_label}</TableCell>
              <TableCell>{mapping.category && <Badge variant="outline">{mapping.category}</Badge>}</TableCell>
              <TableCell>
                {mapping.validation_rules && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    JSON
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(mapping)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(mapping.mapping_id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

interface MappingDialogProps {
  open: boolean
  mapping: HACFieldMapping | null
  onClose: () => void
  onSave: (mapping: HACFieldMapping) => void
}

function MappingDialog({ open, mapping, onClose, onSave }: MappingDialogProps) {
  const [formData, setFormData] = useState<HACFieldMapping>(
    mapping || {
      mapping_id: "",
      mapping_type: "signal",
      source_key: "",
      display_label: "",
      category: "",
      validation_rules: null,
    },
  )

  const handleSubmit = () => {
    if (!formData.source_key || !formData.display_label) return
    onSave(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mapping?.source_key ? "Edit Mapping" : "Add Mapping"}</DialogTitle>
          <DialogDescription>Configure how this field should be displayed in the UI</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="mapping_type">Mapping Type</Label>
            <Select
              value={formData.mapping_type}
              onValueChange={(value: "signal" | "criterion") => setFormData({ ...formData, mapping_type: value })}
            >
              <SelectTrigger id="mapping_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="signal">Signal</SelectItem>
                <SelectItem value="criterion">Criterion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source_key">
              Source Key <span className="text-destructive">*</span>
            </Label>
            <Input
              id="source_key"
              value={formData.source_key}
              onChange={(e) => setFormData({ ...formData, source_key: e.target.value })}
              placeholder="e.g., central_line_present"
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_label">
              Display Label <span className="text-destructive">*</span>
            </Label>
            <Input
              id="display_label"
              value={formData.display_label}
              onChange={(e) => setFormData({ ...formData, display_label: e.target.value })}
              placeholder="e.g., Central line present"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category (optional)</Label>
            <Input
              id="category"
              value={formData.category || ""}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g., Device, Lab, Timing"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="validation_rules">Validation Rules (optional JSON)</Label>
            <Textarea
              id="validation_rules"
              value={formData.validation_rules ? JSON.stringify(formData.validation_rules, null, 2) : ""}
              onChange={(e) => {
                try {
                  const parsed = e.target.value ? JSON.parse(e.target.value) : null
                  setFormData({ ...formData, validation_rules: parsed })
                } catch {
                  // Invalid JSON, don't update
                }
              }}
              rows={4}
              className="font-mono text-sm"
              placeholder='{\n  "required": true,\n  "type": "boolean"\n}'
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.source_key || !formData.display_label}>
            Save Mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
