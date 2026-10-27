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
  getLocalDateString,
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

  describe('Amount Extraction with Arabic comma ٫ and thousand separator ٬', () => {
    it('handles Arabic decimal separator ٫ (U+066B) correctly', () => {
      const msg = 'شراء بمبلغ 150٫75 ريال لدى بنده';
      const amount = extractAmount(msg);
      expect(amount).toBe(150.75);
    });

    it('handles Arabic thousand separator ٬ (U+066C) and Arabic numerals', () => {
      const msg = 'خصم بمبلغ ١٬٢٥٠٫٥٠ ر.س لدى إكسترا';
      const amount = extractAmount(msg);
      expect(amount).toBe(1250.50);
    });

    it('extracts standard Latin amounts', () => {
      expect(extractAmount('Purchase: SAR 85.50 at McDonalds')).toBe(85.50);
      expect(extractAmount('شراء بقيمة 40.00 رس')).toBe(40.00);
    });
  });

  describe('Merchant Extraction & Lookahead Arabic Boundaries', () => {
    it('extracts merchant with colon pattern لدى: and من:', () => {
      const msg1 = 'عملية شراء بمبلغ 200 ريال لدى: أسواق بنده بتاريخ 2026-04-10';
      expect(extractMerchant(msg1)).toBe('أسواق بنده');

      const msg2 = 'خصم 35 ر.س من: دانكن دونتس عبر مدى';
      expect(extractMerchant(msg2)).toBe('دانكن دونتس');
    });

    it('cuts merchant name at first word from (بتاريخ، من بطاقة، الرصيد، مدى، بطاقة)', () => {
      const msg1 = 'شراء بمبلغ 90 ريال لدى كارفور بتاريخ 2026-03-01 الرصيد 1200';
      expect(extractMerchant(msg1)).toBe('كارفور');

      const msg2 = 'شراء بمبلغ 55 ريال لدى هاف مليون من بطاقة مدى *5432';
      expect(extractMerchant(msg2)).toBe('هاف مليون');

      const msg3 = 'عملية لدى صيدلية النهدي بطاقة *1122 الرصيد 500';
      expect(extractMerchant(msg3)).toBe('صيدلية النهدي');
    });
  });

  describe('Date Extraction including DD/MM/YY & Local Date', () => {
    it('supports DD/MM/YY short format', () => {
      const msg = 'شراء 45 ريال لدى بارنيز في 18/05/26 الرصيد 200';
      expect(extractDate(msg)).toBe('2026-05-18');
    });

    it('supports DD-MM-YY and DD/MM/YYYY', () => {
      expect(extractDate('بتاريخ 05/11/2026')).toBe('2026-11-05');
      expect(extractDate('بتاريخ 14-04-26')).toBe('2026-04-14');
    });

    it('returns local date string in YYYY-MM-DD format without UTC shift', () => {
      const localStr = getLocalDateString(new Date(2026, 3, 27)); // April 27, 2026
      expect(localStr).toBe('2026-04-27');
    });
  });

  describe('Unknown Merchant Classification & Local Learning', () => {
    it('does NOT auto-select a category when merchant is unknown (returns categoryId: "")', () => {
      const unknownMsg = 'شراء بمبلغ 80.00 ريال لدى متجر الشرقية غير المعروف بتاريخ 2026-02-15';
      const res = parseBankSms(unknownMsg, mockCategories);

      expect(res.success).toBe(true);
      expect(res.data?.merchant).toContain('متجر الشرقية غير المعروف');
      expect(res.data?.categoryId).toBe(''); // Not auto-selected!
      expect(res.data?.isLearned).toBe(false);
    });

    it('remembers when the user saves a category correction and classifies it on future parses', () => {
      const merchant = 'متجر الأناقة للملابس';
      const msg = `شراء بمبلغ 220 ريال لدى ${merchant} بتاريخ 2026-03-10`;

      // 1. Initial parse -> unclassified
      const res1 = parseBankSms(msg, mockCategories);
      expect(res1.data?.categoryId).toBe('');

      // 2. User saves correction
      saveLearnedRule(merchant, 'entertainment');

      // 3. Next parse -> uses learned category
      const res2 = parseBankSms(msg, mockCategories);
      expect(res2.data?.categoryId).toBe('entertainment');
      expect(res2.data?.isLearned).toBe(true);
    });
  });
});
