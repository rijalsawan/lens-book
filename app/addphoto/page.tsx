'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Camera, 
    MapPin, 
    Type,
    MinusCircle,
    ArrowLeft,
    Loader2,
    Users,
    ChevronDown,
    FileImage
} from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import toast from 'react-hot-toast'

export default function AddPhotoPage() {
    const { user: clerkUser } = useUser()
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [preview, setPreview] = useState<string | null>(null)
    const [uploadProgress, setUploadProgress] = useState<string>('')
    const [compressionProgress, setCompressionProgress] = useState<number>(0)
    const [step, setStep] = useState<'upload' | 'details'>('upload')
    const [photoDetails, setPhotoDetails] = useState({
        title: '',
        description: '',
        location: '',
        tags: '',
        isPrivate: false
    })
    const [dragActive, setDragActive] = useState(false)
    const [originalFileSize, setOriginalFileSize] = useState<number | null>(null)
    const router = useRouter()

    // Image compression function
    const compressImage = (file: File, maxSizeKB: number = 10240): Promise<File> => {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }
            
            img.onload = () => {
                try {
                    // Calculate new dimensions maintaining aspect ratio
                    const maxWidth = 1920;
                    const maxHeight = 1920;
                    let { width, height } = img;
                    
                    if (width > height) {
                        if (width > maxWidth) {
                            height = (height * maxWidth) / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = (width * maxHeight) / height;
                            height = maxHeight;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw image on canvas
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Start with high quality and reduce until file size is acceptable
                    let quality = 0.9;
                    let attempts = 0;
                    const maxAttempts = 10;
                    
                    const tryCompress = () => {
                        attempts++;
                        setCompressionProgress((attempts / maxAttempts) * 100);
                        
                        canvas.toBlob((blob) => {
                            if (blob) {
                                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                                    type: 'image/jpeg',
                                    lastModified: Date.now()
                                });
                                
                                if (compressedFile.size <= maxSizeKB * 1024 || quality <= 0.1 || attempts >= maxAttempts) {
                                    setCompressionProgress(100);
                                    resolve(compressedFile);
                                } else {
                                    quality -= 0.1;
                                    setTimeout(tryCompress, 100); // Small delay for UI updates
                                }
                            } else {
                                reject(new Error('Failed to create blob'));
                            }
                        }, 'image/jpeg', quality);
                    };
                    
                    tryCompress();
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            
            img.src = URL.createObjectURL(file);
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            handleFile(selectedFile)
        }
    }

    const handleFile = async (selectedFile: File) => {
        if (!selectedFile.type.startsWith('image/')) {
            toast.error('Please select a valid image file')
            return
        }

        setOriginalFileSize(selectedFile.size)
        let processedFile = selectedFile

        // Show compression progress for large files
        if (selectedFile.size > 10 * 1024 * 1024) {
            setUploadProgress('Compressing image...')
            setCompressionProgress(0)
            
            try {
                processedFile = await compressImage(selectedFile)
                
                // Show compression results
                const originalSizeMB = (selectedFile.size / 1024 / 1024).toFixed(1)
                const compressedSizeMB = (processedFile.size / 1024 / 1024).toFixed(1)
                const compressionRatio = ((1 - processedFile.size / selectedFile.size) * 100).toFixed(0)
                
                toast.success(
                    `Image compressed successfully!\n${originalSizeMB}MB → ${compressedSizeMB}MB (${compressionRatio}% reduction)`,
                    { duration: 4000 }
                )
            } catch (error) {
                console.error('Compression error:', error)
                toast.error('Failed to compress image. Please try a different image.')
                setUploadProgress('')
                setCompressionProgress(0)
                return
            }
            
            setUploadProgress('')
            setCompressionProgress(0)
        } else if (selectedFile.size > 5 * 1024 * 1024) {
            // Optional compression for files 5-10MB
            const shouldCompress = confirm(
                `This image is ${(selectedFile.size / 1024 / 1024).toFixed(1)}MB. Would you like to compress it for faster upload?`
            )
            
            if (shouldCompress) {
                setUploadProgress('Compressing image...')
                setCompressionProgress(0)
                
                try {
                    processedFile = await compressImage(selectedFile)
                    const originalSizeMB = (selectedFile.size / 1024 / 1024).toFixed(1)
                    const compressedSizeMB = (processedFile.size / 1024 / 1024).toFixed(1)
                    
                    toast.success(`Image compressed: ${originalSizeMB}MB → ${compressedSizeMB}MB`)
                } catch (error) {
                    console.error('Compression error:', error)
                    toast.error('Compression failed, using original image')
                    processedFile = selectedFile
                }
                
                setUploadProgress('')
                setCompressionProgress(0)
            }
        }

        setFile(processedFile)
        const reader = new FileReader()
        reader.onload = () => setPreview(reader.result as string)
        reader.readAsDataURL(processedFile)
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0])
        }
    }

    const handleNext = () => {
        if (!file) {
            toast.error('Please select a photo first')
            return
        }
        setStep('details')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return

        setUploading(true)
        setUploadProgress('Uploading to cloud...')
        
        try {
            const formData = new FormData()
            formData.append('file', file)

            const cloudinaryResponse = await fetch('/api/addphotocloud', {
                method: 'POST',
                body: formData,
            })

            if (!cloudinaryResponse.ok) {
                throw new Error('Failed to upload to Cloudinary')
            }

            const cloudinaryData = await cloudinaryResponse.json()
            setUploadProgress('Saving to database...')

            const dbResponse = await fetch('/api/addPhoto', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    url: cloudinaryData.url,
                    title: photoDetails.title,
                    description: photoDetails.description,
                    location: photoDetails.location,
                    tags: photoDetails.tags,
                    isPrivate: photoDetails.isPrivate
                }),
            })

            if (!dbResponse.ok) {
                throw new Error('Failed to save to database')
            }

            setUploadProgress('Complete!')
            toast.success('Photo shared successfully!')
            
            // Reset form
            setFile(null)
            setPreview(null)
            setOriginalFileSize(null)
            setPhotoDetails({
                title: '',
                description: '',
                location: '',
                tags: '',
                isPrivate: false
            })
            setStep('upload')

            setTimeout(() => {
                router.push('/')
            }, 1500)

        } catch (error) {
            console.error('Error uploading photo:', error)
            toast.error('Failed to share photo')
        } finally {
            setTimeout(() => {
                setUploading(false)
                setUploadProgress('')
            }, 2000)
        }
    }

    const handleRemoveFile = () => {
        setFile(null)
        setPreview(null)
        setOriginalFileSize(null)
        setStep('upload')
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Instagram-style Header */}
            <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center">
                        <button
                            onClick={() => router.push('/')}
                            className="p-2"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-lg font-semibold ml-2">
                            {step === 'upload' ? 'New Post' : 'Share'}
                        </h1>
                    </div>
                    {step === 'details' && (
                        <button
                            onClick={handleSubmit}
                            disabled={!file || uploading}
                            className="text-blue-500 font-semibold disabled:opacity-50"
                        >
                            {uploading ? 'Sharing...' : 'Share'}
                        </button>
                    )}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {step === 'upload' && (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-screen"
                    >
                        {!preview ? (
                            <div className="flex flex-col items-center justify-center mt-20 px-6">
                                <div
                                    className={`w-full max-w-sm aspect-square border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                                        dragActive 
                                            ? 'border-blue-500 bg-blue-50' 
                                            : 'border-gray-300'
                                    }`}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                >
                                    <div className="flex flex-col items-center justify-center h-full space-y-4">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                            <Camera className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="text-xl font-light text-gray-900 mb-2">
                                                Share a photo
                                            </p>
                                            <p className="text-gray-500 text-sm mb-2">
                                                Select from your gallery
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                Large images will be automatically compressed
                                            </p>
                                        </div>
                                        <label className="cursor-pointer">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                            <div className="bg-blue-500 text-white px-8 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors">
                                                Select Photo
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col lg:w-1/2 lg:mx-auto max-sm:my-10 lg:my-24">
                                {/* Image Preview */}
                                <div className="lg:w-50 lg:mx-auto bg-black flex items-center justify-center relative">
                                    <div className="relative w-full h-full max-w-md max-h-96">
                                        <img
                                            src={preview || ''}
                                            alt="Preview"
                                            className="w-full h-full object-contain"
                                        />
                                        
                                        {/* File size info */}
                                        {file && (
                                            <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                                <FileImage className="w-3 h-3" />
                                                <span>{formatFileSize(file.size)}</span>
                                                {originalFileSize && originalFileSize !== file.size && (
                                                    <span className="text-green-400">
                                                        (compressed from {formatFileSize(originalFileSize)})
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Bottom Actions */}
                                <div className="bg-white p-4 border-t border-gray-200">
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleRemoveFile}
                                            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium"
                                        >
                                            Choose Different
                                        </button>
                                        <button
                                            onClick={handleNext}
                                            className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {step === 'details' && (
                    <motion.div
                        key="details"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="min-h-screen lg:w-1/2 lg:mx-auto lg:my-20"
                    >
                        <form onSubmit={handleSubmit} className="h-full">
                            {/* Post Preview */}
                            <div className="bg-white border-b border-gray-200 p-4">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                                        {clerkUser?.imageUrl ? (
                                            <img src={clerkUser.imageUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-sm">{clerkUser?.username || 'You'}</p>
                                        <textarea
                                            value={photoDetails.description}
                                            onChange={(e) => setPhotoDetails(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="Write a caption..."
                                            className="w-full mt-2 text-sm resize-none border-none outline-none placeholder-gray-400"
                                            rows={3}
                                        />
                                    </div>
                                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 relative">
                                        {preview && (
                                            <>
                                                <img
                                                    src={preview}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                                {originalFileSize && file && originalFileSize !== file.size && (
                                                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                                        <MinusCircle className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Rest of your form remains the same... */}
                            {/* Options */}
                            <div className="bg-white">
                                {/* Add Location */}
                                <div className="border-b border-gray-200 p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <MapPin className="w-6 h-6 text-gray-400" />
                                            <input
                                                type="text"
                                                value={photoDetails.location}
                                                onChange={(e) => setPhotoDetails(prev => ({ ...prev, location: e.target.value }))}
                                                placeholder="Add location"
                                                className="text-sm outline-none placeholder-gray-400"
                                            />
                                        </div>
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    </div>
                                </div>

                                {/* Tag People */}
                                <div className="border-b border-gray-200 p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Users className="w-6 h-6 text-gray-400" />
                                            <input
                                                type="text"
                                                value={photoDetails.tags}
                                                onChange={(e) => setPhotoDetails(prev => ({ ...prev, tags: e.target.value }))}
                                                placeholder="Tag people or add hashtags"
                                                className="text-sm outline-none placeholder-gray-400 w-44"
                                            />
                                        </div>
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    </div>
                                </div>

                                {/* Advanced Settings */}
                                <div className="p-4">
                                    <h3 className="text-lg font-semibold mb-4">Advanced settings</h3>
                                    
                                    <div className="flex items-center justify-between py-3">
                                        <span className="text-sm">Hide like and view counts on this post</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={photoDetails.isPrivate}
                                                onChange={(e) => setPhotoDetails(prev => ({ ...prev, isPrivate: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loading/Compression State */}
            {(uploadProgress || compressionProgress > 0) && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            {compressionProgress > 0 ? (
                                <MinusCircle className="w-6 h-6 animate-pulse text-blue-500" />
                            ) : (
                                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                            )}
                            <span className="font-medium">{uploadProgress}</span>
                        </div>
                        
                        {compressionProgress > 0 && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Compressing...</span>
                                    <span>{Math.round(compressionProgress)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${compressionProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}