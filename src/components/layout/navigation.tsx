"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { siteConfig } from "@/lib/config/site";

const navigationItems = [
  { title: "Home", href: "/" },
  { title: "Services", href: "/services" },
  { title: "About", href: "/about" },
  { title: "Blog", href: "/blog" },
  { title: "Contact", href: "/contact" },
];

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: "/" });
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
              <span className="font-serif text-2xl font-semibold text-primary">
                {siteConfig.name}
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigationItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="text-foreground hover:text-primary transition-colors duration-200 font-medium"
              >
                {item.title}
              </Link>
            ))}

            {/* Authentication-based navigation */}
            {status === "loading" ? (
              <div className="flex items-center space-x-4">
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              </div>
            ) : session ? (
              <>
                {/* Book Appointment for authenticated users */}
                <Link
                  href="/book"
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors duration-200 font-medium"
                >
                  Book Appointment
                </Link>

                {/* User Menu Dropdown */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors duration-200 font-medium"
                    aria-label="User menu"
                  >
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                      {session.user?.name?.charAt(0) ||
                        session.user?.email?.charAt(0) ||
                        "U"}
                    </div>
                    <svg
                      className={`w-4 h-4 transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-background border border-border rounded-lg shadow-lg py-1 z-50">
                      <div className="px-4 py-2 border-b border-border">
                        <p className="text-sm font-medium text-foreground">
                          {session.user?.name || "User"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.user?.email}
                        </p>
                      </div>
                      <Link
                        href="/account"
                        className="block px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors duration-200"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        My Account
                      </Link>
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleSignOut();
                        }}
                        className="w-full text-left block px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors duration-200"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Book Appointment for unauthenticated users - redirects to login */}
                <Link
                  href="/auth/login?callbackUrl=/book"
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors duration-200 font-medium"
                >
                  Book Appointment
                </Link>

                {/* Login and Register buttons */}
                <Link
                  href="/auth/login"
                  className="text-foreground hover:text-primary transition-colors duration-200 font-medium"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors duration-200 font-medium"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-foreground hover:text-primary transition-colors duration-200"
              aria-label="Toggle mobile menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
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
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-background border-t border-border">
              {navigationItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 text-foreground hover:text-primary transition-colors duration-200 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.title}
                </Link>
              ))}

              {/* Mobile Authentication-based navigation */}
              {status === "loading" ? (
                <div className="px-3 py-2">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded mb-2" />
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                </div>
              ) : session ? (
                <>
                  {/* User info section */}
                  <div className="px-3 py-2 border-t border-border mt-2">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-base font-semibold">
                        {session.user?.name?.charAt(0) ||
                          session.user?.email?.charAt(0) ||
                          "U"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {session.user?.name || "User"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.user?.email}
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/book"
                      className="block w-full bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors duration-200 font-medium text-center mb-3"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Book Appointment
                    </Link>

                    <Link
                      href="/account"
                      className="block px-0 py-2 text-foreground hover:text-primary transition-colors duration-200 font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      My Account
                    </Link>

                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleSignOut();
                      }}
                      className="block w-full text-left px-0 py-2 text-foreground hover:text-primary transition-colors duration-200 font-medium"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Book Appointment for unauthenticated mobile users */}
                  <Link
                    href="/auth/login?callbackUrl=/book"
                    className="block mx-3 mt-4 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors duration-200 font-medium text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Book Appointment
                  </Link>

                  {/* Login and Register for mobile */}
                  <div className="border-t border-border mt-4 pt-2">
                    <Link
                      href="/auth/login"
                      className="block px-3 py-2 text-foreground hover:text-primary transition-colors duration-200 font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Login
                    </Link>
                    <Link
                      href="/auth/register"
                      className="block mx-3 mt-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors duration-200 font-medium text-center"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Register
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
