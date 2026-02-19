
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, User, Mail, Phone, Briefcase, Building, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Schema
const leadFormSchema = (t: any) => z.object({
    name: z.string().min(1, t('Name is required')),
    email: z.string().email(t('Invalid email address')),
    phone: z.string().optional(),
    jobTitle: z.string().optional(),
    company: z.string().optional(),
    note: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

interface LeadFormProps {
    cardId: string; // This should be the UID or Slug
    isOpen: boolean;
    onClose: () => void;
    ownerName?: string; // To personalize the header "Connect with David"
}

export function LeadForm({ cardId, isOpen, onClose, ownerName }: LeadFormProps) {
    const { t } = useTranslation();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const schema = useState(() => leadFormSchema(t))[0];
    const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<ReturnType<typeof leadFormSchema>>>({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data: LeadFormData) => {
        setIsSubmitting(true);
        setError(null);
        try {
            const response = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...(data as any), cardId }),
            });

            if (!response.ok) {
                throw new Error('Failed to submit form');
            }

            setIsSuccess(true);
            reset();
            // Close after delay or let user close? 
            // Better to show success message.
        } catch (err) {
            console.error(err);
            setError(t('Something went wrong. Please try again.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col relative animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {isSuccess ? t('Message Sent!') : (ownerName ? t('Connect with {{name}}', { name: ownerName }) : t('Get in Touch'))}
                        </h2>
                        {!isSuccess && <p className="text-sm text-gray-500 mt-1">{t('Share your info to connect.')}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {isSuccess ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Send className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('Thanks for reaching out!')}</h3>
                            <p className="text-gray-500 mb-6">
                                {t('Your information has been sent successfully. We will be in touch soon.')}
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
                            >
                                {t('Close')}
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            {/* Name */}
                            <div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder={t('Full Name')}
                                        className={`w-full pl-10 pr-4 py-3 rounded-xl border ${errors.name ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-200'} focus:border-blue-500 focus:ring-4 transition-all outline-none`}
                                        {...register('name')}
                                    />
                                </div>
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                            </div>

                            {/* Email */}
                            <div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="email"
                                        placeholder={t('Email Address')}
                                        className={`w-full pl-10 pr-4 py-3 rounded-xl border ${errors.email ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-200'} focus:border-blue-500 focus:ring-4 transition-all outline-none`}
                                        {...register('email')}
                                    />
                                </div>
                                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                            </div>

                            {/* Phone */}
                            <div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="tel"
                                        placeholder={t('Phone Number (Optional)')}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all outline-none"
                                        {...register('phone')}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Job Title */}
                                <div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                            <Briefcase className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder={t('Job Title')}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all outline-none"
                                            {...register('jobTitle')}
                                        />
                                    </div>
                                </div>
                                {/* Company */}
                                <div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                            <Building className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder={t('Company')}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all outline-none"
                                            {...register('company')}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Note */}
                            <div>
                                <div className="relative">
                                    <div className="absolute top-3 left-3 pointer-events-none text-gray-400">
                                        <MessageSquare className="w-5 h-5" />
                                    </div>
                                    <textarea
                                        placeholder={t('Add a note...')}
                                        rows={3}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all outline-none resize-none"
                                        {...register('note')}
                                    ></textarea>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>{t('Sending...')}</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        <span>{t('Send Information')}</span>
                                    </>
                                )}
                            </button>

                            <p className="text-xs text-center text-gray-400 mt-4">
                                {t('We respect your privacy. Your information is shared only with this card owner.')}
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
