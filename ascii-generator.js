// ASCII Art Generator with parameter controls
// Based on character density mapping with color palettes

let container = null;
let controlsContainer = null;
let isActive = false;
let imageElement = null;

// Color palettes
const ColorPalette = {
  Monochrome: "none",
  Grey2Bit: "grey2bit",
  Grey4Bit: "grey4bit",
  Grey8Bit: "grey8bit",
  Color3Bit: "color3bit",
  Color4Bit: "color4bit",
  ColorFull: "color",
};

// Default character set (printable ASCII)
const defaultCharSet = " .:-=+*#%@";

// Default demo image (used when no image is uploaded)
const defaultImageUrl =
  "data:image/jpeg;base64,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";

// Parameters
const params = {
  charSet: defaultCharSet,
  url: "", // Start empty, will use default image if no upload
  charSamples: 1,
  size: 200,
  contrast: 0,
  brightness: 0,
  alpha: 0,
  colorPalette: ColorPalette.Grey2Bit,
  bgColor: "#ffffff",
  charColor: "#000000",
  transparentBg: false,
};

// Cached data
let charRegions = {};
let colorMap = [];
let valueMap = [];
let normalizedMap = [];
let width = 0;
let height = 0;
let baseImageAspectRatio = 1; // Store the actual image aspect ratio (width/height)

// Color palettes
const colorPalettes = {};

function generatePalettes() {
  colorPalettes[ColorPalette.Grey2Bit] = [
    [0, 0, 0],
    [104, 104, 104],
    [184, 184, 184],
    [255, 255, 255],
  ];

  colorPalettes[ColorPalette.Grey4Bit] = [];
  for (let i = 0; i < 16; i += 1) {
    colorPalettes[ColorPalette.Grey4Bit].push([i * 17, i * 17, i * 17]);
  }

  colorPalettes[ColorPalette.Grey8Bit] = [];
  for (let i = 0; i < 256; i += 1) {
    colorPalettes[ColorPalette.Grey8Bit].push([i, i, i]);
  }

  colorPalettes[ColorPalette.Color3Bit] = [
    [0, 0, 0],
    [0, 249, 45],
    [0, 252, 254],
    [255, 48, 21],
    [255, 62, 253],
    [254, 253, 52],
    [16, 37, 251],
    [255, 255, 255],
  ];

  colorPalettes[ColorPalette.Color4Bit] = [
    ...colorPalettes[ColorPalette.Color3Bit],
  ];
  for (let i = 1; i < 8; i += 1) {
    colorPalettes[ColorPalette.Color4Bit].push([i * 32, i * 32, i * 32]);
  }
}

function analyzeChar(char) {
  const canvas = document.createElement("canvas");
  canvas.width = 12;
  canvas.height = 12;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.font = "12px monospace";
  ctx.fillText(char, 2, 10);
  const data = ctx.getImageData(0, 0, 12, 12).data;
  const values = [];
  const size = 12 / params.charSamples;

  for (let cellY = 0; cellY < params.charSamples; cellY += 1) {
    for (let cellX = 0; cellX < params.charSamples; cellX += 1) {
      let value = 0;
      for (let posY = 0; posY < size; posY += 1) {
        for (let posX = 0; posX < size; posX += 1) {
          value +=
            data[(cellX * size + posX + (cellY * size + posY) * 12) * 4 + 3];
        }
      }
      values.push(value / (size * size) / 255);
    }
  }
  charRegions[char] = values;
}

function normalizeCharRegions() {
  let min = 1;
  let max = 0;
  for (const char in charRegions) {
    for (const region of charRegions[char]) {
      if (min > region) min = region;
      if (max < region) max = region;
    }
  }
  if (max > 0 && min !== max) {
    const diff = max - min;
    for (const char in charRegions) {
      const regions = charRegions[char];
      for (let index = 0; index < regions.length; index += 1) {
        regions[index] = (regions[index] - min) * (1 / diff);
      }
    }
  }
}

function analyzeCharRegions() {
  charRegions = {};
  for (const char of params.charSet) {
    analyzeChar(char);
  }
  normalizeCharRegions();
}

