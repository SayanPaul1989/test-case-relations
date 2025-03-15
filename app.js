// Initialize localForage for IndexedDB storage
localforage.config({
  driver: localforage.INDEXEDDB,
  name: "TestCaseFeatureApp",
  storeName: "relationsStore",
});

let features = []; // Store features
let testCases = []; // Store test cases
let relations = []; // Store relations between features and test cases
let featureColors = {}; // Store colors for feature nodes
let testCaseColors = {}; // Store colors for test case nodes
let nodeDescriptions = []; // Store descriptions mapped to node names
let bugNodes = []; // Store relations between bugs and test cases
let bugColors = {}; // Store colors for bug nodes

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

    // 🔥 Ensure the comment box updates when the theme is toggled
    const commentBox = document.getElementById("commentBox");
    if (isDarkMode) {
      commentBox.classList.add("dark-mode");
    } else {
      commentBox.classList.remove("dark-mode");
    }

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

  // ✅ Combine all nodes (Features, Test Cases, Bugs) uniquely
  const nodes = [
    ...new Set([
      ...relations.flatMap((l) => [l.feature, l.testCase]),
      ...bugNodes.flatMap((b) => [b.bug, b.testCase]), // Include bug nodes
    ]),
  ].map((id) => ({
    id,
    type: features.includes(id)
      ? "feature"
      : testCases.includes(id)
      ? "testCase"
      : "bug", // ✅ Bugs are handled separately
  }));

  // ✅ Combine all relationships (Feature-Test Case & Test Case-Bug)
  const links = [
    ...relations.map((r) => ({ source: r.feature, target: r.testCase })),
    ...bugNodes.map((b) => ({ source: b.testCase, target: b.bug })), // ✅ Bug relations added
  ];

  const isDarkMode = document.body.classList.contains("dark-mode");
  const linkColor = isDarkMode ? "#fff" : "#000"; // Contrast link color
  const labelColor = isDarkMode ? "#ffeb3b" : "#000"; // Contrast label color

  // 🔥 Define arrow markers for the directed links
  svg
    .append("defs")
    .append("marker")
    .attr("id", "markerstriangle")
    .attr("viewBox", "0 0 10 10")
    .attr("refX", 10) // Position the arrow marker
    .attr("refY", 5)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto-start-reverse")
    .append("path")
    .attr("d", "M 0 0 L 10 5 L 0 10 z")
    .attr("fill", linkColor);

  // 🔥 Replace lines with paths to create curved links
  const link = g
    .selectAll(".link")
    .data(links)
    .enter()
    .append("path")
    .attr("class", "link")
    .attr("fill", "none")
    .attr("stroke", linkColor)
    .attr("stroke-width", 2)
    .attr("marker-end", "url(#markerstriangle)"); // 🔥 Add arrow marker

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
    );

  node.append("title").text((d) => {
    if (d.type === "feature") return `Feature: ${d.id}`;
    if (d.type === "testCase") return `Test Case: ${d.id}`;
    if (d.type === "bug") return `Bug: ${d.id}`;
    return d.id;
  });

  node.on("click", function (event, d) {
    highlightConnectedNodes(event, d); // Call existing function
    showCommentBox(event, d); // Show comment input box
  });

  // Append circles for nodes
  node
    .append("circle")
    .attr("r", 15)
    .style("fill", (d) =>
      d.type === "feature"
        ? featureColors[d.id]
        : d.type === "testCase"
        ? testCaseColors[d.id]
        : bugColors[d.id] || "#ff5555"
    ) // Default bug color
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
    link.attr("d", (d) => {
      const dx = d.target.x - d.source.x;
      const dy = d.target.y - d.source.y;
      const dr = Math.sqrt(dx * dx + dy * dy); // Arc radius
      return `M ${d.source.x} ${d.source.y} L ${d.target.x} ${d.target.y}`;
    });

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

    // For test case nodes, ensure the emoji is centered
    node
      .filter((d) => d.type === "bug")
      .select("foreignObject")
      .attr("x", (d) => d.x - 10) // Adjusted to match size differences
      .attr("y", (d) => d.y - 10);

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
  let lastClickedNode = null; // Track last clicked node

  function highlightConnectedNodes(event, d) {
    if (lastClickedNode === d.id) {
      resetHighlight(); // If clicking the same node, reset highlight
      lastClickedNode = null; // Reset tracking
      return;
    }

    lastClickedNode = d.id; // Update last clicked node

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

  function resetHighlight() {
    // Restore default node opacity
    node.style("opacity", 1);

    // Restore default link colors based on the theme
    const defaultLinkColor = document.body.classList.contains("dark-mode")
      ? "#ffffff" // Light links for dark mode
      : "#333333"; // Dark links for light mode

    link.style("stroke", defaultLinkColor).style("opacity", 1);

    // Restore label colors based on the theme
    const defaultLabelColor = document.body.classList.contains("dark-mode")
      ? "#ffffff"
      : "#000000";

    labels.style("opacity", 1).style("stroke", defaultLabelColor);
  }

  // function dragStarted(event, d) {
  //   if (d.type === "bug") {
  //     d3.select(this.parentNode).interrupt(); // Stop crawl
  //   }
  //   simulation.alphaTarget(0.3).restart();
  // }

  // function dragEnded(event, d) {
  //   if (d.type === "bug") {
  //     triggerCrawlEffect(d3.select(this.parentNode)); // Restart crawl
  //   }
  //   simulation.alphaTarget(0);
  // }

  // function drag(simulation) {
  //   return d3.drag()
  //     .on("start", (event, d) => {
  //       if (!event.active) simulation.alphaTarget(0.3).restart();
  //       d.fx = d.x;
  //       d.fy = d.y;
  //     })
  //     .on("drag", (event, d) => {
  //       d.fx = event.x;
  //       d.fy = event.y;
  //     })
  //     .on("end", (event, d) => {
  //       if (!event.active) simulation.alphaTarget(0);
  //       d.fx = null;
  //       d.fy = null;
  //     });
  // }

  function dragStarted(event, d) {
    if (d.type === "bug") {
      d3.select(this).select(".bug-container").style("animation", "none");
    }
    simulation.alphaTarget(0.3).restart();
  }

  function dragEnded(event, d) {
    if (d.type === "bug") {
      d3.select(this)
        .select(".bug-container")
        .style("animation", "float 3s infinite");
    }
    simulation.alphaTarget(0);
  }

  function dragged(event, d) {
    const width = document.getElementById("graph-container").clientWidth;
    const height = document.getElementById("graph-container").clientHeight;

    d.fx = Math.max(15, Math.min(width - 15, event.x)); // Prevent going out horizontally
    d.fy = Math.max(15, Math.min(height - 15, event.y)); // Prevent going out vertically
  }

  node
    .filter((d) => d.type === "bug")
    .append("foreignObject")
    .attr("width", 20) // Ensure size matches the icon
    .attr("height", 20)
    .attr("x", -10) // Center based on node radius
    .attr("y", -10)
    .style("overflow", "visible")
    .html(
      `<div class="bug-container" style="display: flex; justify-content: center; align-items: center; width: 100%; height: 100%;">
      <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <g stroke="#000" stroke-width="2" fill="none" stroke-linejoin="round">
          <path d="M20,38 C32,38 34,27.5 34,24 C34,20.8 34,16.1 34,10 L6,10 C6,13.4 6,18.1 6,24 C6,27.5 8,38 20,38 Z" fill="#2F88FF"/>
          <path d="M0,4 L6,10" stroke-linecap="round"/>
          <path d="M40,4 L34,10" stroke-linecap="round"/>
          <path d="M0,23 L6,23" stroke-linecap="round"/>
          <path d="M40,23 L34,23" stroke-linecap="round"/>
          <path d="M3,40 L9,34" stroke-linecap="round"/>
          <path d="M37,40 L31,34" stroke-linecap="round"/>
          <path d="M20,38 L20,10" stroke-linecap="round" stroke="#FFFFFF"/>
          <path d="M12,10 L28,10 L28,8.3 C28,3.7 24.4,0 20,0 C15.5,0 12,3.7 12,8.3 Z" fill="#2F88FF"/>
        </g>
      </svg>
    </div>`
    )
    .style("display", "flex")
    .style("align-items", "center")
    .style("justify-content", "center")
    .style("animation", "floatBug 3s infinite");

  const style = document.createElement("style");
  style.innerHTML = `
          @keyframes floatBug {
            0% { transform: translate(0px, 0px); }
            50% { transform: translate(0px, -2px); }
            100% { transform: translate(0px, 0px); }
          }
        
          @keyframes bugWobble {
            0% { transform: rotate(0deg); }
            50% { transform: rotate(3deg); }
            100% { transform: rotate(0deg); }
          }
        
          .node-group.bug-node:hover {
            animation: bugWobble 0.3s infinite;
          }
        `;
  document.head.appendChild(style);

  // ✅ Make the bug crawl every few seconds
  node
    .filter((d) => d.type === "bug")
    .select(".bug-container")
    .each(function () {
      animateBugMovement(d3.select(this));
    });

  function animateBugMovement(bugNode) {
    setInterval(() => {
      bugNode
        .transition()
        .duration(1500)
        .style(
          "transform",
          `translate(${Math.random() * 4 - 2}px, ${Math.random() * 4 - 2}px)`
        )
        .transition()
        .duration(1500)
        .style("transform", `translate(0, 0)`);
    }, 3000);
  }
}

