// Initialize localForage for IndexedDB storage
localforage.config({
  driver: localforage.INDEXEDDB,
  name: "TestCaseFeatureApp",
  storeName: "relationsStore",
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

    // 🔥 Update label and link colors dynamically
    d3.selectAll(".label").style("fill", isDarkMode ? "#ffeb3b" : "#000");
    d3.selectAll(".link").style("stroke", isDarkMode ? "#fff" : "#000");

    renderGraph();
  });
});

// Function to assign colors to nodes
function assignColor(item, type) {
  let colorMap = type === "feature" ? featureColors : testCaseColors;
  let colorArray = type === "feature" ? ["#6DCE9E", "#68BDFF"] : ["#FF75EA"];

  if (!colorMap[item]) {
    colorMap[item] =
      colorArray[Object.keys(colorMap).length % colorArray.length];
  }
}

// Render the Graph
function renderGraph() {
  // Ensure the container exists after clearing it
  let graphContainer = document.getElementById("graph-container");
  if (!graphContainer) {
    graphContainer = document.createElement("div");
    graphContainer.id = "graph-container";
    graphContainer.style.width = "1200"; // Ensure it has width
    graphContainer.style.height = "600";
    document.body.appendChild(graphContainer);
  } else {
    d3.select("#graph-container").html(""); // Clear but don't remove the container
  }

  const width = graphContainer.clientWidth; // Now, this will not be null
  const height = 600;

  const svg = d3
    .select("#graph-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g"); // Main container for zoom

  const links = relations.map((r) => ({
    source: r.feature,
    target: r.testCase,
  }));

  const nodes = [...new Set(links.flatMap((l) => [l.source, l.target]))].map(
    (id) => ({ id, type: features.includes(id) ? "feature" : "testCase" })
  );

  const isDarkMode = document.body.classList.contains("dark-mode");
  const linkColor = isDarkMode ? "#fff" : "#000"; // Contrast link color
  const labelColor = isDarkMode ? "#ffeb3b" : "#000"; // Contrast label color

  const link = g
    .selectAll(".link")
    .data(links)
    .enter()
    .append("line")
    .attr("class", "link")
    .style("stroke", linkColor)
    .style("stroke-width", 2);

  const node = g
    .selectAll(".node")
    .data(nodes)
    .enter()
    .append("g") // Use group <g> to contain both the icon and circle
    .attr("class", "node-group")
    .call(
      d3
        .drag()
        .on("start", dragStarted)
        .on("drag", dragged)
        .on("end", dragEnded)
    )
    .on("click", highlightConnectedNodes);

  // Append circles for nodes
  node
    .append("circle")
    .attr("r", 15)
    .style("fill", (d) =>
      d.type === "feature"
        ? featureColors[d.id]
        : testCaseColors[d.id] || "#ccc"
    )
    .style("stroke", "black")
    .style("stroke-width", 1.5);

  // 🔥 Add transparent hover ring **AFTER** the node circle
  node
    .append("circle")
    .attr("class", "hover-ring")
    .attr("r", 22) // Slightly larger than node circle
    .style("fill", "none")
    .style("stroke", "#aaa") // Light gray border
    .style("stroke-width", 3)
    .style("opacity", 0) // Initially hidden
    .style("pointer-events", "none"); // ✅ Prevents interference with hover detection

  // 🔥 Add hover effect
  node
    .on("mouseover", function () {
      d3.select(this)
        .select(".hover-ring")
        .transition()
        .duration(200)
        .style("opacity", 1);
    })
    .on("mouseout", function () {
      d3.select(this)
        .select(".hover-ring")
        .transition()
        .duration(200)
        .style("opacity", 0);
    });

  // Append the checklist SVG inside Feature nodes (centered inside circle)
  node
    .filter((d) => d.type === "feature")
    .append("foreignObject")
    .attr("width", 24)
    .attr("height", 20)
    .attr("x", -12) // Center the feature icon inside the circle (x = - radius/2, y = - radius/2)
    .attr("y", -12).html(`
          <svg width="20" height="20" viewBox="0 0 21 24" fill="none" 
               xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="2" width="12" height="4" rx="1" fill="#fc0303"/>
              <rect x="4" y="6" width="16" height="16" rx="2" stroke="#fc0303" stroke-width="2"/>
              <line x1="8" y1="10" x2="14" y2="10" stroke="#fc0303" stroke-width="2"/>
              <line x1="8" y1="14" x2="14" y2="14" stroke="#fc0303" stroke-width="2"/>
              <path d="M16 9L17 10L19 8" stroke="#fc0303" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M16 13L17 14L19 12" stroke="#fc0303" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
      `);

  // Append emoji for Test Case nodes (centered inside circle)
  node
    .filter((d) => d.type === "testCase")
    .append("foreignObject")
    .attr("width", 30)
    .attr("height", 30)
    .attr("x", -12) // Adjust to position it better inside the circle (centered horizontally)
    .attr("y", -12) // Adjust to position it better inside the circle (centered vertically)
    .html(`
      <svg width="40" height="40" viewBox="0 -1 1820 1820" fill="none" 
           xmlns="http://www.w3.org/2000/svg">
          <path d="M1064.96 318.293333c0-21.428148-17.351111-38.779259-38.779259-38.779259H715.567407c-21.428148 0-38.779259 17.351111-38.779259 38.779259 0 21.428148 17.351111 38.779259 38.779259 38.77926h310.518519c21.522963 0.094815 38.874074-17.351111 38.874074-38.77926z" fill="#240ec7" />
          <path d="M637.914074 822.992593c-21.428148 0-38.779259-17.351111-38.779259-38.77926V240.64c0-21.428148 17.351111-38.779259 38.779259-38.779259h504.699259c21.428148 0 38.779259 17.351111 38.77926 38.779259v323.982222l77.653333 43.994074v-445.629629c0-21.428148-17.351111-38.779259-38.779259-38.77926H560.355556c-21.428148 0-38.779259 17.351111-38.77926 38.77926v698.785185c0 21.428148 17.351111 38.779259 38.77926 38.779259h659.911111c5.688889 0 11.093333-1.422222 15.928889-3.602963L1105.540741 822.992593H637.914074z" fill="#240ec7" />
          <path d="M1279.715556 719.928889l-146.014815-80.118519c5.30963-15.739259 8.912593-32.237037 8.912592-49.777777 0-85.712593-69.499259-155.306667-155.306666-155.306667-85.807407 0-155.306667 69.499259-155.306667 155.306667 0 85.807407 69.499259 155.306667 155.306667 155.306666 42.571852 0 81.066667-17.161481 109.131852-44.942222l146.394074 80.308148c17.635556 9.671111 40.201481 3.982222 50.441481-12.8 10.145185-16.782222 4.171852-38.305185-13.558518-47.976296z m-292.408889-52.242963c-42.856296 0-77.653333-34.797037-77.653334-77.653333s34.797037-77.653333 77.653334-77.653334 77.653333 34.797037 77.653333 77.653334-34.797037 77.653333-77.653333 77.653333zM715.567407 434.725926c-21.428148 0-38.779259 17.351111-38.779259 38.779259 0 21.428148 17.351111 38.779259 38.779259 38.779259h38.77926c21.428148 0 38.779259-17.351111 38.779259-38.779259 0-21.428148-17.351111-38.779259-38.779259-38.779259h-38.77926z" fill="#240ec7" />
    </svg>
  `);

  const labels = g
    .selectAll(".label")
    .data(nodes)
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("dy", -15)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", labelColor) // 🔥 Set label color based on theme
    .text((d) => d.id);

  const simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink(links)
        .id((d) => d.id)
        .distance(150)
    )
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(width / 2, height / 2));

  simulation.on("tick", () => {
    // Update the position of the links
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    // Update the position of the circle and icons (including emoji and checklist)
    node
      .select("circle")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y);

    node
      .select(".hover-ring") // 🔥 Update hover ring position
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y);

    // For feature nodes, ensure the checklist icon is centered
    node
      .filter((d) => d.type === "feature")
      .select("foreignObject")
      .attr("x", (d) => d.x - 12) // Center the feature icon inside the circle based on `x` and `y`
      .attr("y", (d) => d.y - 12);

    // For test case nodes, ensure the emoji is centered
    node
      .filter((d) => d.type === "testCase")
      .select("foreignObject")
      .attr("x", (d) => d.x - 18) // Adjusted to match size differences
      .attr("y", (d) => d.y - 12);

    // Update label positions
    labels.attr("x", (d) => d.x).attr("y", (d) => d.y);
  });

  // ** Zoom Functionality **
  const zoom = d3
    .zoom()
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

    const highlightColor = document.body.classList.contains("dark-mode")
      ? "yellow"
      : "black";

    const connectedNodes = new Set([d.id]);
    relations.forEach((r) => {
      if (r.feature === d.id) connectedNodes.add(r.testCase);
      if (r.testCase === d.id) connectedNodes.add(r.feature);
    });

    node.filter((n) => connectedNodes.has(n.id)).style("opacity", 1);
    link
      .filter(
        (l) =>
          connectedNodes.has(l.source.id) && connectedNodes.has(l.target.id)
      )
      .style("stroke", highlightColor)
      .style("opacity", 1);
    labels
      .filter((n) => connectedNodes.has(n.id))
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
document.getElementById("addFeature").addEventListener("click", () => {
  const featureInput = document.getElementById("featureInput");
  const featureName = featureInput.value.trim();
  if (featureName) {
    if (features.includes(featureName)) {
      alert("Feature already exists.");
    } else {
      features.push(featureName);
      assignColor(featureName, "feature"); // Assign a color to the feature
      localforage.setItem("features", features);
      localforage.setItem("featureColors", featureColors); // Store the feature colors
      featureInput.value = ""; // Clear input
      updateFeatureSelect();
    }
  } else {
    alert("Please enter a feature name.");
  }
});

