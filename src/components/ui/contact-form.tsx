import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'

export default function ContactSection() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to submit inquiry');
            }

            setIsSuccess(true);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <section id="contact-sales" className="py-24 bg-white scroll-mt-20">
                <div className="container mx-auto px-4 text-center">
                    <Card className="mx-auto max-w-lg p-12 shadow-xl bg-blue-50 rounded-3xl border-2 border-black">
                        <h2 className="text-4xl font-black italic uppercase mb-6 tracking-tighter">THANK YOU!</h2>
                        <p className="text-lg font-medium text-gray-700 mb-8">
                            Your inquiry has been received. Our sales team will be in touch shortly to discuss your requirements.
                        </p>
                        <Button 
                            onClick={() => setIsSuccess(false)}
                            className="bg-black text-white px-8 py-6 text-lg rounded-2xl font-black italic uppercase hover:scale-105 transition-transform"
                        >
                            SEND ANOTHER INQUIRY
                        </Button>
                    </Card>
                </div>
            </section>
        );
    }

    return (
        <section className="py-32 scroll-mt-20" id="contact-sales">
            <div className="mx-auto max-w-3xl px-8 lg:px-0">
                <h1 className="text-center text-4xl font-semibold lg:text-5xl tracking-tight uppercase italic font-black">Contact Sales</h1>
                <p className="mt-4 text-center text-gray-600">We'll help you find the right plan and pricing for your business.</p>

                <Card className="mx-auto mt-12 max-w-lg p-8 shadow-md sm:p-12 bg-white rounded-3xl border-gray-100 border-2 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4 uppercase italic">Let's get you to the right place</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="mt-12 space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-black uppercase tracking-wider text-gray-500">Full name</Label>
                            <Input
                                type="text"
                                id="name"
                                name="name"
                                required
                                placeholder="ALEX JOHNSON"
                                className="rounded-xl border-gray-200 focus:ring-blue-500 h-12 italic font-bold"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-black uppercase tracking-wider text-gray-500">Work Email</Label>
                            <Input
                                type="email"
                                inputMode="email"
                                id="email"
                                name="email"
                                required
                                placeholder="ALEX@COMPANY.COM"
                                className="rounded-xl border-gray-200 focus:ring-blue-500 h-12 italic font-bold"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="country" className="text-xs font-black uppercase tracking-wider text-gray-500">Country/Region</Label>
                                <Select name="country" required>
                                    <SelectTrigger className="rounded-xl border-gray-200 focus:ring-blue-500 h-12 italic font-bold">
                                        <SelectValue placeholder="SELECT" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                        <SelectItem value="uk">United Kingdom</SelectItem>
                                        <SelectItem value="us">United States</SelectItem>
                                        <SelectItem value="fr">France</SelectItem>
                                        <SelectItem value="de">Germany</SelectItem>
                                        <SelectItem value="ca">Canada</SelectItem>
                                        <SelectItem value="au">Australia</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="numCards" className="text-xs font-black uppercase tracking-wider text-gray-500">Cards Required</Label>
                                <Input
                                    type="number"
                                    inputMode="numeric"
                                    id="numCards"
                                    name="numCards"
                                    min="1"
                                    required
                                    placeholder="e.g. 50"
                                    className="rounded-xl border-gray-200 focus:ring-blue-500 h-12 italic font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="website" className="text-xs font-black uppercase tracking-wider text-gray-500">Company Website</Label>
                            <Input
                                type="text"
                                id="website"
                                name="website"
                                required
                                className="rounded-xl border-gray-200 focus:ring-blue-500 h-12 italic font-bold"
                                placeholder="WWW.COMPANY.COM"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="message" className="text-xs font-black uppercase tracking-wider text-gray-500">Message</Label>
                            <Textarea
                                id="message"
                                name="message"
                                rows={4}
                                required
                                className="rounded-xl border-gray-200 focus:ring-blue-500 resize-none italic font-bold"
                                placeholder="How can we help?"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold italic border border-red-100">
                                {error}
                            </div>
                        )}

                        <Button 
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-14 bg-gray-900 text-white rounded-2xl font-black uppercase italic tracking-widest hover:bg-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl disabled:opacity-50"
                        >
                            {isSubmitting ? 'SENDING...' : 'SUBMIT INQUIRY'}
                        </Button>
                    </form>
                </Card>
            </div>
        </section>
    )
}
