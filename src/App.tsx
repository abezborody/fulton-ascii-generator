import { useCallback, useRef, useEffect, useMemo, useReducer } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { IconUpload, IconDownload, IconFileTypeSvg } from "@tabler/icons-react";
import { Slider } from "./components/ui/slider";

const ColorPalette = {
	Monochrome: "none",
	Grey2Bit: "grey2bit",
	Grey4Bit: "grey4bit",
	Grey8Bit: "grey8bit",
	Color3Bit: "color3bit",
	Color4Bit: "color4bit",
	ColorFull: "color",
} as const;

type ColorPaletteValue = (typeof ColorPalette)[keyof typeof ColorPalette];

const defaultCharSet = " .:-=+*#%@";

function generatePalettes() {
	const palettes: Record<string, number[][]> = {};

	palettes[ColorPalette.Grey2Bit] = [
		[0, 0, 0],
		[104, 104, 104],
		[184, 184, 184],
		[255, 255, 255],
	];

	palettes[ColorPalette.Grey4Bit] = [];
	for (let i = 0; i < 16; i += 1) {
		palettes[ColorPalette.Grey4Bit].push([i * 17, i * 17, i * 17]);
	}

	palettes[ColorPalette.Grey8Bit] = [];
	for (let i = 0; i < 256; i += 1) {
		palettes[ColorPalette.Grey8Bit].push([i, i, i]);
	}

	palettes[ColorPalette.Color3Bit] = [
		[0, 0, 0],
		[0, 249, 45],
		[0, 252, 254],
		[255, 48, 21],
		[255, 62, 253],
		[254, 253, 52],
		[16, 37, 251],
		[255, 255, 255],
	];

	palettes[ColorPalette.Color4Bit] = [...palettes[ColorPalette.Color3Bit]];
	for (let i = 1; i < 8; i += 1) {
		palettes[ColorPalette.Color4Bit].push([i * 32, i * 32, i * 32]);
	}

	return palettes;
}

const colorPalettes = generatePalettes();

const colorPaletteNames: Record<ColorPaletteValue, string> = {
	[ColorPalette.Monochrome]: "Monochrome",
	[ColorPalette.Grey2Bit]: "Grey 2-Bit",
	[ColorPalette.Grey4Bit]: "Grey 4-Bit",
	[ColorPalette.Grey8Bit]: "Grey 8-Bit",
	[ColorPalette.Color3Bit]: "Color 3-Bit",
	[ColorPalette.Color4Bit]: "Color 4-Bit",
	[ColorPalette.ColorFull]: "Color Full",
};

interface ASCIIGeneratorProps {
	imageUrl?: string;
}

// State types
interface AppState {
	size: number;
	contrast: number;
	brightness: number;
	colorPalette: ColorPaletteValue;
	bgColor: string;
	charColor: string;
	charTint: number;
	transparentBg: boolean;
	exportScale: number;
	imageSrc: string;
}

type AppAction =
	| { type: "setSize"; payload: number }
	| { type: "setContrast"; payload: number }
	| { type: "setBrightness"; payload: number }
	| { type: "setColorPalette"; payload: ColorPaletteValue }
	| { type: "setBgColor"; payload: string }
	| { type: "setCharColor"; payload: string }
	| { type: "setCharTint"; payload: number }
	| { type: "setTransparentBg"; payload: boolean }
	| { type: "setExportScale"; payload: number }
	| { type: "setImageSrc"; payload: string };

function appReducer(state: AppState, action: AppAction): AppState {
	switch (action.type) {
		case "setSize":
			return { ...state, size: action.payload };
		case "setContrast":
			return { ...state, contrast: action.payload };
		case "setBrightness":
			return { ...state, brightness: action.payload };
		case "setColorPalette":
			return { ...state, colorPalette: action.payload };
		case "setBgColor":
			return { ...state, bgColor: action.payload };
		case "setCharColor":
			return { ...state, charColor: action.payload };
		case "setCharTint":
			return { ...state, charTint: action.payload };
		case "setTransparentBg":
			return { ...state, transparentBg: action.payload };
		case "setExportScale":
			return { ...state, exportScale: action.payload };
		case "setImageSrc":
			return { ...state, imageSrc: action.payload };
		default:
			return state;
	}
}


