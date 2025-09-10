import { type Appearance } from '@clerk/types'

export const clerkAppearance: Appearance = {
  variables: {
    // Colors
    colorPrimary: '#0ea5e9', // sky-500
    colorText: '#ffffff',
    colorTextSecondary: 'rgba(255, 255, 255, 0.85)',
    colorTextOnPrimaryBackground: '#ffffff',
    colorNeutral: 'rgba(255, 255, 255, 1)',
    
    // Fonts
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontSize: '16px',
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    
    // Borders
    borderRadius: '0px',
  },
  elements: {
    // Root containers
    rootBox: {
      backgroundColor: 'transparent',
    },
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
    },
    
    // Headers
    header: {
      color: '#ffffff',
    },
    headerTitle: {
      color: '#ffffff',
      fontWeight: 600,
    },
    headerSubtitle: {
      color: 'rgba(255, 255, 255, 0.8)',
    },
    
    // Form elements
    formFieldLabel: {
      color: 'rgba(255, 255, 255, 0.9)',
      fontSize: '14px',
      fontWeight: 500,
    },
    formFieldInput: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      color: '#ffffff',
      '&::placeholder': {
        color: 'rgba(255, 255, 255, 0.5)',
      },
      '&:focus': {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderColor: '#0ea5e9',
        boxShadow: '0 0 0 3px rgba(14, 165, 233, 0.2)',
      },
    },
    
    // Buttons
    formButtonPrimary: {
      backgroundColor: 'rgba(14, 165, 233, 0.2)',
      border: '1px solid rgba(14, 165, 233, 0.3)',
      color: '#ffffff',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      transition: 'all 0.2s ease',
      '&:hover': {
        backgroundColor: 'rgba(14, 165, 233, 0.3)',
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
      },
    },
    formButtonSecondary: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      color: '#ffffff',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
      },
    },
    
    // Links
    formFieldAction: {
      color: '#0ea5e9',
      fontSize: '14px',
      '&:hover': {
        color: '#38bdf8',
      },
    },
    footerActionLink: {
      color: '#0ea5e9',
      '&:hover': {
        color: '#38bdf8',
      },
    },
    
    // Social buttons
    socialButtonsIconButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
      },
    },
    socialButtonsBlockButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      color: '#ffffff',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
      },
    },
    
    // Dividers
    dividerRow: {
      '& > div': {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
      },
    },
    dividerText: {
      color: 'rgba(255, 255, 255, 0.6)',
    },
    
    // Form messages
    formFieldSuccessText: {
      color: '#10b981',
    },
    formFieldErrorText: {
      color: '#ef4444',
    },
    formFieldWarningText: {
      color: '#f59e0b',
    },
    
    // Alerts
    alert: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      color: '#ffffff',
    },
    
    // User button
    userButtonBox: {
      backgroundColor: 'transparent',
    },
    userButtonTrigger: {
      '&:hover': {
        opacity: 0.8,
      },
    },
    
    // User button popover (profile dropdown)
    userButtonPopoverCard: {
      backgroundColor: 'rgba(28, 18, 16, 0.95)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    userButtonPopoverActionButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
      },
    },
    
    // User profile page
    userProfile: {
      backgroundColor: 'rgba(28, 18, 16, 0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    },
    userProfileCard: {
      backgroundColor: 'rgba(28, 18, 16, 0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    
    // Account management pages
    accountSwitcher: {
      backgroundColor: 'rgba(28, 18, 16, 0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    },
    accountSwitcherCard: {
      backgroundColor: 'rgba(28, 18, 16, 0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    accountManagement: {
      backgroundColor: 'rgba(28, 18, 16, 0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    },
    accountManagementCard: {
      backgroundColor: 'rgba(28, 18, 16, 0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    
    // Navbar and menu items
    navbar: {
      backgroundColor: 'rgba(28, 18, 16, 0.7)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
    },
    navbarButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
      },
    },
    menuButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
      },
    },
    
    // Modal overlay
    modalBackdrop: {
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(15px)',
      WebkitBackdropFilter: 'blur(15px)',
    },
    
    // Additional form elements
    formFieldRadioInput: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(255, 255, 255, 0.3)',
      '&:checked': {
        backgroundColor: '#0ea5e9',
        borderColor: '#0ea5e9',
      },
    },
    formFieldCheckboxInput: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderColor: 'rgba(255, 255, 255, 0.6)',
      borderWidth: '2px',
      '&:checked': {
        backgroundColor: '#0ea5e9',
        borderColor: '#0ea5e9',
      },
      '&:hover': {
        borderColor: 'rgba(255, 255, 255, 0.8)',
      },
    },
    
    // Footer
    footer: {
      '& > div': {
        color: 'rgba(255, 255, 255, 0.7)',
      },
    },
    
    // Identity preview
    identityPreview: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      color: '#ffffff',
    },
    identityPreviewText: {
      color: '#ffffff',
    },
    identityPreviewEditButton: {
      color: '#0ea5e9',
      '&:hover': {
        color: '#38bdf8',
      },
    },
    
    // OTP input
    otpCodeFieldInput: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      color: '#ffffff',
      '&:focus': {
        borderColor: '#0ea5e9',
      },
    },
    
    // Loading spinner
    spinner: {
      color: '#0ea5e9',
    },
  },
}