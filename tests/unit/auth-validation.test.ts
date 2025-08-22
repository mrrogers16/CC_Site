import {
  registerSchema,
  loginSchema,
  emailVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type RegisterFormData,
  type LoginFormData,
} from '@/lib/validations/auth';

describe('Authentication Validation Schemas', () => {
  describe('registerSchema', () => {
    describe('valid data', () => {
      it('accepts valid registration data', () => {
        const validData = {
          name: 'John Doe',
          email: 'john.doe@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
          phone: '(555) 123-4567',
        };

        const result = registerSchema.safeParse(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it('accepts registration data without phone', () => {
        const validData = {
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          password: 'SecurePass1',
          confirmPassword: 'SecurePass1',
        };

        const result = registerSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('accepts various phone number formats', () => {
        const phoneFormats = [
          '555-123-4567',
          '(555) 123-4567',
          '+1 555 123 4567',
          '555.123.4567',
          '5551234567',
        ];

        phoneFormats.forEach((phone) => {
          const data = {
            name: 'Test User',
            email: 'test@example.com',
            password: 'Password123',
            confirmPassword: 'Password123',
            phone,
          };

          const result = registerSchema.safeParse(data);
          expect(result.success).toBe(true);
        });
      });
    });

    describe('name validation', () => {
      it('rejects names that are too short', () => {
        const data = {
          name: 'A',
          email: 'test@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Name must be at least 2 characters');
        }
      });

      it('rejects names that are too long', () => {
        const data = {
          name: 'A'.repeat(101),
          email: 'test@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Name must be less than 100 characters');
        }
      });
    });

    describe('email validation', () => {
      it('rejects invalid email formats', () => {
        const invalidEmails = [
          'invalid-email',
          '@example.com',
          'test@',
          'test..test@example.com',
          'test@example',
        ];

        invalidEmails.forEach((email) => {
          const data = {
            name: 'Test User',
            email,
            password: 'Password123',
            confirmPassword: 'Password123',
          };

          const result = registerSchema.safeParse(data);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues[0].message).toBe('Please enter a valid email address');
          }
        });
      });
    });

    describe('password validation', () => {
      it('rejects passwords that are too short', () => {
        const data = {
          name: 'Test User',
          email: 'test@example.com',
          password: 'Pass1',
          confirmPassword: 'Pass1',
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Password must be at least 8 characters');
        }
      });

      it('rejects passwords without lowercase letter', () => {
        const data = {
          name: 'Test User',
          email: 'test@example.com',
          password: 'PASSWORD123',
          confirmPassword: 'PASSWORD123',
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Password must contain');
        }
      });

      it('rejects passwords without uppercase letter', () => {
        const data = {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Password must contain');
        }
      });

      it('rejects passwords without number', () => {
        const data = {
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password',
          confirmPassword: 'Password',
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Password must contain');
        }
      });
    });

    describe('password confirmation', () => {
      it('rejects mismatched passwords', () => {
        const data = {
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password123',
          confirmPassword: 'Different123',
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          const confirmPasswordError = result.error.issues.find(
            (error) => error.path.includes('confirmPassword')
          );
          expect(confirmPasswordError?.message).toBe("Passwords don't match");
        }
      });
    });

    describe('phone validation', () => {
      it('rejects invalid phone formats', () => {
        const invalidPhones = [
          'abc-def-ghij',
          '123',
          'not-a-phone',
        ];

        invalidPhones.forEach((phone) => {
          const data = {
            name: 'Test User',
            email: 'test@example.com',
            password: 'Password123',
            confirmPassword: 'Password123',
            phone,
          };

          const result = registerSchema.safeParse(data);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues[0].message).toBe('Please enter a valid phone number');
          }
        });
      });
    });
  });

  describe('loginSchema', () => {
    it('accepts valid login data', () => {
      const validData = {
        email: 'user@example.com',
        password: 'password123',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('rejects invalid email', () => {
      const data = {
        email: 'invalid-email',
        password: 'password123',
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Please enter a valid email address');
      }
    });

    it('rejects empty password', () => {
      const data = {
        email: 'user@example.com',
        password: '',
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Password is required');
      }
    });

    it('rejects missing fields', () => {
      const result = loginSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(2);
      }
    });
  });

  describe('emailVerificationSchema', () => {
    it('accepts valid token', () => {
      const validData = {
        token: 'valid-verification-token-123',
      };

      const result = emailVerificationSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('rejects empty token', () => {
      const data = { token: '' };

      const result = emailVerificationSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Verification token is required');
      }
    });
  });

  describe('forgotPasswordSchema', () => {
    it('accepts valid email', () => {
      const validData = {
        email: 'user@example.com',
      };

      const result = forgotPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('rejects invalid email', () => {
      const data = { email: 'invalid-email' };

      const result = forgotPasswordSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Please enter a valid email address');
      }
    });
  });

  describe('resetPasswordSchema', () => {
    it('accepts valid reset data', () => {
      const validData = {
        token: 'reset-token-123',
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      };

      const result = resetPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('rejects mismatched passwords', () => {
      const data = {
        token: 'reset-token-123',
        password: 'NewPassword123',
        confirmPassword: 'DifferentPassword123',
      };

      const result = resetPasswordSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const confirmPasswordError = result.error.issues.find(
          (error) => error.path.includes('confirmPassword')
        );
        expect(confirmPasswordError?.message).toBe("Passwords don't match");
      }
    });

    it('applies same password complexity rules as registration', () => {
      const data = {
        token: 'reset-token-123',
        password: 'weak',
        confirmPassword: 'weak',
      };

      const result = resetPasswordSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password must be at least 8 characters');
      }
    });
  });

  describe('TypeScript type inference', () => {
    it('infers correct types from schemas', () => {
      // This test verifies that the TypeScript types are correctly inferred
      const registerData: RegisterFormData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        phone: '555-1234',
      };

      const loginData: LoginFormData = {
        email: 'john@example.com',
        password: 'Password123',
      };

      // If these compile without TypeScript errors, the types are correct
      expect(registerData.name).toBe('John Doe');
      expect(loginData.email).toBe('john@example.com');
    });
  });
});