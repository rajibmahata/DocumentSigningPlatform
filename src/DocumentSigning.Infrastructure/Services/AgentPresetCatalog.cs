using System.Text.Json;
using DocumentSigning.Core.DTOs;

namespace DocumentSigning.Infrastructure.Services;

/// <summary>
/// Static catalog of all predefined agent configurations.
/// Each preset maps to an ISpecializedAgent type and includes
/// a full ConfigurationJson and multi-step WorkflowStepsJson
/// so merchants can provision production-ready agents in one click.
/// </summary>
public static class AgentPresetCatalog
{
    private static readonly JsonSerializerOptions _j =
        new() { WriteIndented = false, PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    // ── Workflow step helpers ─────────────────────────────────────────────────

    private static string Steps(params object[] steps) => JsonSerializer.Serialize(steps, _j);

    // ── Blog Presets ─────────────────────────────────────────────────────────

    private static readonly AgentPresetDto DailyBlogPost = new(
        PresetId:           "preset-daily-blog-post",
        Category:           "Blog",
        AgentType:          "blog",
        Name:               "Daily Blog Post Agent",
        Description:        "Automatically writes, validates, and publishes one SEO-optimised blog article every weekday morning at 08:00 UTC. Topics rotate across key e-signature use-cases.",
        Icon:               "✍️",
        Complexity:         "Medium",
        ScheduleExpression: "0 8 * * 1-5",
        Timezone:           "UTC",
        ApprovalMode:       "approval",
        MaxRetries:         3,
        ConfigurationJson: JsonSerializer.Serialize(new
        {
            topic           = "How AI is transforming document signing for SMBs",
            keywords        = "e-signature, AI documents, workflow automation, digital signing",
            target_audience = "Small business owners and operations managers",
            tone            = "informative and professional",
            category        = "Industry Insights",
            min_word_count  = 800,
            publish_on_approval = true,
            topic_rotation = new[]
            {
                "Top 5 benefits of electronic signatures for HR teams",
                "eIDAS compliance: what every business needs to know",
                "How to automate contract workflows in 2025",
                "DocuSign vs DocSignerHub: a feature-by-feature comparison",
                "Reduce contract turnaround time with AI-powered signing"
            }
        }, _j),
        WorkflowStepsJson: Steps(
            new { order = 1, stepName = "Generate Blog Draft",   stepType = "llm_call",      promptTemplate = "Write an SEO blog post about: {{topic}}. Keywords: {{keywords}}. Audience: {{target_audience}}. Tone: {{tone}}.",       isRequired = true  },
            new { order = 2, stepName = "SEO Validation",        stepType = "validation",     promptTemplate = "Validate the blog post for SEO quality, brand compliance, and tone.",                                                       isRequired = true  },
            new { order = 3, stepName = "Human Review Gate",     stepType = "approval_gate",  promptTemplate = "Awaiting editorial approval before publishing.",                                                                            isRequired = true  },
            new { order = 4, stepName = "Publish Blog",          stepType = "webhook",        promptTemplate = "POST /api/blogs/{blogId}/publish",                                                                                         isRequired = true  },
            new { order = 5, stepName = "Social Announcement",   stepType = "llm_call",       promptTemplate = "Write a LinkedIn post announcing the new article. Include a link and 3 relevant hashtags.",                               isRequired = false }
        ),
        Tags: new[] { "content", "seo", "automation", "blog" }
    );

    private static readonly AgentPresetDto WeeklyRoundupBlog = new(
        PresetId:           "preset-weekly-blog-roundup",
        Category:           "Blog",
        AgentType:          "blog",
        Name:               "Weekly Industry Roundup Blog",
        Description:        "Every Monday at 09:00 UTC, compiles a weekly digest of top e-signature and document automation news for thought-leadership content.",
        Icon:               "📰",
        Complexity:         "Simple",
        ScheduleExpression: "0 9 * * 1",
        Timezone:           "UTC",
        ApprovalMode:       "approval",
        MaxRetries:         2,
        ConfigurationJson: JsonSerializer.Serialize(new
        {
            topic           = "Weekly e-signature and document automation industry news roundup",
            keywords        = "digital signature news, document automation trends, e-sign updates",
            target_audience = "Legal, HR, and operations professionals",
            tone            = "curated and insightful",
            category        = "Industry News",
            min_word_count  = 600
        }, _j),
        WorkflowStepsJson: Steps(
            new { order = 1, stepName = "Research Topics",       stepType = "llm_call",    promptTemplate = "List the top 5 industry trends for e-signature and document automation this week.",   isRequired = true  },
            new { order = 2, stepName = "Write Roundup Post",    stepType = "llm_call",    promptTemplate = "Write a weekly roundup blog post based on the topics: {{topics}}.",                    isRequired = true  },
            new { order = 3, stepName = "Validate Content",      stepType = "validation",  promptTemplate = "Check brand tone, quality score, and legal compliance.",                               isRequired = true  },
            new { order = 4, stepName = "Editor Approval",       stepType = "approval_gate", promptTemplate = "Editorial sign-off required.",                                                       isRequired = true  },
            new { order = 5, stepName = "Publish",               stepType = "webhook",     promptTemplate = "POST /api/blogs/{blogId}/publish",                                                     isRequired = true  }
        ),
        Tags: new[] { "blog", "weekly", "thought-leadership" }
    );

    // ── Email Presets ─────────────────────────────────────────────────────────

    private static readonly AgentPresetDto EmailOutreachAgent = new(
        PresetId:           "preset-email-outreach",
        Category:           "Email",
        AgentType:          "email_marketing",
        Name:               "Cold Outreach Email Agent",
        Description:        "Generates personalised cold outreach emails every Tuesday and Thursday at 09:00 UTC. Targets prospects with a free-trial CTA tailored to their industry.",
        Icon:               "📧",
        Complexity:         "Medium",
        ScheduleExpression: "0 9 * * 2,4",
        Timezone:           "UTC",
        ApprovalMode:       "auto",
        MaxRetries:         3,
        ConfigurationJson: JsonSerializer.Serialize(new
        {
            email_type       = "outreach",
            merchant_name    = "DocSignerHub",
            product_name     = "DocSignerHub",
            recipient_name   = "{{recipient.name}}",
            sentiment        = "neutral",
            subject_line     = "Streamline your contract signing — try DocSignerHub free",
            target_industries = new[] { "Legal", "HR", "Real Estate", "Finance", "Healthcare" },
            cta              = "Start free trial",
            cta_url          = "https://docsignerhub.com/register"
        }, _j),
        WorkflowStepsJson: Steps(
            new { order = 1, stepName = "Generate Email Copy",    stepType = "llm_call",   promptTemplate = "Write a personalised cold outreach email for {{recipient.name}} at {{recipient.company}} in the {{recipient.industry}} industry. CTA: free trial at {{cta_url}}.",  isRequired = true  },
            new { order = 2, stepName = "Brand Compliance Check", stepType = "validation", promptTemplate = "Validate email for brand tone, legal compliance, and spam score.",                                                                                                   isRequired = true  },
            new { order = 3, stepName = "Send Email",             stepType = "email_send", promptTemplate = "Send to {{recipient.email}} with subject: {{subject_line}}",                                                                                                         isRequired = true  },
            new { order = 4, stepName = "Log Interaction",        stepType = "webhook",    promptTemplate = "POST /api/agent-manager/interactions — record outreach event",                                                                                                       isRequired = true  }
        ),
        Tags: new[] { "email", "outreach", "lead-gen" }
    );

    private static readonly AgentPresetDto EmailFollowUpAgent = new(
        PresetId:           "preset-email-followup",
        Category:           "Email",
        AgentType:          "email_marketing",
        Name:               "3-Touch Follow-Up Email Agent",
        Description:        "Sends a 3-email follow-up sequence (Day 3, Day 7, Day 14) after initial outreach. Uses AI to tailor each email based on recipient sentiment and prior engagement.",
        Icon:               "🔁",
        Complexity:         "Complex",
        ScheduleExpression: "0 10 * * 1,3,5",
        Timezone:           "UTC",
        ApprovalMode:       "auto",
        MaxRetries:         3,
        ConfigurationJson: JsonSerializer.Serialize(new
        {
            email_type    = "followup",
            merchant_name = "DocSignerHub",
            product_name  = "DocSignerHub",
            follow_up_days = new[] { 3, 7, 14 },
            objection_handling = true,
            sentiment         = "positive",
            cta               = "Book a 15-min demo"
        }, _j),
        WorkflowStepsJson: Steps(
            new { order = 1, stepName = "Analyse Prior Response",   stepType = "llm_call",    promptTemplate = "Analyse prior email thread sentiment and identify objections for {{recipient.email}}.",             isRequired = true  },
            new { order = 2, stepName = "Generate Follow-Up #1",    stepType = "llm_call",    promptTemplate = "Write follow-up email #1 (Day 3). Reference prior outreach. Address any objections found.",        isRequired = true  },
            new { order = 3, stepName = "Send Follow-Up #1",        stepType = "email_send",  promptTemplate = "Send to {{recipient.email}}",                                                                       isRequired = true  },
            new { order = 4, stepName = "Wait 4 Days",              stepType = "delay",       promptTemplate = "delay_days: 4",                                                                                     isRequired = true  },
            new { order = 5, stepName = "Generate Follow-Up #2",    stepType = "llm_call",    promptTemplate = "Write follow-up email #2 (Day 7). Shift angle: share a case study or stat.",                      isRequired = true  },
            new { order = 6, stepName = "Send Follow-Up #2",        stepType = "email_send",  promptTemplate = "Send to {{recipient.email}}",                                                                       isRequired = true  },
            new { order = 7, stepName = "Wait 7 Days",              stepType = "delay",       promptTemplate = "delay_days: 7",                                                                                     isRequired = true  },
            new { order = 8, stepName = "Generate Final Follow-Up", stepType = "llm_call",    promptTemplate = "Write final follow-up email (Day 14). Breakup email with soft CTA to book a demo.",               isRequired = true  },
            new { order = 9, stepName = "Send Final Follow-Up",     stepType = "email_send",  promptTemplate = "Send to {{recipient.email}}",                                                                       isRequired = true  }
        ),
        Tags: new[] { "email", "followup", "nurture", "sequence" }
    );

    private static readonly AgentPresetDto EmailNurtureAgent = new(
        PresetId:           "preset-email-nurture",
        Category:           "Email",
        AgentType:          "email_marketing",
        Name:               "Lead Nurture Email Agent",
        Description:        "Runs a weekly value-driven nurture sequence for leads who signed up but haven't converted. Delivers educational content, success stories, and feature highlights.",
        Icon:               "🌱",
        Complexity:         "Medium",
        ScheduleExpression: "0 8 * * 2",
        Timezone:           "UTC",
        ApprovalMode:       "approval",
        MaxRetries:         2,
        ConfigurationJson: JsonSerializer.Serialize(new
        {
            email_type    = "nurture",
            merchant_name = "DocSignerHub",
            product_name  = "DocSignerHub",
            nurture_themes = new[]
            {
                "Feature spotlight: AI-powered signature validation",
                "Customer success story: how LegalCo saved 40hrs/month",
                "eIDAS compliance guide — free download",
                "Top 10 workflow automation templates"
            },
            cta = "Upgrade to Pro"
        }, _j),
        WorkflowStepsJson: Steps(
            new { order = 1, stepName = "Select Nurture Theme",    stepType = "llm_call",    promptTemplate = "Choose the most relevant nurture email theme for this week based on the lead's stage.",     isRequired = true  },
            new { order = 2, stepName = "Generate Nurture Email",  stepType = "llm_call",    promptTemplate = "Write a nurture email using theme: {{theme}}. Include a valuable insight and soft CTA.",   isRequired = true  },
            new { order = 3, stepName = "Validate",                stepType = "validation",  promptTemplate = "Check tone, value delivery, and brand compliance.",                                         isRequired = true  },
            new { order = 4, stepName = "Send Nurture Email",      stepType = "email_send",  promptTemplate = "Send to lead segment.",                                                                     isRequired = true  }
        ),
        Tags: new[] { "email", "nurture", "lifecycle" }
    );

    private static readonly AgentPresetDto EmailReactivationAgent = new(
        PresetId:           "preset-email-reactivation",
        Category:           "Email",
        AgentType:          "email_marketing",
        Name:               "Win-Back Reactivation Agent",
        Description:        "Targets churned or inactive users (90+ days inactive) every first Monday of the month. Uses personalised incentives and AI-crafted reactivation messages.",
        Icon:               "🔥",
        Complexity:         "Medium",
        ScheduleExpression: "0 9 1-7 * 1",
        Timezone:           "UTC",
        ApprovalMode:       "approval",
        MaxRetries:         2,
        ConfigurationJson: JsonSerializer.Serialize(new
        {
            email_type     = "reactivation",
            merchant_name  = "DocSignerHub",
            product_name   = "DocSignerHub",
            inactive_days  = 90,
            incentive      = "30% off first month back",
            cta            = "Reactivate my account"
        }, _j),
        WorkflowStepsJson: Steps(
            new { order = 1, stepName = "Identify Inactive Users",  stepType = "webhook",    promptTemplate = "GET /api/analytics/inactive-users?days=90",                                                               isRequired = true  },
            new { order = 2, stepName = "Generate Win-Back Email",  stepType = "llm_call",   promptTemplate = "Write a win-back email for {{recipient.name}} who last used DocSignerHub {{inactive_days}} ago. Offer {{incentive}}.", isRequired = true  },
            new { order = 3, stepName = "Validate",                 stepType = "validation", promptTemplate = "Check compliance and emotional tone.",                                                                        isRequired = true  },
            new { order = 4, stepName = "Approval Gate",            stepType = "approval_gate", promptTemplate = "Review win-back batch before sending.",                                                                  isRequired = true  },
            new { order = 5, stepName = "Send Win-Back Email",      stepType = "email_send", promptTemplate = "Send to inactive user list.",                                                                               isRequired = true  }
        ),
        Tags: new[] { "email", "reactivation", "churn", "win-back" }
    );

    // ── Social Media Presets ──────────────────────────────────────────────────

    private static readonly AgentPresetDto LinkedInDailyAgent = new(
        PresetId:           "preset-linkedin-daily",
        Category:           "Social Media",
        AgentType:          "social_media",
        Name:               "Daily LinkedIn Post Agent",
        Description:        "Publishes one professional LinkedIn post every weekday at 09:30 UTC. Content rotates across product features, customer wins, industry insights, and thought-leadership hooks.",
        Icon:               "💼",
        Complexity:         "Simple",
        ScheduleExpression: "30 9 * * 1-5",
        Timezone:           "UTC",
        ApprovalMode:       "auto",
        MaxRetries:         3,
        ConfigurationJson: JsonSerializer.Serialize(new
        {
            platform         = "linkedin",
            content_category = "product_feature",
            tone             = "professional",
            merchant_name    = "DocSignerHub",
            posting_style    = "hook + value + CTA",
            content_rotation = new[]
            {
                "product_feature",
                "customer_win",
                "industry_insight",
                "thought_leadership",
                "how_to_tip"
            },
            hashtags         = "#eSignature #DocumentAutomation #LegalTech #DocSignerHub #WorkflowAutomation"
        }, _j),
        WorkflowStepsJson: Steps(
            new { order = 1, stepName = "Select Content Angle",   stepType = "llm_call",   promptTemplate = "Select the best LinkedIn content angle for today from: {{content_rotation}}. Return: angle, topic, hook_idea.",                  isRequired = true  },
            new { order = 2, stepName = "Generate LinkedIn Post", stepType = "llm_call",   promptTemplate = "Write a LinkedIn post using angle: {{angle}}. Hook: {{hook_idea}}. Tone: {{tone}}. Add {{hashtags}}. Max 220 words.",             isRequired = true  },
            new { order = 3, stepName = "Validate Post",          stepType = "validation", promptTemplate = "Check brand voice, engagement potential, and character limits.",                                                                    isRequired = true  },
            new { order = 4, stepName = "Publish to LinkedIn",    stepType = "social_post", promptTemplate = "POST to LinkedIn via connected account. Platform: linkedin.",                                                                     isRequired = true  }
        ),
        Tags: new[] { "linkedin", "social", "daily", "b2b" }
    );

    private static readonly AgentPresetDto FacebookCampaignAgent = new(
        PresetId:           "preset-facebook-campaign",
        Category:           "Social Media",
        AgentType:          "social_media",
        Name:               "Facebook Campaign Post Agent",
        Description:        "Posts 3x per week to Facebook (Mon/Wed/Fri at 11:00 UTC). Generates campaign-aligned content, promotional offers, and engagement-driving posts targeting SMB decision-makers.",
        Icon:               "📘",
        Complexity:         "Medium",
        ScheduleExpression: "0 11 * * 1,3,5",
        Timezone:           "UTC",
        ApprovalMode:       "approval",
        MaxRetries:         3,
        ConfigurationJson: JsonSerializer.Serialize(new
        {
            platform         = "facebook",
            content_category = "promotional",
            tone             = "friendly and approachable",
            merchant_name    = "DocSignerHub",
            campaign_goal    = "Drive free trial sign-ups",
            target_audience  = "SMB owners aged 30-55",
            cta              = "Try DocSignerHub free for 14 days",
            cta_url          = "https://docsignerhub.com/register"
        }, _j),
        WorkflowStepsJson: Steps(
            new { order = 1, stepName = "Generate Facebook Post",  stepType = "llm_call",    promptTemplate = "Write an engaging Facebook post for {{campaign_goal}}. Target: {{target_audience}}. Tone: {{tone}}. CTA: {{cta}}.",   isRequired = true  },
            new { order = 2, stepName = "Validate Post",           stepType = "validation",  promptTemplate = "Check for brand compliance, engagement quality, and Facebook best practices.",                                        isRequired = true  },
            new { order = 3, stepName = "Editorial Approval",      stepType = "approval_gate", promptTemplate = "Review before publishing to Facebook.",                                                                           isRequired = true  },
            new { order = 4, stepName = "Publish to Facebook",     stepType = "social_post", promptTemplate = "POST to Facebook page via connected account.",                                                                      isRequired = true  }
        ),
        Tags: new[] { "facebook", "social", "campaign", "smb" }
    );

    private static readonly AgentPresetDto EngagementReplyAgent = new(
        PresetId:           "preset-engagement-reply",
        Category:           "Social Media",
        AgentType:          "social_media",
        Name:               "Social Engagement & Reply Agent",
        Description:        "Monitors mentions and comments across LinkedIn and Facebook every 4 hours. Generates AI-crafted, on-brand replies to build community and improve engagement scores.",
        Icon:               "💬",
        Complexity:         "Medium",
        ScheduleExpression: "0 */4 * * *",
        Timezone:           "UTC",
        ApprovalMode:       "auto",
        MaxRetries:         2,
        ConfigurationJson: JsonSerializer.Serialize(new
        {
            platforms        = new[] { "linkedin", "facebook" },
            tone             = "friendly and helpful",
            merchant_name    = "DocSignerHub",
            reply_style      = "acknowledge + add value + invite further conversation",
            escalation_keywords = new[] { "complaint", "broken", "refund", "cancel", "bug" }
        }, _j),
        WorkflowStepsJson: Steps(
            new { order = 1, stepName = "Fetch New Mentions",       stepType = "webhook",    promptTemplate = "GET /api/marketing/engagements?status=new&platforms=linkedin,facebook",                                                              isRequired = true  },
            new { order = 2, stepName = "Classify Sentiment",       stepType = "llm_call",   promptTemplate = "Classify sentiment (positive/neutral/negative) and intent for each comment. Flag escalation keywords: {{escalation_keywords}}.",     isRequired = true  },
            new { order = 3, stepName = "Generate Reply",           stepType = "llm_call",   promptTemplate = "Write a brand-aligned reply for each comment. Style: {{reply_style}}. Tone: {{tone}}.",                                             isRequired = true  },
            new { order = 4, stepName = "Post Replies",             stepType = "social_post", promptTemplate = "Post replies to respective platforms.",                                                                                              isRequired = true  },
            new { order = 5, stepName = "Update Interaction Log",   stepType = "webhook",    promptTemplate = "POST /api/agent-manager/interactions",                                                                                               isRequired = true  }
        ),
        Tags: new[] { "engagement", "reply", "social", "community" }
    );

    // ── Campaign Presets ──────────────────────────────────────────────────────

    private static readonly AgentPresetDto MultiChannelCampaignAgent = new(
        PresetId:           "preset-multichannel-campaign",
        Category:           "Campaign",
        AgentType:          "campaign",
        Name:               "Multi-Channel Lead Gen Campaign Agent",
        Description:        "Orchestrates a 2-week multi-channel campaign across Email, LinkedIn, and Facebook every 1st of the month. Plans content calendar, generates assets, and tracks performance.",
        Icon:               "🚀",
        Complexity:         "Complex",
        ScheduleExpression: "0 7 1 * *",
        Timezone:           "UTC",
        ApprovalMode:       "approval",
        MaxRetries:         3,
        ConfigurationJson: JsonSerializer.Serialize(new
        {
            campaign_goal    = "Generate 50 free trial sign-ups in 14 days",
            target_audience  = "Operations managers and HR directors at companies with 50-500 employees",
            budget           = "$500",
            duration_days    = "14",
            channels         = "LinkedIn, Email, Facebook",
            key_message      = "Automate your document signing workflows — try free for 14 days",
            success_metrics  = new[] { "trial_signups", "email_open_rate", "social_reach", "ctr" }
        }, _j),
        WorkflowStepsJson: Steps(
            new { order = 1,  stepName = "Campaign Strategy",         stepType = "llm_call",     promptTemplate = "Create a 14-day multi-channel campaign plan for goal: {{campaign_goal}}. Audience: {{target_audience}}. Channels: {{channels}}.",            isRequired = true  },
            new { order = 2,  stepName = "Strategy Approval",         stepType = "approval_gate", promptTemplate = "Review campaign strategy and KPI targets before asset generation.",                                                                         isRequired = true  },
            new { order = 3,  stepName = "Generate Email Sequence",   stepType = "llm_call",     promptTemplate = "Write a 3-email campaign sequence (Day 1, Day 5, Day 12). Key message: {{key_message}}.",                                                    isRequired = true  },
            new { order = 4,  stepName = "Generate LinkedIn Content", stepType = "llm_call",     promptTemplate = "Create 6 LinkedIn posts for the campaign period. Vary angles: teaser, feature, social-proof, urgency, how-to, results.",                    isRequired = true  },
            new { order = 5,  stepName = "Generate Facebook Content", stepType = "llm_call",     promptTemplate = "Create 4 Facebook posts for the campaign. Tone: accessible, with clear CTA on each.",                                                       isRequired = true  },
            new { order = 6,  stepName = "Validate All Assets",       stepType = "validation",   promptTemplate = "Run brand compliance and quality check on all campaign assets.",                                                                              isRequired = true  },
            new { order = 7,  stepName = "Content Approval",          stepType = "approval_gate", promptTemplate = "Final review of all campaign assets before scheduling.",                                                                                    isRequired = true  },
            new { order = 8,  stepName = "Schedule & Launch",         stepType = "webhook",      promptTemplate = "POST /api/marketing/campaigns — create campaign with scheduled posts.",                                                                      isRequired = true  },
            new { order = 9,  stepName = "Mid-Campaign Review",       stepType = "delay",        promptTemplate = "delay_days: 7",                                                                                                                              isRequired = true  },
            new { order = 10, stepName = "Performance Analysis",      stepType = "llm_call",     promptTemplate = "Analyse mid-campaign metrics from {{success_metrics}}. Recommend adjustments.",                                                              isRequired = true  }
        ),
        Tags: new[] { "campaign", "multi-channel", "lead-gen", "email", "social" }
    );

    // ── Analytics Preset ──────────────────────────────────────────────────────

    private static readonly AgentPresetDto WeeklyAnalyticsAgent = new(
        PresetId:           "preset-weekly-analytics",
        Category:           "Analytics",
        AgentType:          "analytics",
        Name:               "Weekly Performance Analytics Agent",
        Description:        "Every Sunday at 20:00 UTC, aggregates the week's marketing performance data, generates an AI narrative summary, and emails the digest to the merchant.",
        Icon:               "📊",
        Complexity:         "Simple",
        ScheduleExpression: "0 20 * * 0",
        Timezone:           "UTC",
        ApprovalMode:       "auto",
        MaxRetries:         2,
        ConfigurationJson: JsonSerializer.Serialize(new
        {
            report_type    = "weekly_digest",
            metrics        = new[] { "blog_views", "email_open_rate", "social_engagement", "trial_signups", "conversion_rate" },
            comparison     = "previous_week",
            send_to_email  = true,
            ai_commentary  = true
        }, _j),
        WorkflowStepsJson: Steps(
            new { order = 1, stepName = "Fetch Weekly Metrics",   stepType = "webhook",  promptTemplate = "GET /api/analytics/summary?period=last_7_days",                                                                            isRequired = true  },
            new { order = 2, stepName = "Generate AI Narrative",  stepType = "llm_call", promptTemplate = "Write a concise executive summary of this week's marketing performance. Highlight wins, concerns, and recommendations.",   isRequired = true  },
            new { order = 3, stepName = "Email Weekly Report",    stepType = "email_send", promptTemplate = "Send weekly marketing digest to merchant's registered email.",                                                           isRequired = true  }
        ),
        Tags: new[] { "analytics", "reporting", "weekly", "digest" }
    );

    // ── Validation Preset ─────────────────────────────────────────────────────

    private static readonly AgentPresetDto ContentValidationAgent = new(
        PresetId:           "preset-content-validation",
        Category:           "Validation",
        AgentType:          "validation",
        Name:               "Content Quality & Brand Compliance Agent",
        Description:        "Runs on-demand or before every publish event. Scores content for SEO quality, brand voice alignment, legal compliance, and tone consistency. Rejects or flags non-compliant content.",
        Icon:               "✅",
        Complexity:         "Simple",
        ScheduleExpression: null!,
        Timezone:           "UTC",
        ApprovalMode:       "auto",
        MaxRetries:         1,
        ConfigurationJson: JsonSerializer.Serialize(new
        {
            check_seo        = true,
            check_brand_tone = true,
            check_legal      = true,
            check_sentiment  = true,
            minimum_seo_score = 70,
            brand_voice       = "professional, helpful, trustworthy, concise",
            blocked_phrases   = new[] { "guaranteed results", "100% secure", "risk-free" }
        }, _j),
        WorkflowStepsJson: Steps(
            new { order = 1, stepName = "SEO Quality Check",      stepType = "validation", promptTemplate = "Check keyword density, readability, meta description length, and heading structure.",      isRequired = true  },
            new { order = 2, stepName = "Brand Tone Analysis",    stepType = "llm_call",   promptTemplate = "Rate the content's alignment with brand voice: {{brand_voice}}. Score 0-100.",             isRequired = true  },
            new { order = 3, stepName = "Legal Compliance Scan",  stepType = "validation", promptTemplate = "Flag any claims, promises, or phrases that may have legal implications: {{blocked_phrases}}.", isRequired = true  },
            new { order = 4, stepName = "Generate QA Report",     stepType = "llm_call",   promptTemplate = "Produce a structured quality report with pass/fail per check and improvement suggestions.", isRequired = true  }
        ),
        Tags: new[] { "validation", "qa", "brand", "compliance" }
    );

    // ── Master catalog ────────────────────────────────────────────────────────

    public static readonly IReadOnlyList<AgentPresetDto> All = new[]
    {
        DailyBlogPost,
        WeeklyRoundupBlog,
        EmailOutreachAgent,
        EmailFollowUpAgent,
        EmailNurtureAgent,
        EmailReactivationAgent,
        LinkedInDailyAgent,
        FacebookCampaignAgent,
        EngagementReplyAgent,
        MultiChannelCampaignAgent,
        WeeklyAnalyticsAgent,
        ContentValidationAgent,
    };
}
