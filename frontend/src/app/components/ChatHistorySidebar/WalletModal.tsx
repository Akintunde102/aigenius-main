import React from "react";
import AddToWallet from "../modals/AddToWallet";
import { clearUserDetailsCache } from "@/lib/calls/get-logged-user-details";
import { WalletPaymentSuccessOptions } from "@/lib/wallet-payment-return";

interface WalletModalProps {
    showWalletModal: boolean;
    setShowWalletModal: (show: boolean) => void;
    onWalletUpdate?: (amountInNaira?: string, newWalletBalance?: number | null) => Promise<void>;
    paymentModalLoading: boolean;
    setPaymentModalLoading: (loading: boolean) => void;
}

const WalletModal: React.FC<WalletModalProps> = ({
    showWalletModal,
    setShowWalletModal,
    onWalletUpdate,
    paymentModalLoading,
    setPaymentModalLoading,
}) => {
    // Handler for successful payment - refresh wallet and close modal
    const handlePaymentSuccess = async (
        amountInNaira: string,
        newWalletBalance?: number | null,
        options?: WalletPaymentSuccessOptions,
    ) => {
        clearUserDetailsCache();

        if (!options?.keepModalOpen) {
            setShowWalletModal(false);
        }

        if (onWalletUpdate) {
            void onWalletUpdate(amountInNaira, newWalletBalance);
        }
    };

    if (!showWalletModal) return null;

    return (
        <AddToWallet
            closeModal={() => setShowWalletModal(false)}
            onSuccessfulPayment={handlePaymentSuccess}
            onClosingPaymentModal={() => setPaymentModalLoading(false)}
            paymentModalLoading={paymentModalLoading}
        />
    );
};

export default WalletModal;
