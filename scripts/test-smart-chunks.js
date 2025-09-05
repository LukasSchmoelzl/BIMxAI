// Test Smart Chunks Integration
console.log('=== Testing Smart Chunks Integration ===');

// Check if Smart Chunks data is available
if (window.__bimData) {
  console.log('BIM Data:', {
    hasEntities: !!window.__bimData.entities,
    entityCount: window.__bimData.entities?.length || 0,
    hasSmartChunks: !!window.__bimData.smartChunks,
    smartChunksProjectId: window.__bimData.smartChunks?.projectId || 'not set'
  });
}

if (window.__smartChunksProjectId) {
  console.log('Smart Chunks Project ID (window):', window.__smartChunksProjectId);
}

// Test entity highlighting
const testHighlight = () => {
  console.log('Testing entity highlighting...');
  
  // Get first few entities
  const entities = window.__bimData?.entities?.slice(0, 5) || [];
  if (entities.length > 0) {
    const expressIds = entities.map(e => e.expressID);
    const globalIds = entities.map(e => e.globalId);
    
    console.log('Highlighting entities:', { expressIds, globalIds });
    
    // Emit highlight event
    window.EventBus?.emit('highlight:entities', {
      expressIds,
      globalIds
    });
  } else {
    console.log('No entities found to highlight');
  }
};

// Add test button to console
window.testSmartChunks = {
  checkStatus: () => {
    console.log('Smart Chunks Status:', {
      projectId: window.__smartChunksProjectId,
      bimData: window.__bimData?.smartChunks,
      entitiesLoaded: window.__bimData?.entities?.length || 0
    });
  },
  testHighlight,
  testUpload: async () => {
    console.log('Testing Smart Chunks upload...');
    if (!window.__bimData?.entities) {
      console.error('No entities loaded');
      return;
    }
    
    const response = await fetch('/api/bim-context/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: `test_${Date.now()}`,
        projectName: 'Test Model',
        modelData: {
          entities: window.__bimData.entities,
          entityIndex: window.__bimData.entityIndex,
          metadata: {
            totalEntities: window.__bimData.entities.length,
            entityTypes: window.__bimData.entityTypes
          }
        }
      })
    });
    
    const result = await response.json();
    console.log('Upload result:', result);
  }
};

console.log('Test functions available:');
console.log('- window.testSmartChunks.checkStatus()');
console.log('- window.testSmartChunks.testHighlight()');
console.log('- window.testSmartChunks.testUpload()');