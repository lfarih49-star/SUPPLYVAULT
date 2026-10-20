import React, { useState, useRef } from 'react';
import { Upload, Link2, Sparkles, X, Check, Image as ImageIcon, RefreshCw, ZoomIn } from 'lucide-react';
import { AspectImage } from './AspectImage';

interface ImageUploaderProps {
  value?: string | null;
  onChange: (urlOrDataUrl: string) => void;
  label?: string;
  productTitle?: string;
}

// Curated verified enterprise presets for Computer Hardware & Laptops
const CURATED_PRESETS = [
  {
    name: 'Lenovo ThinkPad Ultrabook',
    category: 'Enterprise Laptops',
    url: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Apple MacBook Pro M3',
    category: 'Enterprise Laptops',
    url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'ASUS ROG Zephyrus Laptop',
    category: 'Enterprise Laptops',
    url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Dell XPS Pro Ultrabook',
    category: 'Enterprise Laptops',
    url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'NVIDIA GeForce RTX GPU',
    category: 'Graphics Cards & GPUs',
    url: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'ASUS TUF Gaming GPU',
    category: 'Graphics Cards & GPUs',
    url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'AMD Ryzen High-Performance CPU',
    category: 'Processors (CPUs)',
    url: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Intel Core Special Edition CPU',
    category: 'Processors (CPUs)',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Samsung 990 PRO NVMe SSD',
    category: 'Memory & Storage',
    url: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'G.Skill Trident Z5 DDR5 RAM',
    category: 'Memory & Storage',
    url: 'https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'ASUS ROG Dark Hero Motherboard',
    category: 'Motherboards & Power',
    url: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Corsair RM1000x Modular PSU',
    category: 'Motherboards & Power',
    url: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'LG UltraFine 4K UHD Display',
    category: 'Displays & Peripherals',
    url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Keychron Custom Mechanical Keyboard',
    category: 'Displays & Peripherals',
    url: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=800&q=80',
  },
];

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  label = 'Product Presentation Image',
  productTitle = 'Item',
}) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'url' | 'presets'>('upload');
  const [urlInput, setUrlInput] = useState(value && !value.startsWith('data:') ? value : '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Crop & scale image to 16:9 (800x450) using HTML5 Canvas
  const processAndFitImage = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const TARGET_WIDTH = 800;
        const TARGET_HEIGHT = 450; // Exact 16:9 ratio

        const canvas = document.createElement('canvas');
        canvas.width = TARGET_WIDTH;
        canvas.height = TARGET_HEIGHT;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        // Calculate aspect fill crop (center-cover)
        const srcRatio = img.width / img.height;
        const targetRatio = TARGET_WIDTH / TARGET_HEIGHT;

        let srcWidth = img.width;
        let srcHeight = img.height;
        let srcX = 0;
        let srcY = 0;

        if (srcRatio > targetRatio) {
          // Source is wider than 16:9 -> crop sides
          srcWidth = img.height * targetRatio;
          srcX = (img.width - srcWidth) / 2;
        } else {
          // Source is taller than 16:9 -> crop top/bottom
          srcHeight = img.width / targetRatio;
          srcY = (img.height - srcHeight) / 2;
        }

        // Draw cropped and centered image onto 16:9 canvas
        ctx.fillStyle = '#050b18';
        ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
        ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);

        // Convert to optimized JPEG data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        onChange(dataUrl);
        setIsProcessing(false);
      };

      img.onerror = () => {
        setIsProcessing(false);
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndFitImage(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processAndFitImage(file);
    }
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onChange(urlInput.trim());
    }
  };

  const handleClear = () => {
    onChange('');
    setUrlInput('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-emerald-400" />
          {label}
        </label>
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
          Fixed 16:9 Ratio
        </span>
      </div>

      {/* Live 16:9 Aspect Ratio Preview Container */}
      <div className="relative group">
        <AspectImage
          src={value}
          alt={productTitle}
          aspectRatio="16/9"
          fallbackText={productTitle}
          containerClassName="border-2 border-dashed border-slate-700/80 group-hover:border-emerald-500/50 transition-colors shadow-lg"
          badge={
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-navy-950/90 text-emerald-400 font-mono text-[10px] border border-emerald-500/30 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              16:9 Master Preview
            </div>
          }
        />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-navy-950/90 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/50 shadow-md transition-all"
            title="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mode Tabs */}
      <div className="flex items-center gap-1 p-1 bg-navy-950 rounded-xl border border-slate-800 text-xs">
        <button
          type="button"
          onClick={() => setActiveMode('upload')}
          className={`flex-1 py-1.5 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeMode === 'upload'
              ? 'bg-navy-800 text-emerald-400 shadow-sm border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          File Upload
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('url')}
          className={`flex-1 py-1.5 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeMode === 'url'
              ? 'bg-navy-800 text-emerald-400 shadow-sm border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          Web URL
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('presets')}
          className={`flex-1 py-1.5 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeMode === 'presets'
              ? 'bg-navy-800 text-emerald-400 shadow-sm border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Curated Presets
        </button>
      </div>

      {/* Tab 1: Local File Upload & Auto-Crop */}
      {activeMode === 'upload' && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-5 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-emerald-500 bg-emerald-950/20'
              : 'border-slate-800 hover:border-slate-700 bg-navy-950/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-navy-900 border border-slate-700 flex items-center justify-center text-emerald-400">
            {isProcessing ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </div>

          <p className="text-xs font-bold text-slate-200">
            {isProcessing ? 'Cropping to 16:9 ratio...' : 'Click to upload or drag & drop'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            PNG, JPG, or WEBP (auto-cropped & centered into fixed 16:9)
          </p>
        </div>
      )}

      {/* Tab 2: URL Input */}
      {activeMode === 'url' && (
        <form onSubmit={handleApplyUrl} className="flex gap-2">
          <input
            type="url"
            placeholder="https://example.com/product-image.jpg"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 px-3 py-2 text-xs rounded-xl bg-navy-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
          <button
            type="submit"
            className="px-4 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-navy-950 rounded-xl transition-all shrink-0"
          >
            Apply
          </button>
        </form>
      )}

      {/* Tab 3: Curated Enterprise Presets */}
      {activeMode === 'presets' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CURATED_PRESETS.map((preset) => {
            const isSelected = value === preset.url;
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => onChange(preset.url)}
                className={`p-2 rounded-xl border text-left transition-all flex flex-col group relative overflow-hidden ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500/50'
                    : 'border-slate-800 bg-navy-950 hover:border-slate-700'
                }`}
              >
                <div className="aspect-[16/9] w-full rounded-lg overflow-hidden mb-1.5 bg-navy-900 relative">
                  <img
                    src={preset.url}
                    alt={preset.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-navy-950">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-bold text-slate-200 truncate">{preset.name}</span>
                <span className="text-[9px] text-slate-400 font-mono">{preset.category}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

