'use client';

import BillingListPage from './bill-list';
import BillingForm from './billing-form';

interface Props {
  mode: 'bill' | 'details';
  siteId: string; // ✅ URL uuid (MainSite.siteId)
}

export default function BillingSwitcher({ mode, siteId }: Props) {
  if (mode === 'details') {
    return <BillingListPage />;
  }

  return <BillingForm siteId={siteId} />;
}