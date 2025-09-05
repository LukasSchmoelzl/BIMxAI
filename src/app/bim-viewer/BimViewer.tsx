"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useViewerV3 } from './useViewerV3';
import QueryHandler from './QueryHandler';
import FragmentHighlighterUser from './FragmentHighlighterUser';
import FragmentHighlighterAi from './FragmentHighlighterAi';

import * as FRAGS from '@thatopen/fragments';
import { EventBus } from '@/core/events/event-bus';

// Preset models configuration
const PRESET_MODELS = [
  {
    id: 'bridge',
    name: 'Brückenmodell',
    path: '/models/bridge.ifc',
    description: 'Beispiel einer Brückenkonstruktion'
  }
];



export interface BimViewerProps {
  // Simplified interface - no more highlighter callback needed
}

const BimViewer: React.FC<BimViewerProps> = () => {
  const viewer = useViewerV3();
  const { containerRef, componentsRef, worldRef, fragmentsRef, currentModelRef } = viewer;
  const [isInitialized, setIsInitialized] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [currentModelName, setCurrentModelName] = useState<string>('bridge');
  const [isDragging, setIsDragging] = useState(false);
  
  // Race condition protection - MUST be at component level
  const loadingRef = useRef<boolean>(false);

  // Initialize viewer
  useEffect(() => {
    console.log("🚀 BimViewer useEffect running - isInitialized:", isInitialized);
    
    const init = async () => {
      console.log("🚀 init() called - checking container");
      
      // Wait for container to be ready
      if (!containerRef.current) {
        console.log("⏳ Container not ready, waiting...");
        setTimeout(init, 100);
        return;
      }
      
      try {
        await viewer.initializeViewer();
        setIsInitialized(true);
        
        console.log("✅ Viewer ready for model loading");
        
        // Model loading is now handled by separate useEffect
      } catch (error) {
        console.error("[ERROR] Failed to initialize viewer:", error);
        // Don't throw - just log the error to prevent error page
      }
    };
    
    // Start initialization after a delay
    console.log("⏰ Setting initial timeout for init (500ms)");
    const timeoutId = setTimeout(init, 500);
    
    // Cleanup
    return () => {
      console.log("🧹 BimViewer useEffect cleanup");
      clearTimeout(timeoutId);
    };
  }, []); // Remove viewer dependency to prevent re-runs

  // Load default model when viewer is initialized
  useEffect(() => {
    if (isInitialized && !isModelLoaded && !loadingRef.current) {
      console.log("🚀 Auto-loading default model - isInitialized:", isInitialized);
      // Add small delay to ensure camera is ready
      setTimeout(() => {
        loadDefaultModel();
      }, 1000);
    }
  }, [isInitialized]); // Only depend on isInitialized

  const loadDefaultModel = async () => {
    console.log("🎯 loadDefaultModel CALLED at", new Date().toISOString());
    console.log("🎯 Current state:", {
      isModelLoaded,
      currentModelRef: !!viewer.currentModelRef.current,
      loadingRef: loadingRef.current
    });
    
    // CRITICAL: Prevent React StrictMode multiple loading
    if (isModelLoaded || viewer.currentModelRef.current || loadingRef.current) {
      console.log("🛑 BLOCKED: Model already loaded/loading");
      return;
    }
    
    loadingRef.current = true;
    
    try {
      console.log("[INFO] Loading default bridge model...");
      
      // Clear any existing model first
      if (viewer.currentModelRef.current) {
        try {
          if (viewer.currentModelRef.current.object && viewer.currentModelRef.current.object.parent) {
            viewer.worldRef.current?.scene.three.remove(viewer.currentModelRef.current.object);
          }
          if (typeof viewer.currentModelRef.current.dispose === 'function') {
            viewer.currentModelRef.current.dispose();
          }
          viewer.currentModelRef.current = null;
        } catch (error) {
          console.warn("[WARNING] Error clearing existing model:", error);
        }
      }
      
      // First try to load existing bridge.frag (faster)
      console.log("🔍 Fetching /models/bridge.frag...");
      const fragResponse = await fetch('/models/bridge.frag');
      console.log("📡 Fetch response:", fragResponse.status, fragResponse.statusText);
      
      if (fragResponse.ok) {
        console.log("✅ Fragment found! Loading...");
        const buffer = await fragResponse.arrayBuffer();
        console.log("📥 Calling loadFragmentFromBytes for bridge model...");
      console.log("📊 Buffer size:", buffer.byteLength, "bytes");
      // Use timestamp to ensure unique model ID
      const uniqueModelId = `bridge_${Date.now()}`;
      await viewer.loadFragmentFromBytes(buffer, uniqueModelId);
      console.log("✅ loadFragmentFromBytes completed for bridge model");
        setIsModelLoaded(true);
        setCurrentModelName('bridge');
        return;
      } else {
        console.error("❌ Fragment fetch failed:", fragResponse.status, fragResponse.statusText);
      }
      
      // Fallback: Convert from IFC to create new Fragment
      console.log("🔄 bridge.frag not found - converting from bridge.ifc...");
      const ifcResponse = await fetch('/models/bridge.ifc');
      if (ifcResponse.ok) {
        console.log("✅ Found bridge.ifc, converting to FRAG...");
        const ifcBuffer = await ifcResponse.arrayBuffer();
        const typedArray = new Uint8Array(ifcBuffer);
        
        // Create IFC Importer
        const serializer = new FRAGS.IfcImporter();
        serializer.wasm = {
          absolute: true,
          path: "/wasm/", // Using local wasm files
        };
        
        // Convert IFC to FRAG bytes
        console.log("🔧 Processing IFC file...");
        const fragBytes = await serializer.process({ bytes: typedArray, raw: true });
        console.log("✅ IFC converted to FRAG bytes, size:", fragBytes.byteLength);
        
        // Load the converted FRAG
        const uniqueModelId = `bridge_${Date.now()}`;
        const arrayBuffer = fragBytes.buffer.slice(fragBytes.byteOffset, fragBytes.byteOffset + fragBytes.byteLength) as ArrayBuffer;
        await viewer.loadFragmentFromBytes(arrayBuffer, uniqueModelId);
        console.log("✅ FRAG loaded successfully");
        
        // Optional: Save the FRAG file for future use
        try {
          const saveResponse = await fetch('/api/save-fragment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filename: 'bridge.frag',
              data: Array.from(fragBytes)
            })
          });
          if (saveResponse.ok) {
            console.log("💾 bridge.frag saved for future use");
          }
        } catch (error) {
          console.warn("Could not save FRAG file:", error);
        }
        
        setIsModelLoaded(true);
        setCurrentModelName('bridge');
      } else {
        console.error("💥 CRITICAL: No bridge.ifc found!");
      }
    } catch (error) {
      console.error("[ERROR] Failed to load default model:", error);
      // Don't propagate error to avoid error page
    } finally {
      loadingRef.current = false;
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // Reset app state so LLM/context uses the new model only
    try {
      // Clear highlights (selection equals current highlights)
      EventBus.emit('user:highlight', { expressIds: [] } as any);
      EventBus.emit('ai:highlight', { expressIds: [] } as any);

      // Clear Smart Chunks memory for previous project
      const win: any = window as any;
      const prevProjectId = win.__smartChunksProjectId;
      if (prevProjectId && win.__smartChunkSystem?.clearProject) {
        try { win.__smartChunkSystem.clearProject(prevProjectId); } catch {}
      }
      // Reset BIM data container
      win.__bimData = { loaded: false };
      win.__smartChunksProjectId = undefined;
      // Notify listeners (QueryHandler etc.)
      EventBus.emit('model:clear', {} as any);
    } catch {}

    const files = Array.from(e.dataTransfer.files);
    const ifcFile = files.find(file => 
      file.name.toLowerCase().endsWith('.ifc') || 
      file.name.toLowerCase().endsWith('.frag')
    );

    if (!ifcFile) {
      console.error("[ERROR] Please drop an IFC or FRAG file");
      return;
    }

    try {
      if (ifcFile.name.toLowerCase().endsWith('.frag')) {
        console.log(`[INFO] Loading dropped FRAG file: ${ifcFile.name}`);
        const buffer = await ifcFile.arrayBuffer();
        console.log("📥 Calling loadFragmentFromBytes for dropped file...");
        console.log("📊 Buffer size:", buffer.byteLength, "bytes");
        // Use timestamp to ensure unique model ID
        const uniqueModelId = `${ifcFile.name.replace('.frag', '')}_${Date.now()}`;
        await viewer.loadFragmentFromBytes(buffer, uniqueModelId);
        // Trigger entity extraction and Smart Chunks for new model
        EventBus.emit('fragment:loaded', {
          fragment: viewer.currentModelRef.current,
          expressIds: []
        });
        console.log("✅ loadFragmentFromBytes completed for dropped file");
        setCurrentModelName(ifcFile.name.replace('.frag', ''));
        setIsModelLoaded(true);
      } else if (ifcFile.name.toLowerCase().endsWith('.ifc')) {
        console.log(`[INFO] Loading dropped IFC file: ${ifcFile.name}`);
        const ifcBuffer = await ifcFile.arrayBuffer();
        const typedArray = new Uint8Array(ifcBuffer);
        
        // Convert IFC -> FRAG using local wasm 
        const importer = new FRAGS.IfcImporter();
        importer.wasm = { absolute: true, path: '/wasm/' };
        console.log('🔧 Converting IFC to FRAG bytes...');
        const fragBytes = await importer.process({ bytes: typedArray, raw: true });
        console.log('✅ IFC converted, size:', fragBytes.byteLength);
        
        const uniqueModelId = `${ifcFile.name.replace('.ifc', '')}_${Date.now()}`;
        const arrayBuffer2 = fragBytes.buffer.slice(fragBytes.byteOffset, fragBytes.byteOffset + fragBytes.byteLength) as ArrayBuffer;
        await viewer.loadFragmentFromBytes(arrayBuffer2, uniqueModelId);
        // Trigger entity extraction and Smart Chunks for new model
        EventBus.emit('fragment:loaded', {
          fragment: viewer.currentModelRef.current,
          expressIds: []
        });
        console.log('✅ FRAG loaded from converted IFC');
        setCurrentModelName(ifcFile.name.replace('.ifc', ''));
        setIsModelLoaded(true);
      }
    } catch (error) {
      console.error("[ERROR] Failed to load dropped file:", error);
    }
  };

  const loadPresetModel = async (modelPath: string, modelName: string) => {
    try {
      console.log(`[INFO] Loading preset model: ${modelName} from ${modelPath}`);
      
      // First check if FRAG file already exists
      const fragPath = modelPath.replace('.ifc', '.frag');
      const fragResponse = await fetch(fragPath);
      
      if (fragResponse.ok) {
        // Load existing FRAG file
        console.log(`[INFO] Found existing fragment at ${fragPath}`);
        const buffer = await fragResponse.arrayBuffer();
        console.log("📥 Calling loadFragmentFromBytes for preset model...");
        console.log("📊 Buffer size:", buffer.byteLength, "bytes");
        // Use timestamp to ensure unique model ID
        const uniqueModelId = `${modelName}_${Date.now()}`;
        await viewer.loadFragmentFromBytes(buffer, uniqueModelId);
        console.log("✅ loadFragmentFromBytes completed for preset model");
        setIsModelLoaded(true);
        setCurrentModelName(modelName);
      } else {
        console.error(`[ERROR] Only FRAG files are supported`);
      }
    } catch (error) {
      console.error(`[ERROR] Failed to load preset model ${modelName}:`, error);
    }
  };


  return (
    <div 
      className="bimViewerContainer h-full pointer-events-auto relative z-0"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
          {/* Viewer canvas */}
          <div 
            ref={containerRef} 
            className="canvasContainer h-full pointer-events-auto relative z-0"
          />
      
      {/* Simplified QueryHandler for model events */}
      {isInitialized && (
        <QueryHandler
          viewer={{ currentModelRef: viewer.currentModelRef }}
          isInitialized={isInitialized}
          modelName={currentModelName}
        />
      )}
      
      {/* Two Highlighters: User and AI */}
      {isInitialized && (
        <>
          <FragmentHighlighterUser fragments={fragmentsRef.current} />
          <FragmentHighlighterAi fragments={fragmentsRef.current} />
        </>
      )}
      
      {/* Model selector removed - bridge model loads automatically */}

      
      {/* Drag and Drop overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 border-4 border-dashed border-blue-500 flex items-center justify-center z-25 pointer-events-none">
          <div className="bg-white p-6 rounded-lg shadow-lg pointer-events-none">
            <p className="text-xl font-semibold text-blue-600">Drop IFC or FRAG file here</p>
          </div>
        </div>
      )}
      
      {/* Loading overlay */}
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 pointer-events-none z-20">
          <div className="text-center pointer-events-none">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Initializing viewer...</p>
          </div>
        </div>
      )}
      

    </div>
  );
};

export default BimViewer;