import React, { useState } from 'react';
import { PoolVolumeConfig } from '../types';
import { calculatePoolVolume } from '../utils/poolMath';
import { HelpCircle, RefreshCw, Layers } from 'lucide-react';

interface VolumeCalculatorProps {
  config: PoolVolumeConfig;
  onUpdateConfig: (newConfig: PoolVolumeConfig) => void;
}

export function VolumeCalculator({ config, onUpdateConfig }: VolumeCalculatorProps) {
  const [shape, setShape] = useState<'round' | 'rectangular' | 'oval'>(config.shape);
  const [diameter, setDiameter] = useState<string>(config.diameter?.toString() || '18');
  const [width, setWidth] = useState<string>(config.width?.toString() || '12');
  const [length, setLength] = useState<string>(config.length?.toString() || '24');
  const [avgDepth, setAvgDepth] = useState<string>(config.avgDepth?.toString() || '4');
  const [customVolume, setCustomVolume] = useState<string>(config.volumeGallons.toString());
  const [useCustom, setUseCustom] = useState<boolean>(false);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const dNum = parseFloat(diameter) || 0;
    const wNum = parseFloat(width) || 0;
    const lNum = parseFloat(length) || 0;
    const dpNum = parseFloat(avgDepth) || 0;

    let computedVol = 0;
    if (useCustom) {
      computedVol = parseInt(customVolume) || 0;
    } else {
      computedVol = calculatePoolVolume(shape, {
        diameter: dNum,
        width: wNum,
        length: lNum,
        avgDepth: dpNum,
      });
    }

    onUpdateConfig({
      shape,
      diameter: shape === 'round' ? dNum : undefined,
      width: shape !== 'round' ? wNum : undefined,
      length: shape !== 'round' ? lNum : undefined,
      avgDepth: dpNum,
      volumeGallons: computedVol,
    });
  };

  return (
    <div id="volume-calculator-card" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-sky-50 text-sky-600 p-2 rounded-xl">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-base">Pool Design & Volume</h3>
            <p className="text-xs text-slate-400">Define dimensions to calibrate accurate chemical targets</p>
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
          <span className="font-mono font-semibold text-sky-600 text-sm">{config.volumeGallons.toLocaleString()} gal</span>
        </div>
      </div>

      <form onSubmit={handleCalculate} className="space-y-4">
        {/* Shape selector */}
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-2 block">Pool Shape</label>
          <div className="grid grid-cols-3 gap-2">
            {(['round', 'rectangular', 'oval'] as const).map((s) => (
              <button
                id={`shape-${s}`}
                key={s}
                type="button"
                onClick={() => setShape(s)}
                className={`py-2 px-3 text-sm rounded-lg border font-medium capitalize transition-all ${
                  shape === s
                    ? 'border-sky-500 bg-sky-50/50 text-sky-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Inputs depending on shape */}
        <div className="grid grid-cols-2 gap-3">
          {shape === 'round' ? (
            <div>
              <label htmlFor="input-diameter" className="text-xs font-medium text-slate-500 mb-1 block">Diameter (ft)</label>
              <input
                id="input-diameter"
                type="number"
                step="0.5"
                value={diameter}
                onChange={(e) => setDiameter(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700"
                placeholder="Diameter"
                required={shape === 'round'}
              />
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="input-width" className="text-xs font-medium text-slate-500 mb-1 block">Width (ft)</label>
                <input
                  id="input-width"
                  type="number"
                  step="0.5"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700"
                  placeholder="Width"
                  required={shape !== 'round'}
                />
              </div>
              <div>
                <label htmlFor="input-length" className="text-xs font-medium text-slate-500 mb-1 block">Length (ft)</label>
                <input
                  id="input-length"
                  type="number"
                  step="0.5"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700"
                  placeholder="Length"
                  required={shape !== 'round'}
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="input-depth" className="text-xs font-medium text-slate-500 mb-1 block">Average Depth (ft)</label>
            <input
              id="input-depth"
              type="number"
              step="0.1"
              value={avgDepth}
              onChange={(e) => setAvgDepth(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700"
              placeholder="Depth"
              required
            />
          </div>
        </div>

        {/* Overrides and manual setting toggle */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="toggle-custom" className="text-xs font-medium text-slate-600 flex items-center gap-1.5 cursor-pointer">
              <input
                id="toggle-custom"
                type="checkbox"
                checked={useCustom}
                onChange={(e) => setUseCustom(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              Override with custom volume
            </label>
            <HelpCircle className="h-3.5 w-3.5 text-slate-400" title="For non-standard above-ground pools or specific models, specify your manufacturer volume." />
          </div>

          {useCustom && (
            <div>
              <input
                id="input-custom-volume"
                type="number"
                value={customVolume}
                onChange={(e) => setCustomVolume(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                placeholder="Gallons (e.g. 13500)"
              />
            </div>
          )}
        </div>

        <button
          id="btn-save-dimensions"
          type="submit"
          className="w-full bg-sky-500 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-sky-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Update & Recalibrate Targets
        </button>
      </form>
    </div>
  );
}
