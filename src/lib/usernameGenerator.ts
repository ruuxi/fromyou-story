// Lists of words for generating usernames
const adjectives = [
  'Cosmic', 'Stellar', 'Dreamy', 'Mystic', 'Ethereal', 'Whimsical',
  'Luminous', 'Celestial', 'Enchanted', 'Serene', 'Vibrant', 'Radiant',
  'Gentle', 'Brave', 'Curious', 'Wandering', 'Creative', 'Inspired',
  'Thoughtful', 'Imaginative', 'Playful', 'Mysterious', 'Charming',
  'Graceful', 'Bold', 'Brilliant', 'Delightful', 'Elegant', 'Friendly',
  'Majestic', 'Peaceful', 'Joyful', 'Adventurous', 'Magical', 'Wonder',
  'Sparkling', 'Glowing', 'Shimmering', 'Dazzling', 'Gleaming', 'Twinkling',
  'Magnificent', 'Splendid', 'Glorious', 'Divine', 'Sacred', 'Blessed',
  'Harmonious', 'Melodic', 'Rhythmic', 'Flowing', 'Dancing', 'Soaring',
  'Flying', 'Floating', 'Drifting', 'Gliding', 'Sailing', 'Journeying',
  'Ancient', 'Timeless', 'Eternal', 'Infinite', 'Boundless', 'Limitless',
  'Noble', 'Royal', 'Regal', 'Imperial', 'Sovereign', 'Mighty',
  'Powerful', 'Strong', 'Fierce', 'Valiant', 'Heroic', 'Legendary',
  'Epic', 'Grand', 'Supreme', 'Ultimate', 'Perfect', 'Pure',
  'Clear', 'Crystal', 'Diamond', 'Golden', 'Silver', 'Platinum',
  'Crimson', 'Azure', 'Emerald', 'Sapphire', 'Ruby', 'Amber',
  'Violet', 'Indigo', 'Coral', 'Pearl', 'Ivory', 'Onyx',
  'Velvet', 'Silk', 'Satin', 'Marble', 'Glass', 'Mirror',
  'Wise', 'Clever', 'Smart', 'Brilliant', 'Genius', 'Witty',
  'Funny', 'Jovial', 'Merry', 'Cheerful', 'Happy', 'Blissful',
  'Calm', 'Tranquil', 'Quiet', 'Silent', 'Gentle', 'Soft',
  'Sweet', 'Kind', 'Loving', 'Caring', 'Warm', 'Cozy',
  'Fresh', 'Cool', 'Crisp', 'Clean', 'Bright', 'Vivid',
  'Rich', 'Deep', 'Profound', 'Intense', 'Passionate', 'Fierce',
  'Wild', 'Free', 'Independent', 'Unique', 'Rare', 'Special',
  'Precious', 'Treasured', 'Beloved', 'Cherished', 'Valued', 'Honored'
];

const nouns = [
  'Writer', 'Dreamer', 'Storyteller', 'Narrator', 'Scribe', 'Author',
  'Poet', 'Bard', 'Wordsmith', 'Creator', 'Artist', 'Voyager',
  'Explorer', 'Wanderer', 'Sage', 'Muse', 'Phoenix', 'Star',
  'Moon', 'Comet', 'Nebula', 'Galaxy', 'Aurora', 'Cosmos',
  'Ocean', 'Forest', 'Mountain', 'River', 'Breeze', 'Spark',
  'Scholar', 'Philosopher', 'Thinker', 'Visionary', 'Pioneer', 'Innovator',
  'Inventor', 'Builder', 'Maker', 'Craftsman', 'Artisan', 'Designer',
  'Architect', 'Engineer', 'Scientist', 'Researcher', 'Discoverer', 'Seeker',
  'Hunter', 'Tracker', 'Scout', 'Guide', 'Navigator', 'Pilot',
  'Captain', 'Admiral', 'Commander', 'General', 'Marshal', 'Knight',
  'Warrior', 'Guardian', 'Protector', 'Defender', 'Champion', 'Hero',
  'Legend', 'Myth', 'Spirit', 'Soul', 'Heart', 'Mind',
  'Eagle', 'Falcon', 'Hawk', 'Raven', 'Owl', 'Swan',
  'Tiger', 'Lion', 'Wolf', 'Bear', 'Fox', 'Deer',
  'Dragon', 'Griffin', 'Unicorn', 'Pegasus', 'Sphinx', 'Kraken',
  'Wizard', 'Sorcerer', 'Mage', 'Enchanter', 'Alchemist', 'Oracle',
  'Prophet', 'Shaman', 'Mystic', 'Sage', 'Elder', 'Master',
  'Student', 'Apprentice', 'Novice', 'Pupil', 'Scholar', 'Teacher',
  'Professor', 'Mentor', 'Coach', 'Leader', 'Chief', 'Elder',
  'King', 'Queen', 'Prince', 'Princess', 'Duke', 'Duchess',
  'Lord', 'Lady', 'Baron', 'Count', 'Earl', 'Marquis',
  'Angel', 'Cherub', 'Seraph', 'Guardian', 'Spirit', 'Ghost',
  'Shadow', 'Echo', 'Whisper', 'Song', 'Melody', 'Harmony',
  'Symphony', 'Ballad', 'Rhyme', 'Verse', 'Sonnet', 'Haiku',
  'Storm', 'Thunder', 'Lightning', 'Rain', 'Snow', 'Frost',
  'Wind', 'Gale', 'Breeze', 'Zephyr', 'Tempest', 'Hurricane',
  'Fire', 'Flame', 'Ember', 'Ash', 'Smoke', 'Vapor',
  'Ice', 'Crystal', 'Diamond', 'Jewel', 'Gem', 'Stone',
  'Rock', 'Boulder', 'Cliff', 'Peak', 'Summit', 'Valley',
  'Cave', 'Cavern', 'Grotto', 'Canyon', 'Gorge', 'Ravine',
  'Lake', 'Pond', 'Stream', 'Creek', 'Brook', 'Waterfall',
  'Garden', 'Meadow', 'Field', 'Prairie', 'Savanna', 'Steppe',
  'Desert', 'Oasis', 'Mirage', 'Dune', 'Sand', 'Dust',
  'Tree', 'Oak', 'Pine', 'Cedar', 'Birch', 'Maple',
  'Flower', 'Rose', 'Lily', 'Orchid', 'Tulip', 'Daisy',
  'Butterfly', 'Dragonfly', 'Firefly', 'Bee', 'Hummingbird', 'Skylark',
  'Horizon', 'Dawn', 'Dusk', 'Twilight', 'Midnight', 'Noon',
  'Eclipse', 'Solstice', 'Equinox', 'Season', 'Spring', 'Summer',
  'Autumn', 'Winter', 'Journey', 'Quest', 'Adventure', 'Odyssey',
  'Voyage', 'Expedition', 'Mission', 'Path', 'Trail', 'Road'
];

export function generateRandomUsername(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 9999) + 1;
  
  return `${adjective}${noun}${number}`;
}

export function capitalizeUsername(username: string): string {
  // Split by capital letters or numbers to add spaces
  const formatted = username
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([a-zA-Z])(\d)/g, '$1 $2');
  
  // Capitalize first letter of each word
  return formatted
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}