// Add test case
document.getElementById("addTestCase").addEventListener("click", () => {
  const testCaseInput = document.getElementById("testCaseInput");
  const testCaseName = testCaseInput.value.trim();
  if (testCaseName) {
    if (testCases.includes(testCaseName)) {
      alert("Test case already exists.");
    } else {
      testCases.push(testCaseName);
      assignColor(testCaseName, "testCase"); // Assign a color to the test case
      localforage.setItem("testCases", testCases);
      localforage.setItem("testCaseColors", testCaseColors); // Store the test case colors
      testCaseInput.value = ""; // Clear input
      updateTestCaseSelect();
    }
  } else {
    alert("Please enter a test case name.");
  }
});

// Update the select dropdown for features
function updateFeatureSelect() {
  const featureSelect = document.getElementById("featureSelect");
  featureSelect.innerHTML = '<option value="">-- Select Feature --</option>'; // Clear the options
  features.forEach((feature) => {
    const option = document.createElement("option");
    option.value = feature;
    option.textContent = feature;
    featureSelect.appendChild(option);
  });
}

// Update the select dropdown for test cases
function updateTestCaseSelect() {
  const testCaseSelect = document.getElementById("testCaseSelect");
  testCaseSelect.innerHTML = '<option value="">-- Select Test Case --</option>'; // Clear the options
  testCases.forEach((testCase) => {
    const option = document.createElement("option");
    option.value = testCase;
    option.textContent = testCase;
    testCaseSelect.appendChild(option);
  });
}

