// Fix "ReferenceError: TextEncoder is not defined"
const { TextEncoder, TextDecoder } = require("util");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// 🛠 Mock localForage BEFORE requiring app.js
jest.mock("localforage", () => ({
  config: jest.fn(),
  setItem: jest.fn(),
  getItem: jest.fn().mockResolvedValue([]),
  removeItem: jest.fn(),
}));

global.localforage = require("localforage");

// 🛠 Mock d3 BEFORE requiring app.js
jest.mock("d3", () => {
  const mockD3 = {
    select: jest.fn(() => mockD3),
    selectAll: jest.fn(() => mockD3),
    append: jest.fn(() => mockD3),
    attr: jest.fn(() => mockD3),
    style: jest.fn(() => mockD3),
    html: jest.fn(() => mockD3),
    data: jest.fn(() => mockD3),
    enter: jest.fn(() => mockD3),
    exit: jest.fn(() => mockD3),
    remove: jest.fn(() => mockD3),
    merge: jest.fn(() => mockD3),
    call: jest.fn(() => mockD3),
    on: jest.fn(() => mockD3),
    transition: jest.fn(() => mockD3),
    filter: jest.fn(() => mockD3),
    text: jest.fn(() => mockD3),

    // ✅ Mock d3.drag()
    drag: jest.fn(() => ({
      on: jest.fn(() => mockD3),
    })),

    // ✅ Mock d3.forceSimulation()
    forceSimulation: jest.fn(() => {
      const simulation = {
        force: jest.fn(() => simulation),
        on: jest.fn(() => simulation),
        alphaTarget: jest.fn(() => simulation),
        restart: jest.fn(() => simulation),
      };
      return simulation;
    }),

    // ✅ Mock d3.forceLink() with .id() and .distance()
    forceLink: jest.fn(() => ({
      id: jest.fn(() => ({
        distance: jest.fn(() => mockD3), // ✅ Fix: Add .distance()
      })),
    })),

    // ✅ Mock d3.forceManyBody()
    forceManyBody: jest.fn(() => ({
      strength: jest.fn(() => mockD3), // ✅ Ensure .strength() is mocked
    })),

    forceCenter: jest.fn(() => mockD3),
  };

  return mockD3;
});

global.d3 = require("d3"); // Ensure global `d3` is available

// 🛠 Mock PapaParse (CSV parsing)
jest.mock("papaparse", () => ({
  parse: jest.fn((file, options) => {
    if (options && options.complete) {
      options.complete({ data: [{ feature: "Feature1", testCase: "Test1" }] });
    }
  }),
  unparse: jest.fn(() => "feature,testCase\nFeature1,Test1"),
}));

const Papa = require("papaparse");

// 🛠 Set up a virtual DOM before loading app.js
const { JSDOM } = require("jsdom");