renderGraph();

// Function to show the modern comment box near the clicked node
function showCommentBox(event, d) {
  const commentBox = document.getElementById("commentBox");
  const input = document.getElementById("commentInput");
  const title = document.getElementById("commentTitle");
  const dragHandle = document.getElementById("commentHeader");
  const addBugButton = document.getElementById("addBug");

  // Set existing comment if available
  title.innerText = `Comment for ${d.id}`;
  input.value = nodeDescriptions[d.id] || "";

  // Position the comment box near the clicked node
  commentBox.style.display = "block";
  commentBox.style.left = `${Math.min(
    event.pageX + 15,
    window.innerWidth - 270
  )}px`;
  commentBox.style.top = `${Math.min(
    event.pageY + 10,
    window.innerHeight - 150
  )}px`;

  // Show "Add Bug" only for test case nodes
  if (testCases.includes(d.id)) {
    addBugButton.style.display = "inline-block";
    addBugButton.onclick = () => addBugNode(d.id);
  } else {
    addBugButton.style.display = "none";
  }

  // Apply drag functionality
  makeDraggable(commentBox, dragHandle);

  // Event listener for saving the comment
  document.getElementById("saveComment").onclick = function () {
    const newComment = input.value.trim();
    nodeDescriptions[d.id] = newComment;
    localforage.setItem("nodeDescriptions", nodeDescriptions);

    // Hide the comment box after saving
    commentBox.style.display = "none";
  };

  // Event listener for cancel button
  document.getElementById("cancelComment").onclick = function () {
    commentBox.style.display = "none";
  };

  // Hide comment box when clicking outside
  document.addEventListener("click", function (event) {
    const commentBox = document.getElementById("commentBox");
    if (
      !event.target.closest("#commentBox") &&
      !event.target.closest(".node-group")
    ) {
      commentBox.style.display = "none";
    }
  });
}

