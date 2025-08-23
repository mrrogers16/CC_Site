import "@testing-library/jest-dom";

// Polyfills for Next.js Web APIs
import { TextEncoder, TextDecoder } from "util";

// Set up global polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Next.js Web APIs
global.Request = class MockRequest {
  constructor(url, options = {}) {
    this.url = url;
    this.method = options.method || "GET";
    this.headers = new Map(Object.entries(options.headers || {}));
    this.body = options.body;
  }

  async json() {
    try {
      return typeof this.body === "string" ? JSON.parse(this.body) : this.body;
    } catch {
      return {};
    }
  }

  async text() {
    return typeof this.body === "string"
      ? this.body
      : JSON.stringify(this.body);
  }
};

global.Response = class MockResponse {
  constructor(body, options = {}) {
    this.body = body;
    this.status = options.status || 200;
    this.statusText = options.statusText || "OK";
    this.headers = new Map(Object.entries(options.headers || {}));
    this.ok = this.status >= 200 && this.status < 300;
  }

  async json() {
    try {
      return typeof this.body === "string" ? JSON.parse(this.body) : this.body;
    } catch {
      return {};
    }
  }

  async text() {
    return typeof this.body === "string"
      ? this.body
      : JSON.stringify(this.body);
  }

  static json(data, options = {}) {
    return new MockResponse(JSON.stringify(data), {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  }
};

// Mock Headers API
global.Headers = Map;

// Mock fetch
global.fetch = jest.fn();

// Mock NextRequest and NextResponse for route handlers
// Use custom NextRequest mock to avoid readonly property issues
global.NextRequest = class MockNextRequest {
  constructor(input, options = {}) {
    // Extract URL from input if it's a string, otherwise use the url property
    this.url = typeof input === 'string' ? input : input.url;
    this.method = options?.method || "GET";
    this.headers = new Map(Object.entries(options?.headers || {}));
    this.body = options?.body;
    this.nextUrl = { 
      pathname: new URL(this.url).pathname,
      searchParams: new URLSearchParams(new URL(this.url).search)
    };
  }

  async json() {
    try {
      return typeof this.body === "string" ? JSON.parse(this.body) : this.body;
    } catch {
      return {};
    }
  }

  async text() {
    return typeof this.body === "string"
      ? this.body
      : JSON.stringify(this.body);
  }
};

// Mock the next/server module to avoid import issues
jest.mock("next/server", () => {
  const originalModule = jest.requireActual("next/server");
  return {
    ...originalModule,
    NextRequest: global.NextRequest,
    NextResponse: originalModule.NextResponse,
  };
});

const { NextResponse } = require("next/server");
global.NextResponse = NextResponse;

// Mock PrismaAdapter to avoid ES module issues
jest.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: jest.fn(() => ({
    createUser: jest.fn(),
    getUser: jest.fn(),
    getUserByEmail: jest.fn(),
    getUserByAccount: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    linkAccount: jest.fn(),
    unlinkAccount: jest.fn(),
    createSession: jest.fn(),
    getSessionAndUser: jest.fn(),
    updateSession: jest.fn(),
    deleteSession: jest.fn(),
    createVerificationToken: jest.fn(),
    useVerificationToken: jest.fn(),
  })),
}));

// Mock global prisma for integration tests
global.prisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  contactSubmission: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  service: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  appointment: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

// Note: nodemailer is mocked per-test-file to avoid conflicts
