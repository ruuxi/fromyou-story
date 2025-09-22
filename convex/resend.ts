import { components, internal } from "./_generated/api";
import { Resend, vEmailId, vEmailEvent } from "@convex-dev/resend";
import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Initialize Resend with configuration
export const resend: Resend = new Resend(components.resend, {
  // Optional: handle email events (delivered, bounced, etc.)
  onEmailEvent: internal.resend.handleEmailEvent,
});

// Email templates
const emailTemplates = {
  welcome: (name: string) => ({
    subject: "Welcome to From You - Start Creating Amazing Stories!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(to right, #FCD34D, #F87171); padding: 4px;">
          <div style="background: #1C1210; padding: 40px; text-align: center;">
            <h1 style="color: #FEF3C7; margin: 0; font-size: 32px;">Welcome to From You!</h1>
          </div>
        </div>
        
        <div style="padding: 40px; background: #F9FAFB;">
          <p style="color: #374151; font-size: 18px; margin-bottom: 20px;">
            Hi ${name},
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Thank you for joining From You! We're excited to have you as part of our creative community.
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-top: 20px;">
            With From You, you can:
          </p>
          
          <ul style="color: #374151; font-size: 16px; line-height: 1.8;">
            <li>Create unique stories with your favorite characters</li>
            <li>Explore different genres and story types</li>
            <li>Generate AI-powered story suggestions</li>
            <li>Save and share your creative works</li>
          </ul>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://fromyou.ai'}" 
               style="background: linear-gradient(to right, #FCD34D, #F87171); 
                      color: #1C1210; 
                      padding: 16px 32px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      font-weight: bold;
                      display: inline-block;">
              Start Creating Stories
            </a>
          </div>
          
          <p style="color: #6B7280; font-size: 14px; text-align: center;">
            If you have any questions, feel free to reach out to our support team.
          </p>
        </div>
        
        <div style="background: #1C1210; padding: 20px; text-align: center;">
          <p style="color: #FEF3C7; font-size: 14px; margin: 0;">
            © ${new Date().getFullYear()} From You. All rights reserved.
          </p>
        </div>
      </div>
    `,
  }),
  
  subscriptionConfirmed: (name: string, tier: string) => ({
    subject: `Your ${tier} subscription is now active!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(to right, #FCD34D, #F87171); padding: 4px;">
          <div style="background: #1C1210; padding: 40px; text-align: center;">
            <h1 style="color: #FEF3C7; margin: 0; font-size: 32px;">Subscription Confirmed!</h1>
          </div>
        </div>
        
        <div style="padding: 40px; background: #F9FAFB;">
          <p style="color: #374151; font-size: 18px; margin-bottom: 20px;">
            Hi ${name},
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Great news! Your <strong>${tier}</strong> subscription is now active.
          </p>
          
          <div style="background: #FEF3C7; border-left: 4px solid #FCD34D; padding: 20px; margin: 30px 0;">
            <p style="color: #78350F; font-size: 16px; margin: 0;">
              You now have access to enhanced features and higher rate limits. 
              Create more stories, faster than ever before!
            </p>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://fromyou.ai'}/subscription" 
               style="background: linear-gradient(to right, #FCD34D, #F87171); 
                      color: #1C1210; 
                      padding: 16px 32px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      font-weight: bold;
                      display: inline-block;">
              View Your Subscription
            </a>
          </div>
          
          <p style="color: #6B7280; font-size: 14px; text-align: center;">
            You can manage your subscription anytime from your account settings.
          </p>
        </div>
        
        <div style="background: #1C1210; padding: 20px; text-align: center;">
          <p style="color: #FEF3C7; font-size: 14px; margin: 0;">
            © ${new Date().getFullYear()} From You. All rights reserved.
          </p>
        </div>
      </div>
    `,
  }),
  
  subscriptionCancelled: (name: string) => ({
    subject: "We're sorry to see you go",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(to right, #FCD34D, #F87171); padding: 4px;">
          <div style="background: #1C1210; padding: 40px; text-align: center;">
            <h1 style="color: #FEF3C7; margin: 0; font-size: 32px;">Subscription Cancelled</h1>
          </div>
        </div>
        
        <div style="padding: 40px; background: #F9FAFB;">
          <p style="color: #374151; font-size: 18px; margin-bottom: 20px;">
            Hi ${name},
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Your subscription has been cancelled. You'll continue to have access to your 
            premium features until the end of your current billing period.
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-top: 20px;">
            We'd love to hear why you decided to cancel. Your feedback helps us improve 
            From You for everyone.
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://fromyou.ai'}" 
               style="background: #E5E7EB; 
                      color: #374151; 
                      padding: 16px 32px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      font-weight: bold;
                      display: inline-block;">
              Continue to From You
            </a>
          </div>
          
          <p style="color: #6B7280; font-size: 14px; text-align: center;">
            You can reactivate your subscription anytime from your account settings.
          </p>
        </div>
        
        <div style="background: #1C1210; padding: 20px; text-align: center;">
          <p style="color: #FEF3C7; font-size: 14px; margin: 0;">
            © ${new Date().getFullYear()} From You. All rights reserved.
          </p>
        </div>
      </div>
    `,
  }),
};

// Send welcome email to new users
export const sendWelcomeEmail = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const template = emailTemplates.welcome(args.name);
    
    const emailId = await resend.sendEmail(ctx, {
      from: `From You <${process.env.RESEND_FROM_EMAIL || 'noreply@fromyou.ai'}>`,
      to: args.email,
      subject: template.subject,
      html: template.html,
    });
    
    console.log(`Welcome email sent to ${args.email}:`, emailId);
    return emailId;
  },
});

