"use client"

import * as React from "react"
import { useState, useCallback, useRef, forwardRef, useEffect } from 'react'
import { cn } from "@/lib/utils"
import { 
  getCSSVariable,
  getCSSVariablePercent 
} from '@/utils/css-variables'
import { BentoLayoutProps, BentoAreaProps } from "@/types/bento-types"

// ============================================================================
// RESIZE HANDLE COMPONENT
// ============================================================================

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  className?: string;
  style?: React.CSSProperties;
  isDragging?: boolean;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({
  direction,
  onMouseDown,
  onTouchStart,
  className = '',
  style = {},
  isDragging = false
}) => {
  const isHorizontal = direction === 'horizontal';
  
  return (
    <div
      className={cn(
        "resize-handle",
        `resize-handle-${direction}`,
        className
      )}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      style={style}
    >
      <div className="resize-indicator" />
    </div>
  );
};

// ============================================================================
// RESIZABLE BENTO LAYOUT COMPONENT
// ============================================================================

interface ResizableBentoLayoutProps extends BentoLayoutProps {
  children: React.ReactNode;
  className?: string;
}

interface LayoutState {
  headerHeight: number;
  leftWidth: number;
  chatContentHeight: number;
  chatInputHeight: number;
}

const ResizableBentoLayout = forwardRef<HTMLDivElement, ResizableBentoLayoutProps>(({
  children,
  className = ''
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeResizer, setActiveResizer] = useState<string | null>(null);
  
  // Client-Side Only: Initialize with CSS variables
  const [layout, setLayout] = useState<LayoutState>({
    headerHeight: 0,
    leftWidth: 0,
    chatContentHeight: 0,
    chatInputHeight: 0
  });
  const [isClient, setIsClient] = useState(false);
  
  // Update layout after mount with CSS variables
  useEffect(() => {
    setIsClient(true);
    setLayout({
      headerHeight: getCSSVariablePercent('--bento-header-height'),
      leftWidth: getCSSVariablePercent('--resizer-default-left-width'),
      chatContentHeight: getCSSVariablePercent('--bento-content-height'),
      chatInputHeight: getCSSVariablePercent('--bento-input-height')
    });
  }, []);

  // Combine refs
  const combinedRef = (node: HTMLDivElement) => {
    containerRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  const handleMouseDown = useCallback((resizerType: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setActiveResizer(resizerType);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    switch (activeResizer) {
      case 'horizontal':
        // Horizontal resize (left/right)
        const minLeftWidth = getCSSVariablePercent('--resizer-min-left-width');
        const maxLeftWidth = getCSSVariablePercent('--resizer-max-left-width');
        const newLeftWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, ((e.clientX - rect.left) / rect.width) * 100));
        setLayout(prev => ({ ...prev, leftWidth: newLeftWidth }));
        break;
        
      case 'vertical-header':
        // Vertical resize (header/content)
        const minHeaderHeight = getCSSVariablePercent('--resizer-min-header-height');
        const maxHeaderHeight = getCSSVariablePercent('--resizer-max-header-height');
        const newHeaderHeight = Math.max(minHeaderHeight, Math.min(maxHeaderHeight, ((e.clientY - rect.top) / rect.height) * 100));
        setLayout(prev => ({ 
          ...prev, 
          headerHeight: newHeaderHeight
        }));
        break;
        
      case 'vertical-chat':
        // Vertical resize (chat content/input)
        const chatAreaHeight = rect.height - (layout.headerHeight / 100 * rect.height);
        const chatContentY = rect.top + (layout.headerHeight / 100 * rect.height);
        const relativeY = e.clientY - chatContentY;
        const newChatContentHeight = Math.max(
          getCSSVariablePercent('--resizer-min-chat-content-height'), 
          Math.min(getCSSVariablePercent('--resizer-max-chat-content-height'), (relativeY / chatAreaHeight) * 100)
        );
        setLayout(prev => ({ 
          ...prev, 
          chatContentHeight: newChatContentHeight,
          chatInputHeight: 100 - layout.headerHeight - newChatContentHeight
        }));
        break;
    }
  }, [isDragging, activeResizer, layout.headerHeight]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setActiveResizer(null);
  }, []);

  // Add/remove event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Grid layout values
  const gridTemplateRows = `${layout.headerHeight}% ${layout.chatContentHeight}% ${layout.chatInputHeight}%`;
  const gridTemplateColumns = `${layout.leftWidth}% ${100 - layout.leftWidth}%`;

  // Don't render resizers during SSR
  if (!isClient) {
    return (
      <main
        ref={combinedRef}
        className={cn("app-main resizable", className)}
      >
        {children}
      </main>
    );
  }

  return (
    <main
      ref={combinedRef}
      className={cn("app-main resizable", isDragging && "dragging", className)}
      style={{
        '--bento-grid-columns': gridTemplateColumns,
        '--bento-grid-rows': gridTemplateRows
      } as React.CSSProperties}
    >
      {children}
      
      {/* Horizontal Resizer (Left/Right) */}
      <ResizeHandle
        direction="horizontal"
        onMouseDown={handleMouseDown('horizontal')}
        className="horizontal-resizer"
        isDragging={isDragging}
        style={{
          left: `${layout.leftWidth}%`
        }}
      />
      
      {/* Vertical Resizer (Header/Content) */}
      <ResizeHandle
        direction="vertical"
        onMouseDown={handleMouseDown('vertical-header')}
        className="vertical-resizer-header"
        isDragging={isDragging}
        style={{
          top: `${layout.headerHeight}%`
        }}
      />
      
      {/* Vertical Resizer (Chat Content/Input) */}
      <ResizeHandle
        direction="vertical"
        onMouseDown={handleMouseDown('vertical-chat')}
        className="vertical-resizer-chat"
        isDragging={isDragging}
        style={{
          top: `${layout.headerHeight + layout.chatContentHeight}%`,
          left: `${layout.leftWidth}%`,
          width: `${100 - layout.leftWidth}%`
        }}
      />
    </main>
  );
});

