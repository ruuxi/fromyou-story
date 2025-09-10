'use client'

import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react'

interface PresetUploaderProps {
  onUploadSuccess: () => void
}

interface UploadResult {
  success: boolean
  presetName?: string
  presetType?: string
  errors?: string[]
  warnings?: string[]
}

export function PresetUploader({ onUploadSuccess }: PresetUploaderProps) {
  const { authArgs } = useAuthState()
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [customName, setCustomName] = useState('')

  const importPreset = useMutation(api.presets.storage.importPreset)

  const handleFileUpload = useCallback(async (file: File) => {
    if (!authArgs) {
      setUploadResult({
        success: false,
        errors: ['Please sign in to import presets']
      })
      return
    }

    setIsUploading(true)
    setUploadResult(null)

    try {
      // Read file content
      const content = await file.text()
      let presetData: any

      try {
        presetData = JSON.parse(content)
      } catch (e) {
        setUploadResult({
          success: false,
          errors: ['Invalid JSON file - please check the file format']
        })
        return
      }

      // Import the preset
      const result = await importPreset({
        ...authArgs,
        presetData,
        customName: customName.trim() || undefined,
      })

      setUploadResult({
        success: true,
        presetName: result.name,
        presetType: result.type,
        warnings: result.validation.warnings,
      })

      // Clear custom name
      setCustomName('')
      
      // Notify parent of success
      setTimeout(() => {
        onUploadSuccess()
      }, 1500)

    } catch (error: any) {
      setUploadResult({
        success: false,
        errors: [error.message || 'Failed to import preset']
      })
    } finally {
      setIsUploading(false)
    }
  }, [authArgs, importPreset, customName, onUploadSuccess])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const jsonFile = files.find(file => 
      file.type === 'application/json' || file.name.endsWith('.json')
    )

    if (jsonFile) {
      handleFileUpload(jsonFile)
    } else {
      setUploadResult({
        success: false,
        errors: ['Please upload a valid JSON file']
      })
    }
  }, [handleFileUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }, [handleFileUpload])

  const clearResult = () => {
    setUploadResult(null)
  }

  return (
    <div className="p-4 space-y-4">
      {/* Custom Name Input */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Custom Preset Name (Optional)
        </label>
        <input
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="Leave empty to use preset's original name"
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
        />
      </div>

      {/* Upload Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setIsDragging(false)
        }}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging
            ? 'border-blue-400 bg-blue-400/10'
            : 'border-white/20 hover:border-white/30'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />

        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 text-white/40">
            {isUploading && (
              <div className="animate-spin w-12 h-12 border-2 border-white/20 border-t-white/60 rounded-full" />
            )}
          </div>

          <div>
            <p className="text-lg font-medium text-white">
              {isUploading ? 'Importing Preset...' : 'Drop your SillyTavern preset here'}
            </p>
            <p className="text-sm text-white/60 mt-1">
              Or click to select a JSON file
            </p>
          </div>

          <div className="text-xs text-white/50">
            Supports: OpenAI, TextGen, KoboldAI, NovelAI, Instruct, Context, and System Prompt presets
          </div>
        </div>
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <div className={`p-4 rounded-lg border ${
          uploadResult.success
            ? 'bg-green-500/10 border-green-500/30 text-green-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {uploadResult.success ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            
            <div className="flex-1 space-y-2">
              <div className="font-medium">
                {uploadResult.success ? 'Import Successful!' : 'Import Failed'}
              </div>
              
              {uploadResult.success && (
                <div className="text-sm space-y-1">
                  <div>Preset: <span className="font-medium">{uploadResult.presetName}</span></div>
                  <div>Type: <span className="font-medium capitalize">{uploadResult.presetType}</span></div>
                </div>
              )}

              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="text-sm space-y-1">
                  <div className="font-medium">Errors:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {uploadResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {uploadResult.warnings && uploadResult.warnings.length > 0 && (
                <div className="text-sm space-y-1">
                  <div className="font-medium text-yellow-400">Warnings:</div>
                  <ul className="list-disc list-inside space-y-1 text-yellow-300">
                    {uploadResult.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              onClick={clearResult}
              className="flex-shrink-0 p-1 hover:bg-white/10 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="space-y-3 text-sm text-white/60">
        <div className="font-medium text-white/80">How to get SillyTavern presets:</div>
        <ul className="space-y-2 list-disc list-inside">
          <li>From SillyTavern: Settings → Save preset as JSON</li>
          <li>From preset sharing sites and communities</li>
          <li>Export from other SillyTavern installations</li>
        </ul>
        
        <div className="pt-2 border-t border-white/10">
          <div className="font-medium text-white/80 mb-2">Supported preset types:</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <FileText className="w-3 h-3" />
              OpenAI Settings
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-3 h-3" />
              TextGen Settings
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-3 h-3" />
              KoboldAI Settings
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-3 h-3" />
              Instruct Templates
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-3 h-3" />
              Context Templates
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-3 h-3" />
              System Prompts
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}