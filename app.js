// Initialize localForage for IndexedDB storage
localforage.config({
  driver: localforage.INDEXEDDB,
  name: 'TestCaseFeatureApp',
  storeName: 'relationsStore',
});

let features = [];
let testCases = [];
let relations = [];
let featureColors = {};
let testCaseColors = {};

// Color arrays for features and test cases
const defaultFeatureColors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'];
const defaultTestCaseColors = ['#8c564b'];

// Function to assign colors to features and test cases
function assignColor(item, type) {
  let colorMap = type === 'feature' ? featureColors : testCaseColors;
  let colorArray = type === 'feature' ? defaultFeatureColors : defaultTestCaseColors;

  if (!colorMap[item]) {
    const color = colorArray[Object.keys(colorMap).length % colorArray.length];
    colorMap[item] = color;
  }
}

// Graph setup
const graphContainer = document.getElementById('graph-container');
const width = graphContainer.getBoundingClientRect().width;
const height = 600; 

// Function to render the graph
function renderGraph(level = 1) {
  d3.select('#graph-container').html(''); // Clear previous content

  // Add zoom controls
  const zoomControls = document.createElement('div');
  zoomControls.style.position = 'absolute';
  zoomControls.style.top = '10px';
  zoomControls.style.right = '10px';
  zoomControls.style.zIndex = '10';

  zoomControls.innerHTML = `
    <button id="zoomIn" style="margin: 2px; padding: 5px 10px;">+</button>
    <button id="zoomOut" style="margin: 2px; padding: 5px 10px;">-</button>
  `;
  graphContainer.appendChild(zoomControls);

  let currentZoom = 1;

  // D3 Zoom Setup
  const zoom = d3.zoom()
    .scaleExtent([0.1, 4]) 
    .on('zoom', (event) => {
      d3.select('#graph-container svg g').attr('transform', event.transform);
      currentZoom = event.transform.k;
    });

  const svg = d3.select('#graph-container')
    .append('svg')
    .style('width', '100%')
    .attr('height', height)
    .style('position', 'relative')
    .call(zoom);

  const g = svg.append('g'); // Group for zoom

  const links = relations.map(r => ({
    source: r.feature,
    target: r.testCase
  }));

  const nodes = [
    ...new Set(links.flatMap(link => [link.source, link.target]))
  ].map(id => ({
    id,
    type: features.includes(id) ? 'feature' : 'testCase'
  }));

  const link = g.selectAll('.link')
    .data(links)
    .enter().append('line')
    .attr('class', 'link')
    .style('stroke', '#ccc')
    .style('stroke-width', 2);

  const node = g.selectAll('.node')
    .data(nodes)
    .enter().append('circle')
    .attr('class', 'node')
    .attr('r', 10)
    .attr('cx', () => Math.random() * width)
    .attr('cy', () => Math.random() * height)
    .style('fill', d => d.type === 'feature' ? featureColors[d.id] : testCaseColors[d.id] || '#ccc');

  // Add labels for nodes
  const labels = g.selectAll('.label')
    .data(nodes)
    .enter().append('text')
    .attr('class', 'label')
    .attr('text-anchor', 'middle')
    .attr('dy', -15) // Adjust position above the node
    .style('font-size', '12px')
    .style('fill', d => d.type === 'feature' ? '#1f77b4' : '#8c564b') // Feature blue, Test case brown
    .text(d => d.id);

  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(150))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2));

  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    node
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);

    labels
      .attr('x', d => d.x)
      .attr('y', d => d.y);
  });

  // Attach zoom button event listeners
  document.getElementById('zoomIn').addEventListener('click', () => {
    svg.transition().call(zoom.scaleBy, 1.2);
  });

  document.getElementById('zoomOut').addEventListener('click', () => {
    svg.transition().call(zoom.scaleBy, 0.8);
  });
}



// Call renderGraph to initially display the graph (if relations are already available)
renderGraph();

// Add feature
document.getElementById('addFeature').addEventListener('click', () => {
  const featureInput = document.getElementById('featureInput');
  const featureName = featureInput.value.trim();
  if (featureName) {
    if (features.includes(featureName)) {
      alert('Feature already exists.');
    } else {
      features.push(featureName);
      assignColor(featureName, 'feature'); // Assign a color to the feature
      localforage.setItem('features', features);
      localforage.setItem('featureColors', featureColors); // Store the feature colors
      featureInput.value = ''; // Clear input
      updateFeatureSelect();
    }
  } else {
    alert('Please enter a feature name.');
  }
});

