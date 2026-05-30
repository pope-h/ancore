import { intentSchema, paymentIntentSchema } from '../src/schemas/intent';

describe('Intent Schema Validation', () => {
  describe('Payment Intent', () => {
    it('should accept valid payment intent', () => {
      const intent = {
        type: 'payment' as const,
        amount: '100.50',
        asset: 'XLM' as const,
        destination: 'GCZST3XVCDTUJ76ZAV2HA72KYPJW5YJSNXVZTSKNBPWTXGVLNPXQ4JH',
      };
      const result = paymentIntentSchema.safeParse(intent);
      expect(result.success).toBe(true);
    });

    it('should accept integer amounts', () => {
      const intent = {
        type: 'payment' as const,
        amount: '1000',
        asset: 'XLM' as const,
        destination: 'GCZST3XVCDTUJ76ZAV2HA72KYPJW5YJSNXVZTSKNBPWTXGVLNPXQ4JH',
      };
      const result = paymentIntentSchema.safeParse(intent);
      expect(result.success).toBe(true);
    });

    it('should accept USDC asset', () => {
      const intent = {
        type: 'payment' as const,
        amount: '50',
        asset: 'USDC' as const,
        destination: 'GCZST3XVCDTUJ76ZAV2HA72KYPJW5YJSNXVZTSKNBPWTXGVLNPXQ4JH',
      };
      const result = paymentIntentSchema.safeParse(intent);
      expect(result.success).toBe(true);
    });

    it('should reject invalid amount format', () => {
      const intent = {
        type: 'payment' as const,
        amount: 'invalid-amount',
        asset: 'XLM' as const,
        destination: 'GCZST3XVCDTUJ76ZAV2HA72KYPJW5YJSNXVZTSKNBPWTXGVLNPXQ4JH',
      };
      const result = paymentIntentSchema.safeParse(intent);
      expect(result.success).toBe(false);
    });

    it('should reject unsupported asset', () => {
      const intent = {
        type: 'payment' as const,
        amount: '100',
        asset: 'EUR' as any,
        destination: 'GCZST3XVCDTUJ76ZAV2HA72KYPJW5YJSNXVZTSKNBPWTXGVLNPXQ4JH',
      };
      const result = paymentIntentSchema.safeParse(intent);
      expect(result.success).toBe(false);
    });

    it('should reject empty destination', () => {
      const intent = {
        type: 'payment' as const,
        amount: '100',
        asset: 'XLM' as const,
        destination: '',
      };
      const result = paymentIntentSchema.safeParse(intent);
      expect(result.success).toBe(false);
    });

    it('should reject missing type', () => {
      const intent = {
        amount: '100',
        asset: 'XLM' as const,
        destination: 'GCZST3XVCDTUJ76ZAV2HA72KYPJW5YJSNXVZTSKNBPWTXGVLNPXQ4JH',
      };
      const result = paymentIntentSchema.safeParse(intent);
      expect(result.success).toBe(false);
    });
  });

  describe('Intent Union', () => {
    it('should validate via discriminated union', () => {
      const intent = {
        type: 'payment' as const,
        amount: '75.25',
        asset: 'USDC' as const,
        destination: 'GCZST3XVCDTUJ76ZAV2HA72KYPJW5YJSNXVZTSKNBPWTXGVLNPXQ4JH',
      };
      const result = intentSchema.safeParse(intent);
      expect(result.success).toBe(true);
    });

    it('should reject unknown intent type', () => {
      const intent = {
        type: 'swap' as any,
        amount: '100',
        asset: 'XLM' as const,
        destination: 'GCZST3XVCDTUJ76ZAV2HA72KYPJW5YJSNXVZTSKNBPWTXGVLNPXQ4JH',
      };
      const result = intentSchema.safeParse(intent);
      expect(result.success).toBe(false);
    });
  });
});
