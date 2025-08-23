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
const { NextRequest, NextResponse } = require("next/server");
global.NextRequest = NextRequest;
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

// Note: nodemailer is mocked per-test-file to avoid conflicts