function loadImageAndGenerate() {
  imageElement = new Image();
  imageElement.crossOrigin = "anonymous";
  // Use default image if no URL is set
  imageElement.src = params.url || defaultImageUrl;
  imageElement.onload = () => {
    if (isActive) onImageLoaded();
  };
}

function onImageLoaded() {
  width = params.size;

  // Store the base image aspect ratio (width/height)
  baseImageAspectRatio = imageElement.width / imageElement.height;

  // Calculate height maintaining aspect ratio
  // Character cells are now 4px x 4px (square), so no correction factor needed
  // For proper aspect ratio: height = width / (imageWidth/imageHeight)
  height = Math.floor(width / baseImageAspectRatio);

  const canvas = document.createElement("canvas");
  canvas.width = width * params.charSamples;
  canvas.height = height * params.charSamples;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.drawImage(
    imageElement,
    0,
    0,
    width * params.charSamples,
    height * params.charSamples,
  );
  generateValueMap(ctx);
}

function generateValueMap(ctx) {
  valueMap = [];
  colorMap = [];

  const imageData = ctx.getImageData(
    0,
    0,
    width * params.charSamples,
    height * params.charSamples,
  );
  const data = imageData.data;
  const rowLength = width * params.charSamples * 4;

  for (let cellY = 0; cellY < height; cellY += 1) {
    for (let cellX = 0; cellX < width; cellX += 1) {
      const cell = [];
      const pos =
        cellX * params.charSamples * 4 + cellY * params.charSamples * rowLength;
      colorMap.push([data[pos], data[pos + 1], data[pos + 2], data[pos + 3]]);

      for (let posY = 0; posY < params.charSamples; posY += 1) {
        for (let posX = 0; posX < params.charSamples; posX += 1) {
          const pos =
            (cellX * params.charSamples + posX) * 4 +
            (cellY * params.charSamples + posY) * rowLength;
          const alpha = data[pos + 3] / 255;
          const r = data[pos];
          const g = data[pos + 1];
          const b = data[pos + 2];
          const value = 1 - (((r + g + b) / 765) * alpha + 1 - alpha);
          cell.push(value);
        }
      }
      valueMap.push(cell);
    }
  }

  normalizeValueMap();
  generate();
}

function normalizeValueMap() {
  let min = 1;
  let max = 0;
  for (const regions of valueMap) {
    for (const region of regions) {
      if (min > region) min = region;
      if (max < region) max = region;
    }
  }

  if (max > 0 && min !== max) {
    const diff = max - min;
    normalizedMap = [];
    for (const regions of valueMap) {
      const normals = [...regions];
      for (let index = 0; index < normals.length; index += 1) {
        normals[index] = (normals[index] - min) * (1 / diff);
        normals[index] =
          (params.contrast + 1) * (normals[index] - 0.5) +
          0.5 +
          params.brightness;
      }
      normalizedMap.push(normals);
    }
  } else {
    normalizedMap = valueMap;
  }
}

function getClosestChar(values) {
  let minDiff = Number.MAX_VALUE;
  let minChar = "";
  for (const char in charRegions) {
    const regions = charRegions[char];
    let diff = 0;
    for (let index = 0; index < regions.length; index++) {
      diff += Math.abs(regions[index] - values[index]);
    }
    if (diff < minDiff) {
      minDiff = diff;
      minChar = char;
    }
  }
  return minChar;
}

function arrayToRgba(color) {
  const r = color[3] > 0 ? Math.floor(color[0]) : 255;
  const g = color[3] > 0 ? Math.floor(color[1]) : 255;
  const b = color[3] > 0 ? Math.floor(color[2]) : 255;
  const a = Math.max(0, Math.min(1, color[3] / 255 + params.alpha));
  return `rgba(${r},${g},${b},${a})`;
}

