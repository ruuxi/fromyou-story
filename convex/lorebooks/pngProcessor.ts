// PNG processor for extracting lorebook data from PNG metadata
// Compatible with SillyTavern character cards that may contain embedded lorebooks

// Check if data is a valid PNG
export function isValidPNG(buffer: ArrayBuffer): boolean {
  const view = new DataView(buffer)
  
  // Check PNG signature (first 8 bytes)
  // 137 80 78 71 13 10 26 10 (in decimal)
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  
  if (buffer.byteLength < 8) return false
  
  for (let i = 0; i < 8; i++) {
    if (view.getUint8(i) !== signature[i]) {
      return false
    }
  }
  
  return true
}

// Read a PNG chunk
function readChunk(view: DataView, offset: number) {
  const length = view.getUint32(offset, false) // big-endian
  const type = String.fromCharCode(
    view.getUint8(offset + 4),
    view.getUint8(offset + 5),
    view.getUint8(offset + 6),
    view.getUint8(offset + 7)
  )
  
  const dataOffset = offset + 8
  const data = new Uint8Array(view.buffer, view.byteOffset + dataOffset, length)
  
  // CRC is at offset + 8 + length (4 bytes), but we don't need to verify it
  const nextOffset = offset + 8 + length + 4
  
  return { type, data, nextOffset }
}

// Extract text chunks from PNG
function extractTextChunks(buffer: ArrayBuffer): { [key: string]: string } {
  const view = new DataView(buffer)
  const chunks: { [key: string]: string } = {}
  
  let offset = 8 // Skip PNG signature
  
  while (offset < view.byteLength - 12) { // Minimum chunk size
    try {
      const chunk = readChunk(view, offset)
      
      if (chunk.type === 'IEND') break
      
      if (chunk.type === 'tEXt') {
        // tEXt chunk: null-terminated keyword, then text
        const nullIndex = chunk.data.indexOf(0)
        if (nullIndex !== -1) {
          const keyword = new TextDecoder('latin1').decode(chunk.data.slice(0, nullIndex))
          const text = new TextDecoder('latin1').decode(chunk.data.slice(nullIndex + 1))
          chunks[keyword] = text
        }
      }
      
      offset = chunk.nextOffset
    } catch (e) {
      console.error('Error reading PNG chunk:', e)
      break
    }
  }
  
  return chunks
}

// Extract lorebook from PNG metadata
export function extractLorebookFromPNG(buffer: ArrayBuffer): string {
  const textChunks = extractTextChunks(buffer)
  
  // Check for lorebook data in various possible locations
  // Priority order:
  // 1. 'lorebook' chunk (dedicated lorebook export)
  // 2. 'worldinfo' chunk (alternative name)
  // 3. 'chara' chunk with embedded world_info/character_book (character card with lorebook)
  
  // Check for dedicated lorebook chunk
  if (textChunks['lorebook']) {
    try {
      // Try to decode base64
      const decoded = atob(textChunks['lorebook'])
      return decoded
    } catch {
      // If not base64, return as-is
      return textChunks['lorebook']
    }
  }
  
  // Check for worldinfo chunk
  if (textChunks['worldinfo']) {
    try {
      const decoded = atob(textChunks['worldinfo'])
      return decoded
    } catch {
      return textChunks['worldinfo']
    }
  }
  
  // Check for embedded lorebook in character card
  if (textChunks['chara']) {
    try {
      // Decode character card data
      const decoded = atob(textChunks['chara'])
      const characterData = JSON.parse(decoded)
      
      // Check for embedded world info/lorebook
      if (characterData.world_info || characterData.character_book) {
        const lorebook = characterData.world_info || characterData.character_book
        
        // If it's already a proper lorebook object, return it
        if (typeof lorebook === 'object' && lorebook.entries) {
          return JSON.stringify(lorebook)
        }
        
        // If it's a string (possibly another base64), try to decode
        if (typeof lorebook === 'string') {
          try {
            const decodedLorebook = atob(lorebook)
            return decodedLorebook
          } catch {
            return lorebook
          }
        }
      }
    } catch (e) {
      console.error('Error extracting lorebook from character card:', e)
    }
  }
  
  // Check for ccv3 chunk (Character Card V3 with possible lorebook)
  if (textChunks['ccv3']) {
    try {
      // CCv3 is base64 encoded
      const decoded = atob(textChunks['ccv3'])
      const v3Data = JSON.parse(decoded)
      
      // Check for character book in V3 format
      if (v3Data.data?.character_book) {
        return JSON.stringify(v3Data.data.character_book)
      }
      
      // Check for extensions that might contain world info
      if (v3Data.data?.extensions?.world_info) {
        return JSON.stringify(v3Data.data.extensions.world_info)
      }
    } catch (e) {
      console.error('Error extracting lorebook from CCv3:', e)
    }
  }
  
  throw new Error('No lorebook data found in PNG metadata')
}

// Check if PNG contains lorebook data
export function pngContainsLorebook(buffer: ArrayBuffer): boolean {
  try {
    const textChunks = extractTextChunks(buffer)
    
    // Check for dedicated lorebook chunks
    if (textChunks['lorebook'] || textChunks['worldinfo']) {
      return true
    }
    
    // Check for embedded lorebook in character card
    if (textChunks['chara']) {
      try {
        const decoded = atob(textChunks['chara'])
        const characterData = JSON.parse(decoded)
        return !!(characterData.world_info || characterData.character_book)
      } catch {
        return false
      }
    }
    
    // Check for CCv3 with lorebook
    if (textChunks['ccv3']) {
      try {
        const decoded = atob(textChunks['ccv3'])
        const v3Data = JSON.parse(decoded)
        return !!(v3Data.data?.character_book || v3Data.data?.extensions?.world_info)
      } catch {
        return false
      }
    }
    
    return false
  } catch {
    return false
  }
}