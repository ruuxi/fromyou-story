// PNG metadata extraction utilities for character cards
// Based on SillyTavern's character-card-parser.js

import { PNGTextChunk } from './types'

/**
 * Extracts text chunks from PNG buffer
 * @param buffer PNG file buffer
 * @returns Array of text chunks
 */
export function extractPNGTextChunks(buffer: ArrayBuffer): PNGTextChunk[] {
  const view = new DataView(buffer)
  const chunks: PNGTextChunk[] = []
  
  // Check PNG signature
  const signature = new Uint8Array(buffer, 0, 8)
  const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
  
  for (let i = 0; i < 8; i++) {
    if (signature[i] !== pngSignature[i]) {
      throw new Error('Invalid PNG file')
    }
  }
  
  let offset = 8 // Skip PNG signature
  
  while (offset < buffer.byteLength - 8) {
    // Read chunk length (4 bytes, big endian)
    const length = view.getUint32(offset, false)
    offset += 4
    
    // Read chunk type (4 bytes)
    const typeBytes = new Uint8Array(buffer, offset, 4)
    const type = new TextDecoder('ascii').decode(typeBytes)
    offset += 4
    
    // Read chunk data
    const data = new Uint8Array(buffer, offset, length)
    offset += length
    
    // Skip CRC (4 bytes)
    offset += 4
    
    // Process tEXt chunks
    if (type === 'tEXt') {
      const textChunk = decodePNGTextChunk(data)
      if (textChunk) {
        chunks.push(textChunk)
      }
    }
    
    // Stop at IEND chunk
    if (type === 'IEND') {
      break
    }
  }
  
  return chunks
}

/**
 * Decodes a PNG tEXt chunk
 * @param data Chunk data
 * @returns Decoded text chunk or null
 */
function decodePNGTextChunk(data: Uint8Array): PNGTextChunk | null {
  try {
    // Find null separator between keyword and text
    let nullIndex = -1
    for (let i = 0; i < data.length; i++) {
      if (data[i] === 0) {
        nullIndex = i
        break
      }
    }
    
    if (nullIndex === -1) {
      return null
    }
    
    // Extract keyword and text
    const keyword = new TextDecoder('ascii').decode(data.slice(0, nullIndex))
    const text = new TextDecoder('ascii').decode(data.slice(nullIndex + 1))
    
    return { keyword, text }
  } catch (error) {
    console.error('Error decoding PNG text chunk:', error)
    return null
  }
}

/**
 * Extracts character data from PNG buffer
 * Supports both 'chara' (V2) and 'ccv3' (V3) chunks
 * @param buffer PNG file buffer
 * @returns Character data as JSON string
 */
export function extractCharacterFromPNG(buffer: ArrayBuffer): string {
  const textChunks = extractPNGTextChunks(buffer)
  
  if (textChunks.length === 0) {
    throw new Error('PNG metadata does not contain any text chunks')
  }
  
  // Look for V3 chunk first (ccv3 takes precedence)
  const ccv3Chunk = textChunks.find(chunk => 
    chunk.keyword.toLowerCase() === 'ccv3'
  )
  
  if (ccv3Chunk) {
    try {
      // Decode base64 without Buffer (not available in Convex)
      const binaryString = atob(ccv3Chunk.text)
      return binaryString
    } catch (error) {
      throw new Error('Failed to decode ccv3 chunk data')
    }
  }
  
  // Look for V2 chunk (chara)
  const charaChunk = textChunks.find(chunk => 
    chunk.keyword.toLowerCase() === 'chara'
  )
  
  if (charaChunk) {
    try {
      // Decode base64 without Buffer (not available in Convex)
      const binaryString = atob(charaChunk.text)
      return binaryString
    } catch (error) {
      throw new Error('Failed to decode chara chunk data')
    }
  }
  
  throw new Error('PNG metadata does not contain character data')
}

/**
 * Extracts avatar image data from character card data
 * @param characterData Parsed character data
 * @returns Base64 image data or null
 */
export function extractAvatarFromCharacterData(characterData: any): string | null {
  // Check various possible locations for avatar data
  if (typeof characterData.avatar === 'string' && characterData.avatar !== 'none') {
    // Handle data URLs
    if (characterData.avatar.startsWith('data:image/')) {
      return characterData.avatar
    }
    // Handle base64 strings
    if (characterData.avatar.length > 100) {
      return `data:image/png;base64,${characterData.avatar}`
    }
  }
  
  // Check in extensions
  if (characterData.data?.extensions?.avatar) {
    const avatar = characterData.data.extensions.avatar
    if (typeof avatar === 'string' && avatar.length > 100) {
      return avatar.startsWith('data:') ? avatar : `data:image/png;base64,${avatar}`
    }
  }
  
  return null
}

/**
 * Validates PNG file format
 * @param buffer File buffer
 * @returns True if valid PNG
 */
export function isValidPNG(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 8) {
    return false
  }
  
  const signature = new Uint8Array(buffer, 0, 8)
  const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
  
  for (let i = 0; i < 8; i++) {
    if (signature[i] !== pngSignature[i]) {
      return false
    }
  }
  
  return true
}