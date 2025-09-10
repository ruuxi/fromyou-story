'use client'
// Character creation form component
import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { 
  Save,
  Plus,
  Minus,
  FileText,
  Sparkles,
  User
} from 'lucide-react'
import SimpleBar from 'simplebar-react'

interface CharacterData {
  name: string
  description: string
  personality: string
  scenario: string
  firstMessage: string
  exampleDialogues: string
  tags: string[]
}

interface CreateCharacterFormProps {
  onSuccess: () => void
  onBack?: () => void
  initialTemplateIndex?: number
}

const CHARACTER_TEMPLATES = [
  {
    name: 'Blank Character',
    description: 'Start from scratch with an empty character template',
    data: {
      name: '',
      description: '',
      personality: '',
      scenario: '',
      firstMessage: '',
      exampleDialogues: '',
      tags: []
    }
  },
  {
    name: 'Fantasy Adventurer',
    description: 'A brave adventurer ready for quests and exploration',
    data: {
      name: 'Aria Stormwind',
      description: 'A skilled elven ranger with a mysterious past and unwavering determination.',
      personality: 'Brave, curious, loyal, quick-witted, slightly stubborn when it comes to justice.',
      scenario: 'You meet Aria at a tavern in the border town of Millhaven. She\'s studying a worn map and seems to be planning her next adventure.',
      firstMessage: '*Aria looks up from her map as you approach, her emerald eyes sharp and alert.* "Another traveler, I see. The roads have been dangerous lately. Are you here for adventure, or just passing through?"',
      exampleDialogues: 'You: "What brings you to this town?"\nAria: "I\'m tracking something... or someone. The trail has gone cold here, but I have a feeling they\'re still around."\n\nYou: "Do you need any help?"\nAria: *She studies you carefully before nodding.* "Perhaps. But I should warn you - this isn\'t a simple matter. Are you prepared for real danger?"',
      tags: ['fantasy', 'adventure', 'elf', 'ranger']
    }
  },
  {
    name: 'Modern Assistant',
    description: 'A helpful AI assistant for everyday tasks and conversations',
    data: {
      name: 'Alex',
      description: 'A friendly and knowledgeable AI assistant designed to help with various tasks and provide engaging conversation.',
      personality: 'Helpful, patient, enthusiastic about learning, good sense of humor, always eager to assist.',
      scenario: 'You\'re interacting with Alex, your personal AI assistant, who is ready to help you with whatever you need.',
      firstMessage: 'Hello! I\'m Alex, your AI assistant. I\'m here to help you with anything you need - whether it\'s answering questions, helping with tasks, or just having a friendly conversation. What can I do for you today?',
      exampleDialogues: 'You: "Can you help me plan my day?"\nAlex: "Absolutely! I\'d be happy to help you organize your schedule. What do you have planned, and what would you like to prioritize?"\n\nYou: "Tell me something interesting."\nAlex: "Did you know that octopuses have three hearts and blue blood? Two hearts pump blood to the gills, while the third pumps blood to the rest of the body!"',
      tags: ['modern', 'assistant', 'helpful', 'AI']
    }
  }
]

