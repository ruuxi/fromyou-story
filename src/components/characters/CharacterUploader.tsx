'use client'

import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { Upload, FileText, Image, AlertCircle, CheckCircle, X, User } from 'lucide-react'

interface CharacterUploaderProps {
  onUploadSuccess: () => void
}

interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error'
  progress: number
  message: string
  characterName?: string
}

export function CharacterUploader({ onUploadSuccess }: CharacterUploaderProps) {
  const { authArgs } = useAuthState()
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: ''
  })
  const [dragActive, setDragActive] = useState(false)

  const importCharacter = useMutation(api.characters.storage.importCharacter)

  const handleFiles = useCallback(async (files: FileList) => {
    if (!authArgs) {
      setUploadState({
        status: 'error',
        progress: 0,
        message: 'Please sign in to import characters'
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
        message: 'Please upload a JSON or PNG character card file'
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
      // Read file as base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          // Remove data URL prefix to get pure base64
          const base64 = result.split(',')[1] || result
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      setUploadState({
        status: 'uploading',
        progress: 50,
        message: 'Parsing character data...'
      })

      // Import character
      const result = await importCharacter({
        ...authArgs,
        fileData: base64Data,
        fileName: file.name,
        fileType: isPNG ? 'png' : 'json',
      })

      setUploadState({
        status: 'success',
        progress: 100,
        message: `Successfully imported ${result.name}!`,
        characterName: result.name
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
      console.error('Character import error:', error)
      setUploadState({
        status: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Failed to import character'
      })
    }
  }, [authArgs, importCharacter, onUploadSuccess])

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

  return (
    <div className="h-full flex flex-col">
      {/* Upload Area */}
      <div
        className={`relative flex-1 m-4 border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-500/10'
            : uploadState.status === 'error'
            ? 'border-red-400 bg-red-500/10'
            : uploadState.status === 'success'
            ? 'border-green-400 bg-green-500/10'
            : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10'
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
          <div className="space-y-3">
            <div className="w-12 h-12 mx-auto bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Upload className="w-6 h-6 text-blue-300 animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="text-white font-medium">{uploadState.message}</p>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {uploadState.status === 'success' && (
          <div className="space-y-3">
            <div className="w-12 h-12 mx-auto bg-green-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-300" />
            </div>
            <div>
              <p className="text-green-300 font-medium">{uploadState.message}</p>
              {uploadState.characterName && (
                <p className="text-white/60 text-sm mt-1">
                  Character: {uploadState.characterName}
                </p>
              )}
            </div>
          </div>
        )}

        {uploadState.status === 'error' && (
          <div className="space-y-3">
            <div className="w-12 h-12 mx-auto bg-red-500/20 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-300" />
            </div>
            <div className="space-y-2">
              <p className="text-red-300 font-medium">Upload Failed</p>
              <p className="text-white/70 text-sm">{uploadState.message}</p>
              <button
                onClick={clearUploadState}
                className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            </div>
          </div>
        )}

        {uploadState.status === 'idle' && (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto bg-purple-500/20 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-purple-300" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-white">
                Import Character Card
              </h3>
              <p className="text-white/60 text-sm">
                Drag and drop or click to upload
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs text-white/50">
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                JSON
              </div>
              <div className="flex items-center gap-1">
                <Image className="w-3 h-3" />
                PNG
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="px-4 space-y-3">
        <h4 className="text-sm font-medium text-white/80">Supported Formats</h4>
        <div className="space-y-2 text-xs text-white/60">
          <div className="flex items-start gap-2">
            <FileText className="w-3 h-3 mt-0.5 text-blue-300" />
            <div>
              <span className="text-white/80">JSON files:</span> Standard SillyTavern character card exports
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Image className="w-3 h-3 mt-0.5 text-green-300" />
            <div>
              <span className="text-white/80">PNG files:</span> Character cards with embedded metadata
            </div>
          </div>
        </div>
      </div>

      {/* Compatibility Info */}
      <div className="mx-4 mb-4 p-3 bg-white/5 rounded-lg">
        <p className="text-xs text-white/60 text-center">
          Compatible with SillyTavern V1, V2, and V3 character card formats
        </p>
      </div>
    </div>
  )
}