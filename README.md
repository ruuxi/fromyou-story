# FromYou - AI Story Creator

> **The ultimate open-source AI story and character generation platform with full SillyTavern compatibility**

From You is a comprehensive AI-powered storytelling platform that enables users to create immersive stories with AI-generated characters, automatic lore generation, and intelligent story suggestions. The platform features both its own native story creation system and full compatibility with SillyTavern formats for seamless integration.

## ✨ Key Features

### 🤖 AI Story Generation
- **Automatic Story Suggestions**: Get personalized story ideas based on your preferences
- **Smart Outline Creation**: AI-generated story outlines with context summarization
- **Multiple AI Models**: Support for various AI providers including OpenRouter
- **Custom Story Creation**: Build stories from scratch with AI assistance

### 👥 Character Management
- **AI Character Generation**: Automatic character description and personality generation
- **Character Discovery**: Browse and discover characters created by the community
- **Custom Character Creation**: Design your own characters with detailed lore
- **Character Import/Export**: Full compatibility with character formats

### 🌍 World Building
- **Automatic World Lore Generation**: AI-powered world building and lore creation
- **Lorebook Management**: Import and manage world information
- **Context-Aware Storytelling**: Stories adapt to character backgrounds and world settings

### 🔄 Dual Implementation Architecture
- **Native From You Experience**: Modern web-based story creation
- **SillyTavern Compatibility Layer**: Full support for SillyTavern formats and workflows
- **Import/Export**: Character cards (V1, V2, V3), presets, and lorebooks
- **Seamless Migration**: Use existing SillyTavern content or create new stories natively

### 🔐 Flexible Authentication
- **Anonymous Usage**: Full functionality without registration
- **Clerk Authentication**: Secure user accounts with social login
- **Session Persistence**: Maintain progress across anonymous sessions
- **User Preferences**: Customizable settings and story preferences

### 💳 Subscription Ready
- **Stripe Integration**: Complete payment processing setup
- **Tier Management**: Multiple subscription levels
- **Usage Tracking**: Monitor API usage and limits
- **Referral System**: Built-in referral program

### 📧 Communication
- **Resend Email Integration**: Automated email notifications

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling

### Backend
- **Convex** - Real-time backend with type safety
- **Clerk** - Authentication and user management
- **Stripe** - Payment processing
- **Resend** - Email delivery service

### AI & Integrations
- **AI SDK** - Multi-provider AI integration
- **OpenRouter** - Access to multiple AI models
- **React Markdown** - Rich text rendering
- **SWR** - Data fetching and caching

- **Bun** - Fast package manager and runtime


## 🚀 Quick Start

