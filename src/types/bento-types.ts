import * as React from "react"

// ============================================================================
// BENTO LAYOUT INTERFACES
// ============================================================================

export interface BentoLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  bordered?: boolean        // Fügt abgerundeten Rahmen mit Padding hinzu
  padding?: string          // Custom Padding (z.B. "1rem", "20px")
  resizable?: boolean       // Aktiviert die resizable Funktionalität
}

export interface BentoAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  area: "header" | "background" | "chat-content" | "chat-input" | "entity-overlay" | "chat-frame"
  children?: React.ReactNode
  className?: string
  glass?: boolean
  overlay?: boolean
}

