/**
 * Jam'iyya (ROSCA / Rotating Savings and Credit Association) Core Engine
 * 100% offline pure TypeScript logic for money-pooling groups.
 */

import {
  JamiyyaGroup,
  JamiyyaMember,
  JamiyyaCycle,
  JamiyyaPaymentRecord,
  JamiyyaDiscrepancy,
  JamiyyaFrequency,
} from '../types';

/**
 * Format a Date to YYYY-MM-DD
 */
export function formatDateToYmd(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD to Date object at local midnight
 */
export function parseYmdToDate(ymd: string): Date {
  const parts = ymd.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  return new Date(y, m, d);
}

/**
 * Add cycles to a date according to frequency (monthly, weekly, biweekly)
 */
export function addCyclesToDate(startDateStr: string, frequency: JamiyyaFrequency, cycleIndex: number): string {
  if (cycleIndex <= 0) return startDateStr;
  const start = parseYmdToDate(startDateStr);

  if (frequency === 'weekly') {
    const next = new Date(start);
    next.setDate(start.getDate() + cycleIndex * 7);
    return formatDateToYmd(next);
  }

  if (frequency === 'biweekly') {
    const next = new Date(start);
    next.setDate(start.getDate() + cycleIndex * 14);
    return formatDateToYmd(next);
  }

  // Monthly: preserve day of month where possible, clamp if month has fewer days
  const targetYear = start.getFullYear();
  const targetMonth = start.getMonth() + cycleIndex;
  const originalDay = start.getDate();

  // Create date at 1st of target month, then check last day of that month
  const nextMonthFirst = new Date(targetYear, targetMonth, 1);
  const lastDayOfTargetMonth = new Date(nextMonthFirst.getFullYear(), nextMonthFirst.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(originalDay, lastDayOfTargetMonth);

  const targetDate = new Date(nextMonthFirst.getFullYear(), nextMonthFirst.getMonth(), safeDay);
  return formatDateToYmd(targetDate);
}

/**
 * Calculates due dates for all cycles in a group
 */
export function calculateCycleDates(startDate: string, frequency: JamiyyaFrequency, count: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    dates.push(addCyclesToDate(startDate, frequency, i));
  }
  return dates;
}

export interface CreateJamiyyaInput {
  name: string;
  totalPayout: number;
  installmentAmount: number;
  membersCount?: number;
  frequency?: JamiyyaFrequency;
  startDate?: string;
  organizerName?: string;
  bankAccountInfo?: string;
  notes?: string;
  reminderDaysBefore?: number;
  members?: Array<{
    name: string;
    phone?: string;
    isCurrentUser?: boolean;
    isOrganizer?: boolean;
    notes?: string;
  }>;
}

/**
 * Create a new Jam'iyya Group with initialized members, cycles, and payments matrix
 */
export function createJamiyyaGroup(input: CreateJamiyyaInput): JamiyyaGroup {
  const totalPayout = Number(input.totalPayout) || 0;
  const installmentAmount = Number(input.installmentAmount) || 0;

  if (totalPayout <= 0 || installmentAmount <= 0) {
    throw new Error('Total payout and installment amount must be greater than zero.');
  }

  const derivedCount = Math.max(1, Math.round(totalPayout / installmentAmount));
  const membersCount = input.membersCount && input.membersCount > 0 ? input.membersCount : derivedCount;
  const frequency: JamiyyaFrequency = input.frequency || 'monthly';
  const startDate = input.startDate || formatDateToYmd(new Date());
  const reminderDaysBefore = input.reminderDaysBefore ?? 3;

  const now = Date.now();
  const groupId = `jam-${now}-${Math.random().toString(36).substring(2, 7)}`;

  // 1. Build members list
  const members: JamiyyaMember[] = [];
  const rawMembers = input.members || [];

  for (let i = 0; i < membersCount; i++) {
    const raw = rawMembers[i];
    const memberId = `mem-${now}-${i + 1}`;
    const isFirstAndNoUser = i === 0 && !rawMembers.some((m) => m.isCurrentUser);

    members.push({
      id: memberId,
      name: raw?.name?.trim() || (i === 0 && isFirstAndNoUser ? 'أنا (المدير)' : `عضو ${i + 1}`),
      phone: raw?.phone?.trim() || undefined,
      payoutTurn: i + 1, // 1-based order
      isCurrentUser: raw?.isCurrentUser !== undefined ? raw.isCurrentUser : isFirstAndNoUser,
      isOrganizer: raw?.isOrganizer !== undefined ? raw.isOrganizer : i === 0,
      notes: raw?.notes?.trim() || undefined,
      hasTakenTurn: false,
    });
  }

  // 2. Build cycles list
  const cycleDates = calculateCycleDates(startDate, frequency, membersCount);
  const cycles: JamiyyaCycle[] = cycleDates.map((dueDate, idx) => {
    const turnNumber = idx + 1;
    const recipient = members.find((m) => m.payoutTurn === turnNumber) || members[idx];
    return {
      cycleNumber: turnNumber,
      dueDate,
      recipientMemberId: recipient.id,
      expectedAmount: totalPayout,
      payoutReceived: false,
    };
  });

  // 3. Initialize payment records (each member has a record per cycle)
  const payments: JamiyyaPaymentRecord[] = [];
  for (let c = 1; c <= membersCount; c++) {
    for (const mem of members) {
      payments.push({
        memberId: mem.id,
        cycleNumber: c,
        isPaid: false,
        amountPaid: installmentAmount,
      });
    }
  }

  const organizer = members.find((m) => m.isOrganizer);

  return {
    id: groupId,
    name: input.name.trim() || 'جمعية مالية',
    totalPayout,
    installmentAmount,
    membersCount,
    frequency,
    startDate,
    status: 'active',
    organizerId: organizer?.id,
    bankAccountInfo: input.bankAccountInfo?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    reminderDaysBefore,
    members,
    payments,
    cycles,
    discrepancies: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Swap payout turns between two members in a group
 */
export function swapMemberTurns(group: JamiyyaGroup, memberId1: string, memberId2: string): JamiyyaGroup {
  if (memberId1 === memberId2) return group;

  const m1 = group.members.find((m) => m.id === memberId1);
  const m2 = group.members.find((m) => m.id === memberId2);
  if (!m1 || !m2) return group;

  const turn1 = m1.payoutTurn;
  const turn2 = m2.payoutTurn;

  const updatedMembers = group.members.map((m) => {
    if (m.id === memberId1) return { ...m, payoutTurn: turn2 };
    if (m.id === memberId2) return { ...m, payoutTurn: turn1 };
    return m;
  });

  // Re-map recipientMemberId in cycles
  const updatedCycles = group.cycles.map((cycle) => {
    const recipient = updatedMembers.find((m) => m.payoutTurn === cycle.cycleNumber);
    return recipient ? { ...cycle, recipientMemberId: recipient.id } : cycle;
  });

  return {
    ...group,
    members: updatedMembers,
    cycles: updatedCycles,
    updatedAt: Date.now(),
  };
}

/**
 * Re-order member turns in a specific order of member IDs
 */
export function reorderMemberTurns(group: JamiyyaGroup, orderedMemberIds: string[]): JamiyyaGroup {
  const memberMap = new Map(group.members.map((m) => [m.id, m]));

  const updatedMembers = orderedMemberIds
    .map((id, index) => {
      const mem = memberMap.get(id);
      if (!mem) return null;
      return {
        ...mem,
        payoutTurn: index + 1,
      };
    })
    .filter(Boolean) as JamiyyaMember[];

  // Also include any members not in the ordered list (fail-safe)
  const includedIds = new Set(orderedMemberIds);
  let nextTurn = updatedMembers.length + 1;
  for (const m of group.members) {
    if (!includedIds.has(m.id)) {
      updatedMembers.push({ ...m, payoutTurn: nextTurn++ });
    }
  }

  // Update cycles recipient
  const updatedCycles = group.cycles.map((cycle) => {
    const recipient = updatedMembers.find((m) => m.payoutTurn === cycle.cycleNumber);
    return recipient ? { ...cycle, recipientMemberId: recipient.id } : cycle;
  });

  return {
    ...group,
    members: updatedMembers,
    cycles: updatedCycles,
    updatedAt: Date.now(),
  };
}

/**
 * Mark a member's payment for a cycle as paid or unpaid
 */
export function markMemberPayment(
  group: JamiyyaGroup,
  cycleNumber: number,
  memberId: string,
  isPaid: boolean,
  paidDate?: string,
  linkedExpenseId?: string
): JamiyyaGroup {
  const today = formatDateToYmd(new Date());
  const effectivePaidDate = isPaid ? paidDate || today : undefined;

  let found = false;
  const updatedPayments = group.payments.map((p) => {
    if (p.cycleNumber === cycleNumber && p.memberId === memberId) {
      found = true;
      return {
        ...p,
        isPaid,
        paidDate: effectivePaidDate,
        linkedExpenseId: isPaid ? linkedExpenseId || p.linkedExpenseId : undefined,
      };
    }
    return p;
  });

  if (!found) {
    // If not found, add record
    updatedPayments.push({
      memberId,
      cycleNumber,
      isPaid,
      paidDate: effectivePaidDate,
      amountPaid: group.installmentAmount,
      linkedExpenseId: isPaid ? linkedExpenseId : undefined,
    });
  }

  // Check if all payments across all cycles are completed and all payouts received
  const allPaymentsDone = updatedPayments.length > 0 && updatedPayments.every((p) => p.isPaid);
  const allPayoutsDone = group.cycles.every((c) => c.payoutReceived);

  return {
    ...group,
    payments: updatedPayments,
    status: allPaymentsDone && allPayoutsDone && group.status === 'active' ? 'completed' : group.status,
    updatedAt: Date.now(),
  };
}

/**
 * Mark a cycle's pot payout as delivered to the turn recipient
 */
export function markPayoutReceived(
  group: JamiyyaGroup,
  cycleNumber: number,
  payoutReceived: boolean,
  payoutDate?: string,
  linkedIncomeExpenseId?: string
): JamiyyaGroup {
  const today = formatDateToYmd(new Date());
  const effectiveDate = payoutReceived ? payoutDate || today : undefined;

  const cycle = group.cycles.find((c) => c.cycleNumber === cycleNumber);
  const recipientId = cycle?.recipientMemberId;

  const updatedCycles = group.cycles.map((c) => {
    if (c.cycleNumber === cycleNumber) {
      return {
        ...c,
        payoutReceived,
        payoutDate: effectiveDate,
        linkedIncomeExpenseId: payoutReceived ? linkedIncomeExpenseId || c.linkedIncomeExpenseId : undefined,
      };
    }
    return c;
  });

  // Update member hasTakenTurn flag
  const updatedMembers = group.members.map((m) => {
    if (m.id === recipientId) {
      return {
        ...m,
        hasTakenTurn: payoutReceived,
      };
    }
    return m;
  });

  const allPaymentsDone = group.payments.every((p) => p.isPaid);
  const allPayoutsDone = updatedCycles.every((c) => c.payoutReceived);

  return {
    ...group,
    cycles: updatedCycles,
    members: updatedMembers,
    status: allPaymentsDone && allPayoutsDone && group.status === 'active' ? 'completed' : group.status,
    updatedAt: Date.now(),
  };
}

/**
 * Handle a mid-group member change: replacing a member with a new person
 */
export function replaceMember(
  group: JamiyyaGroup,
  oldMemberId: string,
  newMemberData: { name: string; phone?: string; notes?: string }
): JamiyyaGroup {
  const oldMember = group.members.find((m) => m.id === oldMemberId);
  if (!oldMember) return group;

  const newMemberId = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newMember: JamiyyaMember = {
    id: newMemberId,
    name: newMemberData.name.trim(),
    phone: newMemberData.phone?.trim() || undefined,
    payoutTurn: oldMember.payoutTurn,
    isOrganizer: false,
    isCurrentUser: false,
    hasTakenTurn: oldMember.hasTakenTurn,
    notes: newMemberData.notes || `بديل عن ${oldMember.name}`,
  };

  const updatedMembers = group.members.map((m) => (m.id === oldMemberId ? newMember : m));

  // Update cycles recipient
  const updatedCycles = group.cycles.map((c) =>
    c.recipientMemberId === oldMemberId ? { ...c, recipientMemberId: newMemberId } : c
  );

  // Update remaining unpaid payments to new member ID
  const updatedPayments = group.payments.map((p) => {
    if (p.memberId === oldMemberId && !p.isPaid) {
      return { ...p, memberId: newMemberId };
    }
    return p;
  });

  // Record discrepancy
  const discrepancy: JamiyyaDiscrepancy = {
    id: `disc-${Date.now()}`,
    date: formatDateToYmd(new Date()),
    type: 'member_replaced',
    description: `تم استبدال العضو "${oldMember.name}" بالعضو الجديد "${newMember.name}" لاستكمال الأقساط والدور.`,
    affectedMemberId: newMemberId,
    resolved: true,
  };

  return {
    ...group,
    members: updatedMembers,
    cycles: updatedCycles,
    payments: updatedPayments,
    discrepancies: [...(group.discrepancies || []), discrepancy],
    updatedAt: Date.now(),
  };
}

export interface MemberProgressSummary {
  member: JamiyyaMember;
  totalPaid: number;
  totalRemaining: number;
  totalExpected: number;
  paidCyclesCount: number;
  totalCyclesCount: number;
  hasTakenTurn: boolean;
  isCurrentUser: boolean;
  turnDate?: string;
}

export interface JamiyyaProgress {
  currentCycleNumber: number;
  currentCycle: JamiyyaCycle | undefined;
  currentRecipient: JamiyyaMember | undefined;
  collectedForCurrentCycle: number;
  expectedForCurrentCycle: number;
  unpaidMembersForCurrentCycle: JamiyyaMember[];
  paidMembersForCurrentCycle: JamiyyaMember[];
  totalCollectedOverall: number;
  totalExpectedOverall: number;
  completionPercentage: number;
  isFullyCompleted: boolean;
  memberSummaries: MemberProgressSummary[];
  userMember: JamiyyaMember | undefined;
  userInstallmentDueForCurrentCycle: boolean;
  userPayoutCycle: JamiyyaCycle | undefined;
}

/**
 * Calculate comprehensive progress metrics for a Jam'iyya group
 */
export function getJamiyyaProgress(group: JamiyyaGroup): JamiyyaProgress {
  const members = group.members || [];
  const cycles = group.cycles || [];
  const payments = group.payments || [];
  const totalCycles = cycles.length;

  const todayStr = formatDateToYmd(new Date());

  // Determine current active cycle:
  // First cycle that is not fully paid and not received, or the cycle whose due date is closest/upcoming
  let activeCycleNumber = 1;
  const cyclePaymentsMap = new Map<number, JamiyyaPaymentRecord[]>();
  for (const p of payments) {
    const list = cyclePaymentsMap.get(p.cycleNumber) || [];
    list.push(p);
    cyclePaymentsMap.set(p.cycleNumber, list);
  }

  for (let c = 1; c <= totalCycles; c++) {
    const list = cyclePaymentsMap.get(c) || [];
    const cycle = cycles.find((cy) => cy.cycleNumber === c);
    const isCycleAllPaid = list.length >= members.length && list.every((p) => p.isPaid);
    const isPayoutDone = Boolean(cycle?.payoutReceived);

    if (!isCycleAllPaid || !isPayoutDone) {
      activeCycleNumber = c;
      break;
    }
    // If all are completed, stay at last cycle
    activeCycleNumber = totalCycles;
  }

  const currentCycle = cycles.find((c) => c.cycleNumber === activeCycleNumber) || cycles[0];
  const currentRecipient = members.find((m) => m.id === currentCycle?.recipientMemberId);

  const currentCyclePayments = cyclePaymentsMap.get(activeCycleNumber) || [];
  const collectedForCurrentCycle = currentCyclePayments
    .filter((p) => p.isPaid)
    .reduce((sum, p) => sum + (p.amountPaid || group.installmentAmount), 0);

  const expectedForCurrentCycle = group.totalPayout;

  const paidMemberIds = new Set(currentCyclePayments.filter((p) => p.isPaid).map((p) => p.memberId));
  const paidMembersForCurrentCycle = members.filter((m) => paidMemberIds.has(m.id));
  const unpaidMembersForCurrentCycle = members.filter((m) => !paidMemberIds.has(m.id));

  // Overall totals
  const totalCollectedOverall = payments
    .filter((p) => p.isPaid)
    .reduce((sum, p) => sum + (p.amountPaid || group.installmentAmount), 0);
  const totalExpectedOverall = group.installmentAmount * members.length * totalCycles;
  const completionPercentage =
    totalExpectedOverall > 0 ? Math.min(100, Math.round((totalCollectedOverall / totalExpectedOverall) * 100)) : 0;

  const isFullyCompleted =
    group.status === 'completed' ||
    (payments.length > 0 && payments.every((p) => p.isPaid) && cycles.every((c) => c.payoutReceived));

  // Per-member summary
  const memberSummaries: MemberProgressSummary[] = members.map((mem) => {
    const memPayments = payments.filter((p) => p.memberId === mem.id);
    const paidCount = memPayments.filter((p) => p.isPaid).length;
    const totalPaid = paidCount * group.installmentAmount;
    const totalExpected = totalCycles * group.installmentAmount;
    const totalRemaining = Math.max(0, totalExpected - totalPaid);

    const turnCycle = cycles.find((c) => c.cycleNumber === mem.payoutTurn);

    return {
      member: mem,
      totalPaid,
      totalRemaining,
      totalExpected,
      paidCyclesCount: paidCount,
      totalCyclesCount: totalCycles,
      hasTakenTurn: Boolean(turnCycle?.payoutReceived || mem.hasTakenTurn),
      isCurrentUser: Boolean(mem.isCurrentUser),
      turnDate: turnCycle?.dueDate,
    };
  });

  const userMember = members.find((m) => m.isCurrentUser);
  const userInstallmentDueForCurrentCycle = Boolean(
    userMember && !paidMemberIds.has(userMember.id)
  );
  const userPayoutCycle = userMember ? cycles.find((c) => c.cycleNumber === userMember.payoutTurn) : undefined;

  return {
    currentCycleNumber: activeCycleNumber,
    currentCycle,
    currentRecipient,
    collectedForCurrentCycle,
    expectedForCurrentCycle,
    unpaidMembersForCurrentCycle,
    paidMembersForCurrentCycle,
    totalCollectedOverall,
    totalExpectedOverall,
    completionPercentage,
    isFullyCompleted,
    memberSummaries,
    userMember,
    userInstallmentDueForCurrentCycle,
    userPayoutCycle,
  };
}

/**
 * Generate a beautifully formatted shareable WhatsApp message for the Jam'iyya
 */
export function generateJamiyyaShareText(
  group: JamiyyaGroup,
  language: 'ar' | 'en' = 'ar',
  currencySymbol: string = 'ر.س'
): string {
  const isEn = language === 'en';
  const progress = getJamiyyaProgress(group);
  const freqLabel =
    group.frequency === 'weekly'
      ? isEn ? 'Weekly' : 'أسبوعياً'
      : group.frequency === 'biweekly'
      ? isEn ? 'Bi-weekly' : 'كل أسبوعين'
      : isEn ? 'Monthly' : 'شهرياً';

  const lines: string[] = [];

  if (isEn) {
    lines.push(`🪙 *Jam'iyya: ${group.name}*`);
    lines.push(`💰 Total Pot: ${group.totalPayout.toLocaleString()} ${currencySymbol}`);
    lines.push(`💵 Installment per Member: ${group.installmentAmount.toLocaleString()} ${currencySymbol} (${freqLabel})`);
    lines.push(`👥 Members Count: ${group.members.length} | Started: ${group.startDate}`);
    lines.push('');
    lines.push(`📋 *Turn & Payout Schedule:*`);

    // Sorted by turn
    const sortedMembers = [...group.members].sort((a, b) => a.payoutTurn - b.payoutTurn);
    for (const m of sortedMembers) {
      const cycle = group.cycles.find((c) => c.cycleNumber === m.payoutTurn);
      const isCurrent = cycle?.cycleNumber === progress.currentCycleNumber;
      const statusIcon = cycle?.payoutReceived ? '✅' : isCurrent ? '⏳' : '▫️';
      const statusTag = cycle?.payoutReceived ? ' (Received)' : isCurrent ? ' (Current)' : '';
      lines.push(`${statusIcon} Turn ${m.payoutTurn}: ${m.name} - ${cycle?.dueDate || ''}${statusTag}`);
    }

    lines.push('');
    lines.push(`💳 *Current Cycle #${progress.currentCycleNumber}:*`);
    lines.push(`Recipient: ${progress.currentRecipient?.name || 'TBD'}`);
    lines.push(
      `Collected: ${progress.collectedForCurrentCycle.toLocaleString()} / ${progress.expectedForCurrentCycle.toLocaleString()} ${currencySymbol} (${progress.paidMembersForCurrentCycle.length}/${group.members.length} paid)`
    );

    if (progress.unpaidMembersForCurrentCycle.length > 0) {
      lines.push(
        `Pending: ${progress.unpaidMembersForCurrentCycle.map((m) => m.name).join(', ')}`
      );
    } else {
      lines.push(`🎉 All members have paid for this cycle!`);
    }

    if (group.bankAccountInfo) {
      lines.push('');
      lines.push(`🏦 *Payment Details:*`);
      lines.push(group.bankAccountInfo);
    }

    lines.push('');
    lines.push(`✨ Managed with Halala & Qirsh App 🪙`);
  } else {
    lines.push(`🪙 *جدول الجمعية: ${group.name}*`);
    lines.push(`💰 مبلغ القبضة الكامل: ${group.totalPayout.toLocaleString('ar-SA')} ${currencySymbol}`);
    lines.push(`💵 السهم / القسط الدوري: ${group.installmentAmount.toLocaleString('ar-SA')} ${currencySymbol} (${freqLabel})`);
    lines.push(`👥 عدد الأعضاء: ${group.members.length} | تاريخ الانطلاق: ${group.startDate}`);
    lines.push('');
    lines.push(`📋 *جدول أدوار الاستلام:*`);

    const sortedMembers = [...group.members].sort((a, b) => a.payoutTurn - b.payoutTurn);
    for (const m of sortedMembers) {
      const cycle = group.cycles.find((c) => c.cycleNumber === m.payoutTurn);
      const isCurrent = cycle?.cycleNumber === progress.currentCycleNumber;
      const statusIcon = cycle?.payoutReceived ? '✅' : isCurrent ? '⏳' : '▫️';
      const statusTag = cycle?.payoutReceived ? ' (تم الاستلام)' : isCurrent ? ' (الدورة الحالية)' : '';
      lines.push(`${statusIcon} دور ${m.payoutTurn}: ${m.name} - ${cycle?.dueDate || ''}${statusTag}`);
    }

    lines.push('');
    lines.push(`💳 *موقف الدورة الحالية (دور رقم ${progress.currentCycleNumber}):*`);
    lines.push(`المستلم للقبضة: ${progress.currentRecipient?.name || 'غير محدد'}`);
    lines.push(
      `المحصّل: ${progress.collectedForCurrentCycle.toLocaleString('ar-SA')} من ${progress.expectedForCurrentCycle.toLocaleString('ar-SA')} ${currencySymbol} (سدّد ${progress.paidMembersForCurrentCycle.length} من ${group.members.length})`
    );

    if (progress.unpaidMembersForCurrentCycle.length > 0) {
      lines.push(
        `المتبقي عليهم السداد: ${progress.unpaidMembersForCurrentCycle.map((m) => m.name).join('، ')}`
      );
    } else {
      lines.push(`🎉 اكتمل سداد جميع الأعضاء لهذه الدورة!`);
    }

    if (group.bankAccountInfo) {
      lines.push('');
      lines.push(`🏦 *بيانات التحويل والحساب:*`);
      lines.push(group.bankAccountInfo);
    }

    lines.push('');
    lines.push(`🪙 تم الترتيب والمتابعة عبر تطبيق «هللة وقرش»`);
  }

  return lines.join('\n');
}

export interface JamiyyaReminderAlert {
  id: string;
  jamiyyaId: string;
  type: 'installment_due' | 'payout_turn';
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  dueDate: string;
  daysRemaining: number;
}

/**
 * Calculates upcoming Jam'iyya reminders for user's installments and payouts
 */
export function getUpcomingJamiyyaReminders(
  jamiyyas: JamiyyaGroup[],
  leadDays: number = 3,
  currencySymbol: string = 'ر.س'
): JamiyyaReminderAlert[] {
  const alerts: JamiyyaReminderAlert[] = [];
  const todayStr = formatDateToYmd(new Date());

  for (const group of jamiyyas) {
    if (group.status !== 'active') continue;

    const progress = getJamiyyaProgress(group);
    const userMember = progress.userMember;
    if (!userMember) continue;

    // 1. Check user installment due for current cycle
    if (progress.userInstallmentDueForCurrentCycle && progress.currentCycle) {
      const dueDate = progress.currentCycle.dueDate;
      const daysRemaining = Math.round(
        (parseYmdToDate(dueDate).getTime() - parseYmdToDate(todayStr).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysRemaining >= 0 && daysRemaining <= (group.reminderDaysBefore ?? leadDays)) {
        const timeTextAr =
          daysRemaining === 0 ? 'اليوم' : daysRemaining === 1 ? 'غداً' : `خلال ${daysRemaining} أيام`;
        const timeTextEn =
          daysRemaining === 0 ? 'today' : daysRemaining === 1 ? 'tomorrow' : `in ${daysRemaining} days`;

        alerts.push({
          id: `jam-inst-${group.id}-${progress.currentCycleNumber}`,
          jamiyyaId: group.id,
          type: 'installment_due',
          titleAr: `قسط جمعية مستحق: ${group.name}`,
          titleEn: `Jam'iyya Installment Due: ${group.name}`,
          bodyAr: `موعد سداد قسط ${group.name} بقيمة ${group.installmentAmount} ${currencySymbol} مستحق ${timeTextAr}.`,
          bodyEn: `Your ${group.name} installment of ${group.installmentAmount} ${currencySymbol} is due ${timeTextEn}.`,
          dueDate,
          daysRemaining,
        });
      }
    }

    // 2. Check if user has an upcoming pot payout turn
    if (progress.userPayoutCycle && !progress.userPayoutCycle.payoutReceived) {
      const payoutDueDate = progress.userPayoutCycle.dueDate;
      const daysRemaining = Math.round(
        (parseYmdToDate(payoutDueDate).getTime() - parseYmdToDate(todayStr).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysRemaining >= 0 && daysRemaining <= 7) {
        const timeTextAr =
          daysRemaining === 0 ? 'اليوم!' : daysRemaining === 1 ? 'غداً' : `خلال ${daysRemaining} أيام`;
        const timeTextEn =
          daysRemaining === 0 ? 'today!' : daysRemaining === 1 ? 'tomorrow' : `in ${daysRemaining} days`;

        alerts.push({
          id: `jam-payout-${group.id}-${progress.userPayoutCycle.cycleNumber}`,
          jamiyyaId: group.id,
          type: 'payout_turn',
          titleAr: `🎉 اقترب دورك في قبض الجمعية: ${group.name}!`,
          titleEn: `🎉 Your Jam'iyya Payout is Near: ${group.name}!`,
          bodyAr: `حان موعد استلامك لمبلغ القبضة بالكامل (${group.totalPayout} ${currencySymbol}) ${timeTextAr}.`,
          bodyEn: `It is your turn to receive the full pot of ${group.totalPayout} ${currencySymbol} ${timeTextEn}.`,
          dueDate: payoutDueDate,
          daysRemaining,
        });
      }
    }
  }

  alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
  return alerts;
}