### Prerequisites
- **Convex** account
- **Clerk** account for authentication
- **Stripe** account for payments (optional)
- **Resend** account for emails (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ruuxi/fromyou-story.git
   cd fromyou-story
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Configure the following variables:

   ### Variables to set in Convex:
   ```env
   # Payment & Stripe (set these in Convex)
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   STRIPE_PRODUCT_TIER1_ID=your_tier1_product_id
   STRIPE_PRODUCT_TIER2_ID=your_tier2_product_id
   STRIPE_PRODUCT_TIER3_ID=your_tier3_product_id
   NEXT_PUBLIC_STRIPE_PRICE_TIER1_ID=your_tier1_price_id
   NEXT_PUBLIC_STRIPE_PRICE_TIER2_ID=your_tier2_price_id
   NEXT_PUBLIC_STRIPE_PRICE_TIER3_ID=your_tier3_price_id

   # Authentication & Clerk (set these in Convex)
   CLERK_SECRET_KEY=your_clerk_secret_key
   CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret
   NEXT_PUBLIC_CLERK_FRONTEND_API_URL=your_clerk_frontend_api_url

   # AI & OpenRouter (set these in Convex)
   OPENROUTER_API_KEY=your_openrouter_api_key

   # Email & Communication (set these in Convex)
   RESEND_FROM_EMAIL=your_email@domain.com
   NEXT_PUBLIC_SITE_URL=https://yourdomain.com

   # CORS & Security (set these in Convex)
   ALLOWED_ORIGIN=https://yourdomain.com
   NODE_ENV=development
   ```

   ### Variables for client-side only:
   ```env
   # Deployment & URLs
   CONVEX_DEPLOY_KEY=your_convex_deploy_key
   NEXT_PUBLIC_CONVEX_URL=your_convex_url
   NEXT_PUBLIC_SITE_URL=http://localhost:3000

   # Frontend Features
   NEXT_PUBLIC_STRIPE_COUPON_DAWN_ID=your_coupon_id
   NEXT_PUBLIC_STRIPE_COUPON_REFERRAL_ID=your_referral_coupon_id
   MAINTENANCE_MODE=false
   NEXT_PUBLIC_MAINTENANCE_MODE=false
   MAINTENANCE_PASSWORD=your_maintenance_password

   # Optional (not currently used)
   RESEND_API_KEY=your_resend_api_key
   OPENAI_API_KEY=your_openai_api_key
   GEMINI_API_KEY=your_gemini_api_key
   AI_GATEWAY_API_KEY=your_ai_gateway_key
   ```

4. **Start the Convex backend**
   ```bash
   bun convex dev
   ```

5. **Start the development server**
   ```bash
   bun dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
fromyou-story/
├── convex/                 # Convex backend
│   ├── actions/           # Server actions
│   ├── ai/               # AI integration logic
│   ├── characters/       # Character management
│   ├── chats/           # Chat functionality
│   ├── lorebooks/       # World info management
│   ├── presets/         # SillyTavern preset handling
│   ├── stories/         # Story generation
│   ├── subscriptions/   # Payment management
│   └── schema.ts        # Database schema
├── src/
│   ├── app/             # Next.js app router
│   │   ├── api/         # API routes
│   │   ├── c/           # Chat pages
│   │   ├── stories/     # Story pages
│   │   └── page.tsx     # Home page
│   ├── components/      # React components
│   │   ├── auth/        # Authentication
│   │   ├── characters/  # Character components
│   │   ├── custom/      # Custom creation
│   │   ├── import/      # Import functionality
│   │   ├── layout/      # Layout components
│   │   └── ui/          # UI primitives
│   ├── contexts/        # React contexts
│   ├── hooks/           # Custom hooks
│   ├── lib/             # Utility functions
│   └── types/           # TypeScript types
└── public/              # Static assets
```

## 🎯 Core Features Explained

### Story Generation
The platform uses advanced AI models to generate stories based on:
- User preferences (genre, style, POV)
- Selected characters and their backgrounds
- World lore and context
- Previous story interactions

### Character System
Characters are managed with a comprehensive system supporting:
- **Character Cards**: SillyTavern-compatible format
- **Personality Traits**: Detailed personality descriptions
- **Background Lore**: Rich character histories
- **Dialogue Examples**: Sample conversations for AI training

### Two Ways to Use From You

#### 1. Native From You Experience
- Modern web interface with real-time features
- Built-in character and world generation

#### 2. SillyTavern Compatibility Mode
- Import your existing SillyTavern content
- Use familiar SillyTavern presets and configurations
- Export stories back to SillyTavern format
- Maintain your existing workflow while gaining web features

### Anonymous vs Authenticated Users
- **Anonymous**: Full access with session-based persistence
- **Authenticated**: Cloud sync, advanced features, subscriptions
- **Seamless Migration**: Convert anonymous sessions to accounts

### Subscription Tiers
Modify subscription plans in `convex/subscriptions/`:
- Free tier with basic features
- Premium tier with advanced AI access
- Custom tiers as needed

### Email Templates
Customize email templates in `convex/resend.ts`

## 🚀 Deployment

## 📄 License

This project is open source and available under the [MIT License](LICENSE).


---

**From You** - Where stories come to life with AI 
