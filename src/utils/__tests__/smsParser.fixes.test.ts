import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseBankSms,
  extractAmount,
  extractMerchant,
  extractDate,
  getLocalToday,
  getLocalDateString,
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

describe('smsParser Fixes & Regressions Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('needsCategory & Unknown Merchant', () => {
    it('sets needsCategory to true and categoryId to empty string for unknown merchants', () => {
      const msg = 'شراء بمبلغ 65.00 ريال لدى متجر النخيل الحديث بتاريخ 2026-05-10';
      const result = parseBankSms(msg, mockCategories);

      expect(result.success).toBe(true);
      expect(result.data?.merchant).toContain('متجر النخيل الحديث');
      expect(result.data?.categoryId).toBe('');
      expect(result.data?.needsCategory).toBe(true);
      expect(result.data?.isLearned).toBe(false);
    });

    it('sets needsCategory to false when merchant is recognized in dictionary', () => {
      const msg = 'شراء بقيمة 120.00 ر.س لدى كارفور بتاريخ 2026-05-11';
      const result = parseBankSms(msg, mockCategories);

      expect(result.success).toBe(true);
      expect(result.data?.categoryId).toBe('groceries');
      expect(result.data?.needsCategory).toBe(false);
    });
  });

  describe('Local Date Helper: getLocalToday and getLocalDateString', () => {
    it('getLocalToday returns YYYY-MM-DD format using local time', () => {
      const testDate = new Date(2026, 4, 15); // May 15, 2026
      expect(getLocalToday(testDate)).toBe('2026-05-15');
      expect(getLocalDateString(testDate)).toBe('2026-05-15');
    });

    it('extractDate defaults to getLocalToday without timezone shift', () => {
      const msgWithoutDate = 'شراء بمبلغ 50 ريال لدى بقالة الحي';
      const extracted = extractDate(msgWithoutDate);
      expect(extracted).toBe(getLocalToday());
    });
  });

  describe('Arabic Separators ٫ and ٬', () => {
    it('converts Arabic decimal separator ٫ (U+066B) to .', () => {
      const msg = 'شراء بمبلغ 175٫50 ريال لدى أسواق بنده';
      expect(extractAmount(msg)).toBe(175.50);
    });

    it('removes Arabic thousand separator ٬ (U+066C)', () => {
      const msg = 'عملية نقاط بيع بمبلغ ٢٬٤٥٠٫٠٠ ريال لدى إكسترا';
      expect(extractAmount(msg)).toBe(2450.00);
    });
  });

  describe('Date Format DD/MM/YY', () => {
    it('correctly parses DD/MM/YY', () => {
      const msg = 'شراء 70 ريال لدى ستاربكس في 22/07/26 الرصيد 1500';
      expect(extractDate(msg)).toBe('2026-07-22');
    });

    it('correctly parses DD-MM-YY', () => {
      const msg = 'عملية سحب 100 ريال بتاريخ 03-09-26';
      expect(extractDate(msg)).toBe('2026-09-03');
    });
  });

  describe('Colon Merchant Patterns & Lookahead Boundary Cutting', () => {
    it('extracts merchant with colon pattern لدى: and من:', () => {
      expect(extractMerchant('شراء 45 ريال لدى: بنده ماركت')).toBe('بنده ماركت');
      expect(extractMerchant('خصم 30 ريال من: ماكدونالدز عبر مدى')).toBe('ماكدونالدز');
    });

    it('cuts name at the first occurrence of: بتاريخ، من بطاقة، الرصيد، مدى، بطاقة', () => {
      expect(extractMerchant('شراء لدى هاف مليون من بطاقة مدى *9988')).toBe('هاف مليون');
      expect(extractMerchant('شراء لدى دانكن بتاريخ 2026-04-10')).toBe('دانكن');
      expect(extractMerchant('شراء لدى صيدلية النهدي الرصيد 500 ريال')).toBe('صيدلية النهدي');
      expect(extractMerchant('شراء لدى كارفور مدى *1234')).toBe('كارفور');
      expect(extractMerchant('شراء لدى جرير بطاقة *4321')).toBe('جرير');
    });
  });

  describe('Learning Rules Constraints', () => {
    it('does not save learned rules for placeholder generic merchant "عملية بنكية"', () => {
      saveLearnedRule('عملية بنكية', 'entertainment');
      const rules = getLearnedRules();
      expect(rules['عملية بنكية']).toBeUndefined();
    });

    it('does not save learned rules if categoryId is empty', () => {
      saveLearnedRule('متجر جديد', '');
      const rules = getLearnedRules();
      expect(rules['متجر جديد']).toBeUndefined();
    });

    it('saves learned rule for valid merchant and category', () => {
      saveLearnedRule('مخبز الياسمين', 'groceries');
      const rules = getLearnedRules();
      expect(rules['مخبز الياسمين']).toBe('groceries');
    });
  });
});
