import { SSR } from '@symbiotejs/symbiote/node';

async function runTest() {
  console.log('--- Starting SSR Test ---');
  try {
    // 1. Initialize SSR environment (sets up globals like HTMLElement, customElements, etc.)
    await SSR.init();
    
    // 2. Import components AFTER environment is ready
    await import('./layout/index.js');
    
    // 3. Process HTML
    const html = await SSR.processHtml('<panel-layout></panel-layout>');
    console.log('SSR Output:');
    console.log(html);
    console.log('--- SSR Test Passed ---');
    
    // 4. Cleanup
    SSR.destroy();
  } catch (err) {
    console.error('--- SSR Test Failed ---');
    console.error(err);
    // Note: If linkedom is missing, this will fail with "Cannot find module 'linkedom'"
    process.exit(1);
  }
}

runTest();
