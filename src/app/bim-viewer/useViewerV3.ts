"use client";

import { useRef, useCallback, useEffect } from 'react';
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as FRAGS from "@thatopen/fragments";
import { UseViewerReturn } from '@/types/bim';
import { EventBus } from '@/core/events/event-bus';

export function useViewerV3(): UseViewerReturn {
  console.log("🚨 useViewerV3 HOOK LOADED");
  const containerRef = useRef<HTMLDivElement>(null);
  const componentsRef = useRef<OBC.Components | null>(null);
  const worldRef = useRef<any>(null);
  const fragmentsRef = useRef<FRAGS.FragmentsModels | null>(null);
  const currentModelRef = useRef<any>(null);
  const isInitializedRef = useRef<boolean>(false);

  const initializeViewer = useCallback(async () => {
    if (!containerRef.current || componentsRef.current || isInitializedRef.current) {
      console.log("🛑 Viewer already initialized or initializing");
      return;
    }

    console.log("🚀 Initializing BIM Viewer...");
    isInitializedRef.current = true;

    try {
      // Initialize components
      const components = new OBC.Components();
      componentsRef.current = components;

      // Create world
      const worlds = components.get(OBC.Worlds);
      const world = worlds.create<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>();
      worldRef.current = world;

      // Setup scene
      world.scene = new OBC.SimpleScene(components);
      world.scene.setup();
      world.scene.three.background = null;

      // Setup renderer
      world.renderer = new OBC.SimpleRenderer(components, containerRef.current);
      world.renderer.three.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);

      // Setup camera
      world.camera = new OBC.SimpleCamera(components);
      world.camera.controls.setLookAt(10, 10, 10, 0, 0, 0);

      // Initialize components
      components.init();
      
      // Ensure camera is ready
      console.log("📷 Camera initialized:", {
        camera: !!world.camera,
        cameraThree: !!world.camera?.three,
        controls: !!world.camera?.controls
      });

      // Setup fragments with local worker
      const workerUrl = "/worker.mjs"; // Using local worker file
      const fragments = new FRAGS.FragmentsModels(workerUrl);
      fragmentsRef.current = fragments;

      // Update fragments when camera moves
      world.camera.controls.addEventListener("rest", () => fragments.update(true));

      // Handle model loading
      fragments.models.list.onItemSet.add(({ value: model }) => {
        model.useCamera(world.camera.three);
        world.scene.three.add(model.object);
        fragments.update(true);
      });

      // Multi-select support (Shift-click)
      const selectedIdsByModel = new Map<FRAGS.FragmentsModel, Set<number>>();

      const clearAllSelections = async () => {
        // Clear map and visuals via event bus
        selectedIdsByModel.clear();
        try {
          console.log("🔄 Clearing user selection - emitting empty user:highlight");
          EventBus.emit('user:highlight', { expressIds: [] } as any);
        } catch (e) {
          console.error("Failed to emit clear user:highlight:", e);
        }
      };

      const updateHighlights = async () => {
        try {
          const allIds: number[] = [];
          selectedIdsByModel.forEach(s => allIds.push(...s));
          console.log("🔄 Updating user highlights with IDs:", allIds);
          EventBus.emit('user:highlight', { expressIds: allIds } as any);
        } catch (e) {
          console.error("Failed to emit updateHighlights user:highlight:", e);
        }
      };

      // Setup mouse interaction (EXACT COPY FROM EXAMPLE)
      const mouse = new THREE.Vector2();
      
      if (containerRef.current) {
        const canvas = containerRef.current.querySelector('canvas');
        if (canvas) {
          canvas.addEventListener("click", async (event) => {
            mouse.x = event.clientX;
            mouse.y = event.clientY;
            const isShift = (event as MouseEvent).shiftKey === true;

            // Find the closest raycast result across all models
            let closestResult: any = null;
            let closestModel: FRAGS.FragmentsModel | null = null;
            let minDistance = Infinity;

            for (const [modelId, model] of fragments.models.list) {
              try {
                const result = await model.raycast({
                  camera: world.camera.three,
                  mouse,
                  dom: world.renderer.three.domElement,
                });

                if (result && result.distance < minDistance) {
                  minDistance = result.distance;
                  closestResult = result;
                  closestModel = model;
                }
              } catch (error) {
                console.warn("Raycast failed for model:", modelId, error);
              }
            }

            if (closestResult && closestModel) {
              // Update selection set: replace on click, extend on Shift
              if (!isShift) {
                await clearAllSelections();
                const newSet = new Set<number>([closestResult.localId]);
                selectedIdsByModel.set(closestModel, newSet);
              } else {
                const set = selectedIdsByModel.get(closestModel) || new Set<number>();
                set.add(closestResult.localId);
                selectedIdsByModel.set(closestModel, set);
              }
              await updateHighlights();
              
              // Get entity data
              const [data] = await closestModel.getItemsData([closestResult.localId], {
                attributesDefault: true,
              });

              const name = (data && typeof (data as any).Name === 'object' && (data as any).Name !== null && 'value' in (data as any).Name)
                ? (data as any).Name.value
                : (data as any)?.Name;
              const globalId = (data && typeof (data as any).GlobalId === 'object' && (data as any).GlobalId !== null && 'value' in (data as any).GlobalId)
                ? (data as any).GlobalId.value
                : (data as any)?.GlobalId;

              console.log("🎯 Entity selected:", {
                localId: closestResult.localId,
                name,
                type: (data as any)?.type,
              });

              // Emit user highlight events for chat-tools selection context
              try {
                const allIds: number[] = [];
                selectedIdsByModel.forEach(s => allIds.push(...s));
                console.log("🔄 Emitting user:highlight event with IDs:", allIds);
                EventBus.emit('user:highlight', { expressIds: allIds } as any);
              } catch (e) {
                console.error("Failed to emit user:highlight event:", e);
              }
            } else {
              console.log("🎯 Click missed - no entity selected");
              if (!isShift) {
                await clearAllSelections();
              }
            }

            // Update fragments to show changes
            await fragments.update(true);
          });
        }
      }

      // Add ResizeObserver to handle container size changes
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          
          if (world.renderer && world.camera) {
            // Update renderer size
            world.renderer.three.setSize(width, height);
            
            // Update camera aspect ratio
            if (world.camera.three instanceof THREE.PerspectiveCamera) {
              world.camera.three.aspect = width / height;
              world.camera.three.updateProjectionMatrix();
            }
            
            // Force fragments update
            if (fragmentsRef.current) {
              fragmentsRef.current.update(true);
            }
            
            console.log("📐 Resized viewer:", { width, height });
          }
        }
      });

      // Start observing the container
      resizeObserver.observe(containerRef.current);

      // Store observer for cleanup
      (window as any).__viewerResizeObserver = resizeObserver;

      console.log("✅ BIM Viewer initialized");

    } catch (error) {
      console.error("❌ Failed to initialize viewer:", error);
    }
  }, []);

  const loadFragmentFromBytes = useCallback(async (bytes: ArrayBuffer, modelId: string) => {
    console.log("📥 Loading fragment:", modelId);
    
    if (!fragmentsRef.current || !worldRef.current) {
      console.error("❌ Viewer not initialized!");
      throw new Error("Viewer not initialized");
    }

    if (!worldRef.current.camera || !worldRef.current.camera.three) {
      console.error("❌ Camera not initialized!");
      throw new Error("Camera not initialized");
    }

    try {
      // Clear existing model
      if (currentModelRef.current) {
        console.log("🗑️ Clearing existing model");
        currentModelRef.current.dispose();
      }

      // Convert bytes to Uint8Array
      const uint8Array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      const arrayBuffer = uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength) as ArrayBuffer;
      
      // Load model with camera
      const model = await fragmentsRef.current.load(arrayBuffer, {
        modelId: modelId,
        camera: worldRef.current.camera.three,
        raw: true,
      });

      console.log("✅ Model loaded:", model);
      currentModelRef.current = model;
      
      // Emit event that model is ready
      if (typeof window !== 'undefined' && (window as any).EventBus) {
        (window as any).EventBus.emit('fragment:loaded', {
          fragment: model,
          expressIds: []
        });
      }

    } catch (error) {
      console.error("❌ Fragment loading failed:", error);
      throw error;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup ResizeObserver
      if ((window as any).__viewerResizeObserver) {
        (window as any).__viewerResizeObserver.disconnect();
        delete (window as any).__viewerResizeObserver;
      }
      
      if (componentsRef.current && isInitializedRef.current) {
        try {
          if (currentModelRef.current) {
            currentModelRef.current.dispose();
          }
          componentsRef.current.dispose();
        } catch (error) {
          console.warn("Error during cleanup:", error);
        }
      }
      isInitializedRef.current = false;
    };
  }, []);

  return {
    containerRef,
    componentsRef,
    worldRef,
    fragmentsRef,
    currentModelRef,
    initializeViewer,
    loadFragmentFromBytes
  };
}