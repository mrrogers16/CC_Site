"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminSidebar } from "@/components/admin/layout/admin-sidebar";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function AdminCommunicationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [selectedSubmission, setSelectedSubmission] =
    useState<ContactSubmission | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [responseSubject, setResponseSubject] = useState("");
  const [isResponding, setIsResponding] = useState(false);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.role !== "ADMIN") {
      router.push("/admin/login");
    }
  }, [session, status, router]);

  const fetchSubmissions = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "10",
        });

        if (filter !== "all") {
          params.append("isRead", filter === "read" ? "true" : "false");
        }

        const response = await fetch(`/api/contact?${params}`);
        const data = await response.json();

        if (data.success) {
          setSubmissions(data.data.submissions);
          setPagination(data.data.pagination);
        }
      } catch (error) {
        console.error("Failed to fetch submissions:", error);
      } finally {
        setLoading(false);
      }
    },
    [filter]
  );

  // Fetch submissions
  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const markAsRead = async (submissionId: string, isRead: boolean) => {
    try {
      const response = await fetch(`/api/admin/contact/${submissionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isRead }),
      });

      if (response.ok) {
        setSubmissions(prev =>
          prev.map(sub => (sub.id === submissionId ? { ...sub, isRead } : sub))
        );
      }
    } catch (error) {
      console.error("Failed to update submission:", error);
    }
  };

  const sendResponse = async () => {
    if (
      !selectedSubmission ||
      !responseMessage.trim() ||
      !responseSubject.trim()
    )
      return;

    try {
      setIsResponding(true);
      const response = await fetch(
        `/api/admin/contact/${selectedSubmission.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject: responseSubject,
            message: responseMessage,
          }),
        }
      );

      if (response.ok) {
        // Mark as read and close modal
        markAsRead(selectedSubmission.id, true);
        setSelectedSubmission(null);
        setResponseMessage("");
        setResponseSubject("");
        alert("Response sent successfully!");
      } else {
        alert("Failed to send response. Please try again.");
      }
    } catch (error) {
      console.error("Failed to send response:", error);
      alert("Failed to send response. Please try again.");
    } finally {
      setIsResponding(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex pt-16">
        {/* Sidebar */}
        <AdminSidebar isOpen={sidebarOpen} onToggle={setSidebarOpen} />

        {/* Main Content */}
        <main
          className={`flex-1 transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-16"}`}
        >
          <div className="p-6 lg:p-8">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
              <Link
                href="/admin/dashboard"
                className="hover:text-primary transition-colors"
              >
                Dashboard
              </Link>
              <span>›</span>
              <span className="text-foreground">Communications</span>
            </nav>

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-serif text-3xl font-light text-foreground">
                  Communications
                </h1>
                <p className="text-muted-foreground mt-2">
                  Manage and respond to contact form submissions
                </p>
              </div>

              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Toggle sidebar"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>

            {/* Filters */}
            <div className="mb-6">
              <div className="flex gap-2">
                {(["all", "unread", "read"] as const).map(filterValue => (
                  <button
                    key={filterValue}
                    onClick={() => setFilter(filterValue)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === filterValue
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {filterValue.charAt(0).toUpperCase() + filterValue.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Submissions Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  <p className="mt-2 text-muted-foreground">
                    Loading submissions...
                  </p>
                </div>
              ) : submissions.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">No submissions found.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left py-3 px-4 font-medium text-foreground">
                            Status
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">
                            Name
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">
                            Email
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">
                            Subject
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">
                            Date
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions.map(submission => (
                          <tr
                            key={submission.id}
                            className="border-b border-border hover:bg-muted/20"
                          >
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  submission.isRead
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {submission.isRead ? "Read" : "Unread"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-foreground">
                              {submission.name}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {submission.email}
                            </td>
                            <td className="py-3 px-4 text-foreground max-w-xs truncate">
                              {submission.subject}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground text-sm">
                              {formatDate(submission.createdAt)}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    setSelectedSubmission(submission)
                                  }
                                  className="text-primary hover:text-primary/80 text-sm font-medium"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() =>
                                    markAsRead(
                                      submission.id,
                                      !submission.isRead
                                    )
                                  }
                                  className="text-muted-foreground hover:text-foreground text-sm font-medium"
                                >
                                  {submission.isRead
                                    ? "Mark Unread"
                                    : "Mark Read"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        Showing {(pagination.page - 1) * pagination.limit + 1}{" "}
                        to{" "}
                        {Math.min(
                          pagination.page * pagination.limit,
                          pagination.total
                        )}{" "}
                        of {pagination.total} submissions
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => fetchSubmissions(pagination.page - 1)}
                          disabled={!pagination.hasPrev}
                          className="px-3 py-1 text-sm border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => fetchSubmissions(pagination.page + 1)}
                          disabled={!pagination.hasNext}
                          className="px-3 py-1 text-sm border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="font-serif text-2xl font-light text-foreground">
                  Contact Submission
                </h2>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Name
                  </label>
                  <p className="text-foreground">{selectedSubmission.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <p className="text-foreground">{selectedSubmission.email}</p>
                </div>
                {selectedSubmission.phone && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Phone
                    </label>
                    <p className="text-foreground">
                      {selectedSubmission.phone}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Subject
                  </label>
                  <p className="text-foreground">
                    {selectedSubmission.subject}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Message
                  </label>
                  <div className="bg-muted/30 rounded-lg p-4 mt-1">
                    <p className="text-foreground whitespace-pre-wrap">
                      {selectedSubmission.message}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Submitted
                  </label>
                  <p className="text-foreground">
                    {formatDate(selectedSubmission.createdAt)}
                  </p>
                </div>
              </div>

              {/* Response Section */}
              <div className="border-t border-border pt-6">
                <h3 className="font-medium text-foreground mb-4">
                  Send Response
                </h3>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="responseSubject"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Subject
                    </label>
                    <input
                      type="text"
                      id="responseSubject"
                      value={responseSubject}
                      onChange={e => setResponseSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder={`Re: ${selectedSubmission.subject}`}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="responseMessage"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Message
                    </label>
                    <textarea
                      id="responseMessage"
                      value={responseMessage}
                      onChange={e => setResponseMessage(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-vertical"
                      placeholder={`Dear ${selectedSubmission.name},\n\nThank you for reaching out to us...`}
                    />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setSelectedSubmission(null)}
                      className="px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-muted/50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={sendResponse}
                      disabled={
                        isResponding ||
                        !responseMessage.trim() ||
                        !responseSubject.trim()
                      }
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isResponding ? "Sending..." : "Send Response"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
