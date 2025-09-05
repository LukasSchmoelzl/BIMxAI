"use client";

import { useEffect, useRef } from 'react';
import { EventBus } from '@/core/events/event-bus';
import * as FRAGS from '@thatopen/fragments';
import * as THREE from 'three';
import { getCSSVariable } from '@/utils/css-variables';

interface FragmentHighlighterAiProps {
  fragments: FRAGS.FragmentsModels | null;
}

export default function FragmentHighlighterAi({ fragments }: FragmentHighlighterAiProps) {
  const aiIdsRef = useRef<Set<number>>(new Set());
  const prevAiIdsRef = useRef<Set<number>>(new Set());

  const aiMaterialRef = useRef<FRAGS.MaterialDefinition>({
    color: new THREE.Color((typeof window !== 'undefined' ? getCSSVariable('--color-info').trim() : '') || '#60a5fa'),
    renderedFaces: FRAGS.RenderedFaces.TWO,
    opacity: 0.6,
    transparent: true,
  });

  useEffect(() => {
    if (!fragments) return;

    const applyAiHighlights = async () => {
      const models = [...fragments.models.list.values()];
      for (const model of models) {
        const prev = Array.from(prevAiIdsRef.current);
        const next = Array.from(aiIdsRef.current);
        if (prev.length > 0) {
          await model.resetHighlight(prev);
        }
        if (next.length > 0) {
          await model.highlight(next, aiMaterialRef.current);
        }
      }
      prevAiIdsRef.current = new Set(aiIdsRef.current);
      await fragments.update(true);
    };

    const handleAI = async (data: { expressIds: number[] }) => {
      aiIdsRef.current = new Set(data?.expressIds || []);
      await applyAiHighlights();
    };

    const unsubAI = EventBus.on('ai:highlight' as any, handleAI);
    return () => { unsubAI(); };
  }, [fragments]);

  return null;
}


