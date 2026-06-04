import * as fs from 'fs';
import * as path from 'path';

const nodesPath = path.join(__dirname, '../data/nodes.json');

interface Node {
  id: string;
  channel?: string;
  host?: string;
  needsManualReview?: boolean;
  pointManName?: string;
  organizationName?: string;
  linkedinUrl?: string;
  publishingCadence?: string;
  isActive?: boolean;
  cadenceConfidence?: string;
  notes?: string;
  calculatedScore?: number;
  priority?: string;
  brokenLinks?: string[];
  [key: string]: any;
}

function resolveReviews() {
  if (!fs.existsSync(nodesPath)) {
    console.error(`Database not found at ${nodesPath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(nodesPath, 'utf8'));
  let nodes: Node[] = data.nodes;

  console.log(`Initial node count: ${nodes.length}`);

  // 1. Delete false positives
  const idsToDelete = ['email-after', 'design-psdcast'];
  nodes = nodes.filter(n => !idsToDelete.includes(n.id));
  console.log(`After deleting false positives: ${nodes.length}`);

  // 2. Update Collin McLelland
  const collin = nodes.find(n => n.id === 'collin-mclelland');
  if (collin) {
    collin.linkedinUrl = 'https://www.linkedin.com/in/collin-mclelland/';
    collin.needsManualReview = false;
    collin.publishingCadence = 'active';
    collin.isActive = true;
    collin.cadenceConfidence = 'HIGH';
    delete collin.notes;
    // Remove rssUrl from brokenLinks since we verified he is active
    if (collin.brokenLinks) {
      collin.brokenLinks = collin.brokenLinks.filter(l => l !== 'rssUrl');
    }
    console.log(`Updated Collin McLelland`);
  }

  // 3. Update Paige Wilson
  const paige = nodes.find(n => n.id === 'paige-wilson');
  if (paige) {
    paige.linkedinUrl = 'https://www.linkedin.com/in/tabithapaigewilson/';
    paige.needsManualReview = false;
    paige.publishingCadence = 'active';
    paige.isActive = true;
    paige.cadenceConfidence = 'HIGH';
    delete paige.notes;
    if (paige.brokenLinks) {
      paige.brokenLinks = paige.brokenLinks.filter(l => l !== 'rssUrl');
    }
    console.log(`Updated Paige Wilson`);
  }

  // 4. Update Jason Jacobs
  const jason = nodes.find(n => n.id === 'jason-jacobs');
  if (jason) {
    jason.linkedinUrl = 'https://www.linkedin.com/in/jasonjacobs/';
    jason.needsManualReview = false;
    jason.publishingCadence = 'active';
    jason.isActive = true;
    jason.cadenceConfidence = 'HIGH';
    delete jason.notes;
    if (jason.brokenLinks) {
      jason.brokenLinks = jason.brokenLinks.filter(l => l !== 'rssUrl');
    }
    console.log(`Updated Jason Jacobs`);
  }

  // Write changes back
  data.nodes = nodes;
  fs.writeFileSync(nodesPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Successfully saved nodes.json with ${nodes.length} nodes.`);
}

resolveReviews();
