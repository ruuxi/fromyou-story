'use client'

import { useState, useRef } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { PresetUploader } from './PresetUploader'
import { PresetList } from './PresetList'
import { PresetPreview } from './PresetPreview'
import { PublicImportFeed } from './PublicImportFeed'
import { X, Upload, FileText, Settings, Globe, User, Bell } from 'lucide-react'

interface ImportSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function ImportSidebar({ isOpen, onClose }: ImportSidebarProps) {
  const { authArgs } = useAuthState()
  const [activeMainTab, setActiveMainTab] = useState<'upload' | 'public' | 'library'>('upload')
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Load user's imported presets
  const presets = useQuery(
    api.presets.storage.getUserPresets,
    authArgs ? authArgs : 'skip'
  )

  const selectedPreset = useQuery(
    api.presets.storage.getPresetWithUrl,
    selectedPresetId && authArgs
      ? { presetId: selectedPresetId as any, ...authArgs }
      : 'skip'
  )

  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId)
    setActiveMainTab('library')
  }

  const handleUploadSuccess = () => {
    setActiveMainTab('library')
  }

  // Get notifications count
  const notifications = useQuery(
    api.imports.social.getUserNotifications,
    authArgs ? { ...authArgs, limit: 100 } : 'skip'
  )

  const unreadNotifications = notifications?.filter(n => !n.isRead).length || 0

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 right-0 h-full w-96 bg-zinc-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white">
              Import Hub
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>

          {/* Main Tabs */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveMainTab('upload')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors ${
                activeMainTab === 'upload'
                  ? 'text-white bg-white/10 border-b-2 border-blue-400'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
            <button
              onClick={() => setActiveMainTab('public')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors ${
                activeMainTab === 'public'
                  ? 'text-white bg-white/10 border-b-2 border-blue-400'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Globe className="w-4 h-4" />
              Public
              {unreadNotifications > 0 && (
                <div className="relative ml-1">
                  <div className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </div>
                </div>
              )}
            </button>
            <button
              onClick={() => setActiveMainTab('library')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors ${
                activeMainTab === 'library'
                  ? 'text-white bg-white/10 border-b-2 border-blue-400'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-4 h-4" />
              Library
              {presets && presets.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300">
                  {presets.length}
                </span>
              )}
            </button>
          </div>


          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeMainTab === 'upload' && (
              <PresetUploader onUploadSuccess={handleUploadSuccess} />
            )}

            {activeMainTab === 'public' && (
              <PublicImportFeed />
            )}

            {activeMainTab === 'library' && (
              <>
                {!selectedPreset && (
                  <PresetList
                    presets={presets || []}
                    onPresetSelect={handlePresetSelect}
                    selectedPresetId={selectedPresetId}
                  />
                )}
                
                {selectedPreset && (
                  <PresetPreview 
                    preset={selectedPreset}
                    onClose={() => {
                      setSelectedPresetId(null)
                    }}
                  />
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <div className="text-xs text-white/50 text-center">
              {activeMainTab === 'upload' && 'Import new SillyTavern content'}
              {activeMainTab === 'public' && 'Discover and use community shared imports'}
              {activeMainTab === 'library' && 'Manage your imported content'}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}