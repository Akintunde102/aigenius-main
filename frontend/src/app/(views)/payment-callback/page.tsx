import { Suspense } from 'react';
import PaymentCallbackClient from './PaymentCallbackClient';

function PaymentCallbackFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Processing payment...</p>
            </div>
        </div>
    );
}

export default function PaymentCallbackPage() {
    return (
        <Suspense fallback={<PaymentCallbackFallback />}>
            <PaymentCallbackClient />
        </Suspense>
    );
}