// Send subscription confirmation email
export const sendSubscriptionConfirmationEmail = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
    tier: v.string(),
  },
  handler: async (ctx, args) => {
    const template = emailTemplates.subscriptionConfirmed(args.name, args.tier);
    
    const emailId = await resend.sendEmail(ctx, {
      from: `From You <${process.env.RESEND_FROM_EMAIL || 'noreply@fromyou.ai'}>`,
      to: args.email,
      subject: template.subject,
      html: template.html,
    });
    
    console.log(`Subscription confirmation email sent to ${args.email}:`, emailId);
    return emailId;
  },
});

// Send subscription cancellation email
export const sendSubscriptionCancellationEmail = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const template = emailTemplates.subscriptionCancelled(args.name);
    
    const emailId = await resend.sendEmail(ctx, {
      from: `From You <${process.env.RESEND_FROM_EMAIL || 'noreply@fromyou.ai'}>`,
      to: args.email,
      subject: template.subject,
      html: template.html,
    });
    
    console.log(`Subscription cancellation email sent to ${args.email}:`, emailId);
    return emailId;
  },
});

// Handle email events (delivery confirmations, bounces, etc.)
export const handleEmailEvent = internalMutation({
  args: {
    id: vEmailId,
    event: vEmailEvent,
  },
  handler: async (ctx, args) => {
    console.log("Email event received:", args.id, args.event);
    
    // You can add custom logic here to handle different event types:
    // - email.sent
    // - email.delivered
    // - email.bounced
    // - email.complained
    // - email.opened
    // - email.clicked
    
    // For now, we'll just log the events
    // In the future, you could store these in a database table for analytics
  },
});

// Public mutation to test email sending (development only)
export const testEmail = internalMutation({
  args: {
    to: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    // Only allow in development
    if (process.env.NODE_ENV === "production") {
      throw new Error("Test emails are only available in development");
    }
    
    await ctx.scheduler.runAfter(0, internal.resend.sendWelcomeEmail, {
      email: args.to,
      name: identity.name || "Test User",
    });
    
    return { success: true };
  },
});