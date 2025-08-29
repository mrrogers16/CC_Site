"use client";

import { useState } from "react";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ClientContactHistoryProps {
  contactSubmissions: ContactSubmission[];
}

export function ClientContactHistory({ contactSubmissions }: ClientContactHistoryProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const truncateMessage = (message: string, maxLength: number = 150) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + "...";
  };

  if (contactSubmissions.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8">
        <div className="text-center">
          <svg
            className="w-12 h-12 mx-auto text-muted-foreground mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2 2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-foreground mb-2">No contact inquiries</h3>
          <p className="text-muted-foreground">
            This client has not submitted any contact inquiries yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-medium text-foreground">
          Contact History ({contactSubmissions.length})
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          All contact form submissions from this client
        </p>
      </div>
      
      <div className="divide-y divide-border">
        {contactSubmissions.map((submission) => {
          const isExpanded = expandedItems.has(submission.id);
          const shouldShowExpand = submission.message.length > 150;
          
          return (
            <div key={submission.id} className="p-6 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-foreground">
                      {submission.subject}
                    </h4>
                    {!submission.isRead && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        Unread
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <span>📧 {submission.email}</span>
                      {submission.phone && (
                        <span>📞 {submission.phone}</span>
                      )}
                      <span>📅 {new Date(submission.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Message Content */}
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-sm text-foreground whitespace-pre-wrap">
                  {isExpanded || !shouldShowExpand
                    ? submission.message
                    : truncateMessage(submission.message)
                  }
                </div>
                
                {shouldShowExpand && (
                  <button
                    onClick={() => toggleExpanded(submission.id)}
                    className="mt-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    {isExpanded ? "Show less" : "Show more"}
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <a
                  href={`mailto:${submission.email}?subject=Re: ${submission.subject}`}
                  className="px-3 py-1 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
                >
                  Reply via Email
                </a>
                
                {submission.phone && (
                  <a
                    href={`tel:${submission.phone}`}
                    className="px-3 py-1 text-sm border border-border text-muted-foreground hover:text-foreground hover:border-foreground rounded-md transition-colors"
                  >
                    Call Client
                  </a>
                )}
                
                <button
                  onClick={() => {
                    // Copy message to clipboard
                    navigator.clipboard.writeText(`
Subject: ${submission.subject}
From: ${submission.name} (${submission.email})
${submission.phone ? `Phone: ${submission.phone}` : ''}
Date: ${new Date(submission.createdAt).toLocaleString()}

${submission.message}
                    `.trim());
                  }}
                  className="px-3 py-1 text-sm border border-border text-muted-foreground hover:text-foreground hover:border-foreground rounded-md transition-colors"
                  title="Copy to clipboard"
                >
                  <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              </div>

              {/* Show update time if different from created */}
              {submission.updatedAt !== submission.createdAt && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Updated: {new Date(submission.updatedAt).toLocaleString()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}