function getCharColor(color) {
  if (params.colorPalette === ColorPalette.ColorFull) {
    return arrayToRgba(color);
  } else {
    let closestColor = [0, 0, 0];
    let minDiff = Number.MAX_VALUE;
    for (const paletteColor of colorPalettes[params.colorPalette]) {
      const diff =
        Math.abs(color[0] - paletteColor[0]) +
        Math.abs(color[1] - paletteColor[1]) +
        Math.abs(color[2] - paletteColor[2]);
      if (diff < minDiff) {
        minDiff = diff;
        closestColor = paletteColor;
      }
    }
    return arrayToRgba([...closestColor, color[3]]);
  }
}

function generate() {
  if (!container) return;

  container.innerHTML = "";

  // Set CSS variables for dimensions (like in the example)
  container.style.setProperty("--width", width.toString());
  container.style.setProperty("--height", height.toString());

  // Create container for individual character divs
  const asciiContainer = document.createElement("div");
  asciiContainer.className = "ascii-grid";

  for (let cellY = 0; cellY < height; cellY += 1) {
    for (let cellX = 0; cellX < width; cellX += 1) {
      const cell = document.createElement("div");
      cell.className = "ascii-cell";

      if (params.colorPalette !== ColorPalette.Monochrome) {
        cell.style.color = getCharColor(colorMap[cellX + cellY * width]);
      } else {
        cell.style.color = params.charColor;
      }

      const char = getClosestChar(normalizedMap[cellX + cellY * width]);
      cell.innerHTML = char === " " ? "&nbsp;" : char;
      asciiContainer.appendChild(cell);
    }
  }

  container.appendChild(asciiContainer);
  updateBackgroundColor();
}

function updateBackgroundColor() {
  if (!container) return;
  container.style.backgroundColor = params.bgColor;
}

