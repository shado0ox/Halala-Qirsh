import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseBankSms,
  isDepositOrIncomingMessage,
  extractAmount,
  extractMerchant,
  extractDate,
  extractPaymentMethod,
  categorizeMerchant,
  saveLearnedRule,
  getLearnedRules,
} from '../smsParser';
import { Category } from '../../types';

const mockCategories: Category[] = [
  { id: 'groceries', name: 'المقاضي والسوبرماركت', icon: 'ShoppingCart', color: '#10B981', bgColor: '#ECFDF5', monthlyLimit: 2500 },
  { id: 'entertainment', name: 'ترفيه ومطاعم عائلية', icon: 'Coffee', color: '#F59E0B', bgColor: '#FFFBEB', monthlyLimit: 1200 },
  { id: 'transport', name: 'بنزين ومواصلات', icon: 'Car', color: '#6366F1', bgColor: '#EEF2FF', monthlyLimit: 800 },
  { id: 'health', name: 'الصحة والأدوية', icon: 'HeartPulse', color: '#EF4444', bgColor: '#FEF2F2', monthlyLimit: 500 },
  { id: 'bills', name: 'الفواتير والالتزامات', icon: 'Receipt', color: '#8B5CF6', bgColor: '#F5F3FF', monthlyLimit: 600 },
];

describe('Bank SMS Regex Parser & Learner Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Deposit and Incoming Message Filter', () => {
    it('detects and ignores salary deposits', () => {
      const msg = 'تم إيداع الراتب بمبلغ 12,500.00 ريال في حسابك الجاري لدى مصرف الراجحي';
      expect(isDepositOrIncomingMessage(msg)).toBe(true);
      const res = parseBankSms(msg, mockCategories);
      expect(res.success).toBe(false);
      expect(res.isDeposit).toBe(true);
    });

    it('detects and ignores incoming transfers in Arabic and English', () => {
      const msgAr = 'حوالة واردة بمبلغ 450.00 ر.س من محمد خالد';
      expect(isDepositOrIncomingMessage(msgAr)).toBe(true);
      const resAr = parseBankSms(msgAr, mockCategories);
      expect(resAr.success).toBe(false);
      expect(resAr.isDeposit).toBe(true);

      const msgEn = 'Incoming transfer of SAR 300.00 received from Ahmed credited to account ending 4455';
      expect(isDepositOrIncomingMessage(msgEn)).toBe(true);
      const resEn = parseBankSms(msgEn, mockCategories);
      expect(resEn.success).toBe(false);
      expect(resEn.isDeposit).toBe(true);
    });
  });

  describe('Saudi Bank SMS Parsing (Arabic)', () => {
    it('parses Al Rajhi card purchase at Panda', () => {
      const msg = 'شراء بـ 245.50 رس من بطاقة مدى *1234 لدى أسواق بنده بتاريخ 2026-04-12 16:45 الرصيد 4,200.00';
      const res = parseBankSms(msg, mockCategories);

      expect(res.success).toBe(true);
      expect(res.data?.amount).toBe(245.50);
      expect(res.data?.merchant).toContain('بنده');
      expect(res.data?.date).toBe('2026-04-12');
      expect(res.data?.paymentMethod).toBe('card');
      expect(res.data?.categoryId).toBe('groceries');
    });

    it('parses Alinma Bank purchase at Al Nahdi Pharmacy', () => {
      const msg = 'تمت عملية شراء عبر مدى بمبلغ 112.00 ريال لدى صيدلية النهدي في 2026-03-20 الرصيد المتبقي 1,500 ريال';
      const res = parseBankSms(msg, mockCategories);

      expect(res.success).toBe(true);
      expect(res.data?.amount).toBe(112.00);
      expect(res.data?.merchant).toContain('النهدي');
      expect(res.data?.categoryId).toBe('health');
    });

    it('parses STC Pay / Apple Pay purchase at Starbucks', () => {
      const msg = 'تم دفع 36.00 ر.س لدى ستاربكس كافيه عبر Apple Pay بتاريخ 2026-05-01';
      const res = parseBankSms(msg, mockCategories);

      expect(res.success).toBe(true);
      expect(res.data?.amount).toBe(36.00);
      expect(res.data?.merchant).toContain('ستاربكس');
      expect(res.data?.paymentMethod).toBe('digital');
      expect(res.data?.categoryId).toBe('entertainment');
    });

    it('parses Cash ATM withdrawal', () => {
      const msg = 'سحب نقدي بمبلغ 500 ريال من صراف الراجحي بواسطة بطاقة *9988';
      const res = parseBankSms(msg, mockCategories);

      expect(res.success).toBe(true);
      expect(res.data?.amount).toBe(500);
      expect(res.data?.paymentMethod).toBe('cash');
    });
  });

  describe('Saudi Bank SMS Parsing (English)', () => {
    it('parses SNB (National Bank) English SMS', () => {
      const msg = 'Purchase: SAR 85.50 at McDonalds via Mada card *4433 on 2026-06-15 13:20. Avail Bal SAR 2,400.00';
      const res = parseBankSms(msg, mockCategories);

      expect(res.success).toBe(true);
      expect(res.data?.amount).toBe(85.50);
      expect(res.data?.merchant.toLowerCase()).toContain('mcdonalds');
      expect(res.data?.categoryId).toBe('entertainment');
      expect(res.data?.date).toBe('2026-06-15');
    });

    it('parses Fuel purchase at SASCO', () => {
      const msg = 'POS Purchase: SAR 120.00 at Sasco Fuel Station using Card *1212 on 2026-02-10';
      const res = parseBankSms(msg, mockCategories);

      expect(res.success).toBe(true);
      expect(res.data?.amount).toBe(120.00);
      expect(res.data?.categoryId).toBe('transport');
    });
  });

  describe('Local Learning from User Corrections', () => {
    it('remembers when the user recategorizes a merchant and uses the learned category next time', () => {
      const unknownMerchantMsg = 'شراء بمبلغ 90.00 ريال لدى متجر أزياء النور بتاريخ 2026-01-10';
      
      // First parse: unknown merchant defaults to groceries/fallback
      const res1 = parseBankSms(unknownMerchantMsg, mockCategories);
      expect(res1.success).toBe(true);
      expect(res1.data?.isLearned).toBe(false);

      // User corrects category to 'bills' (or custom)
      saveLearnedRule('أزياء النور', 'bills');

      // Next parse: must recognize learned rule
      const res2 = parseBankSms(unknownMerchantMsg, mockCategories);
      expect(res2.success).toBe(true);
      expect(res2.data?.categoryId).toBe('bills');
      expect(res2.data?.isLearned).toBe(true);
    });
  });
});
