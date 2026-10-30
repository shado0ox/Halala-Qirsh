import { describe, it, expect } from 'vitest';
import {
  calculateCycleDates,
  createJamiyyaGroup,
  swapMemberTurns,
  reorderMemberTurns,
  markMemberPayment,
  markPayoutReceived,
  replaceMember,
  getJamiyyaProgress,
  generateJamiyyaShareText,
  getUpcomingJamiyyaReminders,
} from '../jamiyyaEngine';

describe('Jamiyya Core Engine Tests', () => {
  it('correctly calculates cycle dates for monthly, weekly, and biweekly frequencies', () => {
    const monthlyDates = calculateCycleDates('2026-11-01', 'monthly', 4);
    expect(monthlyDates).toEqual(['2026-11-01', '2026-12-01', '2027-01-01', '2027-02-01']);

    const weeklyDates = calculateCycleDates('2026-11-01', 'weekly', 3);
    expect(weeklyDates).toEqual(['2026-11-01', '2026-11-08', '2026-11-15']);

    const biweeklyDates = calculateCycleDates('2026-11-01', 'biweekly', 3);
    expect(biweeklyDates).toEqual(['2026-11-01', '2026-11-15', '2026-11-29']);
  });

  it('creates a Jamiyya group with derived member count and initialized cycles & payments', () => {
    const group = createJamiyyaGroup({
      name: 'جمعية الأهل',
      totalPayout: 50000,
      installmentAmount: 5000,
      startDate: '2026-11-01',
    });

    expect(group.name).toBe('جمعية الأهل');
    expect(group.totalPayout).toBe(50000);
    expect(group.installmentAmount).toBe(5000);
    expect(group.membersCount).toBe(10);
    expect(group.members.length).toBe(10);
    expect(group.cycles.length).toBe(10);
    expect(group.payments.length).toBe(100); // 10 members x 10 cycles

    // First member should be current user and organizer by default
    expect(group.members[0].isCurrentUser).toBe(true);
    expect(group.members[0].isOrganizer).toBe(true);
    expect(group.members[0].payoutTurn).toBe(1);

    // First cycle recipient should be member 1
    expect(group.cycles[0].recipientMemberId).toBe(group.members[0].id);
    expect(group.cycles[0].expectedAmount).toBe(50000);
  });

  it('swaps turns between two members and updates cycle recipients', () => {
    const group = createJamiyyaGroup({
      name: 'جمعية العمل',
      totalPayout: 20000,
      installmentAmount: 5000,
      members: [
        { name: 'أنا', isCurrentUser: true },
        { name: 'خالد' },
        { name: 'سارة' },
        { name: 'عمر' },
      ],
    });

    const mem1 = group.members[0]; // turn 1
    const mem3 = group.members[2]; // turn 3

    expect(mem1.payoutTurn).toBe(1);
    expect(mem3.payoutTurn).toBe(3);
    expect(group.cycles[0].recipientMemberId).toBe(mem1.id);
    expect(group.cycles[2].recipientMemberId).toBe(mem3.id);

    const swapped = swapMemberTurns(group, mem1.id, mem3.id);
    const updatedM1 = swapped.members.find((m) => m.id === mem1.id);
    const updatedM3 = swapped.members.find((m) => m.id === mem3.id);

    expect(updatedM1?.payoutTurn).toBe(3);
    expect(updatedM3?.payoutTurn).toBe(1);

    // Cycles updated
    expect(swapped.cycles[0].recipientMemberId).toBe(mem3.id);
    expect(swapped.cycles[2].recipientMemberId).toBe(mem1.id);
  });

  it('reorders member turns smoothly', () => {
    const group = createJamiyyaGroup({
      name: 'جمعية الشباب',
      totalPayout: 15000,
      installmentAmount: 5000,
      members: [
        { name: 'عضو A' },
        { name: 'عضو B' },
        { name: 'عضو C' },
      ],
    });

    const [a, b, c] = group.members;
    // Reverse order: C, B, A
    const reordered = reorderMemberTurns(group, [c.id, b.id, a.id]);

    expect(reordered.members.find((m) => m.id === c.id)?.payoutTurn).toBe(1);
    expect(reordered.members.find((m) => m.id === b.id)?.payoutTurn).toBe(2);
    expect(reordered.members.find((m) => m.id === a.id)?.payoutTurn).toBe(3);

    expect(reordered.cycles[0].recipientMemberId).toBe(c.id);
    expect(reordered.cycles[2].recipientMemberId).toBe(a.id);
  });

  it('marks member payments and toggles them off properly', () => {
    const group = createJamiyyaGroup({
      name: 'جمعية التجربة',
      totalPayout: 10000,
      installmentAmount: 5000,
      members: [{ name: 'زيد' }, { name: 'عمرو' }],
    });

    const mem1 = group.members[0];
    const paid = markMemberPayment(group, 1, mem1.id, true, '2026-11-02', 'exp-123');

    const payment = paid.payments.find((p) => p.cycleNumber === 1 && p.memberId === mem1.id);
    expect(payment?.isPaid).toBe(true);
    expect(payment?.paidDate).toBe('2026-11-02');
    expect(payment?.linkedExpenseId).toBe('exp-123');

    // Toggle off
    const unpaid = markMemberPayment(paid, 1, mem1.id, false);
    const unpaidPayment = unpaid.payments.find((p) => p.cycleNumber === 1 && p.memberId === mem1.id);
    expect(unpaidPayment?.isPaid).toBe(false);
    expect(unpaidPayment?.paidDate).toBeUndefined();
    expect(unpaidPayment?.linkedExpenseId).toBeUndefined();
  });

  it('marks pot payout delivered and updates member hasTakenTurn', () => {
    const group = createJamiyyaGroup({
      name: 'جمعية التوفير',
      totalPayout: 6000,
      installmentAmount: 2000,
      members: [{ name: 'أحمد' }, { name: 'منى' }, { name: 'طارق' }],
    });

    const recipient = group.members[0];
    expect(recipient.hasTakenTurn).toBe(false);

    const paidOut = markPayoutReceived(group, 1, true, '2026-11-03', 'inc-456');
    expect(paidOut.cycles[0].payoutReceived).toBe(true);
    expect(paidOut.cycles[0].payoutDate).toBe('2026-11-03');
    expect(paidOut.cycles[0].linkedIncomeExpenseId).toBe('inc-456');

    const updatedRecipient = paidOut.members.find((m) => m.id === recipient.id);
    expect(updatedRecipient?.hasTakenTurn).toBe(true);
  });

  it('handles mid-group member replacement and creates discrepancy record', () => {
    const group = createJamiyyaGroup({
      name: 'جمعية الجيران',
      totalPayout: 12000,
      installmentAmount: 4000,
      members: [{ name: 'سالم' }, { name: 'فهد' }, { name: 'بدر' }],
    });

    const fahd = group.members[1];
    const replaced = replaceMember(group, fahd.id, {
      name: 'ماجد',
      phone: '0555555555',
    });

    expect(replaced.members.some((m) => m.name === 'ماجد')).toBe(true);
    expect(replaced.members.some((m) => m.id === fahd.id)).toBe(false);

    const majed = replaced.members.find((m) => m.name === 'ماجد')!;
    expect(majed.payoutTurn).toBe(fahd.payoutTurn);

    // Cycle recipient updated
    expect(replaced.cycles[1].recipientMemberId).toBe(majed.id);

    // Discrepancy logged
    expect(replaced.discrepancies?.length).toBe(1);
    expect(replaced.discrepancies?.[0].type).toBe('member_replaced');
    expect(replaced.discrepancies?.[0].description).toContain('فهد');
    expect(replaced.discrepancies?.[0].description).toContain('ماجد');
  });

  it('calculates comprehensive group progress and user status accurately', () => {
    const group = createJamiyyaGroup({
      name: 'جمعية الأصدقاء',
      totalPayout: 30000,
      installmentAmount: 10000,
      members: [
        { name: 'أنا', isCurrentUser: true },
        { name: 'صديق 1' },
        { name: 'صديق 2' },
      ],
    });

    let progress = getJamiyyaProgress(group);
    expect(progress.currentCycleNumber).toBe(1);
    expect(progress.collectedForCurrentCycle).toBe(0);
    expect(progress.expectedForCurrentCycle).toBe(30000);
    expect(progress.userInstallmentDueForCurrentCycle).toBe(true);
    expect(progress.unpaidMembersForCurrentCycle.length).toBe(3);

    // User pays installment for cycle 1
    const user = group.members[0];
    const afterUserPaid = markMemberPayment(group, 1, user.id, true);
    progress = getJamiyyaProgress(afterUserPaid);

    expect(progress.collectedForCurrentCycle).toBe(10000);
    expect(progress.userInstallmentDueForCurrentCycle).toBe(false);
    expect(progress.paidMembersForCurrentCycle.length).toBe(1);
    expect(progress.unpaidMembersForCurrentCycle.length).toBe(2);
  });

  it('generates rich WhatsApp share text in Arabic and English', () => {
    const group = createJamiyyaGroup({
      name: 'جمعية التوفير الكبرى',
      totalPayout: 50000,
      installmentAmount: 5000,
      bankAccountInfo: 'SA1280000000000000000000 (مصرف الراجحي)',
      members: [
        { name: 'محمد' },
        { name: 'عبدالله' },
      ],
    });

    const shareAr = generateJamiyyaShareText(group, 'ar', 'ر.س');
    expect(shareAr).toContain('جدول الجمعية: جمعية التوفير الكبرى');
    expect(shareAr).toContain('مبلغ القبضة الكامل');
    expect(shareAr).toContain('الدورة الحالية');
    expect(shareAr).toContain('مصرف الراجحي');
    expect(shareAr).toContain('هللة وقرش');

    const shareEn = generateJamiyyaShareText(group, 'en', 'SAR');
    expect(shareEn).toContain('Jam\'iyya: جمعية التوفير الكبرى');
    expect(shareEn).toContain('Total Pot:');
    expect(shareEn).toContain('Halala & Qirsh');
  });

  it('generates upcoming installment and payout reminders within lead days', () => {
    const today = new Date();
    const inTwoDays = new Date(today);
    inTwoDays.setDate(today.getDate() + 2);
    const inTwoDaysStr = inTwoDays.toISOString().slice(0, 10);

    const group = createJamiyyaGroup({
      name: 'جمعية العائلة',
      totalPayout: 10000,
      installmentAmount: 5000,
      startDate: inTwoDaysStr,
      members: [
        { name: 'أنا', isCurrentUser: true },
        { name: 'أخي' },
      ],
    });

    const reminders = getUpcomingJamiyyaReminders([group], 3, 'ر.س');
    expect(reminders.length).toBeGreaterThan(0);
    // User is recipient for cycle 1 and has installment due for cycle 1
    const installmentAlert = reminders.find((r) => r.type === 'installment_due');
    expect(installmentAlert).toBeDefined();
    expect(installmentAlert?.titleAr).toContain('جمعية العائلة');

    const payoutAlert = reminders.find((r) => r.type === 'payout_turn');
    expect(payoutAlert).toBeDefined();
    expect(payoutAlert?.titleAr).toContain('اقترب دورك');
  });
});
