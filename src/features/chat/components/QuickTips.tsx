"use client";

import React from 'react';
import { QuickTipsProps } from '@/types/ui';
import { DoorOpen, Square, Layers, BarChart2 } from 'lucide-react';
import { StandardButton } from '@/components/ui-ls';

type QuickAction = {
  icon: React.ElementType;
  action: string;
};

export function QuickTips({ onQuickAction, onClose }: QuickTipsProps) {
  const quickActions: QuickAction[] = [
    {
      icon: DoorOpen,
      action: "Zeige mir alle Türen"
    },
    {
      icon: Square,
      action: "Wie viele Fenster gibt es?"
    },
    {
      icon: Layers,
      action: "Zeige alle Wände"
    },
    {
      icon: BarChart2,
      action: "Was für Elemente gibt es im Modell?"
    }
  ];

  return (
    <div className="quick-tips-container">
      <div className="quick-tips-card">
        <div className="quick-tips-header">
          <div className="quick-tips-header-content">
            <h2 className="quick-tips-title">BIM Viewer Fragen</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="quick-tips-close-button"
                aria-label="Schließen"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <div className="quick-tips-content">
          <div className="quick-tips-list">
            {quickActions.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="w-full">
                  <StandardButton
                    className="w-full justify-start"
                    icon={<Icon size={16} strokeWidth={2} color="white" />}
                    text={item.action}
                    onClick={() => onQuickAction(item.action)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
} 