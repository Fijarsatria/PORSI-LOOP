import type { FinanceMethod, FinanceReport, FinanceTotals, OutletFinance } from '../domain';
import type { StoreState } from './engine';

const emptyTotals = (): FinanceTotals => ({
  normalSales: 0, promoSales: 0, grossSales: 0, grossPayments: 0,
  refunds: 0, refundPending: 0, netPayments: 0, awaitingPayment: 0,
  servedPortions: 0, completedOrders: 0, orders: 0, walkinPortions: 0, walkinRevenue: 0,
});
const methodRow = (rows: FinanceMethod[], method: FinanceMethod['method']) => {
  let row = rows.find(item => item.method === method);
  if (!row) {
    row = { method, grossPayments: 0, refunds: 0, refundPending: 0, netPayments: 0 };
    rows.push(row);
  }
  return row;
};

export function summarizeFinance(states: readonly StoreState[]): FinanceReport {
  const groups = new Map<string, OutletFinance>();
  for (const state of states) {
    const outletId = state.menu.outletId ?? state.menu.outlet;
    const outlet = groups.get(outletId) ?? {
      ...emptyTotals(), outletId, outletName: state.menu.outlet, menuCount: 0,
      businessDates: [], paymentMethods: [],
    };
    outlet.menuCount++;
    if (!outlet.businessDates.includes(state.businessDate)) outlet.businessDates.push(state.businessDate);
    outlet.walkinPortions += state.walkin;
    outlet.walkinRevenue += state.walkinRevenue;
    outlet.normalSales += state.walkinRevenue;
    outlet.grossPayments += state.walkinRevenue;
    outlet.servedPortions += state.walkin;
    if (state.walkinRevenue) methodRow(outlet.paymentMethods, 'walk_in').grossPayments += state.walkinRevenue;

    for (const ticket of [...state.orders, ...state.claims]) {
      const amount = ticket.price * ticket.quantity;
      outlet.orders++;
      if (ticket.status === 'picked_up') {
        if ('batchId' in ticket) outlet.promoSales += amount;
        else outlet.normalSales += amount;
        outlet.servedPortions += ticket.quantity;
        outlet.completedOrders++;
      }
      if (ticket.paymentStatus === 'pending' && ticket.status === 'pending_payment') outlet.awaitingPayment += amount;
      if (!['paid', 'refunded', 'refund_pending'].includes(ticket.paymentStatus ?? '')) continue;
      const method = methodRow(outlet.paymentMethods, ticket.paymentMethod ?? 'unrecorded');
      outlet.grossPayments += amount;
      method.grossPayments += amount;
      if (ticket.paymentStatus === 'refunded') {
        outlet.refunds += amount;
        method.refunds += amount;
      }
      if (ticket.paymentStatus === 'refund_pending') {
        outlet.refundPending += amount;
        method.refundPending += amount;
      }
    }
    groups.set(outletId, outlet);
  }

  const totals = emptyTotals();
  const paymentMethods: FinanceMethod[] = [];
  const outlets = [...groups.values()];
  for (const outlet of outlets) {
    outlet.grossSales = outlet.normalSales + outlet.promoSales;
    outlet.netPayments = outlet.grossPayments - outlet.refunds;
    outlet.businessDates.sort();
    for (const key of Object.keys(totals) as (keyof FinanceTotals)[]) totals[key] += outlet[key];
    for (const method of outlet.paymentMethods) {
      method.netPayments = method.grossPayments - method.refunds;
      const aggregate = methodRow(paymentMethods, method.method);
      aggregate.grossPayments += method.grossPayments;
      aggregate.refunds += method.refunds;
      aggregate.refundPending += method.refundPending;
      aggregate.netPayments += method.netPayments;
    }
  }
  return {
    ...totals, scope: 'current_sessions', outlets, paymentMethods,
    businessDates: [...new Set(outlets.flatMap(outlet => outlet.businessDates))].sort(),
  };
}