// Add relation between selected feature and test case
document.getElementById("addRelation").addEventListener("click", () => {
  const featureSelect = document.getElementById("featureSelect");
  const testCaseSelect = document.getElementById("testCaseSelect");

  const selectedFeature = featureSelect.value;
  const selectedTestCase = testCaseSelect.value;

  if (selectedFeature && selectedTestCase) {
    if (
      relations.some(
        (r) => r.feature === selectedFeature && r.testCase === selectedTestCase
      )
    ) {
      alert("This relation already exists!");
    } else {
      // Create relation
      relations.push({ feature: selectedFeature, testCase: selectedTestCase });
      localforage.setItem("relations", relations);
      renderGraph();
    }
  } else {
    alert("Please select both a feature and a test case to create a relation.");
  }
});

// Export CSV
document.getElementById("exportCSV").addEventListener("click", () => {
  const csvData = relations.map((r) => ({
    feature: r.feature,
    testCase: r.testCase,
  }));
  const csv = Papa.unparse(csvData);
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "relations.csv";
  link.click();
});

// Import CSV
document.getElementById("importCSVButton").addEventListener("click", () => {
  document.getElementById("csvFileInput").click();
});

// Handle CSV file input
document.getElementById("csvFileInput").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    Papa.parse(file, {
      complete: (result) => {
        const csvData = result.data;
        relations = csvData.map((row) => ({
          feature: row.feature,
          testCase: row.testCase,
        }));

        // Ensure features and test cases from CSV get their colors
        csvData.forEach((row) => {
          const featureName = row.feature.trim();
          if (!features.includes(featureName)) {
            features.push(featureName);
            assignColor(featureName, "feature"); // Assign a color to the feature
            localforage.setItem("features", features);
            localforage.setItem("featureColors", featureColors); // Store the feature colors
            featureInput.value = ""; // Clear input
            updateFeatureSelect();
          }

          const testCaseName = row.testCase.trim();
          if (!testCases.includes(testCaseName)) {
            testCases.push(testCaseName);
            assignColor(testCaseName, "testCase"); // Assign a color to the test case
            localforage.setItem("testCases", testCases);
            localforage.setItem("testCaseColors", testCaseColors); // Store the test case colors
            updateTestCaseSelect();
          }
        });

        localforage.setItem("features", features);
        localforage.setItem("testCases", testCases);
        localforage.setItem("relations", relations);
        localforage.setItem("featureColors", featureColors); // Store feature colors
        localforage.setItem("testCaseColors", testCaseColors); // Store test case colors

        renderGraph(); // Render graph after data is fully loaded
      },
      header: true, // Assuming the CSV has headers: feature, testCase
      skipEmptyLines: true,
    });
  }
});

// Load data from localForage when the page is ready
// Ensure graph is updated when page loads
window.onload = () => {
  Promise.all([
    localforage.getItem("features"),
    localforage.getItem("testCases"),
    localforage.getItem("relations"),
    localforage.getItem("featureColors"),
    localforage.getItem("testCaseColors"),
  ]).then(
    ([
      loadedFeatures,
      loadedTestCases,
      loadedRelations,
      loadedFeatureColors,
      loadedTestCaseColors,
    ]) => {
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
    }
  );
};