function makeDraggable(element, handle) {
  let offsetX = 0,
    offsetY = 0,
    isDragging = false;

  handle.addEventListener("mousedown", (event) => {
    isDragging = true;
    offsetX = event.clientX - element.getBoundingClientRect().left;
    offsetY = event.clientY - element.getBoundingClientRect().top;

    // Change cursor when dragging
    handle.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (event) => {
    if (!isDragging) return;

    let newX = event.clientX - offsetX;
    let newY = event.clientY - offsetY;

    // Prevent moving out of viewport
    newX = Math.max(0, Math.min(window.innerWidth - element.clientWidth, newX));
    newY = Math.max(
      0,
      Math.min(window.innerHeight - element.clientHeight, newY)
    );

    element.style.left = `${newX}px`;
    element.style.top = `${newY}px`;
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    handle.style.cursor = "grab";
  });
}

// Hide comment box when clicking outside
document.addEventListener("click", function (event) {
  const commentBox = document.getElementById("commentBox");
  if (
    !event.target.closest("#commentBox") &&
    !event.target.closest(".node-group")
  ) {
    commentBox.style.display = "none";
  }
});

// Hide comment box when clicking outside
document.addEventListener("click", function (event) {
  const commentBox = document.getElementById("commentBox");
  if (
    !event.target.closest("#commentBox") &&
    !event.target.closest(".node-group")
  ) {
    commentBox.style.display = "none";
  }
});

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

function addBugNode(testCaseId) {
  const bugId = `${testCaseId}_Bug${bugNodes.length + 1}`;

  if (!bugNodes.some((bug) => bug.bug === bugId)) {
    bugNodes.push({ bug: bugId, testCase: testCaseId });
    bugColors[bugId] = assignColor(bugId, "bug"); // Assign color like test cases

    // Persist bug relations and colors
    localforage.setItem("bugNodes", bugNodes);
    localforage.setItem("bugColors", bugColors);
  }

  renderGraph(); // Refresh the graph to show new bug node
}

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
  exportCSV();
});

