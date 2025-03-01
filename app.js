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

// Dark Mode Toggle
document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.getElementById("themeToggle");
  const toggleIndicator = document.getElementById("toggleIndicator");

  // Check and apply saved theme
  const currentTheme = localStorage.getItem("theme") || "light";
  if (currentTheme === "dark") {
      document.body.classList.add("dark-mode");
      toggleIndicator.style.left = "37px";
      toggleIndicator.textContent = "🌙";
  }

  // Toggle theme when clicked
  themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      const isDarkMode = document.body.classList.contains("dark-mode");
      localStorage.setItem("theme", isDarkMode ? "dark" : "light");

      // Update toggle position and icon
      toggleIndicator.style.left = isDarkMode ? "37px" : "5px";
      toggleIndicator.textContent = isDarkMode ? "🌙" : "☀️";
  });
});


// Function to assign colors to nodes
function assignColor(item, type) {
    let colorMap = type === 'feature' ? featureColors : testCaseColors;
    let colorArray = type === 'feature' ? ['#6DCE9E', '#68BDFF'] : ['#FF75EA'];

    if (!colorMap[item]) {
        colorMap[item] = colorArray[Object.keys(colorMap).length % colorArray.length];
    }
}

// Render the Graph
function renderGraph() {
    d3.select("#graph-container").html(""); // Clear existing graph

    const width = document.getElementById("graph-container").clientWidth;
    const height = 600;
    
    const svg = d3.select("#graph-container")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const g = svg.append("g"); // Main container for zoom

    const links = relations.map(r => ({
        source: r.feature,
        target: r.testCase
    }));

    const nodes = [...new Set(links.flatMap(l => [l.source, l.target]))]
        .map(id => ({ id, type: features.includes(id) ? 'feature' : 'testCase' }));

    const link = g.selectAll(".link")
        .data(links)
        .enter().append("line")
        .attr("class", "link")
        .style("stroke", "#ccc")
        .style("stroke-width", 2);

    const node = g.selectAll(".node")
        .data(nodes)
        .enter().append("circle")
        .attr("class", "node")
        .attr("r", 10)
        .style("fill", d => d.type === "feature" ? featureColors[d.id] : testCaseColors[d.id] || "#ccc")
        .call(d3.drag()
            .on("start", dragStarted)
            .on("drag", dragged)
            .on("end", dragEnded))
        .on("click", highlightConnectedNodes);

    const labels = g.selectAll(".label")
        .data(nodes)
        .enter().append("text")
        .attr("class", "label")
        .attr("dy", -15)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text(d => d.id);

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(150))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2));

    simulation.on("tick", () => {
        link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("cx", d => d.x)
            .attr("cy", d => d.y);

        labels.attr("x", d => d.x)
            .attr("y", d => d.y);
    });

    // ** Zoom Functionality **
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4]) // Limit zoom levels
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom); // Enable zoom on SVG

    // ** Zoom Buttons **
    const zoomControls = document.createElement("div");
    zoomControls.style.position = "absolute";
    zoomControls.style.top = "10px";
    zoomControls.style.right = "10px";
    zoomControls.style.display = "flex";
    zoomControls.style.gap = "10px";

    zoomControls.innerHTML = `
        <button id="zoomIn" style="padding: 6px 10px;">+</button>
        <button id="zoomOut" style="padding: 6px 10px;">-</button>
    `;

    document.getElementById("graph-container").appendChild(zoomControls);

    document.getElementById("zoomIn").addEventListener("click", () => {
        svg.transition().call(zoom.scaleBy, 1.2);
    });

    document.getElementById("zoomOut").addEventListener("click", () => {
        svg.transition().call(zoom.scaleBy, 0.8);
    });

    // Function to highlight related nodes when clicking a node
    function highlightConnectedNodes(event, d) {
      node.style("opacity", 0.3);
      link.style("opacity", 0.1);
      labels.style("opacity", 0.3);
  
      const highlightColor = document.body.classList.contains("dark-mode") ? "yellow" : "black";
  
      const connectedNodes = new Set([d.id]);
      relations.forEach(r => {
          if (r.feature === d.id) connectedNodes.add(r.testCase);
          if (r.testCase === d.id) connectedNodes.add(r.feature);
      });
  
      node.filter(n => connectedNodes.has(n.id)).style("opacity", 1);
      link.filter(l => connectedNodes.has(l.source.id) && connectedNodes.has(l.target.id))
          .style("stroke", highlightColor)
          .style("opacity", 1);
      labels.filter(n => connectedNodes.has(n.id))
          .style("opacity", 1)
          .style("stroke", highlightColor);
  }
  

    // Drag Functions
    function dragStarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
  }
  
  function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
  }
  
  function dragEnded(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
  }
}

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
