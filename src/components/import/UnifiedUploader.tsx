'use client'

import { useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { Upload, FileText, Image, AlertCircle, CheckCircle, X, User, Settings, BookOpen } from 'lucide-react'

interface UnifiedUploaderProps {
  onUploadSuccess: () => void
  compact?: boolean
}

export interface UnifiedUploaderRef {
  handleFiles: (files: FileList) => void
}

interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error'
  progress: number
  message: string
  uploadedName?: string
  uploadedType?: 'character' | 'preset' | 'lorebook'
}

export const UnifiedUploader = forwardRef<UnifiedUploaderRef, UnifiedUploaderProps>(({ onUploadSuccess, compact = false }, ref) => {
  const { authArgs } = useAuthState()
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: ''
  })
  const [dragActive, setDragActive] = useState(false)

  const importCharacter = useMutation(api.characters.storage.importCharacter)
  const generateUploadUrl = useMutation(api.presets.storage.generateUploadUrl)
  const storePreset = useMutation(api.presets.storage.storePreset)
  const importLorebook = useMutation(api.lorebooks.storage.importLorebook)

  const detectFileType = (fileName: string, fileContent?: string): 'character' | 'preset' | 'lorebook' | 'unknown' => {
    const lowercaseName = fileName.toLowerCase()
    
    // Check by extension first
    if (lowercaseName.endsWith('.png')) {
      // PNG files could be character cards or lorebooks
      // Without parsing the PNG metadata, we'll assume character for now
      // The backend will properly detect if it's a lorebook
      return 'character'
    }
    
    if (lowercaseName.endsWith('.json')) {
      // Try to detect by content if available
      if (fileContent) {
        try {
          const data = JSON.parse(fileContent)
          
          // Lorebook/World Info detection (check first as it's most specific)
          if (data.entries && typeof data.entries === 'object') {
            // SillyTavern native world info format
            return 'lorebook'
          }
          if (data.lorebookVersion !== undefined && Array.isArray(data.entries)) {
            // NovelAI lorebook format
            return 'lorebook'
          }
          if (data.kind === 'memory' && Array.isArray(data.entries)) {
            // Agnai Memory Book format
            return 'lorebook'
          }
          if (data.type === 'risu' && Array.isArray(data.data)) {
            // Risu lorebook format
            return 'lorebook'
          }
          
          // Character card detection
          if (data.spec && (data.spec.includes('chara_card') || data.spec === 'chara_card_v3')) {
            return 'character'
          }
          if (data.name && (data.description || data.personality || data.first_mes)) {
            return 'character'
          }
          
          // Preset detection (various SillyTavern preset types)
          if (data.temperature !== undefined || data.max_tokens !== undefined || 
              data.rep_pen !== undefined || data.top_p !== undefined ||
              data.prompts !== undefined || data.prompt_order !== undefined ||
              data.context_length !== undefined || data.instruct !== undefined) {
            return 'preset'
          }
        } catch (e) {
          // If JSON parsing fails, fall back to filename detection
        }
      }
      
      // Fallback to filename patterns
      if (lowercaseName.includes('lorebook') || lowercaseName.includes('worldinfo') || 
          lowercaseName.includes('world_info') || lowercaseName.includes('lore')) {
        return 'lorebook'
      }
      if (lowercaseName.includes('character') || lowercaseName.includes('char')) {
        return 'character'
      }
      if (lowercaseName.includes('preset') || lowercaseName.includes('setting')) {
        return 'preset'
      }
    }
    
    return 'unknown'
  }

  const handleFiles = useCallback(async (files: FileList) => {
    if (!authArgs) {
      setUploadState({
        status: 'error',
        progress: 0,
        message: 'Please sign in to import files'
      })
      return
    }

    const file = files[0]
    if (!file) return

    // Validate file type
    const fileName = file.name.toLowerCase()
    const isJSON = fileName.endsWith('.json')
    const isPNG = fileName.endsWith('.png')
    
    if (!isJSON && !isPNG) {
      setUploadState({
        status: 'error',
        progress: 0,
        message: 'Please upload a JSON or PNG file'
      })
      return
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setUploadState({
        status: 'error',
        progress: 0,
        message: 'File size too large. Please upload files smaller than 10MB'
      })
      return
    }

    setUploadState({
      status: 'uploading',
      progress: 25,
      message: 'Reading file...'
    })

    try {
      // Read file content
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          const base64 = result.split(',')[1] || result
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Get text content for detection
      let textContent = ''
      if (isJSON) {
        const textReader = new FileReader()
        textContent = await new Promise<string>((resolve, reject) => {
          textReader.onload = () => resolve(textReader.result as string)
          textReader.onerror = reject
          textReader.readAsText(file)
        })
      }

      setUploadState({
        status: 'uploading',
        progress: 50,
        message: 'Detecting file type...'
      })

      // Detect file type
      const fileType = detectFileType(file.name, textContent)
      
      if (fileType === 'unknown') {
        setUploadState({
          status: 'error',
          progress: 0,
          message: 'Could not detect if this is a character card or preset. Please check the file format.'
        })
        return
      }

      setUploadState({
        status: 'uploading',
        progress: 75,
        message: `Importing ${fileType}...`
      })

      let result
      if (fileType === 'character') {
        result = await importCharacter({
          ...authArgs,
          fileData: base64Data,
          fileName: file.name,
          fileType: isPNG ? 'png' : 'json',
        })
      } else if (fileType === 'preset') {
        // Step 1: Get upload URL for preset
        const uploadUrl = await generateUploadUrl(authArgs)
        
        setUploadState({
          status: 'uploading',
          progress: 80,
          message: 'Uploading preset file...'
        })
        
        // Step 2: Upload file to Convex storage
        const blob = new Blob([textContent], { type: 'application/json' })
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: blob
        })
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload preset file')
        }
        
        const { storageId } = await uploadResponse.json()
        
        setUploadState({
          status: 'uploading',
          progress: 90,
          message: 'Processing preset...'
        })
        
        // Step 3: Parse preset locally to get metadata  
        const presetData = JSON.parse(textContent)
        
        // Simple client-side type detection based on known patterns
        let presetType: string = 'openai' // default
        
        if (presetData.chat_completion_source || presetData.openai_model || presetData.prompts) {
          presetType = 'openai'
        } else if (presetData.temp !== undefined || presetData.top_p !== undefined) {
          presetType = 'textgen'
        } else if (presetData.input_sequence !== undefined) {
          presetType = 'instruct'
        } else if (presetData.story_string !== undefined) {
          presetType = 'context'
        } else if (presetData.content !== undefined && presetData.name !== undefined) {
          presetType = 'sysprompt'
        } else if (presetData.amount_gen !== undefined) {
          presetType = 'kobold'
        }
        
        // Step 4: Store preset metadata with storage reference
        result = await storePreset({
          ...authArgs,
          storageId,
          presetType: presetType as any,
          name: file.name.replace(/\.(json)$/i, ''),
        })
      } else if (fileType === 'lorebook') {
        // For lorebooks, pass the base64 data
        result = await importLorebook({
          ...authArgs,
          fileData: base64Data,
          fileName: file.name,
          fileType: isPNG ? 'png' : 'json',
        })
      }

      setUploadState({
        status: 'success',
        progress: 100,
        message: `Successfully imported ${fileType}!`,
        uploadedName: result?.name || 'Imported File',
        uploadedType: fileType
      })

      // Call success callback after a brief delay
      setTimeout(() => {
        onUploadSuccess()
        setUploadState({
          status: 'idle',
          progress: 0,
          message: ''
        })
      }, 1500)

    } catch (error) {
      console.error('File import error:', error)
      setUploadState({
        status: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Failed to import file'
      })
    }
  }, [authArgs, importCharacter, generateUploadUrl, storePreset, importLorebook, onUploadSuccess])

  // Expose handleFiles method via ref
  useImperativeHandle(ref, () => ({
    handleFiles
  }), [handleFiles])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  const clearUploadState = useCallback(() => {
    setUploadState({
      status: 'idle',
      progress: 0,
      message: ''
    })
  }, [])

  const getUploadIcon = () => {
    if (uploadState.uploadedType === 'character') {
      return <User className="w-8 h-8 text-purple-300" />
    } else if (uploadState.uploadedType === 'preset') {
      return <Settings className="w-8 h-8 text-blue-300" />
    } else if (uploadState.uploadedType === 'lorebook') {
      return <BookOpen className="w-8 h-8 text-green-300" />
    }
    return <Upload className="w-8 h-8 text-white/70" />
  }

  if (compact) {
    return (
      <div
        className={`relative h-full border-2 border-dashed p-4 text-center transition-colors ${
          dragActive
            ? 'border-blue-400'
            : uploadState.status === 'error'
            ? 'border-red-400'
            : uploadState.status === 'success'
            ? 'border-green-400'
            : 'border-white/20 hover:border-white/30'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".json,.png"
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploadState.status === 'uploading'}
        />

        <div className="flex items-center justify-center h-full">
          {uploadState.status === 'uploading' && (
            <div className="text-center">
              <Upload className="w-5 h-5 mx-auto text-blue-300 animate-pulse mb-1" />
              <p className="text-xs text-blue-300">Uploading...</p>
            </div>
          )}

          {uploadState.status === 'success' && (
            <div className="text-center">
              <CheckCircle className="w-5 h-5 mx-auto text-green-300 mb-1" />
              <p className="text-xs text-green-300">Success!</p>
            </div>
          )}

          {uploadState.status === 'error' && (
            <div className="text-center">
              <AlertCircle className="w-5 h-5 mx-auto text-red-300 mb-1" />
              <p className="text-xs text-red-300">Error</p>
              <button
                onClick={clearUploadState}
                className="text-xs text-white/60 hover:text-white mt-1"
              >
                Try Again
              </button>
            </div>
          )}

          {uploadState.status === 'idle' && (
            <div className="text-center">
              <Upload className="w-5 h-5 mx-auto text-white/60 mb-1" />
              <p className="text-xs text-white/60">Drop files here</p>
              <p className="text-xs text-white/40 mt-1">JSON • PNG</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Upload Area */}
      <div
        className={`relative flex-1 m-4 border-2 border-dashed p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-400'
            : uploadState.status === 'error'
            ? 'border-red-400'
            : uploadState.status === 'success'
            ? 'border-green-400'
            : 'border-white/20 hover:border-white/30'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".json,.png"
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploadState.status === 'uploading'}
        />

        {uploadState.status === 'uploading' && (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto border border-blue-300/20 flex items-center justify-center">
              <Upload className="w-8 h-8 text-blue-300 animate-pulse" />
            </div>
            <div className="space-y-3">
              <p className="text-white font-medium">{uploadState.message}</p>
              <div className="w-full border border-white/20 h-3">
                <div 
                  className="bg-blue-500 h-3 transition-all duration-300"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {uploadState.status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto border border-green-300/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-300" />
            </div>
            <div>
              <p className="text-green-300 font-medium">{uploadState.message}</p>
              {uploadState.uploadedName && (
                <p className="text-white/60 text-sm mt-2">
                  {uploadState.uploadedType === 'character' ? 'Character' : 
                   uploadState.uploadedType === 'preset' ? 'Preset' : 'Lorebook'}: {uploadState.uploadedName}
                </p>
              )}
            </div>
          </div>
        )}

        {uploadState.status === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto border border-red-300/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-300" />
            </div>
            <div className="space-y-3">
              <p className="text-red-300 font-medium">Upload Failed</p>
              <p className="text-white/70 text-sm">{uploadState.message}</p>
              <button
                onClick={clearUploadState}
                className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
                Try Again
              </button>
            </div>
          </div>
        )}

        {uploadState.status === 'idle' && (
          <div className="space-y-6">
            <div className="w-16 h-16 mx-auto border border-white/20 flex items-center justify-center">
              <Upload className="w-8 h-8 text-white/70" />
            </div>
            
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-white">
                Import SillyTavern Files
              </h3>
              <p className="text-white/60">
                Drag and drop or click to upload character cards, lorebooks, or AI presets
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
              <div className="flex flex-col items-center gap-2 p-3 border border-white/10">
                <User className="w-5 h-5 text-purple-300" />
                <span className="text-xs text-white/70 font-medium">Characters</span>
                <div className="flex gap-1">
                  <span className="text-xs text-white/50">JSON</span>
                  <span className="text-xs text-white/30">•</span>
                  <span className="text-xs text-white/50">PNG</span>
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-2 p-3 border border-white/10">
                <BookOpen className="w-5 h-5 text-green-300" />
                <span className="text-xs text-white/70 font-medium">Lorebooks</span>
                <div className="flex gap-1">
                  <span className="text-xs text-white/50">JSON</span>
                  <span className="text-xs text-white/30">•</span>
                  <span className="text-xs text-white/50">PNG</span>
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-2 p-3 border border-white/10">
                <Settings className="w-5 h-5 text-blue-300" />
                <span className="text-xs text-white/70 font-medium">AI Presets</span>
                <div className="flex gap-1">
                  <span className="text-xs text-white/50">JSON</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compatibility Info */}
      <div className="mx-4 mb-4 p-3 border border-white/10">
        <p className="text-xs text-white/60 text-center">
          Auto-detects SillyTavern character cards (V1/V2/V3), lorebooks, and AI presets
        </p>
      </div>
    </div>
  )
})

UnifiedUploader.displayName = 'UnifiedUploader'