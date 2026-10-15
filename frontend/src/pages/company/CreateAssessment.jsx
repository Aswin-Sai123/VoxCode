import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const CreateAssessment = () => {
    const navigate = useNavigate();

    // form state
    const [title, setTitle] = useState('');
    const [roleId, setRoleId] = useState('');
    const [skillInput, setSkillInput] = useState('');
    const [skills, setSkills] = useState([]);
    const [experienceLevel, setExperienceLevel] = useState('Entry');
    const [durationMinutes, setDurationMinutes] = useState(30);
    const [blueprint, setBlueprint] = useState('');

    // other state
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [createdCode, setCreatedCode] = useState(''); // after success
    const [copied, setCopied] = useState(false);

    // fetch company's roles on mount
    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const res = await api.get('/company/roles');
                if (res.data.success) {
                    setRoles(res.data.data);
                }
            } catch (err) {
                console.error('Failed to fetch roles', err);
            }
        };
        fetchRoles();
    }, []);

    // add skill when pressing Enter
    const handleSkillKeyDown = (e) => {
        if (e.key === 'Enter' && skillInput.trim()) {
            e.preventDefault();
            if (!skills.includes(skillInput.trim())) {
                setSkills([...skills, skillInput.trim()]);
            }
            setSkillInput('');
        }
    };

    // remove a skill tag
    const removeSkill = (skillToRemove) => {
        setSkills(skills.filter(s => s !== skillToRemove));
    };

    // submit the form
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!title.trim()) {
            setError('Please enter an assessment title');
            return;
        }
        if (!roleId) {
            setError('Please select a role');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/assessments', {
                roleId,
                title: title.trim(),
                skills,
                experienceLevel,
                durationMinutes,
                blueprint: blueprint.trim()
            });

            if (res.data.success) {
                setCreatedCode(res.data.data.assessmentCode);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create assessment');
        } finally {
            setLoading(false);
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(createdCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // SUCCESS screen — show the generated code
    if (createdCode) {
        return (
            <div className="max-w-xl mx-auto px-4 py-16 text-center">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Assessment Created!</h2>
                    <p className="text-gray-500 mb-8">Share this code with your candidates so they can join.</p>

                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 mb-6">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Assessment Code</p>
                        <p className="text-3xl font-mono font-bold text-primary-600 tracking-widest">{createdCode}</p>
                    </div>

                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={copyCode}
                            className="px-6 py-3 bg-dark text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-lg"
                        >
                            {copied ? '✓ Copied!' : 'Copy Code'}
                        </button>
                        <button
                            onClick={() => navigate('/company/dashboard')}
                            className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8">
                <button 
                    onClick={() => navigate('/company/dashboard')}
                    className="text-sm text-gray-500 hover:text-gray-700 font-medium mb-4 inline-flex items-center"
                >
                    ← Back to Dashboard
                </button>
                <h2 className="text-2xl font-bold text-gray-900">Create New Assessment</h2>
                <p className="mt-1 text-sm text-gray-500">Configure the interview assessment for your candidates.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg font-medium">
                        {error}
                    </div>
                )}

                {/* Assessment Title */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Assessment Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Frontend Developer Interview - Round 1"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all text-sm"
                    />
                </div>

                {/* Select Role */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Select Role</label>
                    {roles.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">
                            No roles found. <button type="button" onClick={() => navigate('/company/dashboard')} className="text-primary-600 underline">Create a role first</button>.
                        </p>
                    ) : (
                        <select
                            value={roleId}
                            onChange={(e) => setRoleId(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all text-sm"
                        >
                            <option value="">-- Select a role --</option>
                            {roles.map(role => (
                                <option key={role._id} value={role._id}>{role.title}</option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Skills Tags */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Required Skills</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {skills.map((skill, index) => (
                            <span key={index} className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-xs font-bold px-3 py-1.5 rounded-full">
                                {skill}
                                <button type="button" onClick={() => removeSkill(skill)} className="text-primary-400 hover:text-primary-700 ml-1">
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                    <input
                        type="text"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={handleSkillKeyDown}
                        placeholder="Type a skill and press Enter (e.g. JavaScript)"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all text-sm"
                    />
                </div>

                {/* Experience Level + Duration — side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Experience Level</label>
                        <select
                            value={experienceLevel}
                            onChange={(e) => setExperienceLevel(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all text-sm"
                        >
                            <option value="Entry">Entry Level</option>
                            <option value="Mid">Mid Level</option>
                            <option value="Senior">Senior Level</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Duration</label>
                        <select
                            value={durationMinutes}
                            onChange={(e) => setDurationMinutes(Number(e.target.value))}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all text-sm"
                        >
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={45}>45 minutes</option>
                            <option value={60}>60 minutes</option>
                            <option value={90}>90 minutes</option>
                        </select>
                    </div>
                </div>

                {/* Interview Blueprint */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        Interview Blueprint
                        <span className="text-gray-400 font-normal ml-1">(optional)</span>
                    </label>
                    <p className="text-xs text-gray-400 mb-2">
                        Paste or type your interview guide here — topics to cover, expected depth, focus areas, sample questions, etc.
                    </p>
                    <textarea
                        value={blueprint}
                        onChange={(e) => setBlueprint(e.target.value)}
                        rows={8}
                        placeholder={"e.g.\n- Ask about React hooks (useState, useEffect, useContext)\n- Test understanding of closures and event loop\n- One medium-level coding problem on arrays\n- Ask about REST API design basics\n- Focus more on practical knowledge than theory"}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all text-sm font-mono resize-y"
                    />
                </div>

                {/* Submit */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-dark text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/20 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creating...' : 'Create Assessment & Generate Code'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateAssessment;
