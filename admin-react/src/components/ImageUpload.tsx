import React, { useState, useRef } from 'react'
import { uploadFile } from '../services/api'

interface ImageUploadProps {
  currentImageUrl?: string
  onImageUpload: (imageUrl: string) => void
  className?: string
  accept?: string
  maxSizeMB?: number
  disabled?: boolean
  label?: string
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImageUrl,
  onImageUpload,
  className = '',
  accept = 'image/*',
  maxSizeMB = 5,
  disabled = false,
  label = 'Upload Image'
}) => {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxSizeMB) {
      setError(`File size must be less than ${maxSizeMB}MB`)
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload file
    await handleUpload(file)
  }

  const handleUpload = async (file: File) => {
    try {
      setUploading(true)
      setError(null)

      const formData = new FormData()
      formData.append('image', file)

      const response = await uploadFile('/upload/banner-image', formData)

      if (response.success) {
        onImageUpload(response.imageUrl || '')
        setPreviewUrl(response.imageUrl || '')
      } else {
        throw new Error(response.message || 'Upload failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setPreviewUrl(currentImageUrl || null)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreviewUrl(null)
    onImageUpload('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Upload Area */}
      <div
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
          ${disabled || uploading
            ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 cursor-not-allowed'
            : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-700'
          }
          ${error ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : ''}
        `}
      >
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-40 max-w-full mx-auto rounded-lg object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-opacity rounded-lg flex items-center justify-center">
              <div className="opacity-0 hover:opacity-100 transition-opacity">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8">
            {uploading ? (
              <div className="space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Uploading...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-indigo-600 dark:text-indigo-400">{label}</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    PNG, JPG, GIF up to {maxSizeMB}MB
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-2">
          {error}
        </div>
      )}

      {/* Actions */}
      {previewUrl && !uploading && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            className="flex-1 bg-indigo-600 text-white text-sm px-3 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Change Image
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="bg-red-600 text-white text-sm px-3 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}

export default ImageUpload