export function App({ imageUrl }: ASCIIGeneratorProps = {}) {
	const [state, dispatch] = useReducer(appReducer, {
		size: 200,
		contrast: 0,
		brightness: 0,
		colorPalette: ColorPalette.Grey2Bit,
		bgColor: "#ffffff",
		charColor: "#000000",
		charTint: 1,
		transparentBg: false,
		exportScale: 2,
		imageSrc: imageUrl || "",
	});

	// Processing data stored in refs (not state) to avoid re-renders during image processing
	const valueMapRef = useRef<number[][]>([]);
	const colorMapRef = useRef<number[][]>([]);
	const imageDimensionsRef = useRef({ width: 0, height: 0 });
	const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

	// Canvas ref for preview rendering
	const previewCanvasRef = useRef<HTMLCanvasElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const charSamples = 1;
	const alpha = 0;

	// Helper functions for color conversion
	const hexToRgb = useCallback((hex: string): number[] => {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result
			? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
			: [0, 0, 0];
	}, []);

	// Helper: analyze a single character
	const analyzeChar = useCallback((char: string, samples: number) => {
		const canvas = document.createElement("canvas");
		canvas.width = 12;
		canvas.height = 12;
		const ctx = canvas.getContext("2d");
		if (!ctx) return [];

		ctx.font = "12px monospace";
		ctx.fillText(char, 2, 10);
		const data = ctx.getImageData(0, 0, 12, 12).data;
		const values: number[] = [];
		const sampleSize = 12 / samples;

		for (let cellY = 0; cellY < samples; cellY += 1) {
			for (let cellX = 0; cellX < samples; cellX += 1) {
				let value = 0;
				for (let posY = 0; posY < sampleSize; posY += 1) {
					for (let posX = 0; posX < sampleSize; posX += 1) {
						value +=
							data[(cellX * sampleSize + posX + (cellY * sampleSize + posY) * 12) * 4 + 3];
					}
				}
				values.push(value / (sampleSize * sampleSize) / 255);
			}
		}
		return values;
	}, []);

	// Normalize character regions
	const normalizeCharRegions = useCallback((regions: Record<string, number[][]>) => {
		let min = 1;
		let max = 0;
		for (const char in regions) {
			for (const region of regions[char]) {
				for (const val of region) {
					if (min > val) min = val;
					if (max < val) max = val;
				}
			}
		}
		if (max > 0 && min !== max) {
			const diff = max - min;
			for (const char in regions) {
				const charRegions = regions[char];
				for (let index = 0; index < charRegions.length; index += 1) {
					charRegions[index][0] = (charRegions[index][0] - min) * (1 / diff);
				}
			}
		}
		return regions;
	}, []);

	// Compute normalized char regions using useMemo
	const normalizedCharRegions = useMemo(() => {
		const regions: Record<string, number[][]> = {};
		for (const char of defaultCharSet) {
			const values = analyzeChar(char, charSamples);
			regions[char] = values.map(v => [v]);
		}
		return normalizeCharRegions(regions);
	}, [charSamples, analyzeChar, normalizeCharRegions]);

	// Get closest character for a set of values
	const getClosestChar = useCallback((values: number[]): string => {
		let minDiff = Number.MAX_VALUE;
		let minChar = "";
		for (const char in normalizedCharRegions) {
			const regions = normalizedCharRegions[char];
			let diff = 0;
			for (let index = 0; index < regions.length; index++) {
				diff += Math.abs(regions[index][0] - values[index]);
			}
			if (diff < minDiff) {
				minDiff = diff;
				minChar = char;
			}
		}
		return minChar;
	}, [normalizedCharRegions]);

	// Convert color array to RGBA components
	const getColorRgba = useCallback((color: number[], palette: ColorPaletteValue, tint: number, charColorHex: string): [number, number, number, number] => {
		let r = color[3] > 0 ? Math.floor(color[0]) : 255;
		let g = color[3] > 0 ? Math.floor(color[1]) : 255;
		let b = color[3] > 0 ? Math.floor(color[2]) : 255;
		const a = Math.max(0, Math.min(1, color[3] / 255 + alpha));

		// Apply char tint if not monochrome
		if (palette !== ColorPalette.Monochrome && tint !== 1) {
			const charRgb = hexToRgb(charColorHex);
			r = Math.min(255, Math.floor(r * tint + charRgb[0] * (1 - tint)));
			g = Math.min(255, Math.floor(g * tint + charRgb[1] * (1 - tint)));
			b = Math.min(255, Math.floor(b * tint + charRgb[2] * (1 - tint)));
		}

		return [r, g, b, a];
	}, [alpha, hexToRgb]);

	// Get character color based on palette - returns [r, g, b, a]
	const getCharColorRgba = useCallback((color: number[], palette: ColorPaletteValue, tint: number, charColorHex: string): [number, number, number, number] => {
		if (palette === ColorPalette.ColorFull) {
			return getColorRgba(color, palette, tint, charColorHex);
		} else {
			let closestColor = [0, 0, 0];
			let minDiff = Number.MAX_VALUE;
			for (const paletteColor of colorPalettes[palette]) {
				const diff =
					Math.abs(color[0] - paletteColor[0]) +
					Math.abs(color[1] - paletteColor[1]) +
					Math.abs(color[2] - paletteColor[2]);
				if (diff < minDiff) {
					minDiff = diff;
					closestColor = paletteColor;
				}
			}
			return getColorRgba([...closestColor, color[3]], palette, tint, charColorHex);
		}
	}, [getColorRgba]);

	// Normalize value map with contrast and brightness
	const normalizedMap = useMemo(() => {
		const valueMap = valueMapRef.current;
		if (valueMap.length === 0) return [];

		let min = 1;
		let max = 0;
		for (const regions of valueMap) {
			for (const region of regions) {
				if (min > region) min = region;
				if (max < region) max = region;
			}
		}

		const result: number[][] = [];
		if (max > 0 && min !== max) {
			const diff = max - min;
			for (const regions of valueMap) {
				const normals = [...regions];
				for (let index = 0; index < normals.length; index += 1) {
					normals[index] = (normals[index] - min) * (1 / diff);
					normals[index] =
						(state.contrast + 1) * (normals[index] - 0.5) +
						0.5 +
						state.brightness;
					// Clamp to valid range
					normals[index] = Math.max(0, Math.min(1, normals[index]));
				}
				result.push(normals);
			}
		} else {
			for (const regions of valueMap) {
				result.push([...regions]);
			}
		}
		return result;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.contrast, state.brightness, valueMapRef.current]);

	// Load and process image
	const loadImageAndProcess = useCallback(() => {
		if (!state.imageSrc) return;

		const img = new Image();
		img.crossOrigin = "anonymous";
		img.src = state.imageSrc;

		img.onload = () => {
			const width = state.size;
			const baseImageAspectRatio = img.width / img.height;
			const height = Math.floor(width / baseImageAspectRatio);

			imageDimensionsRef.current = { width, height };

			const canvas = document.createElement("canvas");
			canvas.width = width * charSamples;
			canvas.height = height * charSamples;
			const ctx = canvas.getContext("2d");
			if (!ctx) return;

			ctx.drawImage(img, 0, 0, width * charSamples, height * charSamples);

			// Generate value and color maps
			const imageData = ctx.getImageData(0, 0, width * charSamples, height * charSamples);
			const data = imageData.data;
			const rowLength = width * charSamples * 4;

			const newValueMap: number[][] = [];
			const newColorMap: number[][] = [];

			for (let cellY = 0; cellY < height; cellY += 1) {
				for (let cellX = 0; cellX < width; cellX += 1) {
					const cell: number[] = [];
					const pos = cellX * charSamples * 4 + cellY * charSamples * rowLength;
					newColorMap.push([data[pos], data[pos + 1], data[pos + 2], data[pos + 3]]);

					for (let posY = 0; posY < charSamples; posY += 1) {
						for (let posX = 0; posX < charSamples; posX += 1) {
							const pixelPos =
								(cellX * charSamples + posX) * 4 +
								(cellY * charSamples + posY) * rowLength;
							const alphaChannel = data[pixelPos + 3] / 255;
							const r = data[pixelPos];
							const g = data[pixelPos + 1];
							const b = data[pixelPos + 2];
							const value =
								1 - (((r + g + b) / 765) * alphaChannel + 1 - alphaChannel);
							cell.push(value);
						}
					}
					newValueMap.push(cell);
				}
			}

			valueMapRef.current = newValueMap;
			colorMapRef.current = newColorMap;
			forceUpdate();
		};
	}, [state.imageSrc, state.size, charSamples]);

	// Trigger image reload when dependencies change
	useEffect(() => {
		loadImageAndProcess();
	}, [loadImageAndProcess]);

	// Draw to preview canvas whenever data changes (replaces DOM-based ASCII grid)
	useEffect(() => {
		const canvas = previewCanvasRef.current;
		if (!canvas) return;

		const { width, height } = imageDimensionsRef.current;
		if (width === 0 || height === 0 || normalizedMap.length === 0) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const scale = Math.max(window.devicePixelRatio || 2, 2);
		const displayWidth = 800;
		const cellSize = displayWidth / width;
		const displayHeight = cellSize * height;

		canvas.width = displayWidth * scale;
		canvas.height = displayHeight * scale;
		canvas.style.width = `${displayWidth}px`;
		canvas.style.height = `${displayHeight}px`;

		ctx.scale(scale, scale);
		ctx.clearRect(0, 0, displayWidth, displayHeight);

		// Fill background
		if (!state.transparentBg) {
			const bgColorRgb = hexToRgb(state.bgColor);
			ctx.fillStyle = `rgb(${bgColorRgb[0]}, ${bgColorRgb[1]}, ${bgColorRgb[2]})`;
			ctx.fillRect(0, 0, displayWidth, displayHeight);
		}

		// Set font
		ctx.font = `500 ${cellSize}px 'Courier New', monospace`;
		ctx.textBaseline = "top";

		// Draw each character directly to canvas
		for (let cellY = 0; cellY < height; cellY += 1) {
			for (let cellX = 0; cellX < width; cellX += 1) {
				const index = cellX + cellY * width;
				const values = normalizedMap[index];
				const char = getClosestChar(values);

				if (state.colorPalette !== ColorPalette.Monochrome) {
					const color = colorMapRef.current[index];
					const [r, g, b] = getCharColorRgba(color, state.colorPalette, state.charTint, state.charColor);
					ctx.fillStyle = `rgb(${r},${g},${b})`;
				} else {
					ctx.fillStyle = state.charColor;
				}

				ctx.fillText(char === " " ? "\u00A0" : char, cellX * cellSize, cellY * cellSize);
			}
		}
	}, [normalizedMap, state.bgColor, state.transparentBg, state.charColor, state.colorPalette, state.charTint, getClosestChar, getCharColorRgba, hexToRgb]);

	// Handle file upload
	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (event) => {
				dispatch({ type: "setImageSrc", payload: event.target?.result as string });
			};
			reader.readAsDataURL(file);
		}
	};

	// Handle PNG download
	const handleDownloadPng = () => {
		const { width, height } = imageDimensionsRef.current;
		if (width === 0 || height === 0 || normalizedMap.length === 0) return;

		const baseFontSize = 12;
		const fontSize = baseFontSize * state.exportScale;
		const cellWidth = fontSize;
		const cellHeight = fontSize;

		const canvasWidth = width * cellWidth;
		const canvasHeight = height * cellHeight;

		const canvas = document.createElement("canvas");
		canvas.width = canvasWidth;
		canvas.height = canvasHeight;
		const ctx = canvas.getContext("2d");

		if (!ctx) return;

		// Fill background
		if (!state.transparentBg) {
			const bgColorRgb = hexToRgb(state.bgColor);
			ctx.fillStyle = `rgb(${bgColorRgb[0]}, ${bgColorRgb[1]}, ${bgColorRgb[2]})`;
			ctx.fillRect(0, 0, canvasWidth, canvasHeight);
		}

		// Set font
		ctx.font = `500 ${fontSize}px 'Courier New', monospace`;
		ctx.textBaseline = "top";

		// Draw each character
		for (let cellY = 0; cellY < height; cellY += 1) {
			for (let cellX = 0; cellX < width; cellX += 1) {
				const index = cellX + cellY * width;
				const values = normalizedMap[index];
				const char = getClosestChar(values);

				if (state.colorPalette !== ColorPalette.Monochrome) {
					const color = colorMapRef.current[index];
					const [r, g, b] = getCharColorRgba(color, state.colorPalette, state.charTint, state.charColor);
					ctx.fillStyle = `rgb(${r},${g},${b})`;
				} else {
					ctx.fillStyle = state.charColor;
				}

				ctx.fillText(char, cellX * cellWidth, cellY * cellHeight);
			}
		}

		const link = document.createElement("a");
		const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
		link.download = `ascii-art-${timestamp}.png`;
		link.href = canvas.toDataURL("image/png");
		link.click();
	};

	// XML escape helper for SVG
	const escapeXml = (str: string): string => {
		return str
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&apos;");
	};

	// Handle SVG download
	const handleDownloadSvg = () => {
		const { width, height } = imageDimensionsRef.current;
		if (width === 0 || height === 0 || normalizedMap.length === 0) return;

		const cellSize = 8;
		const svgWidth = width * cellSize;
		const svgHeight = height * cellSize;

		let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
		svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">\n`;

		if (!state.transparentBg) {
			svg += `  <rect width="${svgWidth}" height="${svgHeight}" fill="${state.bgColor}"/>\n`;
		}

		for (let cellY = 0; cellY < height; cellY += 1) {
			const y = (cellY + 1) * cellSize;

			// Group consecutive same-color characters into single <text> with textLength
			let runStart = 0;
			let runColor = "";

			for (let cellX = 0; cellX <= width; cellX += 1) {
				let hexColor = "";

				if (cellX < width) {
					const index = cellX + cellY * width;

					if (state.colorPalette !== ColorPalette.Monochrome) {
						const colorArr = colorMapRef.current[index];
						const [r, g, b] = getCharColorRgba(colorArr, state.colorPalette, state.charTint, state.charColor);
						hexColor = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
					} else {
						hexColor = state.charColor;
					}
				}

				if (cellX === 0) {
					runStart = 0;
					runColor = hexColor;
					continue;
				}

				if (hexColor !== runColor || cellX === width) {
					// Flush the current run
					const runLen = cellX - runStart;
					let runText = "";
					for (let i = runStart; i < cellX; i++) {
						const idx = i + cellY * width;
						const vals = normalizedMap[idx];
						const ch = getClosestChar(vals);
						runText += ch === " " ? "\u00A0" : ch;
					}
					const x = runStart * cellSize;
					const runWidth = runLen * cellSize;
					svg += `  <text x="${x}" y="${y}" font-family="'Courier New', monospace" font-size="${cellSize}" font-weight="500" fill="${runColor}" textLength="${runWidth}" lengthAdjust="spacing">${escapeXml(runText)}</text>\n`;

					runStart = cellX;
					runColor = hexColor;
				}
			}
		}

		svg += `</svg>`;

		const blob = new Blob([svg], { type: "image/svg+xml" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
		link.download = `ascii-art-${timestamp}.svg`;
		link.href = url;
		link.click();
		URL.revokeObjectURL(url);
	};

	const hasImage = state.imageSrc && imageDimensionsRef.current.width > 0;

	return (
		<div className="flex h-screen w-full bg-background text-foreground">
			{/* Sidebar */}
			<aside className="w-72 border-r border-border bg-muted/30 flex flex-col overflow-y-auto">
				<div className="p-4 border-b border-border">
					<h1 className="text-lg font-semibold">ASCII Generator</h1>
				</div>

				<div className="p-4 space-y-5 flex-1">
					{/* Image Upload */}
					<div className="space-y-2">
						<Label htmlFor="file-upload">Upload Image</Label>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => fileInputRef.current?.click()}
								className="w-full"
							>
								<IconUpload className="size-4" />
								Choose File
							</Button>
							<input
								ref={fileInputRef}
								id="file-upload"
								type="file"
								accept="image/*"
								onChange={handleFileUpload}
								className="hidden"
							/>
						</div>
					</div>

					{/* Width */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="size">Width (chars)</Label>
							<span className="text-xs text-muted-foreground">{state.size}</span>
						</div>
						<Slider
							id="size"
							min={50}
							max={300}
							value={[state.size]}
							onValueChange={(values) => dispatch({ type: "setSize", payload: Array.isArray(values) ? values[0] : values })}
							className="w-full h-1.5 bg-input rounded-lg appearance-none cursor-pointer"
						/>
					</div>

					{/* Contrast */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="contrast">Contrast</Label>
							<span className="text-xs text-muted-foreground">{state.contrast.toFixed(2)}</span>
						</div>
						<Slider
							id="contrast"
							min={-1}
							max={1}
							step={0.01}
							value={[state.contrast]}
							onValueChange={(values) => dispatch({ type: "setContrast", payload: Array.isArray(values) ? values[0] : values })}
							className="w-full h-1.5 bg-input rounded-lg appearance-none cursor-pointer"
						/>
					</div>

					{/* Brightness */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="brightness">Brightness</Label>
							<span className="text-xs text-muted-foreground">{state.brightness.toFixed(2)}</span>
						</div>
						<Slider
							id="brightness"
							min={-1}
							max={1}
							step={0.01}
							value={[state.brightness]}
							onValueChange={(values) => dispatch({ type: "setBrightness", payload: Array.isArray(values) ? values[0] : values })}
							className="w-full h-1.5 bg-input rounded-lg appearance-none cursor-pointer"
						/>
					</div>

					{/* Color Palette */}
					<div className="space-y-2">
						<Label htmlFor="palette">Color Palette</Label>
						<Select
							value={state.colorPalette}
							onValueChange={(value) => dispatch({ type: "setColorPalette", payload: value as ColorPaletteValue })}
						>
							<SelectTrigger id="palette" className="w-full">
								<SelectValue>{colorPaletteNames[state.colorPalette]}</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ColorPalette.Monochrome}>Monochrome</SelectItem>
								<SelectItem value={ColorPalette.Grey2Bit}>Grey 2-Bit</SelectItem>
								<SelectItem value={ColorPalette.ColorFull}>Color Full</SelectItem>
								<SelectItem value={ColorPalette.Grey4Bit}>Grey 4-Bit</SelectItem>
								<SelectItem value={ColorPalette.Grey8Bit}>Grey 8-Bit</SelectItem>
								<SelectItem value={ColorPalette.Color3Bit}>Color 3-Bit</SelectItem>
								<SelectItem value={ColorPalette.Color4Bit}>Color 4-Bit</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Char Tint - only visible when color palette is active */}
					{state.colorPalette !== ColorPalette.Monochrome && (
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="chartint" title="Blend character color with palette colors">
									Char Tint
								</Label>
								<span className="text-xs text-muted-foreground">{state.charTint.toFixed(2)}</span>
							</div>
							<Slider
								id="chartint"
								min={0}
								max={2}
								step={0.05}
								value={[state.charTint]}
								onValueChange={(values) => dispatch({ type: "setCharTint", payload: Array.isArray(values) ? values[0] : values })}
								className="w-full h-1.5 bg-input rounded-lg appearance-none cursor-pointer"
							/>
							<p className="text-[10px] text-muted-foreground">
								{state.charTint < 1 ? "Blend with character color (darker)" : state.charTint > 1 ? "Boost brightness" : "Original colors"}
							</p>
						</div>
					)}

					{/* Transparent Background */}
					<div className="flex items-center gap-2">
						<input
							id="transparent-bg"
							type="checkbox"
							checked={state.transparentBg}
							onChange={(e) => dispatch({ type: "setTransparentBg", payload: e.target.checked })}
							className="h-4 w-4 rounded border-input"
						/>
						<Label htmlFor="transparent-bg" className="cursor-pointer">
							Transparent Background
						</Label>
					</div>

					{/* Background Color */}
					<div className="space-y-2">
						<Label htmlFor="bgcolor">Background Color</Label>
						<div className="flex items-center gap-2">
							<input
								id="bgcolor"
								type="color"
								value={state.bgColor}
								onChange={(e) => dispatch({ type: "setBgColor", payload: e.target.value })}
								className="h-8 w-14 rounded-lg cursor-pointer"
							/>
							<Input
								value={state.bgColor}
								onChange={(e) => dispatch({ type: "setBgColor", payload: e.target.value })}
								className="flex-1"
							/>
						</div>
					</div>

					{/* Character Color */}
					<div className="space-y-2">
						<Label htmlFor="charcolor">Character Color</Label>
						<div className="flex items-center gap-2">
							<input
								id="charcolor"
								type="color"
								value={state.charColor}
								onChange={(e) => dispatch({ type: "setCharColor", payload: e.target.value })}
								className="h-8 w-14 rounded cursor-pointer"
							/>
							<Input
								value={state.charColor}
								onChange={(e) => dispatch({ type: "setCharColor", payload: e.target.value })}
								className="flex-1"
							/>
						</div>
					</div>

					{/* Export Scale */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="export-scale">Export Scale</Label>
							<span className="text-xs text-muted-foreground">x{state.exportScale}</span>
						</div>
						<Slider
							id="export-scale"
							min={1}
							max={10}
							step={1}
							value={[state.exportScale]}
							onValueChange={(values) => dispatch({ type: "setExportScale", payload: Array.isArray(values) ? values[0] : values })}
							className="w-full h-1.5 bg-input rounded-lg appearance-none cursor-pointer"
						/>
					</div>

					{/* Download Buttons */}
					<div className="space-y-2">
						<Button onClick={handleDownloadPng} className="w-full">
							<IconDownload className="size-4" />
							Download PNG
						</Button>
						<Button onClick={handleDownloadSvg} variant="outline" className="w-full">
							<IconFileTypeSvg className="size-4" />
							Download SVG
						</Button>
					</div>
				</div>
			</aside>

			{/* Main Content */}
			<main className="flex-1 flex items-center justify-center p-8 overflow-auto">
				<div className="inline-block border rounded-sm overflow-hidden">
					{hasImage ? (
						<canvas
							ref={previewCanvasRef}
							className="block"
							style={{ maxWidth: "100%", maxHeight: "80vh" }}
						/>
					) : (
						<div className="w-[800px] h-[600px] flex items-center justify-center text-muted-foreground">
							Upload an image to generate ASCII art
						</div>
					)}
				</div>
			</main>
		</div>
	);
}

export default App;
