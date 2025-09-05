// Debug script to check BIM viewer state
// Run this in the browser console to check if everything is loaded

console.log("=== BIM VIEWER DEBUG CHECK ===");
console.log("Timestamp:", new Date().toISOString());

// Check window globals
console.log("\n1. WINDOW GLOBALS:");
console.log("- window.__bimData exists:", !!window.__bimData);
console.log("- window.__bimData.loaded:", window.__bimData?.loaded);
console.log("- window.__bimData.entities length:", window.__bimData?.entities?.length || 0);
console.log("- window.__fragmentsModels exists:", !!window.__fragmentsModels);
console.log("- window.__components exists:", !!window.__components);
console.log("- window.__world exists:", !!window.__world);
console.log("- window.EventBus exists:", !!window.EventBus);

// Check components
if (window.__components) {
    console.log("\n2. COMPONENTS STATUS:");
    const components = window.__components;
    console.log("- Components initialized:", !!components);
    
    // Check FragmentsManager
    try {
        const fragments = components.get(window.OBC?.FragmentsManager);
        console.log("- FragmentsManager exists:", !!fragments);
        console.log("- FragmentsManager list size:", fragments?.list?.size || 0);
        console.log("- FragmentsManager list keys:", fragments?.list ? [...fragments.list.keys()] : []);
    } catch (e) {
        console.log("- FragmentsManager error:", e.message);
    }
}

// Check Smart Chunks
console.log("\n3. SMART CHUNKS:");
console.log("- window.__smartChunksProjectId:", window.__smartChunksProjectId);
console.log("- window.__smartChunksData exists:", !!window.__smartChunksData);
console.log("- window.__chunkManager exists:", !!window.__chunkManager);
console.log("- window.__chunkResult exists:", !!window.__chunkResult);
console.log("- window.__bimData.smartChunks:", window.__bimData?.smartChunks);
if (window.__bimData?.smartChunks) {
    console.log("  - projectId:", window.__bimData.smartChunks.projectId);
    console.log("  - enabled:", window.__bimData.smartChunks.enabled);
    console.log("  - chunkCount:", window.__bimData.smartChunks.chunkCount);
    console.log("  - totalTokens:", window.__bimData.smartChunks.totalTokens);
}

// Check React DevTools
console.log("\n4. REACT COMPONENTS:");
console.log("- React DevTools installed:", !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
console.log("  (Install React DevTools extension to inspect component state)");

// Check for recent logs
console.log("\n5. RECENT LOGS CHECK:");
console.log("Look for these log patterns above:");
console.log("- 🚨 CACHE CHECK: Code loaded at");
console.log("- 🚨 useViewerV3 HOOK LOADED at");
console.log("- 🚨 REGISTERING onItemSet handler at");
console.log("- 🎯🎯🎯 onItemSet EVENT FIRED!");
console.log("- 🔵🔵🔵 V3 ENTITY EXTRACTION START");

console.log("\n=== END DEBUG CHECK ===");

// Function to manually trigger entity extraction
window.debugExtractEntities = async function() {
    console.log("\n🔧 MANUAL ENTITY EXTRACTION");
    if (window.__bimData?.model) {
        console.log("Found model, attempting extraction...");
        // This would need the actual extraction function
        console.log("Model:", window.__bimData.model);
    } else {
        console.log("No model found in window.__bimData");
    }
};

console.log("\nTip: Run 'window.debugExtractEntities()' to manually trigger entity extraction");