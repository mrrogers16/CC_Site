"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { AdminSidebar } from "@/components/admin/layout/admin-sidebar";

interface Service {
  id: string;
  title: string;
  description: string;
  duration: number;
  price: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  appointmentCount: number;
}

interface ServiceFormData {
  title: string;
  description: string;
  duration: number;
  price: number;
  features: string[];
  isActive: boolean;
}

export default function AdminServicesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>({
    title: "",
    description: "",
    duration: 60,
    price: 0,
    features: [],
    isActive: true,
  });
  const [newFeature, setNewFeature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.role !== "ADMIN") {
      router.push("/admin/login");
    }
  }, [session, status, router]);

  // Fetch services
  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/services");
      const data = await response.json();

      if (data.success) {
        setServices(data.services);
      } else {
        setError("Failed to fetch services");
      }
    } catch (err) {
      setError("Error fetching services");
      console.error("Error fetching services:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetchServices();
    }
  }, [session]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const url = editingService
        ? `/api/admin/services/${editingService.id}`
        : "/api/admin/services";

      const method = editingService ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        setShowForm(false);
        setEditingService(null);
        resetForm();
        fetchServices();
      } else {
        setError(data.message || "Operation failed");
      }
    } catch (err) {
      setError("Error saving service");
      console.error("Error saving service:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle service active status
  const toggleServiceStatus = async (service: Service) => {
    try {
      const response = await fetch(`/api/admin/services/${service.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !service.isActive }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(
          `Service ${service.isActive ? "deactivated" : "activated"} successfully`
        );
        fetchServices();
      } else {
        setError(data.message || "Failed to update service status");
      }
    } catch (err) {
      setError("Error updating service status");
      console.error("Error updating service status:", err);
    }
  };

  // Delete service
  const deleteService = async (service: Service) => {
    if (
      !confirm(
        `Are you sure you want to delete "${service.title}"? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/services/${service.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        fetchServices();
      } else {
        setError(data.message || "Failed to delete service");
      }
    } catch (err) {
      setError("Error deleting service");
      console.error("Error deleting service:", err);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      duration: 60,
      price: 0,
      features: [],
      isActive: true,
    });
    setNewFeature("");
  };

  // Start editing service
  const startEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      title: service.title,
      description: service.description,
      duration: service.duration,
      price: service.price,
      features: [...service.features],
      isActive: service.isActive,
    });
    setShowForm(true);
  };

  // Add feature
  const addFeature = () => {
    if (newFeature.trim() && !formData.features.includes(newFeature.trim())) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()],
      }));
      setNewFeature("");
    }
  };

  // Remove feature
  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  // Format duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  // Clear alerts after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error, success]);

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
      <Navigation />

      <div className="flex pt-16">
        <AdminSidebar isOpen={sidebarOpen} onToggle={setSidebarOpen} />

        <main
          className={`flex-1 transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-16"}`}
        >
          <div className="p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-serif text-3xl font-light text-foreground">
                  Service Management
                </h1>
                <p className="text-muted-foreground mt-2">
                  Manage your practice&apos;s service offerings and pricing.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setShowForm(!showForm);
                    setEditingService(null);
                    resetForm();
                  }}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {showForm ? "Cancel" : "Add New Service"}
                </button>

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
            </div>

            {/* Alerts */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                {success}
              </div>
            )}

            {/* Service Form */}
            {showForm && (
              <div className="mb-8 p-6 bg-card border border-border rounded-lg">
                <h2 className="font-serif text-2xl font-light mb-6">
                  {editingService ? "Edit Service" : "Add New Service"}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="title"
                        className="block text-sm font-medium text-foreground mb-2"
                      >
                        Service Title *
                      </label>
                      <input
                        type="text"
                        id="title"
                        value={formData.title}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="price"
                        className="block text-sm font-medium text-foreground mb-2"
                      >
                        Price (USD) *
                      </label>
                      <input
                        type="number"
                        id="price"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            price: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Description *
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      value={formData.description}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="duration"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Duration (minutes) *
                    </label>
                    <input
                      type="number"
                      id="duration"
                      min="15"
                      max="480"
                      value={formData.duration}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          duration: parseInt(e.target.value) || 60,
                        }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Features Management */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Service Features
                    </label>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newFeature}
                        onChange={e => setNewFeature(e.target.value)}
                        placeholder="Enter a feature..."
                        className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        onKeyPress={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addFeature();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={addFeature}
                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                      >
                        Add
                      </button>
                    </div>

                    {formData.features.length > 0 && (
                      <div className="space-y-2">
                        {formData.features.map((feature, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-muted rounded-lg"
                          >
                            <span className="text-sm">{feature}</span>
                            <button
                              type="button"
                              onClick={() => removeFeature(index)}
                              className="text-red-600 hover:text-red-800 transition-colors"
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
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          isActive: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                    />
                    <label
                      htmlFor="isActive"
                      className="text-sm font-medium text-foreground"
                    >
                      Active (visible to clients)
                    </label>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isSubmitting
                        ? "Saving..."
                        : editingService
                          ? "Update Service"
                          : "Create Service"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingService(null);
                        resetForm();
                      }}
                      className="bg-muted text-muted-foreground px-6 py-2 rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Services List */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="font-serif text-2xl font-light">
                  Services ({services.length})
                </h2>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading services...</p>
                </div>
              ) : services.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    No services found.
                  </p>
                  <button
                    onClick={() => {
                      setShowForm(true);
                      resetForm();
                    }}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Create Your First Service
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {services.map(service => (
                    <div key={service.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-serif text-xl font-medium">
                              {service.title}
                            </h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                service.isActive
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {service.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>

                          <p className="text-muted-foreground mb-4">
                            {service.description}
                          </p>

                          <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
                            <span>
                              Duration: {formatDuration(service.duration)}
                            </span>
                            <span>Price: {formatPrice(service.price)}</span>
                            <span>
                              Appointments: {service.appointmentCount}
                            </span>
                          </div>

                          {service.features.length > 0 && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-foreground mb-2">
                                Features:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {service.features.map((feature, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-lg"
                                  >
                                    {feature}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => toggleServiceStatus(service)}
                            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                              service.isActive
                                ? "bg-red-100 text-red-700 hover:bg-red-200"
                                : "bg-green-100 text-green-700 hover:bg-green-200"
                            }`}
                          >
                            {service.isActive ? "Deactivate" : "Activate"}
                          </button>

                          <button
                            onClick={() => startEdit(service)}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteService(service)}
                            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
