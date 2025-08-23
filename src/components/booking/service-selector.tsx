"use client";

import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";

interface Service {
  id: string;
  title: string;
  description: string;
  duration: number;
  price: number;
  features: string[];
}

interface ServiceSelectorProps {
  selectedService?:
    | {
        id: string;
        title: string;
        duration: number;
        price: number;
      }
    | undefined;
  onServiceSelect: (service: {
    id: string;
    title: string;
    duration: number;
    price: number;
  }) => void;
}

export default function ServiceSelector({
  selectedService,
  onServiceSelect,
}: ServiceSelectorProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/services");
        if (!response.ok) {
          throw new Error("Failed to fetch services");
        }

        const data = await response.json();
        setServices(data.services || []);

        logger.info("Services loaded for booking", {
          count: data.services?.length || 0,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load services";
        setError(errorMessage);
        logger.error(
          "Failed to fetch services for booking",
          new Error(errorMessage)
        );
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="font-serif text-2xl font-light mb-4">
            Select Your Service
          </h2>
          <p className="text-muted-foreground">Loading available services...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-muted/30 rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-muted rounded mb-4" />
              <div className="h-4 bg-muted rounded mb-2" />
              <div className="h-4 bg-muted rounded mb-4" />
              <div className="h-8 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          Unable to Load Services
        </h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 border border-primary text-primary hover:bg-primary hover:text-background rounded-md transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-foreground mb-2">
          No Services Available
        </h3>
        <p className="text-muted-foreground">
          Please contact us to schedule an appointment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="font-serif text-2xl font-light mb-4">
          Select Your Service
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Choose from our range of professional counseling services. Each
          service is tailored to meet your specific needs and goals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map(service => (
          <div
            key={service.id}
            className={`relative bg-background border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col ${
              selectedService?.id === service.id
                ? "border-primary ring-2 ring-primary/20"
                : "border-border hover:border-primary/50"
            }`}
            onClick={() =>
              onServiceSelect({
                id: service.id,
                title: service.title,
                duration: service.duration,
                price: service.price,
              })
            }
          >
            {selectedService?.id === service.id && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-background"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}

            <div className="flex-grow">
              <h3 className="font-serif text-xl font-light text-foreground mb-3">
                {service.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                {service.description}
              </p>

              {service.features && service.features.length > 0 && (
                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                  {service.features.slice(0, 3).map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="w-4 h-4 text-accent mt-0.5 mr-2 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                {service.duration} minutes
              </div>
              <div className="text-xl font-medium text-primary">
                ${service.price}
              </div>
            </div>

            <button
              className={`mt-4 w-full py-2 px-4 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                selectedService?.id === service.id
                  ? "bg-primary text-background hover:bg-primary/90"
                  : "bg-muted text-foreground hover:bg-muted/80"
              }`}
              onClick={e => {
                e.stopPropagation();
                onServiceSelect({
                  id: service.id,
                  title: service.title,
                  duration: service.duration,
                  price: service.price,
                });
              }}
              aria-label={`Select ${service.title} service`}
            >
              {selectedService?.id === service.id
                ? "Selected"
                : "Select Service"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
