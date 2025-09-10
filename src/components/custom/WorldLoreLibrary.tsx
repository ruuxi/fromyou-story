'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, Globe, Check } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import { useAuthState } from '@/hooks/useAuthState'
import { CustomWorldLore } from './types'
import { WorldLoreEditor } from './WorldLoreEditor'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface WorldLoreLibraryProps {
  worldLore: CustomWorldLore[]
  isLoading: boolean
}

export function WorldLoreLibrary({ worldLore, isLoading }: WorldLoreLibraryProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const { authArgs } = useAuthState()

  const deleteLore = useMutation(api.customContent.mutations.deleteCustomWorldLore)
  const updateLore = useMutation(api.customContent.mutations.updateCustomWorldLore)

  const handleDelete = async (loreId: Id<'customWorldLore'>) => {
    if (!authArgs) return
    const idStr = String(loreId)
    setConfirmingDeleteId(idStr)
  }

  const handleToggleActive = async (lore: CustomWorldLore) => {
    if (!authArgs) return
    await updateLore({
      ...authArgs,
      loreId: lore._id,
      isActive: !lore.isActive
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-stone-800/20 backdrop-blur-xl rounded-md p-6 animate-pulse">
            <div className="h-6 bg-white/10 rounded w-1/3 mb-3"></div>
            <div className="h-4 bg-white/10 rounded w-full mb-2"></div>
            <div className="h-4 bg-white/10 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Create New Button */}
      {!isCreating && (
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="w-full bg-stone-800/20 backdrop-blur-xl rounded-md p-6 border border-white/20 
                     hover:bg-white/10 transition-all flex items-center justify-center gap-3 group cursor-pointer"
        >
          <Plus className="w-5 h-5 text-white/60 group-hover:text-white/80" />
          <span className="text-white/70 font-medium group-hover:text-white/90">
            Create New World Lore
          </span>
        </button>
      )}

      {/* World Lore Editor (Create Mode) */}
      {isCreating && (
        <WorldLoreEditor
          onSave={() => setIsCreating(false)}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {/* World Lore List */}
      {worldLore.map(lore => (
        <div key={lore._id}>
          {editingId === lore._id ? (
            <WorldLoreEditor
              worldLore={lore}
              onSave={() => setEditingId(null)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div className={`bg-stone-800/20 backdrop-blur-xl rounded-md p-6 border border-white/20 
                           ${!lore.isActive ? 'opacity-60' : ''} hover:bg-white/10 transition-all`}>
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === lore._id ? null : lore._id)}
                >
                  <h3 className="text-xl font-semibold text-white/90 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-white/60" />
                    {lore.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(lore)}
                    className={`p-2 rounded-md transition-all ${
                      lore.isActive 
                        ? 'bg-sky-600/30 text-white/90' 
                        : 'bg-stone-700/30 text-white/40 hover:bg-stone-700/50'
                    }`}
                    title={lore.isActive ? 'Active' : 'Inactive'}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(lore._id)}
                    className="p-2 rounded-md bg-white/10 text-white/60 
                             hover:bg-white/20 hover:text-white/80 transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(lore._id)}
                    className="p-2 rounded-md bg-red-500/10 text-red-400/60 
                             hover:bg-red-500/20 hover:text-red-400/80 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className={`prose prose-sm max-w-none ${
                expandedId !== lore._id ? 'line-clamp-3' : ''
              }`}>
                <p className="text-white/70 whitespace-pre-wrap">{lore.lore}</p>
              </div>

              {expandedId !== lore._id && lore.lore.length > 200 && (
                <button
                  type="button"
                  onClick={() => setExpandedId(lore._id)}
                  className="text-white/60 hover:text-white/80 text-sm mt-2"
                >
                  Read more...
                </button>
              )}

              <div className="mt-4 flex items-center gap-4 text-xs text-white/50">
                <span>Created {new Date(lore._creationTime).toLocaleDateString()}</span>
                {lore.updatedAt !== lore._creationTime && (
                  <span>Updated {new Date(lore.updatedAt).toLocaleDateString()}</span>
                )}
              </div>
              {confirmingDeleteId === String(lore._id) && (
                <ConfirmDialog
                  isOpen={true}
                  title="Delete this world lore?"
                  message="This will remove it from your custom world lore."
                  confirmText="Delete"
                  cancelText="Cancel"
                  destructive
                  onCancel={() => setConfirmingDeleteId(null)}
                  onConfirm={async () => {
                    if (!authArgs) return
                    await deleteLore({ ...authArgs, loreId: lore._id })
                    setConfirmingDeleteId(null)
                  }}
                />
              )}
            </div>
          )}
        </div>
      ))}

      {/* Empty State */}
      {worldLore.length === 0 && !isCreating && (
        <div className="text-center py-12">
          <Globe className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white/70 mb-2">No world lore yet</h3>
          <p className="text-white/50">Create your first world lore to build unique settings!</p>
        </div>
      )}
    </div>
  )
}