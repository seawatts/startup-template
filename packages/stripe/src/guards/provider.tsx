'use client';

import { createContext, type ReactNode, useContext } from 'react';
import type {
  EntitlementKey,
  EntitlementsRecord,
  SubscriptionInfo,
} from './entitlement-types';

interface StripeContextType {
  subscriptionInfo: SubscriptionInfo;
  entitlements: EntitlementsRecord;
  loading: boolean;
  checkEntitlement: (entitlement: EntitlementKey) => boolean;
}

export const noSubscription: SubscriptionInfo = {
  customerId: null,
  hasAny: false,
  isActive: false,
  isCanceled: false,
  isPaid: false,
  isPastDue: false,
  isTrialing: false,
  status: null,
};

export const StripeContext = createContext<StripeContextType | undefined>(
  undefined,
);

// Holds what the app already read; it fetches nothing itself. The app reads
// `billing.access` (an oRPC GET) with React Query and passes the answer in,
// so this package stays free of server code and of the API client.
export function StripeProvider({
  children,
  entitlements,
  loading,
  subscriptionInfo,
}: {
  children: ReactNode;
  entitlements?: EntitlementsRecord;
  loading: boolean;
  subscriptionInfo?: SubscriptionInfo;
}) {
  const granted = entitlements ?? ({} as EntitlementsRecord);
  return (
    <StripeContext.Provider
      value={{
        checkEntitlement: (entitlement) => granted[entitlement] || false,
        entitlements: granted,
        loading,
        subscriptionInfo: subscriptionInfo ?? noSubscription,
      }}
    >
      {children}
    </StripeContext.Provider>
  );
}

export function useStripe() {
  const context = useContext(StripeContext);
  if (context === undefined) {
    throw new Error('useStripe must be used within a StripeProvider');
  }
  return context;
}