beforeEach(() => {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>
    <button id="themeToggle"></button>
    <div id="toggleIndicator"></div>
    <input id="featureInput" />
    <button id="addFeature"></button>
    <input id="testCaseInput" />
    <button id="addTestCase"></button>
    <button id="addRelation"></button>
    <select id="featureSelect"></select>
    <select id="testCaseSelect"></select>
    <button id="exportCSV"></button>
    <input type="file" id="csvFileInput" />
    <div id="graph-container" style="width: 500px; height: 500px;"></div>
  </body></html>`, { runScripts: "dangerously" });

  global.document = dom.window.document;
  global.window = dom.window;
  global.localStorage = {
    getItem: jest.fn(() => "light"), // ✅ Mock theme storage
    setItem: jest.fn(),
  };

  // 🚀 Ensure #graph-container exists before calling renderGraph()
  if (!document.getElementById("graph-container")) {
    const graphContainer = document.createElement("div");
    graphContainer.id = "graph-container";
    graphContainer.style.width = "500px";
    graphContainer.style.height = "500px";
    document.body.appendChild(graphContainer);
  }
});

// Load app.js AFTER setting up mocks and DOM
const app = require("./app");

// 🚀 Run renderGraph() AFTER DOM is fully loaded
test("renderGraph should not throw errors", () => {
  expect(() => {
    app.renderGraph();
  }).not.toThrow();
});

// Import functions for testing
const {
  assignColor,
  updateFeatureSelect,
  updateTestCaseSelect,
  renderGraph,
  highlightConnectedNodes,
  addFeature,
  addTestCase,
  addRelation,
} = require("./app");

describe("Theme Toggle", () => {
  test("toggles dark mode", () => {
    const themeToggle = document.getElementById("themeToggle");
    const toggleIndicator = document.getElementById("toggleIndicator");

    themeToggle.click();

    const isDarkMode = document.body.classList.contains("dark-mode");
    expect(global.localStorage.setItem).toHaveBeenCalledWith(
      "theme",
      isDarkMode ? "dark" : "light"
    );
    expect(toggleIndicator.textContent).toBe(isDarkMode ? "🌙" : "☀️");
  });
});

describe("Feature and Test Case Management", () => {
  test("assignColor assigns colors correctly", () => {
    assignColor("Feature1", "feature");
    expect(Object.keys(global.featureColors)).toContain("Feature1");

    assignColor("TestCase1", "testCase");
    expect(Object.keys(global.testCaseColors)).toContain("TestCase1");
  });

  test("updateFeatureSelect populates the dropdown", () => {
    global.features = ["Feature1", "Feature2"];
    updateFeatureSelect();
    const featureSelect = document.getElementById("featureSelect");
    expect(featureSelect.children.length).toBe(3); // Includes default option
  });

  test("updateTestCaseSelect populates the dropdown", () => {
    global.testCases = ["Test1", "Test2"];
    updateTestCaseSelect();
    const testCaseSelect = document.getElementById("testCaseSelect");
    expect(testCaseSelect.children.length).toBe(3); // Includes default option
  });

  test("addFeature adds a new feature", () => {
    const featureInput = document.getElementById("featureInput");
    featureInput.value = "NewFeature";
    addFeature();
    expect(global.features).toContain("NewFeature");
    expect(localforage.setItem).toHaveBeenCalledWith(
      "features",
      global.features
    );
  });

  test("addTestCase adds a new test case", () => {
    const testCaseInput = document.getElementById("testCaseInput");
    testCaseInput.value = "NewTestCase";
    addTestCase();
    expect(global.testCases).toContain("NewTestCase");
    expect(localforage.setItem).toHaveBeenCalledWith(
      "testCases",
      global.testCases
    );
  });

  test("addRelation creates a feature-test case relationship", () => {
    global.features = ["Feature1"];
    global.testCases = ["TestCase1"];

    const featureSelect = document.getElementById("featureSelect");
    const testCaseSelect = document.getElementById("testCaseSelect");
    featureSelect.value = "Feature1";
    testCaseSelect.value = "TestCase1";

    addRelation();

    expect(global.relations).toContainEqual({
      feature: "Feature1",
      testCase: "TestCase1",
    });
    expect(localforage.setItem).toHaveBeenCalledWith(
      "relations",
      global.relations
    );
  });
});

describe("Graph Rendering", () => {
  test("renders the graph without errors", () => {
    renderGraph();
    expect(d3.select).toHaveBeenCalled(); // Ensures d3 is called
  });
});

describe("CSV Import/Export", () => {
  test("exportCSV triggers file download", () => {
    const createObjectURLSpy = jest
      .spyOn(global.URL, "createObjectURL")
      .mockReturnValue("blob:url");
    document.getElementById("exportCSV").click();
    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  test("importCSV correctly parses and updates relations", (done) => {
    const csvFileInput = document.getElementById("csvFileInput");
    const file = new File(["feature,testCase\nFeature1,Test1"], "test.csv", {
      type: "text/csv",
    });

    Object.defineProperty(csvFileInput, "files", { value: [file] });

    csvFileInput.dispatchEvent(new Event("change"));

    setTimeout(() => {
      try {
        expect(global.relations).toContainEqual({
          feature: "Feature1",
          testCase: "Test1",
        });
        expect(localforage.setItem).toHaveBeenCalledWith(
          "relations",
          global.relations
        );
        done();
      } catch (error) {
        done(error);
      }
    }, 100);
  });
});