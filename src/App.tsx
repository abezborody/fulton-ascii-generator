import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
import { IconUpload, IconDownload } from "@tabler/icons-react";
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

export function App({ imageUrl }: ASCIIGeneratorProps = {}) {
	// State for settings
	const [charSet] = useState(defaultCharSet);
	const [size, setSize] = useState(200);
	// Store fixed canvas dimensions for consistent export output
	const [fixedCanvasSize, setFixedCanvasSize] = useState<{ width: number; height: number } | null>(null);
	const [charSamples] = useState(1);
	const [contrast, setContrast] = useState(0);
	const [brightness, setBrightness] = useState(0);
	const [alpha] = useState(0);
	const [colorPalette, setColorPalette] = useState<ColorPaletteValue>(
		ColorPalette.Grey2Bit
	);
	const [bgColor, setBgColor] = useState("#ffffff");
	const [charColor, setCharColor] = useState("#000000");
	const [charTint, setCharTint] = useState(1); // Multiplier for char color brightness (0-2)
	const [transparentBg, setTransparentBg] = useState(false);
	const [exportScale, setExportScale] = useState(2);

	// State for image and processing data - using state for proper reactivity
	const [imageSrc, setImageSrc] = useState(imageUrl || "");
	const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
	// Store raw value map and color map in state for proper reactivity
	const [valueMap, setValueMap] = useState<number[][]>([]);
	const [colorMap, setColorMap] = useState<number[][]>([]);

	const fileInputRef = useRef<HTMLInputElement>(null);
	const outputContainerRef = useRef<HTMLDivElement>(null);

	// Helper functions for color conversion
	const hexToRgb = useCallback((hex: string): number[] => {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result
			? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
			: [0, 0, 0];
	}, []);

	const rgbaToRgbArray = useCallback((rgbaStr: string): number[] => {
		const match = rgbaStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
		if (match) {
			return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
		}
		return [0, 0, 0];
	}, []);

	// Helper: analyze a single character
	const analyzeChar = useCallback((char: string, charSamples: number) => {
		const canvas = document.createElement("canvas");
		canvas.width = 12;
		canvas.height = 12;
		const ctx = canvas.getContext("2d");
		if (!ctx) return [];

		ctx.font = "12px monospace";
		ctx.fillText(char, 2, 10);
		const data = ctx.getImageData(0, 0, 12, 12).data;
		const values: number[] = [];
		const sampleSize = 12 / charSamples;

		for (let cellY = 0; cellY < charSamples; cellY += 1) {
			for (let cellX = 0; cellX < charSamples; cellX += 1) {
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
		for (const char of charSet) {
			const values = analyzeChar(char, charSamples);
			// analyzeChar returns number[], we need number[][]
			regions[char] = values.map(v => [v]);
		}
		return normalizeCharRegions(regions);
	}, [charSet, charSamples, analyzeChar, normalizeCharRegions]);

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

	// Convert color array to RGBA string with optional char tint
	const arrayToRgba = useCallback((color: number[]): string => {
		const r = color[3] > 0 ? Math.floor(color[0]) : 255;
		const g = color[3] > 0 ? Math.floor(color[1]) : 255;
		const b = color[3] > 0 ? Math.floor(color[2]) : 255;
		const a = Math.max(0, Math.min(1, color[3] / 255 + alpha));

		// Apply char tint if not monochrome
		if (colorPalette !== ColorPalette.Monochrome && charTint !== 1) {
			// Parse charColor to RGB
			const charRgb = hexToRgb(charColor);
			// Blend original color with char color based on tint value
			const tintedR = Math.min(255, Math.floor(r * charTint + charRgb[0] * (1 - charTint)));
			const tintedG = Math.min(255, Math.floor(g * charTint + charRgb[1] * (1 - charTint)));
			const tintedB = Math.min(255, Math.floor(b * charTint + charRgb[2] * (1 - charTint)));
			return `rgba(${tintedR},${tintedG},${tintedB},${a})`;
		}

		return `rgba(${r},${g},${b},${a})`;
	}, [alpha, colorPalette, charTint, charColor, hexToRgb]);

	// Get character color based on palette
	const getCharColor = useCallback((color: number[]): string => {
		if (colorPalette === ColorPalette.ColorFull) {
			return arrayToRgba(color);
		} else {
			let closestColor = [0, 0, 0];
			let minDiff = Number.MAX_VALUE;
			for (const paletteColor of colorPalettes[colorPalette]) {
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
	}, [colorPalette, arrayToRgba]);

	// Normalize value map with contrast and brightness - now uses state instead of ref
	const normalizedMap = useMemo(() => {
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
						(contrast + 1) * (normals[index] - 0.5) +
						0.5 +
						brightness;
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
	}, [valueMap, contrast, brightness]);

	// Load and process image
	const loadImageAndProcess = useCallback(() => {
		if (!imageSrc) return;

		const img = new Image();
		img.crossOrigin = "anonymous";
		img.src = imageSrc;

		img.onload = () => {
			const width = size;
			const baseImageAspectRatio = img.width / img.height;
			const height = Math.floor(width / baseImageAspectRatio);

			// Save the canvas dimensions on first load (for consistent export dimensions)
			if (fixedCanvasSize === null) {
				const charWidth = 4;
				const charHeight = 4;
				setFixedCanvasSize({
					width: width * charWidth * exportScale,
					height: height * charHeight * exportScale,
				});
			}

			setImageDimensions({ width, height });

			const canvas = document.createElement("canvas");
			canvas.width = width * charSamples;
			canvas.height = height * charSamples;
			const ctx = canvas.getContext("2d");
			if (!ctx) return;

			ctx.drawImage(
				img,
				0,
				0,
				width * charSamples,
				height * charSamples
			);

			// Generate value and color maps
			const imageData = ctx.getImageData(
				0,
				0,
				width * charSamples,
				height * charSamples
			);
			const data = imageData.data;
			const rowLength = width * charSamples * 4;

			const newValueMap: number[][] = [];
			const newColorMap: number[][] = [];

			for (let cellY = 0; cellY < height; cellY += 1) {
				for (let cellX = 0; cellX < width; cellX += 1) {
					const cell: number[] = [];
					const pos =
						cellX * charSamples * 4 + cellY * charSamples * rowLength;
					newColorMap.push([
						data[pos],
						data[pos + 1],
						data[pos + 2],
						data[pos + 3],
					]);

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

			setValueMap(newValueMap);
			setColorMap(newColorMap);
		};
	}, [imageSrc, size, charSamples, fixedCanvasSize, exportScale]);

	// Trigger image reload when size or charSamples changes
	useEffect(() => {
		loadImageAndProcess();
	}, [loadImageAndProcess]);

	// Handle file upload
	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (event) => {
				setImageSrc(event.target?.result as string);
				// Reset fixedCanvasSize when a new image is loaded
				setFixedCanvasSize(null);
			};
			reader.readAsDataURL(file);
		}
	};

	// Handle download
	const handleDownload = () => {
		const { width, height } = imageDimensions;
		if (width === 0 || height === 0 || normalizedMap.length === 0 || fixedCanvasSize === null) return;

		// Calculate char size to fit the fixed canvas dimensions
		const scaledCharWidth = fixedCanvasSize.width / width / exportScale;
		const scaledCharHeight = fixedCanvasSize.height / height / exportScale;

		const canvasWidth = fixedCanvasSize.width;
		const canvasHeight = fixedCanvasSize.height;

		const canvas = document.createElement("canvas");
		canvas.width = canvasWidth;
		canvas.height = canvasHeight;
		const ctx = canvas.getContext("2d");

		if (!ctx) return;

		// Fill background
		if (!transparentBg) {
			const bgColorRgb = hexToRgb(bgColor);
			ctx.fillStyle = `rgb(${bgColorRgb[0]}, ${bgColorRgb[1]}, ${bgColorRgb[2]})`;
			ctx.fillRect(0, 0, canvasWidth, canvasHeight);
		}

		// Set font
		const fontSize = scaledCharWidth * exportScale;
		ctx.font = `${fontSize}px 'Courier New', monospace`;
		ctx.textBaseline = "top";

		// Draw each character
		for (let cellY = 0; cellY < height; cellY += 1) {
			for (let cellX = 0; cellX < width; cellX += 1) {
				const index = cellX + cellY * width;
				const values = normalizedMap[index];
				const char = getClosestChar(values);

				// Set color
				if (colorPalette !== ColorPalette.Monochrome) {
					const color = colorMap[index];
					const colorStr = getCharColor(color);
					const colorRgb = rgbaToRgbArray(colorStr);
					ctx.fillStyle = `rgb(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]})`;
				} else {
					ctx.fillStyle = charColor;
				}

				const x = cellX * scaledCharWidth * exportScale;
				const y = cellY * scaledCharHeight * exportScale;
				ctx.fillText(char, x, y);
			}
		}

		// Download
		const link = document.createElement("a");
		const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
		link.download = `ascii-art-${timestamp}.png`;
		link.href = canvas.toDataURL("image/png");
		link.click();
	};

	// Generate ASCII output
	const asciiOutput = useMemo(() => {
		const { width, height } = imageDimensions;
		if (width === 0 || height === 0 || normalizedMap.length === 0) {
			return null;
		}

		const cells: React.ReactNode[] = [];
		for (let cellY = 0; cellY < height; cellY += 1) {
			for (let cellX = 0; cellX < width; cellX += 1) {
				const index = cellX + cellY * width;
				const values = normalizedMap[index];
				const char = getClosestChar(values);
				const color =
					colorPalette !== ColorPalette.Monochrome
						? getCharColor(colorMap[index])
						: charColor;

				cells.push(
					<span
						key={`${cellX}-${cellY}`}
						className="ascii-cell"
						style={{
							color: color,
						}}
					>
						{char === " " ? "\u00A0" : char}
					</span>
				);
			}
		}

		const containerWidth = 800;
		const cellSize = containerWidth / width;

		return (
			<div className="ascii-grid" style={{
				backgroundColor: transparentBg ? "transparent" : bgColor,
				"--width": width.toString(),
				"--height": height.toString(),
				"--cell-size": `${cellSize}px`,
			} as React.CSSProperties}>
				{cells}
			</div>
		);
	}, [normalizedMap, imageDimensions, colorPalette, charColor, bgColor, transparentBg, colorMap, getClosestChar, getCharColor]);

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

					{/* Character Set */}
					{/* <div className="space-y-2">
						<Label htmlFor="charset">Character Set</Label>
						<Input
							id="charset"
							value={charSet}
							onChange={(e) => setCharSet(e.target.value)}
						/>
					</div> */}

					{/* Width */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="size">Width (chars)</Label>
							<span className="text-xs text-muted-foreground">{size}</span>
						</div>
						<Slider
							id="size"
							min={50}
							max={300}
							value={[size]}
							onValueChange={(values) => setSize(Array.isArray(values) ? values[0] : values)}
							className="w-full h-1.5 bg-input rounded-lg appearance-none cursor-pointer"
						/>
					</div>

					{/* Char Samples */}
					{/* <div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="samples">Char Samples</Label>
							<span className="text-xs text-muted-foreground">{charSamples}</span>
						</div>
						<input
							id="samples"
							type="range"
							min="1"
							max="3"
							step="1"
							value={charSamples}
							onChange={(e) => setCharSamples(parseInt(e.target.value))}
							className="w-full h-1.5 bg-input rounded-lg appearance-none cursor-pointer"
						/>
					</div> */}

					{/* Contrast */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="contrast">Contrast</Label>
							<span className="text-xs text-muted-foreground">{contrast.toFixed(2)}</span>
						</div>
						<Slider
							id="contrast"
							min={-1}
							max={1}
							step={0.01}
							value={[contrast]}
							onValueChange={(values) => setContrast(Array.isArray(values) ? values[0] : values)}
							className="w-full h-1.5 bg-input rounded-lg appearance-none cursor-pointer"
						/>
					</div>

					{/* Brightness */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="brightness">Brightness</Label>
							<span className="text-xs text-muted-foreground">{brightness.toFixed(2)}</span>
						</div>
						<Slider
							id="brightness"
							min={-1}
							max={1}
							step={0.01}
							value={[brightness]}
							onValueChange={(values) => setBrightness(Array.isArray(values) ? values[0] : values)}
							className="w-full h-1.5 bg-input rounded-lg appearance-none cursor-pointer"
						/>
					</div>

					{/* Alpha */}
					{/* <div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="alpha" title="Adjusts character transparency">
								Alpha
							</Label>
							<span className="text-xs text-muted-foreground">{alpha.toFixed(2)}</span>
						</div>
						<input
							id="alpha"
							type="range"
							min="-1"
							max="1"
							step="0.01"
							value={alpha}
							onChange={(e) => setAlpha(parseFloat(e.target.value))}
							className="w-full h-1.5 bg-input rounded-lg appearance-none cursor-pointer"
						/>
						<p className="text-[10px] text-muted-foreground">
							Character transparency adjustment
						</p>
					</div> */}

					{/* Color Palette */}
					<div className="space-y-2">
						<Label htmlFor="palette">Color Palette</Label>
						<Select
							value={colorPalette}
							onValueChange={(value) => setColorPalette(value as ColorPaletteValue)}
						>
							<SelectTrigger id="palette" className="w-full">
								<SelectValue>{colorPaletteNames[colorPalette]}</SelectValue>
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
					{colorPalette !== ColorPalette.Monochrome && (
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="chartint" title="Blend character color with palette colors">
									Char Tint
								</Label>
								<span className="text-xs text-muted-foreground">{charTint.toFixed(2)}</span>
							</div>
							<Slider
								id="chartint"
								min={0}
								max={2}
								step={0.05}
								value={[charTint]}
								onValueChange={(values) => setCharTint(Array.isArray(values) ? values[0] : values)}
								className="w-full h-1.5 bg-input rounded-lg appearance-none cursor-pointer"
							/>
							<p className="text-[10px] text-muted-foreground">
								{charTint < 1 ? "Blend with character color (darker)" : charTint > 1 ? "Boost brightness" : "Original colors"}
							</p>
						</div>
					)}

					{/* Transparent Background */}
					<div className="flex items-center gap-2">
						<input
							id="transparent-bg"
							type="checkbox"
							checked={transparentBg}
							onChange={(e) => setTransparentBg(e.target.checked)}
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
								value={bgColor}
								onChange={(e) => setBgColor(e.target.value)}
								className="h-8 w-14 rounded-lg cursor-pointer"
							/>
							<Input
								value={bgColor}
								onChange={(e) => setBgColor(e.target.value)}
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
								value={charColor}
								onChange={(e) => setCharColor(e.target.value)}
								className="h-8 w-14 rounded cursor-pointer"
							/>
							<Input
								value={charColor}
								onChange={(e) => setCharColor(e.target.value)}
								className="flex-1"
							/>
						</div>
					</div>

					{/* Export Scale */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="export-scale">Export Scale</Label>
							<span className="text-xs text-muted-foreground">x{exportScale}</span>
						</div>
						<Slider
							id="export-scale"
							min={1}
							max={10}
							step={1}
							value={[exportScale]}
							onValueChange={(values) => setExportScale(Array.isArray(values) ? values[0] : values)}
							className="w-full h-1.5 bg-input rounded-lg appearance-none cursor-pointer"
						/>
					</div>

					{/* Download Button */}
					<Button onClick={handleDownload} className="w-full">
						<IconDownload className="size-4" />
						Download PNG
					</Button>
				</div>
			</aside>

			{/* Main Content */}
			<main className="flex-1 flex items-center justify-center p-8 overflow-auto">
				<div
					ref={outputContainerRef}
					className="inline-block border rounded-sm overflow-hidden"
				>
					{asciiOutput || (
						<div className="w-[800px] h-[600px] flex items-center justify-center text-muted-foreground">
							Upload an image to generate ASCII art
						</div>
					)}
				</div>
			</main>

			<style>{`
        .ascii-grid {
          display: grid;
          grid-template-columns: repeat(var(--width, 200), var(--cell-size, 4px));
          grid-template-rows: repeat(var(--height, 200), var(--cell-size, 4px));
          font-family: 'Courier New', monospace;
          font-size: var(--cell-size, 4px);
          line-height: 1;
        }
        .ascii-cell {
          display: block;
          width: var(--cell-size, 4px);
          height: var(--cell-size, 4px);
          overflow: hidden;
        }
      `}</style>
		</div>
	);
}

export default App;
