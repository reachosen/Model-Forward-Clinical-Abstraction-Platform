"use client"

import * as React from "react"
import { Check, ChevronDown } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const domains = [
  { value: "CLABSI", label: "CLABSI", description: "Central Line-Associated Bloodstream Infections" },
  { value: "CAUTI", label: "CAUTI", description: "Catheter-Associated Urinary Tract Infections" },
  { value: "SSI", label: "SSI", description: "Surgical Site Infections" },
  { value: "VAE", label: "VAE", description: "Ventilator-Associated Events" },
  { value: "CDI", label: "CDI", description: "Clostridioides difficile Infections" },
]

interface DomainSwitcherProps {
  currentDomain: string
  onDomainChange: (domain: string) => void
  className?: string
}

export function DomainSwitcher({ currentDomain, onDomainChange, className }: DomainSwitcherProps) {
  const [open, setOpen] = React.useState(false)
  const selectedDomain = domains.find((domain) => domain.value === currentDomain)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select domain"
          className={cn("justify-between gap-2 bg-muted/50 hover:bg-muted", className)}
        >
          <span className="font-semibold">{selectedDomain?.label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        {domains.map((domain) => (
          <DropdownMenuItem
            key={domain.value}
            onSelect={() => {
              onDomainChange(domain.value)
              setOpen(false)
            }}
            className="flex items-start gap-2 py-3 cursor-pointer"
          >
            <Check
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                currentDomain === domain.value ? "opacity-100" : "opacity-0"
              )}
            />
            <div className="flex flex-col">
              <span className="font-medium">{domain.label}</span>
              <span className="text-xs text-muted-foreground">{domain.description}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
