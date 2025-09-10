'use client'

import { useState } from 'react'
import { 
  ChevronLeft,
  Clock,
  FileText,
  Download,
  Eye,
  RotateCcw,
  Trash2,
  Calendar
} from 'lucide-react'
import SimpleBar from 'simplebar-react'

interface Version {
  id: string
  version: number
  name: string
  importedAt: number
  changes: string[]
  size: string
  isActive: boolean
}

interface VersionHistoryProps {
  itemId: string
  itemName: string
  itemType: 'character' | 'preset'
  onBack: () => void
}

// Mock version data - in real implementation this would come from the database
const mockVersions: Version[] = [
  {
    id: 'v3',
    version: 3,
    name: 'Latest Import',
    importedAt: Date.now() - 1000 * 60 * 30, // 30 minutes ago
    changes: ['Updated personality traits', 'Added new example dialogues', 'Fixed typos in description'],
    size: '2.4 KB',
    isActive: true
  },
  {
    id: 'v2',
    version: 2,
    name: 'Modified Version',
    importedAt: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    changes: ['Edited first message', 'Updated scenario setting'],
    size: '2.1 KB',
    isActive: false
  },
  {
    id: 'v1',
    version: 1,
    name: 'Original Import',
    importedAt: Date.now() - 1000 * 60 * 60 * 24 * 7, // 1 week ago
    changes: ['Initial import from SillyTavern'],
    size: '1.9 KB',
    isActive: false
  }
]

export function VersionHistory({ itemId, itemName, itemType, onBack }: VersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [versions] = useState<Version[]>(mockVersions)

  const handleRestore = (versionId: string) => {
    // TODO: Implement version restore functionality
    console.log('Restoring version:', versionId)
  }

  const handleDelete = (versionId: string) => {
    // TODO: Implement version delete functionality
    console.log('Deleting version:', versionId)
  }

  const handleDownload = (versionId: string) => {
    // TODO: Implement version download functionality
    console.log('Downloading version:', versionId)
  }

  const handlePreview = (versionId: string) => {
    setSelectedVersion(selectedVersion === versionId ? null : versionId)
  }

  const getTimeAgo = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 30) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white/70" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-white">Version History</h1>
            <p className="text-white/60">{itemName}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-white/60">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {versions.length} version{versions.length !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            {itemType === 'character' ? 'Character' : 'Preset'}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <SimpleBar className="h-full">
          <div className="p-4 space-y-4">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`border rounded-lg overflow-hidden transition-all ${
                  version.isActive
                    ? 'border-green-400/50 bg-green-500/5'
                    : selectedVersion === version.id
                    ? 'border-blue-400/50 bg-blue-500/5'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                {/* Version Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-medium">
                          Version {version.version}
                        </h3>
                        {version.isActive && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full">
                            Current
                          </span>
                        )}
                        <span className="text-white/60 text-sm">{version.name}</span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-white/60 mb-3">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeAgo(version.importedAt)}
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {version.size}
                        </div>
                      </div>

                      {/* Changes */}
                      <div className="space-y-1">
                        {version.changes.map((change, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <div className="w-1.5 h-1.5 bg-white/40 rounded-full mt-2 flex-shrink-0" />
                            <span className="text-white/80">{change}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handlePreview(version.id)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Preview version"
                      >
                        <Eye className="w-4 h-4 text-white/70" />
                      </button>
                      
                      <button
                        onClick={() => handleDownload(version.id)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Download version"
                      >
                        <Download className="w-4 h-4 text-white/70" />
                      </button>
                      
                      {!version.isActive && (
                        <>
                          <button
                            onClick={() => handleRestore(version.id)}
                            className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                            title="Restore version"
                          >
                            <RotateCcw className="w-4 h-4 text-blue-400/70" />
                          </button>
                          
                          <button
                            onClick={() => handleDelete(version.id)}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Delete version"
                          >
                            <Trash2 className="w-4 h-4 text-red-400/70" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Preview */}
                {selectedVersion === version.id && (
                  <div className="border-t border-white/10 p-4 bg-white/2">
                    <h4 className="text-white/80 font-medium mb-3">Version Preview</h4>
                    
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-white/60">Import Date:</span>
                          <div className="text-white">
                            {new Date(version.importedAt).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-white/60">File Size:</span>
                          <div className="text-white">{version.size}</div>
                        </div>
                      </div>

                      <div>
                        <span className="text-white/60">Changes in this version:</span>
                        <div className="mt-1 space-y-1">
                          {version.changes.map((change, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <div className="w-1 h-1 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                              <span className="text-white/80">{change}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {!version.isActive && (
                        <div className="pt-3 border-t border-white/10">
                          <button
                            onClick={() => handleRestore(version.id)}
                            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Restore This Version
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Empty State */}
            {versions.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 mx-auto bg-white/10 rounded-xl flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8 text-white/40" />
                </div>
                <h3 className="text-white font-medium mb-2">No Version History</h3>
                <p className="text-white/60 text-sm">
                  This item hasn't been modified since its initial import.
                </p>
              </div>
            )}
          </div>
        </SimpleBar>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="text-xs text-white/50">
            Versions are automatically created when changes are saved
          </div>
          
          <button
            onClick={onBack}
            className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}