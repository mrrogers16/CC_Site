import Link from "next/link";

const quickActions = [
  {
    title: "New Appointment",
    description: "Schedule a new client appointment",
    href: "/admin/appointments/new",
    icon: (
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
          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
        />
      </svg>
    ),
    color: "bg-primary text-primary-foreground hover:bg-primary/90",
  },
  {
    title: "View Calendar",
    description: "Check today&apos;s appointment schedule",
    href: "/admin/appointments",
    icon: (
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
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    color: "bg-card border border-border text-foreground hover:bg-muted/50",
  },
  {
    title: "Client Directory",
    description: "Browse and manage client information",
    href: "/admin/clients",
    icon: (
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
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    color: "bg-card border border-border text-foreground hover:bg-muted/50",
  },
  {
    title: "Messages",
    description: "Review unread contact submissions",
    href: "/admin/contact",
    icon: (
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
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
    color: "bg-card border border-border text-foreground hover:bg-muted/50",
  },
];

export function QuickActions() {
  return (
    <section>
      <h2 className="font-serif text-2xl font-light text-foreground mb-6">
        Quick Actions
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map(action => (
          <Link
            key={action.title}
            href={action.href}
            className={`p-6 rounded-lg transition-all duration-200 ${action.color}`}
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">{action.icon}</div>
              <div>
                <h3 className="font-medium">{action.title}</h3>
                <p className="text-sm opacity-75 mt-1">{action.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