ResizableBentoLayout.displayName = "ResizableBentoLayout";

// ============================================================================
// BENTO LAYOUT COMPONENT
// ============================================================================

/**
 * Main layout container for the Bento Box
 * Uses CSS variables as single source of truth
 */
export const BentoLayout = forwardRef<HTMLDivElement, BentoLayoutProps>(
  ({ className, children, bordered = true, padding = "1rem", resizable = false, ...props }, ref) => {
    // If resizable is enabled, use ResizableBentoLayout
    if (resizable) {
      return (
        <ResizableBentoLayout
          ref={ref}
          className={cn(
            bordered && "bento-bordered",
            className
          )}
          {...props}
        >
          {children}
        </ResizableBentoLayout>
      );
    }

    // Standard BentoLayout for non-resizable layout
    return (
      <main
        ref={ref}
        className={cn(
          "app-main", 
          bordered && "bento-bordered",
          className
        )}
        {...props}
      >
        {children}
      </main>
    );
  }
)
BentoLayout.displayName = "BentoLayout"

// ============================================================================
// BENTO AREA COMPONENT
// ============================================================================

/**
 * Container for individual areas within the Bento Box
 * Supports glassmorphism for header areas and overlay positioning
 */
export const BentoArea = forwardRef<HTMLDivElement, BentoAreaProps>(
  ({ className, area, children, glass = false, overlay = false, ...props }, ref) => {
    const areaClass = `area-${area}`;
    const baseClasses = overlay ? "layout-overlay" : "layout-content";
    
    // Only enable glass effect when explicitly requested via prop
    const shouldUseGlass = glass;
    
    return (
      <div
        ref={ref}
        className={cn(baseClasses, areaClass, shouldUseGlass && "glass-effect", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
)
BentoArea.displayName = "BentoArea"