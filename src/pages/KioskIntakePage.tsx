import React, { useState } from 'react';
import api from '../lib/firebase';
import { ClipboardList } from 'lucide-react';

const KioskIntakePage: React.FC = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        age: '',
        phone: '',
        email: '',
        bestTimeToReach: '',
        careerGoals: '',
        barriers: [] as string[],
        howDidYouHear: '',
        otherBarrier: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const barriersOptions = [
        "Transportation assistance",
        "Mental Health or Wellness Support",
        "Flexible Scheduling",
        "Academic tutoring or mentoring",
        "Regular check-ins with staff",
    ];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        setFormData(prev => {
            if (checked) {
                return { ...prev, barriers: [...prev.barriers, value] };
            } else {
                return { ...prev, barriers: prev.barriers.filter(b => b !== value) };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const finalData = { ...formData };
        if (formData.otherBarrier) {
            finalData.barriers.push(`Other: ${formData.otherBarrier}`);
        }

        try {
            await api.submitIntakeForm(finalData);
            setSubmitted(true);
        } catch (error) {
            console.error("Submission failed", error);
            alert("There was an error submitting your form. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-[#BAC8B1] flex flex-col justify-center items-center p-4">
                <div className="max-w-2xl w-full bg-white p-8 md:p-12 rounded-xl shadow-lg text-center">
                    <ClipboardList className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Thank You!</h1>
                    <p className="text-gray-600 text-lg">Your information has been submitted successfully. A staff member will be in contact with you soon.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#BAC8B1] flex flex-col justify-center items-center p-4">
            <div className="max-w-2xl w-full bg-white p-8 md:p-10 rounded-xl shadow-lg">
                <div className="text-center mb-8">
                    <ClipboardList className="h-12 w-12 text-[#404E3B] mx-auto mb-2" />
                    <h1 className="text-3xl font-bold text-gray-800">WRTP Interest Form</h1>
                    <p className="text-gray-500 mt-2">Please fill out the form below to get started.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <input name="firstName" placeholder="First Name" onChange={handleInputChange} required className="form-input" />
                        <input name="lastName" placeholder="Last Name" onChange={handleInputChange} required className="form-input" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <input name="age" type="number" placeholder="Age" onChange={handleInputChange} required className="form-input" />
                        <input name="phone" type="tel" placeholder="Phone Number" onChange={handleInputChange} required className="form-input" />
                    </div>
                    <input name="email" type="email" placeholder="Email Address" onChange={handleInputChange} required className="form-input" />
                    <select name="bestTimeToReach" onChange={handleInputChange} required className="form-input">
                        <option value="">Best time to reach you?</option>
                        <option>Mornings</option>
                        <option>Afternoons</option>
                        <option>Evenings</option>
                    </select>
                    <textarea name="careerGoals" placeholder="What are your career goals or interests?" onChange={handleInputChange} required className="form-input min-h-[100px]"></textarea>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">What are some of your barriers/needs?</label>
                        <div className="space-y-2">
                            {barriersOptions.map(option => (
                                <label key={option} className="flex items-center">
                                    <input type="checkbox" value={option} onChange={handleCheckboxChange} className="h-4 w-4 text-[#404E3B] border-gray-300 rounded focus:ring-[#404E3B]" />
                                    <span className="ml-2 text-gray-700">{option}</span>
                                </label>
                            ))}
                            <label className="flex items-center">
                                <input type="checkbox" name="other" className="h-4 w-4 text-[#404E3B] border-gray-300 rounded focus:ring-[#404E3B]" />
                                <span className="ml-2 text-gray-700">Other:</span>
                            </label>
                            <input name="otherBarrier" onChange={handleInputChange} placeholder="Please specify" className="form-input mt-1 w-full" />
                        </div>
                    </div>
                    <input name="howDidYouHear" placeholder="How did you hear about us?" onChange={handleInputChange} className="form-input" />

                    <button type="submit" disabled={submitting} className="w-full bg-[#404E3B] text-white py-3 rounded-lg font-semibold text-lg hover:bg-[#5a6c53] disabled:bg-[#8d9b89] transition-colors">
                        {submitting ? 'Submitting...' : 'Submit Information'}
                    </button>
                </form>
            </div>
            <style>{`
                .form-input {
                    display: block;
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid #D1D5DB;
                    border-radius: 0.5rem;
                    transition: border-color 0.2s;
                }
                .form-input:focus {
                    outline: none;
                    border-color: #404E3B;
                    box-shadow: 0 0 0 2px rgba(64, 78, 59, 0.3);
                }
            `}</style>
        </div>
    );
};

export default KioskIntakePage;