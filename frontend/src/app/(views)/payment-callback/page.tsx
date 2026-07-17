import { Suspense } from 'react';
import PaymentCallbackClient, { PaymentCallbackLoadingView } from './PaymentCallbackClient';

export default function PaymentCallbackPage() {
    return (
        <Suspense fallback={<PaymentCallbackLoadingView />}>
            <PaymentCallbackClient />
        </Suspense>
    );
}
