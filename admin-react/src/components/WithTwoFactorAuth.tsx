import React, { useState } from 'react';
import TwoFactorModal from './TwoFactorModal';
import { TwoFactorEnforcementService, SensitiveOperation } from '../services/twoFactorEnforcement';
import { TwoFactorVerificationResponse } from '../types/twoFactor';

interface WithTwoFactorAuthProps {
  operation: SensitiveOperation;
  onVerified: (verificationData?: TwoFactorVerificationResponse['data']) => Promise<void>;
  children: (props: {
    executeWithVerification: () => Promise<void>;
    isVerifying: boolean;
  }) => React.ReactNode;
  customTitle?: string;
  customDescription?: string;
}

const WithTwoFactorAuth: React.FC<WithTwoFactorAuthProps> = ({
  operation,
  onVerified,
  children,
  customTitle,
  customDescription
}) => {
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingExecution, setPendingExecution] = useState<((verificationData?: TwoFactorVerificationResponse['data']) => Promise<void>) | null>(null);

  const executeWithVerification = async () => {
    setIsVerifying(true);

    try {
      // Check if 2FA enforcement is required for this operation
      const { required, reason, metadata } = await TwoFactorEnforcementService.shouldEnforce2FA(operation);

      if (!required) {
        console.log(`2FA not required for ${operation}: ${reason}`);
        // Execute the operation directly
        await onVerified();
        return;
      }

      console.log(`2FA required for ${operation} (${metadata.riskLevel} risk)`);
      
      // Store the operation to execute after verification
      setPendingExecution(() => onVerified);
      setShowTwoFactorModal(true);
    } catch (error) {
      console.error('Error checking 2FA requirements:', error);
      // On error, show 2FA modal to be safe
      setPendingExecution(() => onVerified);
      setShowTwoFactorModal(true);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTwoFactorVerified = async (verified: boolean, verificationData?: TwoFactorVerificationResponse['data']) => {
    if (verified && pendingExecution) {
      try {
        // Mark verification as complete for this operation type
        TwoFactorEnforcementService.markVerificationComplete(operation);
        
        // Execute the pending operation
        await pendingExecution(verificationData);
      } catch (error) {
        console.error('Error executing operation after 2FA verification:', error);
        throw error;
      } finally {
        setPendingExecution(null);
      }
    }
  };

  const handleTwoFactorClose = () => {
    setShowTwoFactorModal(false);
    setPendingExecution(null);
  };

  const operationMetadata = TwoFactorEnforcementService.getOperationMetadata(operation);

  return (
    <>
      {children({ executeWithVerification, isVerifying })}
      
      {showTwoFactorModal && (
        <TwoFactorModal
          isOpen={showTwoFactorModal}
          onClose={handleTwoFactorClose}
          onVerified={handleTwoFactorVerified}
          title={customTitle || "Security Verification Required"}
          description={customDescription || "This is a sensitive operation that requires verification."}
          actionDescription={operationMetadata.description}
          allowBackupCodes={true}
          allowTrustDevice={false} // Don't trust device for sensitive operations
        />
      )}
    </>
  );
};

export default WithTwoFactorAuth;