// Add test case
document.getElementById('addTestCase').addEventListener('click', () => {
  const testCaseInput = document.getElementById('testCaseInput');
  const testCaseName = testCaseInput.value.trim();
  if (testCaseName) {
    if (testCases.includes(testCaseName)) {
      alert('Test case already exists.');
    } else {
      testCases.push(testCaseName);
      assignColor(testCaseName, 'testCase'); // Assign a color to the test case
      localforage.setItem('testCases', testCases);
      localforage.setItem('testCaseColors', testCaseColors); // Store the test case colors
      testCaseInput.value = ''; // Clear input
      updateTestCaseSelect();
    }
  } else {
    alert('Please enter a test case name.');
  }
});

// Update the select dropdown for features
function updateFeatureSelect() {
  const featureSelect = document.getElementById('featureSelect');
  featureSelect.innerHTML = '<option value="">-- Select Feature --</option>'; // Clear the options
  features.forEach(feature => {
    const option = document.createElement('option');
    option.value = feature;
    option.textContent = feature;
    featureSelect.appendChild(option);
  });
}

// Update the select dropdown for test cases
function updateTestCaseSelect() {
  const testCaseSelect = document.getElementById('testCaseSelect');
  testCaseSelect.innerHTML = '<option value="">-- Select Test Case --</option>'; // Clear the options
  testCases.forEach(testCase => {
    const option = document.createElement('option');
    option.value = testCase;
    option.textContent = testCase;
    testCaseSelect.appendChild(option);
  });
}

// Add relation between selected feature and test case
document.getElementById('addRelation').addEventListener('click', () => {
  const featureSelect = document.getElementById('featureSelect');
  const testCaseSelect = document.getElementById('testCaseSelect');
  
  const selectedFeature = featureSelect.value;
  const selectedTestCase = testCaseSelect.value;

  if (selectedFeature && selectedTestCase) {
    if (relations.some(r => r.feature === selectedFeature && r.testCase === selectedTestCase)) {
      alert('This relation already exists!');
    } else {
      // Create relation
      relations.push({ feature: selectedFeature, testCase: selectedTestCase });
      localforage.setItem('relations', relations);
      renderGraph();
    }
  } else {
    alert('Please select both a feature and a test case to create a relation.');
  }
});

// Export CSV
document.getElementById('exportCSV').addEventListener('click', () => {
  const csvData = relations.map(r => ({ feature: r.feature, testCase: r.testCase }));
  const csv = Papa.unparse(csvData);
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'relations.csv';
  link.click();
});

// Import CSV
document.getElementById('importCSVButton').addEventListener('click', () => {
  document.getElementById('csvFileInput').click();
});

// Handle CSV file input
document.getElementById('csvFileInput').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    Papa.parse(file, {
      complete: (result) => {
        const csvData = result.data;
        relations = csvData.map(row => ({
          feature: row.feature,
          testCase: row.testCase
        }));

        // Ensure features and test cases from CSV get their colors
        csvData.forEach(row => {
          const featureName = row.feature.trim();
          if (!features.includes(featureName)) {
            features.push(featureName);
            assignColor(featureName, 'feature'); // Assign a color to the feature
            localforage.setItem('features', features);
            localforage.setItem('featureColors', featureColors); // Store the feature colors
            featureInput.value = ''; // Clear input
            updateFeatureSelect();
          }

          const testCaseName = row.testCase.trim();
          if (!testCases.includes(testCaseName)) {
            testCases.push(testCaseName);
            assignColor(testCaseName, 'testCase'); // Assign a color to the test case
            localforage.setItem('testCases', testCases);
            localforage.setItem('testCaseColors', testCaseColors); // Store the test case colors
            updateTestCaseSelect();
          }
        });

        localforage.setItem('features', features);
        localforage.setItem('testCases', testCases);
        localforage.setItem('relations', relations);
        localforage.setItem('featureColors', featureColors); // Store feature colors
        localforage.setItem('testCaseColors', testCaseColors); // Store test case colors
        
        renderGraph();  // Render graph after data is fully loaded
      },
      header: true, // Assuming the CSV has headers: feature, testCase
      skipEmptyLines: true
    });
  }
});

// Load data from localForage when the page is ready
window.onload = () => {
  Promise.all([
    localforage.getItem('features'),
    localforage.getItem('testCases'),
    localforage.getItem('relations'),
    localforage.getItem('featureColors'),
    localforage.getItem('testCaseColors')
  ]).then(([loadedFeatures, loadedTestCases, loadedRelations, loadedFeatureColors, loadedTestCaseColors]) => {
    features = loadedFeatures || [];
    testCases = loadedTestCases || [];
    relations = loadedRelations || [];
    featureColors = loadedFeatureColors || {};
    testCaseColors = loadedTestCaseColors || {};

    // After loading data, update the select options
    updateFeatureSelect();
    updateTestCaseSelect();

    // Render the graph if we already have relations
    if (relations.length) {
      renderGraph();
    }
  });
};