export function CreateCharacterForm({ onSuccess, onBack, initialTemplateIndex }: CreateCharacterFormProps) {
  const { authArgs } = useAuthState()
  const [isCreating, setIsCreating] = useState(false)

  const [characterData, setCharacterData] = useState<CharacterData>(
    CHARACTER_TEMPLATES[initialTemplateIndex ?? 0].data
  )

  const createCharacter = useMutation(api.characters.storage.createCharacter)

  const handleCreate = async () => {
    if (!authArgs) return

    setIsCreating(true)
    try {
      await createCharacter({
        ...authArgs,
        characterData: {
          spec: 'chara_card_v2',
          data: {
            name: characterData.name,
            description: characterData.description,
            personality: characterData.personality,
            scenario: characterData.scenario,
            first_mes: characterData.firstMessage,
            mes_example: characterData.exampleDialogues,
            tags: characterData.tags
          }
        }
      })
      onSuccess()
    } catch (error) {
      console.error('Failed to create character:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const addTag = () => {
    setCharacterData((prev: CharacterData) => ({
      ...prev,
      tags: [...prev.tags, '']
    }))
  }

  const removeTag = (index: number) => {
    setCharacterData((prev: CharacterData) => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }))
  }

  const updateTag = (index: number, value: string) => {
    setCharacterData((prev: CharacterData) => ({
      ...prev,
      tags: prev.tags.map((tag, i) => i === index ? value : tag)
    }))
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border border-purple-300/20 text-purple-300 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Create Character</h2>
            <p className="text-sm text-white/60">
              Customize your character
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        <SimpleBar className="h-full">
          <div className="p-4 pb-28">
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-white font-medium">Basic Information</h3>
                
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Character Name *
                  </label>
                  <input
                    type="text"
                    value={characterData.name}
                    onChange={(e) => setCharacterData((prev: CharacterData) => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 bg-transparent border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40"
                    placeholder="Enter character name"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Description
                  </label>
                  <textarea
                    value={characterData.description}
                    onChange={(e) => setCharacterData((prev: CharacterData) => ({ ...prev, description: e.target.value }))}
                    className="w-full p-3 bg-transparent border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40 resize-none"
                    rows={3}
                    placeholder="Brief description of the character"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Tags
                  </label>
                  <div className="space-y-2">
                    {characterData.tags.map((tag, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={tag}
                          onChange={(e) => updateTag(index, e.target.value)}
                          className="flex-1 p-2 bg-transparent border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40"
                          placeholder="Tag name"
                        />
                        <button
                          onClick={() => removeTag(index)}
                          className="p-2 text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addTag}
                      className="flex items-center gap-2 p-2 text-blue-300 hover:bg-blue-500/10 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Tag
                    </button>
                  </div>
                </div>
              </div>

              {/* Personality */}
              <div className="space-y-4">
                <h3 className="text-white font-medium">Personality & Traits</h3>
                
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Personality
                  </label>
                  <textarea
                    value={characterData.personality}
                    onChange={(e) => setCharacterData((prev: CharacterData) => ({ ...prev, personality: e.target.value }))}
                    className="w-full p-3 bg-transparent border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40 resize-none"
                    rows={4}
                    placeholder="Describe the character's personality traits, behavior, and mannerisms"
                  />
                </div>
              </div>

              {/* Scenario */}
              <div className="space-y-4">
                <h3 className="text-white font-medium">Scenario & Setting</h3>
                
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Scenario
                  </label>
                  <textarea
                    value={characterData.scenario}
                    onChange={(e) => setCharacterData((prev: CharacterData) => ({ ...prev, scenario: e.target.value }))}
                    className="w-full p-3 bg-transparent border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40 resize-none"
                    rows={3}
                    placeholder="Describe the setting and context for interactions"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    First Message
                  </label>
                  <textarea
                    value={characterData.firstMessage}
                    onChange={(e) => setCharacterData((prev: CharacterData) => ({ ...prev, firstMessage: e.target.value }))}
                    className="w-full p-3 bg-transparent border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40 resize-none"
                    rows={3}
                    placeholder="The character's opening message or greeting"
                  />
                </div>
              </div>

              {/* Examples */}
              <div className="space-y-4">
                <h3 className="text-white font-medium">Example Dialogues</h3>
                
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Example Conversations
                  </label>
                  <textarea
                    value={characterData.exampleDialogues}
                    onChange={(e) => setCharacterData((prev: CharacterData) => ({ ...prev, exampleDialogues: e.target.value }))}
                    className="w-full p-3 bg-transparent border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40 resize-none"
                    rows={6}
                    placeholder="Example conversations that demonstrate how the character should respond"
                  />
                </div>
              </div>
            </div>
          </div>
        </SimpleBar>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 sticky bottom-0 z-10 p-4 border-t border-white/10 bg-transparent backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="text-xs text-white/60">
            Customize Character
          </div>
          
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Back
              </button>
            )}
            
            <button
              onClick={handleCreate}
              disabled={isCreating || !characterData.name}
              className="px-6 py-2 bg-gradient-to-br from-green-900/35 via-emerald-900/25 to-teal-900/20 hover:from-green-900/45 hover:via-emerald-900/35 hover:to-teal-900/30 text-white border border-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isCreating ? 'Creating...' : 'Create Character'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}