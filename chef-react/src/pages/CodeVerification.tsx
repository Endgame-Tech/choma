import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Shield, Clock, ArrowLeft, RefreshCw } from 'lucide-react'
import logo from '../assets/logo.svg'
import chefBgImage from '../assets/chefsingin.jpg'

const CodeVerification: React.FC = () => {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes in seconds
  const [canResend, setCanResend] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [attemptsRemaining, setAttemptsRemaining] = useState(5)
  
  const navigate = useNavigate()
  const location = useLocation()
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  
  const email = location.state?.email

  // Redirect if no email provided
  useEffect(() => {
    if (!email) {
      navigate('/register')
    }
  }, [email, navigate])

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [timeLeft])

  // Resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [resendCooldown])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return // Prevent multiple characters
    
    const newCode = [...code]
    newCode[index] = value

    setCode(newCode)
    setError('')

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all fields are filled
    if (newCode.every(digit => digit) && newCode.join('').length === 6) {
      handleVerifyCode(newCode.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    
    if (pastedText.length === 6) {
      const newCode = pastedText.split('')
      setCode(newCode)
      handleVerifyCode(pastedText)
    }
  }

  const handleVerifyCode = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join('')
    
    if (codeToVerify.length !== 6) {
      setError('Please enter all 6 digits')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          verificationCode: codeToVerify,
          purpose: 'chef_registration'
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Email verified successfully!')
        // Navigate to full registration form
        setTimeout(() => {
          navigate('/register/complete', { 
            state: { 
              email, 
              verificationToken: data.data.token,
              verified: true 
            }
          })
        }, 1000)
      } else {
        setError(data.message || 'Invalid verification code')
        setAttemptsRemaining(data.attemptsRemaining || 0)
        
        // Clear the code on error
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch (error) {
      console.error('Verify code error:', error)
      setError('Failed to verify code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!canResend || resendCooldown > 0) return

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          purpose: 'chef_registration'
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('New verification code sent!')
        setTimeLeft(600) // Reset timer
        setResendCooldown(60) // 1 minute cooldown
        setCanResend(false)
        setAttemptsRemaining(5) // Reset attempts
        setCode(['', '', '', '', '', '']) // Clear current code
        inputRefs.current[0]?.focus()
      } else {
        setError(data.message || 'Failed to resend code')
        if (data.retryAfter) {
          setResendCooldown(data.retryAfter)
        }
      }
    } catch (error) {
      console.error('Resend code error:', error)
      setError('Failed to resend code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!email) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-[0_0_35%] flex flex-col justify-center px-8 sm:px-12 lg:px-16 bg-white">
        <div className="w-full max-w-md mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate('/register')}
            className="flex items-center text-orange-600 hover:text-orange-700 mb-8 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back
          </button>

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-3 rounded-2xl shadow-lg">
              <img src={logo} alt="Choma Logo" className="w-8 h-8" />
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Enter Verification Code</h1>
            <p className="text-gray-600 mb-1">
              We sent a 6-digit code to
            </p>
            <p className="text-orange-600 font-medium">{email}</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <div className="text-red-400 mr-3">⚠️</div>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <div className="text-green-400 mr-3">✅</div>
                <p className="text-green-700 text-sm">{success}</p>
              </div>
            </div>
          )}

          {/* Code Input */}
          <div className="mb-6">
            <div className="flex justify-center space-x-3 mb-4">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => inputRefs.current[index] = el}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-colors"
                  disabled={isLoading}
                />
              ))}
            </div>

            {/* Timer */}
            <div className="text-center text-sm text-gray-600 mb-4">
              <Clock className="inline w-4 h-4 mr-1" />
              {timeLeft > 0 ? (
                <span>Code expires in {formatTime(timeLeft)}</span>
              ) : (
                <span className="text-red-600">Code has expired</span>
              )}
            </div>

            {/* Attempts Remaining */}
            {attemptsRemaining < 5 && attemptsRemaining > 0 && (
              <div className="text-center text-sm text-orange-600 mb-4">
                {attemptsRemaining} attempts remaining
              </div>
            )}
          </div>

          {/* Manual Verify Button */}
          <button
            onClick={() => handleVerifyCode()}
            disabled={isLoading || code.join('').length !== 6}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg mb-4"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Verifying...
              </div>
            ) : (
              'Verify Code'
            )}
          </button>

          {/* Resend Code */}
          <div className="text-center mb-8">
            <p className="text-sm text-gray-600 mb-2">
              Didn't receive the code?
            </p>
            <button
              onClick={handleResendCode}
              disabled={!canResend || resendCooldown > 0 || isLoading}
              className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              {resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                'Resend Code'
              )}
            </button>
          </div>

          {/* Help Text */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-sm text-orange-700">
              <p className="font-medium mb-1">Having trouble?</p>
              <ul className="space-y-1">
                <li>• Check your spam/junk folder</li>
                <li>• Make sure you entered the correct email</li>
                <li>• Code expires in 10 minutes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:flex flex-[0_0_65%] relative">
        <div 
          className="w-full bg-cover bg-center relative"
          style={{ backgroundImage: `url(${chefBgImage})` }}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60 flex items-end">
            <div className="p-12 text-white">
              <h2 className="text-4xl font-bold mb-4 leading-tight">
                Almost there! Let's verify your email.
              </h2>
              <p className="text-lg opacity-90 leading-relaxed">
                We've sent a verification code to your email. 
                Enter it here to continue your chef registration.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CodeVerification