// Export CSV Function
function exportCSV() {
  const csvData = [
    ["feature", "testCase", "bug", "description"], // ✅ Headers with unique mapping
  ];

  // ✅ Export feature-test case relationships (but without duplicating descriptions)
  relations.forEach((relation) => {
    csvData.push([
      relation.feature,
      relation.testCase,
      "", // No bug for feature-test case relations
      "", // Description is handled separately
    ]);
  });

  // ✅ Export bug-test case relationships (without duplicating descriptions)
  bugNodes.forEach((bugRelation) => {
    csvData.push([
      "", // No feature for bug relations
      bugRelation.testCase,
      bugRelation.bug, // Bug node
      "", // Description is handled separately
    ]);
  });

  // ✅ Export UNIQUE feature descriptions
  features.forEach((feature) => {
    csvData.push([
      feature, // Feature name
      "", // No test case
      "", // No bug
      nodeDescriptions[feature] || "", // ✅ Unique feature description
    ]);
  });

  // ✅ Export UNIQUE test case descriptions
  testCases.forEach((testCase) => {
    csvData.push([
      "", // No feature
      testCase, // Test case name
      "", // No bug
      nodeDescriptions[testCase] || "", // ✅ Unique test case description
    ]);
  });

  // ✅ Export UNIQUE bug descriptions
  const exportedBugs = new Set(); // Prevent duplicate bug exports
  bugNodes.forEach((bugRelation) => {
    if (!nodeDescriptions[bugRelation.bug] || exportedBugs.has(bugRelation.bug))
      return;
    exportedBugs.add(bugRelation.bug); // Track exported bugs
    csvData.push([
      "", // No feature
      "", // No test case
      bugRelation.bug, // Bug name
      nodeDescriptions[bugRelation.bug] || "", // ✅ Unique bug description
    ]);
  });

  const csvString = Papa.unparse(csvData);
  const blob = new Blob([csvString], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "test-case-feature-relations.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Import CSV
document.getElementById("importCSVButton").addEventListener("click", () => {
  document.getElementById("csvFileInput").click();
});

// Handle CSV file input
document.getElementById("csvFileInput").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const csv = e.target.result;
    const data = Papa.parse(csv, { header: true }).data;

    // Reset all existing data
    features = new Set();
    testCases = new Set();
    relations = [];
    bugNodes = [];
    nodeDescriptions = {};
    featureColors = {};
    testCaseColors = {};
    bugColors = {};

    data.forEach((row) => {
      const feature = row.feature?.trim();
      const testCase = row.testCase?.trim();
      const bug = row.bug?.trim();
      const description = row.description?.trim();

      // ✅ Case 1: Feature-TestCase relationship
      if (feature && testCase) {
        relations.push({ feature, testCase });
        features.add(feature);
        testCases.add(testCase);
      }

      // ✅ Case 2: TestCase-Bug relationship
      else if (testCase && bug) {
        bugNodes.push({ testCase, bug });
        testCases.add(testCase);

        // ✅ Prevent accidental orphan bugs from being created
        if (!bugColors[bug]) {
          assignColor(bug, "bug");
        }
      }

      // ✅ Case 3: Standalone Test Case (without feature)
      else if (testCase && !bug) {
        testCases.add(testCase);
      }

      // ✅ Case 4: Standalone Feature (without test case)
      else if (feature && !testCase) {
        features.add(feature);
      }

      // ✅ Case 5: Prevent creating orphan bug nodes (only add if linked to a test case)
      else if (bug && !testCase) {
        // 🚨 This is where the bug was happening.
        // It was creating orphan bug nodes without test cases.
        // We now IGNORE any bug that is not linked to a test case.
        return;
      }

      // ✅ Store descriptions correctly
      if (feature) nodeDescriptions[feature] = description;
      if (testCase) nodeDescriptions[testCase] = description;
      if (bug && testCase) nodeDescriptions[bug] = description; // ✅ Only add bug if linked

      // ✅ Assign colors using the existing assignColor() function
      if (feature) assignColor(feature, "feature");
      if (testCase) assignColor(testCase, "testCase");
      if (bug && testCase) assignColor(bug, "bug");
    });

    // Convert Sets to Arrays
    features = Array.from(features);
    testCases = Array.from(testCases);

    // ✅ Persist everything in localStorage
    localforage.setItem("features", features);
    localforage.setItem("testCases", testCases);
    localforage.setItem("relations", relations);
    localforage.setItem("bugNodes", bugNodes);
    localforage.setItem("nodeDescriptions", nodeDescriptions);
    localforage.setItem("featureColors", featureColors);
    localforage.setItem("testCaseColors", testCaseColors);
    localforage.setItem("bugColors", bugColors);

    renderGraph(); // ✅ Re-render graph with updated data
  };

  reader.readAsText(file);
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
    localforage.getItem("bugNodes"), // ✅ Load bug nodes
    localforage.getItem("bugColors"), // ✅ Load bug colors
    localforage.getItem("nodeDescriptions"), // Load descriptions
  ]).then(
    ([
      loadedFeatures,
      loadedTestCases,
      loadedRelations,
      loadedFeatureColors,
      loadedTestCaseColors,
      loadedBugNodes,
      loadedBugColors,
      loadedNodeDescriptions,
    ]) => {
      features = loadedFeatures || [];
      testCases = loadedTestCases || [];
      relations = loadedRelations || [];
      bugNodes = loadedBugNodes || []; // ✅ Store loaded bug nodes
      featureColors = loadedFeatureColors || {};
      testCaseColors = loadedTestCaseColors || {};
      bugColors = loadedBugColors || {}; // ✅ Store loaded bug colors
      nodeDescriptions = loadedNodeDescriptions || []; // Store loaded descriptions

      // After loading data, update the select options
      updateFeatureSelect();
      updateTestCaseSelect();
      if (relations.length || bugNodes.length) renderGraph(); // ✅ Render bugs too!

      // Render the graph if we already have relations
      if (relations.length) {
        renderGraph();
      }

      const storedTheme = localStorage.getItem("theme");
      if (storedTheme === "dark") {
        document.body.classList.add("dark-mode");
      }
    }
  );
};
