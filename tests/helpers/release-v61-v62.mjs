// Test-only dependency injection. The hash-bound ancestor helper stays intact.
import {releaseFixture as original} from './release-v61.mjs?original-v62';
import {bindHistoricalParentInventory} from './historical-parent-v62.mjs';
export function releaseFixture(plan){
  const fixture=original(plan);
  try{bindHistoricalParentInventory(fixture.base,fixture.parent,`.content-work/release-v6/${fixture.parent.planHash}/manifest.json`);return fixture;}
  catch(error){fixture.cleanup();throw error;}
}
