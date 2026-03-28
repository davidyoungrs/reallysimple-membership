import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'

export default function ContactSection() {
    return (
        <section className="py-32" id="contact-sales">
            <div className="mx-auto max-w-3xl px-8 lg:px-0">
                <h1 className="text-center text-4xl font-semibold lg:text-5xl tracking-tight uppercase italic font-black">Contact Sales</h1>
                <p className="mt-4 text-center text-gray-600">We'll help you find the right plan and pricing for your business.</p>

                <Card className="mx-auto mt-12 max-w-lg p-8 shadow-md sm:p-12 bg-white rounded-3xl border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4 uppercase italic">Let's get you to the right place</h2>
                        <p className="mt-4 text-sm text-gray-500 font-medium">Reach out to our sales team! We’re eager to learn more about how you plan to use our application.</p>
                    </div>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            alert('Thank you for contacting us! We will get back to you soon.');
                        }}
                        className="mt-12 space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-black uppercase tracking-wider text-gray-500">Full name</Label>
                            <Input
                                type="text"
                                id="name"
                                required
                                className="rounded-xl border-gray-200 focus:ring-blue-500 h-12"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-black uppercase tracking-wider text-gray-500">Work Email</Label>
                            <Input
                                type="email"
                                id="email"
                                required
                                className="rounded-xl border-gray-200 focus:ring-blue-500 h-12"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="country" className="text-xs font-black uppercase tracking-wider text-gray-500">Country/Region</Label>
                            <Select>
                                <SelectTrigger className="rounded-xl border-gray-200 focus:ring-blue-500 h-12">
                                    <SelectValue placeholder="Select Country/Region" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    <SelectItem value="1">United Kingdom</SelectItem>
                                    <SelectItem value="2">United States</SelectItem>
                                    <SelectItem value="3">France</SelectItem>
                                    <SelectItem value="4">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="website" className="text-xs font-black uppercase tracking-wider text-gray-500">Company Website</Label>
                            <Input
                                type="url"
                                id="website"
                                className="rounded-xl border-gray-200 focus:ring-blue-500 h-12"
                                placeholder="https://"
                            />
                            <span className="text-muted-foreground inline-block text-[10px] font-bold uppercase text-gray-400">Must start with 'https'</span>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="job" className="text-xs font-black uppercase tracking-wider text-gray-500">Job function</Label>
                            <Select>
                                <SelectTrigger className="rounded-xl border-gray-200 focus:ring-blue-500 h-12">
                                    <SelectValue placeholder="Select Job Function" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    <SelectItem value="1">Finance</SelectItem>
                                    <SelectItem value="2">Education</SelectItem>
                                    <SelectItem value="3">Legal</SelectItem>
                                    <SelectItem value="4">Marketing</SelectItem>
                                    <SelectItem value="5">Operations</SelectItem>
                                    <SelectItem value="6">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="msg" className="text-xs font-black uppercase tracking-wider text-gray-500">Message</Label>
                            <Textarea
                                id="msg"
                                rows={4}
                                className="rounded-xl border-gray-200 focus:ring-blue-500 resize-none"
                                placeholder="How can we help?"
                            />
                        </div>

                        <Button className="w-full h-14 bg-gray-900 text-white rounded-2xl font-black uppercase italic tracking-widest hover:bg-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl">
                            Submit Inquiry
                        </Button>
                    </form>
                </Card>
            </div>
        </section>
    )
}
