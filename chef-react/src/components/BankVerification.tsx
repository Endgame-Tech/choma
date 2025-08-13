import React, { useState, useEffect } from 'react'
import api from '../services/api'

interface Bank {
  name: string
  code: string
}

interface BanksApiResponse {
  success: boolean
  data: Bank[]
  message?: string
}

interface VerificationApiResponse {
  success: boolean
  data: {
    account_name: string
    account_number: string
    bank_name: string
    bank_code: string
  }
  message?: string
}

interface BankVerificationProps {
  formData: {
    bankDetails: {
      accountName: string
      accountNumber: string
      bankName: string
      bankCode: string
      bvn: string
      isVerified: boolean
      recipientCode?: string
    }
  }
  onUpdate: (bankDetails: any) => void
}

const BankVerification: React.FC<BankVerificationProps> = ({ formData, onUpdate }) => {
  const [banks, setBanks] = useState<Bank[]>([])
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [verificationSuccess, setVerificationSuccess] = useState(false)
  const [loadingBanks, setLoadingBanks] = useState(true)

  // Load Nigerian banks on component mount
  useEffect(() => {
    fetchBanks()
  }, [])

  const fetchBanks = async () => {
    try {
      setLoadingBanks(true)
      const response = await api.get('/api/chef/banks')
      const responseData = response.data as BanksApiResponse
      
      if (responseData.success) {
        setBanks(responseData.data)
      } else {
        console.error('Failed to fetch banks:', responseData.message)
      }
    } catch (error) {
      console.error('Error fetching banks:', error)
    } finally {
      setLoadingBanks(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    const updatedBankDetails = {
      ...formData.bankDetails,
      [field]: value
    }

    // Reset verification when account number or bank changes
    if (field === 'accountNumber' || field === 'bankCode') {
      updatedBankDetails.isVerified = false
      updatedBankDetails.accountName = ''
      setVerificationSuccess(false)
      setVerificationError(null)
    }

    // Update bank name when bank code changes
    if (field === 'bankCode') {
      const selectedBank = banks.find(bank => bank.code === value)
      updatedBankDetails.bankName = selectedBank ? selectedBank.name : ''
    }

    onUpdate(updatedBankDetails)
  }

  const handleAccountNumberChange = (value: string) => {
    // Only allow numbers and limit to 10 digits
    const cleanValue = value.replace(/\D/g, '').slice(0, 10)
    handleInputChange('accountNumber', cleanValue)
  }

  const handleBVNChange = (value: string) => {
    // Only allow numbers and limit to 11 digits
    const cleanValue = value.replace(/\D/g, '').slice(0, 11)
    handleInputChange('bvn', cleanValue)
  }

  const verifyBankAccount = async () => {
    if (!formData.bankDetails.accountNumber || !formData.bankDetails.bankCode) {
      setVerificationError('Please enter account number and select a bank')
      return
    }

    if (formData.bankDetails.accountNumber.length !== 10) {
      setVerificationError('Account number must be exactly 10 digits')
      return
    }

    try {
      setIsVerifying(true)
      setVerificationError(null)

      const response = await api.post('/api/chef/verify-bank-account', {
        accountNumber: formData.bankDetails.accountNumber,
        bankCode: formData.bankDetails.bankCode
      })

      const responseData = response.data as VerificationApiResponse

      if (responseData.success) {
        const verifiedData = responseData.data
        
        onUpdate({
          ...formData.bankDetails,
          accountName: verifiedData.account_name,
          bankName: verifiedData.bank_name,
          isVerified: true
        })

        setVerificationSuccess(true)
        setVerificationError(null)
      } else {
        setVerificationError(responseData.message || 'Account verification failed')
        setVerificationSuccess(false)
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Verification service temporarily unavailable'
      setVerificationError(errorMessage)
      setVerificationSuccess(false)
    } finally {
      setIsVerifying(false)
    }
  }

  const canVerify = formData.bankDetails.accountNumber.length === 10 && 
                   formData.bankDetails.bankCode && 
                   !formData.bankDetails.isVerified

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <h4 className="text-lg font-medium text-green-900 mb-3">Bank Details *</h4>
      <p className="text-sm text-green-700 mb-4">
        This information is required for payment processing. We'll verify your account details with your bank.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bank Selection */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Bank *</label>
          {loadingBanks ? (
            <div className="animate-pulse bg-gray-200 h-10 rounded-md"></div>
          ) : (
            <select
              value={formData.bankDetails.bankCode}
              onChange={(e) => handleInputChange('bankCode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
              required
              title="Select your bank from the list"
            >
              <option value="">Choose your bank</option>
              {banks.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Account Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Account Number *</label>
          <input
            type="text"
            value={formData.bankDetails.accountNumber}
            onChange={(e) => handleAccountNumberChange(e.target.value)}
            placeholder="1234567890"
            maxLength={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Must be exactly 10 digits</p>
        </div>

        {/* Verify Button */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={verifyBankAccount}
            disabled={!canVerify || isVerifying}
            className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
              canVerify && !isVerifying
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isVerifying ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Verifying...
              </div>
            ) : (
              'Verify Account'
            )}
          </button>
        </div>

        {/* Account Name (Auto-populated after verification) */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
          <input
            type="text"
            value={formData.bankDetails.accountName}
            readOnly
            placeholder="Account name will appear here after verification"
            className={`w-full px-3 py-2 border rounded-md ${
              formData.bankDetails.isVerified
                ? 'bg-green-50 border-green-300 text-green-800'
                : 'bg-gray-100 border-gray-300 text-gray-500'
            }`}
          />
          {formData.bankDetails.isVerified && (
            <div className="flex items-center mt-2 text-green-600">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Account verified successfully</span>
            </div>
          )}
        </div>

        {/* BVN (Optional) */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            BVN (Bank Verification Number) - Optional
          </label>
          <input
            type="text"
            value={formData.bankDetails.bvn}
            onChange={(e) => handleBVNChange(e.target.value)}
            placeholder="12345678901"
            maxLength={11}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
          />
          <p className="text-xs text-gray-500 mt-1">
            BVN must be exactly 11 digits (optional field)
          </p>
          {formData.bankDetails.bvn && formData.bankDetails.bvn.length !== 11 && (
            <p className="text-xs text-red-500 mt-1">
              BVN must be exactly 11 digits
            </p>
          )}
        </div>
      </div>

      {/* Error Message */}
      {verificationError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center text-red-800">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">{verificationError}</span>
          </div>
        </div>
      )}

      {/* Success Message */}
      {verificationSuccess && !verificationError && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center text-green-800">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">
              Bank account verified! Account belongs to {formData.bankDetails.accountName}
            </span>
          </div>
        </div>
      )}

      {/* Verification Required Notice */}
      {!formData.bankDetails.isVerified && formData.bankDetails.accountNumber && formData.bankDetails.bankCode && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center text-yellow-800">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">
              Please verify your bank account to continue with registration
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default BankVerification