function createControls() {
  if (!controlsContainer) return;

  controlsContainer.innerHTML = "<h3>ASCII Generator</h3>";

  // File Upload
  const uploadGroup = document.createElement("div");
  uploadGroup.className = "control-group";
  uploadGroup.innerHTML = `
    <label>Upload Image</label>
    <input type="file" id="ctrl-upload" accept="image/*">
  `;
  controlsContainer.appendChild(uploadGroup);

  // Image URL
  const urlGroup = document.createElement("div");
  urlGroup.className = "control-group";
  urlGroup.innerHTML = `
    <label>Image URL</label>
    <input type="text" id="ctrl-url" value="${params.url}">
  `;
  controlsContainer.appendChild(urlGroup);

  // Export Scale
  const exportScaleGroup = document.createElement("div");
  exportScaleGroup.className = "control-group";
  exportScaleGroup.innerHTML = `
    <label>Export Scale <span class="value" id="val-export-scale">6</span></label>
    <input type="range" id="ctrl-export-scale" min="1" max="10" step="1" value="6">
  `;
  controlsContainer.appendChild(exportScaleGroup);

  // Download button
  const downloadGroup = document.createElement("div");
  downloadGroup.className = "control-group";
  downloadGroup.innerHTML = `
    <button id="ctrl-download" type="button">Download PNG</button>
  `;
  controlsContainer.appendChild(downloadGroup);

  // Character Set
  const charsetGroup = document.createElement("div");
  charsetGroup.className = "control-group";
  charsetGroup.innerHTML = `
    <label>Character Set</label>
    <input type="text" id="ctrl-charset" value="${params.charSet.replace(/"/g, "&quot;")}">
  `;
  controlsContainer.appendChild(charsetGroup);

  // Size
  const sizeGroup = document.createElement("div");
  sizeGroup.className = "control-group";
  sizeGroup.innerHTML = `
    <label>Width (chars) <span class="value" id="val-size">${params.size}</span></label>
    <input type="range" id="ctrl-size" min="50" max="500" value="${params.size}">
  `;
  controlsContainer.appendChild(sizeGroup);

  // Char Samples
  const samplesGroup = document.createElement("div");
  samplesGroup.className = "control-group";
  samplesGroup.innerHTML = `
    <label>Char Samples <span class="value" id="val-samples">${params.charSamples}</span></label>
    <input type="range" id="ctrl-samples" min="1" max="3" step="1" value="${params.charSamples}">
  `;
  controlsContainer.appendChild(samplesGroup);

  // Contrast
  const contrastGroup = document.createElement("div");
  contrastGroup.className = "control-group";
  contrastGroup.innerHTML = `
    <label>Contrast <span class="value" id="val-contrast">${params.contrast}</span></label>
    <input type="range" id="ctrl-contrast" min="-1" max="1" step="0.01" value="${params.contrast}">
  `;
  controlsContainer.appendChild(contrastGroup);

  // Brightness
  const brightnessGroup = document.createElement("div");
  brightnessGroup.className = "control-group";
  brightnessGroup.innerHTML = `
    <label>Brightness <span class="value" id="val-brightness">${params.brightness}</span></label>
    <input type="range" id="ctrl-brightness" min="-1" max="1" step="0.01" value="${params.brightness}">
  `;
  controlsContainer.appendChild(brightnessGroup);

  // Alpha
  const alphaGroup = document.createElement("div");
  alphaGroup.className = "control-group";
  alphaGroup.innerHTML = `
    <label>Alpha <span class="value" id="val-alpha">${params.alpha}</span></label>
    <input type="range" id="ctrl-alpha" min="-1" max="1" step="0.01" value="${params.alpha}">
  `;
  controlsContainer.appendChild(alphaGroup);

  // Color Palette
  const paletteGroup = document.createElement("div");
  paletteGroup.className = "control-group";
  const paletteOptions = Object.values(ColorPalette)
    .map(
      (p) =>
        `<option value="${p}" ${params.colorPalette === p ? "selected" : ""}>${p}</option>`,
    )
    .join("");
  paletteGroup.innerHTML = `
    <label>Color Palette</label>
    <select id="ctrl-palette">${paletteOptions}</select>
  `;
  controlsContainer.appendChild(paletteGroup);

  // Transparent Background
  const transparentBgGroup = document.createElement("div");
  transparentBgGroup.className = "control-group";
  transparentBgGroup.innerHTML = `
    <label>
      <input type="checkbox" id="ctrl-transparent-bg" ${params.transparentBg ? "checked" : ""}>
      Transparent Background
    </label>
  `;
  controlsContainer.appendChild(transparentBgGroup);

  // Background Color
  const bgColorGroup = document.createElement("div");
  bgColorGroup.className = "control-group";
  bgColorGroup.innerHTML = `
    <label>Background Color</label>
    <input type="color" id="ctrl-bgcolor" value="${params.bgColor}">
  `;
  controlsContainer.appendChild(bgColorGroup);

  // Character Color
  const charColorGroup = document.createElement("div");
  charColorGroup.className = "control-group";
  charColorGroup.innerHTML = `
    <label>Character Color</label>
    <input type="color" id="ctrl-charcolor" value="${params.charColor}">
  `;
  controlsContainer.appendChild(charColorGroup);

  // Event listeners
  document.getElementById("ctrl-upload").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        params.url = event.target.result;
        document.getElementById("ctrl-url").value = params.url;
        loadImageAndGenerate();
      };
      reader.readAsDataURL(file);
    }
  });

  document.getElementById("ctrl-url").addEventListener("change", (e) => {
    params.url = e.target.value;
    loadImageAndGenerate();
  });

  document.getElementById("ctrl-charset").addEventListener("change", (e) => {
    params.charSet = e.target.value || defaultCharSet;
    analyzeCharRegions();
    generate();
  });

  document.getElementById("ctrl-size").addEventListener("input", (e) => {
    params.size = parseInt(e.target.value);
    document.getElementById("val-size").textContent = params.size;
    loadImageAndGenerate();
  });

  document.getElementById("ctrl-samples").addEventListener("input", (e) => {
    params.charSamples = parseInt(e.target.value);
    document.getElementById("val-samples").textContent = params.charSamples;
    analyzeCharRegions();
    loadImageAndGenerate();
  });

  document.getElementById("ctrl-contrast").addEventListener("input", (e) => {
    params.contrast = parseFloat(e.target.value);
    document.getElementById("val-contrast").textContent =
      params.contrast.toFixed(2);
    normalizeValueMap();
    generate();
  });

  document.getElementById("ctrl-brightness").addEventListener("input", (e) => {
    params.brightness = parseFloat(e.target.value);
    document.getElementById("val-brightness").textContent =
      params.brightness.toFixed(2);
    normalizeValueMap();
    generate();
  });

  document.getElementById("ctrl-alpha").addEventListener("input", (e) => {
    params.alpha = parseFloat(e.target.value);
    document.getElementById("val-alpha").textContent = params.alpha.toFixed(2);
    generate();
  });

  document.getElementById("ctrl-palette").addEventListener("change", (e) => {
    params.colorPalette = e.target.value;
    generate();
  });

  document
    .getElementById("ctrl-transparent-bg")
    .addEventListener("change", (e) => {
      params.transparentBg = e.target.checked;
      generate();
    });

  document.getElementById("ctrl-bgcolor").addEventListener("input", (e) => {
    params.bgColor = e.target.value;
    updateBackgroundColor();
    generate();
  });

  document.getElementById("ctrl-charcolor").addEventListener("input", (e) => {
    params.charColor = e.target.value;
    generate();
  });

  document
    .getElementById("ctrl-export-scale")
    .addEventListener("input", (e) => {
      const scale = parseInt(e.target.value);
      document.getElementById("val-export-scale").textContent = scale;
    });

  document.getElementById("ctrl-download").addEventListener("click", () => {
    exportToPNG();
  });
}

