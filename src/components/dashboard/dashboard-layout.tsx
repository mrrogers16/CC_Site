"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { DashboardHome } from "./dashboard-home";
import { AppointmentsList } from "./appointments-list";
import { AppointmentHistory } from "./appointment-history";
import { ProfileSettings } from "./profile-settings";
import { AppointmentModal } from "./appointment-modal";
import { CancellationModal } from "./cancellation-modal";
import { RescheduleModal } from "./reschedule-modal";

type ActiveSection = "dashboard" | "appointments" | "history" | "profile";

interface AppointmentService {
  title: string;
  duration: number;
  price: string;
}

interface CancellationAppointment {
  id: string;
  dateTime: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  notes?: string;
  service: AppointmentService;
}

interface RescheduleAppointment {
  id: string;
  dateTime: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  notes?: string;
  service: {
    id: string;
    title: string;
    duration: number;
    price: string;
  };
}

interface SidebarItem {
  id: ActiveSection;
  title: string;
  icon: React.ReactNode;
  href?: string;
}

export function DashboardLayout() {
  const { data: session } = useSession();
  const [activeSection, setActiveSection] =
    useState<ActiveSection>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [cancellationAppointment, setCancellationAppointment] =
    useState<CancellationAppointment | null>(null);
  const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] =
    useState<RescheduleAppointment | null>(null);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        isSidebarOpen
      ) {
        setIsSidebarOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSidebarOpen]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [activeSection]);

  const sidebarItems: SidebarItem[] = [
    {
      id: "dashboard",
      title: "Dashboard",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2V5z"
          />
        </svg>
      ),
    },
    {
      id: "appointments",
      title: "My Appointments",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      id: "history",
      title: "Appointment History",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      id: "profile",
      title: "Profile Settings",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
  ];

  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: "/" });
  };

  const handleAppointmentClick = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setIsAppointmentModalOpen(true);
  };

  const handleCloseAppointmentModal = () => {
    setIsAppointmentModalOpen(false);
    setSelectedAppointmentId(null);
  };

  const handleCancelClick = async (appointmentId: string) => {
    try {
      // Fetch appointment details for cancellation modal
      const response = await fetch(`/api/appointments/${appointmentId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCancellationAppointment(data.data);
          setIsCancellationModalOpen(true);
          setIsAppointmentModalOpen(false);
        }
      }
    } catch (error) {
      console.error("Error fetching appointment for cancellation:", error);
    }
  };

  const handleConfirmCancellation = async (
    appointmentId: string,
    reason: string
  ) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        // Refresh the appointments list by updating the active section
        setActiveSection("appointments");
        return;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to cancel appointment");
      }
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      throw error;
    }
  };

  const handleCloseCancellationModal = () => {
    setIsCancellationModalOpen(false);
    setCancellationAppointment(null);
  };

  const handleRescheduleClick = async (appointmentId: string) => {
    try {
      // Fetch appointment details for reschedule modal
      const response = await fetch(`/api/appointments/${appointmentId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRescheduleAppointment(data.data);
          setIsRescheduleModalOpen(true);
          setIsAppointmentModalOpen(false);
        }
      }
    } catch (error) {
      console.error("Error fetching appointment for rescheduling:", error);
    }
  };

  const handleConfirmReschedule = async (
    appointmentId: string,
    newDateTime: string
  ) => {
    try {
      const response = await fetch(
        `/api/appointments/${appointmentId}/reschedule`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            newDateTime,
            reason: "Client requested reschedule",
          }),
        }
      );

      if (response.ok) {
        // Refresh the appointments list by updating the active section
        setActiveSection("appointments");
        return;
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to reschedule appointment"
        );
      }
    } catch (error) {
      console.error("Error rescheduling appointment:", error);
      throw error;
    }
  };

  const handleCloseRescheduleModal = () => {
    setIsRescheduleModalOpen(false);
    setRescheduleAppointment(null);
  };

  const renderMainContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardHome />;
      case "appointments":
        return <AppointmentsList onAppointmentClick={handleAppointmentClick} />;
      case "history":
        return (
          <AppointmentHistory onAppointmentClick={handleAppointmentClick} />
        );
      case "profile":
        return <ProfileSettings />;
      default:
        return <DashboardHome />;
    }
  };

  return (
    <section className="py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Mobile Sidebar Toggle */}
          <div className="lg:hidden flex items-center justify-between mb-4">
            <h1 className="font-serif text-2xl font-light text-foreground">
              My Account
            </h1>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
              aria-label="Toggle navigation menu"
            >
              <svg
                className="w-6 h-6 text-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isSidebarOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Sidebar */}
          <div
            ref={sidebarRef}
            className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform lg:relative lg:inset-auto lg:transform-none lg:w-64 lg:flex-shrink-0 ${
              isSidebarOpen
                ? "translate-x-0"
                : "-translate-x-full lg:translate-x-0"
            }`}
          >
            <div className="flex flex-col h-full">
              {/* Sidebar Header */}
              <div className="p-6 border-b border-border">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                    {session?.user?.name?.charAt(0) ||
                      session?.user?.email?.charAt(0) ||
                      "U"}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {session?.user?.name || "User"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {session?.user?.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 p-4 space-y-1">
                {sidebarItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                      activeSection === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {item.icon}
                    <span className="font-medium">{item.title}</span>
                  </button>
                ))}
              </nav>

              {/* Quick Actions */}
              <div className="p-4 border-t border-border space-y-2">
                <Link
                  href="/book"
                  className="w-full flex items-center justify-center space-x-2 bg-primary text-primary-foreground px-4 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span>Book New Appointment</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center space-x-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 px-4 py-2 rounded-lg transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Overlay */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Main Content */}
          <div className="flex-1 min-h-[600px] bg-card rounded-lg border border-border">
            {renderMainContent()}
          </div>
        </div>

        {/* Appointment Details Modal */}
        <AppointmentModal
          appointmentId={selectedAppointmentId}
          isOpen={isAppointmentModalOpen}
          onClose={handleCloseAppointmentModal}
          onCancelClick={handleCancelClick}
          onRescheduleClick={handleRescheduleClick}
        />

        {/* Cancellation Modal */}
        <CancellationModal
          appointment={cancellationAppointment}
          isOpen={isCancellationModalOpen}
          onClose={handleCloseCancellationModal}
          onConfirm={handleConfirmCancellation}
        />

        {/* Reschedule Modal */}
        <RescheduleModal
          appointment={rescheduleAppointment}
          isOpen={isRescheduleModalOpen}
          onClose={handleCloseRescheduleModal}
          onConfirm={handleConfirmReschedule}
        />
      </div>
    </section>
  );
}
