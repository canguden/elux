/**
 * Elux Stripe Plugin
 * Payment processing capabilities for Elux applications
 */

import { Plugin, PluginEnvironment } from "./index";
import { print, printError } from "../core/utils";

// Stripe plugin options
export interface StripeOptions {
  apiKey: string;
  webhookSecret?: string;
  apiVersion?: string;
  appInfo?: {
    name?: string;
    version?: string;
    url?: string;
  };
}

// Stripe price type
export interface StripePrice {
  id: string;
  product: string;
  active: boolean;
  currency: string;
  unit_amount: number;
  nickname?: string;
  recurring?: {
    interval: "day" | "week" | "month" | "year";
    interval_count: number;
  };
}

// Stripe product type
export interface StripeProduct {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  images?: string[];
  metadata?: Record<string, string>;
}

// Payment result type
export interface PaymentResult {
  success: boolean;
  sessionId?: string;
  url?: string;
  error?: string;
}

// Stripe client interface
export interface StripeClient {
  checkout: {
    sessions: {
      create: (options: any) => Promise<{ id: string; url: string }>;
      retrieve: (sessionId: string) => Promise<any>;
    };
  };
  prices: {
    list: (options?: any) => Promise<{ data: StripePrice[] }>;
    retrieve: (priceId: string) => Promise<StripePrice>;
  };
  products: {
    list: (options?: any) => Promise<{ data: StripeProduct[] }>;
    retrieve: (productId: string) => Promise<StripeProduct>;
  };
  webhooks: {
    constructEvent: (body: string, signature: string, secret: string) => any;
  };
}

// Stripe service class
class StripeService {
  private client: StripeClient | null = null;
  private options: StripeOptions | null = null;
  private initialized: boolean = false;

  // Set stripe options
  setOptions(options: StripeOptions): void {
    this.options = options;
  }

  // Initialize Stripe client
  async initialize(): Promise<void> {
    if (!this.options) {
      throw new Error("Stripe options not provided. Call setOptions() first.");
    }

    if (this.initialized) {
      return;
    }

    try {
      // In a real implementation, this would dynamically import and initialize Stripe
      // For now, we'll just simulate it with a mock client
      this.client = createMockStripeClient(this.options);
      this.initialized = true;
      print("Stripe client initialized");
    } catch (error) {
      printError("Failed to initialize Stripe client:", error);
      throw error;
    }
  }

  // Get Stripe client instance
  getClient(): StripeClient | null {
    if (!this.initialized) {
      printError("Stripe client not initialized. Call initialize() first.");
    }
    return this.client;
  }

  // Create a checkout session
  async createCheckoutSession(options: {
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    mode?: "payment" | "subscription";
    quantity?: number;
    customerEmail?: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentResult> {
    if (!this.client) {
      return { success: false, error: "Stripe client not initialized" };
    }

    try {
      const {
        priceId,
        successUrl,
        cancelUrl,
        mode = "payment",
        quantity = 1,
        customerEmail,
        metadata,
      } = options;

      const session = await this.client.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity,
          },
        ],
        mode,
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: customerEmail,
        metadata,
      });