// Initialize the generator
export function initGenerator(containerId, controlsId, imageUrl) {
  container = document.getElementById(containerId);
  controlsContainer = document.getElementById(controlsId);
  // Only set URL if provided (non-empty), otherwise use default image
  if (imageUrl) {
    params.url = imageUrl;
  }

  generatePalettes();
  analyzeCharRegions();
  createControls();
}

// Show generator
export function showGenerator() {
  if (!container) return;
  isActive = true;
  container.parentElement.classList.add("visible");
  // Always load the image to ensure we use the current URL
  loadImageAndGenerate();
}

// Hide generator
export function hideGenerator() {
  isActive = false;
  if (container) {
    container.parentElement.classList.remove("visible");
  }
}

// Parse hex color to RGB array
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [0, 0, 0];
}

// Parse RGBA string to RGB array
function rgbaToRgbArray(rgbaStr) {
  const match = rgbaStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  }
  return [0, 0, 0];
}

// Export ASCII art as PNG
function exportToPNG() {
  if (width === 0 || height === 0 || normalizedMap.length === 0) {
    alert("No ASCII art to export. Please generate an image first.");
    return;
  }

  const exportScale = parseInt(
    document.getElementById("ctrl-export-scale")?.value || 6,
  );
  // Match the display dimensions
  const charWidth = 4;
  const charHeight = 4;

  const canvasWidth = width * charWidth * exportScale;
  const canvasHeight = height * charHeight * exportScale;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    alert("Failed to create canvas for export.");
    return;
  }

  // Fill background (skip if transparent background is enabled)
  if (!params.transparentBg) {
    const bgColor = hexToRgb(params.bgColor);
    ctx.fillStyle = `rgb(${bgColor[0]}, ${bgColor[1]}, ${bgColor[2]})`;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // Set font - use line-height equal to font size for proper spacing
  const fontSize = 4 * exportScale;
  ctx.font = `${fontSize}px 'Courier New', monospace`;
  ctx.textBaseline = "top";

  // Draw each character
  for (let cellY = 0; cellY < height; cellY += 1) {
    for (let cellX = 0; cellX < width; cellX += 1) {
      const index = cellX + cellY * width;
      const char = getClosestChar(normalizedMap[index]);

      // Set color
      if (params.colorPalette !== ColorPalette.Monochrome) {
        const colorStr = getCharColor(colorMap[index]);
        const colorRgb = rgbaToRgbArray(colorStr);
        ctx.fillStyle = `rgb(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]})`;
      } else {
        ctx.fillStyle = params.charColor;
      }

      const x = cellX * charWidth * exportScale;
      const y = cellY * charHeight * exportScale;
      ctx.fillText(char, x, y);
    }
  }

  // Download the canvas as PNG
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  link.download = `ascii-art-${timestamp}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
