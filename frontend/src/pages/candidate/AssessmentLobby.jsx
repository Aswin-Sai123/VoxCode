import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const AssessmentLobby = () => {
    const { code } = useParams();
    const navigate = useNavigate();

    const [assessment, setAssessment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const verifyCode = async () => {
            try {
                const res = await api.get(`/assessments/join/${code}`);
                if (res.data.success) {
                    setAssessment(res.data.data);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Could not find this assessment.');
            } finally {
                setLoading(false);
            }
        };
        verifyCode();
    }, [code]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-lg mx-auto px-4 py-16 text-center">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Assessment Not Found</h2>
                    <p className="text-gray-500 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/candidate/dashboard')}
                        className="px-6 py-3 bg-dark text-white font-bold rounded-xl hover:bg-gray-800 transition-all"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-10">
            <button
                onClick={() => navigate('/candidate/dashboard')}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium mb-6 inline-flex items-center"
            >
                ← Back to Dashboard
            </button>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary-600 to-purple-600 p-8 text-white">
                    <p className="text-sm font-medium opacity-80 mb-1">You're joining</p>
                    <h2 className="text-2xl font-bold mb-2">{assessment.title}</h2>
                    <p className="text-sm opacity-80">by {assessment.companyName}</p>
                </div>

                {/* Details */}
                <div className="p-8 space-y-6">
                    {/* Role */}
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.193 23.193 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Role</p>
                            <p className="text-gray-900 font-semibold">{assessment.roleTitle}</p>
                        </div>
                    </div>

                    {/* Experience Level */}
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Experience Level</p>
                            <p className="text-gray-900 font-semibold">{assessment.experienceLevel} Level</p>
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Duration</p>
                            <p className="text-gray-900 font-semibold">{assessment.durationMinutes} minutes</p>
                        </div>
                    </div>

                    {/* Skills */}
                    {assessment.skills && assessment.skills.length > 0 && (
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Skills Tested</p>
                                <div className="flex flex-wrap gap-2">
                                    {assessment.skills.map((skill, i) => (
                                        <span key={i} className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-full">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Divider */}
                    <hr className="border-gray-100" />

                    {/* Instructions */}
                    <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
                        <p className="text-sm font-bold text-yellow-800 mb-1">Before you start</p>
                        <ul className="text-sm text-yellow-700 space-y-1">
                            <li>• Make sure you have a stable internet connection</li>
                            <li>• Find a quiet place with no distractions</li>
                            <li>• Have your microphone ready (for voice interview)</li>
                            <li>• You will have {assessment.durationMinutes} minutes to complete this</li>
                        </ul>
                    </div>

                    {/* Start Button */}
                    <button
                        onClick={() => navigate(`/candidate/interview/${code}`)}
                        className="w-full py-4 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl text-center transition-all shadow-lg shadow-primary-600/30 hover:scale-[1.01]"
                    >
                        Start Live Assessment →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssessmentLobby;