      return {
        success: true,
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      printError("Failed to create checkout session:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // List all active prices
  async listPrices(
    options: {
      active?: boolean;
      product?: string;
      limit?: number;
    } = {}
  ): Promise<StripePrice[]> {
    if (!this.client) {
      return [];
    }

    try {
      const { active = true, product, limit = 100 } = options;
      const result = await this.client.prices.list({
        active,
        product,
        limit,
      });
      return result.data;
    } catch (error) {
      printError("Failed to list prices:", error);
      return [];
    }
  }

  // List all active products
  async listProducts(
    options: {
      active?: boolean;
      limit?: number;
    } = {}
  ): Promise<StripeProduct[]> {
    if (!this.client) {
      return [];
    }

    try {
      const { active = true, limit = 100 } = options;
      const result = await this.client.products.list({
        active,
        limit,
      });
      return result.data;
    } catch (error) {
      printError("Failed to list products:", error);
      return [];
    }
  }

  // Verify webhook signature
  verifyWebhook(payload: string, signature: string): any {
    if (!this.client || !this.options?.webhookSecret) {
      printError("Cannot verify webhook without client or webhook secret");
      return null;
    }

    try {
      return this.client.webhooks.constructEvent(
        payload,
        signature,
        this.options.webhookSecret
      );
    } catch (error) {
      printError("Failed to verify webhook signature:", error);
      return null;
    }
  }
}

// Create a mock Stripe client for development
function createMockStripeClient(options: StripeOptions): StripeClient {
  // Mock products
  const mockProducts: StripeProduct[] = [
    {
      id: "prod_mock1",
      name: "Basic Plan",
      description: "Basic features for individuals",
      active: true,
      images: [],
    },
    {
      id: "prod_mock2",
      name: "Pro Plan",
      description: "Advanced features for professionals",
      active: true,
      images: [],
    },
  ];

  // Mock prices
  const mockPrices: StripePrice[] = [
    {
      id: "price_mock1",
      product: "prod_mock1",
      active: true,
      currency: "usd",
      unit_amount: 999,
      nickname: "Basic Monthly",
      recurring: {
        interval: "month",
        interval_count: 1,
      },
    },
    {
      id: "price_mock2",
      product: "prod_mock2",
      active: true,
      currency: "usd",
      unit_amount: 1999,
      nickname: "Pro Monthly",
      recurring: {
        interval: "month",
        interval_count: 1,
      },
    },
  ];

  return {
    checkout: {
      sessions: {
        create: async (options: any) => {
          print("[Stripe] Creating checkout session with options:", options);
          return {
            id: "cs_mock_" + Date.now(),
            url: `https://checkout.stripe.com/mock-checkout/${Date.now()}`,
          };
        },
        retrieve: async (sessionId: string) => {
          print(`[Stripe] Retrieving session: ${sessionId}`);
          return {
            id: sessionId,
            payment_status: "paid",
            customer: "cus_mock",
            metadata: {},
          };
        },
      },
    },
    prices: {
      list: async (options?: any) => {
        print("[Stripe] Listing prices with options:", options);
        let filteredPrices = [...mockPrices];

        if (options?.active !== undefined) {
          filteredPrices = filteredPrices.filter(
            (p) => p.active === options.active
          );
        }

        if (options?.product) {
          filteredPrices = filteredPrices.filter(
            (p) => p.product === options.product
          );
        }

        return { data: filteredPrices.slice(0, options?.limit || 100) };
      },
      retrieve: async (priceId: string) => {
        print(`[Stripe] Retrieving price: ${priceId}`);
        const price = mockPrices.find((p) => p.id === priceId);
        if (!price) {
          throw new Error(`Price not found: ${priceId}`);
        }
        return price;
      },
    },
    products: {
      list: async (options?: any) => {
        print("[Stripe] Listing products with options:", options);
        let filteredProducts = [...mockProducts];

        if (options?.active !== undefined) {
          filteredProducts = filteredProducts.filter(
            (p) => p.active === options.active
          );
        }

        return { data: filteredProducts.slice(0, options?.limit || 100) };
      },
      retrieve: async (productId: string) => {
        print(`[Stripe] Retrieving product: ${productId}`);
        const product = mockProducts.find((p) => p.id === productId);
        if (!product) {
          throw new Error(`Product not found: ${productId}`);
        }
        return product;
      },
    },
    webhooks: {
      constructEvent: (body: string, signature: string, secret: string) => {
        print(`[Stripe] Constructing webhook event`);
        try {
          // In a real implementation, this would verify the signature
          return JSON.parse(body);
        } catch (error) {
          throw new Error("Invalid payload or signature");
        }
      },
    },
  };
}

// Create the Stripe plugin
export const StripePlugin: Plugin = {
  name: "stripe",
  version: "0.1.0",
  environment: "both" as PluginEnvironment,

  // Stripe webhook middleware
  middleware: [
    async (req: any, res: any, next: Function) => {
      // Check if this is a Stripe webhook request
      if (req.url === "/api/webhooks/stripe") {
        try {
          const signature = req.headers["stripe-signature"];

          // Get raw body from request
          let rawBody = "";
          req.on("data", (chunk: Buffer) => {
            rawBody += chunk.toString();
          });

          req.on("end", () => {
            const event = stripeService.verifyWebhook(rawBody, signature);

            if (!event) {
              res.status(400).send("Webhook signature verification failed");
              return;
            }

            // Handle the event
            print(`[Stripe] Webhook received: ${event.type}`);

            // Send response back to Stripe
            res.status(200).send({ received: true });
          });
        } catch (error) {
          printError("Stripe webhook error:", error);
          res.status(500).send({ error: "Internal Server Error" });
        }
        return;
      }
      next();
    },
  ],

  // Set up the Stripe plugin
  async setup(options?: StripeOptions): Promise<void> {
    if (!options?.apiKey) {
      printError("Stripe plugin requires an API key to be configured");
      return;
    }

    try {
      stripeService.setOptions(options);
      await stripeService.initialize();
      print("Stripe plugin setup complete");
    } catch (error) {
      printError("Failed to setup Stripe plugin:", error);
      throw error;
    }
  },

  // Extends app with payment capabilities
  extends: {
    app: true,
  },

  // Teardown the Stripe plugin
  async teardown(): Promise<void> {
    print("Stripe plugin teardown complete");
  },
};

// Create singleton Stripe service
const stripeService = new StripeService();

// Export Stripe service API for use in application
export const stripe = {
  // Get Stripe client
  getClient: (): StripeClient | null => {
    return stripeService.getClient();
  },

  // Create checkout session
  createCheckoutSession: (options: {
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    mode?: "payment" | "subscription";
    quantity?: number;
    customerEmail?: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentResult> => {
    return stripeService.createCheckoutSession(options);
  },

  // List prices
  listPrices: (options?: {
    active?: boolean;
    product?: string;
    limit?: number;
  }): Promise<StripePrice[]> => {
    return stripeService.listPrices(options);
  },

  // List products
  listProducts: (options?: {
    active?: boolean;
    limit?: number;
  }): Promise<StripeProduct[]> => {
    return stripeService.listProducts(options);
  },

  // Format price for display
  formatPrice: (price: number, currency: string = "usd"): string => {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    });

    return formatter.format(price / 100);
  },
};

// Export default plugin
export default StripePlugin;
