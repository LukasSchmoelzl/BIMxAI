"use client";

import { useEffect, useRef } from 'react';
import { EventBus } from '@/core/events/event-bus';
import * as FRAGS from '@thatopen/fragments';
import * as THREE from 'three';
import { getCSSVariable } from '@/utils/css-variables';

interface FragmentHighlighterUserProps {
  fragments: FRAGS.FragmentsModels | null;
}

export default function FragmentHighlighterUser({ fragments }: FragmentHighlighterUserProps) {
  const selectedIdsRef = useRef<Set<number>>(new Set());
  const prevSelectedIdsRef = useRef<Set<number>>(new Set());

  const userMaterialRef = useRef<FRAGS.MaterialDefinition>({
    color: new THREE.Color((typeof window !== 'undefined' ? getCSSVariable('--bim-highlight').trim() : '') || '#FFD700'),
    renderedFaces: FRAGS.RenderedFaces.TWO,
    opacity: 0.8,
    transparent: true,
  });

  // User highlighter manages only user material

  useEffect(() => {
    if (!fragments) return;

    const applyUserHighlights = async () => {
      const models = [...fragments.models.list.values()];
      const prev = Array.from(prevSelectedIdsRef.current);
      const next = Array.from(selectedIdsRef.current);
      for (const model of models) {
        if (prev.length > 0) {
          await model.resetHighlight(prev);
        }
        if (next.length > 0) {
          await model.highlight(next, userMaterialRef.current);
        }
      }
      prevSelectedIdsRef.current = new Set(selectedIdsRef.current);
      await fragments.update(true);
    };

    const handleUser = async (data: { expressIds: number[] }) => {
      selectedIdsRef.current = new Set(data?.expressIds || []);
      await applyUserHighlights();
    };

    const unsubUser = EventBus.on('user:highlight' as any, handleUser);
    return () => { unsubUser(); };
  }, [fragments]);

  return null;
}


